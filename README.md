# 🌌 Agunnaya Labs Studio (v2.5)

<div align="left" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
  <img src="https://img.shields.io/badge/Ecosystem-Base_Mainnet-0052FF?style=for-the-badge&logo=base&logoColor=white" alt="Base Ecosystem" />
  <img src="https://img.shields.io/badge/Status-Production_Ready-22C55E?style=for-the-badge&logo=statuspage&logoColor=white" alt="Production Ready" />
  <img src="https://img.shields.io/badge/AI_Engine-Gemini_3.6_Flash-A855F7?style=for-the-badge&logo=google-gemini&logoColor=white" alt="Gemini Engine" />
  <img src="https://img.shields.io/badge/Contract_ABI-Standard_ERC20-3178C6?style=for-the-badge&logo=ethereum&logoColor=white" alt="Standard ERC20 ABI" />
  <img src="https://img.shields.io/badge/Database-Firebase_Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase Firestore" />
  <img src="https://img.shields.io/badge/Referrals-Earn_20%25_AGL-A855F7?style=for-the-badge&logo=gift&logoColor=white" alt="Referrals Active" />
</div>

> **The ultimate full-stack, AI-powered decentralized developer studio for Base Mainnet and Sepolia Sandbox.** Featuring standard OpenZeppelin-compatible ERC-20 ABIs, rich AI prompt suggestions across all creation modules, autonomous AI agent forge, linear bonding curve mathematics, account abstraction gas sponsorship, and real-time Firebase cloud database synchronization.

---

## 🎨 Visual Identity & Theme: *Immersive UI*

Agunnaya Labs Studio features a tailored **Immersive UI** design system built for high-density Web3 developer productivity:

*   **Atmospheric Ambient Glows**: Real-time canvas radial glows shifting dynamically between Base Blue (`#0052FF`) and Mystical Purple (`#A855F7`).
*   **Tactile Micro-Grid Layout**: Precision 1px border divisions (`border-white/10`) set against an ultra-dark background (`#050505`) with `#0a0a0a` sidebar containers.
*   **Vibrant Glassmorphism**: Interactive panels (`glass-panel`) with hover micro-transitions, glowing shadows, and responsive card geometry.
*   **Custom Toast Subsystem**: Native browser alerts are completely replaced by an animated Toast Notification Subsystem with clear-cut status borders and clear exit controls.
*   **Dual Network Flexibility**: Live toggle between **Base Mainnet** and **Sepolia Sandbox** with real-time status cues and mock faucets.

---

## 🚀 Core Features & Modules

### 1. 🧙‍♂️ AI Token Deployment Wizard & Smart Contract Architect
*   **AI Token Deployment Wizard**: Input natural language requirements (e.g. token name, symbol, supply, royalty fees, anti-whale caps, staking APY), and Gemini AI auto-synthesizes bonding curve slopes $k$, initial spot prices $P_0$, OpenZeppelin Solidity contract source code, and automated CEI security audit summaries.
*   **Interactive Price Trajectory Visualizer**: Recharts area chart rendering the proposed bonding curve trajectory up to Uniswap v3 liquidity graduation targets with real-time parameter fine-tuning sliders.
*   **1-Click Launch & Auto-Fill**: Transfer AI-proposed parameters directly to the launchpad form or trigger a 1-click deployment directly to Base Mainnet or Sepolia Sandbox.
*   **Gemini AI Contract Architect**: Describe desired token mechanics or contract specifications in plain English, and Gemini auto-assembles verified Solidity-inspired contracts.
*   **1-Click AI Suggestion Templates**: Instant prompt chips for Meme Coins, Staking Vault Tokens, AI Agent Cores, DAO Multi-Sig Hubs, and GameFi Reward Pools.
*   **On-Chain Bonding Curve**: Deploy ERC-20 tokens on a linear bonding curve ($P(S) = P_0 + k \cdot S$) with zero admin keys and instant liquidity provision.
*   **Standard ERC-20 ABI Compliance**: Built-in standard OpenZeppelin ABI support including `totalSupply()`, `allowance()`, `approve()`, `transfer()`, `transferFrom()`, `burn()`, and `Ownable` custom errors (`ERC20InsufficientBalance`, `ERC20InsufficientAllowance`, `OwnableUnauthorizedAccount`).

