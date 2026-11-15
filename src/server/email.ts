import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import express, { Router, type Request, type Response } from "express";

const router = Router();
const categories = ["dao", "staking", "credits", "general", "marketing"] as const;
type PreferenceCategory = (typeof categories)[number];
type Severity = "INFO" | "WARNING" | "ERROR" | "CRITICAL";
type EmailKind = "welcome" | "verification" | "password_reset" | "security" | "dao" | "credits" | "staking" | "transaction" | "admin" | "marketing";
type EmailDetail = { label: string; value: string };
type EmailPayload = {
  to: string;
  subject: string;
  kind: EmailKind;
  category: PreferenceCategory;
  heading: string;
  intro: string;
  details?: EmailDetail[];
  actionUrl?: string;
  actionLabel?: string;
  userId?: string;
  idempotencyKey?: string;
  eventId?: string;
  essential?: boolean;
};
type EventPayload = { to: string; userId?: string; eventId: string; verifiedEvent: true; details: EmailDetail[]; subject?: string };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_EVENT_ID = /^[A-Za-z0-9:_-]{1,160}$/;
const MAX_WEBHOOK_AGE_SECONDS = 300;

function firebaseServices() {
  const rawAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const databaseId = process.env.FIREBASE_DATABASE_ID;
  if (!rawAccount || !databaseId) throw new Error("Firebase Admin service credentials are not configured.");
  let account: { project_id?: string; client_email?: string; private_key?: string };
  try {
    account = JSON.parse(rawAccount);
  } catch {
    throw new Error("Firebase Admin service credentials are invalid.");
  }
  if (!account.project_id || !account.client_email || !account.private_key) throw new Error("Firebase Admin service credentials are incomplete.");
  const app = getApps()[0] ?? initializeApp({ credential: cert({ projectId: account.project_id, clientEmail: account.client_email, privateKey: account.private_key }) });
  return { auth: getAuth(app), db: getFirestore(app, databaseId) };
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function allowedAppUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ["aglstudio.xyz", "www.aglstudio.xyz"].includes(url.hostname) ? url.toString() : "";
  } catch {
    return "";
  }
}

function unsubscribeToken(uid: string) {
  return createHmac("sha256", process.env.RESEND_API_KEY || "").update(uid).digest("hex");
}

function emailHtml(payload: EmailPayload) {
  const rows = (payload.details || []).slice(0, 12).map(({ label, value }) => `<tr><td style="padding:10px 12px;color:#a1a1aa;border-bottom:1px solid #27272a">${escapeHtml(label)}</td><td style="padding:10px 12px;color:#f4f4f5;border-bottom:1px solid #27272a;word-break:break-word">${escapeHtml(value)}</td></tr>`).join("");
  const link = payload.actionUrl ? allowedAppUrl(payload.actionUrl) : "";
  const button = link ? `<p style="margin:28px 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:13px 18px;background:#a3e635;color:#10130a;text-decoration:none;font-weight:700;border-radius:10px">${escapeHtml(payload.actionLabel || "Open AGL Studio")}</a></p>` : "";
  const unsubscribe = payload.category === "marketing" && payload.userId && process.env.RESEND_API_KEY ? `<p style="margin:24px 0 0;color:#71717a;font-size:12px"><a href="https://aglstudio.xyz/api/email/unsubscribe?uid=${encodeURIComponent(payload.userId)}&token=${unsubscribeToken(payload.userId)}" style="color:#bef264">Unsubscribe from optional updates</a></p>` : "";
  const securityTip = payload.kind === "security" || payload.kind === "password_reset" ? "If you did not request this, secure your account and contact our team. AGL Studio will never ask for your password, private key, or recovery phrase." : "";
  return `<!doctype html><html><body style="margin:0;background:#090b09;color:#f4f4f5;font-family:Arial,Helvetica,sans-serif"><div style="max-width:620px;margin:0 auto;padding:28px 16px"><div style="border:1px solid #292d27;border-radius:18px;background:#11140f;overflow:hidden"><div style="padding:22px 24px;border-bottom:1px solid #292d27"><p style="margin:0;color:#bef264;font-size:12px;letter-spacing:2px;text-transform:uppercase">AGUNNAYA LABS · AGL STUDIO</p></div><main style="padding:26px 24px"><h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#fff">${escapeHtml(payload.heading)}</h1><p style="margin:0;color:#d4d4d8;font-size:15px;line-height:1.7">${escapeHtml(payload.intro)}</p>${rows ? `<table role="presentation" style="width:100%;margin:22px 0;border-collapse:collapse;font-size:13px">${rows}</table>` : ""}${button}${securityTip ? `<p style="padding:14px;border:1px solid #3f3f46;border-radius:10px;color:#d4d4d8;font-size:13px;line-height:1.6">${escapeHtml(securityTip)}</p>` : ""}<p style="margin:24px 0 0;color:#71717a;font-size:12px">${new Date().toISOString()}</p></main></div><p style="padding:0 8px;color:#71717a;font-size:12px;line-height:1.6">Need help? Contact <a href="mailto:${escapeHtml(process.env.RESEND_REPLY_TO || "admin@aglstudio.xyz")}" style="color:#bef264">${escapeHtml(process.env.RESEND_REPLY_TO || "admin@aglstudio.xyz")}</a>. This message is from AGL Studio.${unsubscribe}</p></div></body></html>`;
}

