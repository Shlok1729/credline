// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import { CredRegistry } from "../src/CredRegistry.sol";
import { LendingPoolLite } from "../src/LendingPoolLite.sol";
import { IERC20 } from "../src/interfaces/IERC20.sol";

interface IFlareContractRegistry {
    function getContractAddressByName(string memory _name) external view returns (address);
}

interface IWNat is IERC20 {
    function deposit() external payable;
}

/// @title Deploy
/// @notice Deploys all CredLine contracts to Coston2 testnet.
contract Deploy is Script {
    function run() external {
        address teeSigner = vm.envOr("TEE_SIGNER", vm.addr(vm.envUint("PRIVATE_KEY")));

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // 1. Fetch real Coston2 WNat via FlareContractRegistry
        IFlareContractRegistry registry = IFlareContractRegistry(0xaD67FE66660Fb8dFE9d6b1b4240d8650e30F6019);
        address wnatAddress = registry.getContractAddressByName("WNat");
        console.log("Dynamically fetched WNat from FlareContractRegistry at:", wnatAddress);

        // 2. Deploy CredRegistry
        CredRegistry credRegistry = new CredRegistry(teeSigner);
        console.log("CredRegistry deployed at:", address(credRegistry));
        console.log("  TEE signer:", teeSigner);

        // 3. Deploy LendingPoolLite
        LendingPoolLite pool = new LendingPoolLite(address(credRegistry), wnatAddress);
        console.log("LendingPoolLite deployed at:", address(pool));

        // 4. Fund the pool with initial liquidity (Wrap C2FLR into WNat)
        // Note: The deployer needs C2FLR to do this!
        IWNat wnat = IWNat(wnatAddress);
        wnat.deposit{value: 10 ether}();
        wnat.transfer(address(pool), 10 ether);
        console.log("Pool funded with 10 WNat");

        vm.stopBroadcast();

        // Print summary
        console.log("");
        console.log("=== CredLine Deployment Summary ===");
        console.log("Network: Coston2 Testnet");
        console.log("WNat (Borrow Token): ", wnatAddress);
        console.log("CredRegistry:        ", address(credRegistry));
        console.log("LendingPoolLite:     ", address(pool));
        console.log("TEE Signer:          ", teeSigner);
        console.log("");
    }
}
