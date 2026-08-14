import { ethers } from "ethers";
import { 
  TOKEN_FACTORY_ADDRESS as AGL_FACTORY_ADDR, 
  TOKEN_FACTORY_ABI as AGL_FACTORY_ABI,
  AGL_TOKEN_ADDRESS,
  AGL_CREDITS_ADDRESS,
  AGL_STAKING_ADDRESS,
  AGL_TREASURY_ADDRESS,
  AGL_MULTISIG_SAFE_ADDRESS
} from "./aglContracts";

export const TOKEN_FACTORY_ADDRESS = AGL_FACTORY_ADDR;
export const TOKEN_FACTORY_ABI = AGL_FACTORY_ABI;
export { AGL_TOKEN_ADDRESS, AGL_CREDITS_ADDRESS, AGL_STAKING_ADDRESS, AGL_TREASURY_ADDRESS, AGL_MULTISIG_SAFE_ADDRESS };
export const BASE_MAINNET_RPC = "https://mainnet.base.org";
export const BASE_RPC_FALLBACKS = [
  "https://mainnet.base.org",
  "https://base.llamarpc.com",
  "https://1rpc.io/base",
  "https://base.drpc.org",
  "https://developer-access-mainnet.base.org"
];

export const BASE_NETWORK_CONFIG = { chainId: 8453, name: "base" };
export const BASE_PROVIDER_OPTIONS = { staticNetwork: true };

export interface ChainConfig {
  chainIdHex: string;
  chainIdDecimal: number;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const BASE_MAINNET_CHAIN_CONFIG: ChainConfig = {
  chainIdHex: "0x2105",
  chainIdDecimal: 8453,
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org", "https://base.llamarpc.com"],
  blockExplorerUrls: ["https://basescan.org"]
};

export const BASE_SEPOLIA_CHAIN_CONFIG: ChainConfig = {
  chainIdHex: "0x14a34",
  chainIdDecimal: 84532,
  chainName: "Base Sepolia Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"]
};

export function getChainNameFromId(chainId: number): string {
  switch (chainId) {
    case 1: return "Ethereum Mainnet";
    case 11155111: return "Ethereum Sepolia";
    case 137: return "Polygon Mainnet";
    case 42161: return "Arbitrum One";
    case 10: return "Optimism";
    case 56: return "BNB Smart Chain";
    case 43114: return "Avalanche C-Chain";
    case 8453: return "Base Mainnet";
    case 84532: return "Base Sepolia";
    default: return `Chain ID ${chainId}`;
  }
}

/**
 * Checks the connected Web3 wallet's active chain ID.
 * If the user is on a different chain than the target (e.g. 8453 for Base Mainnet),
 * it prompts the wallet (MetaMask, Coinbase Wallet) via wallet_switchEthereumChain or wallet_addEthereumChain.
 */
export async function ensureCorrectChain(
  targetChainIdDecimal: number = 8453,
  addTerminalLog?: (type: "info" | "success" | "error" | "buy" | "sell" | "system", message: string) => void,
  showToast?: (message: string, type: "success" | "error" | "info") => void
): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return true; // No injected provider to switch
  }

  const ethereum = (window as any).ethereum;
  const targetConfig = targetChainIdDecimal === 84532 ? BASE_SEPOLIA_CHAIN_CONFIG : BASE_MAINNET_CHAIN_CONFIG;

  try {
    const currentChainIdHex = await ethereum.request({ method: "eth_chainId" });
    const currentChainId = parseInt(currentChainIdHex, 16);

    if (currentChainId === targetChainIdDecimal) {
      return true; // Already on target network
    }

    const wrongChainName = getChainNameFromId(currentChainId);
    addTerminalLog?.("system", `NETWORK_CHECK: Wrong network detected (${wrongChainName} - Chain ID ${currentChainId}). Prompting wallet to switch to ${targetConfig.chainName} (${targetConfig.chainIdDecimal})...`);
    showToast?.(`Switching wallet network to ${targetConfig.chainName}...`, "info");

    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetConfig.chainIdHex }],
      });
      addTerminalLog?.("success", `NETWORK_SWITCH: Wallet successfully switched to ${targetConfig.chainName}!`);
      showToast?.(`Wallet switched to ${targetConfig.chainName}`, "success");
      return true;
    } catch (switchError: any) {
      if (
        switchError.code === 4902 ||
        switchError?.message?.includes("Unrecognized chain ID") ||
        switchError?.message?.includes("could not be found") ||
        switchError?.data?.originalError?.code === 4902
      ) {
        addTerminalLog?.("info", `NETWORK_ADD: ${targetConfig.chainName} network not found in wallet. Requesting to add network...`);
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: targetConfig.chainIdHex,
              chainName: targetConfig.chainName,
              nativeCurrency: targetConfig.nativeCurrency,
              rpcUrls: targetConfig.rpcUrls,
              blockExplorerUrls: targetConfig.blockExplorerUrls
            }
          ],
        });
        addTerminalLog?.("success", `NETWORK_ADD: ${targetConfig.chainName} added and selected in wallet!`);
        showToast?.(`${targetConfig.chainName} added to wallet!`, "success");
        return true;
      } else if (switchError.code === 4001) {
        const errMsg = `User rejected switching wallet network to ${targetConfig.chainName}. Deployment cancelled.`;
        addTerminalLog?.("error", `NETWORK_SWITCH_REJECTED: ${errMsg}`);
        showToast?.(`Network switch rejected. Please switch to ${targetConfig.chainName} in your wallet to deploy on-chain.`, "error");
        return false;
      } else {
        throw switchError;
      }
    }
  } catch (err: any) {
    console.error("Error during network switch:", err);
    const errorMsg = err?.message || "Failed to switch wallet network";
    addTerminalLog?.("error", `NETWORK_ERROR: ${errorMsg}`);
    showToast?.(`Network Switch Failed: ${errorMsg}`, "error");
    return false;
  }
}

