import hre from "hardhat";
import fs from "fs";
import path from "path";

/**
 * Agunnaya Labs - Base Mainnet Hardhat Deployment & Verification Script
 * 
 * Sequentially deploys:
 * 1. AGLVotesWrapper (wAGL - 1:1 voting wrapper for AGL)
 * 2. TimelockController (48h minimum delay, self-administered)
 * 3. AgunnayaDAO (Governor with 4% quorum, 1-day delay, 5-day voting, 1M wAGL threshold)
 * 4. Timelock Role Assignment & EOA Admin Revocation Handshake
 * 5. Automatic Basescan Contract Verification via hardhat-verify
 */

// Confirmed Governance Parameters on Base Mainnet
const AGL_TOKEN_MAINNET = "0xea1221b4d80a89bd8c75248fae7c176bd1854698";
const TIMELOCK_MIN_DELAY = 172800; // 48 Hours in seconds
const QUORUM_PERCENTAGE = 4; // 4%
// Base L2 block time is ~2 seconds:
// 1 day = 86,400s / 2s = 43,200 blocks
// 5 days = 432,000s / 2s = 216,000 blocks
const VOTING_DELAY_BLOCKS = 43200; // 1 day
const VOTING_PERIOD_BLOCKS = 216000; // 5 days

async function verifyContract(name: string, address: string, constructorArguments: any[]) {
  console.log(`\n--------------------------------------------------`);
  console.log(`Submitting Basescan verification for ${name} at ${address}...`);
  try {
    await (hre as any).run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log(`>>> ${name} successfully verified on Basescan!`);
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("already verified")) {
      console.log(`>>> ${name} is already verified.`);
    } else {
      console.warn(`>>> Verification notice for ${name}:`, error.message || error);
    }
  }
}

