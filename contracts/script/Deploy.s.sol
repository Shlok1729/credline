// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import "forge-std/Script.sol";
import { CredRegistry } from "../src/CredRegistry.sol";
import { LendingPoolLite } from "../src/LendingPoolLite.sol";
import { MockFXRP } from "../src/MockFXRP.sol";

/// @title Deploy
/// @notice Deploys all CredLine contracts to Coston2 testnet.
/// @dev Usage:
///   forge script script/Deploy.s.sol:Deploy \
///     --rpc-url coston2 \
///     --private-key $PRIVATE_KEY \
///     --broadcast \
///     -vvvv
contract Deploy is Script {
    function run() external {
        // The TEE signer address — this is the address of the registered TEE machine
        // that will call mintCredential(). Set this to the actual TEE signer after
        // the TEE extension is deployed and registered.
        address teeSigner = vm.envOr("TEE_SIGNER", vm.addr(vm.envUint("PRIVATE_KEY")));

        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));

        // 1. Deploy MockFXRP (for demo — production would use real FXRP)
        MockFXRP mockFxrp = new MockFXRP();
        console.log("MockFXRP deployed at:", address(mockFxrp));

        // 2. Deploy CredRegistry
        CredRegistry credRegistry = new CredRegistry(teeSigner);
        console.log("CredRegistry deployed at:", address(credRegistry));
        console.log("  TEE signer:", teeSigner);

        // 3. Deploy LendingPoolLite
        LendingPoolLite pool = new LendingPoolLite(address(credRegistry), address(mockFxrp));
        console.log("LendingPoolLite deployed at:", address(pool));

        // 4. Fund the pool with initial liquidity (50,000 mFXRP)
        mockFxrp.mint(address(pool), 50_000 * 1e18);
        console.log("Pool funded with 50,000 mFXRP");

        vm.stopBroadcast();

        // Print summary
        console.log("");
        console.log("=== CredLine Deployment Summary ===");
        console.log("Network: Coston2 Testnet");
        console.log("MockFXRP:        ", address(mockFxrp));
        console.log("CredRegistry:    ", address(credRegistry));
        console.log("LendingPoolLite: ", address(pool));
        console.log("TEE Signer:      ", teeSigner);
        console.log("");
        console.log("Next steps:");
        console.log("  1. Deploy & register TEE extension (tee-extension/)");
        console.log("  2. Update TEE_SIGNER env to match registered TEE address");
        console.log("  3. Re-deploy CredRegistry if TEE signer address differs");
    }
}
