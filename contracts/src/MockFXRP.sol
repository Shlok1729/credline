// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import { IERC20 } from "./interfaces/IERC20.sol";

/// @title MockFXRP
/// @notice A simple ERC-20 mock of FXRP for hackathon demo purposes.
///         In production, this would be replaced with the real FXRP token on Coston2
///         (0xa3Bd00D652D0f28D2417339322A51d4Fbe2B22D3).
/// @dev Allows free minting via faucet() for demo convenience.
contract MockFXRP is IERC20 {
    string public constant name = "Mock FXRP";
    string public constant symbol = "mFXRP";
    uint8 public constant decimals = 18;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    /// @notice Mint 10,000 mFXRP to the caller (demo faucet).
    function faucet() external {
        uint256 amount = 10_000 * 1e18;
        _balances[msg.sender] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), msg.sender, amount);
    }

    /// @notice Mint arbitrary amount to a specific address (for pool funding).
    function mint(address to, uint256 amount) external {
        _balances[to] += amount;
        _totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function totalSupply() external view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balances[account];
    }

    function transfer(address to, uint256 amount) external override returns (bool) {
        require(_balances[msg.sender] >= amount, "Insufficient balance");
        _balances[msg.sender] -= amount;
        _balances[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function allowance(address tokenOwner, address spender) external view override returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external override returns (bool) {
        require(_balances[from] >= amount, "Insufficient balance");
        require(_allowances[from][msg.sender] >= amount, "Insufficient allowance");
        _balances[from] -= amount;
        _allowances[from][msg.sender] -= amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
