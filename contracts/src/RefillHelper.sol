// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

interface IWNat {
    function deposit() external payable;
    function transfer(address to, uint256 amount) external returns (bool);
}

contract RefillHelper {
    address public constant WNAT = 0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273;
    address public constant POOL = 0x8Ab1Ab0D45F2139CBFd3390A60D484629Bb857dd;

    function refill() external payable {
        require(msg.value > 0, "Zero amount");
        IWNat(WNAT).deposit{value: msg.value}();
        require(IWNat(WNAT).transfer(POOL, msg.value), "Transfer failed");
    }
}
