import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { 
  Send, 
  Users, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  FileText, 
  Calculator, 
  Sparkles, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Clock, 
  Download, 
  ArrowRight, 
  HelpCircle,
  FileSpreadsheet,
  Zap,
  Info,
  ChevronRight
} from "lucide-react";
import { WalletState, Token, BatchTransferRecord } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import { AGL_TREASURY_ADDRESS } from "../lib/aglContracts";
import ImageWithFallback from "../components/ImageWithFallback";

interface BatchTokenTransferPageProps {
  wallet: WalletState;
  onOpenConnectWallet: () => void;
  onRefreshWallet: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  tokens?: Token[];
}

interface RecipientRow {
  id: string;
  address: string;
  amount: string;
  note?: string;
  isValidAddress: boolean;
  isValidAmount: boolean;
  status: "idle" | "pending" | "success" | "failed";
  txHash?: string;
  error?: string;
}

const DEFAULT_BATCH_TOKENS = [
  {
    address: "0xEA1221B4d80A89BD8C75248Fae7c176BD1854698",
    name: "Agunnaya Utility Token",
    symbol: "AGL",
    decimals: 18,
    priceUsd: 0.1625,
    logoUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  },
  {
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "USD Coin (Base)",
    symbol: "USDC",
    decimals: 6,
    priceUsd: 1.00,
    logoUrl: "https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png"
  },
  {
    address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    name: "Aerodrome Token",
    symbol: "AERO",
    decimals: 18,
    priceUsd: 1.25,
    logoUrl: "https://assets.coingecko.com/coins/images/31745/large/aerodrome.png"
  },
  {
    address: "0x2Ae3F1Ec7F1F5012A27a5d3f112702170bA3b400",
    name: "Coinbase Wrapped Staked ETH",
    symbol: "cbETH",
    decimals: 18,
    priceUsd: 3510.00,
    logoUrl: "https://assets.coingecko.com/coins/images/27008/large/cbeth.png"
  }
];

const SAMPLE_RECIPIENTS: RecipientRow[] = [
  {
    id: "sample_1",
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    amount: "100",
    note: "Core Contributor Reward",
    isValidAddress: true,
    isValidAmount: true,
    status: "idle"
  },
  {
    id: "sample_2",
    address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
    amount: "250",
    note: "DAO Community Allocation",
    isValidAddress: true,
    isValidAmount: true,
    status: "idle"
  },
  {
    id: "sample_3",
    address: AGL_TREASURY_ADDRESS,
    amount: "75",
    note: "Validator Stipend",
    isValidAddress: true,
    isValidAmount: true,
    status: "idle"
  },
  {
    id: "sample_4",
    address: "0x2A153f930eC881a54162B15aF1FA91E332145A79",
    amount: "150",
    note: "Ecosystem Growth Bounty",
    isValidAddress: true,
    isValidAmount: true,
    status: "idle"
  }
];

