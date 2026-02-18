// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IEulerVault} from "../src/interfaces/IEulerVault.sol";
import {Addresses} from "./helpers/Addresses.sol";

/// @title Discovery - Read Euler V2 state on Avalanche fork
/// @notice Run: forge script script/01_Discovery.s.sol --fork-url http://localhost:8545 -vvv
contract Discovery is Script {
    // Known EVK vault addresses on Avalanche (discovered from on-chain data)
    // These will be populated by querying the factory or can be hardcoded
    address[] public knownVaults;

    function run() external view {
        console2.log("=== Atala Discovery - Euler V2 on Avalanche ===");
        console2.log("");

        // 1. Check core contracts exist
        _checkCoreContracts();

        // 2. Check token balances / info
        _checkTokens();

        // 3. Try to read any known vaults
        // Note: EVK Factory doesn't have a simple getVaults() enumeration.
        // In production, we'd use events or Vault Lens.
        // For discovery, we try the Vault Lens.
        _queryVaultLens();
    }

    function _checkCoreContracts() internal view {
        console2.log("--- Core Contracts ---");

        uint256 evcCode = Addresses.EVC.code.length;
        console2.log("EVC:", Addresses.EVC, evcCode > 0 ? "[OK]" : "[MISSING]");

        uint256 factoryCode = Addresses.EVK_FACTORY.code.length;
        console2.log("EVK Factory:", Addresses.EVK_FACTORY, factoryCode > 0 ? "[OK]" : "[MISSING]");

        uint256 earnFactoryCode = Addresses.EULER_EARN_FACTORY.code.length;
        console2.log("Euler Earn Factory:", Addresses.EULER_EARN_FACTORY, earnFactoryCode > 0 ? "[OK]" : "[MISSING]");

        uint256 lensCode = Addresses.VAULT_LENS.code.length;
        console2.log("Vault Lens:", Addresses.VAULT_LENS, lensCode > 0 ? "[OK]" : "[MISSING]");

        uint256 oracleCode = Addresses.ORACLE_ROUTER.code.length;
        console2.log("Oracle Router:", Addresses.ORACLE_ROUTER, oracleCode > 0 ? "[OK]" : "[MISSING]");

        console2.log("");
    }

    function _checkTokens() internal view {
        console2.log("--- Tokens ---");

        _logToken("WAVAX", Addresses.WAVAX);
        _logToken("USDC", Addresses.USDC);
        _logToken("USDT", Addresses.USDT);
        _logToken("WETH", Addresses.WETH);
        _logToken("WBTC", Addresses.WBTC);
        _logToken("sAVAX", Addresses.SAVAX);

        console2.log("");
    }

    function _logToken(string memory label, address token) internal view {
        if (token.code.length == 0) {
            console2.log(label, token, "[NOT DEPLOYED]");
            return;
        }

        try IERC20Metadata(token).symbol() returns (string memory symbol) {
            try IERC20Metadata(token).decimals() returns (uint8 decimals) {
                try IERC20Metadata(token).totalSupply() returns (uint256 supply) {
                    console2.log(label, symbol, "decimals:", decimals);
                    console2.log("  totalSupply:", supply);
                } catch {
                    console2.log(label, symbol, "(supply read failed)");
                }
            } catch {
                console2.log(label, symbol, "(decimals read failed)");
            }
        } catch {
            console2.log(label, token, "(metadata read failed)");
        }
    }

    function _queryVaultLens() internal view {
        console2.log("--- Vault Lens Query ---");

        if (Addresses.VAULT_LENS.code.length == 0) {
            console2.log("Vault Lens not deployed at expected address");
            return;
        }

        console2.log("Vault Lens is deployed. To enumerate vaults:");
        console2.log("  1. Query EVK Factory ProxyCreated events");
        console2.log("  2. Or use known vault addresses");
        console2.log("");
        console2.log("=== Discovery Complete ===");
    }
}
