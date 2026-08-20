import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface ThemeToggleProps {
  id?: string;
  variant?: "header" | "sidebar" | "compact" | "landing";
  className?: string;
}

export default function ThemeToggle({
  id = "theme-toggle-switch",
  variant = "header",
  className = ""
}: ThemeToggleProps) {
  const { theme, isLight, toggleTheme } = useTheme();

  if (variant === "sidebar") {
    return (
      <div 
        id={id}
        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
          isLight 
            ? "bg-slate-100/90 border-slate-300 text-slate-900 shadow-sm" 
            : "bg-zinc-900/90 border-white/10 text-white"
        } ${className}`}
      >
        <div className="flex items-center gap-2">
          {isLight ? (
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Moon className="w-4 h-4 text-purple-400 shrink-0" />
          )}
          <div className="flex flex-col text-left">
            <span className="text-[11px] font-bold font-sans tracking-tight">
              {isLight ? "Light Mode" : "Dark Mode"}
            </span>
            <span className={`text-[9px] font-mono ${isLight ? "text-slate-500" : "text-zinc-500"}`}>
              {isLight ? "High Contrast Active" : "Neon Cyber Dark"}
            </span>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isLight}
          aria-label="Toggle theme mode"
          onClick={toggleTheme}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-purple ${
            isLight ? "bg-amber-500" : "bg-zinc-700"
          }`}
        >
          <span className="sr-only">Toggle high-contrast light theme</span>
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
              isLight ? "translate-x-5" : "translate-x-0"
            }`}
          >
            {isLight ? (
              <Sun className="w-3 h-3 text-amber-500" />
            ) : (
              <Moon className="w-3 h-3 text-zinc-800" />
            )}
          </span>
        </button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <button
        id={id}
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
        title={`Switch to ${isLight ? "Dark Mode" : "High-Contrast Light Theme"}`}
        className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 flex items-center justify-center ${
          isLight
            ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 shadow-sm"
            : "bg-zinc-900 hover:bg-zinc-800 border-white/10 text-zinc-300 hover:text-white"
        } ${className}`}
      >
        {isLight ? (
          <Moon className="w-4 h-4 text-purple-600 transition-transform hover:rotate-12" />
        ) : (
          <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
        )}
      </button>
    );
  }

  if (variant === "landing") {
    return (
      <button
        id={id}
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
        title={`Switch to ${isLight ? "Dark Mode" : "High-Contrast Light Theme"}`}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold font-display transition-all cursor-pointer active:scale-95 ${
          isLight
            ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800 shadow-sm"
            : "bg-zinc-900/80 hover:bg-zinc-800 border-white/10 text-zinc-200 hover:text-white"
        } ${className}`}
      >
        {isLight ? (
          <>
            <Moon className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">Dark Mode</span>
          </>
        ) : (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Light Theme</span>
          </>
        )}
      </button>
    );
  }

  // Default "header" style
  return (
    <div
      id={id}
      className={`flex items-center gap-1.5 p-1 rounded-xl border transition-all ${
        isLight
          ? "bg-slate-100 border-slate-300 shadow-sm"
          : "bg-black/50 border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.02)]"
      } ${className}`}
    >
      <button
        type="button"
        id={`${id}-btn-dark`}
        onClick={() => !isLight || toggleTheme()}
        title="Dark Theme"
        aria-label="Switch to Dark Mode"
        className={`p-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
          !isLight
            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
            : "text-slate-400 hover:text-slate-700"
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
        <span className="text-[10px] hidden xl:inline font-bold">Dark</span>
      </button>

      <button
        type="button"
        id={`${id}-btn-light`}
        onClick={() => isLight || toggleTheme()}
        title="High-Contrast Light Theme"
        aria-label="Switch to High-Contrast Light Theme"
        className={`p-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1 cursor-pointer ${
          isLight
            ? "bg-amber-500 text-white font-bold shadow-sm"
            : "text-zinc-500 hover:text-zinc-300"
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
        <span className="text-[10px] hidden xl:inline font-bold">Light</span>
      </button>
    </div>
  );
}
