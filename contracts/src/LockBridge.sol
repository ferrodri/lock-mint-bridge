// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {CrosschainLinked} from "@openzeppelin/contracts/crosschain/CrosschainLinked.sol";
import {BridgeERC20} from "@openzeppelin/contracts/crosschain/bridges/BridgeERC20.sol";

/// @notice Chain A bridge. Locks the ERC-20 and sends a cross-chain message to the mint bridge on chain B.
contract LockBridge is BridgeERC20 {
    constructor(IERC20 token_, CrosschainLinked.Link[] memory links) BridgeERC20(token_) CrosschainLinked(links) {}
}
