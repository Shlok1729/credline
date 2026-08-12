// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";

interface IWNat {
    function deposit() external payable;
    function transfer(address to, uint256 amount) external returns (bool);
}

contract TopUp is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        address wnatAddress = 0xC67DCE33D7A8efA5FfEB961899C73fe01bCe9273;
        address pool = 0x8Ab1Ab0D45F2139CBFd3390A60D484629Bb857dd;
        
        IWNat wnat = IWNat(wnatAddress);
        wnat.deposit{value: 15 ether}();
        wnat.transfer(pool, 15 ether);
        console.log("Pool topped up with 15 WNat");
        vm.stopBroadcast();
    }
}
