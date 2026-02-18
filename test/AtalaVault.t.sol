// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC4626} from "@openzeppelin/contracts/interfaces/IERC4626.sol";
import {ERC20Mock} from "./mocks/ERC20Mock.sol";
import {ERC4626Mock} from "./mocks/ERC4626Mock.sol";
import {AtalaVault} from "../src/core/AtalaVault.sol";
import {IEVC} from "../src/interfaces/IEVC.sol";

contract AtalaVaultTest is Test {
    AtalaVault public vault;
    ERC20Mock public usdc;
    ERC4626Mock public evkVault1;
    ERC4626Mock public evkVault2;

    address public owner = makeAddr("owner");
    address public curator = makeAddr("curator");
    address public allocator = makeAddr("allocator");
    address public sentinel = makeAddr("sentinel");
    address public user = makeAddr("user");
    address public evc = makeAddr("evc");

    uint256 constant INITIAL_BALANCE = 100_000e6;
    uint256 constant VAULT1_CAP = 50_000e6;
    uint256 constant VAULT2_CAP = 30_000e6;

    function setUp() public {
        // Deploy mock USDC
        usdc = new ERC20Mock("USD Coin", "USDC", 6);

        // Deploy mock EVK vaults
        evkVault1 = new ERC4626Mock(address(usdc), "EVK Vault 1", "eUSDC1");
        evkVault2 = new ERC4626Mock(address(usdc), "EVK Vault 2", "eUSDC2");

        // Deploy AtalaVault
        vm.prank(owner);
        vault = new AtalaVault(address(usdc), "Atala USDC", "atUSDC", owner, evc);

        // Set roles
        vm.startPrank(owner);
        vault.setCurator(curator);
        vault.setAllocator(allocator);
        vault.setSentinel(sentinel);
        vm.stopPrank();

        // Add EVK vaults
        vm.startPrank(curator);
        vault.addVault(address(evkVault1), VAULT1_CAP);
        vault.addVault(address(evkVault2), VAULT2_CAP);
        vm.stopPrank();

        // Mint USDC to user
        usdc.mint(user, INITIAL_BALANCE);
    }

    // ============ Deposit Tests ============

    function test_deposit() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(user);
        usdc.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, user);
        vm.stopPrank();

        assertGt(shares, 0, "Should receive shares");
        assertEq(vault.balanceOf(user), shares, "User should hold shares");
        assertEq(vault.totalAssets(), depositAmount, "Total assets should match deposit");
    }

    function test_deposit_distributesToQueue() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(user);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user);
        vm.stopPrank();

        // First vault in supply queue should get filled first up to cap
        uint256 vault1Balance = evkVault1.convertToAssets(evkVault1.balanceOf(address(vault)));
        assertGt(vault1Balance, 0, "EVK Vault 1 should have received funds");
    }

    function test_deposit_respectsCaps() public {
        uint256 depositAmount = 90_000e6; // More than vault1 cap

        vm.startPrank(user);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user);
        vm.stopPrank();

        uint256 vault1Balance = evkVault1.convertToAssets(evkVault1.balanceOf(address(vault)));
        uint256 vault2Balance = evkVault2.convertToAssets(evkVault2.balanceOf(address(vault)));

        assertLe(vault1Balance, VAULT1_CAP, "Vault 1 should not exceed cap");
        assertLe(vault2Balance, VAULT2_CAP, "Vault 2 should not exceed cap");

        // Remaining should be idle
        uint256 expectedIdle = depositAmount - vault1Balance - vault2Balance;
        assertEq(vault.idle(), expectedIdle, "Excess should be idle");
    }

    // ============ Withdraw Tests ============

    function test_withdraw() public {
        uint256 depositAmount = 10_000e6;
        uint256 withdrawAmount = 5_000e6;

        vm.startPrank(user);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user);

        vault.withdraw(withdrawAmount, user, user);
        vm.stopPrank();

        assertEq(usdc.balanceOf(user), INITIAL_BALANCE - depositAmount + withdrawAmount, "User should have withdrawn");
        assertEq(vault.totalAssets(), depositAmount - withdrawAmount, "Remaining assets correct");
    }

    function test_withdraw_fullAmount() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(user);
        usdc.approve(address(vault), depositAmount);
        uint256 shares = vault.deposit(depositAmount, user);

        vault.redeem(shares, user, user);
        vm.stopPrank();

        assertEq(usdc.balanceOf(user), INITIAL_BALANCE, "User should recover full balance");
        assertEq(vault.totalAssets(), 0, "Vault should be empty");
        assertEq(vault.balanceOf(user), 0, "No shares remaining");
    }

    // ============ Rebalance Tests ============

    function test_reallocate() public {
        uint256 depositAmount = 20_000e6;

        // Deposit
        vm.startPrank(user);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user);
        vm.stopPrank();

        // Record initial distribution
        uint256 v1Before = evkVault1.convertToAssets(evkVault1.balanceOf(address(vault)));

        // Reallocate: pull from vault1, push to vault2
        AtalaVault.Allocation[] memory allocs = new AtalaVault.Allocation[](2);
        allocs[0] = AtalaVault.Allocation({vault: address(evkVault1), delta: -int256(v1Before / 2)});
        allocs[1] = AtalaVault.Allocation({vault: address(evkVault2), delta: int256(v1Before / 2)});

        vm.prank(allocator);
        vault.reallocate(allocs);

        uint256 v1After = evkVault1.convertToAssets(evkVault1.balanceOf(address(vault)));
        uint256 v2After = evkVault2.convertToAssets(evkVault2.balanceOf(address(vault)));

        assertLt(v1After, v1Before, "Vault1 balance should decrease");
        assertGt(v2After, 0, "Vault2 balance should increase");
    }

    function test_reallocate_revertNotAllocator() public {
        AtalaVault.Allocation[] memory allocs = new AtalaVault.Allocation[](0);

        vm.prank(user);
        vm.expectRevert(AtalaVault.NotAllocator.selector);
        vault.reallocate(allocs);
    }

    function test_reallocate_revertCapExceeded() public {
        uint256 depositAmount = 20_000e6;

        vm.startPrank(user);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user);
        vm.stopPrank();

        // Try to allocate more than cap to vault2
        AtalaVault.Allocation[] memory allocs = new AtalaVault.Allocation[](1);
        allocs[0] = AtalaVault.Allocation({vault: address(evkVault2), delta: int256(VAULT2_CAP + 1)});

        vm.prank(allocator);
        vm.expectRevert();
        vault.reallocate(allocs);
    }

    // ============ Cap Tests ============

    function test_setCap() public {
        uint256 newCap = 100_000e6;

        vm.prank(curator);
        vault.setCap(address(evkVault1), newCap);

        uint256 cap = _getCap(address(evkVault1));
        assertEq(cap, newCap, "Cap should be updated");
    }

    function test_setCap_revertNotCurator() public {
        vm.prank(user);
        vm.expectRevert(AtalaVault.NotCurator.selector);
        vault.setCap(address(evkVault1), 1);
    }

    // ============ Sentinel Tests ============

    function test_emergencyWithdraw() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(user);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user);
        vm.stopPrank();

        uint256 v1Balance = evkVault1.convertToAssets(evkVault1.balanceOf(address(vault)));
        uint256 idleBefore = vault.idle();

        vm.prank(sentinel);
        vault.emergencyWithdraw(address(evkVault1));

        assertEq(evkVault1.balanceOf(address(vault)), 0, "Vault1 shares should be 0");
        assertEq(vault.idle(), idleBefore + v1Balance, "Idle should increase");
    }

    function test_reduceCap() public {
        uint256 newCap = VAULT1_CAP / 2;

        vm.prank(sentinel);
        vault.reduceCap(address(evkVault1), newCap);

        uint256 cap = _getCap(address(evkVault1));
        assertEq(cap, newCap, "Cap should be reduced");
    }

    function test_reduceCap_revertIncrease() public {
        vm.prank(sentinel);
        vm.expectRevert("Can only reduce cap");
        vault.reduceCap(address(evkVault1), VAULT1_CAP + 1);
    }

    // ============ Vault Management Tests ============

    function test_addVault() public {
        ERC4626Mock evkVault3 = new ERC4626Mock(address(usdc), "EVK Vault 3", "eUSDC3");

        vm.prank(curator);
        vault.addVault(address(evkVault3), 20_000e6);

        assertEq(vault.vaultCount(), 3, "Should have 3 vaults");
    }

    function test_addVault_revertAssetMismatch() public {
        ERC20Mock weth = new ERC20Mock("Wrapped ETH", "WETH", 18);
        ERC4626Mock wethVault = new ERC4626Mock(address(weth), "EVK WETH", "eWETH");

        vm.prank(curator);
        vm.expectRevert();
        vault.addVault(address(wethVault), 1000e18);
    }

    function test_addVault_revertDuplicate() public {
        vm.prank(curator);
        vm.expectRevert(AtalaVault.VaultAlreadyAdded.selector);
        vault.addVault(address(evkVault1), 1000e6);
    }

    function test_removeVault() public {
        vm.prank(curator);
        vault.removeVault(address(evkVault2));

        assertEq(vault.vaultCount(), 1, "Should have 1 vault");
    }

    // ============ Role Tests ============

    function test_ownerCanSetRoles() public {
        address newCurator = makeAddr("newCurator");
        address newAllocator = makeAddr("newAllocator");
        address newSentinel = makeAddr("newSentinel");

        vm.startPrank(owner);
        vault.setCurator(newCurator);
        vault.setAllocator(newAllocator);
        vault.setSentinel(newSentinel);
        vm.stopPrank();

        assertEq(vault.curator(), newCurator);
        assertEq(vault.allocator(), newAllocator);
        assertEq(vault.sentinel(), newSentinel);
    }

    function test_transferOwnership() public {
        address newOwner = makeAddr("newOwner");

        vm.prank(owner);
        vault.transferOwnership(newOwner);

        assertEq(vault.pendingOwner(), newOwner);

        vm.prank(newOwner);
        vault.acceptOwnership();

        assertEq(vault.owner(), newOwner);
    }

    // ============ View Tests ============

    function test_getVaults() public view {
        address[] memory v = vault.getVaults();
        assertEq(v.length, 2);
        assertEq(v[0], address(evkVault1));
        assertEq(v[1], address(evkVault2));
    }

    function test_vaultAllocation() public {
        uint256 depositAmount = 10_000e6;

        vm.startPrank(user);
        usdc.approve(address(vault), depositAmount);
        vault.deposit(depositAmount, user);
        vm.stopPrank();

        uint256 allocation = vault.vaultAllocation(address(evkVault1));
        assertGt(allocation, 0, "Should have allocation in vault1");
    }

    // ============ Helpers ============

    function _getCap(address v) internal view returns (uint256) {
        (uint256 cap,,) = vault.vaultConfig(v);
        return cap;
    }
}