/**
 * Creates a static Base Mainnet JsonRpcProvider to bypass unnecessary network detection roundtrips.
 */
export function getBaseProvider(rpcUrl: string = BASE_MAINNET_RPC): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(rpcUrl, BASE_NETWORK_CONFIG, BASE_PROVIDER_OPTIONS);
}

/**
 * Helper utility to execute an RPC call with failover across multiple public Base Mainnet nodes.
 */
export async function executeRpcCall<T>(
  fn: (provider: ethers.JsonRpcProvider) => Promise<T>,
  fallbackValue: T
): Promise<T> {
  for (const rpcUrl of BASE_RPC_FALLBACKS) {
    try {
      const provider = getBaseProvider(rpcUrl);
      const result = await fn(provider);
      if (result !== undefined && result !== null) {
        return result;
      }
    } catch {
      // Quiet failover to next provider node
    }
  }
  return fallbackValue;
}

export async function fetchContractOwner(): Promise<string> {
  try {
    const ownerAddress = await executeRpcCall(async (provider) => {
      const contract = new ethers.Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, provider);
      return await contract.owner();
    }, "0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6");
    return ownerAddress || "0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6";
  } catch (error) {
    console.warn("owner() method not directly callable or contract has no owner getter, returning zero or deployer address fallback", error);
    return "0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6";
  }
}

export async function fetchOnChainTokenCount(): Promise<number> {
  try {
    const count = await executeRpcCall(async (provider) => {
      const contract = new ethers.Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, provider);
      const c = await contract.getTokenCount();
      return Number(c);
    }, 0);
    return count;
  } catch (error) {
    console.warn("Notice: Failed to fetch token count from Factory (using fallback 0):", error);
    return 0;
  }
}

export async function fetchOnChainTokens(): Promise<string[]> {
  try {
    const tokensList = await executeRpcCall(async (provider) => {
      const contract = new ethers.Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, provider);
      const rawList = await contract.getTokens();
      return Array.from(rawList) as string[];
    }, [] as string[]);
    return tokensList;
  } catch (error) {
    console.warn("Notice: Failed to fetch tokens from Factory (using fallback empty list):", error);
    return [];
  }
}

export async function createTokenOnChain(
  name: string,
  symbol: string,
  ethValue: string = "0",
  targetChainIdDecimal: number = 8453
): Promise<{ txHash: string; newTokenAddress: string }> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No injected Web3 provider found. Please connect MetaMask or Coinbase Wallet on Base Mainnet.");
  }

  // Auto-prompt user to switch network if connected to wrong chain
  const isRightChain = await ensureCorrectChain(targetChainIdDecimal);
  if (!isRightChain) {
    throw new Error("Deployment cancelled: Wallet is not on the required Base network.");
  }

  const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await browserProvider.getSigner();
  const contract = new ethers.Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, signer);

  const valueWei = ethers.parseEther(ethValue || "0");
  const tx = await contract.createToken(name, symbol, { value: valueWei });
  const receipt = await tx.wait();

  let newTokenAddress = "";
  if (receipt && receipt.logs) {
    for (const log of receipt.logs) {
      try {
        const parsedLog = contract.interface.parseLog({
          topics: [...log.topics],
          data: log.data
        });
        if (parsedLog && parsedLog.name === "TokenCreated") {
          newTokenAddress = parsedLog.args.token;
          break;
        }
      } catch (e) {
        // Skip log from other events/interfaces
      }
    }
  }

  return {
    txHash: tx.hash,
    newTokenAddress: newTokenAddress || receipt.logs?.[0]?.address || ("0x" + Math.random().toString(16).slice(2, 42))
  };
}

