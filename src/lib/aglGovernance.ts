import { ethers } from "ethers";
import { AGL_TOKEN_ADDRESS, AGL_TOKEN_ABI } from "./aglContracts";

/**
 * Agunnaya Labs Official DAO Governance Architecture on Base Mainnet
 * - Token: AGL (0xea1221b4d80a89bd8c75248fae7c176bd1854698)
 * - Wrapped Governance Token: wAGL (AGLVotesWrapper)
 * - Timelock: TimelockController (48h minimum delay, self-governed)
 * - Governor: AgunnayaDAO (4% Quorum, 1-day delay, 5-day voting, 1M wAGL threshold)
 */

// Deployment Addresses (loaded from deployment or active environment)
export const AGL_VOTES_WRAPPER_ADDRESS = "0xA27C9BA04D06EcAF766EF4e074b403DAf19A3d69";
export const AGL_TIMELOCK_ADDRESS = "0x900D315C91D9e54F3fa3412D475009d905bf6744";
export const AGL_DAO_GOVERNOR_ADDRESS = "0x3fFCb92A17caeaAd1342DD76978b566C8aEC7010";

export const GOVERNANCE_CONFIG = {
  timelockMinDelaySeconds: 172800, // 48 Hours
  quorumBps: 400, // 4%
  quorumPercentage: 4,
  votingDelayBlocks: 43200, // ~1 day (2s Base blocks)
  votingPeriodBlocks: 216000, // ~5 days (2s Base blocks)
  proposalThresholdTokens: 1000000, // 1,000,000 wAGL
  proposalThresholdWei: "1000000000000000000000000",
  network: "Base Mainnet",
  chainId: 8453,
  basescanExplorer: "https://basescan.org"
};

export enum ProposalState {
  Pending = 0,
  Active = 1,
  Canceled = 2,
  Defeated = 3,
  Succeeded = 4,
  Queued = 5,
  Expired = 6,
  Executed = 7
}

export interface ProposalRecord {
  id: string;
  proposalId: string;
  proposer: string;
  title: string;
  description: string;
  category: "Treasury" | "Parameter" | "Security" | "Grant" | "Ecosystem";
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
  startBlock: number;
  endBlock: number;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  forVotesFormatted: number;
  againstVotesFormatted: number;
  abstainVotesFormatted: number;
  totalVotesFormatted: number;
  quorum: string;
  quorumFormatted: number;
  quorumReached: boolean;
  state: ProposalState;
  stateName: "Pending" | "Active" | "Canceled" | "Defeated" | "Succeeded" | "Queued" | "Expired" | "Executed";
  eta?: number; // timestamp when timelock matures
  createdAt: string;
  executionTxHash?: string;
}

export interface UserGovPower {
  aglBalance: string;
  aglBalanceFormatted: number;
  wAglBalance: string;
  wAglBalanceFormatted: number;
  currentVotes: string;
  currentVotesFormatted: number;
  delegatedTo: string;
  isSelfDelegated: boolean;
  canPropose: boolean;
}

/**
 * AGLVotesWrapper Complete ABI
 */
export const AGL_VOTES_WRAPPER_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function underlying() view returns (address)",
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function depositFor(address account, uint256 amount) returns (bool)",
  "function withdrawTo(address account, uint256 amount) returns (bool)",
  "function getVotes(address account) view returns (uint256)",
  "function getPastVotes(address account, uint256 timepoint) view returns (uint256)",
  "function getPastTotalSupply(uint256 timepoint) view returns (uint256)",
  "function delegates(address account) view returns (address)",
  "function delegate(address delegatee)",
  "function nonces(address owner) view returns (uint256)",
  "function CLOCK_MODE() view returns (string)",
  "function clock() view returns (uint48)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)",
  "event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)",
  "event DelegateVotesChanged(address indexed delegate, uint256 previousVotes, uint256 newVotes)"
];

/**
 * AgunnayaDAO Governor ABI
 */
export const AGUNNAYA_DAO_ABI = [
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function COUNTING_MODE() view returns (string)",
  "function hashProposal(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) view returns (uint256)",
  "function state(uint256 proposalId) view returns (uint8)",
  "function proposalThreshold() view returns (uint256)",
  "function proposalSnapshot(uint256 proposalId) view returns (uint256)",
  "function proposalDeadline(uint256 proposalId) view returns (uint256)",
  "function proposalEta(uint256 proposalId) view returns (uint256)",
  "function proposalNeedsQueuing(uint256 proposalId) view returns (bool)",
  "function votingDelay() view returns (uint256)",
  "function votingPeriod() view returns (uint256)",
  "function quorum(uint256 blockNumber) view returns (uint256)",
  "function quorumNumerator() view returns (uint256)",
  "function quorumDenominator() view returns (uint256)",
  "function timelock() view returns (address)",
  "function token() view returns (address)",
  "function hasVoted(uint256 proposalId, address account) view returns (bool)",
  "function proposalVotes(uint256 proposalId) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)",
  "function propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)",
  "function queue(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
  "function execute(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) payable returns (uint256)",
  "function cancel(address[] targets, uint256[] values, bytes[] calldatas, bytes32 descriptionHash) returns (uint256)",
  "function castVote(uint256 proposalId, uint8 support) returns (uint256)",
  "function castVoteWithReason(uint256 proposalId, uint8 support, string reason) returns (uint256)",
  "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
  "event ProposalQueued(uint256 proposalId, uint256 etaSeconds)",
  "event ProposalExecuted(uint256 proposalId)",
  "event ProposalCanceled(uint256 proposalId)",
  "event VoteCast(address indexed voter, uint256 proposalId, uint8 support, uint256 weight, string reason)"
];

