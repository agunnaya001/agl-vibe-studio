import { ethers } from "ethers";
import {
  AGL_TOKEN_ABI,
  BASE_NETWORKS,
  BONDING_CURVE_ABI,
  getContractAddresses,
  getNetwork,
  isAddressConfigured,
} from "./contracts";

export type WalletProvider = ethers.Eip1193Provider;

export function getReadProvider() {
  const network = getNetwork();
  return new ethers.JsonRpcProvider(BASE_NETWORKS[network].rpcUrl, BASE_NETWORKS[network].id);
}

export async function connectInjectedWallet() {
  const injected = (window as Window & { ethereum?: WalletProvider }).ethereum;
  if (!injected) throw new Error("No browser wallet detected. Install MetaMask or Coinbase Wallet.");
  const provider = new ethers.BrowserProvider(injected);
  await provider.send("eth_requestAccounts", []);
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  const expected = BASE_NETWORKS[getNetwork()].id;
  if (Number(network.chainId) !== expected) {
    throw new Error(`Switch your wallet to ${BASE_NETWORKS[getNetwork()].name}.`);
  }
  return { provider, signer, address: await signer.getAddress() };
}

export async function getNativeBalance(address: string) {
  return ethers.formatEther(await getReadProvider().getBalance(address));
}

export async function getAglBalance(address: string) {
  const tokenAddress = getContractAddresses().aglToken;
  if (!isAddressConfigured(tokenAddress)) return null;
  const contract = new ethers.Contract(tokenAddress, AGL_TOKEN_ABI, getReadProvider());
  const [raw, decimals, symbol] = await Promise.all([
    contract.balanceOf(address),
    contract.decimals().catch(() => 18),
    contract.symbol().catch(() => "AGL"),
  ]);
  return { value: ethers.formatUnits(raw, decimals), symbol };
}

export async function getTradeContract(signer: ethers.Signer) {
  const address = getContractAddresses().bondingCurve;
  if (!isAddressConfigured(address)) {
    throw new Error("Bonding curve contract is not configured for the selected Base network.");
  }
  return new ethers.Contract(address, BONDING_CURVE_ABI, signer);
}

export async function executeBondingCurveTrade({
  tokenAddress,
  mode,
  amount,
  slippagePercent,
}: {
  tokenAddress: string;
  mode: "buy" | "sell";
  amount: string;
  slippagePercent: number;
}) {
  const { signer, address } = await connectInjectedWallet();
  const contract = await getTradeContract(signer);
  const amountWei = ethers.parseEther(amount);
  const quote = mode === "buy"
    ? await contract.quoteBuy(tokenAddress, amountWei)
    : await contract.quoteSell(tokenAddress, amountWei);
  const minimum = toSlippageMinimum(quote, slippagePercent);
  const tx = mode === "buy"
    ? await contract.buy(tokenAddress, minimum, { value: amountWei })
    : await contract.sell(tokenAddress, amountWei, minimum);
  const receipt = await tx.wait();
  return { hash: receipt.hash as string, address, quotedOutput: quote as bigint };
}

export function toSlippageMinimum(value: bigint, slippagePercent: number) {
  const safeSlippage = Math.min(Math.max(slippagePercent, 0), 50);
  return (value * BigInt(Math.round((100 - safeSlippage) * 100))) / 10000n;
}
