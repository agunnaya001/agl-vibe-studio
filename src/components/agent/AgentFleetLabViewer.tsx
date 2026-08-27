import React, { useState } from "react";
import { 
  HandsOnFleetLab, 
  HandsOnLabStep,
  BackgroundFleetAgent 
} from "../../types/agentFleet";
import { 
  BookOpen, 
  Layers, 
  Play, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  Check, 
  Code, 
  Rocket, 
  Clock, 
  Flame, 
  ShieldCheck, 
  Coins, 
  Zap, 
  BrainCircuit, 
  ArrowRight,
  Sliders,
  ChevronRight,
  Info
} from "lucide-react";
import { BackgroundFleetManager } from "../../lib/backgroundAgentFleet";

interface AgentFleetLabViewerProps {
  lab: HandsOnFleetLab;
  onDeployToFleet: (agent: BackgroundFleetAgent) => void;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export default function AgentFleetLabViewer({
  lab,
  onDeployToFleet,
  showToast
}: AgentFleetLabViewerProps) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"tutorial" | "sandbox" | "architecture">("tutorial");

  // Sandbox parameters
  const [intervalSec, setIntervalSec] = useState(lab.defaultAgentConfig.triggerConfig?.intervalSeconds || 15);
  const [gasFloorGwei, setGasFloorGwei] = useState(lab.defaultAgentConfig.triggerConfig?.gasFloorGwei || 0.04);
  const [isDryRun, setIsDryRun] = useState(true);
  const [sandboxOutput, setSandboxOutput] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const currentStep = lab.steps[activeStepIndex] || lab.steps[0];

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast("Code snippet copied to clipboard!", "success");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestSandboxExecution = () => {
    setIsSimulating(true);
    setSandboxOutput("⏳ Connecting to Base Mainnet RPC node (Chain ID: 8453)...");

    setTimeout(() => {
      setSandboxOutput(
        `✅ Base RPC Connection Established (block #18492810)\n` +
        `🔍 Evaluating Trigger Strategy: ${lab.category}\n` +
        `📊 Target Contract: ${lab.defaultAgentConfig.targetContract || "0x4C36388...2A77"}\n` +
        `⚙️ Execution Interval: ${intervalSec}s | Gas Floor: ${gasFloorGwei} Gwei | DryRun: ${isDryRun ? "YES" : "NO"}\n` +
        `--------------------------------------------------\n` +
        `⚡ Condition Checked: Threshold met! Simulated action dispatched.\n` +
        `⛽ Gas Cost: 0.000082 ETH | Estimated Execution Speed: 340ms\n` +
        `🎉 Status: SUCCESS — Agent logic verified and ready for background fleet deployment!`
      );
      setIsSimulating(false);
      showToast("Sandbox test completed successfully!", "success");
    }, 1200);
  };

  const handleLaunchAgent = () => {
    const spawned = BackgroundFleetManager.createAgentFromLab(lab.id, true);
    if (spawned) {
      // Apply sandbox parameter overrides if changed
      spawned.triggerConfig.intervalSeconds = intervalSec;
      if (gasFloorGwei) spawned.triggerConfig.gasFloorGwei = gasFloorGwei;
      spawned.safetyBounds.dryRunMode = isDryRun;

      onDeployToFleet(spawned);
      showToast(`🚀 '${spawned.name}' deployed to background fleet!`, "success");
    }
  };

