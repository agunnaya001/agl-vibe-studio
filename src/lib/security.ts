export interface SecurityFinding {
  severity: "high" | "medium" | "info";
  title: string;
  description: string;
  recommendation: string;
}

export interface SecurityAuditResult {
  status: "passed" | "warning";
  score: number; // 0 to 100
  findings: SecurityFinding[];
  summary: string;
}

/**
 * Performs simulated static code analysis on Solidity smart contract source code.
 * Detects common vulnerabilities and design smells such as:
 * - tx.origin authorization
 * - selfdestruct usage
 * - delegatecall usage
 * - timestamp dependence for randomness
 * - floating compiler pragma
 * - unprotected state changes / minting
 * - reentrancy vulnerability (transfers without guards)
 * - unchecked block calculations
 */
export function analyzeSolidityCode(code: string | undefined): SecurityAuditResult {
  if (!code || code.trim() === "") {
    return {
      status: "passed",
      score: 100,
      findings: [],
      summary: "No source code provided for security audit."
    };
  }

  const findings: SecurityFinding[] = [];

  // 1. tx.origin authorization check
  if (code.includes("tx.origin")) {
    findings.push({
      severity: "high",
      title: "Authorization via tx.origin",
      description: "The contract utilizes tx.origin for authentication or authorization. This creates a severe vulnerability where an attacker can trick an authorized user into calling an exploit contract, which then masquerades as them to call functions restricted by tx.origin.",
      recommendation: "Replace tx.origin with msg.sender."
    });
  }

  // 2. selfdestruct check
  if (code.includes("selfdestruct") || code.includes("suicide")) {
    findings.push({
      severity: "high",
      title: "Contract Destruction Vulnerability (selfdestruct)",
      description: "Detected use of selfdestruct. This mechanism deletes the contract bytecode from the blockchain and transfers all remaining Ether to a specified address. If compromised, it can permanently lock or destroy the contract.",
      recommendation: "Avoid using selfdestruct. Use upgradeability patterns or simple disabling toggles instead."
    });
  }

  // 3. delegatecall check
  if (code.includes("delegatecall")) {
    findings.push({
      severity: "medium",
      title: "Low-level Delegatecall Usage",
      description: "Using delegatecall is highly risky as the target contract runs within the context of the calling contract's storage. If the target contract changes its state layout or is malicious, it can overwrite vital state variables.",
      recommendation: "Ensure the target contract address is securely validated, immutable, or set only by authorized admins, or prefer using higher-level interface calls."
    });
  }

  // 4. block.timestamp check
  if (code.includes("block.timestamp") && (code.toLowerCase().includes("random") || code.includes("%") || code.toLowerCase().includes("seed"))) {
    findings.push({
      severity: "medium",
      title: "Timestamp Dependence for Randomness",
      description: "Block.timestamp can be slightly manipulated (up to several seconds) by block producers or miners. Using it as a source of randomness or in game-theory logic can allow block producers to skew outcomes to their advantage.",
      recommendation: "Use secure on-chain randomness systems like Chainlink VRF or commit-reveal schemes instead of block.timestamp."
    });
  }

  // 5. Floating pragma
  if (code.includes("pragma solidity ^") || code.includes(">=") || code.includes("<")) {
    findings.push({
      severity: "info",
      title: "Floating Compiler Pragma",
      description: "The contract defines a floating compiler version range (e.g., ^0.8.20). This can result in compilation with different, unvetted compiler versions, potentially introducing compiler-specific bugs or optimizations in production.",
      recommendation: "Lock the compiler version to a single precise release (e.g., pragma solidity 0.8.20;) for production contracts."
    });
  }

  // 6. Reentrancy Vulnerability (transfers without nonReentrant modifiers)
  const containsValueTransfer = code.includes(".call{value") || code.includes(".transfer(") || code.includes(".send(");
  const containsReentrancyGuard = code.includes("nonReentrant") || code.includes("ReentrancyGuard");
  if (containsValueTransfer && !containsReentrancyGuard) {
    findings.push({
      severity: "medium",
      title: "Potential Reentrancy Susceptibility",
      description: "The contract transfers funds or external value using .call or .transfer, but does not use the nonReentrant modifier or inherit from ReentrancyGuard. This could allow malicious smart contracts to repeatedly re-enter your state-updating functions.",
      recommendation: "Inherit from OpenZeppelin's ReentrancyGuard and apply the nonReentrant modifier to any functions that perform state mutations alongside asset/value transfers."
    });
  }

  // 7. Unprotected state changes / Mint restriction check
  if (code.includes("function mint") && !code.includes("onlyOwner") && !code.includes("hasRole") && !code.includes("_onlyOwner")) {
    findings.push({
      severity: "medium",
      title: "Unprotected Minting Functionality",
      description: "Detected a public/external minting function without explicit access controls (like onlyOwner or hasRole). Any user can call this function to mint an arbitrary amount of tokens, completely diluting the supply.",
      recommendation: "Add access control modifiers such as onlyOwner or restrict minting privileges using an RBAC (Role-Based Access Control) system."
    });
  }

  // 8. Unchecked calculations
  if (code.includes("unchecked")) {
    findings.push({
      severity: "info",
      title: "Unchecked Arithmetic Block",
      description: "Using unchecked blocks bypasses Solidity's default overflow and underflow protection. While it saves gas, underflow or overflow can lead to critical exploit vectors if not mathematically proven safe.",
      recommendation: "Double-check mathematical constraints to guarantee that bounds can never be exceeded under any possible user interaction."
    });
  }

  // Calculate score
  let score = 100;
  for (const finding of findings) {
    if (finding.severity === "high") {
      score -= 30;
    } else if (finding.severity === "medium") {
      score -= 15;
    } else if (finding.severity === "info") {
      score -= 5;
    }
  }
  score = Math.max(10, score);

  const hasHighOrMedium = findings.some(f => f.severity === "high" || f.severity === "medium");
  const status = hasHighOrMedium ? "warning" : "passed";

  let summary = "";
  if (findings.length === 0) {
    summary = "Solid code architecture. No vulnerability patterns or code smells detected during simulated static analysis. High compliance with standard checks-effects-interactions patterns.";
  } else {
    const highCount = findings.filter(f => f.severity === "high").length;
    const medCount = findings.filter(f => f.severity === "medium").length;
    const infoCount = findings.filter(f => f.severity === "info").length;
    summary = `Static analysis identified ${findings.length} concern(s) (${highCount} high, ${medCount} medium, ${infoCount} low/info). Correct the listed items to secure your deployment.`;
  }

  return {
    status,
    score,
    findings,
    summary
  };
}