function cleanPayload(payload: EmailPayload): EmailPayload {
  if (!EMAIL_REGEX.test(payload.to) || payload.to.length > 254) throw new Error("Recipient email is invalid.");
  if (!payload.subject.trim() || payload.subject.length > 180) throw new Error("Email subject is invalid.");
  if (!payload.heading.trim() || payload.heading.length > 180 || payload.intro.length > 2000) throw new Error("Email content is invalid.");
  if (!categories.includes(payload.category)) throw new Error("Email category is invalid.");
  if (payload.details?.some((item) => item.label.length > 80 || item.value.length > 500)) throw new Error("Email detail is too long.");
  return payload;
}

async function shouldSendPreference(payload: EmailPayload) {
  if (payload.essential || !payload.userId) return true;
  const { db } = firebaseServices();
  const pref = await db.collection("email_preferences").doc(payload.userId).get();
  const value = pref.data() || {};
  if (payload.category === "marketing") return value.marketing === true;
  return value[payload.category] !== false;
}

async function claimDelivery(key: string, payload: EmailPayload) {
  const { db } = firebaseServices();
  const reference = db.collection("email_delivery_logs").doc(key);
  return db.runTransaction(async (transaction) => {
    const current = await transaction.get(reference);
    const record = current.data();
    if (["sent", "delivered", "bounced", "complained"].includes(String(record?.status))) return { claimed: false, record };
    const leaseUntil = Number(record?.leaseUntil || 0);
    if (record?.status === "sending" && leaseUntil > Date.now()) return { claimed: false, record };
    transaction.set(reference, {
      recipient: payload.to,
      subject: payload.subject,
      category: payload.category,
      kind: payload.kind,
      userId: payload.userId || null,
      eventId: payload.eventId || null,
      status: "sending",
      leaseUntil: Date.now() + 60_000,
      attempts: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
      ...(current.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    }, { merge: true });
    return { claimed: true, record };
  });
}

export async function sendTransactionalEmail(input: EmailPayload) {
  const payload = cleanPayload(input);
  if (!(await shouldSendPreference(payload))) return { status: "skipped" as const };
  const keyInput = payload.idempotencyKey || payload.eventId || randomBytes(16).toString("hex");
  if (keyInput.length > 200) throw new Error("Email idempotency key is invalid.");
  const key = createHash("sha256").update(keyInput).digest("hex");
  const claim = await claimDelivery(key, payload);
  if (!claim.claimed) return { status: String(claim.record?.status || "sending") as "sending" | "sent" | "delivered" | "bounced" | "complained", messageId: claim.record?.messageId };

  const apiKey = process.env.RESEND_API_KEY;
  const domain = process.env.RESEND_EMAIL_DOMAIN || "aglstudio.xyz";
  const senderAddress = payload.kind === "welcome" ? "welcome" : payload.kind === "security" || payload.kind === "verification" || payload.kind === "password_reset" ? "security" : payload.kind === "dao" ? "governance" : payload.kind === "credits" ? "billing" : "notifications";
  const sender = senderAddress === "notifications" ? (process.env.RESEND_FROM_EMAIL || `AGL Studio <notifications@${domain}>`) : `AGL Studio <${senderAddress}@${domain}>`;
  const replyTo = process.env.RESEND_REPLY_TO || "admin@aglstudio.xyz";
  if (!apiKey || !/^[a-z0-9.-]+$/i.test(domain) || !sender.includes(`@${domain.replace(/^\./, "")}>`) && !sender.includes(`@${domain.replace(/^\./, "")}`)) {
    const { db } = firebaseServices();
    await db.collection("email_delivery_logs").doc(key).set({ status: "failed", errorCode: "configuration", updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    throw new Error("Transactional email is not configured with a verified sender.");
  }

  const { db } = firebaseServices();
  let lastStatus = 0;
  let messageId = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": keyInput },
        body: JSON.stringify({ from: sender, to: [payload.to], reply_to: replyTo, subject: payload.subject, html: emailHtml(payload), tags: [{ name: "agl-kind", value: payload.kind }] }),
        signal: AbortSignal.timeout(8000),
      });
      lastStatus = response.status;
      const responseData = await response.json().catch(() => ({})) as { id?: string };
      if (response.ok && typeof responseData.id === "string") {
        messageId = responseData.id;
        await db.collection("email_delivery_logs").doc(key).set({ status: "sent", messageId, acceptedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), leaseUntil: 0 }, { merge: true });
        return { status: "sent" as const, messageId };
      }
      if (response.status < 500 && response.status !== 429) break;
    } catch {
      lastStatus = 0;
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
  }
  await db.collection("email_delivery_logs").doc(key).set({ status: "failed", errorCode: lastStatus ? `resend_${lastStatus}` : "network_error", updatedAt: FieldValue.serverTimestamp(), leaseUntil: 0 }, { merge: true });
  console.error("[email] Resend delivery failed", { status: lastStatus || "network_error", kind: payload.kind });
  throw new Error("Email delivery could not be accepted by Resend.");
}