async function main() {
  console.log("=================================================");
  console.log("   AGUNNAYA LABS - HARDHAT DAO DEPLOYMENT        ");
  console.log("=================================================");

  const ethers = (hre as any).ethers;
  const networkObj = (hre as any).network;
  const networkName = networkObj?.name || "base";
  const PROPOSAL_THRESHOLD = ethers.parseUnits("1000000", 18); // 1,000,000 wAGL

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error("No deployer signer found. Please ensure PRIVATE_KEY is configured in your .env");
  }

  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);
  const net = await ethers.provider.getNetwork();

  console.log(`Network: ${networkName} (Chain ID: ${net.chainId})`);
  console.log(`Deployer Address: ${deployerAddress}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);
  console.log(`Underlying AGL Token: ${AGL_TOKEN_MAINNET}`);

  // -------------------------------------------------------------
  // STEP 1: Deploy AGLVotesWrapper (wAGL)
  // -------------------------------------------------------------
  console.log("\n[STEP 1/5] Deploying AGLVotesWrapper (wAGL)...");
  const wrapperArgs = [AGL_TOKEN_MAINNET];
  const AGLVotesWrapperFactory = await ethers.getContractFactory("AGLVotesWrapper");
  const aglVotesWrapper = await AGLVotesWrapperFactory.deploy(AGL_TOKEN_MAINNET);
  await aglVotesWrapper.waitForDeployment();
  const wrapperAddress = await aglVotesWrapper.getAddress();
  const wrapperTxHash = aglVotesWrapper.deploymentTransaction()?.hash || "";
  console.log(`>>> AGLVotesWrapper deployed at: ${wrapperAddress} (Tx: ${wrapperTxHash})`);

  // -------------------------------------------------------------
  // STEP 2: Deploy TimelockController (48h minimum delay)
  // -------------------------------------------------------------
  console.log("\n[STEP 2/5] Deploying TimelockController (48h min delay)...");
  const timelockProposers: string[] = []; // Proposer role will be granted to DAO Governor
  const timelockExecutors: string[] = []; // Executor role will be granted to open execution (address(0))
  const timelockAdmin = deployerAddress;  // Temporarily assigned to deployer to wire DAO roles

  const timelockArgs = [
    TIMELOCK_MIN_DELAY,
    timelockProposers,
    timelockExecutors,
    timelockAdmin
  ];

  const TimelockFactory = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockFactory.deploy(
    TIMELOCK_MIN_DELAY,
    timelockProposers,
    timelockExecutors,
    timelockAdmin
  );
  await timelock.waitForDeployment();
  const timelockAddress = await timelock.getAddress();
  const timelockTxHash = timelock.deploymentTransaction()?.hash || "";
  console.log(`>>> TimelockController deployed at: ${timelockAddress} (Tx: ${timelockTxHash})`);

  // -------------------------------------------------------------
  // STEP 3: Deploy AgunnayaDAO (Governor)
  // -------------------------------------------------------------
  console.log("\n[STEP 3/5] Deploying AgunnayaDAO Governor...");
  console.log(`- Token: ${wrapperAddress}`);
  console.log(`- Timelock: ${timelockAddress}`);
  console.log(`- Voting Delay: ${VOTING_DELAY_BLOCKS} blocks (~1 day)`);
  console.log(`- Voting Period: ${VOTING_PERIOD_BLOCKS} blocks (~5 days)`);
  console.log(`- Proposal Threshold: ${ethers.formatEther(PROPOSAL_THRESHOLD)} wAGL`);
  console.log(`- Quorum: ${QUORUM_PERCENTAGE}%`);

  const daoArgs = [
    wrapperAddress,
    timelockAddress,
    VOTING_DELAY_BLOCKS,
    VOTING_PERIOD_BLOCKS,
    PROPOSAL_THRESHOLD,
    QUORUM_PERCENTAGE
  ];

  const AgunnayaDAOFactory = await ethers.getContractFactory("AgunnayaDAO");
  const agunnayaDAO = await AgunnayaDAOFactory.deploy(
    wrapperAddress,
    timelockAddress,
    VOTING_DELAY_BLOCKS,
    VOTING_PERIOD_BLOCKS,
    PROPOSAL_THRESHOLD,
    QUORUM_PERCENTAGE
  );
  await agunnayaDAO.waitForDeployment();
  const daoAddress = await agunnayaDAO.getAddress();
  const daoTxHash = agunnayaDAO.deploymentTransaction()?.hash || "";
  console.log(`>>> AgunnayaDAO deployed at: ${daoAddress} (Tx: ${daoTxHash})`);

  // -------------------------------------------------------------
  // STEP 4: Timelock Role Assignment & EOA Admin Revocation
  // -------------------------------------------------------------
  console.log("\n[STEP 4/5] Configuring Timelock Roles & Revoking EOA Admin...");

  const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
  const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
  const CANCELLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CANCELLER_ROLE"));
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  console.log("1. Granting PROPOSER_ROLE on Timelock to AgunnayaDAO...");
  const txProposer = await timelock.grantRole(PROPOSER_ROLE, daoAddress);
  await txProposer.wait();
  console.log(`   Granted. (Tx: ${txProposer.hash})`);

  console.log("2. Granting EXECUTOR_ROLE on Timelock to ZeroAddress (Open Execution)...");
  const txExecutor = await timelock.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  await txExecutor.wait();
  console.log(`   Granted. (Tx: ${txExecutor.hash})`);

  console.log("3. Granting CANCELLER_ROLE on Timelock to AgunnayaDAO...");
  const txCanceller = await timelock.grantRole(CANCELLER_ROLE, daoAddress);
  await txCanceller.wait();
  console.log(`   Granted. (Tx: ${txCanceller.hash})`);

  console.log("4. Granting DEFAULT_ADMIN_ROLE (TIMELOCK_ADMIN_ROLE) to Timelock itself...");
  const txSelfAdmin = await timelock.grantRole(DEFAULT_ADMIN_ROLE, timelockAddress);
  await txSelfAdmin.wait();
  console.log(`   Granted self-administration. (Tx: ${txSelfAdmin.hash})`);

  console.log("5. Revoking DEFAULT_ADMIN_ROLE from Deployer EOA...");
  const txRevoke = await timelock.revokeRole(DEFAULT_ADMIN_ROLE, deployerAddress);
  await txRevoke.wait();
  console.log(`   Revoked EOA admin. (Tx: ${txRevoke.hash})`);

  // Verify Role Configuration
  const hasProposer = await timelock.hasRole(PROPOSER_ROLE, daoAddress);
  const hasExecutor = await timelock.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  const hasSelfAdmin = await timelock.hasRole(DEFAULT_ADMIN_ROLE, timelockAddress);
  const hasEoaAdmin = await timelock.hasRole(DEFAULT_ADMIN_ROLE, deployerAddress);

  console.log("\nDecentralization Role Check:");
  console.log(`- Proposer Role (DAO): ${hasProposer ? "ACTIVE" : "FAILED"}`);
  console.log(`- Executor Role (Public): ${hasExecutor ? "ACTIVE" : "FAILED"}`);
  console.log(`- Timelock Self-Admin: ${hasSelfAdmin ? "ACTIVE" : "FAILED"}`);
  console.log(`- Deployer EOA Admin Revoked: ${!hasEoaAdmin ? "CONFIRMED REVOKED" : "STILL ACTIVE (WARN)"}`);

  // Save deployment artifact summary
  const deploymentRecord = {
    network: networkName,
    chainId: Number(net.chainId),
    deployer: deployerAddress,
    timestamp: new Date().toISOString(),
    contracts: {
      aglToken: AGL_TOKEN_MAINNET,
      aglVotesWrapper: {
        address: wrapperAddress,
        txHash: wrapperTxHash,
        constructorArgs: wrapperArgs,
        basescanUrl: `https://basescan.org/address/${wrapperAddress}`
      },
      timelockController: {
        address: timelockAddress,
        txHash: timelockTxHash,
        constructorArgs: timelockArgs,
        basescanUrl: `https://basescan.org/address/${timelockAddress}`
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
          QUORUM_PERCENTAGE
        ],
        basescanUrl: `https://basescan.org/address/${daoAddress}`
      }
    },
    roles: {
      proposerRoleGrantedToDAO: hasProposer,
      executorRoleGrantedToPublic: hasExecutor,
      timelockSelfAdministered: hasSelfAdmin,
      deployerAdminRevoked: !hasEoaAdmin
    }
  };

  const outPath = path.resolve(process.cwd(), "deployments.json");
  fs.writeFileSync(outPath, JSON.stringify(deploymentRecord, null, 2));
  console.log(`\nDeployment configuration saved to ${outPath}`);

  // -------------------------------------------------------------
  // STEP 5: Basescan Contract Verification
  // -------------------------------------------------------------
  if (networkName !== "hardhat" && networkName !== "localhost") {
    console.log("\n[STEP 5/5] Initiating Basescan Verification via hardhat-verify...");
    console.log("Waiting 30 seconds for Basescan indexing...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    await verifyContract("AGLVotesWrapper", wrapperAddress, wrapperArgs);
    await verifyContract("TimelockController", timelockAddress, timelockArgs);
    await verifyContract("AgunnayaDAO", daoAddress, daoArgs);
  } else {
    console.log("\nSkipping verification on local hardhat network.");
  }

  console.log("\n=================================================");
  console.log("   DEPLOYMENT & VERIFICATION PIPELINE COMPLETE   ");
  console.log("=================================================");
}

main().catch((error) => {
  console.error("FATAL DEPLOYMENT ERROR:", error);
  process.exitCode = 1;
});
