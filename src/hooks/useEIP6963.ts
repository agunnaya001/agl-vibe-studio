import { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { EIP6963ProviderDetail, EIP6963AnnounceProviderEvent } from "../types/eip6963";

/**
 * Global store for EIP-6963 discovered providers
 * Ensures synchronous multi-provider registry across all components without duplicate listeners
 */
class EIP6963Store {
  private providers: EIP6963ProviderDetail[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;

  public init() {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;

    const handleAnnounce = (event: EIP6963AnnounceProviderEvent) => {
      if (!event.detail || !event.detail.info || !event.detail.provider) return;
      
      const { uuid, rdns } = event.detail.info;
      const exists = this.providers.some(
        p => p.info.uuid === uuid || (rdns && p.info.rdns === rdns)
      );

      if (!exists) {
        this.providers = [...this.providers, event.detail];
        this.notify();
      }
    };

    window.addEventListener("eip6963:announceProvider", handleAnnounce as EventListener);
    
    // Request all installed wallet extensions to announce themselves
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  }

  public getSnapshot = (): EIP6963ProviderDetail[] => {
    return this.providers;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    // Trigger initialization on first subscription
    this.init();
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  public getProviderByRdns(rdns: string): EIP6963ProviderDetail | undefined {
    return this.providers.find(p => p.info.rdns === rdns);
  }

  public getProviderByUuid(uuid: string): EIP6963ProviderDetail | undefined {
    return this.providers.find(p => p.info.uuid === uuid);
  }
}

export const eip6963Store = new EIP6963Store();

/**
 * React hook to access EIP-6963 discovered wallet providers
 */
export function useEIP6963() {
  const providers = useSyncExternalStore(
    eip6963Store.subscribe,
    eip6963Store.getSnapshot,
    () => []
  );

  const [hasInjectedFallback, setHasInjectedFallback] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      setHasInjectedFallback(true);
    }
  }, []);

  const rescan = useCallback(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("eip6963:requestProvider"));
    }
  }, []);

  return {
    providers,
    hasProviders: providers.length > 0,
    hasInjectedFallback,
    rescan,
  };
}
