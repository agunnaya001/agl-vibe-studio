// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/governance/Governor.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorCountingSimple.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotes.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorVotesQuorumFraction.sol";
import "@openzeppelin/contracts/governance/extensions/GovernorTimelockControl.sol";

/**
 * @title AgunnayaDAO
 * @notice Official DAO Governance contract for Agunnaya Labs on Base Mainnet.
 * @dev Implements standard OpenZeppelin v5 Governor suite with:
 *      - GovernorCountingSimple: standard For, Against, Abstain voting
 *      - GovernorVotes: ERC20Votes voting weight snapshots (wAGL)
 *      - GovernorVotesQuorumFraction: 4% dynamic quorum based on total wAGL supply
 *      - GovernorTimelockControl: 48-hour minimum delay queue and execution system
 *      - Immutable voting delay, voting period, and proposal threshold for peak gas efficiency
 */
contract AgunnayaDAO is
    Governor,
    GovernorCountingSimple,
    GovernorVotes,
    GovernorVotesQuorumFraction,
    GovernorTimelockControl
{
    uint48 public immutable initialVotingDelay;
    uint32 public immutable initialVotingPeriod;
    uint256 public immutable initialProposalThreshold;

    /**
     * @notice Constructor initializing AgunnayaDAO governance parameters.
     * @param _token The IVotes token contract (wAGL).
     * @param _timelock The TimelockController managing delayed execution of approved proposals.
     * @param _votingDelay Delay before voting starts after proposal submission (in seconds / blocks).
     * @param _votingPeriod Duration that voting remains active (in seconds / blocks).
     * @param _proposalThreshold Minimum wAGL required to submit a proposal (e.g. 1,000,000 wAGL).
     * @param _quorumNumeratorValue Quorum percentage as a fraction of 100 (e.g. 4 for 4%).
     */
    constructor(
        IVotes _token,
        TimelockController _timelock,
        uint48 _votingDelay,
        uint32 _votingPeriod,
        uint256 _proposalThreshold,
        uint256 _quorumNumeratorValue
    )
        Governor("Agunnaya DAO")
        GovernorCountingSimple()
        GovernorVotes(_token)
        GovernorVotesQuorumFraction(_quorumNumeratorValue)
        GovernorTimelockControl(_timelock)
    {
        initialVotingDelay = _votingDelay;
        initialVotingPeriod = _votingPeriod;
        initialProposalThreshold = _proposalThreshold;
    }

    function votingDelay() public view override returns (uint256) {
        return initialVotingDelay;
    }

    function votingPeriod() public view override returns (uint256) {
        return initialVotingPeriod;
    }

    function proposalThreshold() public view override returns (uint256) {
        return initialProposalThreshold;
    }

    function quorum(uint256 blockNumber)
        public
        view
        override(Governor, GovernorVotesQuorumFraction)
        returns (uint256)
    {
        return super.quorum(blockNumber);
    }

    function state(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (ProposalState)
    {
        return super.state(proposalId);
    }

    function proposalNeedsQueuing(uint256 proposalId)
        public
        view
        override(Governor, GovernorTimelockControl)
        returns (bool)
    {
        return super.proposalNeedsQueuing(proposalId);
    }

    function _queueOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint48)
    {
        return super._queueOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _executeOperations(
        uint256 proposalId,
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
    {
        super._executeOperations(proposalId, targets, values, calldatas, descriptionHash);
    }

    function _cancel(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        bytes32 descriptionHash
    )
        internal
        override(Governor, GovernorTimelockControl)
        returns (uint256)
    {
        return super._cancel(targets, values, calldatas, descriptionHash);
    }

    function _executor()
        internal
        view
        override(Governor, GovernorTimelockControl)
        returns (address)
    {
        return super._executor();
    }
}

