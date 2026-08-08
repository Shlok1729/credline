// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Test.sol";
import { CredRegistry } from "../src/CredRegistry.sol";

contract CredRegistryTest is Test {
    CredRegistry public registry;
    address public teeSigner;
    address public user1;
    address public user2;

    function setUp() public {
        teeSigner = makeAddr("teeSigner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        registry = new CredRegistry(teeSigner);
    }

    // ── Constructor Tests ──────────────────────────────────────

    function test_constructor_setsTeeSigner() public view {
        assertEq(registry.teeSigner(), teeSigner);
    }

    function test_constructor_setsOwner() public view {
        assertEq(registry.owner(), address(this));
    }

    function test_constructor_revertsOnZeroSigner() public {
        vm.expectRevert(CredRegistry.ZeroAddress.selector);
        new CredRegistry(address(0));
    }

    // ── mintCredential Tests ───────────────────────────────────

    function test_mintCredential_success() public {
        vm.prank(teeSigner);
        registry.mintCredential(user1, 720);

        assertEq(registry.getScore(user1), 720);
        assertTrue(registry.hasCredential(user1));
        assertEq(registry.totalCredentials(), 1);
    }

    function test_mintCredential_emitsEvent() public {
        vm.prank(teeSigner);
        vm.expectEmit(true, false, false, true);
        emit CredRegistry.CredentialMinted(user1, 720, block.timestamp);
        registry.mintCredential(user1, 720);
    }

    function test_mintCredential_updatesExisting() public {
        vm.startPrank(teeSigner);
        registry.mintCredential(user1, 600);
        registry.mintCredential(user1, 780);
        vm.stopPrank();

        assertEq(registry.getScore(user1), 780);
        // totalCredentials should not double-count
        assertEq(registry.totalCredentials(), 1);
    }

    function test_mintCredential_multipleUsers() public {
        vm.startPrank(teeSigner);
        registry.mintCredential(user1, 720);
        registry.mintCredential(user2, 550);
        vm.stopPrank();

        assertEq(registry.getScore(user1), 720);
        assertEq(registry.getScore(user2), 550);
        assertEq(registry.totalCredentials(), 2);
    }

    function test_mintCredential_revertsOnUnauthorizedCaller() public {
        vm.prank(user1);
        vm.expectRevert(
            abi.encodeWithSelector(CredRegistry.UnauthorizedCaller.selector, user1, teeSigner)
        );
        registry.mintCredential(user1, 720);
    }

    function test_mintCredential_revertsOnScoreTooLow() public {
        vm.prank(teeSigner);
        vm.expectRevert(abi.encodeWithSelector(CredRegistry.InvalidScore.selector, 299));
        registry.mintCredential(user1, 299);
    }

    function test_mintCredential_revertsOnScoreTooHigh() public {
        vm.prank(teeSigner);
        vm.expectRevert(abi.encodeWithSelector(CredRegistry.InvalidScore.selector, 851));
        registry.mintCredential(user1, 851);
    }

    function test_mintCredential_revertsOnZeroUser() public {
        vm.prank(teeSigner);
        vm.expectRevert(CredRegistry.ZeroAddress.selector);
        registry.mintCredential(address(0), 720);
    }

    // ── View Function Tests ────────────────────────────────────

    function test_getScore_returnsZeroForUnknownUser() public view {
        assertEq(registry.getScore(user1), 0);
    }

    function test_hasCredential_falseForUnknownUser() public view {
        assertFalse(registry.hasCredential(user1));
    }

    function test_getTier_excellent() public {
        vm.prank(teeSigner);
        registry.mintCredential(user1, 800);
        assertEq(registry.getTier(user1), "Excellent");
    }

    function test_getTier_good() public {
        vm.prank(teeSigner);
        registry.mintCredential(user1, 720);
        assertEq(registry.getTier(user1), "Good");
    }

    function test_getTier_fair() public {
        vm.prank(teeSigner);
        registry.mintCredential(user1, 670);
        assertEq(registry.getTier(user1), "Fair");
    }

    function test_getTier_belowAverage() public {
        vm.prank(teeSigner);
        registry.mintCredential(user1, 580);
        assertEq(registry.getTier(user1), "Below Average");
    }

    function test_getTier_poor() public {
        vm.prank(teeSigner);
        registry.mintCredential(user1, 350);
        assertEq(registry.getTier(user1), "Poor");
    }

    function test_getTier_none() public view {
        assertEq(registry.getTier(user1), "None");
    }

    // ── Boundary Tests ─────────────────────────────────────────

    function test_mintCredential_minScore() public {
        vm.prank(teeSigner);
        registry.mintCredential(user1, 300);
        assertEq(registry.getScore(user1), 300);
    }

    function test_mintCredential_maxScore() public {
        vm.prank(teeSigner);
        registry.mintCredential(user1, 850);
        assertEq(registry.getScore(user1), 850);
    }
}
