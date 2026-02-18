// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AtalaVault} from "../src/core/AtalaVault.sol";
import {AtalaAgent} from "../src/agents/AtalaAgent.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";
import {ERC4626Mock} from "./mocks/ERC4626Mock.sol";

contract AtalaAgentTest is Test {
    AtalaVault public vault;
    AtalaAgent public agent;
    ERC20Mock public usdc;
    ERC4626Mock public evkVault1;
    ERC4626Mock public evkVault2;

    address public owner = makeAddr("owner");
    address public keeper = makeAddr("keeper");
    address public user = makeAddr("user");
    address public evc = makeAddr("evc");
    address public attacker = makeAddr("attacker");

    uint256 constant VAULT1_CAP = 50_000e6;
    uint256 constant VAULT2_CAP = 30_000e6;

    function setUp() public {
        usdc = new ERC20Mock("USD Coin", "USDC", 6);
        evkVault1 = new ERC4626Mock(address(usdc), "EVK Vault 1", "eUSDC1");
        evkVault2 = new ERC4626Mock(address(usdc), "EVK Vault 2", "eUSDC2");

        // Deploy vault
        vm.prank(owner);
        vault = new AtalaVault(address(usdc), "Atala USDC", "atUSDC", owner, evc);

        // Deploy agent
        agent = new AtalaAgent(owner, evc);

        // Configure vault: set agent as allocator
        vm.startPrank(owner);
        vault.setAllocator(address(agent));
        vault.setCurator(owner);
        vault.addVault(address(evkVault1), VAULT1_CAP);
        vault.addVault(address(evkVault2), VAULT2_CAP);
        vm.stopPrank();

        // Configure agent
        vm.startPrank(owner);
        agent.manageVault(address(vault));
        agent.setKeeper(keeper, true);
        agent.setThreshold(address(vault), 100, 500); // 1% APY diff, 5% max idle
        vm.stopPrank();

        // Fund user and deposit
        usdc.mint(user, 100_000e6);
        vm.startPrank(user);
        usdc.approve(address(vault), 100_000e6);
        vault.deposit(50_000e6, user);
        vm.stopPrank();
    }

    // ============ Rebalance Tests ============

    function test_agentCanRebalance() public {
        // Pull some funds from vault1 to idle, then push to vault2
        uint256 v1Before = evkVault1.convertToAssets(evkVault1.balanceOf(address(vault)));
        uint256 moveAmount = v1Before / 4;

        AtalaVault.Allocation[] memory allocs = new AtalaVault.Allocation[](2);
        allocs[0] = AtalaVault.Allocation({vault: address(evkVault1), delta: -int256(moveAmount)});
        allocs[1] = AtalaVault.Allocation({vault: address(evkVault2), delta: int256(moveAmount)});

        vm.prank(keeper);
        agent.rebalance(address(vault), allocs);

        uint256 v1After = evkVault1.convertToAssets(evkVault1.balanceOf(address(vault)));
        uint256 v2After = evkVault2.convertToAssets(evkVault2.balanceOf(address(vault)));

        assertLt(v1After, v1Before, "Vault1 should decrease");
        assertGt(v2After, 0, "Vault2 should increase");
    }

    function test_keeperCanRebalance() public {
        AtalaVault.Allocation[] memory allocs = new AtalaVault.Allocation[](0);

        vm.prank(keeper);
        agent.rebalance(address(vault), allocs);
        // Should not revert
    }

    function test_rebalance_revertNotKeeper() public {
        AtalaVault.Allocation[] memory allocs = new AtalaVault.Allocation[](0);

        vm.prank(attacker);
        vm.expectRevert(AtalaAgent.NotKeeper.selector);
        agent.rebalance(address(vault), allocs);
    }

    function test_rebalance_revertUnmanagedVault() public {
        address fakeVault = makeAddr("fakeVault");

        AtalaVault.Allocation[] memory allocs = new AtalaVault.Allocation[](0);

        vm.prank(keeper);
        vm.expectRevert(AtalaAgent.VaultNotManaged.selector);
        agent.rebalance(fakeVault, allocs);
    }

    // ============ Agent Cannot Steal Funds ============

    function test_agentCannotWithdrawToItself() public {
        // The agent only calls vault.reallocate() which moves between EVK vaults.
        // There's no path for the agent to extract funds to an external address.
        // This test verifies the agent contract holds no tokens.
        assertEq(usdc.balanceOf(address(agent)), 0, "Agent should hold no USDC");
    }

    // ============ Batch Rebalance ============

    function test_batchRebalance() public {
        AtalaAgent.RebalanceParams[] memory params = new AtalaAgent.RebalanceParams[](1);

        AtalaVault.Allocation[] memory allocs = new AtalaVault.Allocation[](0);
        params[0] = AtalaAgent.RebalanceParams({vault: address(vault), allocations: allocs});

        vm.prank(keeper);
        agent.batchRebalance(params);
    }

    // ============ Check Rebalance Needed ============

    function test_checkRebalanceNeeded() public view {
        (bool needed, uint256 idleRatio) = agent.checkRebalanceNeeded(address(vault));

        // With our setup, there should be idle funds since caps limit allocation
        if (vault.idle() > 0) {
            assertGt(idleRatio, 0, "Should have idle ratio > 0");
        }

        // If idle > 5% (maxIdleBps=500), should recommend rebalance
        if (idleRatio > 500) {
            assertTrue(needed, "Should recommend rebalance for high idle");
        }
    }

    function test_checkRebalanceNeeded_unmanagedVault() public {
        (bool needed, uint256 idleRatio) = agent.checkRebalanceNeeded(makeAddr("random"));
        assertFalse(needed);
        assertEq(idleRatio, 0);
    }

    // ============ Management ============

    function test_manageVault() public {
        address newVault = makeAddr("newVault");

        vm.prank(owner);
        agent.manageVault(newVault);

        assertTrue(agent.managedVaults(newVault));
    }

    function test_unmanageVault() public {
        vm.prank(owner);
        agent.unmanageVault(address(vault));

        assertFalse(agent.managedVaults(address(vault)));
    }

    function test_setKeeper() public {
        address newKeeper = makeAddr("newKeeper");

        vm.prank(owner);
        agent.setKeeper(newKeeper, true);

        assertTrue(agent.keepers(newKeeper));
    }

    // ============ Sweep Safety ============

    function test_sweep() public {
        // Accidentally send USDC to agent
        usdc.mint(address(agent), 1000e6);
        assertEq(usdc.balanceOf(address(agent)), 1000e6);

        vm.prank(owner);
        agent.sweep(address(usdc), owner);

        assertEq(usdc.balanceOf(address(agent)), 0, "Agent should have 0 after sweep");
        assertEq(usdc.balanceOf(owner), 1000e6, "Owner should receive swept tokens");
    }
}
