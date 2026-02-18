// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {AtalaVault} from "../src/core/AtalaVault.sol";
import {AtalaFactory} from "../src/core/AtalaFactory.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract AtalaFactoryTest is Test {
    AtalaFactory public factory;
    ERC20Mock public usdc;

    address public evc = makeAddr("evc");
    address public deployer1 = makeAddr("deployer1");
    address public deployer2 = makeAddr("deployer2");

    function setUp() public {
        usdc = new ERC20Mock("USD Coin", "USDC", 6);
        factory = new AtalaFactory(evc);
    }

    function test_createVault() public {
        vm.prank(deployer1);
        address vaultAddr = factory.createVault(address(usdc), "Atala USDC", "atUSDC", deployer1);

        assertTrue(vaultAddr != address(0), "Vault should be deployed");
        assertTrue(factory.isAtalaVault(vaultAddr), "Should be registered");
        assertEq(factory.totalVaults(), 1, "Should have 1 vault");

        AtalaVault vault = AtalaVault(vaultAddr);
        assertEq(vault.owner(), deployer1, "Deployer should be owner");
        assertEq(vault.asset(), address(usdc), "Asset should be USDC");
    }

    function test_anyoneCanCreateVault() public {
        vm.prank(deployer1);
        address v1 = factory.createVault(address(usdc), "Vault 1", "v1", deployer1);

        vm.prank(deployer2);
        address v2 = factory.createVault(address(usdc), "Vault 2", "v2", deployer2);

        assertEq(factory.totalVaults(), 2);
        assertTrue(v1 != v2, "Should be different vaults");
    }

    function test_createVaultWithDifferentOwner() public {
        address customOwner = makeAddr("customOwner");

        vm.prank(deployer1);
        address vaultAddr = factory.createVault(address(usdc), "Custom Vault", "cvUSDC", customOwner);

        AtalaVault vault = AtalaVault(vaultAddr);
        assertEq(vault.owner(), customOwner, "Custom owner should be set");

        // Custom owner can then set curator
        address curator = makeAddr("curator");
        vm.prank(customOwner);
        vault.setCurator(curator);
        assertEq(vault.curator(), curator, "Curator set by owner");
    }

    function test_vaultsByDeployer() public {
        vm.startPrank(deployer1);
        factory.createVault(address(usdc), "V1", "v1", deployer1);
        factory.createVault(address(usdc), "V2", "v2", deployer1);
        vm.stopPrank();

        vm.prank(deployer2);
        factory.createVault(address(usdc), "V3", "v3", deployer2);

        address[] memory d1Vaults = factory.getVaultsByDeployer(deployer1);
        address[] memory d2Vaults = factory.getVaultsByDeployer(deployer2);

        assertEq(d1Vaults.length, 2, "Deployer1 should have 2 vaults");
        assertEq(d2Vaults.length, 1, "Deployer2 should have 1 vault");
    }

    function test_getAllVaults() public {
        vm.prank(deployer1);
        factory.createVault(address(usdc), "V1", "v1", deployer1);

        vm.prank(deployer2);
        factory.createVault(address(usdc), "V2", "v2", deployer2);

        address[] memory all = factory.getAllVaults();
        assertEq(all.length, 2);
    }

    function test_createVault_revertZeroAsset() public {
        vm.prank(deployer1);
        vm.expectRevert(AtalaFactory.ZeroAddress.selector);
        factory.createVault(address(0), "Bad", "BAD", deployer1);
    }

    function test_createdVaultIsFunctional() public {
        vm.prank(deployer1);
        address vaultAddr = factory.createVault(address(usdc), "Atala USDC", "atUSDC", deployer1);

        // Mint and deposit
        usdc.mint(deployer1, 10_000e6);

        vm.startPrank(deployer1);
        usdc.approve(vaultAddr, 10_000e6);
        uint256 shares = AtalaVault(vaultAddr).deposit(10_000e6, deployer1);
        vm.stopPrank();

        assertGt(shares, 0, "Should receive shares");
        assertEq(AtalaVault(vaultAddr).totalAssets(), 10_000e6, "Total assets should match");
    }
}
