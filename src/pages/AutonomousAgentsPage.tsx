import React from "react";
import AutonomousAgentsHub from "../components/autonomous/AutonomousAgentsHub";
import { WalletState } from "../types";

interface AutonomousAgentsPageProps {
  wallet: WalletState;
  showToast: (message: string, type: "success" | "error" | "info") => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  onConnectWallet?: () => void;
}

export default function AutonomousAgentsPage({
  wallet,
  showToast,
  addTerminalLog,
  onConnectWallet,
}: AutonomousAgentsPageProps) {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <AutonomousAgentsHub
        wallet={wallet}
        showToast={showToast}
        addTerminalLog={addTerminalLog}
      />
    </div>
  );
}