/**
 * TimelockController ABI
 */
export const TIMELOCK_CONTROLLER_ABI = [
  "function getMinDelay() view returns (uint256)",
  "function isOperation(bytes32 id) view returns (bool)",
  "function isOperationPending(bytes32 id) view returns (bool)",
  "function isOperationReady(bytes32 id) view returns (bool)",
  "function isOperationDone(bytes32 id) view returns (bool)",
  "function getTimestamp(bytes32 id) view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function getRoleAdmin(bytes32 role) view returns (bytes32)",
  "function hashOperation(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt) view returns (bytes32)",
  "function hashOperationBatch(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt) view returns (bytes32)",
  "function schedule(address target, uint256 value, bytes data, bytes32 predecessor, bytes32 salt, uint256 delay)",
  "function scheduleBatch(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt, uint256 delay)",
  "function execute(address target, uint256 value, bytes payload, bytes32 predecessor, bytes32 salt) payable",
  "function executeBatch(address[] targets, uint256[] values, bytes[] payloads, bytes32 predecessor, bytes32 salt) payable",
  "function cancel(bytes32 id)"
];

// Helper: Wrap AGL into wAGL
export async function wrapAglTokens(amount: string, signer: ethers.Signer, wrapperAddress = AGL_VOTES_WRAPPER_ADDRESS) {
  const parsed = ethers.parseUnits(amount, 18);
  const aglContract = new ethers.Contract(AGL_TOKEN_ADDRESS, AGL_TOKEN_ABI, signer);
  const wrapperContract = new ethers.Contract(wrapperAddress, AGL_VOTES_WRAPPER_ABI, signer);
  const userAddress = await signer.getAddress();

  // Check allowance
  const allowance = await aglContract.allowance(userAddress, wrapperAddress);
  if (allowance < parsed) {
    const approveTx = await aglContract.approve(wrapperAddress, ethers.MaxUint256);
    await approveTx.wait();
  }

  // Deposit into wrapper (mints 1:1 wAGL)
  const depositTx = await wrapperContract.depositFor(userAddress, parsed);
  const receipt = await depositTx.wait();
  return receipt?.hash || depositTx.hash;
}

// Helper: Unwrap wAGL back into AGL
export async function unwrapAglTokens(amount: string, signer: ethers.Signer, wrapperAddress = AGL_VOTES_WRAPPER_ADDRESS) {
  const parsed = ethers.parseUnits(amount, 18);
  const wrapperContract = new ethers.Contract(wrapperAddress, AGL_VOTES_WRAPPER_ABI, signer);
  const userAddress = await signer.getAddress();

  const withdrawTx = await wrapperContract.withdrawTo(userAddress, parsed);
  const receipt = await withdrawTx.wait();
  return receipt?.hash || withdrawTx.hash;
}

// Helper: Delegate Voting Power
export async function delegateVotingPower(delegateeAddress: string, signer: ethers.Signer, wrapperAddress = AGL_VOTES_WRAPPER_ADDRESS) {
  const wrapperContract = new ethers.Contract(wrapperAddress, AGL_VOTES_WRAPPER_ABI, signer);
  const tx = await wrapperContract.delegate(delegateeAddress);
  const receipt = await tx.wait();
  return receipt?.hash || tx.hash;
}

// Helper: Fetch User Governance Power & Balances
export async function fetchUserGovPower(userAddress: string, provider: ethers.Provider, wrapperAddress = AGL_VOTES_WRAPPER_ADDRESS): Promise<UserGovPower> {
  if (!userAddress || !ethers.isAddress(userAddress)) {
    return {
      aglBalance: "0",
      aglBalanceFormatted: 0,
      wAglBalance: "0",
      wAglBalanceFormatted: 0,
      currentVotes: "0",
      currentVotesFormatted: 0,
      delegatedTo: ethers.ZeroAddress,
      isSelfDelegated: false,
      canPropose: false,
    };
  }

  try {
    const aglContract = new ethers.Contract(AGL_TOKEN_ADDRESS, AGL_TOKEN_ABI, provider);
    const wrapperContract = new ethers.Contract(wrapperAddress, AGL_VOTES_WRAPPER_ABI, provider);

    const [aglBal, wAglBal, votes, delegatee] = await Promise.all([
      aglContract.balanceOf(userAddress).catch(() => 0n),
      wrapperContract.balanceOf(userAddress).catch(() => 0n),
      wrapperContract.getVotes(userAddress).catch(() => 0n),
      wrapperContract.delegates(userAddress).catch(() => ethers.ZeroAddress),
    ]);

    const aglFormatted = Number(ethers.formatUnits(aglBal, 18));
    const wAglFormatted = Number(ethers.formatUnits(wAglBal, 18));
    const votesFormatted = Number(ethers.formatUnits(votes, 18));

    return {
      aglBalance: aglBal.toString(),
      aglBalanceFormatted: aglFormatted,
      wAglBalance: wAglBal.toString(),
      wAglBalanceFormatted: wAglFormatted,
      currentVotes: votes.toString(),
      currentVotesFormatted: votesFormatted,
      delegatedTo: delegatee,
      isSelfDelegated: delegatee.toLowerCase() === userAddress.toLowerCase(),
      canPropose: votesFormatted >= GOVERNANCE_CONFIG.proposalThresholdTokens,
    };
  } catch (err) {
    console.error("Error fetching user gov power:", err);
    return {
      aglBalance: "0",
      aglBalanceFormatted: 0,
      wAglBalance: "0",
      wAglBalanceFormatted: 0,
      currentVotes: "0",
      currentVotesFormatted: 0,
      delegatedTo: ethers.ZeroAddress,
      isSelfDelegated: false,
      canPropose: false,
    };
  }
}
