// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { IERC20 } from "./interfaces/IERC20.sol";
import { CredRegistry } from "./CredRegistry.sol";

/// @title LendingPoolLite
/// @author CredLine Team (Flare Summer Signal Hackathon)
/// @notice Minimal FXRP-collateralized lending pool that demonstrates how
///         privacy-preserving credit scores unlock better borrowing terms.
///
/// @dev Architecture:
///   - Collateral: native C2FLR (sent via msg.value)
///   - Borrow asset: FXRP (or mock ERC-20 standing in for FXRP)
///   - Score tiers from CredRegistry determine collateral ratio:
///       Excellent (≥750): 120% collateral, 2x borrow cap
///       Good      (≥650): 140% collateral, 1.5x borrow cap
///       Standard  (<650): 180% collateral, 1x borrow cap (default)
///
///   This is intentionally simple — one collateral asset, one borrow asset,
///   no interest-rate curve. The point is demonstrating "private score → better terms."
contract LendingPoolLite {
    // ─── Constants ─────────────────────────────────────────────
    /// @notice Base borrow cap per unit of collateral (in borrow token units).
    /// With 1 C2FLR collateral at standard (180%) ratio, base cap = 0.55 FXRP equiv.
    uint256 public constant BASE_BORROW_CAP = 1000 * 1e18; // 1000 FXRP base cap

    /// @notice Collateral ratio denominator (10000 = 100%).
    uint256 public constant RATIO_DENOMINATOR = 10000;

    // ─── Tier Parameters ───────────────────────────────────────
    // Stored as basis points: 12000 = 120%, 14000 = 140%, 18000 = 180%
    uint256 public constant EXCELLENT_RATIO = 12000;  // 120% collateral
    uint256 public constant GOOD_RATIO      = 14000;  // 140% collateral
    uint256 public constant STANDARD_RATIO  = 18000;  // 180% collateral

    // Borrow cap multipliers (in basis points: 20000 = 2x, 15000 = 1.5x, 10000 = 1x)
    uint256 public constant EXCELLENT_CAP_MULT = 20000; // 2x
    uint256 public constant GOOD_CAP_MULT      = 15000; // 1.5x
    uint256 public constant STANDARD_CAP_MULT  = 10000; // 1x

    // Score thresholds
    uint16 public constant EXCELLENT_THRESHOLD = 750;
    uint16 public constant GOOD_THRESHOLD      = 650;

    // ─── State ─────────────────────────────────────────────────
    /// @notice The CredRegistry contract for score lookups.
    CredRegistry public immutable credRegistry;

    /// @notice The borrow token (FXRP or mock ERC-20).
    IERC20 public immutable borrowToken;

    /// @notice The contract owner (for pool liquidity management).
    address public immutable owner;

    /// @notice Collateral deposited by each user (in wei of native token).
    mapping(address => uint256) public collateral;

    /// @notice Amount borrowed by each user (in borrow token units).
    mapping(address => uint256) public borrowed;

    /// @notice Total collateral held by the pool.
    uint256 public totalCollateral;

    /// @notice Total amount borrowed from the pool.
    uint256 public totalBorrowed;

    // ─── Events ────────────────────────────────────────────────
    event Deposited(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount, uint256 collateralRatio, string tier);
    event Repaid(address indexed user, uint256 amount);
    event CollateralWithdrawn(address indexed user, uint256 amount);
    event PoolFunded(address indexed funder, uint256 amount);

    // ─── Errors ────────────────────────────────────────────────
    error ZeroAmount();
    error InsufficientCollateral(uint256 required, uint256 available);
    error ExceedsBorrowCap(uint256 requested, uint256 cap);
    error InsufficientPoolLiquidity(uint256 requested, uint256 available);
    error RepayExceedsDebt(uint256 repaying, uint256 owed);
    error HasOutstandingDebt(uint256 debt);
    error TransferFailed();

    // ─── Constructor ───────────────────────────────────────────
    /// @param _credRegistry Address of the CredRegistry contract.
    /// @param _borrowToken Address of the FXRP (or mock) ERC-20 token.
    constructor(address _credRegistry, address _borrowToken) {
        require(_credRegistry != address(0), "CredRegistry zero");
        require(_borrowToken != address(0), "BorrowToken zero");
        credRegistry = CredRegistry(_credRegistry);
        borrowToken = IERC20(_borrowToken);
        owner = msg.sender;
    }

    // ─── External Functions ────────────────────────────────────

    /// @notice Fund the pool with borrow tokens (FXRP).
    /// @dev Only the owner should call this in practice, but open for demo simplicity.
    /// @param amount Amount of borrow tokens to deposit into the pool.
    function fundPool(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        bool ok = borrowToken.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();
        emit PoolFunded(msg.sender, amount);
    }

    /// @notice Deposit native C2FLR as collateral.
    function deposit() external payable {
        if (msg.value == 0) revert ZeroAmount();
        collateral[msg.sender] += msg.value;
        totalCollateral += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Borrow FXRP against deposited collateral.
    /// @dev Borrow terms are determined by the user's CredRegistry score:
    ///      - Excellent (≥750): 120% collateral ratio, 2x borrow cap
    ///      - Good      (≥650): 140% collateral ratio, 1.5x borrow cap
    ///      - Standard  (<650): 180% collateral ratio, 1x base borrow cap
    /// @param amount Amount of FXRP to borrow.
    function borrow(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();

        // Get user's terms based on credential score
        (uint256 collateralRatio, uint256 borrowCap, string memory tier) = _getTerms(msg.sender);

        // Check borrow cap
        uint256 maxBorrow = (borrowCap * collateral[msg.sender]) / (1e18);
        uint256 remainingCap = maxBorrow > borrowed[msg.sender] ? maxBorrow - borrowed[msg.sender] : 0;
        if (amount > remainingCap) {
            revert ExceedsBorrowCap(amount, remainingCap);
        }

        // Check collateral sufficiency
        uint256 totalDebt = borrowed[msg.sender] + amount;
        uint256 requiredCollateral = (totalDebt * collateralRatio) / RATIO_DENOMINATOR;
        if (collateral[msg.sender] < requiredCollateral) {
            revert InsufficientCollateral(requiredCollateral, collateral[msg.sender]);
        }

        // Check pool liquidity
        uint256 poolBalance = borrowToken.balanceOf(address(this));
        if (amount > poolBalance) {
            revert InsufficientPoolLiquidity(amount, poolBalance);
        }

        borrowed[msg.sender] += amount;
        totalBorrowed += amount;

        bool ok = borrowToken.transfer(msg.sender, amount);
        if (!ok) revert TransferFailed();

        emit Borrowed(msg.sender, amount, collateralRatio, tier);
    }

    /// @notice Repay borrowed FXRP.
    /// @param amount Amount of FXRP to repay.
    function repay(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (amount > borrowed[msg.sender]) {
            revert RepayExceedsDebt(amount, borrowed[msg.sender]);
        }

        borrowed[msg.sender] -= amount;
        totalBorrowed -= amount;

        bool ok = borrowToken.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert TransferFailed();

        emit Repaid(msg.sender, amount);
    }

    /// @notice Withdraw collateral (only if no outstanding debt).
    /// @param amount Amount of native token to withdraw.
    function withdrawCollateral(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (borrowed[msg.sender] > 0) {
            revert HasOutstandingDebt(borrowed[msg.sender]);
        }
        require(amount <= collateral[msg.sender], "Exceeds collateral");

        collateral[msg.sender] -= amount;
        totalCollateral -= amount;

        (bool ok, ) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit CollateralWithdrawn(msg.sender, amount);
    }

    // ─── View Functions ────────────────────────────────────────

    /// @notice Get the lending terms for a user based on their credit score.
    /// @param user The address to query.
    /// @return collateralRatio The required collateral ratio (basis points, e.g., 12000 = 120%).
    /// @return borrowCap The maximum borrow amount per unit of collateral.
    /// @return tier The score tier label.
    function getTerms(address user) external view returns (
        uint256 collateralRatio,
        uint256 borrowCap,
        string memory tier
    ) {
        return _getTerms(user);
    }

    /// @notice Get a user's position summary.
    /// @param user The address to query.
    /// @return userCollateral The amount of collateral deposited.
    /// @return userBorrowed The amount currently borrowed.
    /// @return maxBorrow The maximum the user can borrow given current collateral + score.
    /// @return score The user's credit score.
    /// @return tier The user's score tier.
    function getPosition(address user) external view returns (
        uint256 userCollateral,
        uint256 userBorrowed,
        uint256 maxBorrow,
        uint16 score,
        string memory tier
    ) {
        userCollateral = collateral[user];
        userBorrowed = borrowed[user];
        score = credRegistry.getScore(user);

        (uint256 ratio, uint256 cap, string memory t) = _getTerms(user);
        tier = t;

        // Calculate max borrow based on collateral and cap
        maxBorrow = (cap * userCollateral) / (1e18);
        if (maxBorrow > userBorrowed) {
            maxBorrow -= userBorrowed;
        } else {
            maxBorrow = 0;
        }

        // Also constrain by collateral ratio
        uint256 maxByRatio = (userCollateral * RATIO_DENOMINATOR) / ratio;
        if (maxByRatio > userBorrowed) {
            uint256 remainByRatio = maxByRatio - userBorrowed;
            if (remainByRatio < maxBorrow) {
                maxBorrow = remainByRatio;
            }
        } else {
            maxBorrow = 0;
        }
    }

    // ─── Internal Functions ────────────────────────────────────

    /// @dev Internal implementation of getTerms.
    function _getTerms(address user) internal view returns (
        uint256 collateralRatio,
        uint256 borrowCap,
        string memory tier
    ) {
        uint16 score = credRegistry.getScore(user);

        if (score >= EXCELLENT_THRESHOLD) {
            return (EXCELLENT_RATIO, (BASE_BORROW_CAP * EXCELLENT_CAP_MULT) / RATIO_DENOMINATOR, "Excellent");
        } else if (score >= GOOD_THRESHOLD) {
            return (GOOD_RATIO, (BASE_BORROW_CAP * GOOD_CAP_MULT) / RATIO_DENOMINATOR, "Good");
        } else {
            return (STANDARD_RATIO, (BASE_BORROW_CAP * STANDARD_CAP_MULT) / RATIO_DENOMINATOR, "Standard");
        }
    }

    /// @notice Allow the contract to receive native tokens.
    receive() external payable {}
}
