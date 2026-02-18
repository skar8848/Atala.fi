// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IEVC} from "../interfaces/IEVC.sol";

/// @title AtalaVault - Permissionless ERC-4626 aggregator for Euler V2 vaults
/// @notice Aggregates multiple EVK vaults under a single deposit. Inspired by MetaMorpho/Euler Earn.
/// @dev Roles: owner (governance), curator (caps/vaults), allocator (rebalance), sentinel (emergency)
contract AtalaVault is ERC4626 {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ============ Structs ============

    struct VaultConfig {
        uint256 cap;        // Max assets allocatable to this vault
        bool enabled;       // Whether deposits can go to this vault
        uint256 index;      // Index in the vaults array (for O(1) removal)
    }

    struct Allocation {
        address vault;      // Target EVK vault
        int256 delta;       // Positive = deposit, negative = withdraw
    }

    // ============ State ============

    /// @notice EVC instance for batch operations
    IEVC public immutable evc;

    /// @notice Roles
    address public owner;
    address public curator;
    address public allocator;
    address public sentinel;

    /// @notice Pending owner for 2-step transfer
    address public pendingOwner;

    /// @notice Ordered list of target EVK vaults
    address[] public vaults;

    /// @notice Supply queue - order in which vaults receive deposits
    address[] public supplyQueue;

    /// @notice Withdraw queue - order in which vaults are withdrawn from
    address[] public withdrawQueue;

    /// @notice Config per vault
    mapping(address => VaultConfig) public vaultConfig;

    /// @notice Idle assets held in this contract (not yet allocated)
    uint256 public idle;

    // ============ Events ============

    event VaultAdded(address indexed vault, uint256 cap);
    event VaultRemoved(address indexed vault);
    event CapUpdated(address indexed vault, uint256 oldCap, uint256 newCap);
    event Reallocated(address indexed caller, uint256 allocationsCount);
    event RoleUpdated(string role, address indexed oldAddr, address indexed newAddr);
    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event EmergencyWithdraw(address indexed vault, uint256 amount);

    // ============ Errors ============

    error NotOwner();
    error NotCurator();
    error NotAllocator();
    error NotSentinel();
    error VaultAlreadyAdded();
    error VaultNotFound();
    error VaultDisabled();
    error CapExceeded(address vault, uint256 attempted, uint256 cap);
    error AssetMismatch(address vault, address expected, address got);
    error ZeroAddress();
    error NotPendingOwner();
    error InvalidAllocation();

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyCurator() {
        if (msg.sender != curator && msg.sender != owner) revert NotCurator();
        _;
    }

    modifier onlyAllocator() {
        if (msg.sender != allocator && msg.sender != curator && msg.sender != owner) revert NotAllocator();
        _;
    }

    modifier onlySentinel() {
        if (msg.sender != sentinel && msg.sender != owner) revert NotSentinel();
        _;
    }

    // ============ Constructor ============

    /// @param _asset The underlying asset (e.g., USDC)
    /// @param _name Vault share token name
    /// @param _symbol Vault share token symbol
    /// @param _owner Initial owner/governance address
    /// @param _evc EVC address for batch operations
    constructor(address _asset, string memory _name, string memory _symbol, address _owner, address _evc)
        ERC4626(IERC20(_asset))
        ERC20(_name, _symbol)
    {
        if (_owner == address(0)) revert ZeroAddress();
        owner = _owner;
        curator = _owner;
        allocator = _owner;
        sentinel = _owner;
        evc = IEVC(_evc);
    }

    // ============ ERC-4626 Overrides ============

    /// @notice Total assets = idle + sum of all vault allocations
    function totalAssets() public view override returns (uint256 total) {
        total = idle;
        for (uint256 i = 0; i < vaults.length; i++) {
            total += _vaultBalance(vaults[i]);
        }
    }

    /// @notice Deposit assets - distributes to vaults according to supply queue
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares) internal override {
        // Pull assets from caller
        super._deposit(caller, receiver, assets, shares);

        // Add to idle first
        idle += assets;

        // Distribute to supply queue vaults respecting caps
        _distributeToQueue(assets);
    }

    /// @notice Withdraw assets - pulls from vaults according to withdraw queue
    function _withdraw(address caller, address receiver, address _owner, uint256 assets, uint256 shares)
        internal
        override
    {
        // Pull from sub-vaults to ensure we have enough idle
        if (idle < assets) {
            uint256 needed = assets - idle;
            _pullFromQueue(needed);
        }

        // Decrease idle by the full withdrawal amount
        idle -= assets;

        super._withdraw(caller, receiver, _owner, assets, shares);
    }

    // ============ Allocation Logic ============

    /// @notice Distribute assets to supply queue vaults respecting caps
    function _distributeToQueue(uint256 assets) internal {
        uint256 remaining = assets;

        for (uint256 i = 0; i < supplyQueue.length && remaining > 0; i++) {
            address vault = supplyQueue[i];
            VaultConfig storage cfg = vaultConfig[vault];

            if (!cfg.enabled) continue;

            uint256 currentBalance = _vaultBalance(vault);
            if (currentBalance >= cfg.cap) continue;

            uint256 available = cfg.cap - currentBalance;
            uint256 toDeposit = remaining < available ? remaining : available;

            if (toDeposit > 0) {
                idle -= toDeposit;
                _depositToVault(vault, toDeposit);
                remaining -= toDeposit;
            }
        }
        // Any remaining stays as idle
    }

    /// @notice Pull assets from withdraw queue to satisfy a withdrawal
    function _pullFromQueue(uint256 needed) internal {
        uint256 remaining = needed;

        for (uint256 i = 0; i < withdrawQueue.length && remaining > 0; i++) {
            address vault = withdrawQueue[i];
            uint256 available = _vaultBalance(vault);
            uint256 toWithdraw = remaining < available ? remaining : available;

            if (toWithdraw > 0) {
                _withdrawFromVault(vault, toWithdraw);
                idle += toWithdraw;
                remaining -= toWithdraw;
            }
        }
    }

    /// @notice Deposit into an EVK vault (ERC-4626)
    function _depositToVault(address vault, uint256 assets) internal {
        IERC20(asset()).forceApprove(vault, assets);
        IERC4626(vault).deposit(assets, address(this));
    }

    /// @notice Withdraw from an EVK vault (ERC-4626)
    function _withdrawFromVault(address vault, uint256 assets) internal {
        IERC4626(vault).withdraw(assets, address(this), address(this));
    }

    /// @notice Get our current asset balance in a vault
    function _vaultBalance(address vault) internal view returns (uint256) {
        uint256 shares = IERC4626(vault).balanceOf(address(this));
        if (shares == 0) return 0;
        return IERC4626(vault).convertToAssets(shares);
    }

    // ============ Allocator Functions ============

    /// @notice Rebalance assets between vaults
    /// @param allocations Array of (vault, delta) pairs. Positive delta = deposit, negative = withdraw
    function reallocate(Allocation[] calldata allocations) external onlyAllocator {
        for (uint256 i = 0; i < allocations.length; i++) {
            address vault = allocations[i].vault;
            int256 delta = allocations[i].delta;

            if (!vaultConfig[vault].enabled) {
                revert VaultNotFound();
            }

            if (delta > 0) {
                uint256 amount = uint256(delta);
                uint256 newBalance = _vaultBalance(vault) + amount;
                if (newBalance > vaultConfig[vault].cap) {
                    revert CapExceeded(vault, newBalance, vaultConfig[vault].cap);
                }
                if (amount > idle) revert InvalidAllocation();
                idle -= amount;
                _depositToVault(vault, amount);
            } else if (delta < 0) {
                uint256 amount = uint256(-delta);
                _withdrawFromVault(vault, amount);
                idle += amount;
            }
        }

        emit Reallocated(msg.sender, allocations.length);
    }

    // ============ Curator Functions ============

    /// @notice Add a new EVK vault as allocation target
    /// @param vault Address of the EVK vault (must have same asset)
    /// @param cap Maximum assets to allocate
    function addVault(address vault, uint256 cap) external onlyCurator {
        if (vault == address(0)) revert ZeroAddress();
        if (vaultConfig[vault].enabled) revert VaultAlreadyAdded();

        address vaultAsset = IERC4626(vault).asset();
        if (vaultAsset != asset()) revert AssetMismatch(vault, asset(), vaultAsset);

        uint256 idx = vaults.length;
        vaults.push(vault);
        supplyQueue.push(vault);
        withdrawQueue.push(vault);

        vaultConfig[vault] = VaultConfig({cap: cap, enabled: true, index: idx});

        emit VaultAdded(vault, cap);
    }

    /// @notice Remove an EVK vault from allocation targets
    /// @dev Must withdraw all funds first
    /// @param vault Address of the vault to remove
    function removeVault(address vault) external onlyCurator {
        VaultConfig storage cfg = vaultConfig[vault];
        if (!cfg.enabled) revert VaultNotFound();

        // Withdraw remaining balance
        uint256 balance = _vaultBalance(vault);
        if (balance > 0) {
            _withdrawFromVault(vault, balance);
            idle += balance;
        }

        // Swap-and-pop from vaults array
        uint256 lastIdx = vaults.length - 1;
        if (cfg.index != lastIdx) {
            address lastVault = vaults[lastIdx];
            vaults[cfg.index] = lastVault;
            vaultConfig[lastVault].index = cfg.index;
        }
        vaults.pop();

        // Remove from supply queue
        _removeFromQueue(supplyQueue, vault);

        // Remove from withdraw queue
        _removeFromQueue(withdrawQueue, vault);

        delete vaultConfig[vault];

        emit VaultRemoved(vault);
    }

    /// @notice Update the cap for a vault
    function setCap(address vault, uint256 newCap) external onlyCurator {
        VaultConfig storage cfg = vaultConfig[vault];
        if (!cfg.enabled) revert VaultNotFound();

        uint256 oldCap = cfg.cap;
        cfg.cap = newCap;

        emit CapUpdated(vault, oldCap, newCap);
    }

    /// @notice Set the supply queue order
    function setSupplyQueue(address[] calldata newQueue) external onlyAllocator {
        // Validate all vaults are in our registry
        for (uint256 i = 0; i < newQueue.length; i++) {
            if (!vaultConfig[newQueue[i]].enabled) revert VaultNotFound();
        }
        supplyQueue = newQueue;
    }

    /// @notice Set the withdraw queue order
    function setWithdrawQueue(address[] calldata newQueue) external onlyAllocator {
        for (uint256 i = 0; i < newQueue.length; i++) {
            if (!vaultConfig[newQueue[i]].enabled) revert VaultNotFound();
        }
        withdrawQueue = newQueue;
    }

    // ============ Sentinel Functions ============

    /// @notice Emergency withdraw from a specific vault
    function emergencyWithdraw(address vault) external onlySentinel {
        uint256 balance = _vaultBalance(vault);
        if (balance > 0) {
            _withdrawFromVault(vault, balance);
            idle += balance;
        }
        // Disable the vault
        vaultConfig[vault].enabled = false;

        emit EmergencyWithdraw(vault, balance);
    }

    /// @notice Reduce a vault's cap (sentinel can only reduce, not increase)
    function reduceCap(address vault, uint256 newCap) external onlySentinel {
        VaultConfig storage cfg = vaultConfig[vault];
        if (!cfg.enabled) revert VaultNotFound();
        require(newCap < cfg.cap, "Can only reduce cap");

        uint256 oldCap = cfg.cap;
        cfg.cap = newCap;

        emit CapUpdated(vault, oldCap, newCap);
    }

    // ============ Owner Functions ============

    function setCurator(address newCurator) external onlyOwner {
        emit RoleUpdated("curator", curator, newCurator);
        curator = newCurator;
    }

    function setAllocator(address newAllocator) external onlyOwner {
        emit RoleUpdated("allocator", allocator, newAllocator);
        allocator = newAllocator;
    }

    function setSentinel(address newSentinel) external onlyOwner {
        emit RoleUpdated("sentinel", sentinel, newSentinel);
        sentinel = newSentinel;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        pendingOwner = newOwner;
        emit OwnershipTransferStarted(owner, newOwner);
    }

    function acceptOwnership() external {
        if (msg.sender != pendingOwner) revert NotPendingOwner();
        emit OwnershipTransferred(owner, msg.sender);
        owner = msg.sender;
        pendingOwner = address(0);
    }

    // ============ View Functions ============

    /// @notice Get number of target vaults
    function vaultCount() external view returns (uint256) {
        return vaults.length;
    }

    /// @notice Get all target vaults
    function getVaults() external view returns (address[] memory) {
        return vaults;
    }

    /// @notice Get supply queue
    function getSupplyQueue() external view returns (address[] memory) {
        return supplyQueue;
    }

    /// @notice Get withdraw queue
    function getWithdrawQueue() external view returns (address[] memory) {
        return withdrawQueue;
    }

    /// @notice Get current allocation to a vault
    function vaultAllocation(address vault) external view returns (uint256) {
        return _vaultBalance(vault);
    }

    // ============ Internal Helpers ============

    function _removeFromQueue(address[] storage queue, address vault) internal {
        for (uint256 i = 0; i < queue.length; i++) {
            if (queue[i] == vault) {
                queue[i] = queue[queue.length - 1];
                queue.pop();
                return;
            }
        }
    }
}
