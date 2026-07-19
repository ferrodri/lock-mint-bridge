// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Bridgeable} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Bridgeable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @notice Chain B ERC-7802 token. The bridge is authorized to crosschain-mint/burn; that is how "minting on B" happens.
 */
contract ERC7802Token is ERC20Bridgeable, Ownable {
    address public tokenBridge;

    event TokenBridgeUpdated(address indexed tokenBridge);

    error NotTokenBridge(address caller);

    constructor() ERC20("Lock-Mint Token", "LMT") Ownable(msg.sender) {}

    function setTokenBridge(address tokenBridge_) external onlyOwner {
        tokenBridge = tokenBridge_;
        emit TokenBridgeUpdated(tokenBridge_);
    }

    function _checkTokenBridge(address caller) internal view override {
        if (caller != tokenBridge) revert NotTokenBridge(caller);
    }
}
