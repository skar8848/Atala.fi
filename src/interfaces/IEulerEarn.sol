// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";

/// @title IEulerEarn - Interface for Euler Earn aggregator vaults
/// @notice Reference interface - Atala builds its own aggregator but can read Euler Earn state
interface IEulerEarn {
    struct MarketAllocation {
        IERC4626 id;
        uint256 assets;
    }

    struct MarketConfig {
        uint112 balance;
        uint136 cap;
        bool enabled;
        uint64 removableAt;
    }

    // ============ ERC-4626 Standard ============

    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);

    // ============ Strategy / Allocation ============

    function reallocate(MarketAllocation[] calldata allocations) external;
    function supplyQueue(uint256 index) external view returns (IERC4626);
    function withdrawQueue(uint256 index) external view returns (IERC4626);
    function supplyQueueLength() external view returns (uint256);
    function withdrawQueueLength() external view returns (uint256);
    function config(IERC4626 vault) external view returns (MarketConfig memory);

    // ============ Roles ============

    function owner() external view returns (address);
    function curator() external view returns (address);
    function guardian() external view returns (address);
    function isAllocator(address target) external view returns (bool);

    // ============ Config ============

    function fee() external view returns (uint96);
    function feeRecipient() external view returns (address);
    function timelock() external view returns (uint256);
    function EVC() external view returns (address);
    function lastTotalAssets() external view returns (uint256);
}
