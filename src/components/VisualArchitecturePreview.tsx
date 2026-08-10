import React, { useState, useMemo, useEffect } from "react";
import {
  Layers,
  Shield,
  Key,
  Lock,
  Cpu,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Boxes,
  FileCode,
  Zap,
  CheckCircle2,
  Code2,
  Info,
  GitFork,
  Activity,
  Columns,
  Maximize2,
  Copy,
  Check,
  Search,
  Sliders,
  Sparkles,
  Eye,
  FileText,
  GripVertical,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";

interface VisualArchitecturePreviewProps {
  projectType: string;
  accessControl: string; // "Ownable" | "AccessControl"
  promptText?: string;
  aiResult?: any | null;
  onArchitectureChange?: (updatedArchitecture: {
    accessControl: string;
    features: Record<string, boolean>;
    dependencies: string[];
    code: string;
  }) => void;
}

interface DependencyNode {
  id: string;
  name: string;
  importPath: string;
  type: string;
  enabled: boolean;
  isAccessControl?: boolean;
  isCore?: boolean;
  description: string;
  color: string;
  codeKeywords: string[];
}

export default function VisualArchitecturePreview({
  projectType,
  accessControl: initialAccessControl,
  promptText = "",
  aiResult = null,
  onArchitectureChange
}: VisualArchitecturePreviewProps) {
  const [viewMode, setViewMode] = useState<"split" | "diagram" | "code">("split");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [codeFilter, setCodeFilter] = useState("");
  const [hasCustomized, setHasCustomized] = useState(false);

  // Dynamic initial detection of optional modules based on prompt or aiResult
  const promptLower = promptText.toLowerCase();
  const codeLower = (aiResult?.solidityCode || "").toLowerCase();

  const initialHasReentrancy =
    promptLower.includes("reentranc") ||
    promptLower.includes("vault") ||
    promptLower.includes("security") ||
    codeLower.includes("reentrancyguard");

  const initialHasPausable =
    promptLower.includes("pause") ||
    promptLower.includes("emergency") ||
    codeLower.includes("pausable");

  const initialHasStaking =
    projectType === "Staking Vault" ||
    promptLower.includes("stak") ||
    promptLower.includes("apy") ||
    codeLower.includes("stake");

  const initialHasAgentFee =
    projectType === "AI Agent Core" ||
    promptLower.includes("agent") ||
    promptLower.includes("creator fee");

  const initialHasDAO =
    projectType === "DAO Governance" ||
    promptLower.includes("dao") ||
    promptLower.includes("quorum");

  const initialHasBurnable =
    promptLower.includes("burn") ||
    promptLower.includes("deflation");

  // State for interactive modifications
  const [accessControl, setAccessControl] = useState<"Ownable" | "AccessControl">(
    initialAccessControl === "AccessControl" ? "AccessControl" : "Ownable"
  );

  const [featureToggles, setFeatureToggles] = useState({
    reentrancy: initialHasReentrancy,
    pausable: initialHasPausable,
    staking: initialHasStaking,
    agentFee: initialHasAgentFee,
    dao: initialHasDAO,
    burnable: initialHasBurnable
  });

  // Default dependency list that can be reordered via drag-and-drop
  const getDefaultDependencies = (
    acType: "Ownable" | "AccessControl",
    toggles: typeof featureToggles
  ): DependencyNode[] => {
    return [
      {
        id: "erc20",
        name: "ERC20",
        importPath: "@openzeppelin/contracts/token/ERC20/ERC20.sol",
        type: "Base Standard",
        enabled: true,
        isCore: true,
        description: "Fungible token standard implementation with transfer and balance tracking.",
        color: "border-brand-purple/40 bg-brand-purple/10 text-brand-purple",
        codeKeywords: ["ERC20", "_mint", "_transfer", "balanceOf"]
      },
      {
        id: "access-control",
        name: acType === "AccessControl" ? "AccessControl" : "Ownable",
        importPath:
          acType === "AccessControl"
            ? "@openzeppelin/contracts/access/AccessControl.sol"
            : "@openzeppelin/contracts/access/Ownable.sol",
        type: acType === "AccessControl" ? "Role-Based Permissions" : "Single-Owner Access",
        enabled: true,
        isAccessControl: true,
        description:
          acType === "AccessControl"
            ? "Multi-role administrative security (DEFAULT_ADMIN_ROLE, MINTER_ROLE, PAUSER_ROLE)."
            : "Single address admin ownership with ownership transfer functionality.",
        color:
          acType === "AccessControl"
            ? "border-purple-500/40 bg-purple-950/20 text-purple-300"
            : "border-blue-500/40 bg-blue-950/20 text-blue-300",
        codeKeywords:
          acType === "AccessControl"
            ? ["AccessControl", "MINTER_ROLE", "_grantRole", "onlyRole"]
            : ["Ownable", "onlyOwner", "transferOwnership"]
      },
      {
        id: "reentrancy",
        name: "ReentrancyGuard",
        importPath: "@openzeppelin/contracts/utils/ReentrancyGuard.sol",
        type: "Security Lock",
        enabled: toggles.reentrancy,
        description: "Prevents recursive calling exploits on state-changing transactions.",
        color: "border-emerald-500/40 bg-emerald-950/20 text-emerald-300",
        codeKeywords: ["ReentrancyGuard", "nonReentrant"]
      },
      {
        id: "pausable",
        name: "Pausable",
        importPath: "@openzeppelin/contracts/utils/Pausable.sol",
        type: "Emergency Stop",
        enabled: toggles.pausable,
        description: "Allows authorized roles to pause token transfers in emergencies.",
        color: "border-amber-500/40 bg-amber-950/20 text-amber-300",
        codeKeywords: ["Pausable", "_pause", "whenNotPaused"]
      },
      {
        id: "burnable",
        name: "ERC20Burnable",
        importPath: "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol",
        type: "Deflationary Mechanism",
        enabled: toggles.burnable,
        description: "Allows token holders to destroy tokens and reduce total supply.",
        color: "border-red-500/40 bg-red-950/20 text-red-300",
        codeKeywords: ["ERC20Burnable", "burn", "burnFrom"]
      }
    ];
  };

  const [dependencies, setDependencies] = useState<DependencyNode[]>(() =>
    getDefaultDependencies(
      initialAccessControl === "AccessControl" ? "AccessControl" : "Ownable",
      {
        reentrancy: initialHasReentrancy,
        pausable: initialHasPausable,
        staking: initialHasStaking,
        agentFee: initialHasAgentFee,
        dao: initialHasDAO,
        burnable: initialHasBurnable
      }
    )
  );

  // Drag and Drop State
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Synchronize dependencies when accessControl or featureToggles change
  useEffect(() => {
    setDependencies((prevDeps) => {
      // Retain custom order if existing, but update enabled states and access control node name/path
      const updated = prevDeps.map((dep) => {
        if (dep.isAccessControl) {
          return {
            ...dep,
            name: accessControl === "AccessControl" ? "AccessControl" : "Ownable",
            importPath:
              accessControl === "AccessControl"
                ? "@openzeppelin/contracts/access/AccessControl.sol"
                : "@openzeppelin/contracts/access/Ownable.sol",
            type: accessControl === "AccessControl" ? "Role-Based Permissions" : "Single-Owner Access",
            color:
              accessControl === "AccessControl"
                ? "border-purple-500/40 bg-purple-950/20 text-purple-300"
                : "border-blue-500/40 bg-blue-950/20 text-blue-300",
            codeKeywords:
              accessControl === "AccessControl"
                ? ["AccessControl", "MINTER_ROLE", "_grantRole", "onlyRole"]
                : ["Ownable", "onlyOwner", "transferOwnership"]
          };
        }
        if (dep.id === "reentrancy") return { ...dep, enabled: featureToggles.reentrancy };
        if (dep.id === "pausable") return { ...dep, enabled: featureToggles.pausable };
        if (dep.id === "burnable") return { ...dep, enabled: featureToggles.burnable };
        return dep;
      });
      return updated;
    });
  }, [accessControl, featureToggles]);

  // Reorder Handler (Drag and Drop)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (index: number) => {
    if (draggedIdx === null || draggedIdx === index) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const reordered = [...dependencies];
    const [removed] = reordered.splice(draggedIdx, 1);
    reordered.splice(index, 0, removed);

    setDependencies(reordered);
    setDraggedIdx(null);
    setDragOverIdx(null);
    setHasCustomized(true);
  };

  const moveDependency = (index: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= dependencies.length) return;

    const reordered = [...dependencies];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    setDependencies(reordered);
    setHasCustomized(true);
  };

  const toggleFeature = (key: keyof typeof featureToggles) => {
    setFeatureToggles((prev) => ({ ...prev, [key]: !prev[key] }));
    setHasCustomized(true);
  };

  const resetToDefaults = () => {
    const defaultAC = initialAccessControl === "AccessControl" ? "AccessControl" : "Ownable";
    const defaultToggles = {
      reentrancy: initialHasReentrancy,
      pausable: initialHasPausable,
      staking: initialHasStaking,
      agentFee: initialHasAgentFee,
      dao: initialHasDAO,
      burnable: initialHasBurnable
    };
    setAccessControl(defaultAC);
    setFeatureToggles(defaultToggles);
    setDependencies(getDefaultDependencies(defaultAC, defaultToggles));
    setHasCustomized(false);
  };

  // Base Contract Code Synthesis driven by active toggles & ordered dependencies
  const baseSynthesizedCode = useMemo(() => {
    const enabledDeps = dependencies.filter((d) => d.enabled);
    const inheritanceList = enabledDeps.map((d) => d.name).join(", ");
    const contractName = projectType.replace(/[^a-zA-Z0-9]/g, "") + "Core";

    const importsString = enabledDeps.map((d) => `import "${d.importPath}";`).join("\n");

    const isAccessControlRBAC = accessControl === "AccessControl";

    return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

${importsString}

/**
 * @title ${contractName}
 * @notice Dynamically compiled architecture for ${projectType}
 * @dev Inherits in order: [${inheritanceList}]
 */
contract ${contractName} is ${inheritanceList} {
${
  isAccessControlRBAC
    ? `    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");`
    : ""
}

${featureToggles.staking ? `    mapping(address => uint256) public stakedBalance;\n    uint256 public totalStaked;` : ""}
${featureToggles.agentFee ? `    address public creatorWallet;\n    uint256 public feePerCall = 0.001 ether;\n    uint256 public totalAgentExecutions;` : ""}
${featureToggles.dao ? `    uint256 public proposalCount;\n    mapping(uint256 => bool) borderExecuted;` : ""}

    event ArchitectureDeployed(address indexed deployer, string projectType, string accessPattern);
${featureToggles.staking ? `    event TokensStaked(address indexed user, uint256 amount);` : ""}
${featureToggles.agentFee ? `    event AgentExecution(address indexed caller, uint256 feePaid);` : ""}

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply
    ) 
        ERC20(_name, _symbol)
${accessControl === "Ownable" ? "        Ownable(msg.sender)" : ""}
    {
${
  isAccessControlRBAC
    ? `        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);\n        _grantRole(MINTER_ROLE, msg.sender);`
    : ""
}
        _mint(msg.sender, _initialSupply * 10 ** decimals());
        emit ArchitectureDeployed(msg.sender, "${projectType}", "${accessControl}");
    }

${
  featureToggles.staking
    ? `    function stake(uint256 amount) external ${
        featureToggles.reentrancy ? "nonReentrant " : ""
      }${featureToggles.pausable ? "whenNotPaused " : ""}{
        require(amount > 0, "Cannot stake 0");
        _transfer(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        emit TokensStaked(msg.sender, amount);
    }`
    : ""
}

${
  featureToggles.agentFee
    ? `    function executeAgentTask(bytes calldata payload) external payable ${
        featureToggles.reentrancy ? "nonReentrant " : ""
      }{
        require(msg.value >= feePerCall, "Insufficient agent execution fee");
        totalAgentExecutions++;
        payable(creatorWallet == address(0) ? msg.sender : creatorWallet).transfer(msg.value);
        emit AgentExecution(msg.sender, msg.value);
    }`
    : ""
}

${
  featureToggles.pausable
    ? `    function pause() external ${
        isAccessControlRBAC ? "onlyRole(PAUSER_ROLE)" : "onlyOwner"
      } {
        _pause();
    }

    function unpause() external ${
      isAccessControlRBAC ? "onlyRole(PAUSER_ROLE)" : "onlyOwner"
    } {
        _unpause();
    }`
    : ""
}
}`;
  }, [projectType, accessControl, featureToggles, dependencies]);

  // Use baseSynthesizedCode if user customized or if no aiResult exists
  const activeCode = hasCustomized || !aiResult?.solidityCode ? baseSynthesizedCode : aiResult.solidityCode;

  // Notify parent on changes
  useEffect(() => {
    if (onArchitectureChange) {
      onArchitectureChange({
        accessControl,
        features: featureToggles,
        dependencies: dependencies.filter((d) => d.enabled).map((d) => d.name),
        code: activeCode
      });
    }
  }, [accessControl, featureToggles, dependencies, activeCode, onArchitectureChange]);

  // Split Code Lines for Side-by-Side Analysis
  const codeLines = useMemo(() => {
    return activeCode.split("\n");
  }, [activeCode]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Node details generator
  const coreContractNode = {
    id: "core-contract",
    name: aiResult?.name && !hasCustomized
      ? `${aiResult.name.replace(/\s+/g, "")}.sol`
      : `${projectType.replace(/[^a-zA-Z0-9]/g, "")}Core.sol`,
    type: projectType,
    badge: "Solidity ^0.8.20",
    color: "border-brand-purple/50 bg-brand-purple/10 text-white",
    iconColor: "text-brand-purple",
    codeKeywords: ["contract ", "constructor", "ERC20", "_mint"],
    stateVars: [
      "string public name",
      "string public symbol",
      "uint8 public decimals = 18",
      "uint256 public totalSupply",
      ...(featureToggles.staking ? ["mapping(address => uint256) public stakedBalance"] : []),
      ...(featureToggles.agentFee ? ["address public creatorWallet", "uint256 public feePerCall"] : []),
      ...(featureToggles.dao ? ["uint256 public proposalCount"] : [])
    ],
    functions: [
      "constructor()",
      "transfer(to, amount)",
      ...(featureToggles.staking ? ["stake(amount)", "claimRewards()"] : []),
      ...(featureToggles.agentFee ? ["executeAgentTask(payload)"] : []),
      ...(featureToggles.dao ? ["propose(targets, values)", "castVote(proposalId)"] : []),
      ...(featureToggles.burnable ? ["burn(amount)"] : [])
    ]
  };

  // Selected node keyword matching helper for highlighting code
  const getSelectedKeywords = (): string[] => {
    if (!selectedNode) return [];
    if (selectedNode === coreContractNode.id) return coreContractNode.codeKeywords;
    const foundDep = dependencies.find((d) => d.id === selectedNode);
    if (foundDep) return foundDep.codeKeywords;
    return [];
  };

  const selectedKeywords = getSelectedKeywords();

  return (
    <div
      id="visual-architecture-preview"
      className="bg-zinc-950 border border-brand-purple/30 rounded-2xl p-5 space-y-4 shadow-xl shadow-brand-purple/5 relative overflow-hidden font-mono"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-brand-purple/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header with Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
            <GitFork className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
              Interactive Architecture & Inheritance Studio
            </h3>
            <p className="text-[10px] text-zinc-400">
              Drag to reorder dependencies & toggle features in real-time
            </p>
          </div>
        </div>

        {/* View Mode Switcher & Reset Button */}
        <div className="flex items-center gap-2">
          {hasCustomized && (
            <button
              type="button"
              onClick={resetToDefaults}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 text-[10px] font-bold transition-all flex items-center gap-1"
              title="Reset layout and feature toggles to initial defaults"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>Reset</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-zinc-900/90 border border-white/10 p-1 rounded-xl shrink-0 text-[10px]">
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "split"
                  ? "bg-brand-purple text-white shadow-md shadow-brand-purple/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Split View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("diagram")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "diagram"
                  ? "bg-brand-purple text-white shadow-md shadow-brand-purple/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Diagram</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                viewMode === "code"
                  ? "bg-brand-purple text-white shadow-md shadow-brand-purple/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Base Code</span>
            </button>
          </div>
        </div>
      </div>

      {/* INTERACTIVE CONTROLS TOOLBAR */}
      <div className="p-3 rounded-xl bg-zinc-900/90 border border-white/10 space-y-2 text-[10px]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
          <span className="font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-brand-purple" />
            Quick Pattern & Module Toggles:
          </span>

          {/* Access Control Selector */}
          <div className="flex items-center gap-1 bg-zinc-950 p-0.5 rounded-lg border border-white/10">
            <span className="text-zinc-400 px-1.5 text-[9px]">Security:</span>
            <button
              type="button"
              onClick={() => {
                setAccessControl("Ownable");
                setHasCustomized(true);
              }}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                accessControl === "Ownable"
                  ? "bg-blue-600 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Ownable
            </button>
            <button
              type="button"
              onClick={() => {
                setAccessControl("AccessControl");
                setHasCustomized(true);
              }}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                accessControl === "AccessControl"
                  ? "bg-purple-600 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              RBAC (Roles)
            </button>
          </div>
        </div>

        {/* Feature Switches Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
          <button
            type="button"
            onClick={() => toggleFeature("reentrancy")}
            className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-all ${
              featureToggles.reentrancy
                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/20"
            }`}
          >
            <span className="font-bold truncate">ReentrancyGuard</span>
            {featureToggles.reentrancy ? (
              <ToggleRight className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-zinc-600 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleFeature("pausable")}
            className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-all ${
              featureToggles.pausable
                ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/20"
            }`}
          >
            <span className="font-bold truncate">Pausable</span>
            {featureToggles.pausable ? (
              <ToggleRight className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-zinc-600 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleFeature("staking")}
            className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-all ${
              featureToggles.staking
                ? "bg-purple-950/30 border-purple-500/40 text-purple-300"
                : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/20"
            }`}
          >
            <span className="font-bold truncate">Staking Vault</span>
            {featureToggles.staking ? (
              <ToggleRight className="w-4 h-4 text-purple-400 shrink-0" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-zinc-600 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleFeature("agentFee")}
            className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-all ${
              featureToggles.agentFee
                ? "bg-brand-purple/20 border-brand-purple/40 text-white"
                : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/20"
            }`}
          >
            <span className="font-bold truncate">AI Creator Fee</span>
            {featureToggles.agentFee ? (
              <ToggleRight className="w-4 h-4 text-brand-purple shrink-0" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-zinc-600 shrink-0" />
            )}
          </button>

          <button
            type="button"
            onClick={() => toggleFeature("burnable")}
            className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-all ${
              featureToggles.burnable
                ? "bg-red-950/30 border-red-500/40 text-red-300"
                : "bg-zinc-950/40 border-white/5 text-zinc-500 hover:border-white/20"
            }`}
          >
            <span className="font-bold truncate">ERC20 Burnable</span>
            {featureToggles.burnable ? (
              <ToggleRight className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <ToggleLeft className="w-4 h-4 text-zinc-600 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {/* COMPARISON PANES CONTAINER */}
      <div
        className={`grid gap-4 transition-all ${
          viewMode === "split"
            ? "grid-cols-1 lg:grid-cols-2"
            : viewMode === "diagram"
            ? "grid-cols-1"
            : "grid-cols-1"
        }`}
      >
        {/* LEFT PANE: VISUAL ARCHITECTURAL STATE DIAGRAM WITH DRAG-AND-DROP DEPENDENCIES */}
        {(viewMode === "split" || viewMode === "diagram") && (
          <div className="space-y-4 border border-white/5 bg-zinc-900/30 p-4 rounded-xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand-purple flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Inherited Dependencies Stack (Drag & Drop)
              </span>
              <span className="text-[9px] text-zinc-400">
                Drag handle <GripVertical className="w-3 h-3 inline text-zinc-500" /> or click arrows to reorder inheritance
              </span>
            </div>

            {/* DRAGGABLE DEPENDENCY LIST */}
            <div className="space-y-2">
              {dependencies.map((dep, index) => {
                const isDraggingThis = draggedIdx === index;
                const isDragOverThis = dragOverIdx === index;

                return (
                  <div
                    key={dep.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onClick={() => setSelectedNode(selectedNode === dep.id ? null : dep.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing flex items-center justify-between gap-3 ${
                      dep.enabled
                        ? dep.color
                        : "border-white/5 bg-zinc-950/40 text-zinc-600 opacity-60"
                    } ${
                      selectedNode === dep.id
                        ? "ring-2 ring-brand-purple scale-[1.01] shadow-lg shadow-brand-purple/20"
                        : "hover:border-white/20"
                    } ${isDraggingThis ? "opacity-30 border-dashed border-white/40" : ""} ${
                      isDragOverThis ? "ring-2 ring-amber-400" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Drag Handle */}
                      <div className="text-zinc-500 hover:text-white p-1 cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-4 h-4" />
                      </div>

                      {/* Index Badge */}
                      <span className="w-5 h-5 rounded-full bg-black/40 border border-white/10 text-[9px] font-bold flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[11px] text-white tracking-wide truncate">
                            {dep.name}
                          </span>
                          <span className="text-[8px] px-1.5 py-0.2 rounded bg-black/40 border border-white/10 text-zinc-400">
                            {dep.type}
                          </span>
                        </div>
                        <p className="text-[9px] text-zinc-400 truncate mt-0.5">{dep.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {/* Up/Down Arrow Buttons */}
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveDependency(index, "up")}
                        className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-20"
                        title="Move Up in Inheritance Stack"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={index === dependencies.length - 1}
                        onClick={() => moveDependency(index, "down")}
                        className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white disabled:opacity-20"
                        title="Move Down in Inheritance Stack"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Enable/Disable Toggle (if not core) */}
                      {!dep.isCore && (
                        <button
                          type="button"
                          onClick={() => {
                            if (dep.isAccessControl) {
                              setAccessControl(accessControl === "Ownable" ? "AccessControl" : "Ownable");
                            } else if (dep.id === "reentrancy") {
                              toggleFeature("reentrancy");
                            } else if (dep.id === "pausable") {
                              toggleFeature("pausable");
                            } else if (dep.id === "burnable") {
                              toggleFeature("burnable");
                            }
                          }}
                          className="p-1 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
                          title="Toggle Component"
                        >
                          {dep.enabled ? (
                            <ToggleRight className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-zinc-600" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CONNECTOR ARROWS */}
            <div className="flex items-center justify-center py-0.5">
              <div className="flex items-center gap-2 text-zinc-500 text-[9px]">
                <span>Contract Inheritance Order: {dependencies.filter((d) => d.enabled).map((d) => d.name).join(", ")}</span>
                <ArrowDown className="w-3.5 h-3.5 text-brand-purple animate-bounce" />
              </div>
            </div>

            {/* CORE TARGET CONTRACT NODE */}
            <div
              onClick={() =>
                setSelectedNode(selectedNode === coreContractNode.id ? null : coreContractNode.id)
              }
              className={`p-4 rounded-xl border transition-all cursor-pointer ${coreContractNode.color} ${
                selectedNode === coreContractNode.id
                  ? "ring-2 ring-brand-purple scale-[1.01] shadow-lg shadow-brand-purple/20"
                  : "hover:border-brand-purple/80"
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-brand-purple" />
                  <span className="font-bold text-xs text-white tracking-wide">
                    {coreContractNode.name}
                  </span>
                </div>
                <span className="text-[8px] px-2 py-0.5 rounded-full bg-brand-purple/20 text-brand-purple border border-brand-purple/30 font-bold">
                  {coreContractNode.badge}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px]">
                <div>
                  <span className="text-zinc-400 font-bold block mb-1 uppercase text-[8px]">
                    State Layout:
                  </span>
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
                  <span className="text-zinc-400 font-bold block mb-1 uppercase text-[8px]">
                    Core Interfaces & Methods:
                  </span>
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

            {/* PROTOCOL HOOKS & RUNTIME DEPENDENCIES */}
            <div className="pt-2 border-t border-white/10">
              <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500 block mb-2">
                Protocol Runtime Hooks:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 flex items-center gap-2">
                  <Boxes className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Token Factory</span>
                    <span className="text-[8px] text-zinc-500">Base L2 Mainnet</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold text-white block">AA Gas Paymaster</span>
                    <span className="text-[8px] text-zinc-500">Zero-Gas Sponsorship</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-brand-purple shrink-0" />
                  <div>
                    <span className="font-bold text-white block">Linear Bonding Curve</span>
                    <span className="text-[8px] text-zinc-500">Sloped Pricing Math</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT PANE: DYNAMICALLY RE-COMPILED BASE CONTRACT CODE VIEW */}
        {(viewMode === "split" || viewMode === "code") && (
          <div className="space-y-3 border border-white/5 bg-zinc-950 p-4 rounded-xl flex flex-col justify-between">
            <div>
              {/* Code Pane Control Bar */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-brand-purple" />
                  <span className="text-xs font-bold text-white font-mono">
                    {coreContractNode.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Solidity
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-[10px] text-zinc-300 hover:text-white transition-all flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy Code"}</span>
                  </button>
                </div>
              </div>

              {/* Active Selection Filter / Highlighting Banner */}
              {selectedNode && (
                <div className="mb-2 p-2 rounded-lg bg-brand-purple/10 border border-brand-purple/30 text-[10px] flex items-center justify-between">
                  <span className="text-brand-purple font-bold flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" /> Highlighting code for selected node:{" "}
                    <u className="no-underline text-white font-mono">{selectedNode}</u>
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(null)}
                    className="text-[9px] text-zinc-400 hover:text-white underline"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              {/* Search filter in code */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={codeFilter}
                  onChange={(e) => setCodeFilter(e.target.value)}
                  placeholder="Search code (e.g. modifier, import, event)..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-purple/50 font-mono"
                />
              </div>

              {/* Code Pre Container */}
              <div className="bg-[#08080a] border border-white/5 rounded-xl p-3 max-h-[420px] overflow-y-auto font-mono text-[11px] leading-relaxed select-all scrollbar-thin scrollbar-thumb-zinc-800">
                {codeLines.map((line, idx) => {
                  const lineNum = idx + 1;
                  const isFilteredOut =
                    codeFilter.trim().length > 0 &&
                    !line.toLowerCase().includes(codeFilter.toLowerCase());

                  const isKeywordMatched =
                    selectedKeywords.length > 0 &&
                    selectedKeywords.some((kw) => line.includes(kw));

                  if (isFilteredOut) return null;

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 px-1 py-0.5 rounded transition-all ${
                        isKeywordMatched
                          ? "bg-brand-purple/20 border-l-2 border-brand-purple text-white font-bold"
                          : "hover:bg-white/5 text-zinc-300"
                      }`}
                    >
                      <span className="text-zinc-600 select-none text-right w-6 shrink-0 text-[10px]">
                        {lineNum}
                      </span>
                      <span className="whitespace-pre-wrap break-all">{line || " "}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer summary */}
            <div className="pt-2 mt-2 border-t border-white/10 flex items-center justify-between text-[9px] text-zinc-500 font-mono">
              <span>Compiler Target: EVM Paris / Base Sepolia</span>
              <span>Gas Optimized: Yes (200 Runs)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
