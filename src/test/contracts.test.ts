import { describe, expect, it } from "vitest";
import { ethers } from "ethers";
import { BASE_NETWORKS, getExplorerTxUrl, isAddressConfigured } from "../lib/contracts";
import { toSlippageMinimum } from "../lib/contractClient";

describe("Base contract integration", () => {
  it("defines both Base networks with the correct chain IDs", () => {
    expect(BASE_NETWORKS.base.id).toBe(8453);
    expect(BASE_NETWORKS["base-sepolia"].id).toBe(84532);
  });

  it("validates contract addresses and builds explorer links", () => {
    const address = ethers.ZeroAddress.replace(/^0x0/, "0x1");
    expect(isAddressConfigured(address)).toBe(true);
    expect(isAddressConfigured(ethers.ZeroAddress)).toBe(false);
    expect(getExplorerTxUrl("0xabc", "base-sepolia")).toContain("sepolia.basescan.org/tx/0xabc");
  });

  it("calculates a bounded minimum output for slippage", () => {
    expect(toSlippageMinimum(10000n, 1)).toBe(9900n);
    expect(toSlippageMinimum(10000n, 100)).toBe(5000n);
  });
});
