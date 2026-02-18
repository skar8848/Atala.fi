// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AtalaVault} from "./AtalaVault.sol";

/// @title AtalaFactory - Permissionless factory for creating AtalaVaults
/// @notice Anyone can deploy an AtalaVault aggregator for any ERC-20 asset
contract AtalaFactory {
    // ============ State ============

    /// @notice EVC address passed to all created vaults
    address public immutable evc;

    /// @notice All vaults created by this factory
    address[] public allVaults;

    /// @notice Vaults created by a specific deployer
    mapping(address => address[]) public vaultsByDeployer;

    /// @notice Whether a vault was created by this factory
    mapping(address => bool) public isAtalaVault;

    // ============ Events ============

    event VaultCreated(
        address indexed vault, address indexed asset, address indexed deployer, string name, string symbol
    );

    // ============ Errors ============

    error ZeroAddress();

    // ============ Constructor ============

    /// @param _evc EVC address on this chain
    constructor(address _evc) {
        if (_evc == address(0)) revert ZeroAddress();
        evc = _evc;
    }

    // ============ Factory ============

    /// @notice Deploy a new AtalaVault
    /// @param asset The underlying ERC-20 token (e.g., USDC)
    /// @param name Share token name (e.g., "Atala USDC Vault")
    /// @param symbol Share token symbol (e.g., "atUSDC")
    /// @param initialOwner The owner of the new vault (typically msg.sender)
    /// @return vault The deployed AtalaVault address
    function createVault(address asset, string calldata name, string calldata symbol, address initialOwner)
        external
        returns (address vault)
    {
        if (asset == address(0)) revert ZeroAddress();
        if (initialOwner == address(0)) initialOwner = msg.sender;

        // Deploy vault - owner can set curator/allocator/sentinel after creation
        AtalaVault v = new AtalaVault(asset, name, symbol, initialOwner, evc);
        vault = address(v);

        // Register
        allVaults.push(vault);
        vaultsByDeployer[msg.sender].push(vault);
        isAtalaVault[vault] = true;

        emit VaultCreated(vault, asset, msg.sender, name, symbol);
    }

    // ============ Views ============

    /// @notice Total number of vaults created
    function totalVaults() external view returns (uint256) {
        return allVaults.length;
    }

    /// @notice Get all vaults
    function getAllVaults() external view returns (address[] memory) {
        return allVaults;
    }

    /// @notice Get vaults by a specific deployer
    function getVaultsByDeployer(address deployer) external view returns (address[] memory) {
        return vaultsByDeployer[deployer];
    }
}
