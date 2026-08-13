// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import "../src/RefillHelper.sol";

contract DeployRefillHelper is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        RefillHelper helper = new RefillHelper();
        console.log("RefillHelper deployed at:", address(helper));
        vm.stopBroadcast();
    }
}
