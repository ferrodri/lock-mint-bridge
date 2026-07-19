// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Chain A asset. Plain ERC-20 with an open faucet, locked by the LockBridge.
contract ERC20ForLock is ERC20 {
    constructor() ERC20("Lock-Mint Token", "LMT") {}

    /// @dev Mock token, anyone can mint it to test
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