### 2. 📈 Bonding Curve Mathematical Analytics & Slippage Simulator
*   **Continuous Curve Visualizer**: Recharts multi-series area and line chart mapping price progression $P(S) = P_0 + k \cdot S$ with shaded trade execution windows.
*   **Slippage & Price Impact Metrics**: Real-time calculations comparing starting spot price ($P_{\text{start}}$), post-trade spot price ($P_{\text{end}}$), and expected average execution price ($P_{\text{avg}}$) with warning thresholds.
*   **Volume Sensitivity Heatmap Grid**: Interactive table detailing price impacts across various buy order volumes ($0.05$ to $5.0$ ETH) with 1-click order execution filling.
*   **Uniswap v3 DEX Graduation Meter**: Live tracker monitoring reserve growth toward the 10 ETH liquidity graduation target for automated AMM migration.
*   **Closed-Form Mathematical Specs**: On-screen reference displaying integral reserve equations $R(S) = P_0 S + \frac{1}{2} k S^2$ and exact closed-form square-root token minting logic.

### 3. 🧠 Autonomous AI Agent Studio & Persona Forge
*   **Agent Creation & Registration**: Forge autonomous AI workers with custom symbols, system prompt directives, and usage subscription fees (in ETH).
*   **Personality & Persona Configuration**: Fine-tune agent cognition with specific **Tone** (Professional, Witty, Concise, Friendly, Analytical), **Response Depth** (Short, Medium, Long), and **Personality Behaviors** (Skeptical, Self-Correcting, Enthusiastic, Minimalist, strictly Technical).
*   **Preset AI Agent Suggestions**: 1-click presets for Solidity Security Sentinel (`AUDIT`), DeFi Yield Scout (`YIELD`), and DAO Governance Advisor (`GOV`) with pre-configured cognitive personas.
*   **Multimodal AI Engine**: Direct integration with Gemini LLM, speech-to-text audio transcription, AI image generation, and video synthesis.
*   **Prompt Optimization Pipeline**: 1-click AI directive tuner that transforms simple descriptions into detailed autonomous cognitive instructions.

### 4. 📅 TaskSync: Autonomous Developer Synchronizer
*   **Cross-Chain Task Management**: Specialized module for tracking on-chain development tasks, audits, and deployments across the Base ecosystem.
*   **Priority-Based Queueing**: Organize workflows with High, Medium, and Low priority tiers and real-time status tracking (Pending, In-Progress, Completed).
*   **Draggable Dashboard Widget**: A persistent, pinned summary widget on the main dashboard providing 1-click visibility into the top 3 pending high-priority tasks.
*   **Local & Cloud Sync**: Seamless synchronization between browser LocalStorage and Firebase Firestore for persistent task history.

### 5. 🛡️ Automated Smart Contract Security Audit
*   **Deterministic Security Scans**: Run instant audits on any token deployed via the Token Factory.
*   **Vulnerability Detection**: Scans for standard risks including lack of ownership renouncement, hidden tax functions, blacklisting logic, and potential honeypot signatures.
*   **Security Score & Risk Profiling**: Receives a 0-100 Security Score and risk level (Low, Medium, High, Critical) with a detailed breakdown of passed and failed checks.
*   **Terminal Output Integration**: Audit results are streamed directly to the Interactive System Terminal for developer logging and record-keeping.

### 3. 💬 Categorized AI Web3 Advisor Drawer & Floating Developer Dock
*   **Floating AI Drawer**: Accessible from anywhere in the applet via the floating action button (`#floating-ai-activator`) or shortcut tooltips.
*   **Developer Quick Actions Menu**: Performing a right-click on `#floating-ai-activator` opens a sleek contextual menu for 1-click access to **Deploy Contract**, **View Analytics**, **Open Terminal**, and **AI Prompt Advisor**.
*   **Quick Copy Wallet Address**: 1-click clipboard button built directly into the floating dock with toast notifications and visual checkmark confirmations.
*   **Mobile Wallet QR Code Popover**: Clickable QR code button triggering a popover window displaying the active wallet's address as a QR code for mobile scanning, complete with wallet type tag (AA Smart / Base Mainnet EOA) and 1-click string copy.
*   **Interactive System Terminal Modal**: Access the full-featured Web3 CLI, RPC event streaming logs, custom themes (Classic Green, Amber, Monochrome), and command history via Quick Actions.
*   **Categorized Prompt Suggestions**: Instant 1-click queries powered by Gemini 3.6 Flash grouped into **Tokens & Curve**, **AI Agents**, and **DeFi & DAOs**.
*   **AGL Credit Metering**: Each AI query consumes 5 AGL Credits, fully backed on-chain or in the Sepolia Sandbox by burning AGL tokens.

