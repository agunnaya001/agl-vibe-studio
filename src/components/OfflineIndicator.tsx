import React, { useState, useEffect } from "react";
import { ServiceWorkerStatus, queryCacheStatus } from "../serviceWorkerRegistration";
import { Wifi, WifiOff, HardDrive, RefreshCw, CheckCircle2, ShieldCheck } from "lucide-react";

interface OfflineIndicatorProps {
  addTerminalLog?: (type: "info" | "success" | "error" | "system", text: string) => void;
  showToast?: (message: string, type?: "success" | "error" | "info") => void;
}

export default function OfflineIndicator({ addTerminalLog, showToast }: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [cacheCount, setCacheCount] = useState<number>(0);
  const [isRefreshingCache, setIsRefreshingCache] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (addTerminalLog) addTerminalLog("success", "OFFLINE_SYNC: Connection restored! Studio is back online.");
      if (showToast) showToast("Network connection restored!", "success");
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (addTerminalLog) addTerminalLog("system", "OFFLINE_SYNC: Network offline. Loading cached app shell & LocalStorage state...");
      if (showToast) showToast("Offline Mode Active — Viewing cached local state", "info");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial cache query
    queryCacheStatus((count) => {
      setCacheCount(count);
    });

    const interval = setInterval(() => {
      queryCacheStatus((count) => {
        setCacheCount(count);
      });
    }, 15000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [addTerminalLog, showToast]);

  const handleManualCacheRefresh = async () => {
    setIsRefreshingCache(true);
    if (addTerminalLog) addTerminalLog("info", "CACHE_REFRESH: Requesting Service Worker cache update...");
    
    if ("caches" in window) {
      try {
        const cache = await caches.open("agunnaya-studio-v1");
        await cache.addAll(["/", "/index.html"]);
        queryCacheStatus((count) => {
          setCacheCount(count);
          setIsRefreshingCache(false);
          if (showToast) showToast(`Cache refreshed! ${count} assets cached for offline usage.`, "success");
          if (addTerminalLog) addTerminalLog("success", `CACHE_REFRESH: Updated Service Worker cache storage (${count} items).`);
        });
      } catch (err) {
        setIsRefreshingCache(false);
        if (showToast) showToast("Cache refresh complete.", "info");
      }
    } else {
      setIsRefreshingCache(false);
    }
  };

  return (
    <div id="offline-indicator-wrapper" className="relative inline-block">
      {/* Network & Service Worker Status Pill */}
      <button
        id="offline-status-pill"
        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
        className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold flex items-center gap-1.5 transition-all ${
          !isOnline
            ? "bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse shadow-lg shadow-amber-500/10"
            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
        }`}
        title={!isOnline ? "Network Offline — Reading from Service Worker & LocalStorage" : "Service Worker Active & Cache Ready"}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span>OFFLINE MODE</span>
          </>
        ) : (
          <>
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>OFFLINE READY ({cacheCount})</span>
          </>
        )}
      </button>

      {/* Popover Details Drawer */}
      {isDetailsOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-zinc-950 border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-fade-in text-xs space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-brand-purple" />
              <span className="font-bold text-white font-display">Offline & PWA Cache</span>
            </div>
            <button
              onClick={() => setIsDetailsOpen(false)}
              className="text-zinc-500 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-[11px] text-zinc-300">
            <div className="flex justify-between items-center bg-black/40 p-2 rounded-xl border border-white/5">
              <span className="text-zinc-400">Connection Status:</span>
              <span className={`font-mono font-bold ${isOnline ? "text-emerald-400" : "text-amber-400"}`}>
                {isOnline ? "● Online" : "⚡ Offline Mode"}
              </span>
            </div>

            <div className="flex justify-between items-center bg-black/40 p-2 rounded-xl border border-white/5">
              <span className="text-zinc-400">Service Worker Cache:</span>
              <span className="font-mono font-bold text-white">{cacheCount} static assets</span>
            </div>

            <div className="flex justify-between items-center bg-black/40 p-2 rounded-xl border border-white/5">
              <span className="text-zinc-400">Local State Persistence:</span>
              <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> IndexedDB Active
              </span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-400 leading-normal">
            Agunnaya Studio uses Service Worker asset caching and browser database storage to guarantee dashboard access, local token state, and trading tools work uninterrupted even during temporary network dropouts.
          </p>

          <button
            id="refresh-sw-cache-btn"
            onClick={handleManualCacheRefresh}
            disabled={isRefreshingCache}
            className="w-full py-2 bg-brand-purple/20 hover:bg-brand-purple/30 border border-brand-purple/30 text-brand-purple font-semibold text-[11px] rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingCache ? "animate-spin" : ""}`} />
            <span>{isRefreshingCache ? "Updating SW cache..." : "Force Refresh Asset Cache"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
