// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @dev Simple ERC-4626 mock that acts as an EVK vault for testing.
/// 1:1 share/asset ratio, no interest accrual.
contract ERC4626Mock is ERC4626 {
    constructor(address asset_, string memory name_, string memory symbol_)
        ERC4626(IERC20(asset_))
        ERC20(name_, symbol_)
    {}
}
