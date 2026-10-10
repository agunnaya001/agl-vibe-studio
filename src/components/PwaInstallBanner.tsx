import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed in standalone mode
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === "accepted") {
      setIsInstalled(true);
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-zinc-950/95 backdrop-blur-xl border border-brand-purple/30 rounded-2xl p-4 shadow-2xl animate-fade-in text-white font-sans">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-purple/20 border border-brand-purple/40 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-brand-purple" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm font-display">Install Agunnaya Studio</h4>
            <button
              onClick={() => setShowBanner(false)}
              className="text-zinc-400 hover:text-white p-1"
              aria-label="Close install prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-zinc-300 mt-1">
            Save to your home screen for lightning-fast access, full offline capabilities, and persistent dashboard storage.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 px-3 bg-brand-purple hover:bg-brand-purple/90 text-white font-semibold text-xs rounded-xl transition-all shadow-lg shadow-brand-purple/25 flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Add to Home Screen</span>
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="py-2 px-3 bg-white/5 hover:bg-white/10 text-zinc-300 font-semibold text-xs rounded-xl transition-all"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
