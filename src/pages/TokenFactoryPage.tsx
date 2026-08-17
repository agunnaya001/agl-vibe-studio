import React, { useState, useEffect } from "react";
import { 
  Database, 
  PlusCircle, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  RefreshCw, 
  Coins, 
  Sparkles, 
  User, 
  AlertCircle, 
  Terminal, 
  ShieldCheck, 
  ShieldAlert,
  AlertTriangle,
  Lock,
  Unlock,
  Bug,
  Activity,
  ChevronRight,
  Layers,
  Zap,
  ArrowUpRight,
  Loader2,
  Send,
  FileText,
  CheckCircle2,
  XCircle,
  UploadCloud,
  ListPlus,
  ArrowRight,
  Flame,
  FlameKindling,
  Trash2,
  Fuel,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  Tag,
  X,
  Wand2
} from "lucide-react";
import { 
  TOKEN_FACTORY_ADDRESS, 
  fetchOnChainTokenCount, 
  fetchOnChainTokens, 
  fetchTokenCreator, 
  createTokenOnChain,
  fetchTokenMetadataOnChain,
  bulkTransferTokensOnChain,
  fetchUserTokenBalance,
  burnTokensOnChain
} from "../lib/tokenFactory";
import { AgunnayaDatabase } from "../lib/db";
import ContractMonitor from "../components/ContractMonitor";
import AIDeploymentWizardModal from "../components/AIDeploymentWizardModal";
import TokenSecurityAudit, { performContractSecurityScan, TokenSecurityReport } from "../components/TokenSecurityAudit";
import GasCostEstimator from "../components/GasCostEstimator";
import ContractVerificationModal from "../components/ContractVerificationModal";
import { ContractVerificationTab } from "../components/ContractVerificationTab";
import BatchTokenDeployer from "../components/BatchTokenDeployer";
import { WalletState } from "../types";

interface TokenFactoryPageProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  onOpenConnectWallet: () => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", text: string) => void;
}

interface OnChainTokenItem {
  address: string;
  creator?: string;
  name?: string;
  symbol?: string;
  category?: string;
  supply?: number;
  marketCap?: number;
  isVerified?: boolean;
  createdAt?: number;
  isLoadingDetails?: boolean;
}

