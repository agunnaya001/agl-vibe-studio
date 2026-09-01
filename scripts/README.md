# 🛠️ Agunnaya Labs Deployment & Verification Scripts

This directory contains deployment automation, on-chain verification, and contract interaction scripts for Agunnaya Labs Studio on Base Mainnet and Sepolia.

---

## 📜 Available Scripts

| Script | Purpose |
| :--- | :--- |
| `scripts/deploy-dao-hardhat.ts` | Orchestrates the complete end-to-end deployment of `AGLVotesWrapper`, `TimelockController`, and `AgunnayaDAO` on Base Mainnet with automatic role assignment and timelock renouncement. |
| `scripts/deploy-dao.ts` | Ethers.js standalone deployment pipeline with constructor parameter encoding and receipt logging. |
| `scripts/verify-basescan.ts` | BaseScan / Etherscan API verification script submitting multi-part or single Solidity source code to BaseScan for automated blue checkmark verification. |
| `scripts/compile-contracts.ts` | Custom solc compiler wrapper validating bytecode and ABI integrity prior to broadcast. |

---

## 🏃 Running Deployment

```bash
# Set your deployer private key and RPC in .env
PRIVATE_KEY="0x..."
BASE_RPC_URL="https://mainnet.base.org"
BASESCAN_API_KEY="YourBaseScanApiKey"

# Execute Hardhat deployment
npm run deploy:dao:hardhat
```
