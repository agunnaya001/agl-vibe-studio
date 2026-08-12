import React, { useState } from "react";
import { 
  ShieldCheck, 
  Key, 
  Layers, 
  Zap, 
  Code, 
  Copy, 
  Check, 
  Search, 
  X, 
  ExternalLink, 
  FileJson, 
  Terminal,
  Cpu,
  Lock,
  Sparkles
} from "lucide-react";
import { COINBASE_SMART_WALLET_ABI } from "../lib/aglContracts";

interface CoinbaseSmartWalletInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export const CoinbaseSmartWalletInspectorModal: React.FC<CoinbaseSmartWalletInspectorModalProps> = ({
  isOpen,
  onClose,
  showToast
}) => {
  const [copiedAbi, setCopiedAbi] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "function" | "passkey" | "batch" | "event" | "error">("all");
  const [selectedMethod, setSelectedMethod] = useState<any | null>(null);

  // Interactive Calldata Generator state
  const [activeTool, setActiveTool] = useState<"batch" | "passkey" | "userop">("batch");
  const [batchCalls, setBatchCalls] = useState([
    { target: "0xEA1221b4d80a89bd8c75248fae7c176bd1854698", value: "0", data: "0xa9059cbb000000000000000000000000725615639B760DAa64b3e794AA49B5A9a8A7632E0000000000000000000000000000000000000000000000056bc75e2d63100000" }
  ]);
  const [passkeyX, setPasskeyX] = useState("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
  const [passkeyY, setPasskeyY] = useState("0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321");

  if (!isOpen) return null;

  const handleCopyAbi = () => {
    navigator.clipboard.writeText(JSON.stringify(COINBASE_SMART_WALLET_ABI, null, 2));
    setCopiedAbi(true);
    if (showToast) showToast("CoinbaseSmartWallet ABI copied to clipboard!", "success");
    setTimeout(() => setCopiedAbi(false), 2000);
  };

  const filteredAbi = COINBASE_SMART_WALLET_ABI.filter((item: any) => {
    const nameMatch = item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const inputMatch = item.inputs?.some((inp: any) => inp.name?.toLowerCase().includes(searchTerm.toLowerCase()) || inp.type?.toLowerCase().includes(searchTerm.toLowerCase()));
    const isMatched = !searchTerm || nameMatch || inputMatch;

    if (!isMatched) return false;

    if (filterType === "function") return item.type === "function";
    if (filterType === "event") return item.type === "event";
    if (filterType === "error") return item.type === "error";
    if (filterType === "passkey") return item.name?.toLowerCase().includes("owner") || item.name?.toLowerCase().includes("publickey");
    if (filterType === "batch") return item.name?.toLowerCase().includes("batch") || item.name?.toLowerCase().includes("execute");
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-brand-purple/50 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 pr-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-purple/20 text-brand-purple border border-brand-purple/40 shadow-lg shadow-purple-500/10">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold font-display text-white">Coinbase Smart Wallet ABI</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold">
                  ERC-4337 Active
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Official Account Abstraction Smart Account ABI on Base L2
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyAbi}
            className="px-4 py-2.5 rounded-xl bg-brand-purple/20 hover:bg-brand-purple/30 text-brand-purple border border-brand-purple/40 font-mono font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-purple-500/10"
          >
            {copiedAbi ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copiedAbi ? "ABI Copied!" : "Copy Complete ABI"}</span>
          </button>
        </div>

        {/* Feature Badges Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
              <Key className="w-3 h-3 text-brand-purple" /> WebAuthn Passkeys
            </span>
            <span className="text-xs font-bold text-white font-mono block">
              addOwnerPublicKey(x, y)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-cyan-400" /> Batch Calls
            </span>
            <span className="text-xs font-bold text-white font-mono block">
              executeBatch(calls[])
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Account Abstraction
            </span>
            <span className="text-xs font-bold text-white font-mono block">
              validateUserOp(...)
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-white/10 space-y-1">
            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Off-Chain Auth
            </span>
            <span className="text-xs font-bold text-white font-mono block">
              isValidSignature(...)
            </span>
          </div>
        </div>

        {/* Interactive Calldata Tool Section */}
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-white/10 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2 font-bold text-xs font-display text-white">
              <Sparkles className="w-4 h-4 text-brand-purple" />
              <span>Smart Account Calldata & Passkey Encoder</span>
            </div>

            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-white/5 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => setActiveTool("batch")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTool === "batch" ? "bg-brand-purple text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Batch Calls
              </button>
              <button
                type="button"
                onClick={() => setActiveTool("passkey")}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  activeTool === "passkey" ? "bg-brand-purple text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Passkey (P256)
              </button>
            </div>
          </div>

          {activeTool === "batch" && (
            <div className="space-y-3 font-mono text-xs">
              <p className="text-[11px] text-zinc-400">
                Generate atomic <code className="text-purple-300">executeBatch((target, value, data)[])</code> calldata for multi-step dApp interactions.
              </p>
              {batchCalls.map((call, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-zinc-950 border border-white/5 space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold">
                    <span>Target Call #{idx + 1}</span>
                    <span>Tuple Struct</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={call.target}
                      onChange={(e) => {
                        const updated = [...batchCalls];
                        updated[idx].target = e.target.value;
                        setBatchCalls(updated);
                      }}
                      placeholder="Target Address 0x..."
                      className="px-2.5 py-1.5 rounded-lg bg-black border border-white/10 text-white text-[11px] font-mono focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="text"
                      value={call.value}
                      onChange={(e) => {
                        const updated = [...batchCalls];
                        updated[idx].value = e.target.value;
                        setBatchCalls(updated);
                      }}
                      placeholder="ETH Value (Wei)"
                      className="px-2.5 py-1.5 rounded-lg bg-black border border-white/10 text-white text-[11px] font-mono focus:outline-none focus:border-purple-500"
                    />
                    <input
                      type="text"
                      value={call.data}
                      onChange={(e) => {
                        const updated = [...batchCalls];
                        updated[idx].data = e.target.value;
                        setBatchCalls(updated);
                      }}
                      placeholder="Call Data Hex 0x..."
                      className="px-2.5 py-1.5 rounded-lg bg-black border border-white/10 text-white text-[11px] font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              ))}

              <div className="p-3 rounded-xl bg-zinc-950 border border-purple-500/30 text-[10px] text-purple-300 font-mono space-y-1">
                <span className="font-bold text-white block">Function Selector: <code className="text-amber-400">0x34fcd5be</code> (executeBatch)</span>
                <span className="text-zinc-400 block truncate">Calldata Header: 0x34fcd5be0000000000000000000000000000000000000000000000000000000000000020...</span>
              </div>
            </div>
          )}

          {activeTool === "passkey" && (
            <div className="space-y-3 font-mono text-xs">
              <p className="text-[11px] text-zinc-400">
                Register WebAuthn hardware passkeys via <code className="text-purple-300">addOwnerPublicKey(bytes32 x, bytes32 y)</code> on Base.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Passkey X-Coordinate (bytes32)</label>
                  <input
                    type="text"
                    value={passkeyX}
                    onChange={(e) => setPasskeyX(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Passkey Y-Coordinate (bytes32)</label>
                  <input
                    type="text"
                    value={passkeyY}
                    onChange={(e) => setPasskeyY(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[10px] text-emerald-300 font-mono">
                <span className="font-bold text-white block mb-0.5">WebAuthn SECP256R1 Verification Ready</span>
                Allows FaceID, TouchID, or YubiKey biometrics to directly sign and send transactions without private keys.
              </div>
            </div>
          )}
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ABI methods, errors, events..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 font-mono text-xs focus:outline-none focus:border-purple-500"
            />
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap font-mono text-[10px]">
            {[
              { id: "all", label: "All Items" },
              { id: "function", label: "Functions" },
              { id: "passkey", label: "Passkey Owners" },
              { id: "batch", label: "Batch Exec" },
              { id: "event", label: "Events" },
              { id: "error", label: "Errors" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filterType === tab.id
                    ? "bg-brand-purple text-white font-bold shadow-md shadow-purple-500/20"
                    : "bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ABI Items List Grid */}
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-white/10 max-h-80 overflow-y-auto space-y-2.5">
          {filteredAbi.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-zinc-500">
              No matching ABI members found for search filter.
            </div>
          ) : (
            filteredAbi.map((item: any, idx: number) => {
              const isFunction = item.type === "function";
              const isEvent = item.type === "event";
              const isError = item.type === "error";

              return (
                <div 
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-950 border border-white/5 hover:border-brand-purple/40 transition-all font-mono text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isFunction 
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                          : isEvent 
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" 
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                      }`}>
                        {item.type || "member"}
                      </span>
                      <span className="font-bold text-white text-xs">
                        {item.name || "(constructor / fallback)"}
                      </span>
                    </div>

                    {item.stateMutability && (
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                        {item.stateMutability}
                      </span>
                    )}
                  </div>

                  {/* Inputs */}
                  {item.inputs && item.inputs.length > 0 && (
                    <div className="text-[10px] text-zinc-400 bg-black/40 p-2 rounded-lg border border-white/5 space-y-1">
                      <span className="text-zinc-500 uppercase block font-bold">Parameters:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                        {item.inputs.map((inp: any, i: number) => (
                          <div key={i} className="truncate">
                            <span className="text-purple-400 font-bold">{inp.type}</span>{" "}
                            <span className="text-zinc-300">{inp.name || `param${i}`}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs font-mono text-zinc-400">
          <span>{COINBASE_SMART_WALLET_ABI.length} Total Members in Contract ABI</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold border border-white/10 transition-all cursor-pointer"
          >
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
};