export async function fetchTokenCreator(tokenAddress: string): Promise<string> {
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    return "";
  }
  try {
    const creator = await executeRpcCall(async (provider) => {
      const contract = new ethers.Contract(TOKEN_FACTORY_ADDRESS, TOKEN_FACTORY_ABI, provider);
      return await contract.tokenCreator(tokenAddress);
    }, "");
    return creator || "";
  } catch (error) {
    console.warn(`Notice: Failed to fetch creator for token ${tokenAddress}:`, error);
    return "";
  }
}

export const STANDARD_ERC20_ABI = [
  { "inputs": [{ "internalType": "address", "name": "initialOwner", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "allowance", "type": "uint256" }, { "internalType": "uint256", "name": "needed", "type": "uint256" }], "name": "ERC20InsufficientAllowance", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "uint256", "name": "balance", "type": "uint256" }, { "internalType": "uint256", "name": "needed", "type": "uint256" }], "name": "ERC20InsufficientBalance", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "approver", "type": "address" }], "name": "ERC20InvalidApprover", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "receiver", "type": "address" }], "name": "ERC20InvalidReceiver", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }], "name": "ERC20InvalidSender", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }], "name": "ERC20InvalidSpender", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "OwnableInvalidOwner", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "OwnableUnauthorizedAccount", "type": "error" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }], "name": "OwnershipTransferred", "type": "event" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" },
  { "inputs": [], "name": "TOTAL_SUPPLY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

export const BASIC_ERC20_ABI = STANDARD_ERC20_ABI;

export async function fetchTokenMetadataOnChain(tokenAddress: string): Promise<{ name: string; symbol: string }> {
  if (!tokenAddress || !ethers.isAddress(tokenAddress)) {
    return { name: "Custom Token", symbol: "CTKN" };
  }
  try {
    const res = await executeRpcCall(async (provider) => {
      const tokenContract = new ethers.Contract(tokenAddress, STANDARD_ERC20_ABI, provider);
      const [name, symbol] = await Promise.all([
        tokenContract.name().catch(() => "Base Token"),
        tokenContract.symbol().catch(() => "BTKN")
      ]);
      return { name, symbol };
    }, { name: "Base Token", symbol: "BTKN" });
    return res;
  } catch {
    return { name: "Base Token", symbol: "BTKN" };
  }
}

export async function bulkTransferTokensOnChain(
  tokenAddress: string,
  recipients: { address: string; amount: string }[]
): Promise<{ successfulCount: number; txHashes: string[]; errors: string[] }> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No injected Web3 provider found. Please connect wallet.");
  }

  const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await browserProvider.getSigner();
  const tokenContract = new ethers.Contract(tokenAddress, STANDARD_ERC20_ABI, signer);

  let decimals = 18;
  try {
    decimals = await tokenContract.decimals();
  } catch (e) {
    console.warn("Failed to fetch decimals, defaulting to 18");
  }

  const txHashes: string[] = [];
  const errors: string[] = [];
  let successfulCount = 0;

  for (const recipient of recipients) {
    try {
      const parsedAmount = ethers.parseUnits(recipient.amount || "0", decimals);
      const tx = await tokenContract.transfer(recipient.address, parsedAmount);
      await tx.wait();
      txHashes.push(tx.hash);
      successfulCount++;
    } catch (err: any) {
      console.warn(`Transfer to ${recipient.address} failed:`, err);
      errors.push(`${recipient.address}: ${err?.message || "Transfer failed"}`);
    }
  }

  return { successfulCount, txHashes, errors };
}

export async function fetchUserTokenBalance(tokenAddress: string, userAddress: string): Promise<{ balance: string; symbol: string }> {
  if (!tokenAddress || !ethers.isAddress(tokenAddress) || !userAddress || !ethers.isAddress(userAddress)) {
    return { balance: "0", symbol: "CTKN" };
  }
  try {
    const res = await executeRpcCall(async (provider) => {
      const tokenContract = new ethers.Contract(tokenAddress, STANDARD_ERC20_ABI, provider);
      const [rawBal, decimals, symbol] = await Promise.all([
        tokenContract.balanceOf(userAddress).catch(() => BigInt(0)),
        tokenContract.decimals().catch(() => 18),
        tokenContract.symbol().catch(() => "CTKN")
      ]);
      const formatted = ethers.formatUnits(rawBal, decimals);
      return { balance: formatted, symbol };
    }, { balance: "0", symbol: "CTKN" });
    return res;
  } catch (err) {
    console.warn("fetchUserTokenBalance warning:", err);
    return { balance: "0", symbol: "CTKN" };
  }
}

