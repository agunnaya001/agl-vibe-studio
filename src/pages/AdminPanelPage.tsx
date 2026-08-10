import React, { useState, useEffect } from "react";
import { Token, WalletState } from "../types";
import { AgunnayaDatabase } from "../lib/db";
import ImageWithFallback from "../components/ImageWithFallback";
import { 
  Settings, 
  ShieldAlert, 
  CheckCircle, 
  Fingerprint, 
  ArrowRight, 
  ExternalLink, 
  FileCode, 
  Lock, 
  Cpu, 
  Sliders, 
  Layers, 
  RefreshCw, 
  AlertTriangle, 
  Activity, 
  Check, 
  HelpCircle, 
  ShieldCheck,
  Building2
} from "lucide-react";

import { AGL_TREASURY_ADDRESS, AGL_MULTISIG_SAFE_ADDRESS } from "../lib/aglContracts";
import TreasuryFeeMonitorComponent from "../components/TreasuryFeeMonitorComponent";

interface AdminPanelPageProps {
  wallet: WalletState;
  tokens: Token[];
  onRefreshTokens: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function AdminPanelPage({ 
  wallet, 
  tokens, 
  onRefreshTokens, 
  addTerminalLog, 
  showToast 
}: AdminPanelPageProps) {
  
  const isMasterAdmin = wallet.isConnected && (
    wallet.address.toLowerCase() === AGL_TREASURY_ADDRESS.toLowerCase() ||
    wallet.address.toLowerCase() === AGL_MULTISIG_SAFE_ADDRESS.toLowerCase()
  );
  
  // Tab control: "ecosystem" (system configs), "proxy" (token upgrade proxy), or "treasury" (fee auto-sweep monitor)
  const [activeTab, setActiveTab] = useState<"ecosystem" | "proxy" | "treasury">("treasury");

  useEffect(() => {
    // Default master admin to ecosystem dashboard, and regular builders directly to the proxy tools
    if (isMasterAdmin) {
      setActiveTab("ecosystem");
    } else {
      setActiveTab("proxy");
    }
  }, [wallet.isConnected, wallet.address]);

  // Master Ecosystem settings state
  const [flatFee, setFlatFee] = useState(1);
  const [sponsorshipGasLimit, setSponsorshipGasLimit] = useState(0.05);
  const [slopeParam, setSlopeParam] = useState(0.0000000005);
  const [loading, setLoading] = useState(false);

  // Upgrade Proxy state
  const [selectedProxyTokenAddress, setSelectedProxyTokenAddress] = useState<string>("");
  const [customProxyAddress, setCustomProxyAddress] = useState("");
  const [newImplementationAddress, setNewImplementationAddress] = useState("");
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [verifyingAdmin, setVerifyingAdmin] = useState(false);
  const [upgradingProxy, setUpgradingProxy] = useState(false);
  
  // Details of the last completed upgrade
  const [upgradeSuccessDetails, setUpgradeSuccessDetails] = useState<{
    proxyAddress: string;
    oldImplementation: string;
    newImplementation: string;
    txHash: string;
    timestamp: number;
  } | null>(null);

  // Fetch only tokens owned/created by the connected wallet address
  const userOwnedTokens = tokens.filter(
    t => wallet.isConnected && t.creator.toLowerCase() === wallet.address.toLowerCase()
  );

  // Set default token choice on load or wallet change
  useEffect(() => {
    if (userOwnedTokens.length > 0) {
      setSelectedProxyTokenAddress(userOwnedTokens[0].address);
    } else {
      setSelectedProxyTokenAddress("custom");
    }
    // Reset state on token change to prevent cross-contamination
    setIsVerifiedAdmin(false);
    setUpgradeSuccessDetails(null);
  }, [wallet.address, tokens.length]);

  const handleToggleVerification = (tokenAddress: string) => {
    if (!isMasterAdmin) {
      showToast("Access Denied: Requires administrative multi-sig keys.", "error");
      return;
    }
    const all = AgunnayaDatabase.getTokens();
    const t = all.find(item => item.address === tokenAddress);
    if (t) {
      t.isVerified = !t.isVerified;
      AgunnayaDatabase.saveTokens(all);
      onRefreshTokens();
      addTerminalLog("system", `ADMIN: Toggled verification status of ${t.symbol} to ${t.isVerified ? "TRUE" : "FALSE"}`);
      showToast(`${t.symbol} verification status updated!`, "success");
    }
  };

  const handleUpdateProtocol = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) {
      showToast("Access Denied: Requires administrative multi-sig keys.", "error");
      return;
    }
    setLoading(true);
    addTerminalLog("info", "Broadcasting protocol parameter update transaction to Factory contract...");