### 4. 💼 Multi-Account Wallet Studio & Aggregate Portfolio Reserves
*   **Simultaneous Multi-Sub-Account Tracking**: Connect and track multiple sub-accounts (MetaMask EOA, Coinbase Wallet, WalletConnect, and Account Abstraction Smart Accounts) simultaneously in a unified Wallet Connection Modal.
*   **Aggregate Reserve Header Summary**: Live aggregate portfolio reserve header in the main application navigation bar displaying combined total ETH, AGL tokens, and AI Credits across all tracked sub-accounts.
*   **1-Click Account Switching & Internal Transfers**: Seamlessly switch active wallets or transfer ETH and AGL tokens between internal sub-accounts with zero latency.
*   **Sub-Account Faucet & Labeling**: Rename sub-accounts, fund balances via the testnet faucet, or link custom contract addresses.

### 5. 🔍 Real-Time Token Discovery & Contract Search
*   **Multi-Attribute Search Input**: Instant, real-time token search on the Explore page matching token names, ticker symbols (e.g. `AGL`, `ETH`), and 0x contract addresses (`0x...`).
*   **1-Click Copy Contract Address**: Integrated contract address bar on each token card with quick clipboard copying and checkmark confirmation.
*   **Clear Query & Filter Counters**: Displays live search result counts (`Showing X / Y tokens`) with a 1-click query clear button.

### 6. 🎁 20% Referral & Affiliate Engine
*   **Personalized Referral Aliases**: Personalize unique invite handles (e.g. `agl_neonalchemist`) linked to wallet signatures.
*   **20% Platform Fee Split**: Referrers earn exactly 20% of all bonding curve swaps and trading fees automatically in real-time AGL tokens.
*   **On-Chain Payout Claims**: Interactive dashboard tracking referred user signups, total volume generated, and instant claim settlements.

### 7. 🛡️ Pre-Trade Confirmation Modal & Fee Telemetry Overlay
*   **Total Cost Breakdown in ETH**: Instant calculation of total required ETH (token price + creator fees + estimated gas).
*   **Slippage & Price Impact Shield**: Live display of configured slippage tolerance, linear curve price impact %, and minimum guaranteed token output.
*   **Gas Speed & Account Abstraction Telemetry**: Displays selected gas tier (Standard, Fast, Instant, or 100% Sponsored AA Relayer) with live gwei estimates.

### 8. 🔀 Smart DEX Aggregator & Multi-Route Routing Engine
*   **Multi-DEX Rate Comparison**: Real-time quote aggregation across 1inch Aggregator V6, 0x Protocol / Matcha, Aerodrome Finance (Base Native), Uniswap V3, and Paraswap.
*   **Optimal Route Splitting**: Automatically computes multi-hop route split percentages (e.g., 65% Aerodrome + 35% Uniswap V3) to maximize output and minimize price impact for $AGL tokens.
*   **Gas & Execution Optimization**: Highlights lowest-gas routes, price impact metrics, MEV protection shields, and execution latency.

### 9. 🔥 ERC-20 Token Burner & Deflation Engine
*   **Portfolio & Custom Token Burning**: Select tokens directly from portfolio ($AGL, $USDC, $AERO, $cbETH) or input any custom Base ERC-20 contract address to inspect supply and execute burning.
*   **Dual Destination Mechanisms**: Send tokens to the standard unspendable EVM Dead Address (`0x000...dEaD`) to reduce total supply, or burn $AGL tokens to receive Agunnaya AI Studio Compute Credits.
*   **Cryptographic Proof of Burn Certificates**: Interactive verification certificates detailing burner address, null target, block number, transaction hash, and BaseScan explorer links.

### 10. 🏛️ Automated Smart Contract Staking Vaults & Live Yield Ticker
*   **Multi-Tier Vault Lockups**: Choose between Flex Saver (12.5% APY, zero lock), 30-Day Velocity Vault (28.5% APY), 90-Day High-Yield Vault (48.0% APY), and 180-Day Diamond Vault (72.5% APY).
*   **Real-Time Compounding Yield Ticker**: Live second-by-second yield accumulation ticker showing real-time earnings per position with 1-click Claim and Auto-Compound toggles.
*   **Yield & Compound Projection Calculator**: Interactive slide controls to simulate deposit amounts, time horizons, and calculate estimated daily, monthly, and 1-year yield projections.