function base(to: string, kind: EmailKind, category: PreferenceCategory, heading: string, intro: string, details?: EmailDetail[], eventId?: string, userId?: string, actionUrl?: string, actionLabel?: string, essential = false): EmailPayload {
  return { to, kind, category, heading, intro, details, eventId, userId, actionUrl, actionLabel, essential, subject: heading, idempotencyKey: eventId };
}

export function sendWelcomeEmail(to: string, userId?: string) {
  return sendTransactionalEmail(base(to, "welcome", "general", "Welcome to AGL Studio", "Your AGL Studio account is ready. Explore the workspace and manage your account from the official application.", undefined, `welcome:${userId || to.toLowerCase()}`, userId, "https://aglstudio.xyz", "Open AGL Studio"));
}

export function sendVerificationEmail(to: string, verificationUrl: string, eventId: string) {
  const url = allowedAppUrl(verificationUrl);
  if (!url) throw new Error("Verification link must use the official AGL Studio domain.");
  return sendTransactionalEmail(base(to, "verification", "general", "Verify your email address", "Use the secure link below to verify your AGL Studio email address.", undefined, eventId, undefined, url, "Verify email", true));
}

export function sendPasswordResetEmail(to: string, resetUrl: string, eventId: string) {
  const url = allowedAppUrl(resetUrl);
  if (!url) throw new Error("Password reset link must use the official AGL Studio domain.");
  return sendTransactionalEmail(base(to, "password_reset", "general", "Password reset requested", "A password reset was requested for your AGL Studio account.", undefined, eventId, undefined, url, "Reset password", true));
}

export function sendSecurityAlert(to: string, subject: string, details: EmailDetail[], eventId: string, userId?: string) {
  return sendTransactionalEmail({ ...base(to, "security", "general", subject, "A security-related event requires your attention.", details, eventId, userId, "https://aglstudio.xyz", "Review account security", true), subject });
}

