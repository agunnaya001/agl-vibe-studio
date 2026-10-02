import React, { useState } from "react";
import { Copy, Check, ExternalLink, Code2, Sparkles, X, ShieldCheck } from "lucide-react";

interface BuiltWithAglBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName?: string;
  developerAddress?: string;
}

export default function BuiltWithAglBadgeModal({
  isOpen,
  onClose,
  appName = "Your Web3 dApp",
  developerAddress
}: BuiltWithAglBadgeModalProps) {
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [badgeTheme, setBadgeTheme] = useState<"dark" | "cyber" | "minimal">("cyber");

  if (!isOpen) return null;

  const studioUrl = "https://aglstudio.xyz";
  const devQuery = developerAddress ? `?builder=${developerAddress}` : "";
  const backlink = `${studioUrl}${devQuery}`;

  const htmlEmbedCode = `<a href="${backlink}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:8px;padding:6px 12px;background:#09090b;color:#ffffff;border:1px solid #8b5cf6;border-radius:10px;text-decoration:none;font-family:sans-serif;font-size:12px;font-weight:600;">
  <span style="display:inline-block;width:8px;height:8px;background:#0052ff;border-radius:50%;"></span>
  Built with AGL Studio · Base Mainnet
</a>`;

  const reactEmbedCode = `<a
  href="${backlink}"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-brand-purple/40 text-white text-xs font-mono font-medium hover:border-brand-purple transition-all"
>
  <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
  <span>Built with AGL Studio</span>
  <span className="text-zinc-500">·</span>
  <span className="text-emerald-400">Base Mainnet</span>
</a>`;

  const markdownEmbedCode = `[![Built with AGL Studio](https://img.shields.io/badge/Built%20with-AGL%20Studio-8b5cf6?logo=ethereum&logoColor=white)](${backlink})`;

  const handleCopy = (code: string, type: string) => {
    navigator.clipboard.writeText(code);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-950 border border-white/10 rounded-3xl max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-3 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-purple/20 text-brand-purple font-bold">
                ECOSYSTEM ATTRIBUTION
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-brand-blue font-bold">
                BASE MAINNET
              </span>
            </div>
            <h2 className="text-lg font-bold font-display text-white">
              "Built with AGL Studio" Badge System
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Embed verifiable attribution in your dApp to qualify for developer rewards and venture grant cohorts.
            </p>
          </div>

          <button onClick={onClose} className="p-1 rounded-xl text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Badge Preview */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-white/5 space-y-3 text-center">
          <span className="text-[10px] font-mono uppercase text-zinc-500 block">Live Preview</span>
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-950 border border-brand-purple/40 text-white text-xs font-mono font-medium shadow-lg shadow-brand-purple/10">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse"></span>
            <span>Built with AGL Studio</span>
            <span className="text-zinc-600">·</span>
            <span className="text-brand-purple font-semibold">Powered by Agunnaya Labs</span>
            <span className="text-zinc-600">·</span>
            <span className="text-emerald-400">Base Mainnet</span>
          </div>

          <p className="text-[11px] text-zinc-400 max-w-sm mx-auto pt-2">
            Clicking this badge links visitors to your verified developer profile on AGL Studio.
          </p>
        </div>

        {/* Embed Snippets */}
        <div className="space-y-4">
          {/* React Component Snippet */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
              <span>React / Tailwind Component</span>
              <button
                onClick={() => handleCopy(reactEmbedCode, "react")}
                className="text-brand-purple hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedType === "react" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === "react" ? "Copied" : "Copy JSX"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 border border-white/10 text-[11px] font-mono text-zinc-400 overflow-x-auto leading-relaxed">
              {reactEmbedCode}
            </pre>
          </div>

          {/* HTML Embed Snippet */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
              <span>Standard HTML / Web Component</span>
              <button
                onClick={() => handleCopy(htmlEmbedCode, "html")}
                className="text-brand-purple hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedType === "html" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === "html" ? "Copied" : "Copy HTML"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 border border-white/10 text-[11px] font-mono text-zinc-400 overflow-x-auto leading-relaxed">
              {htmlEmbedCode}
            </pre>
          </div>

          {/* Markdown Badge Snippet */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-300">
              <span>GitHub README Markdown</span>
              <button
                onClick={() => handleCopy(markdownEmbedCode, "markdown")}
                className="text-brand-purple hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copiedType === "markdown" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === "markdown" ? "Copied" : "Copy Markdown"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-zinc-950 border border-white/10 text-[11px] font-mono text-zinc-400 overflow-x-auto leading-relaxed">
              {markdownEmbedCode}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-white transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
