// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Script} from "forge-std/Script.sol";
import {InteroperableAddress} from "@openzeppelin/contracts/utils/draft-InteroperableAddress.sol";
import {CrosschainLinked} from "@openzeppelin/contracts/crosschain/CrosschainLinked.sol";
import {ERC7786Gateway} from "../src/ERC7786.sol";
import {ERC20ForLock} from "../src/ERC20ForLock.sol";
import {LockBridge} from "../src/LockBridge.sol";
import {ERC7802Token} from "../src/ERC7802.sol";
import {MintBridge} from "../src/MintBridge.sol";

contract Deploy is Script {
    function run() public {
        address deployer = msg.sender;
        address relayer = deployer;

        // Read chain B's live deployer nonce and predict the mint bridge address.
        // On chain B we deploy gatewayB -> tokenB -> mintBridge, so mintBridge lands at nonce + 2.
        vm.createSelectFork(vm.rpcUrl("base-sepolia"));
        uint256 chainB = block.chainid;
        address predictedMintBridge = vm.computeCreateAddress(deployer, vm.getNonce(deployer) + 2);

        // Chain A (OP Sepolia) - lock side.
        vm.createSelectFork(vm.rpcUrl("op-sepolia"));
        uint256 chainA = block.chainid;
        vm.startBroadcast();
        ERC7786Gateway gatewayA = new ERC7786Gateway(relayer);
        ERC20ForLock token = new ERC20ForLock();
        CrosschainLinked.Link[] memory linksA = new CrosschainLinked.Link[](1);
        linksA[0] = CrosschainLinked.Link({
            gateway: address(gatewayA), counterpart: InteroperableAddress.formatEvmV1(chainB, predictedMintBridge)
        });
        LockBridge lockBridge = new LockBridge(token, linksA);
        vm.stopBroadcast();

        // Chain B (Base Sepolia) - mint side.
        vm.createSelectFork(vm.rpcUrl("base-sepolia"));
        vm.startBroadcast();
        ERC7786Gateway gatewayB = new ERC7786Gateway(relayer);
        ERC7802Token tokenB = new ERC7802Token();
        CrosschainLinked.Link[] memory linksB = new CrosschainLinked.Link[](1);
        linksB[0] = CrosschainLinked.Link({
            gateway: address(gatewayB), counterpart: InteroperableAddress.formatEvmV1(chainA, address(lockBridge))
        });
        MintBridge mintBridge = new MintBridge(tokenB, linksB);
        tokenB.setTokenBridge(address(mintBridge));
        vm.stopBroadcast();

        require(address(mintBridge) == predictedMintBridge, "mint bridge address prediction mismatch");
    }
}
