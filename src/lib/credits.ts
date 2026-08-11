import { WalletState } from "../types";
import { AgunnayaDatabase } from "./db";

export const CREDIT_COSTS = {
  CONTRACT_BUILD: 50,
  AI_ADVISOR_CHAT: 5,
  AGENT_HARNESS_CHAT: 10,
  IMAGE_GENERATION: 25,
  VIDEO_GENERATION: 50,
  DEPLOYMENT_PROPOSAL: 30,
  EMAIL_DRAFT: 10,
  PORTFOLIO_REBALANCE: 20,
};

export interface CreditCheckParams {
  wallet: WalletState;
  onRefreshWallet: () => void;
  requiredCredits: number;
  featureName: string;
  showToast: (message: string, type: "success" | "error" | "info" | "showToast") => void;
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  onRequestCreditsModal?: (featureName: string, required: number, available: number) => void;
}

export interface CreditValidationResult {
  success: boolean;
  currentCredits: number;
  requiredCredits: number;
  remainingCredits: number;
  refund: () => void;
}

/**
 * Validates whether the user has sufficient computational credits before launching an AI generation.
 * - If insufficient: returns success=false, displays a prominent error toast, logs to terminal, triggers modal if available.
 * - If sufficient: deducts credits immediately, saves wallet state, alerts if credits are low, and provides a refund callback.
 */
export function validateAndConsumeCredits({
  wallet,
  onRefreshWallet,
  requiredCredits,
  featureName,
  showToast,
  addTerminalLog,
  onRequestCreditsModal
}: CreditCheckParams): CreditValidationResult {
  const currentCredits = wallet.aglCredits ?? 0;

  if (currentCredits < requiredCredits) {
    const errorMsg = `Insufficient AGL Credits for ${featureName}! Required: ${requiredCredits} Credits (Available: ${currentCredits} Credits).`;
    showToast(`⚠️ AI Generation Blocked: ${errorMsg}`, "error");

    if (addTerminalLog) {
      addTerminalLog(
        "error",
        `[CREDIT ENGINE] AI Generation Rejected for ${featureName}. Required: ${requiredCredits} credits, Available: ${currentCredits} credits. Navigate to 'AGL Credits Burn' to purchase computational credits.`
      );
    }

    if (onRequestCreditsModal) {
      onRequestCreditsModal(featureName, requiredCredits, currentCredits);
    }

    return {
      success: false,
      currentCredits,
      requiredCredits,
      remainingCredits: currentCredits,
      refund: () => {}
    };
  }

  // Deduct required credits
  const remainingCredits = Math.max(0, currentCredits - requiredCredits);
  const updatedWallet: WalletState = {
    ...wallet,
    aglCredits: remainingCredits
  };

  AgunnayaDatabase.saveWallet(updatedWallet);
  onRefreshWallet();

  showToast(`Consumed ${requiredCredits} AGL Credits for ${featureName}`, "info");

  if (addTerminalLog) {
    addTerminalLog(
      "system",
      `[CREDIT ENGINE] Deducted ${requiredCredits} AGL Credits for ${featureName}. Remaining balance: ${remainingCredits} credits.`
    );
  }

  if (remainingCredits < 20) {
    showToast(`⚠️ Low Computational Credits: Only ${remainingCredits} AGL Credits remaining. Burn AGL tokens to maintain uninterrupted AI generation!`, "info");
  }

  let refunded = false;
  const refund = () => {
    if (refunded) return;
    refunded = true;

    const currentWallet = AgunnayaDatabase.getWallet();
    const restoredWallet: WalletState = {
      ...currentWallet,
      aglCredits: (currentWallet.aglCredits || 0) + requiredCredits
    };

    AgunnayaDatabase.saveWallet(restoredWallet);
    onRefreshWallet();

    showToast(`🔄 AI Generation Failed. Restored ${requiredCredits} AGL Credits to your wallet.`, "info");
    if (addTerminalLog) {
      addTerminalLog(
        "info",
        `[CREDIT ENGINE] Refunded ${requiredCredits} credits due to AI pipeline failure. Restored balance: ${restoredWallet.aglCredits} credits.`
      );
    }
  };

  return {
    success: true,
    currentCredits,
    requiredCredits,
    remainingCredits,
    refund
  };
}
