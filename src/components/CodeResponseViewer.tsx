import React, { useState, useMemo } from "react";
import { 
  Code, 
  Copy, 
  Check, 
  Download, 
  Eye, 
  Layers, 
  Sparkles, 
  WrapText, 
  FileCode, 
  Terminal, 
  Cpu, 
  Maximize2, 
  Minimize2,
  CheckCircle2,
  Palette
} from "lucide-react";

export type CodeTheme = "vscode" | "monokai" | "cyberpunk" | "onedark";

interface CodeResponseViewerProps {
  content: string;
  isExpanded?: boolean;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
  agentName?: string;
}

export interface CodeChunk {
  id: string;
  type: "text" | "code";
  language?: string;
  code?: string;
  text?: string;
  lineCount?: number;
  byteCount?: number;
}

// Map language aliases to display names and file extensions
export const LANGUAGE_META: Record<string, { label: string; ext: string; color: string; bg: string }> = {
  solidity: { label: "Solidity", ext: "sol", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
  sol: { label: "Solidity", ext: "sol", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
  typescript: { label: "TypeScript", ext: "ts", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  ts: { label: "TypeScript", ext: "ts", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  tsx: { label: "React TSX", ext: "tsx", color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/30" },
  javascript: { label: "JavaScript", ext: "js", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  js: { label: "JavaScript", ext: "js", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  jsx: { label: "React JSX", ext: "jsx", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
  json: { label: "JSON", ext: "json", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  python: { label: "Python", ext: "py", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  py: { label: "Python", ext: "py", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/30" },
  bash: { label: "Bash / Shell", ext: "sh", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  sh: { label: "Shell", ext: "sh", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30" },
  html: { label: "HTML", ext: "html", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  css: { label: "CSS", ext: "css", color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/30" },
  sql: { label: "SQL", ext: "sql", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30" },
  rust: { label: "Rust", ext: "rs", color: "text-amber-500", bg: "bg-amber-600/10 border-amber-600/30" },
  cpp: { label: "C++", ext: "cpp", color: "text-blue-500", bg: "bg-blue-600/10 border-blue-600/30" },
  markdown: { label: "Markdown", ext: "md", color: "text-zinc-300", bg: "bg-zinc-700/20 border-zinc-600/30" },
  md: { label: "Markdown", ext: "md", color: "text-zinc-300", bg: "bg-zinc-700/20 border-zinc-600/30" }
};

// Parse raw text into structured text and code block chunks
export function parseContentChunks(text: string): CodeChunk[] {
  if (!text) return [];

  const chunks: CodeChunk[] = [];
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;
  let chunkCount = 0;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const textBefore = text.slice(lastIndex, match.index);
    if (textBefore.trim()) {
      chunks.push({
        id: `chunk-text-${chunkCount++}`,
        type: "text",
        text: textBefore
      });
    }

    const rawLang = (match[1] || "text").toLowerCase().trim();
    const codeContent = match[2];
    const lines = codeContent.split("\n");

    chunks.push({
      id: `chunk-code-${chunkCount++}`,
      type: "code",
      language: rawLang || "typescript",
      code: codeContent,
      lineCount: lines.length,
      byteCount: new Blob([codeContent]).size
    });

    lastIndex = match.index + match[0].length;
  }

  const remainingText = text.slice(lastIndex);
  if (remainingText.trim()) {
    chunks.push({
      id: `chunk-text-${chunkCount++}`,
      type: "text",
      text: remainingText
    });
  }

  return chunks;
}

// Tokenize a single line of code for syntax highlighting
function renderSyntaxHighlightedLine(line: string, language: string, theme: CodeTheme): React.ReactNode {
  if (!line.trim()) return <span className="inline-block min-h-[1.25rem]">&nbsp;</span>;

  // Theme color definitions
  const isMonokai = theme === "monokai";
  const isCyberpunk = theme === "cyberpunk";
  const isOneDark = theme === "onedark";

  // Color classes by token type according to theme
  const colors = {
    keyword: isCyberpunk ? "text-pink-400 font-bold" : isMonokai ? "text-rose-400 font-bold" : isOneDark ? "text-purple-400 font-bold" : "text-blue-400 font-bold",
    type: isCyberpunk ? "text-cyan-300 font-semibold" : isMonokai ? "text-cyan-400" : isOneDark ? "text-amber-300" : "text-emerald-400",
    string: isCyberpunk ? "text-yellow-300" : isMonokai ? "text-yellow-200" : isOneDark ? "text-emerald-300" : "text-amber-300",
    comment: isCyberpunk ? "text-purple-400/80 italic" : isMonokai ? "text-zinc-500 italic" : isOneDark ? "text-zinc-500 italic" : "text-emerald-600/90 italic",
    number: isCyberpunk ? "text-orange-400 font-mono" : isMonokai ? "text-purple-300" : isOneDark ? "text-orange-300" : "text-teal-300",
    function: isCyberpunk ? "text-violet-300 font-bold" : isMonokai ? "text-lime-300" : isOneDark ? "text-sky-300" : "text-yellow-200",
    operator: isCyberpunk ? "text-pink-300" : isMonokai ? "text-rose-300" : isOneDark ? "text-cyan-400" : "text-zinc-400",
    punctuation: "text-zinc-400",
    variable: "text-zinc-100"
  };

  // Check for comments
  if (line.trim().startsWith("//") || line.trim().startsWith("#") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
    return <span className={colors.comment}>{line}</span>;
  }

  // Tokenize line using regex matcher
  const tokenRegex = /(\/\/[^\n]*|#[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:contract|function|pragma|solidity|import|export|from|const|let|var|return|if|else|async|await|struct|mapping|event|public|private|external|internal|pure|view|payable|class|interface|type|extends|implements|require|assert|revert|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|def|raise|try|except|with|for|while|new|default|switch|case)\b|\b(?:address|uint256|uint|int256|bool|bytes32|string|number|boolean|any|void|true|false|null|undefined)\b|\b0x[a-fA-F0-9]+\b|\b\d+(?:\.\d+)?\b|\b[a-zA-Z_$][a-zA-Z0-9_$]*(?=\s*\()|[=\+\-\*\/%&\|\!\?:\>\<\;\,]+)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${lastIndex}`} className={colors.variable}>
          {line.slice(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];
    let tokenClass = colors.variable;

    if (token.startsWith("//") || token.startsWith("#")) {
      tokenClass = colors.comment;
    } else if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
      tokenClass = colors.string;
    } else if (/^(contract|function|pragma|solidity|import|export|from|const|let|var|return|if|else|async|await|struct|mapping|event|public|private|external|internal|pure|view|payable|class|interface|type|extends|implements|require|assert|revert|SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|def|raise|try|except|with|for|while|new|default|switch|case)$/.test(token)) {
      tokenClass = colors.keyword;
    } else if (/^(address|uint256|uint|int256|bool|bytes32|string|number|boolean|any|void|true|false|null|undefined)$/.test(token)) {
      tokenClass = colors.type;
    } else if (/^(0x[a-fA-F0-9]+|\d+(\.\d+)?)$/.test(token)) {
      tokenClass = colors.number;
    } else if (/^[=\+\-\*\/%&\|\!\?:\>\<\;\,]+$/.test(token)) {
      tokenClass = colors.operator;
    } else {
      tokenClass = colors.function;
    }

    parts.push(
      <span key={`token-${match.index}`} className={tokenClass}>
        {token}
      </span>
    );

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(
      <span key={`text-end`} className={colors.variable}>
        {line.slice(lastIndex)}
      </span>
    );
  }

  return <>{parts}</>;
}

interface SyntaxHighlightedCodeBlockProps {
  key?: React.Key;
  code: string;
  language?: string;
  lineCount?: number;
  byteCount?: number;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

// Single Code Block Syntax Highlighting Viewer Component
export function SyntaxHighlightedCodeBlock({
  code,
  language = "typescript",
  lineCount,
  byteCount,
  showToast
}: SyntaxHighlightedCodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [wrapLines, setWrapLines] = useState(false);
  const [theme, setTheme] = useState<CodeTheme>("vscode");

  const normalizedLang = language.toLowerCase().trim();
  const meta = LANGUAGE_META[normalizedLang] || {
    label: normalizedLang.toUpperCase() || "CODE",
    ext: "txt",
    color: "text-brand-purple",
    bg: "bg-purple-500/10 border-purple-500/30"
  };

  const lines = useMemo(() => code.split("\n"), [code]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    if (showToast) showToast(`Copied ${meta.label} code snippet!`, "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent_code_${Date.now()}.${meta.ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (showToast) showToast(`Downloaded ${meta.label} file (.${meta.ext})!`, "info");
  };

  // Background style per theme
  const themeBgClass = 
    theme === "monokai" ? "bg-[#272822] text-[#f8f8f2]" :
    theme === "cyberpunk" ? "bg-[#0d0221] text-[#e0aaff]" :
    theme === "onedark" ? "bg-[#282c34] text-[#abb2bf]" :
    "bg-[#1e1e1e] text-[#d4d4d4]"; // vscode

  const themeHeaderBg =
    theme === "monokai" ? "bg-[#1e1f1c]" :
    theme === "cyberpunk" ? "bg-[#190638]" :
    theme === "onedark" ? "bg-[#21252b]" :
    "bg-[#252526]";

  return (
    <div className={`rounded-xl border border-white/10 overflow-hidden shadow-2xl font-mono text-xs my-3 transition-all ${themeBgClass}`}>
      
      {/* Code Header Bar */}
      <div className={`px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-white/10 ${themeHeaderBg}`}>
        
        {/* Language Badge & Stats */}
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1.5 ${meta.bg} ${meta.color}`}>
            <FileCode className="w-3 h-3" />
            <span>{meta.label}</span>
          </span>

          <span className="text-[10px] text-zinc-500 font-mono">
            {lines.length} lines • {byteCount ? `${(byteCount / 1024).toFixed(1)} KB` : `${code.length} chars`}
          </span>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center gap-1.5">
          
          {/* Theme Selector */}
          <div className="relative flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/5">
            <Palette className="w-3 h-3 text-zinc-400" />
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as CodeTheme)}
              className="bg-transparent text-[10px] font-mono text-zinc-300 focus:outline-none cursor-pointer"
              title="Select Color Theme"
            >
              <option value="vscode" className="bg-zinc-900 text-white">VS Code Dark</option>
              <option value="monokai" className="bg-zinc-900 text-white">Monokai Dark</option>
              <option value="cyberpunk" className="bg-zinc-900 text-white">Cyberpunk Synth</option>
              <option value="onedark" className="bg-zinc-900 text-white">One Dark Pro</option>
            </select>
          </div>

          {/* Word Wrap Toggle */}
          <button
            type="button"
            onClick={() => setWrapLines(!wrapLines)}
            className={`p-1.5 rounded-lg border transition-all ${
              wrapLines 
                ? "bg-purple-500/20 text-purple-300 border-purple-500/40" 
                : "bg-black/40 text-zinc-400 hover:text-white border-white/5"
            }`}
            title="Toggle Line Wrap"
          >
            <WrapText className="w-3 h-3" />
          </button>

          {/* Download File */}
          <button
            type="button"
            onClick={handleDownloadFile}
            className="p-1.5 rounded-lg bg-black/40 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5 transition-all"
            title={`Download .${meta.ext} File`}
          >
            <Download className="w-3 h-3 text-brand-blue" />
          </button>

          {/* Copy Code */}
          <button
            type="button"
            onClick={handleCopyCode}
            className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all ${
              copied 
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" 
                : "bg-brand-purple/20 hover:bg-brand-purple text-purple-300 hover:text-white border-brand-purple/30"
            }`}
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied!" : "Copy Code"}</span>
          </button>
        </div>
      </div>

      {/* Code Display Gutter & Content */}
      <div className={`p-3 overflow-x-auto ${wrapLines ? "whitespace-pre-wrap break-all" : "whitespace-pre"}`}>
        <table className="w-full border-collapse font-mono text-[11px] leading-relaxed">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors group">
                <td className="w-10 select-none text-right pr-3 text-zinc-600 group-hover:text-zinc-400 text-[10px] font-mono border-r border-white/5 align-top">
                  {idx + 1}
                </td>
                <td className="pl-3 align-top font-mono">
                  {renderSyntaxHighlightedLine(line, normalizedLang, theme)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Render inline text segments with styled inline code backtick pills
function TextWithInlineCode({ text }: { text: string }) {
  if (!text) return null;

  const inlineCodeRegex = /`([^`]+)`/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }

    const codeSnippet = match[1];
    parts.push(
      <code 
        key={`inline-${match.index}`} 
        className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-950 border border-brand-purple/30 text-purple-300 font-mono text-[11px] font-semibold"
      >
        {codeSnippet}
      </code>
    );

    lastIdx = inlineCodeRegex.lastIndex;
  }

  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return <span className="whitespace-pre-wrap">{parts}</span>;
}

// Primary CodeResponseViewer Component
export default function CodeResponseViewer({
  content,
  isExpanded = true,
  showToast,
  agentName
}: CodeResponseViewerProps) {
  const chunks = useMemo(() => parseContentChunks(content), [content]);

  if (!content) return null;

  return (
    <div className="space-y-2 font-sans text-xs text-zinc-200 leading-relaxed">
      {chunks.map((chunk) => {
        if (chunk.type === "code" && chunk.code) {
          return (
            <SyntaxHighlightedCodeBlock
              key={chunk.id}
              code={chunk.code}
              language={chunk.language}
              lineCount={chunk.lineCount}
              byteCount={chunk.byteCount}
              showToast={showToast}
            />
          );
        }

        return (
          <div key={chunk.id} className="prose prose-invert max-w-none text-xs leading-relaxed py-1">
            <TextWithInlineCode text={chunk.text || ""} />
          </div>
        );
      })}
    </div>
  );
}
