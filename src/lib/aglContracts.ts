import { ethers } from "ethers";

/**
 * Agunnaya Labs Studio - Official Base Mainnet Contract Deployment Addresses & Complete ABIs
 */

// 1. AGL Utility Token (ERC-20)
export const AGL_TOKEN_ADDRESS = "0xEA1221b4d80a89bd8c75248fae7c176bd1854698";

// 2. AGL AI Computational Credits System Contract
export const AGL_CREDITS_ADDRESS = "0x13866F31c60822Ff70684213b9727915Ddf2c183";

// 3. AGL Staking & Yield Vault Contract
export const AGL_STAKING_ADDRESS = "0xd4B61B4876c15e78e0275EbA52cf62D55ED5fD30";

// 4. Agunnaya Token Factory Contract
export const TOKEN_FACTORY_ADDRESS = "0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6";

// 5. Official Agunnaya Treasury Wallet
export const AGL_TREASURY_ADDRESS = "0x725615639B760DAa64b3e794AA49B5A9a8A7632E";

// 6. Safe Wallet Multi-Sign Address
export const AGL_MULTISIG_SAFE_ADDRESS = "0x51546D5f9B66EcE7b6b91FA09D5b4aFF648D1e2d";

// 7. Base Mainnet Arena Ecosystem Contracts
export const ARENA_MARKETPLACE_ADDRESS = "0x67817157Dd6E5945ac2fAf1a822e7f1dE26C698E";
export const ARENA_TOKEN_ADDRESS = "0x3b855F88CB93aA642EaEB13F59987C552Fc614b5";
export const ARENA_CHAMPION_NFT_ADDRESS = "0x68f08b005b09B0F7D07E1c0B5CDe18E43CE2486A";
export const ARENA_BATTLE_ADDRESS = "0xF6fc2B6a306B626548ca9dF25B31a22D0f8971CF";
export const ARENA_PVP_ADDRESS = "0xd0C4Af12E95f9590e7314D079C58597771E57533";

export interface BaseEcosystemContractInfo {
  name: string;
  symbol?: string;
  address: string;
  purpose: string;
  category: "DeFi & Utility" | "Gaming & PvP" | "NFT Marketplace" | "Core Protocol";
  basescanUrl: string;
  isVerified: boolean;
}

export const BASE_MAINNET_ECOSYSTEM_CONTRACTS: BaseEcosystemContractInfo[] = [
  {
    name: "AGL Token",
    symbol: "AGL",
    address: AGL_TOKEN_ADDRESS,
    purpose: "Native platform utility token for AI compute, fee discounts, and governance",
    category: "DeFi & Utility",
    basescanUrl: `https://basescan.org/address/${AGL_TOKEN_ADDRESS}`,
    isVerified: true
  },
  {
    name: "ArenaToken",
    symbol: "ARENA",
    address: ARENA_TOKEN_ADDRESS,
    purpose: "Gaming & tournament token for arena battles, champion upgrades, and marketplace settlements",
    category: "Gaming & PvP",
    basescanUrl: `https://basescan.org/address/${ARENA_TOKEN_ADDRESS}`,
    isVerified: true
  },
  {
    name: "ArenaChampion",
    symbol: "ACHAMP",
    address: ARENA_CHAMPION_NFT_ADDRESS,
    purpose: "ERC-721 Gaming NFT collection representing battle champions with on-chain traits and stats",
    category: "Gaming & PvP",
    basescanUrl: `https://basescan.org/address/${ARENA_CHAMPION_NFT_ADDRESS}`,
    isVerified: true
  },
  {
    name: "ArenaMarketplace",
    address: ARENA_MARKETPLACE_ADDRESS,
    purpose: "Decentralized NFT trading platform for champions, weapons, and in-game artifacts",
    category: "NFT Marketplace",
    basescanUrl: `https://basescan.org/address/${ARENA_MARKETPLACE_ADDRESS}`,
    isVerified: true
  },
  {
    name: "ArenaBattle",
    address: ARENA_BATTLE_ADDRESS,
    purpose: "On-chain battle execution system, matchmaking engine, and combat calculation logic",
    category: "Gaming & PvP",
    basescanUrl: `https://basescan.org/address/${ARENA_BATTLE_ADDRESS}`,
    isVerified: true
  },
  {
    name: "ArenaPVP",
    address: ARENA_PVP_ADDRESS,
    purpose: "Decentralized PvP tournament brackets, entry stake escrows, and prize pool distribution",
    category: "Gaming & PvP",
    basescanUrl: `https://basescan.org/address/${ARENA_PVP_ADDRESS}`,
    isVerified: true
  }
];

