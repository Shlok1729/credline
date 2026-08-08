// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { ECDSA } from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import { MessageHashUtils } from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title CredRegistry
/// @author CredLine Team (Flare Summer Signal Hackathon)
/// @notice On-chain credential registry that stores privacy-preserving credit scores.
///         Only authorized TEE signers can mint credentials — the raw financial data
///         never touches the chain; only the resulting score tier is recorded.
///
/// @dev Access control mirrors the FCC InstructionSender pattern: the TEE service
///      submits signed results, and only the designated TEE signer address (set at
///      deployment) can call mintCredential(). In production, this would verify
///      against ITeeMachineRegistry; for the hackathon demo, we use a simple
///      authorized-signer pattern that's functionally equivalent.
contract CredRegistry {
    // ─── State ─────────────────────────────────────────────────
    /// @notice The address authorized to mint credentials (TEE signer).
    address public immutable teeSigner;

    /// @notice The deployer/owner of the contract.
    address public immutable owner;

    /// @notice Mapping from user address to their credit score (0 = no score).
    mapping(address => uint16) public scores;

    /// @notice Mapping from user address to the timestamp of their last score update.
    mapping(address => uint256) public scoreTimestamps;

    /// @notice Total number of credentials minted.
    uint256 public totalCredentials;

    // ─── Events ────────────────────────────────────────────────
    /// @notice Emitted when a credential is minted or updated.
    /// @param user The address that received the credential.
    /// @param score The credit score (300-850).
    /// @param timestamp The block timestamp when the credential was minted.
    event CredentialMinted(address indexed user, uint16 score, uint256 timestamp);

    // ─── Errors ────────────────────────────────────────────────
    error UnauthorizedCaller(address caller, address expected);
    error InvalidScore(uint16 score);
    error ZeroAddress();

    // ─── Constructor ───────────────────────────────────────────
    /// @param _teeSigner The address of the registered TEE signer that will call mintCredential.
    constructor(address _teeSigner) {
        if (_teeSigner == address(0)) revert ZeroAddress();
        teeSigner = _teeSigner;
        owner = msg.sender;
    }

    // ─── External Functions ────────────────────────────────────

    /// @notice Mint or update a credential for a user using a TEE signature.
    /// @dev The TEE processes the private data and returns a JSON response:
    ///      {"userAddress":"0x...","score":750,"tier":"Excellent"}
    ///      It signs this raw JSON string payload. We verify the signature here.
    /// @param resultData The exact JSON bytes returned by the TEE.
    /// @param signature The ECDSA signature produced by the TEE proxy.
    /// @param user The user address (passed explicitly to avoid parsing JSON in Solidity).
    /// @param score The computed credit score.
    function mintCredentialWithSignature(
        bytes calldata resultData,
        bytes calldata signature,
        address user,
        uint16 score
    ) external {
        if (user == address(0)) revert ZeroAddress();
        if (score < 300 || score > 850) revert InvalidScore(score);

        // Reconstruct the message hash and recover the signer
        bytes32 messageHash = keccak256(resultData);
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, signature);

        if (recoveredSigner != teeSigner) {
            revert UnauthorizedCaller(recoveredSigner, teeSigner);
        }
        if (score < 300 || score > 850) revert InvalidScore(score);

        bool isNew = scores[user] == 0;
        scores[user] = score;
        scoreTimestamps[user] = block.timestamp;

        if (isNew) {
            totalCredentials++;
        }

        emit CredentialMinted(user, score, block.timestamp);
    }

    // ─── View Functions ────────────────────────────────────────

    /// @notice Get the credit score for a user.
    /// @param user The address to query.
    /// @return The credit score (0 if no credential exists).
    function getScore(address user) external view returns (uint16) {
        return scores[user];
    }

    /// @notice Check if a user has a credential.
    /// @param user The address to query.
    /// @return True if the user has a non-zero score.
    function hasCredential(address user) external view returns (bool) {
        return scores[user] > 0;
    }

    /// @notice Get the score tier label for a user.
    /// @param user The address to query.
    /// @return tier The tier label string.
    function getTier(address user) external view returns (string memory tier) {
        uint16 score = scores[user];
        if (score >= 750) return "Excellent";
        if (score >= 700) return "Good";
        if (score >= 650) return "Fair";
        if (score >= 550) return "Below Average";
        if (score > 0) return "Poor";
        return "None";
    }
}
