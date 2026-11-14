import { 
  SecurityAuditReport, 
  GeneratedDAppProject, 
  ContractExplanationReport, 
  GeneratedWeb3GameProject, 
  TransactionSafetyPreFlight, 
  DecodedTransactionItem,
  TokenBalanceItem,
  NetworkKey,
  SUPPORTED_NETWORKS
} from "../types/aiSuite";
import { ethers } from "ethers";
import { AGL_TOKEN_ADDRESS } from "./aglContracts";

export const AIService = {
  /**
   * Run deep Solidity security audit using server-side Gemini AI
   */
  async runSecurityAudit(params: {
    solidityCode: string;
    contractAddress?: string;
    contractName?: string;
    network: NetworkKey;
  }): Promise<SecurityAuditReport> {
    const response = await fetch("/api/ai/security-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Audit request failed" }));
      throw new Error(err.error || `Security audit failed with status ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Fetch verified source code or ABI for a contract address from explorer/RPC
   */
  async fetchContractSource(params: {
    address: string;
    network: NetworkKey;
  }): Promise<{
    sourceCode?: string;
    abi?: string;
    contractName?: string;
    isVerified: boolean;
    compiler?: string;
    bytecode?: string;
  }> {
    const response = await fetch("/api/ai/fetch-contract-source", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Failed to fetch contract source" }));
      throw new Error(err.error || `Source fetch failed with status ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Generate complete full-stack dApp project from natural language
   */
  async generateDApp(params: {
    prompt: string;
    category?: string;
    network: NetworkKey;
  }): Promise<GeneratedDAppProject> {
    const response = await fetch("/api/ai/generate-dapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "dApp generation failed" }));
      throw new Error(err.error || `dApp generation failed with status ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Conversationally iterate/modify an existing dApp project
   */
  async iterateDApp(params: {
    project: GeneratedDAppProject;
    userModification: string;
  }): Promise<GeneratedDAppProject> {
    const response = await fetch("/api/ai/iterate-dapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "dApp iteration failed" }));
      throw new Error(err.error || `dApp iteration failed with status ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Deconstruct & explain a smart contract
   */
  async explainContract(params: {
    address?: string;
    solidityCode?: string;
    network: NetworkKey;
  }): Promise<ContractExplanationReport> {
    const response = await fetch("/api/ai/explain-contract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Contract explanation failed" }));
      throw new Error(err.error || `Contract explanation failed with status ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Ask Q&A about a specific contract
   */
  async askContractQuestion(params: {
    question: string;
    report: ContractExplanationReport;
    network: NetworkKey;
  }): Promise<string> {
    const response = await fetch("/api/ai/contract-qa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Contract Q&A failed" }));
      throw new Error(err.error || `Contract Q&A failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.answer || "No response received.";
  },

  /**
   * Onchain AI Agent natural language query with live blockchain context
   */
  async queryOnchainAgent(params: {
    prompt: string;
    walletAddress?: string;
    network: NetworkKey;
    messages: { role: string; content: string }[];
  }): Promise<{
    reply: string;
    dataEvidence?: any;
    txPreFlight?: TransactionSafetyPreFlight;
  }> {
    const response = await fetch("/api/ai/onchain-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Onchain Agent query failed" }));
      throw new Error(err.error || `Onchain Agent failed with status ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Simulate a transaction for pre-flight safety analysis
   */
  async simulateTransaction(params: {
    targetContract: string;
    data?: string;
    value?: string;
    fromAddress: string;
    network: NetworkKey;
    abi?: any;
  }): Promise<TransactionSafetyPreFlight> {
    const response = await fetch("/api/ai/simulate-tx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Simulation failed" }));
      throw new Error(err.error || `Simulation failed with status ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Generate Web3 Game from prompt
   */
  async generateWeb3Game(params: {
    prompt: string;
    network: NetworkKey;
  }): Promise<GeneratedWeb3GameProject> {
    const response = await fetch("/api/ai/generate-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Game generation failed" }));
      throw new Error(err.error || `Game generation failed with status ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Conversationally iterate/modify an existing Web3 game project
   */
  async iterateWeb3Game(params: {
    project: GeneratedWeb3GameProject;
    userModification: string;
  }): Promise<GeneratedWeb3GameProject> {
    const response = await fetch("/api/ai/iterate-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: "Game iteration failed" }));
      throw new Error(err.error || `Game iteration failed with status ${response.status}`);
    }

    return await response.json();
  },

  /**
   * Fetch real on-chain token balances and recent transactions for an address
   */
  async getLiveWalletData(address: string, network: NetworkKey): Promise<{
    balances: TokenBalanceItem[];
    recentTxs: DecodedTransactionItem[];
  }> {
    if (!ethers.isAddress(address)) throw new Error("A valid EVM wallet address is required.");

    const netConfig = SUPPORTED_NETWORKS[network] || SUPPORTED_NETWORKS["base-mainnet"];
    const provider = new ethers.JsonRpcProvider(netConfig.rpcUrl);
    const balances: TokenBalanceItem[] = [];
    const recentTxs: DecodedTransactionItem[] = [];

    // Native balance is real RPC data. USD valuation is omitted until a trusted price source is connected.
    const ethBal = await provider.getBalance(address);
    balances.push({
      symbol: "ETH",
      name: "Ether",
      address: "0x0000000000000000000000000000000000000000",
      balance: ethBal.toString(),
      balanceFormatted: Number(ethers.formatEther(ethBal)).toFixed(6),
      decimals: 18,
    });

    if (network === "base-mainnet") {
      const tokens = [
        {
          symbol: "AGL",
          name: "Agunnaya Labs",
          address: AGL_TOKEN_ADDRESS,
          decimals: 18,
        },
        {
          symbol: "USDC",
          name: "USD Coin",
          address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          decimals: 6,
        },
      ];

      for (const token of tokens) {
        try {
          const tokenContract = new ethers.Contract(
            token.address,
            ["function balanceOf(address) view returns (uint256)"],
            provider
          );
          const rawBalance = await tokenContract.balanceOf(address);
          balances.push({
            symbol: token.symbol,
            name: token.name,
            address: token.address,
            balance: rawBalance.toString(),
            balanceFormatted: Number(ethers.formatUnits(rawBalance, token.decimals)).toLocaleString(undefined, {
              maximumFractionDigits: token.decimals === 6 ? 2 : 6,
            }),
            decimals: token.decimals,
          });
        } catch (error) {
          console.warn(`Unable to read ${token.symbol} balance from Base:`, error);
        }
      }
    }

    // Transaction history is intentionally empty until an explorer/indexer provider is configured.
    return { balances, recentTxs };
  }};
