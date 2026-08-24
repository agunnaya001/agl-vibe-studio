import React, { useState, useRef } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Upload, 
  FileCode, 
  Search, 
  Copy, 
  Check, 
  Download, 
  Sparkles, 
  Terminal, 
  Zap, 
  RefreshCw, 
  Flame, 
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Filter,
  FileText,
  Lock,
  Code2,
  X,
  SlidersHorizontal
} from "lucide-react";
import { 
  SecurityAuditReport, 
  AuditFinding, 
  SeverityLevel, 
  NetworkKey, 
  SUPPORTED_NETWORKS 
} from "../../types/aiSuite";
import { AIService } from "../../lib/aiSuiteService";
import jsPDF from "jspdf";

const SAMPLE_CONTRACTS = [
  {
    name: "Vulnerable Reentrancy Vault (Demo)",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EtherVault {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    // Vulnerable to reentrancy: state is updated AFTER external call
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        // Unsafe low-level call before state update
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        balances[msg.sender] -= amount; // Checks-Effects-Interactions violated!
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}`
  },
  {
    name: "Base Bonding Curve Token",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AGLBondingCurve is ERC20, Ownable, ReentrancyGuard {
    uint256 public constant INITIAL_PRICE = 0.0001 ether;
    uint256 public constant SLOPE = 1e12; // Linear curve slope
    uint256 public poolBalance;
    uint256 public creatorFeeBps = 100; // 1%
    address public treasury;

    event TokensPurchased(address indexed buyer, uint256 ethSpent, uint256 tokensMinted);
    event TokensSold(address indexed seller, uint256 tokensBurned, uint256 ethReturned);

    constructor(address _treasury) ERC20("AGL Curve Token", "AGLC") Ownable(msg.sender) {
        treasury = _treasury;
    }

    function buy() external payable nonReentrant {
        require(msg.value > 0, "Zero ETH");
        uint256 fee = (msg.value * creatorFeeBps) / 10000;
        uint256 netEth = msg.value - fee;
        
        uint256 tokensToMint = (netEth * 1e18) / (INITIAL_PRICE + (totalSupply() * SLOPE) / 1e18);
        require(tokensToMint > 0, "No tokens computed");

        poolBalance += netEth;
        (bool feeSuccess, ) = treasury.call{value: fee}("");
        require(feeSuccess, "Fee transfer failed");

        _mint(msg.sender, tokensToMint);
        emit TokensPurchased(msg.sender, msg.value, tokensToMint);
    }
}`
  },
  {
    name: "Access Control & Timelock Staking",
    code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract MultiRoleStaking is AccessControl, Pausable {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    mapping(address => uint256) public stakedAmounts;
    uint256 public rewardRate = 100; // 1% daily

    constructor(address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, defaultAdmin);
    }

    function stake() external payable whenNotPaused {
        require(msg.value > 0, "Zero amount");
        stakedAmounts[msg.sender] += msg.value;
    }

    function emergencyWithdraw() external {
        uint256 amount = stakedAmounts[msg.sender];
        require(amount > 0, "No stake");
        stakedAmounts[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}`
  }
];

interface SecurityAuditorProps {
  showToast?: (msg: string, type: "success" | "error" | "info") => void;
  selectedNetwork?: NetworkKey;
}

export default function SecurityAuditorWorkspace({ 
  showToast,
  selectedNetwork = "base-mainnet"
}: SecurityAuditorProps) {
  const [solidityCode, setSolidityCode] = useState<string>(SAMPLE_CONTRACTS[0].code);
  const [contractAddress, setContractAddress] = useState<string>("");
  const [contractName, setContractName] = useState<string>("EtherVault");
  const [network, setNetwork] = useState<NetworkKey>(selectedNetwork);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [auditReport, setAuditReport] = useState<SecurityAuditReport | null>(null);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isLoadingSource, setIsLoadingSource] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".sol") && !file.name.endsWith(".txt")) {
      showToast?.("Please upload a .sol or .txt Solidity file", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setSolidityCode(content);
      const inferredName = file.name.replace(/\.sol$/, "").replace(/\.txt$/, "");
      setContractName(inferredName);
      showToast?.(`Loaded ${file.name} successfully`, "success");
    };
    reader.readAsText(file);
  };

  // Fetch verified source by address
  const handleFetchSource = async () => {
    if (!contractAddress.trim()) {
      showToast?.("Enter a valid contract address first", "info");
      return;
    }

    setIsLoadingSource(true);
    try {
      showToast?.(`Fetching on-chain contract source on ${SUPPORTED_NETWORKS[network].name}...`, "info");
      const result = await AIService.fetchContractSource({
        address: contractAddress.trim(),
        network,
      });

      if (result.isVerified && result.sourceCode) {
        setSolidityCode(result.sourceCode);
        if (result.contractName) setContractName(result.contractName);
        showToast?.(`Loaded verified source code for ${result.contractName || contractAddress}`, "success");
      } else {
        showToast?.("Contract source code not verified on explorer. Running analysis on bytecode & ABI.", "info");
        if (result.bytecode) {
          setSolidityCode(`// Unverified Contract Bytecode loaded for ${contractAddress}\n// Bytecode Length: ${result.bytecode.length} characters\n// Bytecode: ${result.bytecode.slice(0, 400)}...`);
        }
      }
    } catch (err: any) {
      showToast?.(err.message || "Failed to fetch contract source", "error");
    } finally {
      setIsLoadingSource(false);
    }
  };

  // Run AI Security Audit
  const handleRunAudit = async () => {
    if (!solidityCode.trim() && !contractAddress.trim()) {
      showToast?.("Please provide Solidity source code or contract address", "error");
      return;
    }

    setIsAuditing(true);
    setAuditReport(null);

    try {
      showToast?.("Running Gemini 3.7 Deep Security & Formal Analysis...", "info");
      const report = await AIService.runSecurityAudit({
        solidityCode,
        contractAddress: contractAddress.trim() || undefined,
        contractName,
        network,
      });

      setAuditReport(report);
      if (report.findings.length > 0) {
        setExpandedFindingId(report.findings[0].id);
      }
      showToast?.(`Audit completed! Found ${report.findings.length} findings with score ${report.overallScore}/100`, "success");
    } catch (err: any) {
      showToast?.(err.message || "Audit failed to complete", "error");
    } finally {
      setIsAuditing(false);
    }
  };

  // Export Audit Report to PDF
  const handleExportPDF = () => {
    if (!auditReport) return;

    try {
      const doc = new jsPDF();
      doc.setFont("helvetica");
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(30, 27, 75);
      doc.text("AGL Security Audit Report", 20, 25);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated: ${new Date(auditReport.timestamp).toLocaleString()}`, 20, 32);
      doc.text(`Target Network: ${SUPPORTED_NETWORKS[auditReport.targetNetwork]?.name || auditReport.targetNetwork}`, 20, 38);
      doc.text(`Contract: ${auditReport.contractName} (${auditReport.contractAddress || "Source Audit"})`, 20, 44);

      // Score
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(`Security Score: ${auditReport.overallScore}/100`, 20, 56);
      doc.setFontSize(10);
      doc.text(`Critical: ${auditReport.totalFindings.critical} | High: ${auditReport.totalFindings.high} | Medium: ${auditReport.totalFindings.medium} | Low: ${auditReport.totalFindings.low}`, 20, 63);

      // Summary
      doc.setFontSize(12);
      doc.text("Executive Summary:", 20, 75);
      doc.setFontSize(9);
      const splitSummary = doc.splitTextToSize(auditReport.riskSummary, 170);
      doc.text(splitSummary, 20, 82);

      let yPos = 82 + splitSummary.length * 5 + 10;

      // Findings
      doc.setFontSize(12);
      doc.text("Key Vulnerability Findings:", 20, yPos);
      yPos += 8;

      auditReport.findings.forEach((finding, idx) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setTextColor(finding.severity === "Critical" ? 220 : finding.severity === "High" ? 180 : 50, 20, 40);
        doc.text(`[${finding.severity.toUpperCase()}] ${finding.title} (${finding.id})`, 20, yPos);
        yPos += 5;

        doc.setFontSize(8);
        doc.setTextColor(50, 50, 50);
        const splitExp = doc.splitTextToSize(`Explanation: ${finding.explanation}`, 170);
        doc.text(splitExp, 20, yPos);
        yPos += splitExp.length * 4 + 4;

        const splitFix = doc.splitTextToSize(`Recommendation: ${finding.recommendation}`, 170);
        doc.text(splitFix, 20, yPos);
        yPos += splitFix.length * 4 + 6;
      });

      doc.save(`AGL-Audit-${auditReport.contractName}-${Date.now()}.pdf`);
      showToast?.("Exported PDF audit report successfully!", "success");
    } catch (e: any) {
      showToast?.("Failed to generate PDF export: " + e.message, "error");
    }
  };

  // Export Markdown
  const handleExportMarkdown = () => {
    if (!auditReport) return;
    const md = `# AGL Studio Security Audit Report: ${auditReport.contractName}
**Generated**: ${new Date(auditReport.timestamp).toISOString()}
**Target Network**: ${SUPPORTED_NETWORKS[auditReport.targetNetwork]?.name || auditReport.targetNetwork}
**Security Score**: ${auditReport.overallScore}/100
**Compiler Target**: ${auditReport.compilerVersion}
**Checks-Effects-Interactions (CEI) Compliant**: ${auditReport.ceiPadCompliant ? "YES" : "NO"}

## Executive Summary
${auditReport.riskSummary}

## Vulnerability Metrics
- **Critical**: ${auditReport.totalFindings.critical}
- **High**: ${auditReport.totalFindings.high}
- **Medium**: ${auditReport.totalFindings.medium}
- **Low**: ${auditReport.totalFindings.low}
- **Informational**: ${auditReport.totalFindings.informational}

## Detailed Findings
${auditReport.findings.map(f => `
### [${f.severity.toUpperCase()}] ${f.title} (${f.id})
- **Category**: ${f.category}
- **Location**: \`${f.location}\`
- **Confidence**: ${f.confidence}
${f.cwe ? `- **CWE**: ${f.cwe}` : ""}

**Explanation**:
${f.explanation}

**Attack Scenario**:
${f.attackScenario}

**Remediation**:
${f.recommendation}

${f.fixedCode ? `\`\`\`solidity\n${f.fixedCode}\n\`\`\`` : ""}
`).join("\n---\n")}

## Gas Optimizations
${auditReport.gasOptimizations.map(g => `- **${g.title}** (\`${g.location}\`): ${g.description} (Savings: ${g.estimatedSavings})`).join("\n")}
`;

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AGL-Audit-${auditReport.contractName}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.("Exported Markdown audit report", "success");
  };

  // Dynamic severity counts
  const criticalCount = auditReport?.findings.filter(f => f.severity.toLowerCase() === "critical").length ?? auditReport?.totalFindings.critical ?? 0;
  const highCount = auditReport?.findings.filter(f => f.severity.toLowerCase() === "high").length ?? auditReport?.totalFindings.high ?? 0;
  const mediumCount = auditReport?.findings.filter(f => f.severity.toLowerCase() === "medium").length ?? auditReport?.totalFindings.medium ?? 0;
  const lowCount = auditReport?.findings.filter(f => f.severity.toLowerCase() === "low").length ?? auditReport?.totalFindings.low ?? 0;
  const informationalCount = auditReport?.findings.filter(f => f.severity.toLowerCase() === "informational").length ?? auditReport?.totalFindings.informational ?? 0;
  const totalCount = auditReport?.findings.length ?? 0;

  const SEVERITY_FILTER_OPTIONS = [
    { 
      id: "all", 
      label: "All Severities", 
      shortLabel: "All",
      count: totalCount, 
      icon: Filter, 
      colorClass: "text-zinc-300 border-white/10 bg-zinc-900/80 hover:bg-zinc-800", 
      activeClass: "bg-brand-purple text-white border-brand-purple shadow-md shadow-brand-purple/20 ring-1 ring-brand-purple/50 font-bold",
      badgeColor: "bg-zinc-800 text-zinc-300 border-zinc-700"
    },
    { 
      id: "critical", 
      label: "Critical", 
      shortLabel: "Critical",
      count: criticalCount, 
      icon: ShieldAlert, 
      colorClass: "text-rose-400 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/15", 
      activeClass: "bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/20 ring-1 ring-rose-400/50 font-bold",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30"
    },
    { 
      id: "high", 
      label: "High", 
      shortLabel: "High",
      count: highCount, 
      icon: AlertTriangle, 
      colorClass: "text-orange-400 border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/15", 
      activeClass: "bg-orange-500 text-white border-orange-300 shadow-md shadow-orange-500/20 ring-1 ring-orange-400/50 font-bold",
      badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/30"
    },
    { 
      id: "medium", 
      label: "Medium", 
      shortLabel: "Medium",
      count: mediumCount, 
      icon: AlertTriangle, 
      colorClass: "text-amber-400 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15", 
      activeClass: "bg-amber-500 text-zinc-950 border-amber-300 shadow-md shadow-amber-500/20 ring-1 ring-amber-400/50 font-bold",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30"
    },
    { 
      id: "low", 
      label: "Low", 
      shortLabel: "Low",
      count: lowCount, 
      icon: Info, 
      colorClass: "text-blue-400 border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/15", 
      activeClass: "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20 ring-1 ring-blue-400/50 font-bold",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30"
    },
    { 
      id: "informational", 
      label: "Informational", 
      shortLabel: "Info",
      count: informationalCount, 
      icon: FileText, 
      colorClass: "text-zinc-400 border-zinc-500/20 bg-zinc-500/5 hover:bg-zinc-500/15", 
      activeClass: "bg-zinc-700 text-white border-zinc-400 shadow-md shadow-zinc-600/20 ring-1 ring-zinc-400/50 font-bold",
      badgeColor: "bg-zinc-500/20 text-zinc-300 border-zinc-500/30"
    },
  ];

  // Filter findings based on activeSeverityFilter and searchQuery
  const filteredFindings = auditReport?.findings.filter(f => {
    const matchesSeverity = activeSeverityFilter === "all" || f.severity.toLowerCase() === activeSeverityFilter.toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || 
      f.title.toLowerCase().includes(query) ||
      f.id.toLowerCase().includes(query) ||
      f.category.toLowerCase().includes(query) ||
      f.location.toLowerCase().includes(query) ||
      f.explanation.toLowerCase().includes(query);
    return matchesSeverity && matchesQuery;
  }) || [];

  const getSeverityBadge = (sev: SeverityLevel) => {
    switch (sev) {
      case "Critical":
        return "bg-rose-500/20 text-rose-400 border-rose-500/30";
      case "High":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "Medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Low":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "Informational":
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
      default:
        return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    }
  };

  return (
    <div id="ai-security-auditor-workspace" className="space-y-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-zinc-950/80 border border-brand-purple/20 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-brand-purple/20 to-blue-500/20 border border-brand-purple/30 text-brand-purple shadow-lg shadow-brand-purple/10">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide font-display">AGL AI Security Auditor</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Gemini 3.7 Deep Analysis
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Comprehensive Solidity vulnerability detection, formal CEI checks, attack scenario simulation & verified fixes
            </p>
          </div>
        </div>

        {/* Network & Sample Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            id="auditor-network-select"
            value={network}
            onChange={(e) => setNetwork(e.target.value as NetworkKey)}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-200 font-mono focus:outline-none focus:border-brand-purple"
          >
            {Object.values(SUPPORTED_NETWORKS).map((n) => (
              <option key={n.key} value={n.key}>
                {n.name} ({n.chainId})
              </option>
            ))}
          </select>

          <select
            id="auditor-sample-select"
            onChange={(e) => {
              const selected = SAMPLE_CONTRACTS.find(s => s.name === e.target.value);
              if (selected) {
                setSolidityCode(selected.code);
                setContractName(selected.name.split(" ")[0]);
                showToast?.(`Loaded ${selected.name}`, "info");
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-brand-purple"
          >
            <option value="">Load Sample Contract...</option>
            {SAMPLE_CONTRACTS.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Input Options Grid (Address Query + Source Upload) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Code Editor & Address Fetcher */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-brand-purple" />
                Query Deployed Contract on {SUPPORTED_NETWORKS[network].name}
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">Auto-retrieves verified ABI & bytecode</span>
            </div>

            <div className="flex gap-2">
              <input
                id="auditor-contract-address-input"
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder="0x... (e.g. 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)"
                className="flex-1 px-3 py-2 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-brand-purple"
              />
              <button
                id="btn-fetch-contract-source"
                onClick={handleFetchSource}
                disabled={isLoadingSource || !contractAddress}
                className="px-3 py-2 rounded-xl bg-brand-purple/20 hover:bg-brand-purple/30 text-brand-purple border border-brand-purple/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isLoadingSource ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                Fetch Source
              </button>
            </div>
          </div>

          {/* Solidity Code Input */}
          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-brand-purple" />
                <span className="text-xs font-semibold text-zinc-200">Solidity Source Code</span>
                <input
                  type="text"
                  value={contractName}
                  onChange={(e) => setContractName(e.target.value)}
                  placeholder="ContractName"
                  className="px-2 py-0.5 text-xs bg-zinc-900 border border-white/10 rounded-md text-zinc-300 font-mono w-32 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".sol,.txt"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-300 border border-white/10 flex items-center gap-1 transition-all"
                  title="Upload .sol file"
                >
                  <Upload className="w-3 h-3" />
                  Upload File
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(solidityCode);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-[11px] text-zinc-300 border border-white/10 flex items-center gap-1 transition-all"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
            </div>

            <textarea
              id="auditor-solidity-textarea"
              value={solidityCode}
              onChange={(e) => setSolidityCode(e.target.value)}
              rows={18}
              placeholder="// Paste Solidity contract code here (e.g. pragma solidity ^0.8.20;)..."
              className="w-full p-3.5 rounded-xl bg-zinc-950 border border-white/10 font-mono text-xs text-zinc-200 leading-relaxed focus:outline-none focus:border-brand-purple resize-none"
              spellCheck={false}
            />

            {/* Run Audit Action Button */}
            <button
              id="btn-run-security-audit"
              onClick={handleRunAudit}
              disabled={isAuditing || !solidityCode.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-purple to-blue-600 hover:from-brand-purple/90 hover:to-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Auditing 20+ Attack Vectors & CEI Safety...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run AI Security Audit Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Audit Findings & Interactive Report */}
        <div className="lg:col-span-6 space-y-4">
          {!auditReport && !isAuditing && (
            <div className="h-full min-h-[480px] p-8 rounded-2xl bg-zinc-950/40 border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-2xl bg-brand-purple/10 border border-brand-purple/20 text-brand-purple">
                <ShieldCheck className="w-12 h-12" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-base font-bold text-white">No Audit Report Generated Yet</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Paste your Solidity contract or choose a sample on the left, then click <strong>"Run AI Security Audit Report"</strong>.
                </p>
              </div>

              {/* Supported Checks Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg mt-4 text-left">
                {[
                  "Reentrancy (CEI)",
                  "Access Control",
                  "Flash Loans",
                  "Oracle Manipulation",
                  "Signature Replay",
                  "Proxy Collisions",
                  "Dangerous Delegatecall",
                  "Token Approvals",
                  "Front-running & MEV",
                  "Unbounded Loops (DoS)",
                  "Admin Privileges",
                  "Gas Optimization"
                ].map((check) => (
                  <div key={check} className="flex items-center gap-1.5 p-2 rounded-lg bg-zinc-900/60 border border-white/5 text-[11px] text-zinc-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="truncate">{check}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isAuditing && (
            <div className="h-full min-h-[480px] p-8 rounded-2xl bg-zinc-950/60 border border-brand-purple/30 flex flex-col items-center justify-center text-center space-y-4 animate-pulse">
              <div className="p-4 rounded-2xl bg-brand-purple/20 text-brand-purple animate-spin">
                <RefreshCw className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-bold text-white">Analyzing Solidity Contract Architecture</h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Checking formal logic, state mutability, reentrancy guards, integer precision, and OpenZeppelin standards...
                </p>
              </div>
            </div>
          )}

          {auditReport && !isAuditing && (
            <div className="space-y-4">
              {/* Score & Executive Overview Card */}
              <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl font-bold font-mono text-xl flex items-center justify-center border ${
                      auditReport.overallScore >= 80 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                      auditReport.overallScore >= 60 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                      "bg-rose-500/20 text-rose-400 border-rose-500/30"
                    }`}>
                      {auditReport.overallScore}/100
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{auditReport.contractName} Audit Report</h3>
                        {auditReport.verifiedOnChain && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                            On-Chain Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Target: {SUPPORTED_NETWORKS[auditReport.targetNetwork]?.name || auditReport.targetNetwork} • Compiler: {auditReport.compilerVersion}
                      </p>
                    </div>
                  </div>

                  {/* Export Options */}
                  <div className="flex items-center gap-2">
                    <button
                      id="btn-export-pdf-report"
                      onClick={handleExportPDF}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1 transition-all"
                      title="Export PDF Report"
                    >
                      <FileText className="w-3.5 h-3.5 text-brand-purple" />
                      PDF
                    </button>
                    <button
                      id="btn-export-md-report"
                      onClick={handleExportMarkdown}
                      className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1 transition-all"
                      title="Export Markdown Report"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                      MD
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/70 border border-white/5 text-xs text-zinc-300 leading-relaxed">
                  <span className="font-semibold text-white block mb-1">Executive Summary:</span>
                  {auditReport.riskSummary}
                </div>

                {/* Severity Metric Tiles (All 5 Severities + All) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 px-1">
                    <span className="font-semibold text-zinc-300">Severity Distribution</span>
                    <span>Click any level to filter findings</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                    {SEVERITY_FILTER_OPTIONS.map((sev) => {
                      const Icon = sev.icon;
                      const isActive = activeSeverityFilter === sev.id;
                      return (
                        <button
                          key={sev.id}
                          id={`metric-pill-${sev.id}`}
                          onClick={() => setActiveSeverityFilter(isActive && sev.id !== "all" ? "all" : sev.id)}
                          className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-between gap-1 ${
                            isActive ? sev.activeClass : sev.colorClass
                          }`}
                          title={`Filter by ${sev.label}`}
                        >
                          <div className="flex items-center justify-between w-full px-0.5">
                            <Icon className={`w-3.5 h-3.5 ${isActive ? "opacity-100" : "opacity-75"}`} />
                            <span className="font-mono font-bold text-xs">{sev.count}</span>
                          </div>
                          <div className="text-[10px] uppercase tracking-wider font-semibold truncate w-full">
                            {sev.shortLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Dedicated Filter Toggles & Search Toolbar */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-white/10 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-brand-purple" />
                    <span>Filter Findings by Severity:</span>
                  </div>

                  {(activeSeverityFilter !== "all" || searchQuery) && (
                    <button
                      id="btn-clear-auditor-filters"
                      onClick={() => {
                        setActiveSeverityFilter("all");
                        setSearchQuery("");
                      }}
                      className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded-lg bg-zinc-900 border border-white/10 self-start sm:self-auto transition-colors"
                    >
                      <X className="w-3 h-3" />
                      Clear Filters
                    </button>
                  )}
                </div>

                {/* Filter Toggles Row */}
                <div className="flex flex-wrap gap-1.5">
                  {SEVERITY_FILTER_OPTIONS.map((sev) => {
                    const Icon = sev.icon;
                    const isActive = activeSeverityFilter === sev.id;
                    return (
                      <button
                        key={sev.id}
                        id={`filter-toggle-${sev.id}`}
                        onClick={() => setActiveSeverityFilter(isActive && sev.id !== "all" ? "all" : sev.id)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                          isActive ? sev.activeClass : sev.colorClass
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{sev.label}</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold border ${
                          isActive ? "bg-black/20 text-white border-white/20" : sev.badgeColor
                        }`}>
                          {sev.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Search in Findings */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="auditor-findings-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search findings by title, category, function, or location..."
                    className="w-full pl-8 pr-8 py-1.5 rounded-xl bg-zinc-900/80 border border-white/10 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-brand-purple"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Findings Accordion List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-200">
                      Security Findings ({filteredFindings.length})
                    </span>
                    {activeSeverityFilter !== "all" && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-brand-purple/10 text-brand-purple border border-brand-purple/20">
                        Filtering: {activeSeverityFilter.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500">Click finding to inspect attack vector & fix</span>
                </div>

                {filteredFindings.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-zinc-950/60 border border-white/10 text-center space-y-3">
                    <div className="p-3 rounded-full bg-zinc-900 w-fit mx-auto text-zinc-400 border border-white/10">
                      <Filter className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">No Matching Security Findings</h4>
                      <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto">
                        No findings found with severity level <strong>"{activeSeverityFilter}"</strong>
                        {searchQuery ? ` matching "${searchQuery}"` : ""}.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveSeverityFilter("all");
                        setSearchQuery("");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-brand-purple/20 hover:bg-brand-purple/30 text-brand-purple border border-brand-purple/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Show All {totalCount} Findings
                    </button>
                  </div>
                ) : (
                  filteredFindings.map((finding) => {
                    const isExpanded = expandedFindingId === finding.id;
                    return (
                      <div
                        key={finding.id}
                        className="rounded-2xl bg-zinc-950/90 border border-white/10 overflow-hidden transition-all"
                      >
                        <button
                          onClick={() => setExpandedFindingId(isExpanded ? null : finding.id)}
                          className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-white/5 transition-all"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shrink-0 ${getSeverityBadge(finding.severity)}`}>
                              {finding.severity}
                            </span>
                            <div className="truncate">
                              <h4 className="text-xs font-bold text-white truncate">{finding.title}</h4>
                              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                {finding.id} • {finding.category} • Location: {finding.location}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-zinc-500">Confidence: {finding.confidence}</span>
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="p-4 border-t border-white/10 bg-black/40 space-y-3.5 text-xs">
                            {/* Vulnerable snippet if available */}
                            {finding.snippet && (
                              <div>
                                <span className="text-[11px] font-semibold text-rose-400 block mb-1">Vulnerable Code Snippet:</span>
                                <pre className="p-3 rounded-xl bg-zinc-950 border border-rose-500/20 text-rose-200 font-mono text-[11px] overflow-x-auto">
                                  {finding.snippet}
                                </pre>
                              </div>
                            )}

                            {/* Technical Explanation */}
                            <div>
                              <span className="text-[11px] font-semibold text-zinc-200 block mb-1">Detailed Explanation:</span>
                              <p className="text-zinc-300 leading-relaxed">{finding.explanation}</p>
                            </div>

                            {/* Attack Scenario */}
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-200">
                              <span className="font-semibold text-rose-300 block mb-1 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                Exploit / Attack Scenario:
                              </span>
                              <p className="text-[11px] leading-relaxed">{finding.attackScenario}</p>
                            </div>

                            {/* Recommendation */}
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
                              <span className="font-semibold text-emerald-300 block mb-1 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                Recommended Fix:
                              </span>
                              <p className="text-[11px] leading-relaxed">{finding.recommendation}</p>
                            </div>

                            {/* Fixed Code Solution */}
                            {finding.fixedCode && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-semibold text-brand-purple flex items-center gap-1.5">
                                    <Code2 className="w-3.5 h-3.5" />
                                    Corrected Defensive Implementation:
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(finding.fixedCode || "");
                                      showToast?.("Copied fixed code snippet!", "success");
                                    }}
                                    className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-300 border border-white/10 flex items-center gap-1"
                                  >
                                    <Copy className="w-3 h-3" />
                                    Copy Fix
                                  </button>
                                </div>
                                <pre className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/20 text-emerald-300 font-mono text-[11px] overflow-x-auto">
                                  {finding.fixedCode}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Gas Optimizations Card */}
              {auditReport.gasOptimizations && auditReport.gasOptimizations.length > 0 && (
                <div className="p-4 rounded-2xl bg-zinc-950/70 border border-white/10 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <Zap className="w-4 h-4" />
                    <span>Gas Optimization Opportunities ({auditReport.gasOptimizations.length})</span>
                  </div>

                  <div className="space-y-2">
                    {auditReport.gasOptimizations.map((gas, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{gas.title}</span>
                          <span className="text-[10px] font-mono text-emerald-400">{gas.estimatedSavings}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400">{gas.description}</p>
                        <span className="text-[10px] font-mono text-zinc-500">Location: {gas.location}</span>
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