function requireVerifiedEvent(event: EventPayload) {
  if (event.verifiedEvent !== true || !SAFE_EVENT_ID.test(event.eventId) || !event.details.length) throw new Error("A verified event reference and event details are required.");
}

export function sendDAOProposalNotification(event: EventPayload & { event: "proposal" | "voting_start" | "reminder" | "result" | "execution" }) {
  requireVerifiedEvent(event);
  const names = { proposal: "New DAO proposal", voting_start: "DAO voting has started", reminder: "DAO voting reminder", result: "DAO proposal results are available", execution: "DAO proposal execution confirmed" };
  const subject = names[event.event];
  return sendTransactionalEmail({ ...base(event.to, "dao", "dao", subject, "Governance event confirmed by the application.", event.details, event.eventId, event.userId), subject });
}

export function sendDAOVotingNotification(event: EventPayload & { event: "voting_start" | "reminder" }) {
  return sendDAOProposalNotification({ ...event, event: event.event });
}

export function sendAGLCreditReceipt(event: EventPayload & { transactionHash: string; amount: string }) {
  requireVerifiedEvent(event);
  if (!/^0x[a-fA-F0-9]{64}$/.test(event.transactionHash) || !/^\d+(\.\d+)?$/.test(event.amount)) throw new Error("Credit receipt requires a verified transaction hash and amount.");
  return sendTransactionalEmail({ ...base(event.to, "credits", "credits", "AGL Credits purchase confirmed", "The AGL Credits contract transaction has been verified.", [...event.details, { label: "Amount", value: event.amount }, { label: "Transaction", value: event.transactionHash }], event.eventId, event.userId), subject: "AGL Credits purchase confirmed" });
}

export function sendStakingNotification(event: EventPayload & { event: "staked" | "unstaked" | "reward_claimed" | "position_updated"; transactionHash: string }) {
  requireVerifiedEvent(event);
  if (!/^0x[a-fA-F0-9]{64}$/.test(event.transactionHash)) throw new Error("Staking notification requires a verified transaction hash.");
  const title = { staked: "Staking confirmed", unstaked: "Unstaking confirmed", reward_claimed: "Staking rewards claimed", position_updated: "Staking position updated" }[event.event];
  return sendTransactionalEmail({ ...base(event.to, "staking", "staking", title, "This staking event was confirmed against the configured chain.", [...event.details, { label: "Transaction", value: event.transactionHash }], event.eventId, event.userId), subject: title });
}

export function sendTransactionNotification(event: EventPayload & { transactionHash: string; status: "confirmed" | "failed" }) {
  requireVerifiedEvent(event);
  if (!/^0x[a-fA-F0-9]{64}$/.test(event.transactionHash)) throw new Error("Transaction notification requires a transaction hash.");
  const title = event.status === "confirmed" ? "Transaction confirmed" : "Transaction failed";
  return sendTransactionalEmail({ ...base(event.to, "transaction", "general", title, event.status === "confirmed" ? "The transaction was confirmed by the server." : "The server confirmed that the transaction failed.", [...event.details, { label: "Transaction", value: event.transactionHash }], event.eventId, event.userId), subject: title });
}

export function sendMarketingEmail(event: EventPayload & { subject: string; intro: string; actionUrl?: string; actionLabel?: string }) {
  requireVerifiedEvent(event);
  if (event.subject.length > 180 || event.intro.length > 2000) throw new Error("Marketing email content is invalid.");
  return sendTransactionalEmail({ ...base(event.to, "marketing", "marketing", event.subject, event.intro, event.details, event.eventId, event.userId, event.actionUrl, event.actionLabel), subject: event.subject });
}

export function sendAdminNotification(event: { subject: string; message: string; severity: Severity; eventId: string; category: string }) {
  if (!SAFE_EVENT_ID.test(event.eventId) || event.subject.length > 180 || event.message.length > 1200) throw new Error("Admin alert payload is invalid.");
  const to = process.env.AGL_ADMIN_EMAIL || "admin@aglstudio.xyz";
  const key = createHash("sha256").update(`${event.category}:${event.eventId}`).digest("hex");
  return sendTransactionalEmail({ ...base(to, "admin", "general", `[${event.severity}] ${event.subject}`, event.message, [{ label: "Severity", value: event.severity }, { label: "Category", value: event.category }], `admin:${key}`, undefined, "https://aglstudio.xyz", "Open AGL Studio", true), subject: `[${event.severity}] ${event.subject}` });
}

