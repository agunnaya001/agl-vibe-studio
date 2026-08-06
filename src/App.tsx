import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { User, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import WalletModal from "./components/WalletModal";
import AIAssistantSidebar from "./components/AIAssistantSidebar";

// Pages
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import ExplorePage from "./pages/ExplorePage";
import CreatePage from "./pages/CreatePage";
import TradePage from "./pages/TradePage";
import NFTStudioPage from "./pages/NFTStudioPage";
import DAOBuilderPage from "./pages/DAOBuilderPage";
import GameFiPage from "./pages/GameFiPage";
import AgentStudioPage from "./pages/AgentStudioPage";
import DeFiPage from "./pages/DeFiPage";
import AGLCreditsPage from "./pages/AGLCreditsPage";
import GasDashboardPage from "./pages/GasDashboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminPanelPage from "./pages/AdminPanelPage";
import ReferralPage from "./pages/ReferralPage";
import GoogleDrivePage from "./pages/GoogleDrivePage";
import GmailPage from "./pages/GmailPage";
import TokenFactoryPage from "./pages/TokenFactoryPage";
import TokenBurnerPage from "./pages/TokenBurnerPage";
import StakingVaultPage from "./pages/StakingVaultPage";
import TaskSyncPage from "./pages/TaskSyncPage";

// Database & Utilities
import { AgunnayaDatabase } from "./lib/db";
import { WalletState, Token, NFTCollection, DAO, GameFiProject, AIAgent, Activity, PriceAlert } from "./types";
import TerminalLog, { TerminalLine } from "./components/TerminalLog";
import { getBaseProvider } from "./lib/tokenFactory";
import { BrainCircuit, Copy, Check, QrCode, X, ShieldCheck, Rocket, BarChart3, Terminal, Zap, ChevronRight, Pin, PinOff } from "lucide-react";

export default function App() {
  const [isLaunched, setIsLaunched] = useState(false);
  const [currentTab, setCurrentTab] = useState("dashboard");
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [network, setNetwork] = useState<"sepolia" | "mainnet">("sepolia");

  // Modals state
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Firebase Auth state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [driveAccessToken, setDriveAccessToken] = useState<string | null>(null);

  // Global State data
  const [wallet, setWallet] = useState<WalletState>(AgunnayaDatabase.getWallet());
  const [tokens, setTokens] = useState<Token[]>([]);
  const [nfts, setNfts] = useState<NFTCollection[]>([]);
  const [daos, setDaos] = useState<DAO[]>([]);
  const [games, setGames] = useState<GameFiProject[]>([]);
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<PriceAlert[]>([]);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
  };

  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isQRPopoverOpen, setIsQRPopoverOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
  const [isDrawerLocked, setIsDrawerLocked] = useState(false);

  const handleCopyAddress = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopiedAddress(true);
      showToast(`Wallet address copied: ${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`, "success");
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Global click-outside listener to close AI Drawer when clicking outside floating activator, tooltip, or drawer (unless pinned/locked)
  useEffect(() => {
    if (!isAIDrawerOpen || isDrawerLocked) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const activator = document.getElementById("floating-ai-activator");
      const tooltip = document.getElementById("floating-ai-tooltip");
      const drawer = document.getElementById("ai-assistant-drawer");

      const isInsideActivator = activator && activator.contains(target);
      const isInsideTooltip = tooltip && tooltip.contains(target);
      const isInsideDrawer = drawer && drawer.contains(target);

      if (!isInsideActivator && !isInsideTooltip && !isInsideDrawer) {
        setIsAIDrawerOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [isAIDrawerOpen, isDrawerLocked]);

  // Global click-outside listener for Quick Actions menu
  useEffect(() => {
    if (!isQuickActionsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const activator = document.getElementById("floating-ai-activator");
      const quickActions = document.getElementById("floating-quick-actions");

      const isInsideActivator = activator && activator.contains(target);
      const isInsideQuickActions = quickActions && quickActions.contains(target);

      if (!isInsideActivator && !isInsideQuickActions) {
        setIsQuickActionsOpen(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("click", handleOutsideClick);
      document.addEventListener("contextmenu", handleOutsideClick);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handleOutsideClick);
      document.removeEventListener("contextmenu", handleOutsideClick);
    };
  }, [isQuickActionsOpen]);

  // Terminal Logs state
  const [terminalLogs, setTerminalLogs] = useState<TerminalLine[]>([
    { type: "system", text: "AGUNNAYA_CORE: System booting successfully..." },
    { type: "system", text: "AGUNNAYA_CORE: Linear bonding curve mathematical model verified." },
    { type: "info", text: "Connected to simulated Base Sepolia nodes. Network status: online." }
  ]);

  // Refresh data from local db
  const refreshAllData = () => {
    setWallet(AgunnayaDatabase.getWallet());
    setTokens(AgunnayaDatabase.getTokens());
    setNfts(AgunnayaDatabase.getNFTs());
    setDaos(AgunnayaDatabase.getDAOs());
    setGames(AgunnayaDatabase.getGameFi());
    setAgents(AgunnayaDatabase.getAgents());
    setActivities(AgunnayaDatabase.getActivities().reverse()); // newest first
    setPriceAlerts(AgunnayaDatabase.getPriceAlerts());
  };

  const handleAddPriceAlert = (alert: Omit<PriceAlert, "id" | "createdAt" | "status" | "triggeredAt">) => {
    const newAlert = AgunnayaDatabase.addPriceAlert(alert);
    setPriceAlerts(AgunnayaDatabase.getPriceAlerts());
    showToast(`Price alert set for ${alert.tokenSymbol} at ${(alert.targetPrice * 1000000).toFixed(3)} μETH`, "success");
    addTerminalLog("success", `ALERT_SET: Added alert for ${alert.tokenSymbol} ${alert.condition} ${(alert.targetPrice * 1000000).toFixed(3)} μETH.`);
    
    // Request permission if not granted
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const handleDeletePriceAlert = async (id: string) => {
    await AgunnayaDatabase.deletePriceAlert(id);
    setPriceAlerts(AgunnayaDatabase.getPriceAlerts());
    showToast("Price alert removed.", "info");
    addTerminalLog("info", "ALERT_DELETED: Price alert removed successfully.");
  };

  // Monitor price changes and trigger alerts
  useEffect(() => {
    if (!tokens || tokens.length === 0 || priceAlerts.length === 0) return;

    let updatedAny = false;
    const currentAlerts = [...priceAlerts];

    currentAlerts.forEach((alert) => {
      if (alert.status !== "active") return;

      const token = tokens.find(t => t.address.toLowerCase() === alert.tokenAddress.toLowerCase());
      if (!token) return;

      const currentPriceEth = token.currentPrice;
      let triggered = false;

      if (alert.condition === "above" && currentPriceEth >= alert.targetPrice) {
        triggered = true;
      } else if (alert.condition === "below" && currentPriceEth <= alert.targetPrice) {
        triggered = true;
      }

      if (triggered) {
        alert.status = "triggered";
        alert.triggeredAt = Date.now();
        updatedAny = true;

        const targetPriceMicro = (alert.targetPrice * 1000000).toFixed(3);
        const currentPriceMicro = (currentPriceEth * 1000000).toFixed(3);
        const title = `🚨 Price Alert Triggered: ${alert.tokenSymbol}!`;
        const body = `${alert.tokenSymbol} has gone ${alert.condition} your target of ${targetPriceMicro} μETH. Current: ${currentPriceMicro} μETH!`;

        // Send browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(title, { body });
          } catch (e) {
            console.warn("Iframe notification error:", e);
          }
        }

        // Show toast notification
        showToast(body, "success");

        // Add to terminal logs
        addTerminalLog("system", `PRICE_ALERT: ${alert.tokenSymbol} target reached! Target: ${targetPriceMicro} μETH, Current: ${currentPriceMicro} μETH.`);
      }
    });

    if (updatedAny) {
      setPriceAlerts(currentAlerts);
      AgunnayaDatabase.savePriceAlerts(currentAlerts);
    }
  }, [tokens, priceAlerts]);

  useEffect(() => {
    refreshAllData();

    // 1. Listen to Firebase auth changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setFirebaseUser(user);
      setIsAuthLoading(false);
      if (user) {
        addTerminalLog("success", `FIREBASE AUTH: Logged in as ${user.displayName || user.email}`);
      } else {
        addTerminalLog("info", "FIREBASE AUTH: Cloud synchronization passive. Connect Google Account to enable shared state.");
      }
    });

    // 2. Perform initial community sync from Firestore
    AgunnayaDatabase.syncAllFromFirestore().then((success) => {
      if (success) {
        addTerminalLog("success", "CLOUD SYNC: Community database updated from Firestore!");
        refreshAllData();
      }
    });

    // Check for referral code in URL search params
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      AgunnayaDatabase.setActiveReferrer(refCode);
      showToast(`Referral invitation active (Ref: ${refCode})`, "info");
      addTerminalLog("system", `REFERRAL_DETECTED: Active invite code ${refCode} stored in session.`);

      // If wallet is already connected, register referral immediately
      const currentWallet = AgunnayaDatabase.getWallet();
      if (currentWallet && currentWallet.isConnected) {
        const actualReferrer = AgunnayaDatabase.registerReferral(currentWallet.address, refCode);
        if (actualReferrer) {
          showToast(`Welcome! Registered under referrer 0x${actualReferrer.slice(2, 6)}...`, "success");
          addTerminalLog("success", `REFERRAL_COMPLETED: User referred successfully by 0x${actualReferrer.slice(2, 8)}...`);
        }
      }
    }

    // 3. Set up Firestore real-time listener for activities
    const activitiesQuery = query(
      collection(db, "activities"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const unsubscribeActivities = onSnapshot(activitiesQuery, (snapshot) => {
      const activeList: Activity[] = [];
      snapshot.forEach((doc) => {
        activeList.push(doc.data() as Activity);
      });
      if (activeList.length > 0) {
        const sorted = activeList.sort((a, b) => b.timestamp - a.timestamp);
        setActivities(sorted);
        localStorage.setItem("agl_activities", JSON.stringify(sorted));
      }
    }, (error) => {
      console.error("Error in real-time activities subscription:", error);
    });

    return () => {
      unsubscribe();
      unsubscribeActivities();
    };
  }, []);

  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      syncWalletBalancesOnChain(wallet.address);
    }
  }, [wallet.isConnected, wallet.address]);

  const DRIVE_SCOPES = [
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.metadata",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.compose",
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.labels"
  ];

  const handleSignInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      DRIVE_SCOPES.forEach(scope => provider.addScope(scope));
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveAccessToken(credential.accessToken);
        addTerminalLog("success", "GOOGLE_DRIVE: Google Drive access token loaded and cached in-memory.");
      }
      showToast(`Welcome, ${result.user.displayName}! Cloud Sync active.`, "success");
      // Re-sync on log in
      await AgunnayaDatabase.syncAllFromFirestore();
      refreshAllData();
    } catch (error) {
      showToast("Google Sign-In failed.", "error");
      addTerminalLog("error", `AUTH_ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleAuthorizeDrive = async () => {
    try {
      const provider = new GoogleAuthProvider();
      DRIVE_SCOPES.forEach(scope => provider.addScope(scope));
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        setDriveAccessToken(credential.accessToken);
        showToast("Google Drive authorized successfully!", "success");
        addTerminalLog("success", "GOOGLE_DRIVE: Connection verified. Cloud snapshot storage authorized.");
      } else {
        throw new Error("No OAuth access token was returned.");
      }
      await AgunnayaDatabase.syncAllFromFirestore();
      refreshAllData();
    } catch (error) {
      showToast("Google Drive authorization failed.", "error");
      addTerminalLog("error", `DRIVE_AUTH_ERROR: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setDriveAccessToken(null); // Clear in-memory token cache on signout
      showToast("Signed out of Google account.", "info");
      refreshAllData();
    } catch (error) {
      showToast("Google Sign-Out failed.", "error");
    }
  };

  // Load real on-chain balances for connected wallet from Base Mainnet
  const syncWalletBalancesOnChain = async (addr: string) => {
    if (!addr) return;
    if (!ethers.isAddress(addr)) {
      addTerminalLog("info", `SYNC: Skipping live on-chain balance query (address ${String(addr).slice(0, 8)}... is simulated/invalid).`);
      return;
    }
    try {
      addTerminalLog("info", `SYNC: Querying native and AGL balances for ${addr.slice(0, 8)}... on Base Mainnet.`);
      const baseProvider = getBaseProvider();
      const ethBalRaw = await baseProvider.getBalance(addr);
      const ethBalance = parseFloat(ethers.formatEther(ethBalRaw));

      let aglBalance = 0;
      try {
        const aglTokenContract = new ethers.Contract(
          "0xea1221b4d80a89bd8c75248fae7c176bd1854698", 
          ["function balanceOf(address) external view returns (uint256)"], 
          baseProvider
        );
        const aglBalRaw = await aglTokenContract.balanceOf(addr);
        aglBalance = parseFloat(ethers.formatEther(aglBalRaw));
      } catch (e) {
        console.warn("AGL token on-chain fetch failed", e);
      }

      const currentWallet = AgunnayaDatabase.getWallet();
      const updatedWallet: WalletState = {
        ...currentWallet,
        balanceEth: ethBalance,
        aglTokenBalance: aglBalance,
      };
      AgunnayaDatabase.saveWallet(updatedWallet);
      setWallet(updatedWallet);
      refreshAllData();
      addTerminalLog("success", `SYNC_COMPLETE: Synced Base Mainnet. Balance: ${ethBalance.toFixed(4)} ETH, ${aglBalance.toLocaleString()} AGL`);
    } catch (err) {
      console.error("Failed to sync on-chain balances from Base Mainnet:", err);
      addTerminalLog("error", "SYNC_ERROR: Base Mainnet RPC connection timed out or failed.");
    }
  };

  const handleFundWallet = async () => {
    if (!wallet.isConnected || !wallet.address) {
      showToast("Please connect your wallet first in the header.", "error");
      return;
    }
    showToast("Synchronizing with Base Mainnet...", "info");
    addTerminalLog("info", "FAUCET_REDIRECT: Faucet claims are disabled on Base Mainnet. Querying live on-chain balances instead...");
    await syncWalletBalancesOnChain(wallet.address);
    showToast("Live Base Mainnet balances synchronized!", "success");
  };

  // Adds logs to terminal stream
  const addTerminalLog = (type: TerminalLine["type"], text: string) => {
    setTerminalLogs(prev => [...prev, { type, text }]);
  };

  const handleWalletConnect = async (type: "metamask" | "coinbase" | "walletconnect" | "smart") => {
    let address = "";
    let ethBalance = 0.0;
    let aglBalance = 0;

    if (typeof window !== "undefined" && (window as any).ethereum && (type === "metamask" || type === "coinbase" || type === "walletconnect")) {
      try {
        // Explicit request using standard eth_requestAccounts
        const accounts = await (window as any).ethereum.request({ method: "eth_requestAccounts" });
        if (accounts && accounts.length > 0) {
          address = accounts[0];
          addTerminalLog("success", `WALLET_CONNECT: Wallet account linked successfully via MetaMask / Injected Provider: ${address}`);
        }
      } catch (err: any) {
        showToast("Injected wallet connection failed. Connecting mock wallet instead.", "info");
        addTerminalLog("info", `WALLET_CONNECT: Injected wallet error: ${err.message || String(err)}`);
      }
    }

    if (!address) {
      address = "0x" + Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join("");
      if (type === "smart") {
        address = "0xAA" + Array.from({length: 38}, () => Math.floor(Math.random()*16).toString(16)).join("");
      }
      addTerminalLog("info", `WALLET_CONNECT: Injected provider not found/rejected. Generated demo address: ${address}`);
    }

    if (ethers.isAddress(address)) {
      // Now query real on-chain balance using JSON-RPC provider pointing to Base Mainnet!
      try {
        addTerminalLog("info", "FETCH_BALANCES: Querying native and AGL balances on Base Mainnet...");
        const baseProvider = getBaseProvider();
        const ethBalRaw = await baseProvider.getBalance(address);
        ethBalance = parseFloat(ethers.formatEther(ethBalRaw));

        // Query AGL balance
        try {
          const aglTokenContract = new ethers.Contract(
            "0xea1221b4d80a89bd8c75248fae7c176bd1854698", 
            ["function balanceOf(address) external view returns (uint256)"], 
            baseProvider
          );
          const aglBalRaw = await aglTokenContract.balanceOf(address);
          aglBalance = parseFloat(ethers.formatEther(aglBalRaw));
        } catch (e) {
          addTerminalLog("info", "FETCH_BALANCES: AGL token balance query failed on-chain.");
          aglBalance = 0;
        }
      } catch (err) {
        addTerminalLog("error", "FETCH_BALANCES: Base Mainnet RPC connection failed. Falling back to default balances.");
        ethBalance = 0.15;
        aglBalance = 500;
      }
    } else {
      addTerminalLog("info", "FETCH_BALANCES: Simulated wallet address layout is invalid. Skipping RPC balance query.");
      ethBalance = 0.15;
      aglBalance = 500;
    }

    const newWallet: WalletState = {
      isConnected: true,
      address,
      balanceEth: ethBalance,
      aglTokenBalance: aglBalance,
      isSmartAccount: type === "smart",
      walletType: type,
      sponsoredGasEth: type === "smart" ? 0.05 : 0,
      aglCredits: wallet.aglCredits || 500
    };

    AgunnayaDatabase.saveWallet(newWallet);
    setWallet(newWallet);
    setIsWalletModalOpen(false);

    addTerminalLog("success", `SECURE LINK: Wallet linked successfully. Address: ${address}. Balance: ${ethBalance.toFixed(4)} ETH, ${aglBalance.toLocaleString()} AGL`);

    // Process referral registration if there's an active referrer
    const activeRef = AgunnayaDatabase.getActiveReferrer();
    if (activeRef) {
      const actualReferrer = AgunnayaDatabase.registerReferral(address, activeRef);
      if (actualReferrer) {
        showToast(`Welcome! Registered under referrer 0x${actualReferrer.slice(2, 6)}...`, "success");
        addTerminalLog("success", `REFERRAL_COMPLETED: User referred successfully by 0x${actualReferrer.slice(2, 8)}...`);
      }
    }

    AgunnayaDatabase.addActivity({
      type: "vote",
      tokenSymbol: "ETH",
      tokenAddress: address,
      user: address,
      amount: 1,
      ethValue: 0,
      details: `Connected decentralized identity wallet (${type}) to Agunnaya Studio`
    });
    refreshAllData();
  };

  const handleWalletDisconnect = () => {
    const freshWallet: WalletState = {
      isConnected: false,
      address: "",
      balanceEth: 0,
      aglTokenBalance: 0,
      isSmartAccount: false,
      walletType: "metamask",
      sponsoredGasEth: 0,
      aglCredits: 0
    };
    AgunnayaDatabase.saveWallet(freshWallet);
    setWallet(freshWallet);
    addTerminalLog("system", "SECURE LINK: Wallet link severed by user.");
  };

  const handleSwitchNetwork = () => {
    addTerminalLog("info", "Switching between Base Sepolia and Base Mainnet networks...");
    setTimeout(() => {
      addTerminalLog("success", "Switched network safely. Reserves are compiled.");
    }, 800);
  };

  // Determine page metadata dynamically for Open Graph dynamic social sharing previews
  const getPageMetadata = () => {
    if (selectedToken) {
      return {
        title: `Trade ${selectedToken.name} (${selectedToken.symbol}) | Agunnaya Labs Studio`,
        description: `Join the dynamic bonding curve for ${selectedToken.name} (${selectedToken.symbol}). Market Cap: $${Math.floor(selectedToken.marketCap).toLocaleString()} USD. Deployed securely on Base.`,
        image: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&w=1200&q=80",
        url: `https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?token=${selectedToken.address}`
      };
    }

    switch (currentTab) {
      case "dashboard":
        return {
          title: "Dashboard | Agunnaya Labs Studio",
          description: "Monitor your connected Base smart accounts, token creations, active yield pools, on-chain agents, and recent studio transactions.",
          image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=dashboard"
        };
      case "explore":
        return {
          title: "Explore Bonding Curves | Agunnaya Labs Studio",
          description: "Discover hot decentralized assets, meme tokens, and innovative utility primitives deployed across Base Mainnet and Sepolia Sandbox.",
          image: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=explore"
        };
      case "ai-builder":
        return {
          title: "AI Architect & Token Launchpad | Agunnaya Labs Studio",
          description: "Describe custom smart contract logic in plain English to compile Solidity via Gemini AI or deploy new tokens to bonding curves instantly.",
          image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=ai-builder"
        };
      case "nfts":
        return {
          title: "NFT Generative Studio | Agunnaya Labs Studio",
          description: "Mint and host decentralized generative artwork collections with custom maximum supply parameters and dynamic base metadata structures.",
          image: "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=nfts"
        };
      case "daos":
        return {
          title: "Sovereign DAO Governance Builder | Agunnaya Labs Studio",
          description: "Build custom on-chain DAOs, register custom governance symbols, draft decentralization proposals, and cast weighted cryptographic votes.",
          image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=daos"
        };
      case "gamefi":
        return {
          title: "GameFi Quest Arena | Agunnaya Labs Studio",
          description: "Unlock seasonal developer battle passes, complete on-chain missions, level up dynamic achievements, and claim native AGL token bounties.",
          image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=gamefi"
        };
      case "ai-agents":
        return {
          title: "Autonomous AI Agent Studio | Agunnaya Labs Studio",
          description: "Deploy self-contained autonomous agent registry modules with specific prompt guidelines, set custom query fees, and track performance.",
          image: "https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=ai-agents"
        };
      case "defi":
        return {
          title: "AMM Token Swap & Staking | Agunnaya Labs Studio",
          description: "Perform instant low-slippage swaps between ETH and native AGL utility tokens or lock up liquidity in compounding high-yield staking vaults.",
          image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=defi"
        };
      case "analytics":
        return {
          title: "Real-Time Market Analytics | Agunnaya Labs Studio",
          description: "Track live trading volumes, transaction histories, price tickers, and advanced line charts powered by dynamic bonding curve calculations.",
          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=analytics"
        };
      case "admin":
        return {
          title: "Factory Tuning Parameters | Agunnaya Labs Studio",
          description: "Adjust global system configurations including curve fees, AA sponsorship maximum values, and view global node performance parameters.",
          image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=admin"
        };
      case "referrals":
        return {
          title: "Earn 20% Fee Share Rewards | Agunnaya Labs Studio",
          description: "Invite colleagues to deploy bonding curves or trade assets, and earn a massive 20% of all generated fees dynamically settled in AGL tokens.",
          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=referrals"
        };
      case "agl-credits":
        return {
          title: "AGL Credits On-Chain Burn Portal | Agunnaya Labs Studio",
          description: "Permanently burn AGL tokens to purchase low-latency compute credits recorded securely on Base Mainnet.",
          image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=agl-credits"
        };
      case "token-burner":
        return {
          title: "ERC-20 Token Burner & Deflation Engine | Agunnaya Labs Studio",
          description: "Connect your Web3 wallet, select portfolio or custom ERC-20 tokens, and execute verifiable null-address burn transactions on Base L2.",
          image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=token-burner"
        };
      case "staking-vault":
        return {
          title: "Automated AGL Staking Vaults (Base Mainnet) | Agunnaya Labs Studio",
          description: "Lock AGL tokens in automated smart contract vaults on Base Mainnet to earn high annual yield up to 72.5% APY with real-time compounding.",
          image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=staking-vault"
        };
      case "gas-dashboard":
        return {
          title: "Paymaster Gas Sponsorship Pad | Agunnaya Labs Studio",
          description: "Request free developer gas allowances and monitor Base L2 paymaster statistics.",
          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=gas-dashboard"
        };
      case "token-factory":
        return {
          title: "Token Factory Hub (Base Mainnet) | Agunnaya Labs Studio",
          description: "Deploy custom ERC20 tokens directly on Base Mainnet via smart contract Factory. View created tokens and inspect creators.",
          image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=token-factory"
        };
      default:
        return {
          title: "Agunnaya Labs Studio - High Performance Web3 Developer Studio",
          description: "The ultimate decentralized AI studio for smart contract creation, automated bonding curves, high APY staking, and sovereign agent hosting.",
          image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/"
        };
    }
  };

  // Render proper views
  const renderTabContent = () => {
    if (selectedToken) {
      return (
        <TradePage
          token={selectedToken}
          wallet={wallet}
          onBack={() => setSelectedToken(null)}
          onRefreshWallet={refreshAllData}
          terminalLogs={terminalLogs}
          addTerminalLog={addTerminalLog}
          showToast={showToast}
          priceAlerts={priceAlerts}
          onAddPriceAlert={handleAddPriceAlert}
          onDeletePriceAlert={handleDeletePriceAlert}
          firebaseUser={firebaseUser}
        />
      );
    }

    switch (currentTab) {
      case "dashboard":
        return (
          <DashboardPage
            wallet={wallet}
            userTokens={tokens}
            userNFTs={nfts}
            userDAOs={daos}
            userGameFi={games}
            userAgents={agents}
            activities={activities}
            onOpenConnect={() => setIsWalletModalOpen(true)}
            onSelectTab={(tab) => setCurrentTab(tab)}
          />
        );
      case "explore":
        return (
          <ExplorePage
            tokens={tokens}
            onSelectToken={(token) => setSelectedToken(token)}
          />
        );
      case "ai-builder":
        return (
          <CreatePage
            wallet={wallet}
            onLaunchSuccess={(newToken) => {
              refreshAllData();
              setSelectedToken(newToken); // directly open the trading page for new token!
            }}
            onRefreshWallet={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />
        );
      case "token-factory":
        return (
          <TokenFactoryPage
            wallet={wallet}
            showToast={showToast}
            onOpenConnectWallet={() => setIsWalletModalOpen(true)}
            addTerminalLog={addTerminalLog}
          />
        );
      case "nfts":
        return (
          <NFTStudioPage
            wallet={wallet}
            collections={nfts}
            onRefreshNFTs={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />
        );
      case "daos":
        return (
          <DAOBuilderPage
            wallet={wallet}
            daos={daos}
            onRefreshDAOs={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />
        );
      case "gamefi":
        return (
          <GameFiPage
            wallet={wallet}
            games={games}
            onRefreshGames={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />
        );
      case "ai-agents":
        return (
          <AgentStudioPage
            wallet={wallet}
            agents={agents}
            onRefreshAgents={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />
        );
      case "defi":
        return (
          <DeFiPage
            wallet={wallet}
            onRefreshWallet={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />
        );
      case "analytics":
        return (
          <AnalyticsPage
            tokens={tokens}
            onSelectToken={(token) => setSelectedToken(token)}
            priceAlerts={priceAlerts}
            onDeletePriceAlert={handleDeletePriceAlert}
          />
        );
      case "admin":
        return (
          <AdminPanelPage
            wallet={wallet}
            tokens={tokens}
            onRefreshTokens={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />
        );
      case "referrals":
        return (
          <ReferralPage
            wallet={wallet}
            onOpenConnect={() => setIsWalletModalOpen(true)}
            onRefreshWallet={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />
        );
      case "agl-credits":
        return (
          <AGLCreditsPage
            wallet={wallet}
            onRefreshWallet={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
            setWalletState={setWallet}
          />
        );
      case "token-burner":
        return (
          <TokenBurnerPage
            wallet={wallet}
            onOpenConnectWallet={() => setIsWalletModalOpen(true)}
            onRefreshWallet={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
            tokens={tokens}
          />
        );
      case "staking-vault":
        return (
          <StakingVaultPage
            wallet={wallet}
            onOpenConnectWallet={() => setIsWalletModalOpen(true)}
            onRefreshWallet={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />
        );
      case "gas-dashboard":
        return (
          <GasDashboardPage
            wallet={wallet}
            onRefreshWallet={refreshAllData}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
          />
        );
      case "task-sync":
        return (
          <TaskSyncPage
            wallet={wallet}
            showToast={showToast}
          />
        );
      case "gdrive":
        return (
          <GoogleDrivePage
            firebaseUser={firebaseUser}
            driveAccessToken={driveAccessToken}
            onAuthorizeDrive={handleAuthorizeDrive}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
            onRefreshAllData={refreshAllData}
          />
        );
      case "gmail":
        return (
          <GmailPage
            firebaseUser={firebaseUser}
            driveAccessToken={driveAccessToken}
            onAuthorizeDrive={handleAuthorizeDrive}
            addTerminalLog={addTerminalLog}
            showToast={showToast}
            wallet={wallet}
            onRefreshWallet={refreshAllData}
          />
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  const meta = getPageMetadata();

  if (!isLaunched) {
    return (
      <HelmetProvider>
        <Helmet>
          <title>Agunnaya Labs Studio - High Performance Web3 Developer Studio</title>
          <meta name="description" content="Decentralized on-chain developer studio with AI-powered builders, advanced DeFi swaps, staking, DAO voting tools, and smart token launchpads." />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Agunnaya Labs Studio" />
          <meta property="og:title" content="Agunnaya Labs Studio - High Performance Web3 Developer Studio" />
          <meta property="og:description" content="Decentralized on-chain developer studio with AI-powered builders, advanced DeFi swaps, staking, DAO voting tools, and smart token launchpads." />
          <meta property="og:image" content="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80" />
          <meta property="og:url" content="https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Agunnaya Labs Studio - High Performance Web3 Developer Studio" />
          <meta name="twitter:description" content="Decentralized on-chain developer studio with AI-powered builders, advanced DeFi swaps, staking, DAO voting tools, and smart token launchpads." />
          <meta name="twitter:image" content="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80" />
        </Helmet>
        <LandingPage onLaunchApp={() => setIsLaunched(true)} />
      </HelmetProvider>
    );
  }

  return (
    <HelmetProvider>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Agunnaya Labs Studio" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:image" content={meta.image} />
        <meta property="og:url" content={meta.url} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={meta.image} />
      </Helmet>
      <div id="studio-app-root" className="min-h-screen bg-[#050505] text-white flex overflow-hidden">
        {/* Side Navigation bar */}
        <Sidebar 
          currentTab={selectedToken ? "explore" : currentTab} 
          onSelectTab={(tab) => {
            setSelectedToken(null);
            setCurrentTab(tab);
          }} 
          isAdmin={wallet.isConnected}
          onGoHome={() => setIsLaunched(false)}
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main content viewport block */}
        <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
          {/* Atmospheric Background Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#0052FF] opacity-10 blur-[120px] pointer-events-none -z-10"></div>
          <div className="absolute bottom-0 left-20 w-[400px] h-[400px] bg-[#A855F7] opacity-10 blur-[120px] pointer-events-none -z-10"></div>
          
          {/* Upper Identity and Status header */}
          <Header
            wallet={wallet}
            onOpenConnect={() => setIsWalletModalOpen(true)}
            onDisconnect={handleWalletDisconnect}
            onFundWallet={handleFundWallet}
            network={network}
            setNetwork={(net) => {
              setNetwork(net);
              handleSwitchNetwork();
            }}
            tokens={tokens}
            nfts={nfts}
            agents={agents}
            onSelectToken={(token) => {
              setSelectedToken(token);
              setCurrentTab("explore");
            }}
            onSelectTab={(tab) => {
              setSelectedToken(null);
              setCurrentTab(tab);
            }}
            firebaseUser={firebaseUser}
            onSignInWithGoogle={handleSignInWithGoogle}
            onSignOut={handleSignOut}
            onOpenSidebar={() => setIsMobileSidebarOpen(true)}
          />

          {/* Viewport contents scroll area */}
          <main className="flex-1 overflow-y-auto p-6 max-w-7xl w-full mx-auto pb-24">
            {renderTabContent()}
          </main>

          {/* Bottom Activity Bar / Footer */}
          <footer className="h-12 border-t border-white/5 bg-[#050505] flex items-center px-8 justify-between shrink-0 text-zinc-500 text-[10px] font-mono">
            <div className="flex gap-8">
              <span>GAS: <span className="text-white">0.01 Gwei</span></span>
              <span>TXS: <span className="text-white">1.2k/min</span></span>
              <span>AGL STAKED: <span className="text-white">85%</span></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                <span className="font-bold text-white/60">SYSTEMS OPERATIONAL</span>
              </div>
            </div>
          </footer>
        </div>

        {/* Floating AI Drawer activator & Tooltip wrapper */}
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 pointer-events-none">
          {/* Persistent Prompt Assistant Tooltip */}
          <div 
            id="floating-ai-tooltip"
            onClick={() => setIsAIDrawerOpen(true)}
            className="bg-zinc-950/95 hover:bg-zinc-900 border border-brand-purple/40 hover:border-brand-purple text-zinc-100 text-[10px] md:text-xs font-semibold font-display px-3 py-2 rounded-xl shadow-xl shadow-black/85 flex items-center gap-2 transition-all duration-300 animate-tooltip-fade-in pointer-events-auto cursor-pointer select-none"
            title="Open AI Studio Prompt Assistant"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-purple opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-purple"></span>
            </span>
            <span>Prompt Assistant</span>
          </div>

          <div
            id="floating-ai-activator"
            onContextMenu={(e) => {
              e.preventDefault();
              setIsQuickActionsOpen((prev) => !prev);
            }}
            className="p-1.5 rounded-full bg-brand-purple/95 hover:bg-brand-purple text-white shadow-xl shadow-brand-purple/30 hover:shadow-2xl hover:shadow-brand-purple/70 transition-all duration-300 flex items-center gap-1.5 border border-white/20 pointer-events-auto relative cursor-pointer"
            title="Click for chat / copy / QR code • Right-click for Quick Developer Actions"
          >
            {/* Right-Click Quick Actions Developer Menu */}
            {isQuickActionsOpen && (
              <div
                id="floating-quick-actions"
                className="absolute bottom-full right-0 mb-3 w-72 p-2 bg-zinc-950/95 border border-purple-500/30 rounded-2xl shadow-2xl z-50 text-white font-sans backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-150 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Menu Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-1">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold font-display tracking-wide text-white">Quick Actions</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQuickActionsOpen(false)}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {/* Deploy Contract */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedToken(null);
                      setCurrentTab("create");
                      setIsQuickActionsOpen(false);
                      showToast("Navigated to Token & Contract Deployment Studio", "info");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-purple-500/15 hover:border-purple-500/30 border border-transparent text-left transition-all group/item"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 group-hover/item:text-purple-200 group-hover/item:scale-110 transition-all">
                        <Rocket className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover/item:text-purple-300 transition-colors">Deploy Contract</div>
                        <div className="text-[10px] text-zinc-400">Launch ERC-20, NFT or Bonding Curve</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover/item:text-white transition-colors" />
                  </button>

                  {/* View Analytics */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedToken(null);
                      setCurrentTab("analytics");
                      setIsQuickActionsOpen(false);
                      showToast("Opened Network & Bonding Curve Analytics", "info");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-purple-500/15 hover:border-purple-500/30 border border-transparent text-left transition-all group/item"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300 group-hover/item:text-blue-200 group-hover/item:scale-110 transition-all">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover/item:text-blue-300 transition-colors">View Analytics</div>
                        <div className="text-[10px] text-zinc-400 font-sans">Live metrics & bonding curve charts</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover/item:text-white transition-colors" />
                  </button>

                  {/* Open Terminal */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsTerminalModalOpen(true);
                      setIsQuickActionsOpen(false);
                      addTerminalLog("system", "DEVELOPER_TERMINAL: Opened interactive developer CLI console session.");
                      showToast("Developer Terminal Opened", "info");
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-purple-500/15 hover:border-purple-500/30 border border-transparent text-left transition-all group/item"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 group-hover/item:text-emerald-200 group-hover/item:scale-110 transition-all">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover/item:text-emerald-300 transition-colors">Open Terminal</div>
                        <div className="text-[10px] text-zinc-400 font-sans">Interactive CLI & event logs</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover/item:text-white transition-colors" />
                  </button>

                  {/* AI Prompt Advisor */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAIDrawerOpen(true);
                      setIsQuickActionsOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-purple-500/15 hover:border-purple-500/30 border border-transparent text-left transition-all group/item"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 group-hover/item:text-amber-200 group-hover/item:scale-110 transition-all">
                        <BrainCircuit className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover/item:text-amber-300 transition-colors">AI Prompt Advisor</div>
                        <div className="text-[10px] text-zinc-400 font-sans">Multimodal Web3 AI Chat Studio</div>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover/item:text-white transition-colors" />
                  </button>

                  {/* Lock Drawer Toggle */}
                  <button
                    type="button"
                    onClick={() => {
                      const nextState = !isDrawerLocked;
                      setIsDrawerLocked(nextState);
                      if (nextState) {
                        setIsAIDrawerOpen(true);
                        showToast("AI Assistant drawer locked & pinned open", "info");
                      } else {
                        showToast("AI Assistant drawer unlocked (auto-close active)", "info");
                      }
                      setIsQuickActionsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all group/item ${
                      isDrawerLocked
                        ? "bg-purple-500/20 border-purple-500/40"
                        : "hover:bg-purple-500/15 hover:border-purple-500/30 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`p-1.5 rounded-lg transition-all ${
                        isDrawerLocked
                          ? "bg-purple-500 text-white"
                          : "bg-purple-500/20 text-purple-300 group-hover/item:text-purple-200 group-hover/item:scale-110"
                      }`}>
                        {isDrawerLocked ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white group-hover/item:text-purple-300 transition-colors">
                          {isDrawerLocked ? "Unlock AI Drawer" : "Lock AI Drawer"}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-sans">
                          {isDrawerLocked ? "Allow drawer to auto-close" : "Pin drawer open on screen"}
                        </div>
                      </div>
                    </div>
                    <div className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
                      isDrawerLocked ? "bg-purple-500 justify-end" : "bg-purple-950/60 justify-start"
                    }`}>
                      <div className="w-3 h-3 rounded-full bg-white shadow-md" />
                    </div>
                  </button>
                </div>

                <div className="px-3 py-1.5 mt-1 border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                  <span>Right-click menu</span>
                  <span className="text-purple-400 font-bold">Base Mainnet</span>
                </div>
              </div>
            )}

            {/* Wallet QR Code Popover */}
            {isQRPopoverOpen && wallet.address && (
              <div 
                className="absolute bottom-full right-0 mb-3 w-72 p-4 bg-zinc-950 border border-white/20 rounded-2xl shadow-2xl z-50 text-white font-mono animate-in fade-in slide-in-from-bottom-2 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-brand-purple" />
                    <span className="text-xs font-bold font-display text-white">Wallet Address QR</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsQRPopoverOpen(false)}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* QR Code Container */}
                <div className="my-3 flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-900 border border-white/10">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(wallet.address)}&color=ffffff&bgcolor=18181b&margin=6`}
                    alt="Wallet Address QR Code"
                    className="w-40 h-40 rounded-lg shadow-inner object-contain"
                  />
                  <span className="mt-2 text-[10px] text-zinc-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    {wallet.walletType === "smart" ? "AA Smart Account" : "Base Mainnet EOA"}
                  </span>
                </div>

                {/* Address & Copy CTA */}
                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-zinc-900 border border-white/5 text-[10px] text-zinc-300 break-all text-center select-all">
                    {wallet.address}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="w-full py-2 px-3 rounded-xl bg-brand-purple hover:bg-purple-600 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-purple/20 active:scale-98"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span>Address Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Address String</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Copy Address Button */}
            {wallet.address && (
              <button
                type="button"
                onClick={handleCopyAddress}
                className="px-3 py-1.5 rounded-full bg-zinc-950/80 hover:bg-zinc-950 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all border border-white/10 active:scale-95 group/copy"
                title={`Copy wallet address (${wallet.address})`}
              >
                {copiedAddress ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] text-emerald-400 font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-purple-200 group-hover/copy:text-white transition-colors" />
                    <span className="text-[11px] font-bold tracking-tight">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </span>
                  </>
                )}
              </button>
            )}

            {/* QR Code Icon Button */}
            {wallet.address && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsQRPopoverOpen((prev) => !prev);
                }}
                className={`p-2 rounded-full text-white transition-all border border-white/10 active:scale-95 ${
                  isQRPopoverOpen
                    ? "bg-white text-brand-purple shadow-md scale-105"
                    : "bg-zinc-950/80 hover:bg-zinc-950 text-purple-200 hover:text-white"
                }`}
                title="Scan QR Code of wallet address"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Prompt Advisor Drawer Toggle */}
            <button
              type="button"
              onClick={() => setIsAIDrawerOpen(true)}
              className="p-2.5 rounded-full hover:bg-white/10 text-white flex items-center gap-2 group/ai transition-all"
              title="Open AI Studio Prompt Assistant"
            >
              <BrainCircuit className="w-5 h-5 animate-pulse text-purple-200 group-hover/ai:text-white" />
              <span className="text-xs font-semibold font-display hidden sm:inline-block">
                Prompt Advisor
              </span>
            </button>
          </div>
        </div>

        {/* Drawer Panel */}
        <AIAssistantSidebar 
          isOpen={isAIDrawerOpen} 
          onClose={() => setIsAIDrawerOpen(false)} 
          wallet={wallet}
          onRefreshWallet={refreshAllData}
          showToast={showToast}
          isLocked={isDrawerLocked}
          onToggleLock={() => {
            const next = !isDrawerLocked;
            setIsDrawerLocked(next);
            if (next) setIsAIDrawerOpen(true);
            showToast(next ? "AI Assistant drawer locked & pinned open" : "AI Assistant drawer unlocked", "info");
          }}
        />

        {/* Developer Terminal Console Modal Overlay */}
        {isTerminalModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-4xl h-[78vh] bg-zinc-950 border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 bg-zinc-900/80">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold font-mono text-white">Developer System Terminal</h3>
                    <p className="text-[11px] text-zinc-400 font-mono">Real-time RPC event stream & interactive Web3 CLI</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTerminalModalOpen(false)}
                  className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden p-2">
                <TerminalLog logs={terminalLogs} onClear={() => setTerminalLogs([])} />
              </div>
            </div>
          </div>
        )}

        {/* Wallet Connection Modal overlay */}
        <WalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          onConnect={handleWalletConnect}
          wallet={wallet}
          onRefreshWallet={refreshAllData}
          showToast={showToast}
        />

        {/* Toast notifications overlay */}
        {toast && (
          <div className="fixed top-20 right-6 z-50 animate-fade-in max-w-sm">
            <div className={`p-4 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md ${
              toast.type === "success" 
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-200 shadow-emerald-500/10" 
                : toast.type === "error" 
                  ? "bg-red-950/90 border-red-500/30 text-red-200 shadow-red-500/10" 
                  : "bg-zinc-900/90 border-white/10 text-zinc-200 shadow-black/40"
            }`}>
              <div className="flex-1 text-xs font-semibold leading-normal">
                {toast.message}
              </div>
              <button 
                onClick={() => setToast(null)} 
                className="text-zinc-500 hover:text-white font-bold text-xs"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>
    </HelmetProvider>
  );
}
