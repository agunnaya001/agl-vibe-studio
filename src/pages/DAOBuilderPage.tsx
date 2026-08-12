import React from "react";
import { DAO, WalletState } from "../types";
import GovernanceProposalHub from "../components/GovernanceProposalHub";

interface DAOBuilderPageProps {
  wallet: WalletState;
  daos: DAO[];
  onRefreshDAOs: () => void;
  addTerminalLog: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function DAOBuilderPage({ wallet, daos, onRefreshDAOs, addTerminalLog, showToast }: DAOBuilderPageProps) {
  return (
    <div id="dao-builder-page-wrapper">
      <GovernanceProposalHub
        wallet={wallet}
        daos={daos}
        onRefreshDAOs={onRefreshDAOs}
        addTerminalLog={addTerminalLog}
        showToast={showToast}
      />
    </div>
  );
}

