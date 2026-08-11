import { ethers } from "ethers";

/**
 * Standard OpenZeppelin-compatible ERC-20 Solidity source code for tokens deployed by the Token Factory.
 */
export const STANDARD_ERC20_SOL_SOURCE = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

/**
 * @title StandardERC20Token
 * @dev Standard ERC20 Token implementation deployed on Base Mainnet via Token Factory.
 */
contract StandardERC20Token is IERC20 {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public override totalSupply;

    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    address public owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(string memory _name, string memory _symbol, address _initialOwner) {
        name = _name;
        symbol = _symbol;
        owner = _initialOwner;
        
        uint256 initialSupply = 1_000_000_000 * 10**18; // 1,000,000,000 token default supply
        totalSupply = initialSupply;
        _balances[_initialOwner] = initialSupply;

        emit Transfer(address(0), _initialOwner, initialSupply);
        emit OwnershipTransferred(address(0), _initialOwner);
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 value) public override returns (bool) {
        require(to != address(0), "ERC20: transfer to zero address");
        require(_balances[msg.sender] >= value, "ERC20: transfer amount exceeds balance");

        _balances[msg.sender] -= value;
        _balances[to] += value;

        emit Transfer(msg.sender, to, value);
        return true;
    }

    function allowance(address ownerAddress, address spender) public view override returns (uint256) {
        return _allowances[ownerAddress][spender];
    }

    function approve(address spender, uint256 value) public override returns (bool) {
        require(spender != address(0), "ERC20: approve to zero address");

        _allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        require(from != address(0), "ERC20: transfer from zero address");
        require(to != address(0), "ERC20: transfer to zero address");
        require(_balances[from] >= value, "ERC20: transfer amount exceeds balance");
        require(_allowances[from][msg.sender] >= value, "ERC20: transfer amount exceeds allowance");

        _balances[from] -= value;
        _balances[to] += value;
        _allowances[from][msg.sender] -= value;

        emit Transfer(from, to, value);
        return true;
    }

    function burn(uint256 amount) public {
        require(_balances[msg.sender] >= amount, "ERC20: burn amount exceeds balance");
        _balances[msg.sender] -= amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
    }
}
`;

export interface VerificationResult {
  success: boolean;
  message: string;
  isAlreadyVerified?: boolean;
  guid?: string;
  basescanUrl?: string;
}

/**
 * Checks if a contract address on Base is already verified on BaseScan.
 */
export async function checkContractVerificationStatus(address: string): Promise<{
  isVerified: boolean;
  contractName?: string;
  compilerVersion?: string;
  sourceCode?: string;
}> {
  if (!address || !ethers.isAddress(address)) {
    return { isVerified: false };
  }

  try {
    const res = await fetch(`/api/basescan/check-verified?address=${address}`);
    if (!res.ok) return { isVerified: false };
    const data = await res.json();
    return data;
  } catch (err) {
    console.warn("Failed to check verification status:", err);
    return { isVerified: false };
  }
}

/**
 * Generates ABI-encoded constructor arguments for StandardERC20Token.
 */
export function encodeConstructorArguments(
  tokenName: string,
  tokenSymbol: string,
  ownerAddress: string = "0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6"
): string {
  try {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encoded = abiCoder.encode(
      ["string", "string", "address"],
      [tokenName || "Base Token", tokenSymbol || "BTKN", ownerAddress]
    );
    return encoded.slice(2); // Strip 0x
  } catch (err) {
    console.warn("Error encoding constructor args:", err);
    return "";
  }
}

/**
 * Submits source code verification to BaseScan API and polls for status.
 */
export async function verifyContractOnBaseScan(
  contractAddress: string,
  tokenName: string,
  tokenSymbol: string,
  creatorAddress?: string,
  customSourceCode?: string,
  onProgress?: (status: string) => void
): Promise<VerificationResult> {
  const basescanUrl = `https://basescan.org/address/${contractAddress}#code`;

  if (!contractAddress || !ethers.isAddress(contractAddress)) {
    return { success: false, message: "Invalid contract address provided.", basescanUrl };
  }

  if (onProgress) onProgress("Checking existing BaseScan verification status...");

  // Step 1: Check if already verified
  const check = await checkContractVerificationStatus(contractAddress);
  if (check.isVerified) {
    return {
      success: true,
      message: `Contract ${contractAddress.slice(0, 8)}... is already verified on BaseScan!`,
      isAlreadyVerified: true,
      basescanUrl
    };
  }

  if (onProgress) onProgress("Encoding constructor arguments and compiling source payload...");

  const sourceCode = customSourceCode || STANDARD_ERC20_SOL_SOURCE;
  const constructorArgsHex = encodeConstructorArguments(
    tokenName,
    tokenSymbol,
    creatorAddress && ethers.isAddress(creatorAddress) ? creatorAddress : "0x6EF504b98b4369C0a1aF4fD1885D7acCf843dDf6"
  );

  if (onProgress) onProgress("Submitting source code payload to BaseScan verification API...");

  try {
    const res = await fetch("/api/basescan/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractAddress,
        contractName: "StandardERC20Token",
        sourceCode,
        compilerVersion: "v0.8.20+commit.a1b79de6",
        optimizationUsed: "1",
        runs: "200",
        constructorArguments: constructorArgsHex
      })
    });

    const data = await res.json();

    if (data.isAlreadyVerified) {
      return {
        success: true,
        message: "Contract source code is already verified on BaseScan!",
        isAlreadyVerified: true,
        basescanUrl
      };
    }

    if (data.status !== "1" || !data.result) {
      // If status 0 but message contains success or verified
      const msgStr = (data.result || data.message || "").toString();
      if (msgStr.toLowerCase().includes("already verified") || msgStr.toLowerCase().includes("success")) {
        return {
          success: true,
          message: "Contract verified on BaseScan!",
          isAlreadyVerified: true,
          basescanUrl
        };
      }
      return {
        success: false,
        message: `BaseScan submission message: ${msgStr || "Failed to submit verification request."}`,
        basescanUrl
      };
    }

    const guid = data.result;
    if (onProgress) onProgress(`Verification submission queued on BaseScan (GUID: ${guid.slice(0, 10)}...). Polling status...`);

    // Step 3: Poll status for up to 30 seconds
    const maxPolls = 10;
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      if (onProgress) onProgress(`Checking BaseScan compiler status (${i + 1}/${maxPolls})...`);

      const statusRes = await fetch(`/api/basescan/status?guid=${guid}`);
      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const statusMsg = (statusData.result || statusData.message || "").toString();

      if (statusData.status === "1" || statusMsg.toLowerCase().includes("pass") || statusMsg.toLowerCase().includes("success")) {
        return {
          success: true,
          message: "Contract source code successfully verified on BaseScan!",
          guid,
          basescanUrl
        };
      } else if (statusMsg.toLowerCase().includes("fail") || statusData.status === "0") {
        if (statusMsg.toLowerCase().includes("pending") || statusMsg.toLowerCase().includes("in progress")) {
          // Keep polling
          continue;
        }
        return {
          success: false,
          message: `BaseScan verification output: ${statusMsg}`,
          guid,
          basescanUrl
        };
      }
    }

    return {
      success: true,
      message: "Verification submitted! BaseScan compilation is processing asynchronously. Check BaseScan in 1 minute.",
      guid,
      basescanUrl
    };
  } catch (err: any) {
    console.error("verifyContractOnBaseScan error:", err);
    return {
      success: false,
      message: `Error connecting to BaseScan API: ${err?.message || "Verification request failed"}`,
      basescanUrl
    };
  }
}
