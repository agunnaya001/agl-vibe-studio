import React, { useState, useEffect } from "react";
import { 
  FolderGit2, 
  ExternalLink, 
  Copy, 
  Check, 
  Calendar, 
  Layers, 
  Coins, 
  FileCode, 
  Trash2,
  X,
  Plus
} from "lucide-react";
import { AgentProjectMemory } from "../../types/agentWorkflow";
import { AgentToolService } from "../../lib/agentTools";

interface AgentProjectMemoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject?: (project: AgentProjectMemory) => void;
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
}

export default function AgentProjectMemoryDrawer({
  isOpen,
  onClose,
  onSelectProject,
  showToast,
}: AgentProjectMemoryDrawerProps) {
  const [projects, setProjects] = useState<AgentProjectMemory[]>([]);
  const [selectedProj, setSelectedProj] = useState<AgentProjectMemory | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const saved = AgentToolService.getSavedProjects();
      setProjects(saved);
      if (saved.length > 0 && !selectedProj) {
        setSelectedProj(saved[0]);
      }
    }
  }, [isOpen]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (showToast) showToast("Copied to clipboard!", "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl h-full bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-purple/10 border border-brand-purple/30 flex items-center justify-center text-brand-purple">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Agent Project Memory</h3>
              <p className="text-xs text-zinc-400">Scoped Web3 workspace context and Base deployments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Projects Selector */}
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
              Active Projects ({projects.length})
            </span>
            <div className="grid grid-cols-1 gap-2">
              {projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => setSelectedProj(proj)}
                  className={`p-3.5 rounded-2xl border text-left transition ${
                    selectedProj?.id === proj.id
                      ? "bg-brand-purple/10 border-brand-purple/40 text-white"
                      : "bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">{proj.projectName}</span>
                    <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-800">
                      {proj.network === "base-mainnet" ? "Base Mainnet" : "Base Sepolia"}
                    </span>
                  </div>
                  {proj.description && (
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-1">{proj.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Project Details */}
          {selectedProj && (
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-white">{selectedProj.projectName}</h4>
                <span className="text-xs text-zinc-400 font-mono">
                  Created {new Date(selectedProj.createdAt).toLocaleDateString()}
                </span>
              </div>

              {/* Token Config if present */}
              {selectedProj.tokenConfig && (
                <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                    <Coins className="w-3.5 h-3.5" />
                    Token Configuration
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Name / Symbol</span>
                      <span className="font-semibold text-white font-mono">
                        {selectedProj.tokenConfig.name} (${selectedProj.tokenConfig.symbol})
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Supply</span>
                      <span className="font-semibold text-white font-mono">
                        {selectedProj.tokenConfig.supply}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Deployed Contracts */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                  Contracts ({selectedProj.contracts.length})
                </span>
                {selectedProj.contracts.map((c, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-mono font-bold text-white text-xs">
                        <FileCode className="w-4 h-4 text-brand-purple" />
                        <span>{c.name}</span>
                      </div>
                      {c.address && (
                        <a
                          href={`https://basescan.org/address/${c.address}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
                        >
                          BaseScan <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    {c.address && (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-black/50 border border-zinc-800/80 text-xs font-mono">
                        <span className="truncate max-w-[320px] text-zinc-300">{c.address}</span>
                        <button
                          onClick={() => copyToClipboard(c.address!, `addr_${i}`)}
                          className="p-1 text-zinc-400 hover:text-white"
                        >
                          {copiedKey === `addr_${i}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Deployment History */}
              {selectedProj.deploymentHistory && selectedProj.deploymentHistory.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 block">
                    Deployment History
                  </span>
                  <div className="space-y-2">
                    {selectedProj.deploymentHistory.map((d, i) => (
                      <div key={i} className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-white block">{d.contractName}</span>
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {new Date(d.timestamp).toLocaleString()} • {d.network}
                          </span>
                        </div>
                        <a
                          href={`https://basescan.org/tx/${d.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
