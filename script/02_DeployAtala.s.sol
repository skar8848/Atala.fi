// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AtalaVault} from "../src/core/AtalaVault.sol";
import {AtalaFactory} from "../src/core/AtalaFactory.sol";
import {AtalaAgent} from "../src/agents/AtalaAgent.sol";
import {Addresses} from "./helpers/Addresses.sol";

/// @title DeployAtala - Deploy Atala contracts on fork
/// @notice Run: forge script script/02_DeployAtala.s.sol --fork-url http://localhost:8545 --broadcast -vvv
contract DeployAtala is Script {
    function run() external {
        uint256 deployerKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)); // Anvil #0
        address deployer = vm.addr(deployerKey);

        console2.log("=== Deploying Atala Contracts ===");
        console2.log("Deployer:", deployer);
        console2.log("EVC:", Addresses.EVC);
        console2.log("");

        vm.startBroadcast(deployerKey);

        // 1. Deploy Factory
        AtalaFactory factory = new AtalaFactory(Addresses.EVC);
        console2.log("AtalaFactory deployed:", address(factory));

        // 2. Create a USDC vault via factory
        address usdcVault = factory.createVault(Addresses.USDC, "Atala USDC Vault", "atUSDC", deployer);
        console2.log("AtalaVault (USDC) deployed:", usdcVault);

        // 3. Deploy Agent
        AtalaAgent agent = new AtalaAgent(deployer, Addresses.EVC);
        console2.log("AtalaAgent deployed:", address(agent));

        // 4. Configure: set agent as allocator on the vault
        AtalaVault(usdcVault).setAllocator(address(agent));
        console2.log("Agent set as allocator on USDC vault");

        // 5. Register vault in agent
        agent.manageVault(usdcVault);
        agent.setThreshold(usdcVault, 100, 500); // 1% APY diff, 5% max idle
        console2.log("Agent configured to manage USDC vault");

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== Deployment Complete ===");
        console2.log("Factory:", address(factory));
        console2.log("USDC Vault:", usdcVault);
        console2.log("Agent:", address(agent));
    }
}