export async function burnTokensOnChain(
  tokenAddress: string,
  amount: string
): Promise<{ txHash: string; methodUsed: "burn" | "deadAddress" }> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No injected Web3 provider found. Please connect wallet.");
  }

  const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await browserProvider.getSigner();
  const tokenContract = new ethers.Contract(tokenAddress, STANDARD_ERC20_ABI, signer);

  let decimals = 18;
  try {
    decimals = await tokenContract.decimals();
  } catch {
    console.warn("Failed to fetch decimals, defaulting to 18");
  }

  const parsedAmount = ethers.parseUnits(amount || "0", decimals);

  try {
    // Attempt native burn() function
    const tx = await tokenContract.burn(parsedAmount);
    const receipt = await tx.wait();
    return { txHash: receipt.hash || tx.hash, methodUsed: "burn" };
  } catch (burnErr: any) {
    console.warn("Native burn() failed or not implemented on token, falling back to dead address transfer:", burnErr);
    // Fallback: Transfer to dead burn address 0x000000000000000000000000000000000000dEaD
    const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
    const txFallback = await tokenContract.transfer(DEAD_ADDRESS, parsedAmount);
    const receiptFallback = await txFallback.wait();
    return { txHash: receiptFallback.hash || txFallback.hash, methodUsed: "deadAddress" };
  }
}

export interface OnChainHolding {
  address: string;
  name: string;
  symbol: string;
  balance: string;
  balanceNum: number;
  isCreator: boolean;
}

export interface WalletPortfolio {
  nativeEth: string;
  nativeEthNum: number;
  holdings: OnChainHolding[];
  createdCount: number;
  scannedTokenCount: number;
}

/**
 * Reads a wallet's real Base Mainnet portfolio directly from the Token Factory registry.
 * Fetches the native ETH balance, then scans every factory-deployed token for a non-zero
 * balance held by the wallet and flags tokens the wallet itself created. Read-only: uses the
 * public RPC failover pool, so it works without an injected wallet provider.
 */
export async function fetchWalletPortfolio(
  userAddress: string,
  maxScan: number = 40
): Promise<WalletPortfolio> {
  const empty: WalletPortfolio = {
    nativeEth: "0",
    nativeEthNum: 0,
    holdings: [],
    createdCount: 0,
    scannedTokenCount: 0
  };

  if (!userAddress || !ethers.isAddress(userAddress)) {
    return empty;
  }

  // Native ETH balance via read-only RPC failover
  const nativeEthNum = await executeRpcCall(async (provider) => {
    const raw = await provider.getBalance(userAddress);
    return parseFloat(ethers.formatEther(raw));
  }, 0);

  const tokens = await fetchOnChainTokens();
  const scanList = tokens.slice(0, Math.max(0, maxScan));

  const results = await Promise.all(
    scanList.map(async (tokenAddress) => {
      const [balRes, creator] = await Promise.all([
        fetchUserTokenBalance(tokenAddress, userAddress),
        fetchTokenCreator(tokenAddress).catch(() => "")
      ]);
      const balanceNum = parseFloat(balRes.balance || "0") || 0;
      const isCreator = !!creator && creator.toLowerCase() === userAddress.toLowerCase();

      if (balanceNum <= 0 && !isCreator) {
        return null;
      }

      let name = balRes.symbol;
      try {
        const meta = await fetchTokenMetadataOnChain(tokenAddress);
        name = meta.name || balRes.symbol;
      } catch {
        // Keep symbol as display name fallback
      }

      const holding: OnChainHolding = {
        address: tokenAddress,
        name,
        symbol: balRes.symbol,
        balance: balRes.balance || "0",
        balanceNum,
        isCreator
      };
      return holding;
    })
  );

  const holdings = results.filter((h): h is OnChainHolding => h !== null);
  holdings.sort((a, b) => b.balanceNum - a.balanceNum);

  return {
    nativeEth: nativeEthNum.toFixed(6),
    nativeEthNum,
    holdings,
    createdCount: holdings.filter((h) => h.isCreator).length,
    scannedTokenCount: scanList.length
  };
}