/**
 * Complete, untruncated ABI for AGLTOKEN.sol (ERC-20 + Burn + Mint + Vesting)
 */
export const AGL_TOKEN_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "spender", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "from", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "to", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "ownerAddress", "type": "address" },
      { "internalType": "address", "name": "spender", "type": "address" }
    ],
    "name": "allowance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalBurned",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transfer",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "value", "type": "uint256" }
    ],
    "name": "transferFrom",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

/**
 * Complete, untruncated ABI for AGLCREDITS.sol (Computational Credit Mint & Purchase)
 */
export const AGL_CREDITS_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "aglBurned", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "creditsGranted", "type": "uint256" }
    ],
    "name": "CreditsBurned",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "ethAmount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "creditsGranted", "type": "uint256" }
    ],
    "name": "CreditsPurchased",
    "type": "event"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "aglAmount", "type": "uint256" }],
    "name": "burnAglForCredits",
    "outputs": [{ "internalType": "uint256", "name": "creditsGranted", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "creditAmount", "type": "uint256" }],
    "name": "buyCreditsWithEth",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "creditPriceEth",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "creditsPerAgl",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getCreditBalance",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address payable", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "withdrawEth",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "tokenAddress", "type": "address" },
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "withdrawToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

/**
 * Complete, untruncated ABI for AGLSTAKING.sol (Staking & Dynamic Yield Vault)
 */
export const AGL_STAKING_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "stakeIndex", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "RewardClaimed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "lockPeriodDays", "type": "uint256" }
    ],
    "name": "Staked",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "stakeIndex", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Unstaked",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "aprRate",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "user", "type": "address" },
      { "internalType": "uint256", "name": "stakeIndex", "type": "uint256" }
    ],
    "name": "calculateReward",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "stakeIndex", "type": "uint256" }],
    "name": "claimRewards",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "user", "type": "address" }],
    "name": "getUserStakes",
    "outputs": [
      {
        "components": [
          { "internalType": "uint256", "name": "amount", "type": "uint256" },
          { "internalType": "uint256", "name": "startTime", "type": "uint256" },
          { "internalType": "uint256", "name": "lockPeriodDays", "type": "uint256" },
          { "internalType": "uint256", "name": "lastClaimTime", "type": "uint256" },
          { "internalType": "bool", "name": "active", "type": "bool" }
        ],
        "internalType": "struct AGLStaking.Stake[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "rewardToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "internalType": "uint256", "name": "lockPeriodDays", "type": "uint256" }
    ],
    "name": "stake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "stakingToken",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalStaked",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "stakeIndex", "type": "uint256" }],
    "name": "unstake",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

/**
 * Complete, untruncated ABI for Tokenfactory.sol (Standard Token Deployer)
 */
export const TOKEN_FACTORY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "token", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "creator", "type": "address" },
      { "indexed": false, "internalType": "string", "name": "name", "type": "string" },
      { "indexed": false, "internalType": "string", "name": "symbol", "type": "string" }
    ],
    "name": "TokenCreated",
    "type": "event"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_symbol", "type": "string" }
    ],
    "name": "createToken",
    "outputs": [{ "internalType": "address", "name": "token", "type": "address" }],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTokenCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTokens",
    "outputs": [{ "internalType": "address[]", "name": "", "type": "address[]" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "tokenCreator",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "tokens",
    "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "stateMutability": "view",
    "type": "function"
  }
];

