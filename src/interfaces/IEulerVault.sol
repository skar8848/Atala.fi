// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IEulerVault - Minimal interface for Euler V2 EVK vaults
/// @notice Combines ERC-4626 + lending-specific functions from IEVault
interface IEulerVault {
    // ============ ERC-4626 Standard ============

    function asset() external view returns (address);
    function totalAssets() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);
    function convertToShares(uint256 assets) external view returns (uint256);
    function maxDeposit(address receiver) external view returns (uint256);
    function maxWithdraw(address owner) external view returns (uint256);
    function maxRedeem(address owner) external view returns (uint256);
    function previewDeposit(uint256 assets) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);

    // ============ ERC-20 ============

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function approve(address spender, uint256 amount) external returns (bool);
    function allowance(address holder, address spender) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    // ============ EVK Lending-Specific ============

    function totalBorrows() external view returns (uint256);
    function cash() external view returns (uint256);
    function interestRate() external view returns (uint256);
    function interestAccumulator() external view returns (uint256);
    function debtOf(address account) external view returns (uint256);
    function dToken() external view returns (address);

    function borrow(uint256 amount, address receiver) external returns (uint256);
    function repay(uint256 amount, address receiver) external returns (uint256);
    function repayWithShares(uint256 amount, address receiver) external returns (uint256 shares, uint256 debt);
    function pullDebt(uint256 amount, address from) external;

    // ============ EVK Governance / Config ============

    function governorAdmin() external view returns (address);
    function interestRateModel() external view returns (address);
    function oracle() external view returns (address);
    function unitOfAccount() external view returns (address);
    function caps() external view returns (uint16 supplyCap, uint16 borrowCap);
    function LTVBorrow(address collateral) external view returns (uint16);
    function LTVLiquidation(address collateral) external view returns (uint16);
    function EVC() external view returns (address);
    function creator() external view returns (address);
    function accumulatedFees() external view returns (uint256);

    // ============ EVK Risk ============

    function accountLiquidity(address account, bool liquidation)
        external
        view
        returns (uint256 collateralValue, uint256 liabilityValue);

    function checkLiquidation(address liquidator, address violator, address collateral)
        external
        view
        returns (uint256 maxRepay, uint256 maxYield);

    function liquidate(address violator, address collateral, uint256 repayAssets, uint256 minYieldBalance) external;
}
