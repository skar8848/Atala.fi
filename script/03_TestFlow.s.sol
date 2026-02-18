// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {AtalaVault} from "../src/core/AtalaVault.sol";
import {AtalaFactory} from "../src/core/AtalaFactory.sol";
import {AtalaAgent} from "../src/agents/AtalaAgent.sol";
import {Addresses} from "./helpers/Addresses.sol";

/// @title TestFlow - E2E integration test on Avalanche fork
/// @notice Run: forge script script/03_TestFlow.s.sol --fork-url http://localhost:8545 -vvv
/// @dev Uses vm.prank to impersonate a USDC whale
contract TestFlow is Script {
    // Known USDC whale on Avalanche (Aave pool or similar)
    address constant USDC_WHALE = 0x9f8c163cBA728e99993ABe7495F06c0A3c8Ac8b9;

    uint256 constant DEPOSIT_AMOUNT = 10_000e6; // 10,000 USDC

    function run() external {
        console2.log("=== Atala E2E Test Flow ===");
        console2.log("");

        // Step 1: Deploy contracts
        console2.log("--- Step 1: Deploy ---");
        AtalaFactory factory = new AtalaFactory(Addresses.EVC);
        address vaultAddr = factory.createVault(Addresses.USDC, "Atala USDC Vault", "atUSDC", address(this));
        AtalaVault vault = AtalaVault(vaultAddr);
        AtalaAgent agent = new AtalaAgent(address(this), Addresses.EVC);
        vault.setAllocator(address(agent));
        agent.manageVault(vaultAddr);
        console2.log("Factory:", address(factory));
        console2.log("Vault:", vaultAddr);
        console2.log("Agent:", address(agent));
        console2.log("");

        // Step 2: Check for real EVK vaults to use as targets
        // For the E2E test, we'll work with idle funds if no vaults are available
        console2.log("--- Step 2: Check EVK Vaults ---");
        console2.log("Note: Add real EVK vault addresses here for full E2E");
        console2.log("");

        // Step 3: Impersonate whale and deposit
        console2.log("--- Step 3: Deposit ---");
        uint256 whaleBalance = IERC20(Addresses.USDC).balanceOf(USDC_WHALE);
        console2.log("Whale USDC balance:", whaleBalance);

        if (whaleBalance >= DEPOSIT_AMOUNT) {
            vm.startPrank(USDC_WHALE);
            IERC20(Addresses.USDC).approve(vaultAddr, DEPOSIT_AMOUNT);
            uint256 shares = vault.deposit(DEPOSIT_AMOUNT, USDC_WHALE);
            vm.stopPrank();

            console2.log("Deposited:", DEPOSIT_AMOUNT);
            console2.log("Shares received:", shares);
            console2.log("Vault totalAssets:", vault.totalAssets());
            console2.log("Vault idle:", vault.idle());
        } else {
            console2.log("Whale has insufficient USDC, skipping deposit test");
            console2.log("Try a different whale address or fork block");
        }

        // Step 4: Verify state
        console2.log("");
        console2.log("--- Step 4: Verify ---");
        console2.log("Vault total assets:", vault.totalAssets());
        console2.log("Vault share supply:", vault.totalSupply());
        console2.log("Vault count:", vault.vaultCount());

        // Step 5: Test withdraw (if deposit succeeded)
        if (vault.totalAssets() > 0) {
            console2.log("");
            console2.log("--- Step 5: Withdraw ---");
            uint256 withdrawAmount = DEPOSIT_AMOUNT / 2;

            vm.startPrank(USDC_WHALE);
            uint256 sharesRedeemed = vault.withdraw(withdrawAmount, USDC_WHALE, USDC_WHALE);
            vm.stopPrank();

            console2.log("Withdrew:", withdrawAmount);
            console2.log("Shares burned:", sharesRedeemed);
            console2.log("Remaining totalAssets:", vault.totalAssets());
        }

        console2.log("");
        console2.log("=== E2E Test Complete ===");
    }
}
