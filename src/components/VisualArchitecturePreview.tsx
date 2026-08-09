import React, { useState } from "react";
import {
  Layers,
  Shield,
  Key,
  Lock,
  Cpu,
  ArrowRight,
  ArrowDown,
  Boxes,
  FileCode,
  Zap,
  CheckCircle2,
  Code2,
  Info,
  GitFork,
  Activity,
  ShieldAlert
} from "lucide-react";

interface VisualArchitecturePreviewProps {
  projectType: string;
  accessControl: string; // "Ownable" | "AccessControl"
  promptText?: string;
  aiResult?: any | null;
}

export default function VisualArchitecturePreview({
  projectType,
  accessControl,
  promptText = "",
  aiResult = null
}: VisualArchitecturePreviewProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Dynamic detection of optional modules based on prompt or aiResult
  const promptLower = promptText.toLowerCase();
  const codeLower = (aiResult?.solidityCode || "").toLowerCase();

  const hasReentrancy = promptLower.includes("reentranc") || promptLower.includes("vault") || promptLower.includes("security") || codeLower.includes("reentrancyguard");
  const hasPausable = promptLower.includes("pause") || promptLower.includes("emergency") || codeLower.includes("pausable");
  const hasStaking = projectType === "Staking Vault" || promptLower.includes("stak") || promptLower.includes("apy") || codeLower.includes("stake");
  const hasAgentFee = projectType === "AI Agent Core" || promptLower.includes("agent") || promptLower.includes("creator fee");
  const hasDAO = projectType === "DAO Governance" || promptLower.includes("dao") || promptLower.includes("quorum");

  // Determine Architecture Node Details
  const accessControlNode = accessControl === "AccessControl" ? {
    id: "access-control",
    name: "AccessControl.sol",
    type: "RBAC (Role-Based)",
    badge: "OpenZeppelin v5",
    color: "border-purple-500/40 bg-purple-950/20 text-purple-300",
    iconColor: "text-purple-400",
    roles: ["DEFAULT_ADMIN_ROLE", "MINTER_ROLE", "PAUSER_ROLE"],
    functions: ["grantRole(role, account)", "revokeRole(role, account)", "hasRole(role, account)"],
    modifiers: ["onlyRole(DEFAULT_ADMIN_ROLE)", "onlyRole(MINTER_ROLE)"],
    description: "Multi-role permissions allowing granular assignment of admin, minter, and operational security duties."
  } : {
    id: "ownable",
    name: "Ownable.sol",
    type: "Single-Owner (Ownable)",
    badge: "OpenZeppelin v5",
    color: "border-blue-500/40 bg-blue-950/20 text-blue-300",
    iconColor: "text-blue-400",
    roles: ["owner (address)"],
    functions: ["transferOwnership(newOwner)", "renounceOwnership()"],
    modifiers: ["onlyOwner"],
    description: "Simple single-address ownership pattern ideal for autonomous contracts or single-operator dApps."
  };

  const coreContractNode = {
    id: "core-contract",
    name: aiResult?.name ? `${aiResult.name.replace(/\s+/g, '')}.sol` : `${projectType.replace(/[^a-zA-Z0-9]/g, '')}Core.sol`,
    type: projectType,
    badge: "Solidity ^0.8.20",
    color: "border-brand-purple/50 bg-brand-purple/10 text-white",
    iconColor: "text-brand-purple",
    stateVars: [
      "string public name",
      "string public symbol",
      "uint8 public decimals = 18",
      "uint256 public totalSupply",
      ...(hasStaking ? ["mapping(address => uint256) public stakedBalance"] : []),
      ...(hasAgentFee ? ["address public creatorWallet", "uint256 public feePerCall"] : [])
    ],
    functions: [
      "constructor()",
      "transfer(to, amount)",
      ...(hasStaking ? ["stake(amount)", "claimRewards()"] : []),
      ...(hasAgentFee ? ["executeAgentTask(payload)"] : []),
      ...(hasDAO ? ["propose(targets, values)", "castVote(proposalId)"] : [])
    ]
  };

  const securityNodes = [
    ...(hasReentrancy ? [{
      id: "reentrancy",
      name: "ReentrancyGuard.sol",
      type: "State Lock",
      desc: "Prevents recursive caller exploits via nonReentrant modifier."
    }] : []),
    ...(hasPausable ? [{
      id: "pausable",
      name: "Pausable.sol",
      type: "Emergency Stop",
      desc: "Allows admins to pause transfers/minting in security incidents."
    }] : [])
  ];

  return (
    <div id="visual-architecture-preview" className="bg-zinc-950 border border-brand-purple/30 rounded-2xl p-5 space-y-4 shadow-xl shadow-brand-purple/5 relative overflow-hidden font-mono">
      {/* Background Subtle Gradient */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-brand-purple/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
              Visual Architecture & Inheritance Preview
            </h3>
            <p className="text-[10px] text-zinc-400">
              Interactive pattern map & contract module dependency graph
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30 font-bold">
            {projectType}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 font-bold">
            {accessControl}
          </span>
        </div>
      </div>

      {/* DIAGRAM FLOW */}
      <div className="space-y-4 pt-1">
        
        {/* TOP LEVEL: INHERITED MODULES & ACCESS CONTROL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* ACCESS CONTROL PATTERN CARD */}
          <div
            onClick={() => setSelectedNode(selectedNode === accessControlNode.id ? null : accessControlNode.id)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${accessControlNode.color} ${
              selectedNode === accessControlNode.id ? "ring-2 ring-brand-purple scale-[1.01]" : "hover:border-white/20"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <Key className={`w-3.5 h-3.5 ${accessControlNode.iconColor}`} /> {accessControlNode.name}
              </span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-zinc-300 font-bold">
                {accessControlNode.badge}
              </span>
            </div>
            <p className="text-[10px] text-zinc-300 font-sans leading-relaxed mb-2">
              {accessControlNode.description}
            </p>
            <div className="space-y-1 text-[9px] border-t border-white/10 pt-2 font-mono">
              <div className="text-zinc-400">
                <span className="text-zinc-500">Modifiers:</span> {accessControlNode.modifiers.join(", ")}
              </div>
              <div className="text-zinc-400">
                <span className="text-zinc-500">Key Roles:</span> {accessControlNode.roles.join(", ")}
              </div>
            </div>
          </div>

          {/* SECURITY & GUARD MODULES */}
          <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/10 text-emerald-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-wider flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-400" /> Security & Guards
              </span>
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                OpenZeppelin
              </span>
            </div>
            
            <div className="space-y-1.5 text-[10px] font-mono">
              <div className="p-1.5 rounded bg-zinc-900/60 border border-white/5 flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> IERC20 Standard
                </span>
                <span className="text-[8px] text-zinc-400">Core ERC-20</span>
              </div>
              
              {securityNodes.length > 0 ? (
                securityNodes.map((sec) => (
                  <div key={sec.id} className="p-1.5 rounded bg-zinc-900/60 border border-emerald-500/20 flex items-center justify-between">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-emerald-400" /> {sec.name}
                    </span>
                    <span className="text-[8px] text-zinc-400">{sec.type}</span>
                  </div>
                ))
              ) : (
                <div className="p-1.5 rounded bg-zinc-900/60 border border-white/5 text-zinc-400 text-[9px] italic">
                  Standard reentrancy & arithmetic overflow protection enabled (Solidity ^0.8.20).
                </div>
              )}
            </div>
          </div>

        </div>

        {/* CONNECTOR ARROWS */}
        <div className="flex items-center justify-center gap-4 py-0.5">
          <div className="flex items-center gap-2 text-zinc-500 text-[9px]">
            <span>Inherits & Integrates</span>
            <ArrowDown className="w-4 h-4 text-brand-purple animate-bounce" />
          </div>
        </div>

        {/* CORE TARGET CONTRACT NODE */}
        <div
          onClick={() => setSelectedNode(selectedNode === coreContractNode.id ? null : coreContractNode.id)}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${coreContractNode.color} ${
            selectedNode === coreContractNode.id ? "ring-2 ring-brand-purple scale-[1.01]" : "hover:border-brand-purple/80"
          }`}
        >
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-purple" />
              <span className="font-bold text-xs text-white tracking-wide">{coreContractNode.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30 font-bold">
                {coreContractNode.badge}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
            <div>
              <span className="text-zinc-400 font-bold block mb-1 uppercase text-[8px]">State Layout:</span>
              <ul className="space-y-0.5 text-zinc-300 font-mono">
                {coreContractNode.stateVars.map((v, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-purple/60"></span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-zinc-400 font-bold block mb-1 uppercase text-[8px]">Core Interfaces & Methods:</span>
              <ul className="space-y-0.5 text-zinc-300 font-mono">
                {coreContractNode.functions.map((f, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <Code2 className="w-3 h-3 text-brand-purple shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* DEPENDENCIES & ON-CHAIN HOOKS */}
        <div className="pt-2 border-t border-white/10">
          <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 block mb-2">
            External Runtime Dependencies & Protocol Infrastructure:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
            <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 flex items-center gap-2">
              <Boxes className="w-3.5 h-3.5 text-brand-blue shrink-0" />
              <div>
                <span className="font-bold text-white block">Token Factory</span>
                <span className="text-[8px] text-zinc-500">Base Testnet / Mainnet</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <span className="font-bold text-white block">AA Gas Paymaster</span>
                <span className="text-[8px] text-zinc-500">Zero Gas Sponsorship</span>
              </div>
            </div>

            <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-brand-purple shrink-0" />
              <div>
                <span className="font-bold text-white block">Linear Bonding Curve</span>
                <span className="text-[8px] text-zinc-500">Solidity Sloped Pricing</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
