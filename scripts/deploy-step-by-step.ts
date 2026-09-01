import dotenv from "dotenv";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { verifyContractStandardJson } from "./verify-basescan";

dotenv.config();

const AGL_TOKEN_MAINNET = "0xea1221b4d80a89bd8c75248fae7c176bd1854698";
const TIMELOCK_MIN_DELAY = 172800; // 48 Hours
const QUORUM_PERCENTAGE = 4; // 4%
const VOTING_DELAY_BLOCKS = 43200; // 1 day
const VOTING_PERIOD_BLOCKS = 216000; // 5 days

async function stepByStep() {
  console.log("=================================================");
  console.log("   STEP-BY-STEP LEAN GAS DEPLOYMENT & VERIFY     ");
  console.log("=================================================");

  const rpcUrl = process.env.RPC_URL || process.env.BASE_RPC_URL || "https://mainnet.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

  const deployer = await wallet.getAddress();
  const balance = await provider.getBalance(deployer);
  console.log(`Deployer Address: ${deployer}`);
  console.log(`Available Balance: ${ethers.formatEther(balance)} ETH (${balance.toString()} wei)`);

  const artifactsDir = path.resolve(process.cwd(), "artifacts");
  const wrapperArt = JSON.parse(fs.readFileSync(path.join(artifactsDir, "AGLVotesWrapper.json"), "utf8"));
  const timelockArt = JSON.parse(fs.readFileSync(path.join(artifactsDir, "TimelockController.json"), "utf8"));
  const daoArt = JSON.parse(fs.readFileSync(path.join(artifactsDir, "AgunnayaDAO.json"), "utf8"));

  const statePath = path.resolve(process.cwd(), "deploy-state.json");
  let state: any = {};
  if (fs.existsSync(statePath)) {
    try {
      state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    } catch (e) {}
  }

  // Helper for ultra-lean transaction execution
  async function executeLeanTx(factory: ethers.ContractFactory, args: any[], name: string) {
    const block = await provider.getBlock("latest");
    const baseFee = block?.baseFeePerGas || 5000000n;
    const priorityFee = 1000n; // minimal priority fee on Base
    const maxFee = baseFee + priorityFee;

    const deployTx = await factory.getDeployTransaction(...args);
    const estimatedGas = await provider.estimateGas({ ...deployTx, from: deployer });
    const gasLimit = estimatedGas + 3000n;
    const requiredCost = gasLimit * maxFee;

    const curBal = await provider.getBalance(deployer);
    console.log(`\nPreparing ${name}:`);
    console.log(`- BaseFee: ${baseFee} wei | MaxFee: ${maxFee} wei`);
    console.log(`- Estimated Gas: ${estimatedGas} | Gas Limit: ${gasLimit}`);
    console.log(`- Max Intrinsic Cost: ${requiredCost} wei (${ethers.formatEther(requiredCost)} ETH)`);
    console.log(`- Current Wallet Balance: ${curBal} wei (${ethers.formatEther(curBal)} ETH)`);

    if (curBal < requiredCost) {
      const shortfall = requiredCost - curBal;
      console.log(`\n>>> INSUFFICIENT BALANCE FOR ${name}:`);
      console.log(`>>> Need ${ethers.formatEther(shortfall)} more ETH (${shortfall.toString()} wei).`);
      return null;
    }

    console.log(`>>> Broadcasting deployment transaction for ${name}...`);
    const tx = await wallet.sendTransaction({
      ...deployTx,
      gasLimit,
      maxFeePerGas: maxFee,
      maxPriorityFeePerGas: priorityFee
    });

    console.log(`>>> Broadcasted: ${tx.hash}. Waiting for confirmation...`);
    const receipt = await tx.wait(1);
    const addr = receipt?.contractAddress || "";
    console.log(`>>> ${name} DEPLOYED AT: ${addr}`);
    return { address: addr, txHash: tx.hash, receipt };
  }

  // -------------------------------------------------------------
  // STEP 1: AGLVotesWrapper
  // -------------------------------------------------------------
  if (!state.wrapperAddress) {
    console.log("\n=================================================");
    console.log("[STEP 1/3] Deploying AGLVotesWrapper (wAGL)...");
    console.log("=================================================");
    const WrapperFactory = new ethers.ContractFactory(wrapperArt.abi, wrapperArt.bytecode, wallet);
    const res = await executeLeanTx(WrapperFactory, [AGL_TOKEN_MAINNET], "AGLVotesWrapper");
    if (!res) {
      console.log("\nPipeline paused at Step 1. Awaiting top-up.");
      return;
    }

    state.wrapperAddress = res.address;
    state.wrapperTx = res.txHash;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    const abiCoder = new ethers.AbiCoder();
    const wrapperArgsEncoded = abiCoder.encode(["address"], [AGL_TOKEN_MAINNET]);
    await verifyContractStandardJson(res.address, "AGLVotesWrapper", "AGLVotesWrapper", wrapperArgsEncoded);
  } else {
    console.log(`\n[STEP 1 COMPLETED & VERIFIED]: AGLVotesWrapper at ${state.wrapperAddress}`);
  }

  // -------------------------------------------------------------
  // STEP 2: TimelockController
  // -------------------------------------------------------------
  if (!state.timelockAddress) {
    console.log("\n=================================================");
    console.log("[STEP 2/3] Deploying TimelockController (48h Delay)...");
    console.log("=================================================");
    const TimelockFactory = new ethers.ContractFactory(timelockArt.abi, timelockArt.bytecode, wallet);
    const timelockArgs = [TIMELOCK_MIN_DELAY, [], [], deployer];
    const res = await executeLeanTx(TimelockFactory, timelockArgs, "TimelockController");
    if (!res) {
      console.log("\nPipeline paused at Step 2. Awaiting top-up.");
      return;
    }

    state.timelockAddress = res.address;
    state.timelockTx = res.txHash;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    const abiCoder = new ethers.AbiCoder();
    const timelockArgsEncoded = abiCoder.encode(
      ["uint256", "address[]", "address[]", "address"],
      timelockArgs
    );
    await verifyContractStandardJson(
      res.address,
      "@openzeppelin/contracts/governance/TimelockController.sol",
      "TimelockController",
      timelockArgsEncoded
    );
  } else {
    console.log(`\n[STEP 2 COMPLETED & VERIFIED]: TimelockController at ${state.timelockAddress}`);
  }

  // -------------------------------------------------------------
  // STEP 3: AgunnayaDAO
  // -------------------------------------------------------------
  if (!state.daoAddress) {
    console.log("\n=================================================");
    console.log("[STEP 3/3] Deploying AgunnayaDAO Governor...");
    console.log("=================================================");
    const PROPOSAL_THRESHOLD = ethers.parseUnits("1000000", 18);
    const DaoFactory = new ethers.ContractFactory(daoArt.abi, daoArt.bytecode, wallet);
    const daoArgs = [
      state.wrapperAddress,
      state.timelockAddress,
      VOTING_DELAY_BLOCKS,
      VOTING_PERIOD_BLOCKS,
      PROPOSAL_THRESHOLD,
      QUORUM_PERCENTAGE
    ];

    const res = await executeLeanTx(DaoFactory, daoArgs, "AgunnayaDAO");
    if (!res) {
      console.log("\nPipeline paused at Step 3. Awaiting top-up.");
      return;
    }

    state.daoAddress = res.address;
    state.daoTx = res.txHash;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

    const abiCoder = new ethers.AbiCoder();
    const daoArgsEncoded = abiCoder.encode(
      ["address", "address", "uint48", "uint32", "uint256", "uint256"],
      daoArgs
    );
    await verifyContractStandardJson(res.address, "AgunnayaDAO", "AgunnayaDAO", daoArgsEncoded);
  } else {
    console.log(`\n[STEP 3 COMPLETED & VERIFIED]: AgunnayaDAO at ${state.daoAddress}`);
  }

  // -------------------------------------------------------------
  // STEP 4: Timelock Role Assignment & EOA Revocation
  // -------------------------------------------------------------
  console.log("\n=================================================");
  console.log("[STEP 4] Configuring Roles & Handshake...");
  console.log("=================================================");
  const timelockContract = new ethers.Contract(state.timelockAddress, timelockArt.abi, wallet);
  const PROPOSER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PROPOSER_ROLE"));
  const EXECUTOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes("EXECUTOR_ROLE"));
  const CANCELLER_ROLE = ethers.keccak256(ethers.toUtf8Bytes("CANCELLER_ROLE"));
  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

  const hasProposer = await timelockContract.hasRole(PROPOSER_ROLE, state.daoAddress);
  if (!hasProposer) {
    console.log("Granting PROPOSER_ROLE to DAO...");
    const tx = await timelockContract.grantRole(PROPOSER_ROLE, state.daoAddress);
    await tx.wait(1);
    console.log("Granted PROPOSER_ROLE.");
  }

  const hasExecutor = await timelockContract.hasRole(EXECUTOR_ROLE, ethers.ZeroAddress);
  if (!hasExecutor) {
    console.log("Granting EXECUTOR_ROLE to ZeroAddress...");
    const tx = await timelockContract.grantRole(EXECUTOR_ROLE, ethers.ZeroAddress);
    await tx.wait(1);
    console.log("Granted EXECUTOR_ROLE.");
  }

  const hasCanceller = await timelockContract.hasRole(CANCELLER_ROLE, state.daoAddress);
  if (!hasCanceller) {
    console.log("Granting CANCELLER_ROLE to DAO...");
    const tx = await timelockContract.grantRole(CANCELLER_ROLE, state.daoAddress);
    await tx.wait(1);
    console.log("Granted CANCELLER_ROLE.");
  }

  const hasSelfAdmin = await timelockContract.hasRole(DEFAULT_ADMIN_ROLE, state.timelockAddress);
  if (!hasSelfAdmin) {
    console.log("Granting DEFAULT_ADMIN_ROLE to Timelock...");
    const tx = await timelockContract.grantRole(DEFAULT_ADMIN_ROLE, state.timelockAddress);
    await tx.wait(1);
    console.log("Granted DEFAULT_ADMIN_ROLE.");
  }

  const hasEoaAdmin = await timelockContract.hasRole(DEFAULT_ADMIN_ROLE, deployer);
  if (hasEoaAdmin) {
    console.log("Revoking DEFAULT_ADMIN_ROLE from Deployer EOA...");
    const tx = await timelockContract.revokeRole(DEFAULT_ADMIN_ROLE, deployer);
    await tx.wait(1);
    console.log("Revoked DEFAULT_ADMIN_ROLE from Deployer EOA.");
  }

  // Update src/lib/aglGovernance.ts
  try {
    const govLibPath = path.resolve(process.cwd(), "src/lib/aglGovernance.ts");
    if (fs.existsSync(govLibPath)) {
      let code = fs.readFileSync(govLibPath, "utf8");
      code = code.replace(/export const AGL_VOTES_WRAPPER_ADDRESS = "0x[a-fA-F0-9]+";/, `export const AGL_VOTES_WRAPPER_ADDRESS = "${state.wrapperAddress}";`);
      code = code.replace(/export const AGL_TIMELOCK_ADDRESS = "0x[a-fA-F0-9]+";/, `export const AGL_TIMELOCK_ADDRESS = "${state.timelockAddress}";`);
      code = code.replace(/export const AGL_DAO_GOVERNOR_ADDRESS = "0x[a-fA-F0-9]+";/, `export const AGL_DAO_GOVERNOR_ADDRESS = "${state.daoAddress}";`);
      fs.writeFileSync(govLibPath, code);
      console.log("Synced deployed addresses to src/lib/aglGovernance.ts");
    }
  } catch (e: any) {
    console.warn("Could not sync aglGovernance.ts:", e.message);
  }

  console.log("\n=================================================");
  console.log("   ALL CONTRACTS DEPLOYED & VERIFIED!            ");
  console.log("=================================================");
}

stepByStep().catch((e) => {
  console.error("Pipeline Execution Error:", e);
});
