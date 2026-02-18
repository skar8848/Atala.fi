// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AtalaVault} from "../core/AtalaVault.sol";
import {IEVC} from "../interfaces/IEVC.sol";
import {IEulerVault} from "../interfaces/IEulerVault.sol";

/// @title AtalaAgent - Automated rebalancing agent for AtalaVaults
/// @notice Non-custodial: can ONLY rebalance between vaults, never withdraw to itself
/// @dev Registers as EVC accountOperator for the vault
contract AtalaAgent {
    // ============ Structs ============

    struct RebalanceParams {
        address vault;          // AtalaVault to rebalance
        AtalaVault.Allocation[] allocations; // Rebalance instructions
    }

    struct Threshold {
        uint256 minApyDiffBps;  // Min APY difference to trigger rebalance (basis points)
        uint256 maxIdleBps;     // Max idle ratio before auto-allocating (basis points)
    }

    // ============ State ============

    /// @notice Agent operator/owner
    address public owner;

    /// @notice EVC for batch operations
    IEVC public immutable evc;

    /// @notice Vaults this agent is authorized to manage
    mapping(address => bool) public managedVaults;

    /// @notice Rebalance thresholds per vault
    mapping(address => Threshold) public thresholds;

    /// @notice Keepers authorized to trigger rebalances
    mapping(address => bool) public keepers;

    // ============ Events ============

    event VaultManaged(address indexed vault, bool managed);
    event Rebalanced(address indexed vault, uint256 allocationsCount);
    event KeeperUpdated(address indexed keeper, bool authorized);
    event ThresholdUpdated(address indexed vault, uint256 minApyDiffBps, uint256 maxIdleBps);

    // ============ Errors ============

    error NotOwner();
    error NotKeeper();
    error VaultNotManaged();
    error ZeroAddress();

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyKeeper() {
        if (!keepers[msg.sender] && msg.sender != owner) revert NotKeeper();
        _;
    }

    // ============ Constructor ============

    /// @param _owner Agent owner
    /// @param _evc EVC address
    constructor(address _owner, address _evc) {
        if (_owner == address(0) || _evc == address(0)) revert ZeroAddress();
        owner = _owner;
        evc = IEVC(_evc);
        keepers[_owner] = true;
    }

    // ============ Management ============

    /// @notice Register this agent as a managed vault
    /// @dev The AtalaVault must have set this agent as allocator
    function manageVault(address vault) external onlyOwner {
        if (vault == address(0)) revert ZeroAddress();
        managedVaults[vault] = true;
        emit VaultManaged(vault, true);
    }

    /// @notice Stop managing a vault
    function unmanageVault(address vault) external onlyOwner {
        managedVaults[vault] = false;
        emit VaultManaged(vault, false);
    }

    /// @notice Set rebalance thresholds for a vault
    function setThreshold(address vault, uint256 minApyDiffBps, uint256 maxIdleBps) external onlyOwner {
        thresholds[vault] = Threshold({minApyDiffBps: minApyDiffBps, maxIdleBps: maxIdleBps});
        emit ThresholdUpdated(vault, minApyDiffBps, maxIdleBps);
    }

    /// @notice Add/remove a keeper
    function setKeeper(address keeper, bool authorized) external onlyOwner {
        keepers[keeper] = authorized;
        emit KeeperUpdated(keeper, authorized);
    }

    // ============ Rebalancing ============

    /// @notice Execute a rebalance on a managed AtalaVault
    /// @param vault The AtalaVault to rebalance
    /// @param allocations The rebalance instructions
    function rebalance(address vault, AtalaVault.Allocation[] calldata allocations) external onlyKeeper {
        if (!managedVaults[vault]) revert VaultNotManaged();

        AtalaVault(vault).reallocate(allocations);

        emit Rebalanced(vault, allocations.length);
    }

    /// @notice Batch rebalance multiple vaults
    function batchRebalance(RebalanceParams[] calldata params) external onlyKeeper {
        for (uint256 i = 0; i < params.length; i++) {
            if (!managedVaults[params[i].vault]) revert VaultNotManaged();
            AtalaVault(params[i].vault).reallocate(params[i].allocations);
            emit Rebalanced(params[i].vault, params[i].allocations.length);
        }
    }

    /// @notice Check if a vault should be rebalanced (view helper for keepers)
    /// @param vault The AtalaVault to check
    /// @return shouldRebalance Whether rebalancing is recommended
    /// @return idleRatioBps Current idle ratio in basis points
    function checkRebalanceNeeded(address vault)
        external
        view
        returns (bool shouldRebalance, uint256 idleRatioBps)
    {
        if (!managedVaults[vault]) return (false, 0);

        AtalaVault v = AtalaVault(vault);
        uint256 total = v.totalAssets();
        if (total == 0) return (false, 0);

        uint256 idleAmount = v.idle();
        idleRatioBps = (idleAmount * 10_000) / total;

        Threshold memory t = thresholds[vault];
        if (t.maxIdleBps > 0 && idleRatioBps > t.maxIdleBps) {
            shouldRebalance = true;
        }
    }

    // ============ Safety ============

    /// @notice This contract should never hold tokens. Sweep any accidental transfers.
    function sweep(address token, address to) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).transfer(to, balance);
        }
    }
}
