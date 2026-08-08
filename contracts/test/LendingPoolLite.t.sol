// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Test.sol";
import { LendingPoolLite } from "../src/LendingPoolLite.sol";
import { CredRegistry } from "../src/CredRegistry.sol";
import { MockFXRP } from "./MockFXRP.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract LendingPoolLiteTest is Test {
    LendingPoolLite public pool;
    CredRegistry public registry;
    MockFXRP public fxrp;

    address public teeSigner;
    uint256 public teeSignerPk;
    address public user1;
    address public user2;

    function setUp() public {
        (teeSigner, teeSignerPk) = makeAddrAndKey("teeSigner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        // Deploy contracts
        registry = new CredRegistry(teeSigner);
        fxrp = new MockFXRP();
        pool = new LendingPoolLite(address(registry), address(fxrp));

        // Fund pool with FXRP liquidity
        fxrp.mint(address(pool), 100_000 * 1e18);

        // Give users some ETH for collateral
        vm.deal(user1, 300 ether);
        vm.deal(user1, 300 ether);
        vm.deal(user2, 300 ether);
    }

    function _sign(bytes memory resultData) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(resultData);
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(teeSignerPk, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    // ── Deposit Tests ──────────────────────────────────────────

    function test_deposit_success() public {
        vm.prank(user1);
        pool.deposit{value: 10 ether}();

        assertEq(pool.collateral(user1), 10 ether);
        assertEq(pool.totalCollateral(), 10 ether);
    }

    function test_deposit_revertsOnZero() public {
        vm.prank(user1);
        vm.expectRevert(LendingPoolLite.ZeroAmount.selector);
        pool.deposit{value: 0}();
    }

    function test_deposit_emitsEvent() public {
        vm.prank(user1);
        vm.expectEmit(true, false, false, true);
        emit LendingPoolLite.Deposited(user1, 10 ether);
        pool.deposit{value: 10 ether}();
    }

    // ── Borrow Tests — Standard Terms (no credential) ──────────

    function test_borrow_standardTerms_noCredential() public {
        vm.startPrank(user1);
        pool.deposit{value: 200 ether}();

        // With standard terms (180% ratio, 1x cap = 1000 FXRP per unit)
        // Borrow a small amount
        pool.borrow(100 * 1e18);
        vm.stopPrank();

        assertEq(pool.borrowed(user1), 100 * 1e18);
        assertEq(fxrp.balanceOf(user1), 100 * 1e18);
    }

    function test_borrow_getTerms_noCredential() public view {
        (uint256 ratio, , string memory tier) = pool.getTerms(user1);
        assertEq(ratio, 18000); // 180%
        assertEq(tier, "Standard");
    }

    // ── Borrow Tests — Excellent Terms ─────────────────────────

    function test_borrow_excellentTerms() public {
        // Give user1 an excellent score
        bytes memory data = bytes('{"score":800}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 800);

        (uint256 ratio, , string memory tier) = pool.getTerms(user1);
        assertEq(ratio, 12000); // 120%
        assertEq(tier, "Excellent");
    }

    // ── Borrow Tests — Good Terms ──────────────────────────────

    function test_borrow_goodTerms() public {
        bytes memory data = bytes('{"score":700}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 700);

        (uint256 ratio, , string memory tier) = pool.getTerms(user1);
        assertEq(ratio, 14000); // 140%
        assertEq(tier, "Good");
    }

    // ── Borrow Tests — Score Boundary ──────────────────────────

    function test_borrow_scoreBoundary_750() public {
        bytes memory data = bytes('{"score":750}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 750);

        (uint256 ratio, , string memory tier) = pool.getTerms(user1);
        assertEq(ratio, 12000); // Exactly 750 = Excellent
        assertEq(tier, "Excellent");
    }

    function test_borrow_scoreBoundary_650() public {
        bytes memory data = bytes('{"score":650}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 650);

        (uint256 ratio, , string memory tier) = pool.getTerms(user1);
        assertEq(ratio, 14000); // Exactly 650 = Good
        assertEq(tier, "Good");
    }

    function test_borrow_scoreBoundary_649() public {
        bytes memory data = bytes('{"score":649}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 649);

        (uint256 ratio, , string memory tier) = pool.getTerms(user1);
        assertEq(ratio, 18000); // 649 = Standard
        assertEq(tier, "Standard");
    }

    // ── Repay Tests ────────────────────────────────────────────

    function test_repay_success() public {
        vm.startPrank(user1);
        pool.deposit{value: 200 ether}();
        pool.borrow(100 * 1e18);

        // Approve pool to take back FXRP
        fxrp.approve(address(pool), 100 * 1e18);
        pool.repay(50 * 1e18);
        vm.stopPrank();

        assertEq(pool.borrowed(user1), 50 * 1e18);
    }

    function test_repay_revertsOnExcessiveRepay() public {
        vm.startPrank(user1);
        pool.deposit{value: 200 ether}();
        pool.borrow(100 * 1e18);

        fxrp.approve(address(pool), 200 * 1e18);
        vm.expectRevert(
            abi.encodeWithSelector(LendingPoolLite.RepayExceedsDebt.selector, 200 * 1e18, 100 * 1e18)
        );
        pool.repay(200 * 1e18);
        vm.stopPrank();
    }

    // ── Withdraw Collateral Tests ──────────────────────────────

    function test_withdrawCollateral_success() public {
        vm.startPrank(user1);
        pool.deposit{value: 10 ether}();
        pool.withdrawCollateral(5 ether);
        vm.stopPrank();

        assertEq(pool.collateral(user1), 5 ether);
    }

    function test_withdrawCollateral_revertsWithDebt() public {
        vm.startPrank(user1);
        pool.deposit{value: 200 ether}();
        pool.borrow(100 * 1e18);

        vm.expectRevert(
            abi.encodeWithSelector(LendingPoolLite.HasOutstandingDebt.selector, 100 * 1e18)
        );
        pool.withdrawCollateral(1 ether);
        vm.stopPrank();
    }

    // ── getPosition Tests ──────────────────────────────────────

    function test_getPosition_withCredential() public {
        bytes memory data = bytes('{"score":800}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 800);

        vm.prank(user1);
        pool.deposit{value: 10 ether}();

        (
            uint256 userCollateral,
            uint256 userBorrowed,
            ,
            uint16 score,
            string memory tier
        ) = pool.getPosition(user1);

        assertEq(userCollateral, 10 ether);
        assertEq(userBorrowed, 0);
        assertEq(score, 800);
        assertEq(tier, "Excellent");
    }

    // ── Before vs. After Credential Demo ───────────────────────

    function test_beforeAfterCredential() public {
        // Before: user has no credential → standard terms
        (uint256 ratioBefore, , string memory tierBefore) = pool.getTerms(user1);
        assertEq(ratioBefore, 18000);
        assertEq(tierBefore, "Standard");

        // After: user gets excellent score
        bytes memory data = bytes('{"score":790}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 790);

        (uint256 ratioAfter, , string memory tierAfter) = pool.getTerms(user1);
        assertEq(ratioAfter, 12000);
        assertEq(tierAfter, "Excellent");

        // Collateral ratio improved from 180% to 120% — user needs 33% less collateral
        assertTrue(ratioAfter < ratioBefore);
    }
}
