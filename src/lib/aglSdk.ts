import { ethers } from "ethers";
import { 
  AGL_TOKEN_ADDRESS, 
  AGL_CREDITS_ADDRESS, 
  AGL_STAKING_ADDRESS, 
  TOKEN_FACTORY_ADDRESS, 
  AGL_TREASURY_ADDRESS,
  AGL_MULTISIG_SAFE_ADDRESS,
  AGL_TOKEN_ABI,
  TOKEN_FACTORY_ABI
} from "./aglContracts";
import { TreasuryFeeService } from "./treasuryFeeService";

export interface AgunnayaSdkConfig {
  network: "base-mainnet" | "base-sepolia";
  rpcUrl?: string;
  treasuryAddress?: string;
  autoSweepEnabled?: boolean;
}

export interface ViralShareConfig {
  title: string;
  text: string;
  url: string;
  referrerAddress?: string;
}

/**
 * Official Agunnaya Labs Web3 SDK & AGL Framework Client Interface
 */
export class AgunnayaLabsSDK {
  public static readonly VERSION = "2.5.0-AGL";
  public static readonly NETWORK = "Base Mainnet (Chain ID: 8453)";
  public static fontLoaded = false;

  private rpcUrl: string;
  private treasuryAddress: string;

  constructor(config?: Partial<AgunnayaSdkConfig>) {
    this.rpcUrl = config?.rpcUrl || "https://mainnet.base.org";
    this.treasuryAddress = config?.treasuryAddress || AGL_TREASURY_ADDRESS;
  }

  /**
   * Returns official Base mainnet contract addresses
   */
  public getContractAddresses() {
    return {
      aglToken: AGL_TOKEN_ADDRESS,
      aglCredits: AGL_CREDITS_ADDRESS,
      aglStaking: AGL_STAKING_ADDRESS,
      tokenFactory: TOKEN_FACTORY_ADDRESS,
      treasuryWallet: this.treasuryAddress,
      multisigSafe: AGL_MULTISIG_SAFE_ADDRESS
    };
  }

  /**
   * Fetches real-time treasury fee monitoring state
   */
  public getTreasuryStatus() {
    return TreasuryFeeService.getState();
  }

  /**
   * Dispatches automated or manual protocol fee sweep directly to Treasury
   */
  public async triggerTreasurySweep(reason: "threshold_reached" | "periodic_cron" | "manual_force" = "manual_force") {
    return TreasuryFeeService.triggerSweepToTreasury(reason, "Agunnaya SDK Auto-Sweep Dispatch");
  }

  /**
   * Generates viral engagement share payload & referral link for social growth
   */
  public generateViralReferralLink(userAddress: string, campaign: string = "agl_launch"): ViralShareConfig {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://agunnaya.studio";
    const refUrl = `${origin}?ref=${userAddress}&utm_campaign=${campaign}`;
    const text = `🚀 I'm building and swapping on Base with Agunnaya Studio! Claim $AGL credits & automated yield staking. Join me here:`;
    
    return {
      title: "Join Agunnaya Studio on Base L2",
      text,
      url: refUrl,
      referrerAddress: userAddress
    };
  }

  /**
   * Instant Web3 Share trigger via browser Native Share API or Clipboard fallback
   */
  public async shareViralEngagement(shareConfig: ViralShareConfig): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: shareConfig.title,
          text: `${shareConfig.text} ${shareConfig.url}`,
          url: shareConfig.url
        });
        return true;
      } catch (err) {
        console.warn("Native share canceled or unhandled, using clipboard fallback:", err);
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareConfig.text} ${shareConfig.url}`);
      return true;
    }

    return false;
  }
}

export const aglSdk = new AgunnayaLabsSDK();
