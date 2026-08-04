import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { HelmetProvider, Helmet } from "react-helmet-async";
import { User, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { collection, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { connectInjectedWallet, getAglBalance, getNativeBalance } from "./lib/contractClient";
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

// Database & Utilities
import { AgunnayaDatabase } from "./lib/db";
import { WalletState, Token, NFTCollection, DAO, GameFiProject, AIAgent, Activity, PriceAlert } from "./types";
import { TerminalLine } from "./components/TerminalLog";
import { BrainCircuit } from "lucide-react";

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

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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

  // Load real on-chain balances for connected wallet from the selected Base network
  const syncWalletBalancesOnChain = async (addr: string) => {
    if (!addr) return;
    try {
      addTerminalLog("info", `SYNC: Querying native and AGL balances for ${addr.slice(0, 8)}... on the selected Base network.`);
      const [ethValue, agl] = await Promise.all([getNativeBalance(addr), getAglBalance(addr)]);
      const ethBalance = Number(ethValue);
      const aglBalance = agl ? Number(agl.value) : 0;

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
    if (type === "smart") {
      showToast("Smart Account support requires a configured account-abstraction provider.", "info");
      addTerminalLog("error", "WALLET_CONNECT: Smart Account provider is not configured; no demo address was created.");
      return;
    }

    try {
      const connected = await connectInjectedWallet();
      const address = connected.address;
      addTerminalLog("success", `WALLET_CONNECT: Connected ${address} through the injected wallet provider.`);
      const [ethValue, agl] = await Promise.all([getNativeBalance(address), getAglBalance(address)]);
      const ethBalance = Number(ethValue);
      const aglBalance = agl ? Number(agl.value) : 0;

    const newWallet: WalletState = {
      isConnected: true,
      address,
      balanceEth: ethBalance,
      aglTokenBalance: aglBalance,
      isSmartAccount: false,
      walletType: type,
      sponsoredGasEth: 0,
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
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wallet connection failed.";
      showToast(message, "error");
      addTerminalLog("error", `WALLET_CONNECT_ERROR: ${message}`);
    }
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
      case "gas-dashboard":
        return {
          title: "Paymaster Gas Sponsorship Pad | Agunnaya Labs Studio",
          description: "Request free developer gas allowances and monitor Base L2 paymaster statistics.",
          image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
          url: "https://ais-pre-co5l5sfwvl3kmcbjbxsv7j-290898077867.europe-west3.run.app/?tab=gas-dashboard"
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
      case "gas-dashboard":
        return (
          <GasDashboardPage
            wallet={wallet}
            onRefreshWallet={refreshAllData}
            addTerminalLog={addTerminalLog}
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

        {/* Floating AI Drawer activator */}
        <button
          id="floating-ai-activator"
          onClick={() => setIsAIDrawerOpen(true)}
          className="fixed bottom-6 right-6 p-4 rounded-full bg-brand-purple hover:bg-purple-600 text-white shadow-2xl shadow-brand-purple/40 hover:scale-105 transition-all z-40 flex items-center gap-2 group border border-white/10"
        >
          <BrainCircuit className="w-5 h-5 animate-pulse" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-xs font-semibold font-display">
            Prompt Advisor
          </span>
        </button>

        {/* Drawer Panel */}
        <AIAssistantSidebar 
          isOpen={isAIDrawerOpen} 
          onClose={() => setIsAIDrawerOpen(false)} 
          wallet={wallet}
          onRefreshWallet={refreshAllData}
          showToast={showToast}
        />

        {/* Wallet Connection Modal overlay */}
        <WalletModal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          onConnect={handleWalletConnect}
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
