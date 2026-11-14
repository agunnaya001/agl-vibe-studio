import React, { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import { useAccount } from "wagmi";
import { WalletState } from "../types";
import { getBaseProvider } from "../lib/tokenFactory";
import { AGL_CREDITS_ADDRESS, AGL_TOKEN_ADDRESS, AGL_CREDITS_ABI, AGL_TOKEN_ABI } from "../lib/aglContracts";
import { AlertCircle, ArrowRight, CheckCircle2, ExternalLink, Flame, RefreshCw, Wallet, Zap } from "lucide-react";

interface AGLCreditsPageProps {
  wallet: WalletState;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  setWalletState: (wallet: WalletState) => void;
}

const BASE_RPC_URL = "https://mainnet.base.org";
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)"
];

export default function AGLCreditsPage({ wallet, onRefreshWallet, addTerminalLog, showToast, setWalletState }: AGLCreditsPageProps) {
  const { connector, address: connectedAddress, chainId, isConnected } = useAccount();
  const [creditsPerAgl, setCreditsPerAgl] = useState<string | null>(null);
  const [creditPriceEth, setCreditPriceEth] = useState<string | null>(null);
  const [creditBalance, setCreditBalance] = useState<string>("0");
  const [aglBalance, setAglBalance] = useState<string>("0");
  const [ethBalance, setEthBalance] = useState<string>("0");
  const [allowance, setAllowance] = useState<bigint>(0n);
  const [burnAmount, setBurnAmount] = useState("");
  const [buyAmount, setBuyAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"none" | "approve" | "burn" | "buy">("none");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOnChainData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = getBaseProvider(BASE_RPC_URL);
      const creditsContract = new ethers.Contract(AGL_CREDITS_ADDRESS, AGL_CREDITS_ABI, provider);
      const [rateRaw, priceRaw] = await Promise.all([
        creditsContract.creditsPerAgl(),
        creditsContract.creditPriceEth()
      ]);
      setCreditsPerAgl(rateRaw.toString());
      setCreditPriceEth(ethers.formatEther(priceRaw));

      if (wallet.address && ethers.isAddress(wallet.address)) {
        const tokenContract = new ethers.Contract(AGL_TOKEN_ADDRESS, ERC20_ABI, provider);
        const [creditRaw, aglRaw, ethRaw, allowanceRaw] = await Promise.all([
          creditsContract.getCreditBalance(wallet.address),
          tokenContract.balanceOf(wallet.address),
          provider.getBalance(wallet.address),
          tokenContract.allowance(wallet.address, AGL_CREDITS_ADDRESS)
        ]);
        const nextCredits = creditRaw.toString();
        const nextAgl = ethers.formatEther(aglRaw);
        const nextEth = ethers.formatEther(ethRaw);
        setCreditBalance(nextCredits);
        setAglBalance(nextAgl);
        setEthBalance(nextEth);
        setAllowance(allowanceRaw);
        const onChainCreditTotal = Number(creditRaw);
        const previousOnChainTotal = wallet.aglCreditsOnChain;
        const nextAvailableCredits = previousOnChainTotal === undefined
          ? Math.max(wallet.aglCredits || 0, onChainCreditTotal)
          : (wallet.aglCredits || 0) + Math.max(0, onChainCreditTotal - previousOnChainTotal);
        setWalletState({
          ...wallet,
          aglCreditsOnChain: onChainCreditTotal,
          aglCredits: nextAvailableCredits,
          aglTokenBalance: Number(nextAgl),
          balanceEth: Number(nextEth)
        });
      } else {
        setCreditBalance("0");
        setAglBalance("0");
        setEthBalance("0");
        setAllowance(0n);
      }
      addTerminalLog("success", "AGL_CREDITS_READ: Contract rates and wallet balances loaded from Base.");
    } catch (readError: any) {
      console.error("AGL Credits contract read failed:", readError);
      setError(readError?.shortMessage || readError?.message || "Unable to read the AGL Credits contract.");
      setCreditsPerAgl(null);
      setCreditPriceEth(null);
      setCreditBalance("0");
      setAllowance(0n);
      addTerminalLog("error", "AGL_CREDITS_READ_ERROR: Base contract read failed.");
    } finally {
      setLoading(false);
    }
  }, [wallet.address, wallet.aglCredits, wallet.aglCreditsOnChain, addTerminalLog, setWalletState]);

  useEffect(() => {
    void loadOnChainData();
  }, [loadOnChainData]);

  const getConnectedSigner = useCallback(async () => {
    if (!wallet.isConnected || !wallet.address || !isConnected || !connectedAddress || connectedAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error("Connect the active AGL Studio wallet before continuing.");
    }
    if (chainId !== 8453) throw new Error("Switch your wallet to Base Mainnet (chain ID 8453).");
    if (!connector) throw new Error("The active wallet connector is unavailable. Reconnect your wallet.");

    const eip1193Provider = await connector.getProvider();
    const browserProvider = new ethers.BrowserProvider(eip1193Provider as any);
    const signer = await browserProvider.getSigner();
    const signerAddress = await signer.getAddress();
    if (signerAddress.toLowerCase() !== wallet.address.toLowerCase()) {
      throw new Error("The active wallet account changed. Reconnect and retry.");
    }
    return signer;
  }, [wallet.isConnected, wallet.address, isConnected, connectedAddress, chainId, connector]);

  const handleBurnAglForCredits = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(burnAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      showToast("Enter a valid AGL amount.", "error");
      return;
    }
    if (amount > Number(aglBalance)) {
      showToast("Insufficient on-chain AGL balance.", "error");
      return;
    }

    setAction("approve");
    setTxHash(null);
    try {
      const signer = await getConnectedSigner();
      const token = new ethers.Contract(AGL_TOKEN_ADDRESS, ERC20_ABI, signer);
      const credits = new ethers.Contract(AGL_CREDITS_ADDRESS, AGL_CREDITS_ABI, signer);
      const amountWei = ethers.parseEther(burnAmount);
      const currentAllowance = await token.allowance(wallet.address, AGL_CREDITS_ADDRESS);

      if (currentAllowance < amountWei) {
        addTerminalLog("info", "AGL_CREDITS: Requesting exact AGL allowance for the credits contract.");
        const approvalTx = await token.approve(AGL_CREDITS_ADDRESS, amountWei);
        setTxHash(approvalTx.hash);
        const approvalReceipt = await approvalTx.wait();
        if (!approvalReceipt || approvalReceipt.status !== 1) throw new Error("AGL approval was not confirmed.");
      }

      setAction("burn");
      addTerminalLog("info", "AGL_CREDITS: Requesting wallet signature to burn AGL for credits.");
      const tx = await credits.burnAglForCredits(amountWei);
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("AGL burn transaction was not confirmed.");
      showToast("AGL burned and credits granted on Base.", "success");
      addTerminalLog("success", `AGL_CREDITS: Burn confirmed. Transaction: ${tx.hash}`);
      setBurnAmount("");
      onRefreshWallet();
      await loadOnChainData();
    } catch (txError: any) {
      const message = txError?.shortMessage || txError?.message || "AGL burn failed.";
      console.error("AGL credit burn failed:", txError);
      showToast(message, "error");
      addTerminalLog("error", `AGL_CREDITS_BURN_ERROR: ${message}`);
    } finally {
      setAction("none");
    }
  };

  const handleBuyCreditsWithEth = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(buyAmount);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      showToast("Enter a whole-number credit amount.", "error");
      return;
    }
    if (creditPriceEth === null || Number(creditPriceEth) <= 0) {
      showToast("The on-chain credit price is unavailable.", "error");
      return;
    }

    setAction("buy");
    setTxHash(null);
    try {
      const signer = await getConnectedSigner();
      const credits = new ethers.Contract(AGL_CREDITS_ADDRESS, AGL_CREDITS_ABI, signer);
      const pricePerCreditWei = await credits.creditPriceEth();
      const totalValue = pricePerCreditWei * BigInt(amount);
      addTerminalLog("info", `AGL_CREDITS: Requesting wallet signature to purchase ${amount} credits with ETH.`);
      const tx = await credits.buyCreditsWithEth(BigInt(amount), { value: totalValue });
      setTxHash(tx.hash);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error("Credit purchase transaction was not confirmed.");
      showToast("Credits purchased on Base.", "success");
      addTerminalLog("success", `AGL_CREDITS: Purchase confirmed. Transaction: ${tx.hash}`);
      onRefreshWallet();
      await loadOnChainData();
    } catch (txError: any) {
      const message = txError?.shortMessage || txError?.message || "Credit purchase failed.";
      console.error("AGL credit purchase failed:", txError);
      showToast(message, "error");
      addTerminalLog("error", `AGL_CREDITS_BUY_ERROR: ${message}`);
    } finally {
      setAction("none");
    }
  };

  const isWalletReady = Boolean(wallet.isConnected && isConnected && connectedAddress && connectedAddress.toLowerCase() === wallet.address?.toLowerCase() && chainId === 8453);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-300"><Zap className="h-7 w-7" /></div>
            <div>
              <h2 className="text-xl font-bold text-white">AGL Compute Credits</h2>
              <p className="text-xs text-zinc-400">Base Mainnet · Contract-backed credit purchases</p>
            </div>
          </div>
          <button type="button" onClick={() => { onRefreshWallet(); void loadOnChainData(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        <p className="text-[11px] leading-relaxed text-zinc-400">AGL burns and ETH purchases grant credits on-chain. AI feature usage is deducted from the Firestore application ledger because the current credits contract does not expose a spend/debit method. The on-chain grant total is tracked separately so a refresh does not restore previously consumed app credits.</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-black/30 p-4"><div className="text-xs text-zinc-400">On-chain credits granted</div><div className="mt-2 text-lg font-mono font-bold text-white">{creditBalance}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4"><div className="text-xs text-zinc-400">Available AI usage credits</div><div className="mt-2 text-lg font-mono font-bold text-white">{Number(wallet.aglCredits || 0).toLocaleString()}</div><p className="mt-1 text-[10px] text-zinc-500">Off-chain Firestore usage ledger</p></div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4"><div className="text-xs text-zinc-400">AGL wallet balance</div><div className="mt-2 text-lg font-mono font-bold text-white">{Number(aglBalance).toLocaleString(undefined, { maximumFractionDigits: 6 })} AGL</div></div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4"><div className="text-xs text-zinc-400">Credits per AGL (raw)</div><div className="mt-2 text-lg font-mono font-bold text-white">{creditsPerAgl ?? "Unavailable"}</div></div>
          <div className="rounded-xl border border-white/10 bg-black/30 p-4"><div className="text-xs text-zinc-400">ETH price per credit</div><div className="mt-2 text-lg font-mono font-bold text-white">{creditPriceEth === null ? "Unavailable" : `${creditPriceEth} ETH`}</div></div>
        </div>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-xs text-red-300"><AlertCircle className="inline h-4 w-4 mr-2" />{error}</div>}
        {!isWalletReady && <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-200">Connect a wallet on Base Mainnet to buy credits or burn AGL.</div>}

        <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={handleBurnAglForCredits} className="rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
            <div className="flex items-center gap-2"><Flame className="h-5 w-5 text-rose-400" /><h3 className="text-sm font-bold text-white">Burn AGL for Credits</h3></div>
            <p className="text-xs text-zinc-400">Approve the exact AGL amount, then burn it through the deployed AGL Credits contract.</p>
            <input value={burnAmount} onChange={(event) => setBurnAmount(event.target.value)} type="number" min="0" step="0.000001" placeholder="AGL amount to burn" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-rose-500/50" />
            <div className="text-[10px] text-zinc-500">Current allowance: {ethers.formatEther(allowance)} AGL</div>
            <button type="submit" disabled={!isWalletReady || loading || action !== "none" || !burnAmount || Number(burnAmount) <= 0} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40">
              {action === "approve" ? "Approve AGL..." : action === "burn" ? "Burning AGL..." : "Approve & Burn AGL"}
            </button>
          </form>

          <form onSubmit={handleBuyCreditsWithEth} className="rounded-2xl border border-white/10 bg-black/20 p-5 space-y-4">
            <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-emerald-400" /><h3 className="text-sm font-bold text-white">Buy Credits with ETH</h3></div>
            <p className="text-xs text-zinc-400">Purchase an integer number of credits using the contract's current ETH price per credit.</p>
            <input value={buyAmount} onChange={(event) => setBuyAmount(event.target.value)} type="number" min="1" step="1" placeholder="Credit amount" className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/50" />
            <div className="text-[10px] text-zinc-500">Estimated ETH cost: {creditPriceEth === null ? "Unavailable" : `${(Number(creditPriceEth) * Number(buyAmount || 0)).toFixed(8)} ETH`}</div>
            <button type="submit" disabled={!isWalletReady || loading || action !== "none" || creditPriceEth === null || !buyAmount || Number(buyAmount) <= 0} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">
              {action === "buy" ? "Purchasing..." : "Buy Credits with ETH"}
            </button>
          </form>
        </div>

        {txHash && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
            <div className="flex items-center gap-2 font-semibold text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Transaction submitted / confirmed</div>
            <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 break-all text-blue-300 hover:text-blue-200">{txHash} <ExternalLink className="h-3 w-3 shrink-0" /></a>
          </div>
        )}

        <div className="border-t border-white/10 pt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-[10px] text-zinc-500">Credits contract: {AGL_CREDITS_ADDRESS}</div>
          <a href={`https://basescan.org/address/${AGL_CREDITS_ADDRESS}#code`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-semibold text-blue-300 hover:text-blue-200">Inspect contract <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      </div>
    </div>
  );
}