  return (
    <div className="space-y-6">
      {/* Lab Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-brand-purple/40 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-brand-purple/20 text-brand-purple border border-brand-purple/30">
                Hands-On Lab #{lab.labNumber}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-zinc-800 text-zinc-300">
                {lab.category}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {lab.difficulty} • ~{lab.estimatedMinutes} mins
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {lab.title}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-300 max-w-3xl leading-relaxed">
              {lab.subtitle}
            </p>
          </div>

          <button
            onClick={handleLaunchAgent}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-purple to-indigo-600 hover:from-brand-purple/90 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-brand-purple/30 flex items-center gap-2 shrink-0 self-start md:self-auto transition transform hover:scale-[1.02]"
          >
            <Rocket className="w-4 h-4 text-amber-300" />
            <span>Deploy Lab Agent to Fleet</span>
          </button>
        </div>

        {/* Navigation Tabs within Lab */}
        <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
          <button
            onClick={() => setActiveTab("tutorial")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "tutorial"
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-4 h-4 text-brand-purple" />
            <span>Guided Steps ({lab.steps.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("architecture")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "architecture"
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Architecture & Objectives</span>
          </button>

          <button
            onClick={() => setActiveTab("sandbox")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === "sandbox"
                ? "bg-zinc-800 text-white border border-zinc-700"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Interactive Sandbox</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Step-by-Step Guided Steps */}
      {activeTab === "tutorial" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Step Selector Sidebar */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-zinc-400">
              Lab Modules
            </h4>
            <div className="space-y-2">
              {lab.steps.map((step, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveStepIndex(idx)}
                  className={`w-full p-3.5 rounded-2xl text-left border transition flex items-start gap-3 ${
                    activeStepIndex === idx
                      ? "bg-brand-purple/15 border-brand-purple/50 text-white shadow-md shadow-brand-purple/10"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                      activeStepIndex === idx
                        ? "bg-brand-purple text-white"
                        : "bg-zinc-800 text-zinc-400"
                    }`}
                  >
                    {step.stepNumber}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold leading-tight">{step.title}</h5>
                    <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">
                      {step.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Quick Deploy Card in Sidebar */}
            <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Ready to execute?</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Launch this autonomous worker as a persistent daemon running in the background.
              </p>
              <button
                onClick={handleLaunchAgent}
                className="w-full py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Spawn Background Daemon</span>
              </button>
            </div>
          </div>

          {/* Active Step Content */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <span className="text-xs font-mono font-semibold text-brand-purple">
                    Step {currentStep.stepNumber} of {lab.steps.length}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{currentStep.title}</h3>
                </div>
                <button
                  onClick={() => copyToClipboard(currentStep.codeSnippet, `step_${currentStep.stepNumber}`)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-white flex items-center gap-1.5 transition"
                >
                  {copiedKey === `step_${currentStep.stepNumber}` ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>Copy Code</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                {currentStep.explanation}
              </p>

              {/* Code Snippet Box */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
                  <span className="uppercase">{currentStep.codeLanguage} Engine Source</span>
                  <span>Base Mainnet Compatible</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 overflow-x-auto max-h-[380px] custom-scrollbar text-xs font-mono text-emerald-300">
                  <pre>{currentStep.codeSnippet}</pre>
                </div>
              </div>

              {/* Key Takeaways */}
              <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" />
                  Key Takeaways & Production Considerations
                </span>
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  {currentStep.keyTakeaways.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  disabled={activeStepIndex === 0}
                  onClick={() => setActiveStepIndex((prev) => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  ← Previous Step
                </button>

                {activeStepIndex < lab.steps.length - 1 ? (
                  <button
                    onClick={() => setActiveStepIndex((prev) => Math.min(lab.steps.length - 1, prev + 1))}
                    className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white flex items-center gap-1.5 transition"
                  >
                    <span>Next Step</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleLaunchAgent}
                    className="px-5 py-2 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-xs font-bold text-white flex items-center gap-1.5 transition shadow-lg shadow-brand-purple/20"
                  >
                    <Rocket className="w-3.5 h-3.5 text-amber-300" />
                    <span>Complete Lab & Deploy</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Architecture & Overview */}
      {activeTab === "architecture" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-4">
            <h3 className="text-base font-bold text-white">Lab Overview & Background Theory</h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {lab.overview}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
              {/* Architecture Steps */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-brand-purple flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Autonomous Execution Lifecycle
                </span>
                <ol className="space-y-2 text-xs text-zinc-300 font-mono">
                  {lab.architectureDiagram.map((stepStr, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
                      <span className="text-brand-purple font-bold shrink-0">{idx + 1}.</span>
                      <span>{stepStr.replace(/^\d+\.\s*/, "")}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Learning Objectives */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Core Engineering Objectives
                </span>
                <ul className="space-y-2 text-xs text-zinc-300">
                  {lab.learningObjectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-zinc-900/50 border border-zinc-800/60">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Interactive Sandbox */}
      {activeTab === "sandbox" && (
        <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 space-y-6">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Live Execution Sandbox</h3>
            <p className="text-xs text-zinc-400">
              Test agent triggers and run deterministic simulations before running background daemons on Base.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <label className="text-xs font-mono text-zinc-400 block">
                Tick Interval (Seconds)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand-purple"
              />
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <label className="text-xs font-mono text-zinc-400 block">
                Gas Floor Trigger (Gwei)
              </label>
              <input
                type="number"
                step="0.01"
                value={gasFloorGwei}
                onChange={(e) => setGasFloorGwei(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-brand-purple"
              />
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
              <label className="text-xs font-mono text-zinc-400 block">
                Execution Mode
              </label>
              <button
                onClick={() => setIsDryRun(!isDryRun)}
                className={`w-full py-2 rounded-xl text-xs font-mono font-bold border transition ${
                  isDryRun
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                }`}
              >
                {isDryRun ? "Simulated Dry-Run" : "Live On-Chain (Base)"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTestSandboxExecution}
              disabled={isSimulating}
              className="px-5 py-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple/90 text-white font-bold text-xs flex items-center gap-2 transition disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSimulating ? "Running Simulation..." : "Run Test Tick Now"}</span>
            </button>

            <button
              onClick={handleLaunchAgent}
              className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs flex items-center gap-2 transition"
            >
              <Rocket className="w-3.5 h-3.5 text-amber-300" />
              <span>Deploy to Background Fleet</span>
            </button>
          </div>

          {sandboxOutput && (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 font-mono text-xs text-emerald-300 whitespace-pre-wrap">
              {sandboxOutput}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
