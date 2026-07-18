// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {Test, Vm} from "forge-std/Test.sol";
import {InteroperableAddress} from "@openzeppelin/contracts/utils/draft-InteroperableAddress.sol";
import {CrosschainLinked} from "@openzeppelin/contracts/crosschain/CrosschainLinked.sol";
import {ERC20ForLock} from "../src/ERC20ForLock.sol";
import {LockBridge} from "../src/LockBridge.sol";
import {ERC7786Gateway} from "../src/ERC7786.sol";
import {ERC7802Token} from "../src/ERC7802.sol";
import {MintBridge} from "../src/MintBridge.sol";

contract LockBridgeTest is Test {
    uint256 private constant CHAIN_A = 11155420; // OP Sepolia
    uint256 private constant CHAIN_B = 84532; // Base Sepolia
    uint256 private constant AMOUNT = 1_000e18;

    // ERC-7786 MessageSent(bytes32 indexed sendId, bytes sender, bytes recipient, bytes payload, uint256 value, bytes[] attributes)
    bytes32 private constant MESSAGE_SENT_SIG = keccak256("MessageSent(bytes32,bytes,bytes,bytes,uint256,bytes[])");

    ERC7786Gateway internal gateway;

    // Chain A
    ERC20ForLock internal token;
    LockBridge internal lockBridge;

    // Chain B
    ERC7802Token internal tokenB;
    MintBridge internal mintBridge;

    address internal user = makeAddr("user");
    address internal relayer = makeAddr("relayer");
    address internal mintBridgeB = makeAddr("mintBridgeB");

    bytes internal counterpartB; // mint bridge on chain B, as seen by the lock bridge
    bytes internal counterpartA; // lock bridge on chain A, as seen by the mint bridge

    /// @dev Pull the `payload` out of the gateway's `MessageSent` event in the recorded logs.
    function _extractSentPayload() internal view returns (bytes memory payload) {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i = 0; i < logs.length; ++i) {
            if (logs[i].emitter == address(gateway) && logs[i].topics[0] == MESSAGE_SENT_SIG) {
                (,, payload,,) = abi.decode(logs[i].data, (bytes, bytes, bytes, uint256, bytes[]));
                return payload;
            }
        }
        revert("MessageSent not found");
    }

    function setUp() public {
        _setUpGateway();

        address predictedMintBridge = vm.computeCreateAddress(address(this), vm.getNonce(address(this)) + 3);

        _setUpChainA(predictedMintBridge);
        _setUpChainB();

        assertEq(address(mintBridge), predictedMintBridge, "mint bridge address prediction mismatch");
    }

    /// @dev Shared ERC-7786 gateway used by both chains' bridges in this single-EVM test.
    function _setUpGateway() internal {
        gateway = new ERC7786Gateway(relayer);
    }

    /// @dev Chain A: plain ERC-20 asset + lock bridge, linked to the mint bridge on chain B.
    function _setUpChainA(address mintBridgeB) internal {
        vm.chainId(CHAIN_A);
        token = new ERC20ForLock();

        counterpartB = InteroperableAddress.formatEvmV1(CHAIN_B, mintBridgeB);
        CrosschainLinked.Link[] memory links = new CrosschainLinked.Link[](1);
        links[0] = CrosschainLinked.Link({gateway: address(gateway), counterpart: counterpartB});
        lockBridge = new LockBridge(token, links);

        token.mint(user, AMOUNT);
    }

    /// @dev Chain B: mintable ERC-7802 token + mint bridge, linked back to the lock bridge on chain A.
    function _setUpChainB() internal {
        vm.chainId(CHAIN_B);
        tokenB = new ERC7802Token();

        counterpartA = InteroperableAddress.formatEvmV1(CHAIN_A, address(lockBridge));
        CrosschainLinked.Link[] memory links = new CrosschainLinked.Link[](1);
        links[0] = CrosschainLinked.Link({gateway: address(gateway), counterpart: counterpartA});
        mintBridge = new MintBridge(tokenB, links);
        tokenB.setTokenBridge(address(mintBridge));
    }

    function test_Lock() public {
        vm.chainId(CHAIN_A);
        bytes memory to = InteroperableAddress.formatEvmV1(CHAIN_B, user);

        vm.startPrank(user);
        token.approve(address(lockBridge), AMOUNT);
        lockBridge.crosschainTransfer(to, AMOUNT);
        vm.stopPrank();

        assertEq(token.balanceOf(user), 0);
        assertEq(token.balanceOf(address(lockBridge)), AMOUNT);
    }

    function test_Mint() public {
        // (1) Lock on chain A, capturing the message the gateway emits.
        vm.chainId(CHAIN_A);
        bytes memory to = InteroperableAddress.formatEvmV1(CHAIN_B, user);

        vm.startPrank(user);
        token.approve(address(lockBridge), AMOUNT);
        vm.recordLogs();
        lockBridge.crosschainTransfer(to, AMOUNT);
        vm.stopPrank();

        bytes memory payload = _extractSentPayload();

        // (2) Relayer delivers that exact message to the mint bridge on chain B.
        vm.chainId(CHAIN_B);
        vm.prank(relayer);
        gateway.deliver(address(mintBridge), bytes32("receive-1"), counterpartA, payload);

        assertEq(tokenB.balanceOf(user), AMOUNT);
        assertEq(tokenB.totalSupply(), AMOUNT);
    }

    function test_TrustedRelayerCanMintWithoutLock() public {
        vm.chainId(CHAIN_B);

        bytes memory payload =
            abi.encode(InteroperableAddress.formatEvmV1(CHAIN_A, user), abi.encodePacked(user), AMOUNT);

        vm.prank(relayer);
        gateway.deliver(address(mintBridge), bytes32("free-mint"), counterpartA, payload);

        assertEq(tokenB.balanceOf(user), AMOUNT);
        assertEq(tokenB.totalSupply(), AMOUNT);
    }
}
