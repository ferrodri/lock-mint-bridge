// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {IERC7802} from "@openzeppelin/contracts/interfaces/draft-IERC7802.sol";
import {CrosschainLinked} from "@openzeppelin/contracts/crosschain/CrosschainLinked.sol";
import {BridgeERC7802} from "@openzeppelin/contracts/crosschain/bridges/BridgeERC7802.sol";

/**
 * @notice Chain B bridge. On receiving a message it crosschain-mints the ERC-7802 token to the recipient.
 * Must be registered as the token's `tokenBridge`.
 */
contract MintBridge is BridgeERC7802 {
    constructor(IERC7802 token_, CrosschainLinked.Link[] memory links) BridgeERC7802(token_) CrosschainLinked(links) {}
}
