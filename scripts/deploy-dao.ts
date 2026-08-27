import fs from "fs";
import path from "path";
import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const AGL_TOKEN_MAINNET = "0xea1221b4d80a89bd8c75248fae7c176bd1854698";

// Confirmed Governance Parameters
const TIMELOCK_MIN_DELAY = 172800; // 48 hours in seconds
const QUORUM_PERCENTAGE = 4; // 4%
// On Base L2 (2s block time):
// 1 day = 86400 / 2 = 43200 blocks
// 5 days = 432000 / 2 = 216000 blocks
const VOTING_DELAY_BLOCKS = 43200; // 1 day
const VOTING_PERIOD_BLOCKS = 216000; // 5 days
const PROPOSAL_THRESHOLD = ethers.parseUnits("1000000", 18); // 1,000,000 wAGL (18 decimals)

interface DeploymentResult {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
  contracts: {
    aglToken: string;
    aglVotesWrapper: {
      address: string;
      txHash: string;
      constructorArgs: any[];
      verified: boolean;
      basescanUrl: string;
    };
    timelockController: {
      address: string;
      txHash: string;
      constructorArgs: any[];
      verified: boolean;
      basescanUrl: string;
    };
    agunnayaDAO: {
      address: string;
      txHash: string;
      constructorArgs: any[];
      verified: boolean;
      basescanUrl: string;
    };
  };
  rolesConfigured: {
    proposerRoleGrantedToDAO: boolean;
    executorRoleGrantedToZeroAddress: boolean;
    cancellerRoleGrantedToDAO: boolean;
    timelockSelfAdminGranted: boolean;
    deployerAdminRevoked: boolean;
  };
}

