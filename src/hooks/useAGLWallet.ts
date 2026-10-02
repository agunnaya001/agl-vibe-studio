import { useState, useEffect, useCallback } from "react";
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useSwitchChain, 
  useBalance, 
  useChainId,
  useSignMessage
} from "wagmi";
import { ethers } from "ethers";
import { useEIP6963 } from "./useEIP6963";
import { EIP6963ProviderDetail } from "../types/eip6963";
import { AgunnayaDatabase } from "../lib/db";
import { WalletState } from "../types";
import { BASE_MAINNET, isBaseMainnet } from "../lib/chains";
import { AGL_TOKEN_ADDRESS } from "../lib/aglContracts";

/**
 * Universal AGL Studio Wallet Hook
 * Connect once -> use everywhere across all 31+ Studio applications
 */
export function useAGLWallet() {
  const { address, isConnected, isConnecting, isReconnecting, connector, status } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, error: switchChainError } = useSwitchChain();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const { providers: eip6963Providers, hasProviders, rescan } = useEIP6963();

  // Native ETH balance query via Wagmi
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address,
    chainId: 8453, // Base Mainnet
  });

  // Local state for AGL Token & Credits
  const [aglTokenBalance, setAglTokenBalance] = useState<number>(() => {
    return AgunnayaDatabase.getWallet().aglTokenBalance || 0;
  });
  const [aglCredits, setAglCredits] = useState<number>(() => {
    return AgunnayaDatabase.getWallet().aglCredits || 0;
  });
  const [isSyncingOnChain, setIsSyncingOnChain] = useState<boolean>(false);

  // Derive wallet name & icon from EIP-6963 or connector
  const currentProviderDetail = eip6963Providers.find(
    p => p.info.name.toLowerCase() === connector?.name?.toLowerCase() ||
         (connector?.id && p.info.rdns?.includes(connector.id))
  );

  const walletName = currentProviderDetail?.info.name || connector?.name || "EVM Wallet";
  const walletIcon = currentProviderDetail?.info.icon || (connector as any)?.icon;

  const isBase = isBaseMainnet(chainId);

  // Sync with on-chain Base Mainnet AGL token contract & Database
  const syncOnChainBalances = useCallback(async (walletAddr: string) => {
    if (!walletAddr || !ethers.isAddress(walletAddr)) return;

    setIsSyncingOnChain(true);
    try {
      // Connect to Base Mainnet public RPC provider
      const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
      
      // Native ETH
      const rawEth = await provider.getBalance(walletAddr);
      const formattedEth = parseFloat(ethers.formatEther(rawEth));

      // AGL Token Balance
      let fetchedAgl = 0;
      try {
        const aglContract = new ethers.Contract(
          AGL_TOKEN_ADDRESS,
          ["function balanceOf(address) external view returns (uint256)"],
          provider
        );
        const rawAgl = await aglContract.balanceOf(walletAddr);
        fetchedAgl = parseFloat(ethers.formatEther(rawAgl));
      } catch (e) {
        console.warn("AGL token balance fetch failed:", e);
      }

      setAglTokenBalance(fetchedAgl);

      // Persist to unified AgunnayaDatabase wallet state
      const dbWallet = AgunnayaDatabase.getWallet();
      const updated: WalletState = {
        ...dbWallet,
        address: walletAddr,
        isConnected: true,
        balanceEth: formattedEth,
        aglTokenBalance: fetchedAgl,
        walletType: (connector?.id as any) || "metamask",
      };
      AgunnayaDatabase.saveWallet(updated);
      setAglCredits(updated.aglCredits);
    } catch (err) {
      console.warn("Error syncing on-chain balances:", err);
    } finally {
      setIsSyncingOnChain(false);
    }
  }, [connector?.id]);

  // Trigger sync on account change
  useEffect(() => {
    if (isConnected && address) {
      syncOnChainBalances(address);
      refetchBalance();
    } else if (!isConnected) {
      // Reset or mark disconnected in DB
      const dbWallet = AgunnayaDatabase.getWallet();
      if (dbWallet.isConnected) {
        AgunnayaDatabase.saveWallet({
          ...dbWallet,
          isConnected: false,
        });
      }
    }
  }, [isConnected, address, syncOnChainBalances, refetchBalance]);

  // Connect specific EIP-6963 provider or standard connector
  const connectWithProvider = useCallback(async (detail: EIP6963ProviderDetail) => {
    try {
      // Find matching connector by rdns or name from Wagmi's discovered connectors
      const matchingConnector = connectors.find(c => 
        c.id === detail.info.rdns || 
        c.name.toLowerCase() === detail.info.name.toLowerCase() ||
        (c.id && detail.info.rdns && detail.info.rdns.toLowerCase().includes(c.id.toLowerCase()))
      );

      if (matchingConnector) {
        await connect({
          connector: matchingConnector,
          chainId: BASE_MAINNET.id,
        });
      } else {
        // Fallback to injected connector
        const injectedConnector = connectors.find(c => c.id === "injected") || connectors[0];
        if (injectedConnector) {
          await connect({
            connector: injectedConnector,
            chainId: BASE_MAINNET.id,
          });
        }
      }
    } catch (err) {
      console.error("Failed to connect via EIP-6963 provider:", err);
      throw err;
    }
  }, [connect, connectors]);

  // Connect via standard Injected EIP-1193 / Browser Extension fallback
  const connectInjected = useCallback(async () => {
    try {
      const injectedConnector = connectors.find(c => c.id === "injected") || connectors[0];
      if (injectedConnector) {
        await connect({
          connector: injectedConnector,
          chainId: BASE_MAINNET.id,
        });
      } else {
        throw new Error("No injected Web3 provider detected in this browser.");
      }
    } catch (err) {
      console.error("Failed to connect via Injected fallback:", err);
      throw err;
    }
  }, [connect, connectors]);

  // Connect via WalletConnect
  const connectWalletConnect = useCallback(async () => {
    const wcConnector = connectors.find(c => c.id === "walletConnect");
    if (wcConnector) {
      await connect({
        connector: wcConnector,
        chainId: BASE_MAINNET.id,
      });
    } else {
      throw new Error("WalletConnect connector not configured.");
    }
  }, [connect, connectors]);

  // Connect via Coinbase Wallet
  const connectCoinbase = useCallback(async () => {
    const cbConnector = connectors.find(c => c.id === "coinbaseWalletSDK" || c.id === "coinbaseWallet");
    if (cbConnector) {
      await connect({
        connector: cbConnector,
        chainId: BASE_MAINNET.id,
      });
    } else {
      const injectedConnector = connectors.find(c => c.id === "injected");
      if (injectedConnector) {
        await connect({ connector: injectedConnector, chainId: BASE_MAINNET.id });
      }
    }
  }, [connect, connectors]);

  // Switch network to Base Mainnet
  const switchToBase = useCallback(async () => {
    if (switchChain) {
      await switchChain({ chainId: BASE_MAINNET.id });
    }
  }, [switchChain]);

  // Disconnect cleanly
  const disconnectWallet = useCallback(() => {
    disconnect();
    const current = AgunnayaDatabase.getWallet();
    AgunnayaDatabase.saveWallet({
      ...current,
      isConnected: false,
    });
  }, [disconnect]);

  // Sign message
  const signCustomMessage = useCallback(async (message: string): Promise<string> => {
    if (!address || !isConnected) throw new Error("Wallet not connected");
    return signMessageAsync({ 
      account: address as `0x${string}`,
      message 
    });
  }, [address, isConnected, signMessageAsync]);

  return {
    // Connection State
    isConnected: Boolean(isConnected && address),
    isConnecting,
    isReconnecting,
    status,
    address,
    connector,
    connectorId: connector?.id,
    walletName,
    walletIcon,
    
    // Network State
    chainId,
    chainName: isBase ? "Base Mainnet" : chainId === 84532 ? "Base Sepolia" : "Other EVM",
    isBaseNetwork: isBase,
    
    // Balances
    nativeBalance: balanceData,
    aglTokenBalance,
    aglCredits,
    isSyncingOnChain,
    
    // EIP-6963 Discovered Providers
    eip6963Providers,
    hasEIP6963Providers: hasProviders,
    connectors,
    
    // Errors
    error: connectError || switchChainError,
    
    // Actions
    connectWithProvider,
    connectInjected,
    connectWalletConnect,
    connectCoinbase,
    disconnectWallet,
    switchToBase,
    refreshBalances: () => address && syncOnChainBalances(address),
    signMessage: signCustomMessage,
    rescanEIP6963: rescan,
  };
}
