import React from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Zap, 
  Lock, 
  FileCode 
} from "lucide-react";
import { SecurityReport, SecurityFinding, SeverityLevel } from "../../types/agentWorkflow";

interface AgentSecuritySummaryProps {
  report: SecurityReport | null;
}

const SEVERITY_STYLES: Record<SeverityLevel, { bg: string; text: string; border: string }> = {
  CRITICAL: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
  HIGH: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  MEDIUM: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  LOW: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  INFORMATIONAL: {
    bg: "bg-zinc-800/60",
    text: "text-zinc-400",
    border: "border-zinc-700/60",
  },
};

export default function AgentSecuritySummary({ report }: AgentSecuritySummaryProps) {
  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* Score Header Card */}
      <div className="p-6 rounded-3xl bg-zinc-900/60 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">AI Security Audit & CEI Verification</h3>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {report.isSafeForDeployment ? "Safe for Base L2" : "Review Required"}
            </span>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
            {report.summary}
          </p>
        </div>

        {/* Score Badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-center p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 min-w-[100px]">
            <span className="text-3xl font-mono font-extrabold text-emerald-400 block">
              {report.overallScore}/100
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              Security Score
            </span>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400">
            Audit Findings ({report.findings.length})
          </h4>
          <span className="text-xs text-zinc-400">Formal EVM static analyzer</span>
        </div>

        {report.findings.length === 0 ? (
          <div className="p-6 rounded-2xl bg-zinc-900/30 border border-zinc-800/60 text-center text-xs text-zinc-400">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
            No security vulnerabilities or CEI violations detected in generated contract.
          </div>
        ) : (
          <div className="space-y-3">
            {report.findings.map((finding) => {
              const style = SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.LOW;
              return (
                <div
                  key={finding.id}
                  className={`p-4 rounded-2xl border ${style.bg} ${style.border} space-y-2 text-xs`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md font-mono font-bold text-[10px] uppercase border ${style.text} ${style.border}`}>
                        {finding.severity}
                      </span>
                      <h5 className="font-bold text-white text-sm">{finding.title}</h5>
                      <span className="text-zinc-400 font-mono">({finding.location})</span>
                    </div>
                    {finding.cwe && (
                      <span className="text-[10px] font-mono text-zinc-400 px-2 py-0.5 rounded bg-zinc-900/80 border border-zinc-800">
                        {finding.cwe}
                      </span>
                    )}
                  </div>

                  <p className="text-zinc-300 leading-relaxed">{finding.explanation}</p>

                  {finding.recommendation && (
                    <div className="p-2.5 rounded-xl bg-black/40 border border-zinc-800 text-zinc-300">
                      <strong className="text-emerald-400 font-semibold mr-1">Recommendation:</strong>
                      {finding.recommendation}
                    </div>
                  )}

                  {finding.fixedCodeSnippet && (
                    <div className="p-3 rounded-xl bg-black/70 border border-zinc-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                      <pre>{finding.fixedCodeSnippet}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gas Optimizations */}
      {report.gasOptimizations && report.gasOptimizations.length > 0 && (
        <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800 space-y-2">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
            <Zap className="w-3.5 h-3.5" />
            Base L2 Gas Optimizations
          </div>
          <ul className="space-y-1 text-xs text-zinc-300 list-disc list-inside">
            {report.gasOptimizations.map((opt, i) => (
              <li key={i}>{opt}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Mandatory Advisory Disclaimer */}
      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-start gap-3 text-xs text-zinc-400">
        <Info className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-zinc-300 font-semibold mr-1">Advisory Security Notice:</strong>
          {report.disclaimer || "This is an advisory AI security layer and is not a substitute for a formal professional security audit."}
        </p>
      </div>
    </div>
  );
}
