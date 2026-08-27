// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Wrapper.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title AGLVotesWrapper (wAGL)
 * @notice 1:1 Wrapped Governance Token for Agunnaya Labs Token (AGL).
 * @dev Wraps underlying AGL token at 0xea1221b4d80a89bd8c75248fae7c176bd1854698 to provide
 *      historical checkpointing, delegation, and snapshot voting capabilities compliant with
 *      OpenZeppelin Governor, Tally, and Compound-style IVotes standards.
 *
 * Deposit 1 AGL -> Mint 1 wAGL
 * Burn 1 wAGL  -> Withdraw 1 AGL
 * No transfer fees, no mint outside deposit, 100% backed by locked AGL.
 */
contract AGLVotesWrapper is ERC20, ERC20Wrapper, ERC20Votes, ERC20Permit {
    constructor(IERC20 underlyingToken)
        ERC20("Wrapped Agunnaya Labs Token", "wAGL")
        ERC20Wrapper(underlyingToken)
        ERC20Permit("Wrapped Agunnaya Labs Token")
    {}

    /**
     * @dev Hook that is called for any token transfer. This includes minting and burning.
     */
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);
    }

    /**
     * @dev Returns the current nonce for `owner`. This value must be included whenever a signature
     *      is generated for {permit}.
     */
    function nonces(address owner)
        public
        view
        virtual
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     */
    function decimals()
        public
        view
        virtual
        override(ERC20, ERC20Wrapper)
        returns (uint8)
    {
        return super.decimals();
    }
}
