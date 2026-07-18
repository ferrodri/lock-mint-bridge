// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {InteroperableAddress} from "@openzeppelin/contracts/utils/draft-InteroperableAddress.sol";
import {IERC7786GatewaySource, IERC7786Recipient} from "@openzeppelin/contracts/interfaces/draft-IERC7786.sol";

/**
 * @notice Minimal ERC-7786 gateway. `sendMessage` records the outbound message as a `MessageSent` event; the off-chain
 *   relayer reads it and calls `deliver` on the destination-chain gateway, which invokes the recipient's `receiveMessage`.
 */
contract ERC7786Gateway is IERC7786GatewaySource {
    error AttributesUnsupported();
    error NotRelayer(address caller);
    error UnexpectedRecipientResponse(bytes4 ret);

    address public immutable relayer;
    uint256 private _seq;

    modifier onlyRelayer() {
        if (msg.sender != relayer) revert NotRelayer(msg.sender);
        _;
    }

    constructor(address relayer_) {
        relayer = relayer_;
    }

    /// @dev No optional attributes are supported by this minimal gateway.
    function supportsAttribute(bytes4) external pure returns (bool) {
        return false;
    }

    function sendMessage(bytes calldata recipient, bytes calldata payload, bytes[] calldata attributes)
        external
        payable
        returns (bytes32 sendId)
    {
        if (attributes.length != 0) revert AttributesUnsupported();

        bytes memory sender = InteroperableAddress.formatEvmV1(block.chainid, msg.sender);
        sendId = keccak256(abi.encode(block.chainid, msg.sender, recipient, payload, _seq++));
        emit MessageSent(sendId, sender, recipient, payload, msg.value, attributes);
    }

    /// @notice Called by the trusted relayer on the destination chain to deliver a message emitted on the source chain.
    function deliver(address recipient, bytes32 receiveId, bytes calldata sender, bytes calldata payload)
        external
        onlyRelayer
    {
        bytes4 ret = IERC7786Recipient(recipient).receiveMessage(receiveId, sender, payload);
        if (ret != IERC7786Recipient.receiveMessage.selector) revert UnexpectedRecipientResponse(ret);
    }
}
