// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AtalaFactory} from "../src/core/AtalaFactory.sol";
import {Addresses} from "./helpers/Addresses.sol";

/// @title DeployFactory - Deploy AtalaFactory to Avalanche mainnet
/// @notice Run:
///   forge script script/DeployFactory.s.sol \
///     --rpc-url $AVALANCHE_RPC_URL \
///     --private-key $PRIVATE_KEY \
///     --broadcast -vvv
contract DeployFactory is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console2.log("=== Deploying AtalaFactory ===");
        console2.log("Deployer:", deployer);
        console2.log("EVC:", Addresses.EVC);

        vm.startBroadcast(deployerKey);

        AtalaFactory factory = new AtalaFactory(Addresses.EVC);

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== AtalaFactory deployed ===");
        console2.log("Address:", address(factory));
        console2.log("");
        console2.log("Next: update ATALA_FACTORY_ADDRESS in frontend/src/config/atala.ts");
    }
}