### 5. 🏦 DeFi Engine, AMM Swapping & Staking Vaults
*   **Low-Slippage Swaps**: Instantly swap between ETH and native AGL utility tokens on Base Mainnet.
*   **Staking Vaults & Auto-Compound Engine**: Stake AGL in high-yield vaults (Flex, 30-Day, 90-Day, 180-Day) with fixed APRs up to 64%. Toggle the **Auto-Compound Rewards** switch to automatically reinvest accrued yield every 30 seconds or trigger 1-click manual compounding for amplified APY.
*   **Base Mainnet Airdrop & Treasury Sweep Tracker**: Monitor active token distribution sweeps and treasury multisigs (3/5 Safe) on Base Mainnet with real-time on-chain balance updates, verification badges, and historical sweep activity logs.

### 6. 🗳️ DAO Builder & Decentralized Governance
*   **Multi-Sig DAOs**: Create DAOs with custom proposal thresholds, quorum percentages, and lock durations.
*   **Cryptographic Voting**: Cast weighted ballots FOR or AGAINST proposals in real time with live voting power tallying.

### 7. 🎨 NFT Studio & Generative Arts
*   **ERC-721 Collections**: Deploy generative NFT collections with custom metadata schemas, IPFS image links, and public minting pricing.

### 8. 🎮 GameFi Arena & XP Rewards
*   **On-Chain Quests**: Complete quests (token swaps, DAO votes, staking) to earn XP points and claim seasonal AGL token bounties.

---

## 📜 Standard ERC-20 Contract ABI Reference

Agunnaya Labs Studio utilizes the standard OpenZeppelin ERC-20 contract ABI structure for seamless interoperability across Base Mainnet explorers (BaseScan), DEX routers (Uniswap/GeckoTerminal), and Web3 wallet providers (MetaMask, Coinbase Wallet):

```json
[
  { "inputs": [{ "internalType": "address", "name": "initialOwner", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "allowance", "type": "uint256" }, { "internalType": "uint256", "name": "needed", "type": "uint256" }], "name": "ERC20InsufficientAllowance", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "uint256", "name": "balance", "type": "uint256" }, { "internalType": "uint256", "name": "needed", "type": "uint256" }], "name": "ERC20InsufficientBalance", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "OwnableUnauthorizedAccount", "type": "error" },
  { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" },
  { "inputs": [], "name": "TOTAL_SUPPLY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address text-white" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
]
```

---

## 🛠️ System Architecture & Stack

*   **Frontend Framework**: React 19 + TypeScript, styled with Tailwind CSS (v4).
*   **Backend Proxy**: Express.js server providing bundle delivery and proxying server-side AI requests.
*   **AI Engine**: Google GenAI SDK (`@google/genai`) using secure server environment variables for Gemini API keys.
*   **Multi-Node Failover RPC Engine**: Built-in RPC failover handler with static network configuration (`chainId: 8453`) across Base Mainnet RPC providers (`mainnet.base.org`, `base.llamarpc.com`, `1rpc.io/base`, `base.drpc.org`, `developer-access-mainnet.base.org`) to guarantee high uptime and sub-second query speeds.
*   **Database**: Firebase Firestore (`ai-studio-agunnayalabsstud-dfe9e8c6-b14d-4481-85b1-f815054eab7d`) for session recovery and user records.
*   **Animations**: Fluid micro-animations powered by the `motion` framework.
*   **Data Visualization**: Financial charts and bonding curve trajectory visualizers built with `recharts`.

---

## 💻 Developer Scripts & Commands

Run and build the project locally or in container environments using standard npm commands:

| Command | Action |
| :--- | :--- |
| `npm run dev` | Boots up the local development server using `tsx` on port `3000`. |
| `npm run build` | Compiles frontend static assets with Vite and bundles the Node server to `dist/server.cjs` via `esbuild`. |
| `npm run start` | Launches the compiled, standalone production CommonJS server via `node dist/server.cjs`. |
| `npm run lint` | Runs type checks and code validation. |

---

<div align="center">
  <h3>✨ Agunnaya Labs Studio — Production Ready ✨</h3>
  <p>Built for high performance, modular security, and seamless developer user experience on Base Mainnet.</p>
</div>