/**
 * Complete, official ABI for CoinbaseSmartWallet.sol (ERC-4337 Account Abstraction Smart Account)
 * Supports Passkey WebAuthn P256 keys, executeBatch, validateUserOp, multi-owner management, and ERC-1271 signatures.
 */
export const COINBASE_SMART_WALLET_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"inputs":[{"internalType":"bytes","name":"owner","type":"bytes"}],"name":"AlreadyOwner","type":"error"},
  {"inputs":[],"name":"Initialized","type":"error"},
  {"inputs":[{"internalType":"bytes","name":"owner","type":"bytes"}],"name":"InvalidEthereumAddressOwner","type":"error"},
  {"inputs":[{"internalType":"uint256","name":"key","type":"uint256"}],"name":"InvalidNonceKey","type":"error"},
  {"inputs":[{"internalType":"bytes","name":"owner","type":"bytes"}],"name":"InvalidOwnerBytesLength","type":"error"},
  {"inputs":[],"name":"LastOwner","type":"error"},
  {"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"NoOwnerAtIndex","type":"error"},
  {"inputs":[{"internalType":"uint256","name":"ownersRemaining","type":"uint256"}],"name":"NotLastOwner","type":"error"},
  {"inputs":[{"internalType":"bytes4","name":"selector","type":"bytes4"}],"name":"SelectorNotAllowed","type":"error"},
  {"inputs":[],"name":"Unauthorized","type":"error"},
  {"inputs":[],"name":"UnauthorizedCallContext","type":"error"},
  {"inputs":[],"name":"UpgradeFailed","type":"error"},
  {"inputs":[{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"bytes","name":"expectedOwner","type":"bytes"},{"internalType":"bytes","name":"actualOwner","type":"bytes"}],"name":"WrongOwnerAtIndex","type":"error"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"index","type":"uint256"},{"indexed":false,"internalType":"bytes","name":"owner","type":"bytes"}],"name":"AddOwner","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"index","type":"uint256"},{"indexed":false,"internalType":"bytes","name":"owner","type":"bytes"}],"name":"RemoveOwner","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"implementation","type":"address"}],"name":"Upgraded","type":"event"},
  {"stateMutability":"payable","type":"fallback"},
  {"inputs":[],"name":"REPLAYABLE_NONCE_KEY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"addOwnerAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"x","type":"bytes32"},{"internalType":"bytes32","name":"y","type":"bytes32"}],"name":"addOwnerPublicKey","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"bytes4","name":"functionSelector","type":"bytes4"}],"name":"canSkipChainIdValidation","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},
  {"inputs":[],"name":"domainSeparator","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"eip712Domain","outputs":[{"internalType":"bytes1","name":"fields","type":"bytes1"},{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"version","type":"string"},{"internalType":"uint256","name":"chainId","type":"uint256"},{"internalType":"address","name":"verifyingContract","type":"address"},{"internalType":"bytes32","name":"salt","type":"bytes32"},{"internalType":"uint256[]","name":"extensions","type":"uint256[]"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"entryPoint","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"target","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"execute","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"components":[{"internalType":"address","name":"target","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"bytes","name":"data","type":"bytes"}],"internalType":"struct CoinbaseSmartWallet.Call[]","name":"calls","type":"tuple[]"}],"name":"executeBatch","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"bytes[]","name":"calls","type":"bytes[]"}],"name":"executeWithoutChainIdValidation","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"components":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"bytes","name":"initCode","type":"bytes"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"uint256","name":"callGasLimit","type":"uint256"},{"internalType":"uint256","name":"verificationGasLimit","type":"uint256"},{"internalType":"uint256","name":"preVerificationGas","type":"uint256"},{"internalType":"uint256","name":"maxFeePerGas","type":"uint256"},{"internalType":"uint256","name":"maxPriorityFeePerGas","type":"uint256"},{"internalType":"bytes","name":"paymasterAndData","type":"bytes"},{"internalType":"bytes","name":"signature","type":"bytes"}],"internalType":"struct UserOperation","name":"userOp","type":"tuple"}],"name":"getUserOpHashWithoutChainId","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"implementation","outputs":[{"internalType":"address","name":"$","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes[]","name":"owners","type":"bytes[]"}],"name":"initialize","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"isOwnerAddress","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes","name":"account","type":"bytes"}],"name":"isOwnerBytes","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"x","type":"bytes32"},{"internalType":"bytes32","name":"y","type":"bytes32"}],"name":"isOwnerPublicKey","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"hash","type":"bytes32"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"isValidSignature","outputs":[{"internalType":"bytes4","name":"result","type":"bytes4"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"nextOwnerIndex","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"index","type":"uint256"}],"name":"ownerAtIndex","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"ownerCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"bytes","name":"owner","type":"bytes"}],"name":"removeLastOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"index","type":"uint256"},{"internalType":"bytes","name":"owner","type":"bytes"}],"name":"removeOwnerAtIndex","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"removedOwnersCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"bytes32","name":"hash","type":"bytes32"}],"name":"replaySafeHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[{"components":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"nonce","type":"uint256"},{"internalType":"bytes","name":"initCode","type":"bytes"},{"internalType":"bytes","name":"callData","type":"bytes"},{"internalType":"uint256","name":"callGasLimit","type":"uint256"},{"internalType":"uint256","name":"verificationGasLimit","type":"uint256"},{"internalType":"uint256","name":"preVerificationGas","type":"uint256"},{"internalType":"uint256","name":"maxFeePerGas","type":"uint256"},{"internalType":"uint256","name":"maxPriorityFeePerGas","type":"uint256"},{"internalType":"bytes","name":"paymasterAndData","type":"bytes"},{"internalType":"bytes","name":"signature","type":"bytes"}],"internalType":"struct UserOperation","name":"userOp","type":"tuple"},{"internalType":"bytes32","name":"userOpHash","type":"bytes32"},{"internalType":"uint256","name":"missingAccountFunds","type":"uint256"}],"name":"validateUserOp","outputs":[{"internalType":"uint256","name":"validationData","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"stateMutability":"payable","type":"receive"}
];

/**
 * Execute real token or ETH sweep to the official Agunnaya Treasury address on Base.
 */
export async function executeRealTokenSweepToTreasury(
  tokenAddressOrEth: string,
  amount: string,
  recipientAddress: string = AGL_TREASURY_ADDRESS
): Promise<{ txHash: string; recipient: string; amount: string }> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No injected Web3 provider found. Please connect MetaMask or Coinbase Wallet.");
  }

  const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
  const signer = await browserProvider.getSigner();

  // If tokenAddressOrEth is "ETH" or zero address, do native ETH sweep
  if (tokenAddressOrEth === "ETH" || tokenAddressOrEth === ethers.ZeroAddress) {
    const weiAmount = ethers.parseEther(amount);
    const tx = await signer.sendTransaction({
      to: recipientAddress,
      value: weiAmount
    });
    const receipt = await tx.wait();
    return {
      txHash: receipt?.hash || tx.hash,
      recipient: recipientAddress,
      amount: `${amount} ETH`
    };
  } else {
    // ERC-20 Token sweep
    const erc20Contract = new ethers.Contract(tokenAddressOrEth, AGL_TOKEN_ABI, signer);
    const decimals = await erc20Contract.decimals().catch(() => 18);
    const parsedAmount = ethers.parseUnits(amount, decimals);

    const tx = await erc20Contract.transfer(recipientAddress, parsedAmount);
    const receipt = await tx.wait();

    return {
      txHash: receipt?.hash || tx.hash,
      recipient: recipientAddress,
      amount: `${amount} Tokens`
    };
  }
}