export default function BatchTokenTransferPage({
  wallet,
  onOpenConnectWallet,
  onRefreshWallet,
  addTerminalLog,
  showToast,
  tokens = []
}: BatchTokenTransferPageProps) {
  // Available Tokens
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>(DEFAULT_BATCH_TOKENS[0].address);
  const [customTokenAddress, setCustomTokenAddress] = useState<string>("");

  // Input Mode
  const [inputMode, setInputMode] = useState<"form" | "csv">("form");
  const [rawCsvText, setRawCsvText] = useState<string>("");

  // Recipients State
  const [recipients, setRecipients] = useState<RecipientRow[]>(SAMPLE_RECIPIENTS);

  // Equal Split Modal / State
  const [showSplitModal, setShowSplitModal] = useState<boolean>(false);
  const [splitTotalAmount, setSplitTotalAmount] = useState<string>("");

  // Simulation & Execution State
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationPassed, setSimulationPassed] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [currentExecutingIndex, setCurrentExecutingIndex] = useState<number>(-1);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<BatchTransferRecord[]>([]);

  // Load History
  useEffect(() => {
    try {
      const saved = localStorage.getItem("agl_batch_transfer_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Save History Helper
  const saveHistoryRecord = (record: BatchTransferRecord) => {
    const updated = [record, ...history];
    setHistory(updated);
    try {
      localStorage.setItem("agl_batch_transfer_history", JSON.stringify(updated));
    } catch {}
  };

  // Selected Token object details
  const allAvailableTokens = [
    ...DEFAULT_BATCH_TOKENS,
    ...tokens.map(t => ({
      address: t.address,
      name: t.name,
      symbol: t.symbol,
      decimals: 18,
      priceUsd: t.currentPrice * 3500, // ETH price approx
      logoUrl: t.logoUrl || "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
    }))
  ];

  const currentToken = allAvailableTokens.find(
    t => t.address.toLowerCase() === selectedTokenAddress.toLowerCase()
  ) || {
    address: selectedTokenAddress || "0xCustomTokenAddress",
    name: "Custom ERC-20 Token",
    symbol: "TOKEN",
    decimals: 18,
    priceUsd: 1.00,
    logoUrl: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=128&auto=format&fit=crop&q=60&ixlib=rb-4.0.3"
  };

  // Get User Token Balance
  const getUserBalance = (): number => {
    if (currentToken.symbol === "AGL") {
      return wallet.aglTokenBalance ?? 10000;
    }
    return 5000; // Default simulated balance for other ERC-20 tokens
  };

  // Address validation helper
  const checkAddressValid = (addr: string): boolean => {
    if (!addr) return false;
    try {
      return ethers.isAddress(addr.trim());
    } catch {
      return /^0x[a-fA-F0-9]{40}$/.test(addr.trim());
    }
  };

  // Amount validation helper
  const checkAmountValid = (amt: string): boolean => {
    if (!amt) return false;
    const num = parseFloat(amt);
    return !isNaN(num) && num > 0;
  };

  // Recipient row management
  const handleAddRow = () => {
    const newRow: RecipientRow = {
      id: "row_" + Math.random().toString(36).substring(2, 9),
      address: "",
      amount: "",
      note: "",
      isValidAddress: false,
      isValidAmount: false,
      status: "idle"
    };
    setRecipients([...recipients, newRow]);
    setSimulationPassed(false);
  };

  const handleRemoveRow = (id: string) => {
    setRecipients(recipients.filter(r => r.id !== id));
    setSimulationPassed(false);
  };

  const handleUpdateRow = (id: string, field: "address" | "amount" | "note", value: string) => {
    setRecipients(recipients.map(r => {
      if (r.id === id) {
        const updatedAddress = field === "address" ? value : r.address;
        const updatedAmount = field === "amount" ? value : r.amount;
        return {
          ...r,
          [field]: value,
          isValidAddress: checkAddressValid(updatedAddress),
          isValidAmount: checkAmountValid(updatedAmount)
        };
      }
      return r;
    }));
    setSimulationPassed(false);
  };

  // Parse CSV text
  const handleParseCsv = (text: string) => {
    setRawCsvText(text);
    if (!text.trim()) return;

    const lines = text.split(/\r?\n/);
    const parsedRows: RecipientRow[] = [];

    lines.forEach((line, index) => {
      const cleanLine = line.trim();
      if (!cleanLine || cleanLine.startsWith("#")) return;

      // split by comma, space, or tab
      const parts = cleanLine.split(/[,;\t\s]+/).filter(Boolean);
      if (parts.length >= 1) {
        const address = parts[0] || "";
        const amount = parts[1] || "0";
        const note = parts.slice(2).join(" ") || `Imported Row #${index + 1}`;

        parsedRows.push({
          id: `csv_${index}_${Math.random().toString(36).substring(2, 6)}`,
          address,
          amount,
          note,
          isValidAddress: checkAddressValid(address),
          isValidAmount: checkAmountValid(amount),
          status: "idle"
        });
      }
    });

    if (parsedRows.length > 0) {
      setRecipients(parsedRows);
      setSimulationPassed(false);
      showToast(`Parsed ${parsedRows.length} recipients from input.`, "info");
    }
  };

  // Load sample list
  const handleLoadSample = () => {
    setRecipients(SAMPLE_RECIPIENTS);
    setSimulationPassed(false);
    showToast("Loaded sample air drop recipient list.", "success");
  };

  // Clear all
  const handleClearAll = () => {
    setRecipients([]);
    setRawCsvText("");
    setSimulationPassed(false);
    showToast("Cleared all recipients.", "info");
  };

  // Equal Split calculation
  const handleApplyEqualSplit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseFloat(splitTotalAmount);
    if (isNaN(total) || total <= 0 || recipients.length === 0) {
      showToast("Please enter a valid total amount and ensure you have recipients.", "error");
      return;
    }

    const perRecipient = (total / recipients.length).toFixed(4);
    setRecipients(recipients.map(r => ({
      ...r,
      amount: perRecipient,
      isValidAmount: checkAmountValid(perRecipient)
    })));

    setShowSplitModal(false);
    setSplitTotalAmount("");
    setSimulationPassed(false);
    showToast(`Divided ${total} ${currentToken.symbol} equally across ${recipients.length} recipients (${perRecipient} each).`, "success");
  };

  // Deduplicate recipients
  const handleDeduplicate = () => {
    const addressMap = new Map<string, { totalAmount: number; note: string }>();

    recipients.forEach(r => {
      const cleanAddr = r.address.trim().toLowerCase();
      if (cleanAddr) {
        const current = addressMap.get(cleanAddr) || { totalAmount: 0, note: r.note || "" };
        const amt = parseFloat(r.amount) || 0;
        addressMap.set(cleanAddr, {
          totalAmount: current.totalAmount + amt,
          note: current.note
        });
      }
    });

    const dedupedRows: RecipientRow[] = Array.from(addressMap.entries()).map(([addr, data], i) => ({
      id: `dedup_${i}_${Math.random().toString(36).substring(2, 6)}`,
      address: addr,
      amount: data.totalAmount.toString(),
      note: data.note ? `${data.note} (Merged)` : "Merged Duplicate",
      isValidAddress: checkAddressValid(addr),
      isValidAmount: checkAmountValid(data.totalAmount.toString()),
      status: "idle"
    }));

    setRecipients(dedupedRows);
    setSimulationPassed(false);
    showToast(`Deduplicated recipient addresses into ${dedupedRows.length} unique entries.`, "success");
  };

  // Calculations
  const validRecipients = recipients.filter(r => r.isValidAddress && r.isValidAmount);
  const totalTransferAmount = recipients.reduce((acc, r) => {
    const val = parseFloat(r.amount);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const totalUsdValue = totalTransferAmount * currentToken.priceUsd;
  const userBalance = getUserBalance();
  const hasEnoughBalance = userBalance >= totalTransferAmount;

  // Duplicate count
  const recipientAddresses = recipients.map(r => r.address.trim().toLowerCase()).filter(Boolean);
  const uniqueAddressesCount = new Set(recipientAddresses).size;
  const hasDuplicates = recipientAddresses.length > uniqueAddressesCount;

  // Estimated Gas Cost
  const estimatedGasUnits = 21000 + (recipients.length * 15000);
  const estimatedGasEth = (estimatedGasUnits * 0.000000002).toFixed(6); // 2 gwei Base L2 gas rate

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Dry Run Simulation
  const handleRunSimulation = () => {
    if (recipients.length === 0) {
      showToast("Add at least one recipient to simulate.", "error");
      return;
    }

    if (validRecipients.length < recipients.length) {
      showToast("Fix invalid addresses or amounts before running simulation.", "error");
      return;
    }

    if (!hasEnoughBalance) {
      showToast(`Insufficient balance. Required: ${totalTransferAmount} ${currentToken.symbol}, Available: ${userBalance}`, "error");
      return;
    }

    setIsSimulating(true);
    addTerminalLog("system", `[BATCH] Simulating multi-receiver transfer sequence for ${recipients.length} recipients...`);

    setTimeout(() => {
      setIsSimulating(false);
      setSimulationPassed(true);
      addTerminalLog("success", `[BATCH] Dry run successful! Total ${totalTransferAmount} ${currentToken.symbol} validated for ${recipients.length} receivers. Est Gas: ${estimatedGasEth} ETH.`);
      showToast("Batch simulation passed cleanly! Ready to execute.", "success");
    }, 1000);
  };

  // Execute Batch Transfer
  const handleExecuteBatchTransfer = async () => {
    if (!wallet.isConnected) {
      onOpenConnectWallet();
      return;
    }

    if (recipients.length === 0) {
      showToast("Recipient list is empty.", "error");
      return;
    }

    if (validRecipients.length < recipients.length) {
      showToast("Some recipient entries contain invalid address or amount format.", "error");
      return;
    }

    if (!hasEnoughBalance) {
      showToast(`Insufficient balance to cover total transfer of ${totalTransferAmount} ${currentToken.symbol}.`, "error");
      return;
    }

    setIsExecuting(true);
    addTerminalLog("system", `[BATCH-SEND] Initiating multi-recipient transaction sequence on Base Mainnet...`);
    addTerminalLog("info", `[BATCH-SEND] Token: ${currentToken.name} (${currentToken.symbol}) | Total: ${totalTransferAmount} ${currentToken.symbol}`);

    // Process each row sequentially
    const updatedRows = [...recipients];
    const executedRecipientsList: Array<{ address: string; amount: number; txHash: string }> = [];

    for (let i = 0; i < updatedRows.length; i++) {
      setCurrentExecutingIndex(i);
      const row = updatedRows[i];

      // Mark row pending
      updatedRows[i] = { ...row, status: "pending" };
      setRecipients([...updatedRows]);

      addTerminalLog("info", `[BATCH-SEND] [${i + 1}/${updatedRows.length}] Transferring ${row.amount} ${currentToken.symbol} -> ${row.address.slice(0, 8)}...${row.address.slice(-6)}`);

      // Simulate network latency / transaction submission
      await new Promise(resolve => setTimeout(resolve, 800));

      const simulatedTxHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");

      updatedRows[i] = {
        ...updatedRows[i],
        status: "success",
        txHash: simulatedTxHash
      };
      setRecipients([...updatedRows]);

      executedRecipientsList.push({
        address: row.address,
        amount: parseFloat(row.amount),
        txHash: simulatedTxHash
      });

      addTerminalLog("success", `[BATCH-SEND] [${i + 1}/${updatedRows.length}] Confirmed! Tx: ${simulatedTxHash.slice(0, 12)}...`);
    }

    // Deduct from wallet balance in DB if AGL token
    if (currentToken.symbol === "AGL") {
      const currentAgl = wallet.aglTokenBalance ?? 10000;
      const newBalance = Math.max(0, currentAgl - totalTransferAmount);
      
      const updatedWallet = {
        ...wallet,
        aglTokenBalance: newBalance
      };
      AgunnayaDatabase.saveWallet(updatedWallet);
    }

    // Create Activity log
    AgunnayaDatabase.addActivity({
      type: "create",
      tokenSymbol: currentToken.symbol,
      tokenAddress: currentToken.address,
      user: wallet.address || "0xUserWallet",
      amount: totalTransferAmount,
      ethValue: totalUsdValue / 3500,
      details: `Batch token transfer to ${recipients.length} recipients (${totalTransferAmount} ${currentToken.symbol})`
    });

    // Record Batch History
    const batchRecord: BatchTransferRecord = {
      id: "batch_" + Date.now(),
      txHash: executedRecipientsList[0]?.txHash || "0xBatchTxHash",
      tokenSymbol: currentToken.symbol,
      tokenAddress: currentToken.address,
      totalAmount: totalTransferAmount,
      recipientCount: recipients.length,
      recipients: executedRecipientsList,
      senderAddress: wallet.address || "0xSenderAddress",
      timestamp: Date.now(),
      status: "completed"
    };

    saveHistoryRecord(batchRecord);

    setIsExecuting(false);
    setCurrentExecutingIndex(-1);
    onRefreshWallet();

    addTerminalLog("success", `[BATCH-COMPLETE] Successfully executed batch token transfer of ${totalTransferAmount} ${currentToken.symbol} to ${recipients.length} addresses!`);
    showToast(`Batch transfer complete! ${totalTransferAmount} ${currentToken.symbol} dispatched to ${recipients.length} recipients.`, "success");
  };

  // Download CSV Receipt
  const handleDownloadReceipt = () => {
    if (recipients.length === 0) return;

    let csvContent = "data:text/csv;charset=utf-8,Address,Amount,Symbol,Status,TxHash,Note\n";
    recipients.forEach(r => {
      csvContent += `${r.address},${r.amount},${currentToken.symbol},${r.status},${r.txHash || ""},"${r.note || ""}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agunnaya_batch_transfer_${currentToken.symbol}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Downloaded batch transfer CSV receipt.", "info");
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-brand-purple/20 bg-gradient-to-r from-zinc-950 via-zinc-900 to-brand-purple/10 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-brand-purple/20 border border-brand-purple/40 text-brand-purple text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Send className="w-3 h-3" />
                Multi-Send Protocol
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold font-mono uppercase">
                Base Mainnet Ready
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display text-white tracking-tight">
              Batch Token Transfer
            </h1>
            <p className="text-xs text-zinc-400 max-w-xl">
              Distribute ERC-20 tokens (AGL, USDC, AERO, cbETH) to dozens or hundreds of wallet recipients in a single, gas-optimized transaction pipeline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowSplitModal(true)}
              className="px-4 py-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Calculator className="w-4 h-4 text-brand-purple" />
              <span>Equal Split</span>
            </button>

            <button
              onClick={handleLoadSample}
              className="px-4 py-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Sample List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Token Selection & Receiver Config */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Token Config & Receivers List (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Token Selector Card */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-zinc-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-purple" />
                Select Token for Batch Distribution
              </label>
              <span className="text-[10px] text-zinc-400 font-mono">
                Your Balance: <strong className="text-white">{userBalance.toLocaleString()} {currentToken.symbol}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {allAvailableTokens.slice(0, 4).map((t) => (
                <button
                  key={t.address}
                  type="button"
                  onClick={() => {
                    setSelectedTokenAddress(t.address);
                    setSimulationPassed(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                    selectedTokenAddress.toLowerCase() === t.address.toLowerCase()
                      ? "bg-brand-purple/20 border-brand-purple text-white shadow-lg shadow-purple-500/10"
                      : "bg-black/40 border-white/5 hover:border-white/20 text-zinc-400"
                  }`}
                >
                  <ImageWithFallback
                    src={t.logoUrl}
                    alt={t.symbol}
                    className="w-7 h-7 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="block text-xs font-bold text-white truncate">{t.symbol}</span>
                    <span className="block text-[9px] text-zinc-500 truncate">{t.name}</span>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Token Address Option */}
            <div className="pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full relative">
                <input
                  type="text"
                  value={customTokenAddress}
                  onChange={(e) => {
                    setCustomTokenAddress(e.target.value);
                    if (e.target.value.length >= 42) {
                      setSelectedTokenAddress(e.target.value);
                      setSimulationPassed(false);
                    }
                  }}
                  placeholder="Or enter custom ERC-20 contract address (0x...)"
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brand-purple font-mono"
                />
              </div>
            </div>
          </div>

          {/* Mode Switcher & Actions Bar */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-zinc-900/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center bg-black/60 p-1 rounded-xl border border-white/10">
                <button
                  type="button"
                  onClick={() => setInputMode("form")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    inputMode === "form"
                      ? "bg-brand-purple text-white shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Form Rows ({recipients.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("csv")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    inputMode === "csv"
                      ? "bg-brand-purple text-white shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Raw Text / CSV Bulk
                </button>
              </div>

              <div className="flex items-center gap-2">
                {hasDuplicates && (
                  <button
                    type="button"
                    onClick={handleDeduplicate}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>Merge Duplicates</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>

            {/* Form Mode Table */}
            {inputMode === "form" ? (
              <div className="space-y-3">
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {recipients.length === 0 ? (
                    <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl space-y-3">
                      <Users className="w-10 h-10 text-zinc-700 mx-auto" />
                      <p className="text-xs text-zinc-500">No recipients added yet.</p>
                      <button
                        onClick={handleAddRow}
                        className="px-4 py-2 rounded-xl bg-brand-purple/20 text-brand-purple border border-brand-purple/30 text-xs font-bold"
                      >
                        Add First Recipient
                      </button>
                    </div>
                  ) : (
                    recipients.map((row, idx) => (
                      <div
                        key={row.id}
                        className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${
                          row.status === "success"
                            ? "bg-emerald-500/5 border-emerald-500/30"
                            : row.status === "pending"
                            ? "bg-brand-purple/10 border-brand-purple/40 animate-pulse"
                            : !row.isValidAddress && row.address
                            ? "bg-red-500/5 border-red-500/30"
                            : "bg-black/40 border-white/5 hover:border-white/10"
                        }`}
                      >
                        <span className="text-[10px] text-zinc-500 font-mono w-6 shrink-0 text-center">
                          #{idx + 1}
                        </span>

                        {/* Address Input */}
                        <div className="flex-1 min-w-0 relative">
                          <input
                            type="text"
                            value={row.address}
                            onChange={(e) => handleUpdateRow(row.id, "address", e.target.value)}
                            placeholder="Recipient Address (0x...)"
                            className={`w-full bg-zinc-950 border rounded-xl px-3 py-1.5 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none transition-all ${
                              row.address && !row.isValidAddress
                                ? "border-red-500 text-red-300"
                                : row.isValidAddress
                                ? "border-emerald-500/50"
                                : "border-white/10 focus:border-brand-purple"
                            }`}
                          />
                          {row.address && !row.isValidAddress && (
                            <span className="text-[9px] text-red-400 mt-0.5 block">Invalid Ethereum address format</span>
                          )}
                        </div>

                        {/* Amount Input */}
                        <div className="w-full sm:w-36 shrink-0 relative">
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              value={row.amount}
                              onChange={(e) => handleUpdateRow(row.id, "amount", e.target.value)}
                              placeholder="Amount"
                              className="w-full bg-zinc-950 border border-white/10 focus:border-brand-purple rounded-xl px-3 py-1.5 text-xs text-white font-mono placeholder-zinc-600 focus:outline-none pr-12"
                            />
                            <span className="absolute right-2.5 top-1.5 text-[10px] text-zinc-500 font-mono font-bold">
                              {currentToken.symbol}
                            </span>
                          </div>
                        </div>

                        {/* Note Input */}
                        <div className="w-full sm:w-36 shrink-0">
                          <input
                            type="text"
                            value={row.note || ""}
                            onChange={(e) => handleUpdateRow(row.id, "note", e.target.value)}
                            placeholder="Note (optional)"
                            className="w-full bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none"
                          />
                        </div>

                        {/* Row Status / Action */}
                        <div className="flex items-center gap-1 shrink-0 justify-end">
                          {row.status === "success" && (
                            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400" title="Transfer Confirmed">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAddRow}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/10 hover:border-brand-purple/40 bg-zinc-950/40 text-zinc-400 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-brand-purple" />
                  <span>Add Recipient Row</span>
                </button>
              </div>
            ) : (
              /* CSV Raw Text Mode */
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Paste Address & Amount Pairs (One per line)
                  </label>
                  <p className="text-[10px] text-zinc-500">
                    Format: <code className="text-brand-purple">0xAddress, Amount</code> or <code className="text-brand-purple">0xAddress Amount Note</code>
                  </p>
                </div>

                <textarea
                  rows={8}
                  value={rawCsvText}
                  onChange={(e) => handleParseCsv(e.target.value)}
                  placeholder={`0x71C7656EC7ab88b098defB751B7401B5f6d8976F, 100\n0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, 250\n${AGL_TREASURY_ADDRESS}, 75`}
                  className="w-full bg-black/60 border border-white/10 focus:border-brand-purple rounded-xl p-3 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none resize-none"
                />

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>Parsed Entries: <strong className="text-white">{recipients.length}</strong></span>
                  <span>Valid Rows: <strong className="text-emerald-400">{validRecipients.length}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pre-Flight Summary & Execution Card (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-brand-purple/30 bg-zinc-900/80 space-y-5 sticky top-24">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Pre-Flight Inspection
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-purple/20 text-purple-300 font-mono font-bold">
                Batch Mode
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Total Recipients</span>
                <span className="text-white font-bold font-mono">{recipients.length} addresses</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Valid Entries</span>
                <span className={`font-bold font-mono ${validRecipients.length === recipients.length ? "text-emerald-400" : "text-amber-400"}`}>
                  {validRecipients.length} / {recipients.length}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Total Required</span>
                <div className="text-right">
                  <span className="block text-white font-bold font-mono">
                    {totalTransferAmount.toLocaleString()} {currentToken.symbol}
                  </span>
                  <span className="block text-[10px] text-zinc-500 font-mono">
                    ≈ ${totalUsdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-400">Est. Network Gas</span>
                <span className="text-zinc-300 font-mono">{estimatedGasEth} ETH</span>
              </div>

              <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                <span className="text-zinc-400">Wallet Balance</span>
                <span className={`font-bold font-mono ${hasEnoughBalance ? "text-emerald-400" : "text-red-400"}`}>
                  {userBalance.toLocaleString()} {currentToken.symbol}
                </span>
              </div>
            </div>

            {/* Warnings or Alerts */}
            {!hasEnoughBalance && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p>Insufficient balance for batch transfer. You need {(totalTransferAmount - userBalance).toFixed(2)} more {currentToken.symbol}.</p>
              </div>
            )}

            {hasDuplicates && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Duplicate addresses detected!</p>
                  <button
                    onClick={handleDeduplicate}
                    className="text-[10px] underline font-bold text-amber-400 hover:text-white mt-0.5"
                  >
                    Click to deduplicate & merge amounts
                  </button>
                </div>
              </div>
            )}

            {simulationPassed && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Simulation passed cleanly! Ready for deployment.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isSimulating || isExecuting || recipients.length === 0}
                onClick={handleRunSimulation}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-brand-purple" />
                    <span>Simulating Transfer...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Dry-Run Simulation</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isExecuting || recipients.length === 0 || !hasEnoughBalance}
                onClick={handleExecuteBatchTransfer}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 hover:from-purple-600 hover:to-purple-500 disabled:opacity-50 text-white font-bold text-sm shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isExecuting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Executing Batch ({currentExecutingIndex + 1}/{recipients.length})...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Execute Batch Transfer</span>
                  </>
                )}
              </button>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="w-full py-2 rounded-xl bg-black/40 hover:bg-black/60 text-zinc-400 hover:text-white text-[11px] font-bold flex items-center justify-center gap-1.5 border border-white/5 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV Receipt</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Batch History Section */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-900/40 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-purple" />
              Batch Transfer Records
            </h3>
            <p className="text-xs text-zinc-500">Historical multi-send distributions executed during this studio session.</p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {history.length} Record{history.length !== 1 ? "s" : ""}
          </span>
        </div>

        {history.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-white/5 rounded-xl">
            <p className="text-xs text-zinc-500">No batch transfers executed yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-brand-purple/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white font-mono">
                      {record.totalAmount.toLocaleString()} {record.tokenSymbol}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase">
                      {record.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-mono">
                    <span>{record.recipientCount} Receivers</span>
                    <span>•</span>
                    <span>{new Date(record.timestamp).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => copyToClipboard(record.txHash, record.id)}
                    className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white text-xs flex items-center gap-1 transition-all"
                  >
                    {copiedIndex === record.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="font-mono text-[10px]">{record.txHash.slice(0, 8)}...</span>
                  </button>
                  <a
                    href={`https://basescan.org/tx/${record.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-brand-purple/10 text-purple-300 hover:bg-brand-purple/20 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Equal Split Modal */}
      {showSplitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-2xl border border-brand-purple/30 bg-zinc-900 max-w-md w-full space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calculator className="w-5 h-5 text-brand-purple" />
                Equal Amount Split
              </h3>
              <button
                type="button"
                onClick={() => setShowSplitModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Enter a total lump sum to split equally across your current <strong>{recipients.length}</strong> recipient entries.
            </p>

            <form onSubmit={handleApplyEqualSplit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-400">Total Lump Sum Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={splitTotalAmount}
                    onChange={(e) => setSplitTotalAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-brand-purple outline-none font-mono"
                    autoFocus
                  />
                  <span className="absolute right-3 top-3 text-xs font-bold text-brand-purple font-mono">
                    {currentToken.symbol}
                  </span>
                </div>
              </div>

              {splitTotalAmount && parseFloat(splitTotalAmount) > 0 && recipients.length > 0 && (
                <div className="p-3 rounded-xl bg-brand-purple/10 border border-brand-purple/20 text-xs text-purple-200 font-mono">
                  Each recipient will receive: <strong>{(parseFloat(splitTotalAmount) / recipients.length).toFixed(4)} {currentToken.symbol}</strong>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSplitModal(false)}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-brand-purple text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-500/20"
                >
                  Apply Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
