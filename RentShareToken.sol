// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts@4.9.6/access/Ownable.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/extensions/ERC20Snapshot.sol";

/// @title RentShareToken
/// @notice ERC-20 token representing fractional claims on 12 months of net rental income.
/// @dev The token uses 0 decimals so that each token clearly represents one 0.01% share.
contract RentShareToken is ERC20Snapshot, Ownable {
    uint256 public constant INITIAL_SUPPLY = 10_000;

    constructor(address initialHolder) ERC20("Rent Share Token", "RENT") {
        require(initialHolder != address(0), "Initial holder is zero");
        _mint(initialHolder, INITIAL_SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return 0;
    }

    /// @notice Called by the vault before a revenue distribution is recorded.
    /// @dev Ownership should be transferred to the vault after deployment.
    function snapshot() external onlyOwner returns (uint256) {
        return _snapshot();
    }
}
