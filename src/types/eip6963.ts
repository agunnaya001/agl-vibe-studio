/**
 * EIP-6963: Multi-Injected Provider Discovery Standard Types
 * https://eips.ethereum.org/EIPS/eip-6963
 */

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string; // Data URL or SVG string
  rdns: string; // e.g. "io.metamask", "io.rabby", "com.coinbase.wallet", "app.phantom"
}

export interface EIP1193Provider {
  isStatus?: boolean;
  host?: string;
  path?: string;
  sendAsync?: (request: { method: string; params?: Array<any> }, callback: (error: any, response: any) => void) => void;
  send?: (request: { method: string; params?: Array<any> }, callback?: (error: any, response: any) => void) => void;
  request: (request: { method: string; params?: Array<any> | Record<string, any> }) => Promise<any>;
  on?: (eventName: string, listener: (...args: any[]) => void) => void;
  removeListener?: (eventName: string, listener: (...args: any[]) => void) => void;
  selectedAddress?: string | null;
  chainId?: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: "eip6963:announceProvider";
  detail: EIP6963ProviderDetail;
}

declare global {
  interface WindowEventMap {
    "eip6963:announceProvider": EIP6963AnnounceProviderEvent;
  }
}
