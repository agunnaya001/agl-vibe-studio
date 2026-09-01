# 📜 Agunnaya Labs Smart Contracts (Base Mainnet & Sepolia)

This directory contains the production-grade Solidity smart contracts powering the Agunnaya Labs Studio ecosystem on Base (Chain ID: `8453`) and Base Sepolia testnet (Chain ID: `84532`).

---

## 🏛️ Deployed & Verified Contracts on Base Mainnet

| Contract | Description | Address | BaseScan Explorer |
| :--- | :--- | :--- | :--- |
| **AgunnayaDAO** | Decentralized Governance Governor contract with voting, timelock integration, and quorum execution | `0x3fFCb92A17caeaAd1342DD76978b566C8aEC7010` | [View on BaseScan](https://basescan.org/address/0x3fFCb92A17caeaAd1342DD76978b566C8aEC7010) |
| **TimelockController** | 24-hour Timelock execution controller securing DAO treasury and parameter mutations | `0x900D315C91D9e54F3fa3412D475009d905bf6744` | [View on BaseScan](https://basescan.org/address/0x900D315C91D9e54F3fa3412D475009d905bf6744) |
| **AGLVotesWrapper (wAGL)** | ERC20Votes wrapping contract enabling snapshot voting checkpoints for native $AGL | `0xA27C9BA04D06EcAF766EF4e074b403DAf19A3d69` | [View on BaseScan](https://basescan.org/address/0xA27C9BA04D06EcAF766EF4e074b403DAf19A3d69) |
| **AGL Token Factory** | Standard ERC-20 token launchpad & bonding curve deployment factory | `0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6` | [View on BaseScan](https://basescan.org/address/0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6) |
| **$AAIC (Agunnaya AI Core)** | Native AI compute and agent utility token on Base | `0xa19a0B2C7e00EB4e9619c0Bf1B1Ae00Ee23AB6B5` | [View on BaseScan](https://basescan.org/address/0xa19a0B2C7e00EB4e9619c0Bf1B1Ae00Ee23AB6B5) |

---

## 🔒 Security Standards & Verification

All contracts adhere strictly to:
1. **OpenZeppelin v5.0** audited standard contracts
2. **Checks-Effects-Interactions (CEI)** pattern across all state-mutating functions
3. **ReentrancyGuard** on all value-bearing and external call functions
4. **Ownable2Step** or AccessControl for two-step administrative key transfers
5. **Solidity 0.8.20+** built-in arithmetic overflow protection

---

## 🚀 Compilation & Hardhat Deployments

```bash
# Compile contracts with solc
npx hardhat compile

# Deploy full DAO system to Base Mainnet
npm run deploy:dao:hardhat

# Verify contract source code on BaseScan
npx hardhat verify --network base <DEPLOYED_CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```
