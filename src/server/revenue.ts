import { createHash, randomBytes } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import express, { Router, type Request, type Response } from "express";
import { sendAdminNotification, sendTransactionNotification } from "./email";
import { Contract, getAddress, Interface, isAddress, JsonRpcProvider, parseUnits } from "ethers";

const router = Router();
router.use(express.json({ limit: "16kb" }));
const googleProvider = "google.com";
const serviceTypes = new Set(["contracts", "wallet", "dapp"]);
const budgetRanges = new Set(["", "under-250", "250-500", "500-1000", "1000-plus", "to-discuss"]);
const inquiryLimit = 5;
const BASE_CHAIN_ID = 8453;
const BASE_RPC_URL = "https://mainnet.base.org";
const OFFICIAL_BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const transferInterface = new Interface(["event Transfer(address indexed from,address indexed to,uint256 value)"]);
const erc20MetadataAbi = ["function decimals() view returns (uint8)", "function symbol() view returns (string)"];
let rpcProvider: JsonRpcProvider | null = null;

type PaymentConfig = { chainId: number; treasuryAddress: string; usdcAddress: string; aglAddress: string; confirmations: number };
type TokenDetails = { address: string; symbol: string; decimals: number };

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

async function sendRevenueEmail(to: string | string[], subject: string, content: string, idempotencyKey: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const domain = process.env.RESEND_EMAIL_DOMAIN;
  if (!apiKey || !domain || !/^[a-z0-9.-]+$/i.test(domain)) return;
  const recipients = (Array.isArray(to) ? to : [to]).filter((email) => /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email));
  if (!recipients.length) return;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ from: `Agunnaya Labs <notifications@${domain}>`, to: recipients, subject, html: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.6"><h2>${escapeHtml(subject)}</h2>${content}<p>— Agunnaya Labs</p></main>` }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.error(`[revenue-email] Delivery failed with status ${response.status}`);
  } catch {
    console.error("[revenue-email] Delivery request failed");
  }
}

function getAdminEmails() {
  return (process.env.AGL_ADMIN_EMAILS || "").split(/[;,\\s]+/).map((email) => email.trim()).filter(Boolean);
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function getPaymentConfig(): PaymentConfig {
  const chainId = Number(process.env.BASE_CHAIN_ID);
  const treasury = process.env.AGL_SERVICE_TREASURY_ADDRESS || "";
  const usdc = process.env.BASE_USDC_ADDRESS || "";
  const agl = process.env.AGL_TOKEN_ADDRESS || "";
  const confirmations = Number(process.env.AGL_PAYMENT_CONFIRMATION_POLICY);
  if (!process.env.BASE_CHAIN_ID || !treasury || !usdc || !agl || !process.env.AGL_PAYMENT_CONFIRMATION_POLICY) {
    throw new HttpError(503, "Base payment instructions are not enabled until the administrator finishes configuration.");
  }
  if (chainId !== BASE_CHAIN_ID) throw new HttpError(503, "Payments are restricted to Base Mainnet (chain 8453).");
  if (!isAddress(treasury) || !isAddress(usdc) || !isAddress(agl)) throw new HttpError(503, "Payment address configuration is invalid.");
  let treasuryAddress: string;
  let usdcAddress: string;
  let aglAddress: string;
  try {
    treasuryAddress = getAddress(treasury);
    usdcAddress = getAddress(usdc);
    aglAddress = getAddress(agl);
  } catch {
    throw new HttpError(503, "Payment addresses must be valid checksummed addresses.");
  }
  if (usdcAddress !== OFFICIAL_BASE_USDC) throw new HttpError(503, "Configured USDC does not match the official native USDC contract on Base.");
  if (aglAddress === usdcAddress || treasuryAddress === aglAddress || treasuryAddress === usdcAddress) {
    throw new HttpError(503, "Payment token and treasury addresses must be distinct.");
  }
  if (!Number.isSafeInteger(confirmations) || confirmations < 1 || confirmations > 100_000) {
    throw new HttpError(503, "The Base payment confirmation policy is invalid.");
  }
  return { chainId, treasuryAddress, usdcAddress, aglAddress, confirmations };
}

function getBaseProvider() {
  if (!rpcProvider) rpcProvider = new JsonRpcProvider(BASE_RPC_URL, BASE_CHAIN_ID);
  return rpcProvider;
}

async function getTokenDetails(address: string, expectedSymbol: "USDC" | "AGL"): Promise<TokenDetails> {
  try {
    const provider = getBaseProvider();
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== BASE_CHAIN_ID) throw new Error("Unexpected network");
    const normalizedAddress = getAddress(address);
    const bytecode = await provider.getCode(normalizedAddress);
    if (bytecode === "0x") throw new Error("No token contract bytecode");
    const contract = new Contract(normalizedAddress, erc20MetadataAbi, provider);
    const [rawDecimals, rawSymbol] = await Promise.all([contract.decimals(), contract.symbol()]);
    const decimals = Number(rawDecimals);
    const symbol = String(rawSymbol).trim();
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36 || symbol.toUpperCase() !== expectedSymbol) throw new Error("Unexpected token metadata");
    if (expectedSymbol === "USDC" && decimals !== 6) throw new Error("Unexpected USDC decimals");
    return { address: normalizedAddress, symbol, decimals };
  } catch {
    throw new HttpError(503, `Configured ${expectedSymbol} token could not be verified on Base. Payment instructions remain disabled.`);
  }
}