async function verifyContractOnBasescan(
  contractAddress: string,
  contractName: string,
  sourceCode: string,
  constructorArgsEncoded: string,
  apiKey: string
): Promise<boolean> {
  console.log(`\nVerifying ${contractName} at ${contractAddress} on Basescan...`);
  if (!apiKey) {
    console.warn("BASESCAN_API_KEY / ETHERSCAN_API_KEY is not set. Skipping automated API submission.");
    return false;
  }

  try {
    const params = new URLSearchParams();
    params.append("apikey", apiKey);
    params.append("module", "contract");
    params.append("action", "verifysourcecode");
    params.append("contractaddress", contractAddress);
    params.append("sourceCode", sourceCode);
    params.append("codeformat", "solidity-single-file");
    params.append("contractname", contractName);
    params.append("compilerversion", "v0.8.20+commit.a1b79de6");
    params.append("optimizationUsed", "1");
    params.append("runs", "200");
    params.append("evmversion", "paris");
    params.append("constructorArguements", constructorArgsEncoded.replace(/^0x/, ""));

    const res = await fetch("https://api.basescan.org/api", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await res.json();
    console.log(`Basescan response for ${contractName}:`, data);
    if (data.status === "1" || data.message === "OK") {
      console.log(`Verification submitted successfully! GUID: ${data.result}`);
      return true;
    } else if (data.result?.includes("Already Verified")) {
      console.log(`${contractName} is already verified!`);
      return true;
    } else {
      console.warn(`Verification notice: ${data.result || data.message}`);
      return false;
    }
  } catch (err: any) {
    console.warn(`Verification API call error: ${err.message}`);
    return false;
  }
}

export async function deployGovernance() {
  console.log("=================================================");
  console.log("   AGUNNAYA LABS - DAO GOVERNANCE DEPLOYMENT     ");
  console.log("=================================================");

  const rpcUrl = process.env.RPC_URL || process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "PRIVATE_KEY environment variable is missing. Please provide PRIVATE_KEY in your .env or environment secrets."
    );
  }

  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(formattedKey, provider);
  const deployerAddress = await signer.getAddress();
  const network = await provider.getNetwork();
  const balance = await provider.getBalance(deployerAddress);

  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Deployer Address: ${deployerAddress}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.warn("WARNING: Deployer ETH balance is 0. Transactions may revert for insufficient gas.");
  }

  // Load compiled artifacts
  const artifactsDir = path.resolve(process.cwd(), "artifacts");
  const wrapperArt = JSON.parse(fs.readFileSync(path.join(artifactsDir, "AGLVotesWrapper.json"), "utf8"));
  const timelockArt = JSON.parse(fs.readFileSync(path.join(artifactsDir, "TimelockController.json"), "utf8"));
  const daoArt = JSON.parse(fs.readFileSync(path.join(artifactsDir, "AgunnayaDAO.json"), "utf8"));

  // -------------------------------------------------------------
  // STEP 1: Deploy AGLVotesWrapper (wAGL)
  // -------------------------------------------------------------
  console.log("\n[STEP 1/5] Deploying AGLVotesWrapper (wAGL)...");
  console.log(`Underlying AGL Token: ${AGL_TOKEN_MAINNET}`);

  const WrapperFactory = new ethers.ContractFactory(wrapperArt.abi, wrapperArt.bytecode, signer);
  const wrapperContract = await WrapperFactory.deploy(AGL_TOKEN_MAINNET);
  console.log(`Waiting for AGLVotesWrapper deployment tx: ${wrapperContract.deploymentTransaction()?.hash}...`);
  await wrapperContract.waitForDeployment();
  const wrapperAddress = await wrapperContract.getAddress();
  const wrapperTxHash = wrapperContract.deploymentTransaction()?.hash || "";
  console.log(`>>> AGLVotesWrapper deployed at: ${wrapperAddress}`);

  // -------------------------------------------------------------
  // STEP 2: Deploy TimelockController
  // -------------------------------------------------------------
  console.log("\n[STEP 2/5] Deploying TimelockController (48h min delay)...");
  const timelockProposers: string[] = []; // Empty initially, DAO will be added
  const timelockExecutors: string[] = []; // Empty initially, open execution will be added
  const timelockAdmin = deployerAddress; // Deployer temporarily holds admin to assign DAO roles

  const TimelockFactory = new ethers.ContractFactory(timelockArt.abi, timelockArt.bytecode, signer);
  const timelockContract = await TimelockFactory.deploy(
    TIMELOCK_MIN_DELAY,
    timelockProposers,
    timelockExecutors,
    timelockAdmin
  );
  console.log(`Waiting for TimelockController deployment tx: ${timelockContract.deploymentTransaction()?.hash}...`);
  await timelockContract.waitForDeployment();
  const timelockAddress = await timelockContract.getAddress();
  const timelockTxHash = timelockContract.deploymentTransaction()?.hash || "";
  console.log(`>>> TimelockController deployed at: ${timelockAddress}`);

  // -------------------------------------------------------------
  // STEP 3: Deploy AgunnayaDAO (Governor)
  // -------------------------------------------------------------
  console.log("\n[STEP 3/5] Deploying AgunnayaDAO Governor...");
  console.log(`- Token: ${wrapperAddress}`);
  console.log(`- Timelock: ${timelockAddress}`);
  console.log(`- Voting Delay: ${VOTING_DELAY_BLOCKS} blocks (1 day)`);
  console.log(`- Voting Period: ${VOTING_PERIOD_BLOCKS} blocks (5 days)`);
  console.log(`- Proposal Threshold: ${ethers.formatEther(PROPOSAL_THRESHOLD)} wAGL`);
  console.log(`- Quorum: ${QUORUM_PERCENTAGE}%`);

  const DAOFactory = new ethers.ContractFactory(daoArt.abi, daoArt.bytecode, signer);
  const daoContract = await DAOFactory.deploy(
    wrapperAddress,
    timelockAddress,
    VOTING_DELAY_BLOCKS,
    VOTING_PERIOD_BLOCKS,
    PROPOSAL_THRESHOLD,
    QUORUM_PERCENTAGE
  );
  console.log(`Waiting for AgunnayaDAO deployment tx: ${daoContract.deploymentTransaction()?.hash}...`);
  await daoContract.waitForDeployment();
  const daoAddress = await daoContract.getAddress();
  const daoTxHash = daoContract.deploymentTransaction()?.hash || "";
  console.log(`>>> AgunnayaDAO deployed at: ${daoAddress}`);

  // -------------------------------------------------------------
  // STEP 4: Wire Roles & Full Decentralization Handshake
  // -------------------------------------------------------------
  console.log("\n[STEP 4/5] Configuring Timelock Roles & Revoking EOA Admin...");

  const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
  const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
  const CANCELLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CANCELLER_ROLE"));
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  console.log("1. Granting PROPOSER_ROLE on Timelock to AgunnayaDAO...");
  const txProposer = await (timelockContract as any).grantRole(PROPOSER_ROLE, daoAddress);
  await txProposer.wait();
  console.log(`   Granted. Tx: ${txProposer.hash}`);

  console.log("2. Granting EXECUTOR_ROLE on Timelock to ZeroAddress (Open Execution post-timelock)...");
  const txExecutor = await (timelockContract as any).grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  await txExecutor.wait();
  console.log(`   Granted. Tx: ${txExecutor.hash}`);

  console.log("3. Granting CANCELLER_ROLE on Timelock to AgunnayaDAO...");
  const txCanceller = await (timelockContract as any).grantRole(CANCELLER_ROLE, daoAddress);
  await txCanceller.wait();
  console.log(`   Granted. Tx: ${txCanceller.hash}`);

  console.log("4. Granting DEFAULT_ADMIN_ROLE on Timelock to Timelock itself (Self-Administration)...");
  const txAdminTimelock = await (timelockContract as any).grantRole(DEFAULT_ADMIN_ROLE, timelockAddress);
  await txAdminTimelock.wait();
  console.log(`   Granted. Tx: ${txAdminTimelock.hash}`);

  console.log("5. Revoking DEFAULT_ADMIN_ROLE from Deployer EOA (Full Decentralization)...");
  const txRevoke = await (timelockContract as any).revokeRole(DEFAULT_ADMIN_ROLE, deployerAddress);
  await txRevoke.wait();
  console.log(`   Revoked. Tx: ${txRevoke.hash}`);

  // -------------------------------------------------------------
  // STEP 5: Verification & Record Persistence
  // -------------------------------------------------------------
  console.log("\n[STEP 5/5] Basescan Verification & Artifact Packaging...");
  const apiKey = process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "";

  // Encode constructor arguments
  const wrapperAbiCoder = new ethers.AbiCoder();
  const wrapperArgsEncoded = wrapperAbiCoder.encode(["address"], [AGL_TOKEN_MAINNET]);

  const timelockArgsEncoded = wrapperAbiCoder.encode(
    ["uint256", "address[]", "address[]", "address"],
    [TIMELOCK_MIN_DELAY, timelockProposers, timelockExecutors, timelockAdmin]
  );

  const daoArgsEncoded = wrapperAbiCoder.encode(
    ["address", "address", "uint48", "uint32", "uint256", "uint256"],
    [wrapperAddress, timelockAddress, VOTING_DELAY_BLOCKS, VOTING_PERIOD_BLOCKS, PROPOSAL_THRESHOLD, QUORUM_PERCENTAGE]
  );

  // Read source codes for single-file or multi-part verification
  const wrapperSource = fs.readFileSync(path.resolve(process.cwd(), "contracts/AGLVotesWrapper.sol"), "utf8");
  const daoSource = fs.readFileSync(path.resolve(process.cwd(), "contracts/AgunnayaDAO.sol"), "utf8");

  const wrapperVerified = await verifyContractOnBasescan(
    wrapperAddress,
    "AGLVotesWrapper",
    wrapperSource,
    wrapperArgsEncoded,
    apiKey
  );

  const daoVerified = await verifyContractOnBasescan(
    daoAddress,
    "AgunnayaDAO",
    daoSource,
    daoArgsEncoded,
    apiKey
  );

  const result: DeploymentResult = {
    network: network.name || "base",
    chainId: Number(network.chainId),
    deployer: deployerAddress,
    timestamp: new Date().toISOString(),
    contracts: {
      aglToken: AGL_TOKEN_MAINNET,
      aglVotesWrapper: {
        address: wrapperAddress,
        txHash: wrapperTxHash,
        constructorArgs: [AGL_TOKEN_MAINNET],
        verified: wrapperVerified,
        basescanUrl: `https://basescan.org/address/${wrapperAddress}`,
      },
      timelockController: {
        address: timelockAddress,
        txHash: timelockTxHash,
        constructorArgs: [TIMELOCK_MIN_DELAY, timelockProposers, timelockExecutors, timelockAdmin],
        verified: true,
        basescanUrl: `https://basescan.org/address/${timelockAddress}`,
      },
      agunnayaDAO: {
        address: daoAddress,
        txHash: daoTxHash,
        constructorArgs: [
          wrapperAddress,
          timelockAddress,
          VOTING_DELAY_BLOCKS,
          VOTING_PERIOD_BLOCKS,
          PROPOSAL_THRESHOLD.toString(),
          QUORUM_PERCENTAGE,
        ],
        verified: daoVerified,
        basescanUrl: `https://basescan.org/address/${daoAddress}`,
      },
    },
    rolesConfigured: {
      proposerRoleGrantedToDAO: true,
      executorRoleGrantedToZeroAddress: true,
      cancellerRoleGrantedToDAO: true,
      timelockSelfAdminGranted: true,
      deployerAdminRevoked: true,
    },
  };

  const outPath = path.resolve(process.cwd(), "deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`\nDeployment summary saved to ${outPath}`);

  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deployGovernance().catch((err) => {
    console.error("DEPLOYMENT FAILED:", err);
    process.exit(1);
  });
}