async function requireAdmin(req: Request) {
  const authorization = req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) throw Object.assign(new Error("Sign in with your verified administrator account."), { status: 401 });
  let decoded;
  try {
    decoded = await firebaseServices().auth.verifyIdToken(match[1], true);
  } catch {
    throw Object.assign(new Error("Your session could not be verified. Sign in again."), { status: 401 });
  }
  const admins = (process.env.AGL_ADMIN_EMAILS || "").split(/[;,\s]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!decoded.email || !decoded.email_verified || decoded.firebase?.sign_in_provider !== "google.com" || !admins.includes(decoded.email.toLowerCase())) {
    throw Object.assign(new Error("This verified Google account is not in the server-side administrator allowlist."), { status: 403 });
  }
  return decoded;
}

async function recordAdminAction(uid: string, action: string, details: Record<string, string>) {
  const { db } = firebaseServices();
  await db.collection("admin_audit_logs").add({ actorUid: uid, action, details, createdAt: FieldValue.serverTimestamp() });
}

router.post("/api/email/webhooks/resend", express.raw({ type: "application/json", limit: "64kb" }), async (req, res) => {
  try {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    const rawBody = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : "";
    const id = req.header("svix-id") || "";
    const timestamp = req.header("svix-timestamp") || "";
    const signatures = req.header("svix-signature") || "";
    const timestampNumber = Number(timestamp);
    if (!secret || !rawBody || !id || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - timestampNumber) > MAX_WEBHOOK_AGE_SECONDS) throw new Error("Webhook signature is invalid.");
    const signingKey = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
    const expected = createHmac("sha256", signingKey).update(`${id}.${timestamp}.${rawBody}`).digest();
    const valid = signatures.split(" ").some((item) => {
      const [version, encoded] = item.split(",");
      if (version !== "v1" || !encoded) return false;
      try {
        const candidate = Buffer.from(encoded, "base64");
        return candidate.length === expected.length && timingSafeEqual(candidate, expected);
      } catch { return false; }
    });
    if (!valid) throw new Error("Webhook signature is invalid.");

    const event = JSON.parse(rawBody) as { type?: string; data?: { email_id?: string; to?: string[]; subject?: string } };
    if (!event.type || !event.data || typeof event.data !== "object") throw new Error("Webhook event body is invalid.");
    const { db } = firebaseServices();
    const webhookRef = db.collection("email_webhook_events").doc(createHash("sha256").update(id).digest("hex"));
    const accepted = await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(webhookRef);
      if (existing.exists) return false;
      transaction.create(webhookRef, { eventId: id, type: event.type, emailId: event.data?.email_id || null, receivedAt: FieldValue.serverTimestamp() });
      return true;
    });
    if (!accepted) { res.json({ received: true, duplicate: true }); return; }

    const messageId = event.data.email_id;
    const mapped: Record<string, string> = { "email.sent": "sent", "email.delivered": "delivered", "email.delivery_delayed": "sent", "email.bounced": "bounced", "email.complained": "complained", "email.failed": "failed" };
    if (messageId && mapped[event.type]) {
      const logs = await db.collection("email_delivery_logs").where("messageId", "==", messageId).limit(1).get();
      if (!logs.empty) await logs.docs[0].ref.set({ status: mapped[event.type], lastWebhookType: event.type, lastWebhookAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      if (["email.failed", "email.bounced", "email.complained"].includes(event.type)) {
        const hourBucket = Math.floor(Date.now() / 3_600_000);
        const alertRef = db.collection("email_alert_limits").doc(`${event.type}-${hourBucket}`);
        const shouldAlert = await db.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(alertRef);
          const count = Number(snapshot.data()?.count || 0);
          transaction.set(alertRef, { count: count + 1, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
          return count === 0 || count % 10 === 0;
        });
        if (shouldAlert) {
          const isComplaint = event.type === "email.complained";
          const subject = isComplaint ? "Email complaint received" : event.type === "email.failed" ? "Email delivery failed" : "Email bounce activity";
          void sendAdminNotification({ severity: isComplaint ? "CRITICAL" : "WARNING", subject, message: `A verified Resend webhook reported ${event.type}. Review the email monitoring console.`, eventId: `${event.type}:${hourBucket}:${Math.floor(Date.now() / 600_000)}`, category: "email_delivery" }).catch(() => undefined);
        }
      }
    }
    await db.collection("email_system_state").doc("resend").set({ lastWebhookType: event.type, lastWebhookAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json({ received: true, duplicate: false });
  } catch (error) {
    console.error("[email] Resend webhook rejected", error instanceof Error ? error.message : "invalid event");
    res.status(400).json({ error: "Webhook signature or event validation failed." });
  }
});

router.use(express.json({ limit: "16kb" }));

router.get("/api/email/preferences", async (req, res) => {
  try {
    const user = await verifyGoogleUser(req);
    const { db } = firebaseServices();
    const snapshot = await db.collection("email_preferences").doc(user.uid).get();
    const value = snapshot.data() || {};
    res.json({ preferences: { dao: value.dao !== false, staking: value.staking !== false, credits: value.credits !== false, general: value.general !== false, marketing: value.marketing === true, security: true } });
  } catch (error) { respond(res, error); }
});

router.put("/api/email/preferences", async (req, res) => {
  try {
    const user = await verifyGoogleUser(req);
    const input = req.body?.preferences;
    if (!input || typeof input !== "object" || Array.isArray(input) || categories.some((key) => typeof input[key] !== "boolean")) throw Object.assign(new Error("Provide boolean values for all email preferences."), { status: 400 });
    const preferences = Object.fromEntries(categories.map((key) => [key, input[key]]));
    const { db } = firebaseServices();
    await db.collection("email_preferences").doc(user.uid).set({ ...preferences, security: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json({ preferences: { ...preferences, security: true } });
  } catch (error) { respond(res, error); }
});

router.get("/api/email/admin/overview", async (req, res) => {
  try {
    await requireAdmin(req);
    const { db } = firebaseServices();
    const [logs, system, audit] = await Promise.all([
      db.collection("email_delivery_logs").orderBy("createdAt", "desc").limit(500).get(),
      db.collection("email_system_state").doc("resend").get(),
      db.collection("admin_audit_logs").orderBy("createdAt", "desc").limit(50).get(),
    ]);
    const date = (value: unknown) => value instanceof Timestamp ? value.toDate().toISOString() : null;
    const rows = logs.docs.map((document) => {
      const data = document.data();
      return { id: document.id, recipient: data.recipient || "", subject: data.subject || "", category: data.category || "", kind: data.kind || "", status: data.status || "queued", messageId: data.messageId || null, createdAt: date(data.createdAt), updatedAt: date(data.updatedAt), lastWebhookAt: date(data.lastWebhookAt) };
    });
    const counts = rows.reduce<Record<string, number>>((sum, row) => { sum[row.status] = (sum[row.status] || 0) + 1; return sum; }, {});
    const bounced = counts.bounced || 0;
    const complaintCount = counts.complained || 0;
    const webhook = system.data() || {};
    const lastWebhookAt = webhook.lastWebhookAt instanceof Timestamp ? webhook.lastWebhookAt.toDate().toISOString() : null;
    const adminActivity = audit.docs.map((document) => ({ id: document.id, action: String(document.data().action || ""), actorUid: String(document.data().actorUid || ""), createdAt: date(document.data().createdAt) }));
    res.json({ total: rows.length, delivered: counts.delivered || 0, failed: counts.failed || 0, bounced, complaints: complaintCount, bounceRate: rows.length ? Number((bounced / rows.length * 100).toFixed(2)) : 0, activity: rows.slice(0, 100), adminActivity, lastWebhookAt, lastWebhookType: webhook.lastWebhookType || null, resendConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_EMAIL_DOMAIN && process.env.RESEND_WEBHOOK_SECRET), administratorEmail: process.env.AGL_ADMIN_EMAIL || "admin@aglstudio.xyz" });
  } catch (error) { respond(res, error); }
});

router.post("/api/email/admin/test", async (req, res) => {
  try {
    const user = await requireAdmin(req);
    const userId = String(user.uid);
    const { db } = firebaseServices();
    const limitRef = db.collection("email_admin_rate_limits").doc(userId);
    const allowed = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(limitRef);
      const lastSentAt = Number(snapshot.data()?.lastSentAt || 0);
      if (Date.now() - lastSentAt < 60_000) return false;
      transaction.set(limitRef, { lastSentAt: Date.now() });
      return true;
    });
    if (!allowed) throw Object.assign(new Error("Wait one minute before sending another test email."), { status: 429 });
    const recipient = process.env.AGL_ADMIN_EMAIL || "admin@aglstudio.xyz";
    const result = await sendTransactionalEmail({ ...base(recipient, "admin", "general", "AGL Studio email test", "This is a test message from the authorized administrator console. Resend accepted the request; this does not guarantee inbox delivery.", [{ label: "Requested by", value: user.email || "verified admin" }, { label: "Timestamp", value: new Date().toISOString() }], `admin-test:${userId}:${Date.now()}`, undefined, "https://aglstudio.xyz", "Open AGL Studio", true), subject: "AGL Studio email test" });
    await recordAdminAction(userId, "email.test_send", { recipient, messageId: String(result.messageId || "") });
    res.json({ status: result.status, messageId: result.messageId || null, recipient });
  } catch (error) { respond(res, error); }
});