function formatBaseUnits(amount: string, decimals: number) {
  const units = BigInt(amount);
  const scale = 10n ** BigInt(decimals);
  const whole = units / scale;
  const fraction = (units % scale).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""}`;
}

function getTokenForMethod(config: PaymentConfig, method: unknown) {
  if (method === "USDC") return { address: config.usdcAddress, symbol: "USDC" as const };
  if (method === "AGL") return { address: config.aglAddress, symbol: "AGL" as const };
  throw new HttpError(400, "Choose USDC or AGL on Base.");
}

function getFirebaseServices() {
  const rawAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseId = process.env.FIREBASE_DATABASE_ID;
  if (!rawAccount || !databaseId) throw new HttpError(503, "Secure inquiry storage is not configured yet.");

  let serviceAccount: { project_id?: string; client_email?: string; private_key?: string };
  try {
    serviceAccount = JSON.parse(rawAccount);
  } catch {
    throw new HttpError(503, "Secure inquiry storage configuration is invalid.");
  }
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new HttpError(503, "Secure inquiry storage configuration is incomplete.");
  }

  const credential = cert({
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
  });
  const app = getApps()[0] ?? initializeApp({ credential });
  return { auth: getAuth(app), db: getFirestore(app, databaseId) };
}

async function verifyGoogleUser(req: Request, requireAdmin = false) {
  const header = req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) throw new HttpError(401, "Sign in with a verified Google account to continue.");

  let decoded;
  try {
    decoded = await getFirebaseServices().auth.verifyIdToken(match[1], true);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Your session could not be verified. Sign in again and retry.");
  }

  if (!decoded.email || !decoded.email_verified || decoded.firebase?.sign_in_provider !== googleProvider) {
    throw new HttpError(403, "A verified Google account is required.");
  }

  if (requireAdmin) {
    const admins = (process.env.AGL_ADMIN_EMAILS || "").split(/[;,\s]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (!admins.includes(decoded.email.toLowerCase())) throw new HttpError(403, "This Google account is not authorized for founder access.");
  }

  return decoded;
}

function boundedString(value: unknown, label: string, maxLength: number, required = false) {
  if (typeof value !== "string") {
    if (required) throw new HttpError(400, `${label} is required.`);
    return "";
  }
  const text = value.trim();
  if (required && !text) throw new HttpError(400, `${label} is required.`);
  if (text.length > maxLength) throw new HttpError(400, `${label} is too long.`);
  return text;
}

function validateRepository(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com" || url.username || url.password) throw new Error();
    return url.toString();
  } catch {
    throw new HttpError(400, "Repository must be an HTTPS GitHub URL without embedded credentials.");
  }
}

function serializeInquiry(data: FirebaseFirestore.DocumentData, id: string) {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null;
  return {
    id,
    reference: data.reference,
    name: data.name,
    email: data.email,
    telegram: data.telegram,
    projectName: data.projectName,
    service: data.service,
    network: data.network,
    description: data.description,
    deliveryDate: data.deliveryDate,
    budget: data.budget,
    repository: data.repository,
    status: data.status,
    quote: data.quote || null,
    createdAt,
  };
}

function serializeOrder(data: FirebaseFirestore.DocumentData, id: string) {
  const toIso = (value: unknown) => value instanceof Timestamp ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : null;
  const createdAt = toIso(data.createdAt);
  const paidAt = toIso(data.paidAt);
  const dueAt = toIso(data.dueAt);
  return {
    id,
    invoiceReference: data.invoiceReference,
    inquiryId: data.inquiryId,
    projectName: data.projectName,
    amountUsdCents: data.amountUsdCents,
    amountTokenUnits: data.amountTokenUnits,
    tokenDecimals: data.tokenDecimals,
    tokenSymbol: data.tokenSymbol,
    tokenAddress: data.tokenAddress,
    treasuryAddress: data.treasuryAddress,
    chainId: data.chainId,
    paymentMethod: data.paymentMethod,
    paymentStatus: data.paymentStatus,
    status: data.status,
    transactionHash: data.transactionHash || null,
    confirmationCount: data.confirmationCount || null,
    dueAt,
    paidAt,
    createdAt,
  };
}

router.post("/api/revenue/inquiries", async (req, res) => {
  try {
    const user = await verifyGoogleUser(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    if (typeof body.website === "string" && body.website.trim()) throw new HttpError(400, "Unable to accept this inquiry.");
    if (body.consent !== true) throw new HttpError(400, "Please consent to the inquiry privacy notice.");

    const name = boundedString(body.name, "Name", 160, true);
    const projectName = boundedString(body.projectName, "Project name", 160, true);
    const service = boundedString(body.service, "Service", 30, true);
    if (!serviceTypes.has(service)) throw new HttpError(400, "Choose one of the listed services.");
    const network = boundedString(body.network, "Network requirements", 240, true);
    const description = boundedString(body.description, "Project description", 5000, true);
    if (description.length < 30) throw new HttpError(400, "Project description must be at least 30 characters.");
    const deliveryDate = boundedString(body.deliveryDate, "Delivery date", 10);
    if (deliveryDate && !/^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)) throw new HttpError(400, "Delivery date must be a valid date.");
    const budget = boundedString(body.budget, "Budget range", 20);
    if (!budgetRanges.has(budget)) throw new HttpError(400, "Choose one of the listed budget ranges.");
    const telegram = boundedString(body.telegram, "Telegram handle", 80);
    if (telegram && !/^@?[A-Za-z0-9_]{3,64}$/.test(telegram)) throw new HttpError(400, "Enter a valid Telegram handle.");
    const repository = validateRepository(boundedString(body.repository, "Repository", 300));
    const referralSource = boundedString(body.referralSource, "Referral source", 80) || "direct";

    const { db } = getFirebaseServices();
    const dayKey = new Date().toISOString().slice(0, 10);
    const rateLimitId = createHash("sha256").update(user.uid).digest("hex");
    const rateLimitRef = db.collection("services_rate_limits").doc(rateLimitId);
    const inquiryRef = db.collection("services_inquiries").doc();
    const reference = `AGL-${randomBytes(4).toString("hex").toUpperCase()}`;

    await db.runTransaction(async (transaction) => {
      const rateLimitSnapshot = await transaction.get(rateLimitRef);
      const rateLimitData = rateLimitSnapshot.data();
      const submissions = rateLimitData?.dayKey === dayKey ? Number(rateLimitData.count || 0) : 0;
      if (submissions >= inquiryLimit) throw new HttpError(429, "You have reached today's inquiry limit. Please try again tomorrow.");
      transaction.set(rateLimitRef, { dayKey, count: submissions + 1, updatedAt: FieldValue.serverTimestamp() });
      transaction.create(inquiryRef, {
        reference,
        userId: user.uid,
        name,
        email: user.email,
        telegram,
        projectName,
        service,
        network,
        description,
        deliveryDate,
        budget,
        repository,
        referralSource,
        status: "new",
        consentAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    const details = `<p>A new services inquiry was submitted.</p><ul><li>Reference: ${escapeHtml(reference)}</li><li>Project: ${escapeHtml(projectName)}</li><li>Service: ${escapeHtml(service)}</li><li>Contact: ${escapeHtml(user.email)}</li></ul>`;
    await sendRevenueEmail(getAdminEmails(), `New inquiry ${reference}`, details, `inquiry-${reference}`);
    await sendRevenueEmail(user.email!, `We received your inquiry ${reference}`, `<p>Thanks, ${escapeHtml(name)}. Your inquiry for <strong>${escapeHtml(projectName)}</strong> is in review.</p><p>Reference: ${escapeHtml(reference)}</p>`, `inquiry-receipt-${reference}`);
    res.status(201).json({ reference, status: "new" });
  } catch (error) {
    respondWithError(res, error);
  }
});

router.get("/api/revenue/inquiries", async (req, res) => {
  try {
    const user = await verifyGoogleUser(req);
    const { db } = getFirebaseServices();
    const snapshot = await db.collection("services_inquiries").where("userId", "==", user.uid).limit(25).get();
    const inquiries = snapshot.docs.map((document) => serializeInquiry(document.data(), document.id)).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    res.json({ inquiries });
  } catch (error) {
    respondWithError(res, error);
  }
});

router.get("/api/revenue/admin/inquiries", async (req, res) => {
  try {
    await verifyGoogleUser(req, true);
    const { db } = getFirebaseServices();
    const snapshot = await db.collection("services_inquiries").orderBy("createdAt", "desc").limit(100).get();
    res.json({ inquiries: snapshot.docs.map((document) => serializeInquiry(document.data(), document.id)) });
  } catch (error) {
    respondWithError(res, error);
  }
});

router.get("/api/revenue/workspace", async (req, res) => {
  try {
    const user = await verifyGoogleUser(req);
    const { db } = getFirebaseServices();
    const [inquiries, orders] = await Promise.all([
      db.collection("services_inquiries").where("userId", "==", user.uid).limit(50).get(),
      db.collection("services_orders").where("userId", "==", user.uid).limit(50).get(),
    ]);
    res.json({
      inquiries: inquiries.docs.map((document) => serializeInquiry(document.data(), document.id)).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
      orders: orders.docs.map((document) => serializeOrder(document.data(), document.id)).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    });
  } catch (error) {
    respondWithError(res, error);
  }
});

router.post("/api/revenue/admin/quotes", async (req, res) => {
  try {
    await verifyGoogleUser(req, true);
    const inquiryId = boundedString(req.body?.inquiryId, "Inquiry", 128, true);
    if (!/^[A-Za-z0-9_-]+$/.test(inquiryId)) throw new HttpError(400, "Inquiry reference is invalid.");
    const amountUsdCents = Number(req.body?.amountUsdCents);
    if (!Number.isSafeInteger(amountUsdCents) || amountUsdCents < 1 || amountUsdCents > 1_000_000_000) throw new HttpError(400, "Enter a valid USD quote amount.");
    const scope = boundedString(req.body?.scope, "Quote scope", 5000, true);
    if (scope.length < 20) throw new HttpError(400, "Quote scope must include at least 20 characters.");
    const deliveryWindow = boundedString(req.body?.deliveryWindow, "Delivery window", 120);
    const aglAmount = boundedString(req.body?.aglAmount, "AGL token amount", 80);
    let aglAmountBaseUnits: string | null = null;
    let aglDecimals: number | null = null;
    let aglTokenAddress: string | null = null;
    if (aglAmount) {
      if (!/^\d+(\.\d+)?$/.test(aglAmount)) throw new HttpError(400, "Enter a plain decimal AGL amount without symbols or separators.");
      const config = getPaymentConfig();
      const token = await getTokenDetails(config.aglAddress, "AGL");
      try {
        aglAmountBaseUnits = parseUnits(aglAmount, token.decimals).toString();
      } catch {
        throw new HttpError(400, "AGL amount has more decimal places than the token supports.");
      }
      if (BigInt(aglAmountBaseUnits) <= 0n) throw new HttpError(400, "AGL amount must be greater than zero.");
      aglDecimals = token.decimals;
      aglTokenAddress = token.address;
    }

    const { db } = getFirebaseServices();
    const inquiryRef = db.collection("services_inquiries").doc(inquiryId);
    const orderRef = db.collection("services_orders").doc(inquiryId);
    const [inquiry, existingOrder] = await Promise.all([inquiryRef.get(), orderRef.get()]);
    if (!inquiry.exists) throw new HttpError(404, "Inquiry not found.");
    if (existingOrder.exists) throw new HttpError(409, "An invoice already exists for this inquiry; it cannot be re-quoted.");
    const inquiryData = inquiry.data()!;
    if (!["new", "reviewing", "quoted"].includes(inquiryData.status)) throw new HttpError(409, "This inquiry is not open for quoting.");
    const minimumAmountCents: Record<string, number> = { contracts: 12_500, wallet: 10_000, dapp: 15_000 };
    if (amountUsdCents < minimumAmountCents[inquiryData.service]) throw new HttpError(400, "Quote amount must meet the listed starting price for this service.");
    const now = new Date();
    const quote = {
      amountUsdCents,
      scope,
      deliveryWindow,
      aglAmount: aglAmount || null,
      aglAmountBaseUnits,
      aglDecimals,
      aglTokenAddress,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    await inquiryRef.update({ quote, status: "quoted", updatedAt: FieldValue.serverTimestamp() });
    const quoteHtml = `<p>Your quote for <strong>${escapeHtml(inquiryData.projectName)}</strong> is ready.</p><ul><li>Amount: $${(amountUsdCents / 100).toFixed(2)}</li><li>Scope: ${escapeHtml(scope)}</li><li>Delivery window: ${escapeHtml(deliveryWindow || "To be agreed")}</li><li>Valid until: ${escapeHtml(quote.expiresAt)}</li></ul>`;
    await sendRevenueEmail(String(inquiryData.email || ""), `Your Agunnaya Labs quote ${inquiryData.reference}`, quoteHtml, `quote-${inquiryId}-${quote.createdAt}`);
    res.status(201).json({ inquiryId, quote, status: "quoted" });
  } catch (error) {
    respondWithError(res, error);
  }
});

router.post("/api/revenue/inquiries/:id/orders", async (req, res) => {
  try {
    const user = await verifyGoogleUser(req);
    const inquiryId = boundedString(req.params.id, "Inquiry", 128, true);
    if (!/^[A-Za-z0-9_-]+$/.test(inquiryId)) throw new HttpError(400, "Inquiry reference is invalid.");
    const config = getPaymentConfig();
    const { address: tokenAddress, symbol } = getTokenForMethod(config, req.body?.paymentMethod);
    const token = await getTokenDetails(tokenAddress, symbol);
    const { db } = getFirebaseServices();
    const inquiryRef = db.collection("services_inquiries").doc(inquiryId);
    const orderRef = db.collection("services_orders").doc(inquiryId);
    const invoiceRef = db.collection("services_invoices").doc(inquiryId);
    const result = await db.runTransaction(async (transaction) => {
      const [inquirySnapshot, orderSnapshot] = await Promise.all([transaction.get(inquiryRef), transaction.get(orderRef)]);
      if (!inquirySnapshot.exists || inquirySnapshot.data()?.userId !== user.uid) throw new HttpError(404, "Quoted inquiry not found.");
      if (orderSnapshot.exists) return serializeOrder(orderSnapshot.data()!, orderRef.id);
      const inquiry = inquirySnapshot.data()!;
      const quote = inquiry.quote;
      if (inquiry.status !== "quoted" || !quote || !Number.isSafeInteger(quote.amountUsdCents)) throw new HttpError(409, "This inquiry does not have an approved quote yet.");
      if (Date.parse(quote.expiresAt) < Date.now()) throw new HttpError(409, "This quote has expired. Ask the project team to issue an updated quote.");

      let amountTokenUnits: string;
      if (symbol === "USDC") {
        amountTokenUnits = (BigInt(quote.amountUsdCents) * 10n ** BigInt(token.decimals - 2)).toString();
      } else {
        if (!quote.aglAmountBaseUnits || quote.aglTokenAddress !== token.address || quote.aglDecimals !== token.decimals) {
          throw new HttpError(409, "This quote does not include a current, individually approved AGL amount.");
        }
        amountTokenUnits = String(quote.aglAmountBaseUnits);
      }

      const now = new Date();
      const invoiceReference = `AGL-${randomBytes(5).toString("hex").toUpperCase()}`;
      const invoice = {
        invoiceReference,
        inquiryId,
        userId: user.uid,
        projectName: inquiry.projectName,
        amountUsdCents: quote.amountUsdCents,
        amountTokenUnits,
        tokenDecimals: token.decimals,
        tokenSymbol: token.symbol,
        tokenAddress: token.address,
        treasuryAddress: config.treasuryAddress,
        chainId: config.chainId,
        paymentMethod: symbol,
        paymentStatus: "pending_payment",
        status: "open",
        dueAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      transaction.create(orderRef, { ...invoice, status: "pending_payment" });
      transaction.create(invoiceRef, invoice);
      transaction.update(inquiryRef, { status: "converted", updatedAt: FieldValue.serverTimestamp() });
      return serializeOrder(invoice, orderRef.id);
    });
    res.status(201).json({ order: result });
  } catch (error) {
    respondWithError(res, error);
  }
});

router.post("/api/revenue/orders/:id/verify-payment", async (req, res) => {
  try {
    const user = await verifyGoogleUser(req);
    const orderId = boundedString(req.params.id, "Order", 128, true);
    if (!/^[A-Za-z0-9_-]+$/.test(orderId)) throw new HttpError(400, "Order reference is invalid.");
    const transactionHash = boundedString(req.body?.transactionHash, "Transaction hash", 66, true).toLowerCase();
    if (!/^0x[a-f0-9]{64}$/.test(transactionHash)) throw new HttpError(400, "Enter a valid Base transaction hash.");

    const { db } = getFirebaseServices();
    const orderRef = db.collection("services_orders").doc(orderId);
    const invoiceRef = db.collection("services_invoices").doc(orderId);
    const orderSnapshot = await orderRef.get();
    if (!orderSnapshot.exists || orderSnapshot.data()?.userId !== user.uid) throw new HttpError(404, "Invoice not found.");
    const order = orderSnapshot.data()!;
    if (order.paymentStatus === "paid" && order.transactionHash === transactionHash) {
      res.json({ status: "paid", transactionHash, confirmationCount: order.confirmationCount });
      return;
    }
    if (order.paymentStatus === "paid") throw new HttpError(409, "This invoice is already paid with a different transaction.");
    if (order.paymentStatus !== "pending_payment") throw new HttpError(409, "This invoice is not awaiting payment.");

    const config = getPaymentConfig();
    const expectedToken = getTokenForMethod(config, order.paymentMethod);
    const token = await getTokenDetails(expectedToken.address, expectedToken.symbol);
    if (order.chainId !== config.chainId || order.tokenAddress !== token.address || order.treasuryAddress !== config.treasuryAddress || order.tokenDecimals !== token.decimals) {
      throw new HttpError(409, "This invoice uses outdated payment configuration. Contact the project team for a new invoice.");
    }

    const provider = getBaseProvider();
    const [transaction, receipt] = await Promise.all([provider.getTransaction(transactionHash), provider.getTransactionReceipt(transactionHash)]);
    if (!transaction || !receipt) throw new HttpError(409, "Transaction not found on Base yet. Wait for it to be mined, then retry.");
    if (transaction.chainId !== BigInt(config.chainId) || !transaction.to || getAddress(transaction.to) !== token.address) {
      throw new HttpError(400, "Transaction is not a transfer through this invoice's configured token contract on Base.");
    }
    if (receipt.status !== 1) throw new HttpError(400, "The transaction failed on Base.");
    const currentBlock = await provider.getBlockNumber();
    const confirmationCount = currentBlock - receipt.blockNumber + 1;
    if (confirmationCount < config.confirmations) throw new HttpError(409, `Payment is included but needs ${config.confirmations} confirmations before it can be verified.`);

    let receivedAmount = 0n;
    const senders = new Set<string>();
    for (const log of receipt.logs) {
      if (getAddress(log.address) !== token.address) continue;
      try {
        const transfer = transferInterface.parseLog({ topics: [...log.topics], data: log.data });
        if (!transfer || transfer.name !== "Transfer") continue;
        const from = getAddress(String(transfer.args.from));
        const to = getAddress(String(transfer.args.to));
        if (to === config.treasuryAddress && from !== config.treasuryAddress) {
          receivedAmount += BigInt(transfer.args.value);
          senders.add(from);
        }
      } catch {
        continue;
      }
    }
    const expectedAmount = BigInt(order.amountTokenUnits);
    if (senders.size !== 1 || !senders.has(getAddress(transaction.from)) || receivedAmount !== expectedAmount) {
      throw new HttpError(400, "Payment does not match this invoice's token, sender, treasury recipient and exact amount.");
    }

    const paymentRef = db.collection("services_payment_transactions").doc(transactionHash.slice(2));
    const paymentStatus = await db.runTransaction(async (transactionInDb) => {
      const [currentOrder, existingPayment, currentInvoice] = await Promise.all([
        transactionInDb.get(orderRef), transactionInDb.get(paymentRef), transactionInDb.get(invoiceRef),
      ]);
      if (!currentOrder.exists || currentOrder.data()?.userId !== user.uid) throw new HttpError(404, "Invoice not found.");
      if (existingPayment.exists) {
        if (existingPayment.data()?.orderId === orderId) return "paid";
        throw new HttpError(409, "This transaction hash has already been used for another invoice.");
      }
      if (!currentInvoice.exists) throw new HttpError(404, "Invoice record not found.");
      if (currentOrder.data()?.paymentStatus !== "pending_payment") throw new HttpError(409, "Invoice status changed while payment was being checked.");
      const paidAt = FieldValue.serverTimestamp();
      transactionInDb.create(paymentRef, {
        transactionHash,
        orderId,
        invoiceReference: order.invoiceReference,
        userId: user.uid,
        chainId: config.chainId,
        tokenAddress: token.address,
        tokenSymbol: token.symbol,
        tokenDecimals: token.decimals,
        amountTokenUnits: expectedAmount.toString(),
        senderAddress: getAddress(transaction.from),
        recipientAddress: config.treasuryAddress,
        blockNumber: receipt.blockNumber,
        confirmationCount,
        status: "verified",
        createdAt: paidAt,
      });
      transactionInDb.update(orderRef, { paymentStatus: "paid", status: "paid", transactionHash, confirmationCount, paidAt, updatedAt: FieldValue.serverTimestamp() });
      transactionInDb.update(invoiceRef, { paymentStatus: "paid", status: "paid", transactionHash, confirmationCount, paidAt, updatedAt: FieldValue.serverTimestamp() });
      return "paid";
    });
    if (paymentStatus === "paid") {
      const verifiedDetails = [
        { label: "Invoice", value: order.invoiceReference },
        { label: "Project", value: order.projectName },
        { label: "Amount", value: `${formatBaseUnits(order.amountTokenUnits, order.tokenDecimals)} ${order.tokenSymbol}` },
        { label: "Base confirmations", value: String(confirmationCount) },
      ];
      await Promise.allSettled([
        sendTransactionNotification({ to: user.email!, userId: user.uid, eventId: `payment:${orderId}:${transactionHash}`, verifiedEvent: true, details: verifiedDetails, transactionHash, status: "confirmed" }),
        sendAdminNotification({ severity: "INFO", subject: `Payment received: ${order.invoiceReference}`, message: `A Base payment was verified for ${order.projectName}.`, eventId: `payment-admin:${orderId}:${transactionHash}`, category: "verified_payment" }),
      ]);
    }
    res.json({ status: paymentStatus, transactionHash, confirmationCount });
  } catch (error) {
    respondWithError(res, error);
  }
});

router.get("/api/revenue/admin/orders", async (req, res) => {
  try {
    await verifyGoogleUser(req, true);
    const { db } = getFirebaseServices();
    const snapshot = await db.collection("services_orders").orderBy("createdAt", "desc").limit(100).get();
    res.json({ orders: snapshot.docs.map((document) => serializeOrder(document.data(), document.id)) });
  } catch (error) {
    respondWithError(res, error);
  }
});

router.get("/api/revenue/admin/overview", async (req, res) => {
  try {
    await verifyGoogleUser(req, true);
    const { db } = getFirebaseServices();
    const [inquiriesSnapshot, ordersSnapshot] = await Promise.all([
      db.collection("services_inquiries").orderBy("createdAt", "desc").limit(100).get(),
      db.collection("services_orders").orderBy("createdAt", "desc").limit(500).get(),
    ]);
    let usdcReceivedUnits = 0n;
    const aglReceipts = new Map<string, { tokenAddress: string; decimals: number; units: bigint }>();
    let paidOrders = 0;
    let pendingOrders = 0;
    for (const document of ordersSnapshot.docs) {
      const order = document.data();
      if (order.paymentStatus === "pending_payment") pendingOrders++;
      if (order.paymentStatus !== "paid") continue;
      paidOrders++;
      if (order.paymentMethod === "USDC") usdcReceivedUnits += BigInt(order.amountTokenUnits);
      if (order.paymentMethod === "AGL") {
        const key = `${order.tokenAddress}:${order.tokenDecimals}`;
        const receipt = aglReceipts.get(key) || { tokenAddress: order.tokenAddress, decimals: Number(order.tokenDecimals), units: 0n };
        receipt.units += BigInt(order.amountTokenUnits);
        aglReceipts.set(key, receipt);
      }
    }
    res.json({
      recentInquiryCount: inquiriesSnapshot.size,
      recentOrderCount: ordersSnapshot.size,
      paidOrders,
      pendingOrders,
      usdcReceivedUnits: usdcReceivedUnits.toString(),
      aglReceipts: Array.from(aglReceipts.values()).map((receipt) => ({ ...receipt, units: receipt.units.toString() })),
      inquiries: inquiriesSnapshot.docs.map((document) => serializeInquiry(document.data(), document.id)),
      orders: ordersSnapshot.docs.slice(0, 100).map((document) => serializeOrder(document.data(), document.id)),
    });
  } catch (error) {
    respondWithError(res, error);
  }
});

router.patch("/api/revenue/admin/orders/:id", async (req, res) => {
  try {
    await verifyGoogleUser(req, true);
    const orderId = boundedString(req.params.id, "Order", 128, true);
    const status = boundedString(req.body?.status, "Order status", 32, true);
    if (!new Set(["in_progress", "delivered"]).has(status)) throw new HttpError(400, "Choose a valid order status.");
    const { db } = getFirebaseServices();
    const orderRef = db.collection("services_orders").doc(orderId);
    const order = await orderRef.get();
    if (!order.exists) throw new HttpError(404, "Order not found.");
    const currentOrder = order.data()!;
    if (currentOrder.paymentStatus !== "paid") throw new HttpError(409, "Only a verified paid order can be moved into delivery.");
    const validTransition = currentOrder.status === "paid" && status === "in_progress" || currentOrder.status === "in_progress" && status === "delivered";
    if (!validTransition) throw new HttpError(409, "Order status can only move from paid to in progress, then delivered.");
    await orderRef.update({ status, updatedAt: FieldValue.serverTimestamp() });
    res.json({ id: orderId, status });
  } catch (error) {
    respondWithError(res, error);
  }
});

router.patch("/api/revenue/admin/inquiries/:id", async (req, res) => {
  try {
    await verifyGoogleUser(req, true);
    const id = boundedString(req.params.id, "Inquiry", 120, true);
    const status = boundedString(req.body?.status, "Status", 32, true);
    const validStatuses = new Set(["new", "reviewing", "closed"]);
    if (!validStatuses.has(status)) throw new HttpError(400, "Choose a valid inquiry status.");
    const { db } = getFirebaseServices();
    const inquiryRef = db.collection("services_inquiries").doc(id);
    const inquiry = await inquiryRef.get();
    if (!inquiry.exists) throw new HttpError(404, "Inquiry not found.");
    await inquiryRef.update({ status, updatedAt: FieldValue.serverTimestamp() });
    res.json({ id, status });
  } catch (error) {
    respondWithError(res, error);
  }
});

function respondWithError(res: Response, error: unknown) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  res.status(500).json({ error: "We could not securely process this request. Please try again later." });
}

export default router;