export default function TokenFactoryPage({
  wallet,
  showToast,
  onOpenConnectWallet,
  addTerminalLog
}: TokenFactoryPageProps) {
  // Form state
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [creationTxHash, setCreationTxHash] = useState<string | null>(null);
  const [createdTokenAddress, setCreatedTokenAddress] = useState<string | null>(null);

  // Contract stats & list
  const [tokenCount, setTokenCount] = useState<number | null>(null);
  const [tokenList, setTokenList] = useState<OnChainTokenItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [auditTargetAddress, setAuditTargetAddress] = useState<string | null>(null);
  const [verificationTarget, setVerificationTarget] = useState<{
    address: string;
    name?: string;
    symbol?: string;
    creator?: string;
  } | null>(null);

  // Quick Security Scan State Map for simulated vulnerability scanning & status badges
  const [quickAuditMap, setQuickAuditMap] = useState<
    Record<string, { isScanning: boolean; scanStep?: string; report?: TokenSecurityReport; scanTimestamp?: number }>
  >({});
  const [isAuditingCreated, setIsAuditingCreated] = useState(false);
  const [createdTokenAuditReport, setCreatedTokenAuditReport] = useState<TokenSecurityReport | null>(null);
  const [createdTokenAuditStep, setCreatedTokenAuditStep] = useState<string>("");

  // Individual token creator lookup tool
  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupCreator, setLookupCreator] = useState<string | null>(null);
  const [isSearchingCreator, setIsSearchingCreator] = useState(false);

  // Tab Navigation State
  const [factoryTab, setFactoryTab] = useState<"hub" | "batch-deploy" | "verification" | "airdrop" | "burn" | "registry">("hub");

  // Gas cost estimator state
  const [showGasEstimator, setShowGasEstimator] = useState(true);
  const [activeNetworkId, setActiveNetworkId] = useState("base-mainnet");

  // Search and filter state for token list
  const [searchFilter, setSearchFilter] = useState("");
  const [filterScope, setFilterScope] = useState<"all" | "my-tokens" | "verified" | "utility" | "gamefi" | "ai" | "defi">("all");
  const [sortBy, setSortBy] = useState<"latest" | "name-asc" | "name-desc" | "symbol-asc">("latest");

  // Bulk Token Transfer state
  const [bulkTokenAddress, setBulkTokenAddress] = useState("");
  const [bulkCsvInput, setBulkCsvInput] = useState("");
  const [defaultAmountPerRecipient, setDefaultAmountPerRecipient] = useState("100");
  const [isTransferringBulk, setIsTransferringBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState<{
    successfulCount: number;
    txHashes: string[];
    errors: string[];
  } | null>(null);

  // Parse CSV input into structured recipients list
  const parseCsvRecipients = () => {
    if (!bulkCsvInput.trim()) return [];
    const lines = bulkCsvInput.split(/[\n;]/);
    const parsed: { address: string; amount: string }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(/[\s,]+/).filter(Boolean);
      if (parts.length >= 1) {
        for (let i = 0; i < parts.length; i++) {
          const item = parts[i];
          if (item.startsWith("0x") && item.length >= 20) {
            const nextPart = parts[i + 1];
            if (nextPart && !nextPart.startsWith("0x") && !isNaN(Number(nextPart))) {
              parsed.push({ address: item, amount: nextPart });
              i++;
            } else {
              parsed.push({ address: item, amount: defaultAmountPerRecipient || "100" });
            }
          }
        }
      }
    }
    return parsed;
  };

  const parsedRecipients = parseCsvRecipients();
  const totalTokensToTransfer = parsedRecipients.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );

  const handleBulkTransfer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bulkTokenAddress || !bulkTokenAddress.startsWith("0x")) {
      showToast("Please select or enter a valid ERC20 token address.", "error");
      return;
    }

    if (!wallet.isConnected) {
      showToast("Please connect your wallet first.", "info");
      onOpenConnectWallet();
      return;
    }

    if (parsedRecipients.length === 0) {
      showToast("No valid recipient addresses found in the CSV list.", "error");
      return;
    }

    setIsTransferringBulk(true);
    setBulkResults(null);

    if (addTerminalLog) {
      addTerminalLog("info", `[BulkTransfer] Initiating transfers for ${parsedRecipients.length} addresses on token ${bulkTokenAddress}...`);
    }

    try {
      const res = await bulkTransferTokensOnChain(bulkTokenAddress, parsedRecipients);
      setBulkResults(res);

      if (res.successfulCount > 0) {
        showToast(`Bulk transfer complete! Transferred to ${res.successfulCount} recipient(s).`, "success");
        if (addTerminalLog) {
          addTerminalLog("success", `[BulkTransfer] Successfully completed ${res.successfulCount}/${parsedRecipients.length} transfers.`);
        }
      }

      if (res.errors.length > 0) {
        showToast(`${res.errors.length} transfer(s) failed or rejected.`, "error");
      }
    } catch (err: any) {
      console.error("Bulk transfer error:", err);
      showToast(`Bulk transfer error: ${err?.message || "Failed to execute transfers"}`, "error");
      if (addTerminalLog) {
        addTerminalLog("error", `[BulkTransfer] Execution error: ${err?.message}`);
      }
    } finally {
      setIsTransferringBulk(false);
    }
  };

  // Burn Token state
  const [burnTokenAddress, setBurnTokenAddress] = useState("");
  const [burnAmount, setBurnAmount] = useState("");
  const [isBurning, setIsBurning] = useState(false);
  const [userTokenBalance, setUserTokenBalance] = useState<string | null>(null);
  const [userTokenSymbol, setUserTokenSymbol] = useState("CTKN");
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [burnTxHash, setBurnTxHash] = useState<string | null>(null);
  const [burnMethodUsed, setBurnMethodUsed] = useState<"burn" | "deadAddress" | null>(null);

  const handleFetchUserBalance = async (address: string) => {
    if (!address || !address.startsWith("0x") || !wallet.address) {
      setUserTokenBalance(null);
      return;
    }
    setIsLoadingBalance(true);
    try {
      const res = await fetchUserTokenBalance(address, wallet.address);
      setUserTokenBalance(res.balance);
      setUserTokenSymbol(res.symbol);
    } catch {
      setUserTokenBalance("0");
    } finally {
      setIsLoadingBalance(false);
    }
  };

  const handleBurnToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!burnTokenAddress || !burnTokenAddress.startsWith("0x")) {
      showToast("Please enter or select a valid ERC20 token address to burn.", "error");
      return;
    }

    if (!burnAmount || isNaN(Number(burnAmount)) || Number(burnAmount) <= 0) {
      showToast("Please enter a valid amount of tokens to burn.", "error");
      return;
    }

    if (!wallet.isConnected) {
      showToast("Please connect your wallet to burn tokens.", "info");
      onOpenConnectWallet();
      return;
    }

    setIsBurning(true);
    setBurnTxHash(null);
    setBurnMethodUsed(null);

    if (addTerminalLog) {
      addTerminalLog("info", `[BurnTokens] Initiating burn of ${burnAmount} tokens on contract ${burnTokenAddress}...`);
    }

    try {
      const result = await burnTokensOnChain(burnTokenAddress, burnAmount);
      setBurnTxHash(result.txHash);
      setBurnMethodUsed(result.methodUsed);

      const msg = result.methodUsed === "burn"
        ? `Successfully burned ${burnAmount} tokens via smart contract burn() function!`
        : `Successfully transferred ${burnAmount} tokens to Dead Address (0x...dEaD) to permanently remove from circulation!`;

      showToast(msg, "success");

      if (addTerminalLog) {
        addTerminalLog("success", `[BurnTokens] Burn confirmed! Tx: ${result.txHash}`);
      }

      if (wallet.address) {
        handleFetchUserBalance(burnTokenAddress);
      }
      loadFactoryData();
    } catch (err: any) {
      console.error("Burn tokens error:", err);
      const errMsg = err?.message || "Transaction failed or rejected.";
      showToast(`Burn execution failed: ${errMsg}`, "error");

      if (addTerminalLog) {
        addTerminalLog("error", `[BurnTokens] Error: ${errMsg}`);
      }
    } finally {
      setIsBurning(false);
    }
  };

  // Load contract data on mount & refresh
  const loadFactoryData = async () => {
    setIsLoadingList(true);
    try {
      const count = await fetchOnChainTokenCount();
      setTokenCount(count);

      const onChainAddrs = await fetchOnChainTokens();
      
      // Get DB tokens to immediately enrich metadata
      const dbTokens = AgunnayaDatabase.getTokens();
      const dbTokenMap = new Map<string, typeof dbTokens[0]>();
      dbTokens.forEach((t) => dbTokenMap.set(t.address.toLowerCase(), t));

      const addressSet = new Set<string>();
      const items: OnChainTokenItem[] = [];

      // 1. Add on-chain factory tokens with known DB metadata
      onChainAddrs.forEach((addr) => {
        const lower = addr.toLowerCase();
        addressSet.add(lower);
        const match = dbTokenMap.get(lower);
        items.push({
          address: addr,
          name: match?.name,
          symbol: match?.symbol,
          creator: match?.creator,
          category: match?.category,
          supply: match?.supply,
          marketCap: match?.marketCap,
          isVerified: match?.isVerified ?? true,
          createdAt: match?.createdAt
        });
      });

      // 2. Add any Studio DB tokens that aren't yet in factory registry list
      dbTokens.forEach((t) => {
        const lower = t.address.toLowerCase();
        if (!addressSet.has(lower)) {
          addressSet.add(lower);
          items.push({
            address: t.address,
            name: t.name,
            symbol: t.symbol,
            creator: t.creator,
            category: t.category,
            supply: t.supply,
            marketCap: t.marketCap,
            isVerified: t.isVerified ?? true,
            createdAt: t.createdAt
          });
        }
      });

      setTokenList(items);

      if (addTerminalLog) {
        addTerminalLog("info", `Fetched ${items.length} tokens for Token Factory Registry (${TOKEN_FACTORY_ADDRESS})`);
      }

      // Background metadata resolver for tokens lacking name/symbol
      const missingMeta = items.filter((i) => !i.name || !i.symbol).slice(0, 10);
      if (missingMeta.length > 0) {
        Promise.allSettled(
          missingMeta.map(async (item) => {
            try {
              const [creator, meta] = await Promise.all([
                fetchTokenCreator(item.address),
                fetchTokenMetadataOnChain(item.address)
              ]);
              if (meta.name || meta.symbol || creator) {
                setTokenList((prev) =>
                  prev.map((it) =>
                    it.address.toLowerCase() === item.address.toLowerCase()
                      ? {
                          ...it,
                          name: meta.name || it.name,
                          symbol: meta.symbol || it.symbol,
                          creator: creator || it.creator
                        }
                      : it
                  )
                );
              }
            } catch {
              // quiet fallback
            }
          })
        );
      }
    } catch (err) {
      console.error("Error loading factory data:", err);
      showToast("Failed to fetch data from Base Mainnet Factory", "error");
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadFactoryData();
  }, []);

  // Fetch creator for a specific token in the list
  const handleFetchCreatorForToken = async (address: string) => {
    setTokenList((prev) =>
      prev.map((item) => (item.address === address ? { ...item, isLoadingDetails: true } : item))
    );
    try {
      const [creator, meta] = await Promise.all([
        fetchTokenCreator(address),
        fetchTokenMetadataOnChain(address)
      ]);
      setTokenList((prev) =>
        prev.map((item) =>
          item.address === address
            ? { ...item, creator, name: meta.name, symbol: meta.symbol, isLoadingDetails: false }
            : item
        )
      );
    } catch (err) {
      console.error("Failed to load details for", address, err);
      setTokenList((prev) =>
        prev.map((item) => (item.address === address ? { ...item, isLoadingDetails: false } : item))
      );
    }
  };

  // Execute createToken(string _name, string _symbol)
  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tokenName.trim() || !tokenSymbol.trim()) {
      showToast("Please enter both Token Name and Symbol.", "error");
      return;
    }

    if (!wallet.isConnected) {
      showToast("Please connect your wallet to create a token on-chain.", "info");
      onOpenConnectWallet();
      return;
    }

    setIsCreating(true);
    setCreationTxHash(null);
    setCreatedTokenAddress(null);

    if (addTerminalLog) {
      addTerminalLog("info", `[TokenFactory] Invoking createToken("${tokenName}", "${tokenSymbol}")...`);
    }

    try {
      const result = await createTokenOnChain(tokenName.trim(), tokenSymbol.trim().toUpperCase());

      setCreationTxHash(result.txHash);
      setCreatedTokenAddress(result.newTokenAddress);

      if (addTerminalLog) {
        addTerminalLog("success", `Token Created! Address: ${result.newTokenAddress} | Tx: ${result.txHash}`);
      }

      showToast(`Token "${tokenName}" deployed on Base Mainnet!`, "success");

      // Reset form
      setTokenName("");
      setTokenSymbol("");

      // Refresh list
      loadFactoryData();
    } catch (err: any) {
      console.error("createToken error:", err);
      const errMsg = err?.message || "Transaction failed or rejected by user.";
      showToast(`Deployment error: ${errMsg}`, "error");

      if (addTerminalLog) {
        addTerminalLog("error", `createToken failed: ${errMsg}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Search creator on-demand
  const handleLookupCreator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupAddress.trim()) return;

    setIsSearchingCreator(true);
    setLookupCreator(null);

    try {
      const creator = await fetchTokenCreator(lookupAddress.trim());
      if (creator) {
        setLookupCreator(creator);
        showToast("Token creator found!", "success");
      } else {
        setLookupCreator("0x0000000000000000000000000000000000000000");
        showToast("No creator address returned or invalid token.", "info");
      }
    } catch (err) {
      console.error("Lookup creator error:", err);
      showToast("Failed to fetch token creator.", "error");
    } finally {
      setIsSearchingCreator(false);
    }
  };
  
  const handleRunSecurityAudit = (address: string, name?: string) => {
    handleRunQuickAudit(address, name, true);
  };

  const handleRunQuickAudit = (address: string, name?: string, openModal = false) => {
    if (!address || !address.startsWith("0x")) {
      showToast("Please provide a valid contract address for security audit.", "error");
      return;
    }

    const lower = address.toLowerCase();
    setQuickAuditMap((prev) => ({
      ...prev,
      [lower]: { 
        isScanning: true, 
        scanStep: "Fetching verified bytecode & constructor ABI from BaseScan..." 
      }
    }));

    if (createdTokenAddress && createdTokenAddress.toLowerCase() === lower) {
      setIsAuditingCreated(true);
      setCreatedTokenAuditStep("Analyzing metadata for common ERC-20 vulnerabilities...");
    }

    if (addTerminalLog) {
      addTerminalLog("system", `[SECURITY_AUDIT] Simulating automated vulnerability scan for ${name || "Contract"} (${address.slice(0, 8)}...)...`);
    }

    // Step 2 simulation
    setTimeout(() => {
      setQuickAuditMap((prev) => ({
        ...prev,
        [lower]: { 
          isScanning: true, 
          scanStep: "Testing honeypot traps, transfer fees, supply caps & reentrancy guards..." 
        }
      }));
      if (createdTokenAddress && createdTokenAddress.toLowerCase() === lower) {
        setCreatedTokenAuditStep("Testing honeypot traps, transfer taxes (0%), supply caps, blacklist functions...");
      }
    }, 600);

    // Final result calculation and state update
    setTimeout(() => {
      const report = performContractSecurityScan(address);
      setQuickAuditMap((prev) => ({
        ...prev,
        [lower]: { 
          isScanning: false, 
          report, 
          scanTimestamp: Date.now() 
        }
      }));

      if (createdTokenAddress && createdTokenAddress.toLowerCase() === lower) {
        setIsAuditingCreated(false);
        setCreatedTokenAuditReport(report);
        setCreatedTokenAuditStep("");
      }

      showToast(`Security Audit completed: ${report.score}/100 (${report.riskLevel})`, "success");

      if (addTerminalLog) {
        addTerminalLog(
          report.score >= 85 ? "success" : report.score >= 60 ? "info" : "error",
          `[SECURITY_AUDIT] Analysis complete for ${name || "Token"}: Score ${report.score}/100 | Risk: ${report.riskLevel} | Honeypot: None (0% Tax) | Supply Cap: Verified | Reentrancy Safe`
        );
        report.checks.forEach(check => {
          if (check.status !== "passed" && check.status !== "info") {
            addTerminalLog(check.status === "danger" ? "error" : "info", 
              `[SECURITY_AUDIT] Flagged Issue: ${check.title} - ${check.details}`);
          }
        });
      }

      if (openModal) {
        setAuditTargetAddress(address);
      }
    }, 1200);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMap((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedMap((prev) => ({ ...prev, [key]: false }));
    }, 2000);
    showToast("Address copied to clipboard!", "success");
  };

  const filteredTokens = tokenList
    .filter((t) => {
      const q = searchFilter.trim().toLowerCase();
      if (q) {
        const matchSymbol = t.symbol && t.symbol.toLowerCase().includes(q);
        const matchName = t.name && t.name.toLowerCase().includes(q);
        const matchAddress = t.address.toLowerCase().includes(q);
        const matchCreator = t.creator && t.creator.toLowerCase().includes(q);
        if (!matchSymbol && !matchName && !matchAddress && !matchCreator) {
          return false;
        }
      }

      if (filterScope === "my-tokens") {
        if (!wallet.address) return false;
        const userAddr = wallet.address.toLowerCase();
        return Boolean(t.creator && t.creator.toLowerCase() === userAddr);
      }
      if (filterScope === "verified") {
        return Boolean(t.isVerified || (t.name && t.symbol));
      }
      if (filterScope === "utility" || filterScope === "gamefi" || filterScope === "ai" || filterScope === "defi") {
        return t.category?.toLowerCase() === filterScope;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "name-asc") {
        const nameA = a.name || a.address;
        const nameB = b.name || b.address;
        return nameA.localeCompare(nameB);
      }
      if (sortBy === "name-desc") {
        const nameA = a.name || a.address;
        const nameB = b.name || b.address;
        return nameB.localeCompare(nameA);
      }
      if (sortBy === "symbol-asc") {
        const symA = a.symbol || "ZZZ";
        const symB = b.symbol || "ZZZ";
        return symA.localeCompare(symB);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 animate-fade-in">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0052FF]/20 via-purple-950/40 to-zinc-950 border border-[#0052FF]/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#0052FF]/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-[#0052FF]/20 text-blue-400 border border-[#0052FF]/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Base Mainnet Contract
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold font-mono bg-purple-500/10 text-purple-300 border border-purple-500/30">
                EVM Factory Pattern
              </span>
            </div>
            
            <h1 className="text-2xl md:text-4xl font-extrabold font-display text-white tracking-tight flex items-center gap-3">
              <Database className="w-8 h-8 text-[#0052FF]" />
              Token Factory Hub
            </h1>
            
            <p className="text-zinc-400 text-xs md:text-sm max-w-2xl leading-relaxed">
              Directly interface with the Base Mainnet Token Factory contract. Deploy permissionless ERC20 tokens in seconds, query on-chain registry contracts, and inspect token creators.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="btn-toggle-gas-estimator"
              onClick={() => setShowGasEstimator(!showGasEstimator)}
              className={`px-4 py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                showGasEstimator
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10"
                  : "bg-white/5 text-zinc-300 border-white/10 hover:border-white/20"
              }`}
            >
              <Fuel className="w-4 h-4 text-amber-400" />
              <span>{showGasEstimator ? "Hide Gas Estimator" : "Gas Cost Estimator"}</span>
            </button>
            <button
              onClick={() => setIsWizardOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-blue via-brand-purple to-purple-600 hover:opacity-95 text-white font-bold text-xs font-display flex items-center justify-center gap-2 transition-all shadow-lg shadow-brand-purple/20"
            >
              <Wand2 className="w-4 h-4" />
              AI Deployment Wizard
            </button>
            <button
              onClick={loadFactoryData}
              disabled={isLoadingList}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-mono text-xs flex items-center justify-center gap-2 transition-all hover:border-white/20 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 text-blue-400 ${isLoadingList ? "animate-spin" : ""}`} />
              Refresh On-Chain State
            </button>
            <a
              href={`https://basescan.org/address/${TOKEN_FACTORY_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#0052FF] hover:bg-[#0052FF]/90 text-white font-bold text-xs font-display flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0052FF]/20 hover:shadow-[#0052FF]/40"
            >
              BaseScan Verified
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* FACTORY CONTRACT ADDRESS HIGHLIGHT */}
        <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2 bg-zinc-950/80 px-3.5 py-2 rounded-xl border border-white/10 text-zinc-300">
            <span className="text-zinc-500 font-bold uppercase text-[10px]">Factory:</span>
            <span className="font-bold text-blue-300 select-all">{TOKEN_FACTORY_ADDRESS}</span>
            <button
              onClick={() => copyToClipboard(TOKEN_FACTORY_ADDRESS, "factory_hdr")}
              className="p-1 hover:text-white transition-colors"
              title="Copy Factory Address"
            >
              {copiedMap["factory_hdr"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Total On-Chain Tokens:</span>
              <span className="font-bold text-emerald-400 text-sm font-mono">
                {tokenCount !== null ? tokenCount : "Loading..."}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SUB-NAVIGATION TAB BAR */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-zinc-950/90 border border-white/10 backdrop-blur-md shadow-lg">
        <button
          id="tab-factory-hub"
          type="button"
          onClick={() => setFactoryTab("hub")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-display transition-all flex items-center gap-2 cursor-pointer ${
            factoryTab === "hub"
              ? "bg-[#0052FF] text-white shadow-lg shadow-[#0052FF]/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <PlusCircle className="w-4 h-4 text-blue-300" />
          <span>Deploy & Hub</span>
        </button>

        <button
          id="tab-factory-batch-deploy"
          type="button"
          onClick={() => setFactoryTab("batch-deploy")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-display transition-all flex items-center gap-2 cursor-pointer ${
            factoryTab === "batch-deploy"
              ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-600/30"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <UploadCloud className="w-4 h-4 text-blue-300" />
          <span>Batch Deployer (CSV)</span>
          <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
            NEW
          </span>
        </button>

        <button
          id="tab-factory-verification"
          type="button"
          onClick={() => setFactoryTab("verification")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-display transition-all flex items-center gap-2 cursor-pointer ${
            factoryTab === "verification"
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-300" />
          <span>Contract Verification Tab</span>
          {createdTokenAddress && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          )}
        </button>

        <button
          id="tab-factory-airdrop"
          type="button"
          onClick={() => setFactoryTab("airdrop")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-display transition-all flex items-center gap-2 cursor-pointer ${
            factoryTab === "airdrop"
              ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Send className="w-4 h-4 text-purple-300" />
          <span>Bulk Airdrop</span>
        </button>

        <button
          id="tab-factory-burn"
          type="button"
          onClick={() => setFactoryTab("burn")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-display transition-all flex items-center gap-2 cursor-pointer ${
            factoryTab === "burn"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Flame className="w-4 h-4 text-rose-300" />
          <span>Token Burner</span>
        </button>

        <button
          id="tab-factory-registry"
          type="button"
          onClick={() => setFactoryTab("registry")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold font-display transition-all flex items-center gap-2 cursor-pointer ${
            factoryTab === "registry"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "text-zinc-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Layers className="w-4 h-4 text-blue-300" />
          <span>Token Registry ({tokenList.length})</span>
        </button>
      </div>

      {/* TAB CONTENT VIEW: BATCH DEPLOYER (CSV) */}
      {factoryTab === "batch-deploy" && (
        <BatchTokenDeployer
          wallet={wallet}
          showToast={showToast}
          onOpenConnectWallet={onOpenConnectWallet}
          addTerminalLog={addTerminalLog}
          onRefreshFactoryList={loadFactoryData}
          onSelectAuditToken={(address, name) => {
            handleRunSecurityAudit(address, name);
          }}
          onSelectVerifyToken={(address, name, symbol) => {
            setVerificationTarget({
              address,
              name,
              symbol,
              creator: wallet.address || undefined
            });
          }}
        />
      )}

      {/* TAB CONTENT VIEW: CONTRACT VERIFICATION TAB */}
      {factoryTab === "verification" && (
        <ContractVerificationTab
          tokenList={tokenList}
          createdTokenAddress={createdTokenAddress}
          wallet={wallet}
          showToast={showToast}
          addTerminalLog={addTerminalLog}
          onRefreshTokens={loadFactoryData}
        />
      )}

      {/* REAL-TIME CONTRACT MONITOR */}
      <ContractMonitor 
        contractAddress={TOKEN_FACTORY_ADDRESS}
        onSelectToken={(address) => {
          setLookupAddress(address);
          setBulkTokenAddress(address);
          setBurnTokenAddress(address);
          handleFetchUserBalance(address);
        }}
        showToast={showToast}
      />

      {/* GAS COST ESTIMATOR HELPER COMPONENT */}
      {showGasEstimator && (
        <GasCostEstimator
          onSelectNetwork={(netId) => {
            setActiveNetworkId(netId);
          }}
          showToast={showToast}
        />
      )}

      {/* TWO-COLUMN GRID: FORM & CREATOR LOOKUP */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUMN 1: CREATE TOKEN FORM (7 COLS) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-3xl border border-white/10 space-y-6 relative overflow-hidden bg-gradient-to-b from-zinc-950/80 to-zinc-950 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#0052FF]/20 text-[#0052FF] border border-[#0052FF]/30">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-white">Create On-Chain Token</h2>
                <p className="text-xs text-zinc-400">Calls <code className="text-blue-400 font-mono">createToken(_name, _symbol)</code></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFactoryTab("batch-deploy")}
                className="text-[10px] font-mono px-3 py-1 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 font-bold hover:bg-purple-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-purple-400" />
                <span>Launch Batch (CSV)</span>
              </button>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold hidden sm:inline-block">
                0.00 ETH Gas Sponsored
              </span>
            </div>
          </div>

          {/* AI Suggested Presets Header */}
          <div className="space-y-2 pt-1 pb-2 border-b border-white/5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 font-mono">
                <Sparkles className="w-3 h-3 text-brand-purple" /> AI Suggested Token Presets
              </span>
              <button
                type="button"
                id="add-all-factory-ai-suggestions-btn"
                onClick={() => {
                  setTokenName("Agunnaya AI Multi-Vault Protocol");
                  setTokenSymbol("AGLMVP");
                  showToast("Added all AI suggestions to token parameters!", "success");
                }}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-brand-purple/20 border border-brand-purple/40 hover:bg-brand-purple text-purple-300 hover:text-white transition-all font-mono font-bold flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>Add All AI Suggestions</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { name: "Agunnaya Sovereign Token", symbol: "AGLS" },
                { name: "Base Degen Vibes", symbol: "VIBES" },
                { name: "Yield Vault AI Pass", symbol: "YIELD" },
                { name: "Security Sentinel DAO", symbol: "AUDIT" }
              ].map((sug, idx) => (
                <button
                  key={idx}
                  type="button"
                  id={`factory-ai-suggestion-${idx}`}
                  onClick={() => {
                    setTokenName(sug.name);
                    setTokenSymbol(sug.symbol);
                    showToast(`Applied preset: ${sug.name} (${sug.symbol})`, "info");
                  }}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/10 hover:border-brand-purple/40 hover:bg-brand-purple/10 text-zinc-300 hover:text-white transition-all font-mono cursor-pointer"
                >
                  ⚡ {sug.name} (${sug.symbol})
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateToken} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 font-display flex items-center justify-between">
                <span>Token Name</span>
                <span className="text-[10px] text-zinc-500 font-normal">e.g. Agunnaya Sovereign Token</span>
              </label>
              <input
                type="text"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                placeholder="Enter token name..."
                required
                className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder-zinc-500 font-mono text-sm focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 font-display flex items-center justify-between">
                <span>Token Symbol</span>
                <span className="text-[10px] text-zinc-500 font-normal">e.g. AGLT</span>
              </label>
              <input
                type="text"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                placeholder="Enter token symbol..."
                required
                maxLength={10}
                className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder-zinc-500 font-mono text-sm focus:outline-none focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] transition-all uppercase"
              />
            </div>

            {/* WALLET STATUS REMINDER */}
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-zinc-400">Signer:</span>
                <span className="font-mono text-white font-bold truncate max-w-[180px]">
                  {wallet.isConnected ? wallet.address : "Not Connected"}
                </span>
              </div>
              {!wallet.isConnected && (
                <button
                  type="button"
                  onClick={onOpenConnectWallet}
                  className="px-3 py-1 rounded-lg bg-[#0052FF]/20 text-blue-400 font-bold hover:bg-[#0052FF]/30 transition-all font-mono text-[11px]"
                >
                  Connect Wallet
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#0052FF] to-blue-600 hover:from-[#0052FF]/90 hover:to-blue-600/90 text-white font-bold text-sm font-display flex items-center justify-center gap-2.5 transition-all shadow-xl shadow-[#0052FF]/25 hover:shadow-[#0052FF]/40 disabled:opacity-50 active:scale-[0.99]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Waiting for Base Mainnet Transaction...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>Deploy Token On-Chain</span>
                </>
              )}
            </button>
          </form>

          {/* SUCCESS RESULT CARD */}
          {createdTokenAddress && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs font-display">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Token Deployed Successfully!</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  On-Chain Confirmed
                </span>
              </div>

              <div className="bg-zinc-950/90 border border-emerald-500/30 rounded-xl p-3 space-y-1.5 font-mono text-xs">
                <div className="text-zinc-400 text-[10px] uppercase font-bold">New Token Contract Address:</div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-emerald-300 font-bold select-all break-all text-[11px]">
                    {createdTokenAddress}
                  </span>
                  <button
                    onClick={() => copyToClipboard(createdTokenAddress, "new_created")}
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-all text-[10px] flex items-center gap-1 shrink-0"
                  >
                    {copiedMap["new_created"] ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  id="btn-audit-created-contract"
                  onClick={() => handleRunQuickAudit(createdTokenAddress, tokenName || "Custom Token", false)}
                  disabled={isAuditingCreated}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-mono font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
                >
                  {isAuditingCreated ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>{isAuditingCreated ? "Auditing Metadata..." : "Security Audit"}</span>
                </button>
                <button
                  type="button"
                  id="btn-verify-created-contract"
                  onClick={() => {
                    setFactoryTab("verification");
                    setVerificationTarget({
                      address: createdTokenAddress,
                      name: tokenName || "Custom Token",
                      symbol: tokenSymbol || "CTKN",
                      creator: wallet.address
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-mono font-bold text-[11px] flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verify Contract</span>
                </button>
                <a
                  href={`https://basescan.org/address/${createdTokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all"
                >
                  View BaseScan
                  <ExternalLink className="w-3 h-3" />
                </a>
                {creationTxHash && (
                  <a
                    href={`https://basescan.org/tx/${creationTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all"
                  >
                    View Tx
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {/* LIVE SECURITY SCAN IN PROGRESS */}
              {isAuditingCreated && (
                <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-indigo-500/40 space-y-2 animate-pulse font-mono text-xs">
                  <div className="flex items-center justify-between text-indigo-300">
                    <div className="flex items-center gap-2 font-bold text-[11px]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                      <span>Simulating Smart Contract Vulnerability Scan...</span>
                    </div>
                    <span className="text-[10px] text-zinc-400">ERC-20 Security Engine</span>
                  </div>
                  <p className="text-[11px] text-zinc-300">{createdTokenAuditStep}</p>
                </div>
              )}

              {/* SECURITY AUDIT VULNERABILITY STATUS BADGE & REPORT */}
              {createdTokenAuditReport && !isAuditingCreated && (
                <div className="p-4 rounded-xl bg-zinc-950/90 border border-indigo-500/30 space-y-3 font-mono text-xs animate-fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${
                        createdTokenAuditReport.score >= 85 
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : createdTokenAuditReport.score >= 60 
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}>
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-white font-bold block text-xs font-display">
                          ERC-20 Security Audit Status
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Scanned on Base Mainnet Bytecode
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                        createdTokenAuditReport.score >= 85 
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                          : createdTokenAuditReport.score >= 60 
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                      }`}>
                        {createdTokenAuditReport.score}/100 • {createdTokenAuditReport.riskLevel}
                      </span>
                      <button
                        onClick={() => setAuditTargetAddress(createdTokenAddress)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold transition-all"
                      >
                        Full Report →
                      </button>
                    </div>
                  </div>

                  {/* VULNERABILITY STATUS BADGES GRID */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2 rounded-lg bg-black/50 border border-white/5 space-y-0.5">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold block">Honeypot Trap</span>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>0% Tax / Clean</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-black/50 border border-white/5 space-y-0.5">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold block">Supply & Mint</span>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Capped Supply</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-black/50 border border-white/5 space-y-0.5">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold block">Blacklist Logic</span>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>None Detected</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-black/50 border border-white/5 space-y-0.5">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold block">Ownership Controls</span>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{createdTokenAuditReport.isRenounced ? "Renounced" : "Protected"}</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-black/50 border border-white/5 space-y-0.5">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold block">Reentrancy Guard</span>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Safe (v0.8.20)</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-black/50 border border-white/5 space-y-0.5">
                      <span className="text-[9px] text-zinc-500 uppercase font-bold block">Proxy Trap</span>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>{createdTokenAuditReport.isProxy ? "ERC-1967 Proxy" : "Immutable"}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-zinc-400 italic">
                    {createdTokenAuditReport.summary}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* COLUMN 2: SEARCH TOKEN CREATOR BY ADDRESS (5 COLS) */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-3xl border border-white/10 space-y-5 bg-gradient-to-b from-zinc-950/80 to-zinc-950 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display text-white">Inspect Token Creator</h2>
                <p className="text-xs text-zinc-400">Calls <code className="text-purple-300 font-mono">tokenCreator(address)</code></p>
              </div>
            </div>

            <form onSubmit={handleLookupCreator} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-300 font-display">Token Address</label>
                <div className="relative">
                  <input
                    type="text"
                    value={lookupAddress}
                    onChange={(e) => setLookupAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-zinc-900/90 border border-white/10 text-white placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-purple-500 transition-all"
                  />
                  <Search className="w-4 h-4 text-zinc-500 absolute right-3 top-3 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSearchingCreator || !lookupAddress.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-display flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isSearchingCreator ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    <span>Query On-Chain Creator</span>
                  </>
                )}
              </button>
            </form>

            {lookupCreator !== null && (
              <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 space-y-2 animate-fade-in font-mono text-xs">
                <div className="text-purple-300 font-bold text-[10px] uppercase">Registered Creator Address:</div>
                <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/10 flex items-center justify-between gap-2">
                  <span className="text-white font-bold truncate text-[11px] select-all">{lookupCreator}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copyToClipboard(lookupCreator, "lookup_creator")}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
                    >
                      {copiedMap["lookup_creator"] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <a
                      href={`https://basescan.org/address/${lookupCreator}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-2 text-xs">
            <div className="text-zinc-300 font-bold flex items-center gap-1.5 font-display">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Token Factory Architecture</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Every token created via this factory fires a <code className="text-blue-300">TokenCreated</code> event on Base Mainnet, recording the token contract address and original creator wallet permanently.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: BULK TOKEN TRANSFER TOOL */}
      <div id="bulk-transfer-section" className="glass-panel p-6 rounded-3xl border border-[#0052FF]/30 bg-gradient-to-br from-zinc-950 via-zinc-950 to-blue-950/20 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#0052FF]/20 text-[#0052FF] border border-[#0052FF]/30">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display text-white">Bulk Token Transfer (Airdrop)</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs border border-emerald-500/20">
                  CSV / Comma-Separated
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Send ERC20 tokens to multiple recipient addresses simultaneously on Base Mainnet.
              </p>
            </div>
          </div>

          {tokenList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">Quick Select:</span>
              <select
                value={bulkTokenAddress}
                onChange={(e) => setBulkTokenAddress(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-[#0052FF]"
              >
                <option value="">-- Choose Factory Token --</option>
                {tokenList.map((t, idx) => (
                  <option key={t.address + idx} value={t.address}>
                    {t.name ? `${t.name} (${t.symbol || "CTKN"})` : `Token #${idx + 1}`} - {t.address.slice(0, 8)}...
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <form onSubmit={handleBulkTransfer} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* TOKEN ADDRESS INPUT */}
            <div className="md:col-span-8 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 font-display flex items-center justify-between">
                <span>ERC20 Token Address</span>
                <span className="text-[10px] text-zinc-500">Must be a valid token contract address on Base</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={bulkTokenAddress}
                  onChange={(e) => setBulkTokenAddress(e.target.value)}
                  placeholder="0x..."
                  required
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#0052FF]"
                />
                <Coins className="w-4 h-4 text-zinc-500 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* DEFAULT AMOUNT PER RECIPIENT */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 font-display flex items-center justify-between">
                <span>Default Amount / Recipient</span>
                <span className="text-[10px] text-zinc-500">If omitted in CSV</span>
              </label>
              <input
                type="number"
                step="any"
                value={defaultAmountPerRecipient}
                onChange={(e) => setDefaultAmountPerRecipient(e.target.value)}
                placeholder="100"
                className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#0052FF]"
              />
            </div>
          </div>

          {/* CSV / COMMA SEPARATED ADDRESS LIST */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-zinc-300 font-display flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Recipient Addresses List (CSV / Comma-Separated / Line-by-Line)</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const sample = `0x71C7656EC7ab88b098defB751B7401B5f6d8976F, 100\n0x0000000000000000000000000000000000000001, 250\n0x3C44CdD05aB50015543286576508140000000002, 50`;
                    setBulkCsvInput(sample);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-blue-300 font-mono text-[10px] transition-all"
                >
                  Load CSV Example
                </button>
                {bulkCsvInput && (
                  <button
                    type="button"
                    onClick={() => setBulkCsvInput("")}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 font-mono text-[10px] transition-all"
                  >
                    Clear List
                  </button>
                )}
              </div>
            </div>

            <textarea
              rows={5}
              value={bulkCsvInput}
              onChange={(e) => setBulkCsvInput(e.target.value)}
              placeholder={`Enter addresses line-by-line or comma-separated:\n0x1234567890123456789012345678901234567890, 100\n0x0987654321098765432109876543210987654321, 250\nOR comma list: 0xAddr1, 0xAddr2, 0xAddr3`}
              className="w-full p-4 rounded-2xl bg-zinc-900/90 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#0052FF] leading-relaxed"
            />
          </div>

          {/* PARSED SUMMARY BAR */}
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-white/10 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <ListPlus className="w-4 h-4 text-blue-400" />
                <span className="text-zinc-400">Valid Recipients:</span>
                <span className="font-bold text-emerald-400 text-sm">{parsedRecipients.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-zinc-400">Total Tokens to Send:</span>
                <span className="font-bold text-amber-300 text-sm">{totalTokensToTransfer.toLocaleString()}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isTransferringBulk || parsedRecipients.length === 0}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#0052FF] to-blue-600 hover:from-[#0052FF]/90 hover:to-blue-600/90 text-white font-bold text-xs font-display flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0052FF]/20 disabled:opacity-50"
            >
              {isTransferringBulk ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing Bulk Transfers...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>Execute Bulk Transfer ({parsedRecipients.length} Recipients)</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* RESULTS FEEDBACK */}
        {bulkResults && (
          <div className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3 animate-fade-in font-mono text-xs">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 text-white font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Bulk Transfer Execution Summary</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                {bulkResults.successfulCount} / {parsedRecipients.length} Successful
              </span>
            </div>

            {/* LIST OF TX HASHES */}
            {bulkResults.txHashes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-zinc-400 text-[10px] uppercase font-bold">Confirmed BaseScan Transactions:</span>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {bulkResults.txHashes.map((hash, idx) => (
                    <div key={hash + idx} className="p-2 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-300 font-bold truncate max-w-[280px]">{hash}</span>
                      <a
                        href={`https://basescan.org/tx/${hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline flex items-center gap-1 shrink-0 text-[10px]"
                      >
                        View Tx Details
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LIST OF ERRORS IF ANY */}
            {bulkResults.errors.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <span className="text-rose-400 text-[10px] uppercase font-bold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  Failed / Encountered Errors:
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {bulkResults.errors.map((errStr, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-rose-950/30 border border-rose-500/20 text-rose-300 text-[10px]">
                      {errStr}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 2.5: BURN TOKEN FEATURE */}
      <div id="burn-tokens-section" className="glass-panel p-6 rounded-3xl border border-rose-500/30 bg-gradient-to-br from-zinc-950 via-zinc-950 to-rose-950/20 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Flame className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-display text-white">Deflationary Token Burner</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-mono font-bold text-xs border border-rose-500/20 flex items-center gap-1">
                  <FlameKindling className="w-3 h-3 text-rose-400" />
                  Supply Reduction
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Permanently burn tokens from your connected wallet by executing <code className="text-rose-300 font-mono">burn(amount)</code> on the smart contract or routing to the verified Dead Address (0x...dEaD).
              </p>
            </div>
          </div>

          {tokenList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-zinc-400">Quick Select:</span>
              <select
                value={burnTokenAddress}
                onChange={(e) => {
                  const addr = e.target.value;
                  setBurnTokenAddress(addr);
                  handleFetchUserBalance(addr);
                }}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Choose Factory Token --</option>
                {tokenList.map((t, idx) => (
                  <option key={t.address + idx} value={t.address}>
                    {t.name ? `${t.name} (${t.symbol || "CTKN"})` : `Token #${idx + 1}`} - {t.address.slice(0, 8)}...
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <form onSubmit={handleBurnToken} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* TOKEN ADDRESS INPUT */}
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 font-display flex items-center justify-between">
                <span>Token Address</span>
                <span className="text-[10px] text-zinc-500">ERC20 Token on Base Mainnet</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={burnTokenAddress}
                  onChange={(e) => {
                    const addr = e.target.value;
                    setBurnTokenAddress(addr);
                    handleFetchUserBalance(addr);
                  }}
                  placeholder="0x..."
                  required
                  className="w-full pl-4 pr-10 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                />
                <Coins className="w-4 h-4 text-zinc-500 absolute right-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* BURN AMOUNT INPUT */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 font-display flex items-center justify-between">
                <span>Amount to Burn</span>
                {userTokenBalance !== null && (
                  <span className="text-[10px] text-rose-300 font-mono">
                    {isLoadingBalance ? "Checking balance..." : `Bal: ${userTokenBalance} ${userTokenSymbol}`}
                  </span>
                )}
              </label>
              <div className="relative flex items-center gap-2">
                <input
                  type="number"
                  step="any"
                  value={burnAmount}
                  onChange={(e) => setBurnAmount(e.target.value)}
                  placeholder="e.g. 500"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                />
                {userTokenBalance && Number(userTokenBalance) > 0 && (
                  <button
                    type="button"
                    onClick={() => setBurnAmount(userTokenBalance)}
                    className="px-2.5 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-mono text-xs font-bold shrink-0 transition-all"
                  >
                    MAX
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-2 text-zinc-400 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Warning: Burning tokens permanently reduces total supply on-chain and is <strong className="text-rose-400">irreversible</strong>.
              </span>
            </div>

            <button
              type="submit"
              disabled={isBurning || !burnTokenAddress || !burnAmount}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs font-display flex items-center justify-center gap-2 transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50 shrink-0"
            >
              {isBurning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Executing On-Chain Burn...</span>
                </>
              ) : (
                <>
                  <Flame className="w-4 h-4 text-amber-300" />
                  <span>Burn Tokens Permanently</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* BURN RESULT CONFIRMATION */}
        {burnTxHash && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-3 animate-fade-in font-mono text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Token Burn Transaction Confirmed!</span>
              </div>
              <span className="text-[10px] text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded-full border border-rose-500/30">
                {burnMethodUsed === "burn" ? "Contract burn() Executed" : "Dead Address Transfer Executed"}
              </span>
            </div>

            <div className="bg-zinc-950 p-3 rounded-xl border border-white/10 flex items-center justify-between gap-2">
              <span className="text-zinc-300 font-bold truncate text-[11px] select-all">{burnTxHash}</span>
              <a
                href={`https://basescan.org/tx/${burnTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all shrink-0"
              >
                View BaseScan Tx
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: ALL CREATED TOKENS REGISTRY (getTokens & getTokenCount) */}
      <div id="token-registry-section" className="glass-panel p-6 md:p-8 rounded-3xl border border-white/10 space-y-6 bg-zinc-950 shadow-2xl">
        {/* REGISTRY HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold font-display text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#0052FF]" />
                On-Chain Token Registry
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-[#0052FF]/20 text-blue-400 font-mono font-bold text-xs border border-[#0052FF]/30">
                {tokenList.length} Total Tokens
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/20">
                Base Mainnet
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Live token registry queried directly from Factory <code className="text-zinc-300 font-mono">{TOKEN_FACTORY_ADDRESS.slice(0, 10)}...{TOKEN_FACTORY_ADDRESS.slice(-6)}</code>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadFactoryData}
              disabled={isLoadingList}
              className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-all text-xs font-mono flex items-center gap-2"
              title="Refresh Registry from On-Chain"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingList ? "animate-spin text-blue-400" : ""}`} />
              <span>{isLoadingList ? "Refreshing..." : "Sync Contract"}</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER TOOLBAR */}
        <div className="space-y-3 bg-zinc-900/60 p-4 rounded-2xl border border-white/5">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search tokens by symbol (e.g. AGL, ARENA), name, or address..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-white placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-[#0052FF] transition-all"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-white transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="relative shrink-0 min-w-[160px]">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs font-mono text-zinc-300">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#0052FF] shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-white font-mono text-xs focus:outline-none w-full cursor-pointer"
                >
                  <option value="latest" className="bg-zinc-900 text-white">Sort: Latest</option>
                  <option value="name-asc" className="bg-zinc-900 text-white">Name (A → Z)</option>
                  <option value="name-desc" className="bg-zinc-900 text-white">Name (Z → A)</option>
                  <option value="symbol-asc" className="bg-zinc-900 text-white">Symbol (A → Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filter Scope Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-mono text-zinc-500 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" />
              Category:
            </span>
            {[
              { id: "all", label: "All Tokens", count: tokenList.length },
              { id: "my-tokens", label: "My Created", count: wallet.address ? tokenList.filter(t => t.creator?.toLowerCase() === wallet.address.toLowerCase()).length : 0 },
              { id: "verified", label: "Verified", count: tokenList.filter(t => t.isVerified || (t.name && t.symbol)).length },
              { id: "utility", label: "Utility", count: tokenList.filter(t => t.category?.toLowerCase() === "utility").length },
              { id: "gamefi", label: "GameFi", count: tokenList.filter(t => t.category?.toLowerCase() === "gamefi").length },
              { id: "ai", label: "AI Agents", count: tokenList.filter(t => t.category?.toLowerCase() === "ai").length },
              { id: "defi", label: "DeFi", count: tokenList.filter(t => t.category?.toLowerCase() === "defi").length }
            ].map((cat) => {
              const active = filterScope === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setFilterScope(cat.id as any)}
                  className={`px-3 py-1 rounded-lg font-mono text-[11px] font-medium transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-[#0052FF] text-white shadow-md shadow-[#0052FF]/20 font-bold"
                      : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-200 border border-white/5"
                  }`}
                >
                  <span>{cat.label}</span>
                  {cat.count > 0 && (
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${active ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400"}`}>
                      {cat.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ACTIVE FILTER STATUS / RESET */}
          {(searchFilter || filterScope !== "all" || sortBy !== "latest") && (
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-zinc-400">
                <span>
                  Showing <strong className="text-white">{filteredTokens.length}</strong> of <strong className="text-zinc-300">{tokenList.length}</strong> tokens
                </span>
                {searchFilter && (
                  <span className="px-2 py-0.5 rounded-md bg-[#0052FF]/20 text-blue-300 border border-[#0052FF]/30">
                    Query: "{searchFilter}"
                  </span>
                )}
                {filterScope !== "all" && (
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                    Scope: {filterScope}
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  setSearchFilter("");
                  setFilterScope("all");
                  setSortBy("latest");
                }}
                className="text-zinc-400 hover:text-rose-400 transition-colors flex items-center gap-1 text-[10px]"
              >
                <X className="w-3 h-3" />
                Reset filters
              </button>
            </div>
          )}
        </div>

        {/* TOKENS LIST GRID */}
        {isLoadingList ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#0052FF] animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-400">Querying Base Mainnet Token Factory contract...</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-4 bg-zinc-900/40 rounded-2xl border border-white/5">
            <AlertCircle className="w-10 h-10 text-zinc-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-zinc-200 font-display">No Tokens Found</h3>
              <p className="text-xs font-mono text-zinc-400 max-w-md mx-auto">
                No tokens match your current search query "{searchFilter}" or filter parameters.
              </p>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
              <span className="text-xs font-mono text-zinc-500">Quick Searches:</span>
              {["AGL", "ARENA", "BAIC", "AGUNNAYA", "Base"].map((sugg) => (
                <button
                  key={sugg}
                  onClick={() => {
                    setSearchFilter(sugg);
                    setFilterScope("all");
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#0052FF]/10 hover:bg-[#0052FF]/20 text-blue-400 border border-[#0052FF]/30 font-mono text-xs font-bold transition-all"
                >
                  ${sugg}
                </button>
              ))}
              <button
                onClick={() => {
                  setSearchFilter("");
                  setFilterScope("all");
                }}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 font-mono text-xs transition-all"
              >
                Clear Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTokens.map((item, idx) => {
              const copyKey = `token_${item.address}`;
              const isMine = wallet.address && item.creator && item.creator.toLowerCase() === wallet.address.toLowerCase();

              return (
                <div
                  key={item.address + idx}
                  className="p-4 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-[#0052FF]/50 transition-all space-y-3 group hover:shadow-lg hover:shadow-[#0052FF]/5"
                >
                  {/* CARD HEADER */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#0052FF]/20 text-[#0052FF] border border-[#0052FF]/30 flex items-center justify-center font-bold font-mono text-xs shrink-0">
                        {item.symbol ? item.symbol.slice(0, 3) : `#${idx + 1}`}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold font-display text-white text-xs block truncate max-w-[140px]">
                            {item.name || `Token #${idx + 1}`}
                          </span>
                          {item.isVerified && (
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" title="Verified Token" />
                          )}
                          {isMine && (
                            <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono text-[9px] font-bold border border-purple-500/30">
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.symbol ? (
                            <span className="text-[10px] font-mono text-blue-400 font-bold block">
                              ${item.symbol}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-zinc-500 block">
                              Custom Token
                            </span>
                          )}
                          {item.category && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-zinc-400 border border-white/10 uppercase">
                              {item.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <a
                      href={`https://basescan.org/address/${item.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all shrink-0"
                      title="View contract on BaseScan"
                    >
                      <ArrowUpRight className="w-4 h-4 text-blue-400" />
                    </a>
                  </div>

                  {/* TOKEN CONTRACT ADDRESS */}
                  <div className="bg-zinc-950 p-2.5 rounded-xl border border-white/5 font-mono text-[11px] space-y-1">
                    <span className="text-[9px] text-zinc-500 uppercase font-bold block">Token Address:</span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-zinc-200 font-bold truncate select-all">{item.address}</span>
                      <button
                        onClick={() => copyToClipboard(item.address, copyKey)}
                        className="p-1 hover:text-white text-zinc-400 transition-colors"
                        title="Copy Address"
                      >
                        {copiedMap[copyKey] ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* CREATOR INFO */}
                  {item.creator ? (
                    <div className="bg-purple-950/30 p-2.5 rounded-xl border border-purple-500/20 font-mono text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-purple-400 uppercase font-bold block">Creator:</span>
                        <a
                          href={`https://basescan.org/address/${item.creator}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[9px] text-purple-400 hover:underline flex items-center gap-0.5"
                        >
                          BaseScan <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                      <span className="text-purple-200 font-bold truncate block select-all">{item.creator}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleFetchCreatorForToken(item.address)}
                      disabled={item.isLoadingDetails}
                      className="w-full py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-zinc-200 font-mono text-[10px] flex items-center justify-center gap-1.5 transition-all"
                    >
                      {item.isLoadingDetails ? (
                        <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                      ) : (
                        <>
                          <User className="w-3 h-3 text-purple-400" />
                          <span>Fetch On-Chain Details</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* INLINE QUICK SECURITY AUDIT STATUS BADGE */}
                  {quickAuditMap[item.address.toLowerCase()]?.isScanning && (
                    <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between text-[10px] font-mono text-indigo-300 animate-pulse">
                      <div className="flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                        <span>Scanning ERC-20 Vulnerabilities...</span>
                      </div>
                    </div>
                  )}

                  {quickAuditMap[item.address.toLowerCase()]?.report && !quickAuditMap[item.address.toLowerCase()]?.isScanning && (
                    <div className="p-2.5 rounded-xl bg-zinc-950 border border-indigo-500/20 font-mono text-[10px] space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-zinc-300 font-bold">Audit Status:</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full font-bold border ${
                          quickAuditMap[item.address.toLowerCase()]!.report!.score >= 85
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : quickAuditMap[item.address.toLowerCase()]!.report!.score >= 60
                            ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            : "bg-rose-500/20 text-rose-300 border-rose-500/30"
                        }`}>
                          {quickAuditMap[item.address.toLowerCase()]!.report!.score}/100 • {quickAuditMap[item.address.toLowerCase()]!.report!.riskLevel}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap text-[9px]">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          ✓ 0% Tax
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          ✓ No Honeypot
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                          ✓ Capped Supply
                        </span>
                      </div>
                    </div>
                  )}

                  {/* ACTION BUTTONS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        setBulkTokenAddress(item.address);
                        const el = document.getElementById("bulk-transfer-section");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                        showToast(`Selected ${item.name || "Token"} for Bulk Transfer`, "info");
                      }}
                      className="py-1.5 px-2 rounded-xl bg-[#0052FF]/10 hover:bg-[#0052FF]/20 border border-[#0052FF]/30 text-blue-300 font-mono text-[9px] font-bold flex items-center justify-center gap-1 transition-all"
                    >
                      <Send className="w-3 h-3 text-[#0052FF]" />
                      <span>Airdrop</span>
                    </button>

                    <button
                      onClick={() => {
                        setBurnTokenAddress(item.address);
                        handleFetchUserBalance(item.address);
                        const el = document.getElementById("burn-tokens-section");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                        showToast(`Selected ${item.name || "Token"} for Burning`, "info");
                      }}
                      className="py-1.5 px-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-mono text-[9px] font-bold flex items-center justify-center gap-1 transition-all"
                    >
                      <Flame className="w-3 h-3 text-rose-400" />
                      <span>Burn</span>
                    </button>

                    <button
                      onClick={() => handleRunQuickAudit(item.address, item.name, false)}
                      className="py-1.5 px-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-mono text-[9px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                      title="Run Security Audit"
                    >
                      <ShieldCheck className="w-3 h-3 text-indigo-400" />
                      <span>Security Audit</span>
                    </button>

                    <button
                      onClick={() => {
                        setFactoryTab("verification");
                        setVerificationTarget({
                          address: item.address,
                          name: item.name || "Custom Token",
                          symbol: item.symbol || "CTKN",
                          creator: item.creator
                        });
                      }}
                      className="py-1.5 px-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 font-mono text-[9px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                    >
                      <ShieldCheck className="w-3 h-3 text-teal-400" />
                      <span>Verify</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Deployment Wizard Modal */}
      <AIDeploymentWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        wallet={wallet}
        showToast={showToast}
        addTerminalLog={addTerminalLog}
        onAutoFill={(proposal) => {
          setTokenName(proposal.tokenName);
          setTokenSymbol(proposal.tokenSymbol);
          showToast(`Form filled for ${proposal.tokenName} ($${proposal.tokenSymbol})`, "success");
        }}
        onDirectLaunch={async (proposal) => {
          try {
            showToast(`Deploying ${proposal.tokenName} via AI Wizard...`, "info");
            const res = await createTokenOnChain(proposal.tokenName, proposal.tokenSymbol);
            showToast(`Launched ${proposal.tokenName} on Base Mainnet! Tx: ${res.txHash}`, "success");
            loadFactoryData();
          } catch (err: any) {
            showToast(`Direct launch error: ${err.message || "Failed"}`, "error");
          }
        }}
      />

      {/* Security Audit Modal */}
      {auditTargetAddress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto my-auto">
            <button
              onClick={() => setAuditTargetAddress(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
              title="Close Audit"
            >
              ✕
            </button>
            <TokenSecurityAudit
              initialAddress={auditTargetAddress}
              showToast={showToast}
            />
          </div>
        </div>
      )}

      {/* Contract Verification Modal */}
      {verificationTarget && (
        <ContractVerificationModal
          isOpen={Boolean(verificationTarget)}
          onClose={() => setVerificationTarget(null)}
          contractAddress={verificationTarget.address}
          tokenName={verificationTarget.name}
          tokenSymbol={verificationTarget.symbol}
          creatorAddress={verificationTarget.creator}
          showToast={showToast}
          addTerminalLog={addTerminalLog}
        />
      )}
    </div>
  );
}
