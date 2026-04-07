// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts@4.9.6/access/Ownable.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/ERC20.sol";

/// @title MockUSDC
/// @notice Simple ERC-20 token used for testing purchases and rental income distributions.
/// @dev This mock keeps 18 decimals so demo inputs can stay human-readable in Remix.
contract MockUSDC is ERC20, Ownable {
    constructor() ERC20("Mock USDC", "mUSDC") {}

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /// @notice Mint tokens for test accounts on local networks or testnets.
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
