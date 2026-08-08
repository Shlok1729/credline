// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Test.sol";
import { CredRegistry } from "../src/CredRegistry.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract CredRegistryTest is Test {
    CredRegistry public registry;
    address public teeSigner;
    uint256 public teeSignerPk;
    address public user1;
    address public user2;

    function setUp() public {
        (teeSigner, teeSignerPk) = makeAddrAndKey("teeSigner");
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

    // ── Helper ──────────────────────────────────────────────────
    
    function _sign(bytes memory resultData) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(resultData);
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(teeSignerPk, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }

    // ── mintCredential Tests ───────────────────────────────────

    function test_mintCredential_success() public {
        bytes memory data = bytes('{"userAddress":"0x00...","score":720,"tier":"Good"}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 720);

        assertEq(registry.getScore(user1), 720);
        assertTrue(registry.hasCredential(user1));
        assertEq(registry.totalCredentials(), 1);
    }

    function test_mintCredential_emitsEvent() public {
        bytes memory data = bytes('{"userAddress":"0x00...","score":720,"tier":"Good"}');
        vm.expectEmit(true, false, false, true);
        emit CredRegistry.CredentialMinted(user1, 720, block.timestamp);
        registry.mintCredentialWithSignature(data, _sign(data), user1, 720);
    }

    function test_mintCredential_updatesExisting() public {
        bytes memory data1 = bytes('{"score":600}');
        registry.mintCredentialWithSignature(data1, _sign(data1), user1, 600);
        
        bytes memory data2 = bytes('{"score":780}');
        registry.mintCredentialWithSignature(data2, _sign(data2), user1, 780);

        assertEq(registry.getScore(user1), 780);
        // totalCredentials should not double-count
        assertEq(registry.totalCredentials(), 1);
    }

    function test_mintCredential_multipleUsers() public {
        bytes memory data1 = bytes('{"score":720}');
        registry.mintCredentialWithSignature(data1, _sign(data1), user1, 720);
        
        bytes memory data2 = bytes('{"score":550}');
        registry.mintCredentialWithSignature(data2, _sign(data2), user2, 550);

        assertEq(registry.getScore(user1), 720);
        assertEq(registry.getScore(user2), 550);
        assertEq(registry.totalCredentials(), 2);
    }

    function test_mintCredential_revertsOnUnauthorizedCaller() public {
        bytes memory data = bytes('fake');
        (, uint256 fakePk) = makeAddrAndKey("fake");
        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(keccak256(data));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(fakePk, hash);
        bytes memory fakeSig = abi.encodePacked(r, s, v);

        vm.expectRevert(); // unauthorized
        registry.mintCredentialWithSignature(data, fakeSig, user1, 720);
    }

    function test_mintCredential_revertsOnScoreTooLow() public {
        bytes memory data = bytes('{"score":299}');
        vm.expectRevert(abi.encodeWithSelector(CredRegistry.InvalidScore.selector, 299));
        registry.mintCredentialWithSignature(data, _sign(data), user1, 299);
    }

    function test_mintCredential_revertsOnScoreTooHigh() public {
        bytes memory data = bytes('{"score":851}');
        vm.expectRevert(abi.encodeWithSelector(CredRegistry.InvalidScore.selector, 851));
        registry.mintCredentialWithSignature(data, _sign(data), user1, 851);
    }

    function test_mintCredential_revertsOnZeroUser() public {
        bytes memory data = bytes('{"score":720}');
        vm.expectRevert(CredRegistry.ZeroAddress.selector);
        registry.mintCredentialWithSignature(data, _sign(data), address(0), 720);
    }

    // ── View Function Tests ────────────────────────────────────

    function test_getScore_returnsZeroForUnknownUser() public view {
        assertEq(registry.getScore(user1), 0);
    }

    function test_hasCredential_falseForUnknownUser() public view {
        assertFalse(registry.hasCredential(user1));
    }

    function test_getTier_excellent() public {
        bytes memory data = bytes('{"score":800}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 800);
        assertEq(registry.getTier(user1), "Excellent");
    }

    function test_getTier_good() public {
        bytes memory data = bytes('{"score":720}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 720);
        assertEq(registry.getTier(user1), "Good");
    }

    function test_getTier_fair() public {
        bytes memory data = bytes('{"score":670}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 670);
        assertEq(registry.getTier(user1), "Fair");
    }

    function test_getTier_belowAverage() public {
        bytes memory data = bytes('{"score":580}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 580);
        assertEq(registry.getTier(user1), "Below Average");
    }

    function test_getTier_poor() public {
        bytes memory data = bytes('{"score":350}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 350);
        assertEq(registry.getTier(user1), "Poor");
    }

    function test_getTier_none() public view {
        assertEq(registry.getTier(user1), "None");
    }

    // ── Boundary Tests ─────────────────────────────────────────

    function test_mintCredential_minScore() public {
        bytes memory data = bytes('{"score":300}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 300);
        assertEq(registry.getScore(user1), 300);
    }

    function test_mintCredential_maxScore() public {
        bytes memory data = bytes('{"score":850}');
        registry.mintCredentialWithSignature(data, _sign(data), user1, 850);
        assertEq(registry.getScore(user1), 850);
    }
}