router.get("/api/email/admin/audit", async (req, res) => {
  try {
    await requireAdmin(req);
    const { db } = firebaseServices();
    const logs = await db.collection("admin_audit_logs").where("action", "==", "email.test_send").orderBy("createdAt", "desc").limit(50).get();
    res.json({ activity: logs.docs.map((document) => ({ id: document.id, ...document.data(), createdAt: document.data().createdAt instanceof Timestamp ? document.data().createdAt.toDate().toISOString() : null })) });
  } catch (error) { respond(res, error); }
});

router.get("/api/email/unsubscribe", async (req, res) => {
  try {
    const uid = typeof req.query.uid === "string" ? req.query.uid : "";
    const token = typeof req.query.token === "string" ? req.query.token : "";
    const secret = process.env.RESEND_API_KEY;
    if (!uid || uid.length > 128 || !token || !secret) throw new Error("Unsubscribe link is invalid.");
    const expected = createHmac("sha256", secret).update(uid).digest("hex");
    const supplied = Buffer.from(token, "hex");
    const expectedBuffer = Buffer.from(expected, "hex");
    if (supplied.length !== expectedBuffer.length || !timingSafeEqual(supplied, expectedBuffer)) throw new Error("Unsubscribe link is invalid.");
    const { db } = firebaseServices();
    await db.collection("email_preferences").doc(uid).set({ marketing: false, security: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.type("text/plain").send("You have been unsubscribed from optional marketing emails. Essential security notifications remain enabled.");
  } catch { res.status(400).type("text/plain").send("This unsubscribe link is invalid or expired."); }
});

async function verifyGoogleUser(req: Request) {
  const authorization = req.header("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  if (!match) throw Object.assign(new Error("A verified Google account is required."), { status: 401 });
  let user;
  try { user = await firebaseServices().auth.verifyIdToken(match[1], true); }
  catch { throw Object.assign(new Error("Your session could not be verified. Sign in again."), { status: 401 }); }
  if (!user.email || !user.email_verified || user.firebase?.sign_in_provider !== "google.com") throw Object.assign(new Error("A verified Google account is required."), { status: 403 });
  return user;
}

function respond(res: Response, error: unknown) {
  const status = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : 500;
  const message = status < 500 && error instanceof Error ? error.message : "Email service request could not be securely completed.";
  res.status(status).json({ error: message });
}

export default router;