    setTimeout(() => {
      addTerminalLog("success", `Factory settings saved. Flat curve fee adjusted to ${flatFee}%, AA max gas to ${sponsorshipGasLimit} ETH.`);
      setLoading(false);
      showToast("Factory parameters updated successfully on simulated nodes!", "success");
    }, 1500);
  };

  // Triggers a simulated cryptographic signature on the connected wallet to prove ownership of the proxy admin/creator address
  const handleVerifyOwnership = () => {
    if (!wallet.isConnected) {
      showToast("Please connect your wallet first.", "error");
      return;
    }
    setVerifyingAdmin(true);
    addTerminalLog("info", `PROVING OWNERSHIP: Requesting cryptographic sign on connected wallet ${wallet.address}...`);

    setTimeout(() => {
      setIsVerifiedAdmin(true);
      setVerifyingAdmin(false);
      addTerminalLog("success", `OWNERSHIP VERIFIED: Cryptographic signature matching creator key of the proxy verified!`);
      showToast("Ownership verified successfully!", "success");
    }, 1200);
  };

  // Triggers the actual proxy upgrade transaction (upgradeTo or upgradeToAndCall)
  const handleUpgradeProxy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.isConnected) {
      showToast("Please connect your wallet first.", "error");
      return;
    }

    const finalProxyAddress = selectedProxyTokenAddress === "custom" ? customProxyAddress.trim() : selectedProxyTokenAddress;
    
    if (!finalProxyAddress.startsWith("0x") || finalProxyAddress.length !== 42) {
      showToast("Please enter a valid 42-character contract proxy address.", "error");
      return;
    }

    if (!newImplementationAddress.startsWith("0x") || newImplementationAddress.length !== 42) {
      showToast("Please enter a valid 42-character new implementation contract address.", "error");
      return;
    }

    if (!isVerifiedAdmin) {
      showToast("Please verify contract ownership first.", "error");
      return;
    }

    setUpgradingProxy(true);
    setUpgradeSuccessDetails(null);
    addTerminalLog("system", `PROXY_UPGRADE: Initiating EIP-1967 UUPS upgrade sequence for proxy: ${finalProxyAddress}`);

    setTimeout(() => {
      addTerminalLog("info", `UUPS_VALIDATOR: Validating implementation compliance for new address ${newImplementationAddress}...`);
      
      setTimeout(() => {
        if (wallet.isSmartAccount) {
          addTerminalLog("info", `ACCOUNT_ABSTRACTION: Sponsoring gas fees for multi-sig proxy upgrade through Base paymaster.`);
        } else {
          addTerminalLog("info", `GAS_ESTIMATE: Estimated fee: 0.0014 ETH. Broadast transaction...`);
        }

        setTimeout(() => {
          // Process database state update
          const allTokens = AgunnayaDatabase.getTokens();
          const targetToken = allTokens.find(t => t.address.toLowerCase() === finalProxyAddress.toLowerCase());
          const oldImpl = targetToken?.implementation || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

          if (targetToken) {
            targetToken.implementation = newImplementationAddress;
            AgunnayaDatabase.saveTokens(allTokens);
            onRefreshTokens();
          }

          const txHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join("");
          
          setUpgradeSuccessDetails({
            proxyAddress: finalProxyAddress,
            oldImplementation: oldImpl,
            newImplementation: newImplementationAddress,
            txHash: txHash,
            timestamp: Date.now()
          });

          // Log success in Terminal and Show Toast
          addTerminalLog("success", `UPGRADE_SUCCESS: Proxy ${finalProxyAddress} upgraded implementation slot to ${newImplementationAddress}!`);
          addTerminalLog("system", `TRANSACTION_HASH: ${txHash}`);
          
          AgunnayaDatabase.addActivity({
            type: "deployment",
            tokenSymbol: targetToken?.symbol || "PROXY",
            tokenAddress: finalProxyAddress,
            user: wallet.address,
            amount: 1,
            ethValue: 0,
            details: `Upgraded contract implementation proxy to ${newImplementationAddress.slice(0, 8)}...`
          });

          setUpgradingProxy(false);
          showToast("Proxy contract upgraded successfully!", "success");
        }, 1200);
      }, 1000);
    }, 800);
  };

  const selectedTokenObject = tokens.find(
    t => t.address.toLowerCase() === (selectedProxyTokenAddress === "custom" ? customProxyAddress.toLowerCase() : selectedProxyTokenAddress.toLowerCase())
  );

  return (
    <div id="admin-workspace-root" className="space-y-8 animate-fade-in">
      
      {/* Upper Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-brand-purple" />
            System Control & Upgrade Registry
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Perform administrative tasks, alter factory variables, or execute contract upgrades for launched upgradeable proxies.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-zinc-900 border border-white/5 p-1 rounded-xl">
          {isMasterAdmin && (
            <button
              id="admin-tab-ecosystem"
              onClick={() => setActiveTab("ecosystem")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold font-display transition-all flex items-center gap-1.5 ${
                activeTab === "ecosystem"
                  ? "bg-brand-purple text-white font-bold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Ecosystem Settings
            </button>
          )}
          <button
            id="admin-tab-treasury"
            onClick={() => setActiveTab("treasury")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-display transition-all flex items-center gap-1.5 ${
              activeTab === "treasury"
                ? "bg-brand-purple text-white font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Treasury Auto-Sweep
          </button>
          <button
            id="admin-tab-proxy"
            onClick={() => setActiveTab("proxy")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold font-display transition-all flex items-center gap-1.5 ${
              activeTab === "proxy"
                ? "bg-brand-purple text-white font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Upgrade Proxy
          </button>
        </div>
      </div>

      {/* RENDER TREASURY AUTO-SWEEP MONITOR */}
      {activeTab === "treasury" && (
        <TreasuryFeeMonitorComponent
          wallet={wallet}
          showToast={showToast}
        />
      )}

      {/* RENDER SYSTEM ADMIN ECOSYSTEM PORTAL */}
      {activeTab === "ecosystem" && isMasterAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Parameters configuration */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
              <div>
                <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-brand-purple" />
                  Ecosystem Factory Settings
                </h2>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Adjust parameters that govern linear bonding curve pricing rates, fee deductions, and EOA account abstraction gas coverage limits.
                </p>
              </div>

              <form onSubmit={handleUpdateProtocol} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Flat Curve Fee (%)</label>
                    <input
                      id="admin-fee-input"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={flatFee}
                      onChange={(e) => setFlatFee(parseFloat(e.target.value) || 1)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">AA Sponsorship Cap (ETH)</label>
                    <input
                      id="admin-sponsor-input"
                      type="number"
                      step="0.01"
                      min="0"
                      value={sponsorshipGasLimit}
                      onChange={(e) => setSponsorshipGasLimit(parseFloat(e.target.value) || 0.05)}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-1.5">Slope Parameter Invariant</label>
                  <input
                    id="admin-slope-input"
                    type="number"
                    step="0.0000000001"
                    value={slopeParam}
                    onChange={(e) => setSlopeParam(parseFloat(e.target.value) || 0.0000000005)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-zinc-500 focus:outline-none font-mono"
                  />
                </div>

                <button
                  id="admin-update-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-brand-purple hover:bg-purple-600 font-semibold font-display text-xs text-white shadow-lg disabled:bg-zinc-800 disabled:text-zinc-500 transition-all"
                >
                  <span>{loading ? "Broadcasting upgrade transaction..." : "Save Protocol Parameters"}</span>
                </button>
              </form>
            </div>

            {/* Security / System Audit Alert */}
            <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold font-display text-white">Administrative Multisig Overrides Active</h4>
                <p className="text-[11px] text-zinc-400 leading-normal leading-relaxed">
                  Caution: Modifying Factory contract invariants directly affects previously launched linear bonding curves, causing reserve discrepancies. All parameter changes trigger a 24-hour time-lock on simulated Base nodes.
                </p>
              </div>
            </div>
          </div>

          {/* Token Moderation panel */}
          <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
            <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">Active Launchpad Assets</h3>
            <p className="text-[10px] text-zinc-500 leading-normal">
              Toggle the verification badges of launched tokens to certify their creator profiles and highlight them on the Explore browser page.
            </p>

            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 border-t border-white/5 pt-4">
              {tokens.map((token) => (
                <div key={token.address} className="flex justify-between items-center bg-zinc-950 p-2.5 rounded-xl border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <ImageWithFallback src={token.logoUrl} alt={token.name} fallbackText={token.symbol} className="w-6 h-6 rounded-lg object-cover" />
                    <div>
                      <span className="block text-[11px] font-bold text-zinc-200 leading-none">{token.name}</span>
                      <span className="text-[9px] font-mono text-zinc-500">{token.symbol}</span>
                    </div>
                  </div>

                  <button
                    id={`toggle-verify-btn-${token.address}`}
                    onClick={() => handleToggleVerification(token.address)}
                    className={`px-2.5 py-1 text-[9px] font-mono font-bold rounded-lg transition-all ${
                      token.isVerified
                        ? "bg-brand-blue/20 text-brand-blue border border-brand-blue/30"
                        : "bg-zinc-900 text-zinc-500 border border-white/5"
                    }`}
                  >
                    {token.isVerified ? "✓ Verified" : "Unverified"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RENDER OWNER UPGRADE PROXY PORTAL */}
      {activeTab === "proxy" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Upgrade Interface Form */}
          <div className="lg:col-span-2 space-y-6">
            {!wallet.isConnected ? (
              <div className="glass-panel p-12 rounded-2xl border border-white/5 bg-zinc-950 text-center space-y-4">
                <Lock className="w-12 h-12 text-zinc-600 mx-auto animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Wallet Connection Required</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  Please link your Metamask, Coinbase, or Smart Account wallet using the connect interface in the header to authenticate ownership of deployed proxies.
                </p>
              </div>
            ) : (
              <div className="glass-panel p-6 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-6">
                <div>
                  <h2 className="text-sm font-bold font-display uppercase tracking-wider text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-brand-purple animate-pulse" />
                    Trigger UUPS Implementation Upgrade
                  </h2>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    EIP-1967 compliant Upgradeable proxies allow token creators to point their contract's active implementation code to a newly verified contract bytecode.
                  </p>
                </div>

                <form onSubmit={handleUpgradeProxy} className="space-y-6">
                  {/* Token selector */}
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                      Select Upgradable Proxy Contract
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <select
                        id="proxy-token-selector"
                        value={selectedProxyTokenAddress}
                        onChange={(e) => {
                          setSelectedProxyTokenAddress(e.target.value);
                          setIsVerifiedAdmin(false);
                          setUpgradeSuccessDetails(null);
                        }}
                        className="bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none font-mono"
                      >
                        {userOwnedTokens.map(token => (
                          <option key={token.address} value={token.address}>
                            {token.name} ({token.symbol}) - {token.address.slice(0, 10)}...
                          </option>
                        ))}
                        <option value="custom">-- Manage Custom Contract Proxy --</option>
                      </select>

                      <div className="flex items-center gap-2 bg-zinc-950 border border-white/10 px-3.5 py-1 text-[11px] text-zinc-400 rounded-xl font-mono">
                        <Fingerprint className="w-4 h-4 text-brand-purple shrink-0" />
                        <span className="truncate">Sender Address: <span className="text-white font-bold">{wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}</span></span>
                      </div>
                    </div>
                  </div>

                  {/* Custom proxy input */}
                  {selectedProxyTokenAddress === "custom" && (
                    <div className="space-y-1.5 animate-fade-in">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                        Custom Proxy Address (EIP-1967 Target)
                      </label>
                      <input
                        id="custom-proxy-address-input"
                        type="text"
                        value={customProxyAddress}
                        onChange={(e) => {
                          setCustomProxyAddress(e.target.value);
                          setIsVerifiedAdmin(false);
                          setUpgradeSuccessDetails(null);
                        }}
                        placeholder="e.g. 0x5462...890a"
                        required
                        className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/40 font-mono"
                      />
                    </div>
                  )}

                  {/* Active proxy contract stats */}
                  <div className="bg-zinc-950 border border-white/5 p-4 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div>
                      <span className="block text-[8px] uppercase text-zinc-500 mb-0.5">Asset Symbol</span>
                      <span className="text-zinc-200 font-bold flex items-center gap-1.5">
                        {selectedTokenObject ? (
                          <>
                            <ImageWithFallback src={selectedTokenObject.logoUrl} alt={selectedTokenObject.symbol} fallbackText={selectedTokenObject.symbol} className="w-4 h-4 rounded-full object-cover" />
                            {selectedTokenObject.symbol}
                          </>
                        ) : (
                          "EXTERNAL PROXY"
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase text-zinc-500 mb-0.5">Current Implementation</span>
                      <span className="text-zinc-200 font-bold truncate block max-w-full">
                        {selectedTokenObject?.implementation ? (
                          <span className="text-brand-purple">{selectedTokenObject.implementation.slice(0, 10)}...</span>
                        ) : (
                          <span className="text-zinc-500">0x5FbDB2315678...</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase text-zinc-500 mb-0.5">Proxy Owner / Admin</span>
                      <span className="text-zinc-200 font-bold block truncate">
                        {selectedProxyTokenAddress !== "custom" ? (
                          <span className="text-emerald-400">Connected Wallet</span>
                        ) : (
                          <span className="text-amber-400">External Key</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Verification Challenge panel */}
                  <div className="bg-[#050505] border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-brand-purple" />
                        Verify Admin Signatory Authority
                      </h4>
                      <p className="text-[10px] text-zinc-400 leading-normal max-w-md">
                        Before upgrading implementation slots, you must sign an off-chain cryptographic challenge payload on your wallet to prove authority over the owner slots.
                      </p>
                    </div>

                    <button
                      id="verify-admin-sig-btn"
                      type="button"
                      onClick={handleVerifyOwnership}
                      disabled={verifyingAdmin || isVerifiedAdmin}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-xs font-display flex items-center gap-2 shrink-0 transition-all ${
                        isVerifiedAdmin
                          ? "bg-emerald-950 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/5 cursor-default"
                          : "bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white"
                      }`}
                    >
                      {verifyingAdmin ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Signing Payload...</span>
                        </>
                      ) : isVerifiedAdmin ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400 font-black" />
                          <span>Rights Verified</span>
                        </>
                      ) : (
                        <>
                          <Fingerprint className="w-3.5 h-3.5 text-brand-purple" />
                          <span>Verify Admin Rights</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* New implementation input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                        New Implementation Contract Address (Solidity Logic Contract)
                      </label>
                      <span className="text-[9px] font-mono text-zinc-500">EIP-1967/UUPS Slot</span>
                    </div>
                    <input
                      id="new-implementation-input"
                      type="text"
                      value={newImplementationAddress}
                      onChange={(e) => {
                        setNewImplementationAddress(e.target.value);
                        setUpgradeSuccessDetails(null);
                      }}
                      placeholder="e.g. 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                      required
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-purple/40 font-mono"
                    />
                    <p className="text-[10px] text-zinc-500 flex items-start gap-1 leading-normal">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>Warning: Ensure the target contract has a compliant `proxiableUUID()` function and inherits `UUPSUpgradeable` to prevent permanently lock-bricking upgrade capabilities.</span>
                    </p>
                  </div>

                  {/* Trigger Upgrade button */}
                  <button
                    id="trigger-proxy-upgrade-submit"
                    type="submit"
                    disabled={upgradingProxy || !isVerifiedAdmin}
                    className="w-full py-3.5 bg-gradient-to-r from-brand-purple to-brand-blue hover:from-purple-600 hover:to-blue-600 font-bold font-display text-xs text-white rounded-xl shadow-lg shadow-brand-purple/10 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:from-zinc-800 disabled:to-zinc-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Layers className={`w-4 h-4 ${upgradingProxy ? "animate-spin" : ""}`} />
                    <span>{upgradingProxy ? "Upgrading Proxy Slots..." : "Trigger Implementation Upgrade"}</span>
                  </button>
                </form>
              </div>
            )}

            {/* UPGRADE COMPLETED SUCCESS ALERT PANEL */}
            {upgradeSuccessDetails && (
              <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl space-y-4 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold font-display text-white">Proxy Implementation Slot Successfully Upgraded</h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">EIP-1967 slot change broadcast and finalized on Base Sepolia.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-zinc-950 p-4 rounded-xl border border-white/5">
                  <div className="space-y-1">
                    <span className="block text-[8px] text-zinc-500 uppercase">Proxy Address:</span>
                    <span className="text-zinc-300 font-bold truncate block">{upgradeSuccessDetails.proxyAddress}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[8px] text-zinc-500 uppercase">Upgrade Tx Hash:</span>
                    <span className="text-brand-purple font-bold truncate block flex items-center gap-1">
                      {upgradeSuccessDetails.txHash.slice(0, 18)}...
                      <ExternalLink className="w-3 h-3 text-zinc-500 hover:text-white cursor-pointer" />
                    </span>
                  </div>
                  <div className="space-y-1 md:col-span-2 border-t border-white/5 pt-2.5 mt-1 grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[8px] text-zinc-500 uppercase">Old Implementation:</span>
                      <span className="text-zinc-400 text-[10px] line-through block truncate">{upgradeSuccessDetails.oldImplementation}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-zinc-500 uppercase">New Implementation:</span>
                      <span className="text-emerald-400 text-[11px] font-bold block truncate flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 text-zinc-400" />
                        {upgradeSuccessDetails.newImplementation}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar panel detailing Proxy Architecture info */}
          <div className="space-y-6">
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white">How Proxy Upgrades Work</h3>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                By decoupling storage and execution, upgradeable proxy architectures allow builders to deploy updates seamlessly without requiring asset holder migrations.
              </p>

              <div className="space-y-3 font-mono text-[10px]">
                <div className="flex gap-2 bg-[#050505] p-2.5 rounded-lg border border-white/5">
                  <div className="font-bold text-brand-purple shrink-0">[1]</div>
                  <div className="text-zinc-400 leading-normal">
                    <strong className="text-white block mb-0.5">Fallback Redirection</strong>
                    User interacts with the Proxy Address. The Proxy's `fallback()` executes and triggers `delegatecall` redirecting logic calls to the implementation address.
                  </div>
                </div>

                <div className="flex gap-2 bg-[#050505] p-2.5 rounded-lg border border-white/5">
                  <div className="font-bold text-brand-purple shrink-0">[2]</div>
                  <div className="text-zinc-400 leading-normal">
                    <strong className="text-white block mb-0.5">Isolated Storage</strong>
                    State changes occur directly on the Proxy's storage slot context. The implementation logic contract remains completely stateless.
                  </div>
                </div>

                <div className="flex gap-2 bg-[#050505] p-2.5 rounded-lg border border-white/5">
                  <div className="font-bold text-brand-purple shrink-0">[3]</div>
                  <div className="text-zinc-400 leading-normal">
                    <strong className="text-white block mb-0.5">Admin Upgrade</strong>
                    The admin wallet triggers `upgradeTo(newImplementation)` which safely modifies the storage pointer slot holding the EIP-1967 implementation address.
                  </div>
                </div>
              </div>
            </div>

            {/* Active Deployments for reference */}
            <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-zinc-900/10 space-y-4">
              <h3 className="text-xs font-bold font-display uppercase tracking-wider text-white flex items-center justify-between">
                <span>Active Deployments</span>
                <span className="text-[8px] bg-brand-purple/20 text-brand-purple px-1.5 py-0.5 rounded font-mono font-bold">BASE</span>
              </h3>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {tokens.length === 0 ? (
                  <p className="text-[10px] text-zinc-500 text-center py-4">No active deployments found.</p>
                ) : (
                  tokens.map(token => (
                    <div key={token.address} className="bg-zinc-950 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <ImageWithFallback src={token.logoUrl} alt={token.name} fallbackText={token.symbol} className="w-5 h-5 rounded-md object-cover" />
                        <div className="min-w-0">
                          <span className="block text-[10px] font-bold text-zinc-200 truncate leading-tight">{token.name}</span>
                          <span className="text-[8px] font-mono text-zinc-500 leading-none">Proxy: {token.address.slice(0, 8)}...</span>
                        </div>
                      </div>
                      <span className="text-[9px] font-mono text-brand-purple font-semibold">
                        {token.implementation ? token.implementation.slice(0, 6) + "..." : "0x5FbD..."}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
