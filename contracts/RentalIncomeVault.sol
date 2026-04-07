// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts@4.9.6/access/Ownable.sol";
import "@openzeppelin/contracts@4.9.6/token/ERC20/IERC20.sol";
import "./RentShareToken.sol";

/// @title RentalIncomeVault
/// @notice Handles token sales, rental income deposits, and investor claims for the coursework MVP.
/// @dev The design is intentionally simple: a small number of snapshot-based distributions over 12 months.
contract RentalIncomeVault is Ownable {
    struct Distribution {
        uint256 snapshotId;
        uint256 amount;
        uint256 timestamp;
    }

    IERC20 public immutable paymentToken;
    RentShareToken public immutable shareToken;
    address public immutable saleRecipient;
    uint256 public immutable pricePerToken;
    uint256 public immutable saleAllocation;
    uint256 public immutable maturityTimestamp;

    uint256 public tokensSold;
    Distribution[] public distributions;
    mapping(address => uint256) public nextDistributionToClaim;

    event TokensPurchased(address indexed buyer, uint256 tokenAmount, uint256 paymentAmount);
    event RevenueDeposited(uint256 indexed distributionIndex, uint256 indexed snapshotId, uint256 amount);
    event RevenueClaimed(address indexed investor, uint256 amount, uint256 fromIndex, uint256 toIndex);

    constructor(
        address paymentTokenAddress,
        address shareTokenAddress,
        address saleRecipientAddress,
        uint256 tokenPrice,
        uint256 tokensForSale,
        uint256 maturity
    ) {
        require(paymentTokenAddress != address(0), "Payment token is zero");
        require(shareTokenAddress != address(0), "Share token is zero");
        require(saleRecipientAddress != address(0), "Sale recipient is zero");
        require(tokenPrice > 0, "Price is zero");
        require(tokensForSale > 0, "Sale allocation is zero");
        require(maturity > block.timestamp, "Maturity must be future");

        paymentToken = IERC20(paymentTokenAddress);
        shareToken = RentShareToken(shareTokenAddress);
        saleRecipient = saleRecipientAddress;
        pricePerToken = tokenPrice;
        saleAllocation = tokensForSale;
        maturityTimestamp = maturity;
    }

    /// @notice Investors buy RENT tokens with mock USDC at a fixed price.
    /// @dev Payment is sent directly to the issuer/admin address to keep the MVP simple.
    function buyTokens(uint256 tokenAmount) external {
        require(block.timestamp < maturityTimestamp, "Sale has matured");
        require(tokenAmount > 0, "Token amount is zero");
        require(tokensSold + tokenAmount <= saleAllocation, "Sale allocation exceeded");
        require(shareToken.balanceOf(address(this)) >= tokenAmount, "Vault lacks tokens");

        uint256 paymentAmount = tokenAmount * pricePerToken;
        tokensSold += tokenAmount;

        require(paymentToken.transferFrom(msg.sender, saleRecipient, paymentAmount), "Payment failed");
        require(shareToken.transfer(msg.sender, tokenAmount), "Token transfer failed");

        emit TokensPurchased(msg.sender, tokenAmount, paymentAmount);
    }

    /// @notice Admin deposits a new rental income amount before maturity.
    /// @dev Each deposit creates a token balance snapshot used for later pro-rata claims.
    function depositRevenue(uint256 amount) external onlyOwner {
        require(block.timestamp < maturityTimestamp, "Vault has matured");
        require(amount > 0, "Amount is zero");
        require(tokensSold == saleAllocation, "All tokens must be sold before revenue distribution");

        require(paymentToken.transferFrom(msg.sender, address(this), amount), "Deposit transfer failed");

        uint256 snapshotId = shareToken.snapshot();
        distributions.push(
            Distribution({
                snapshotId: snapshotId,
                amount: amount,
                timestamp: block.timestamp
            })
        );

        emit RevenueDeposited(distributions.length - 1, snapshotId, amount);
    }

    /// @notice Claim all currently unclaimed distributions for the caller.
    /// @return payout Total mock USDC transferred to the caller.
    function claim() external returns (uint256 payout) {
        uint256 startIndex = nextDistributionToClaim[msg.sender];
        uint256 totalDistributions = distributions.length;

        require(startIndex < totalDistributions, "Nothing to claim");

        for (uint256 i = startIndex; i < totalDistributions; i++) {
            Distribution memory distribution = distributions[i];
            uint256 holderBalance = shareToken.balanceOfAt(msg.sender, distribution.snapshotId);
            uint256 supplyAtSnapshot = shareToken.totalSupplyAt(distribution.snapshotId);

            if (holderBalance > 0 && supplyAtSnapshot > 0) {
                payout += (distribution.amount * holderBalance) / supplyAtSnapshot;
            }
        }

        require(payout > 0, "No payout due");

        nextDistributionToClaim[msg.sender] = totalDistributions;
        require(paymentToken.transfer(msg.sender, payout), "Claim transfer failed");

        emit RevenueClaimed(msg.sender, payout, startIndex, totalDistributions - 1);
    }

    /// @notice View helper for frontends, tests, and coursework demonstrations.
    function claimable(address investor) external view returns (uint256 payout) {
        uint256 startIndex = nextDistributionToClaim[investor];
        uint256 totalDistributions = distributions.length;

        for (uint256 i = startIndex; i < totalDistributions; i++) {
            Distribution memory distribution = distributions[i];
            uint256 holderBalance = shareToken.balanceOfAt(investor, distribution.snapshotId);
            uint256 supplyAtSnapshot = shareToken.totalSupplyAt(distribution.snapshotId);

            if (holderBalance > 0 && supplyAtSnapshot > 0) {
                payout += (distribution.amount * holderBalance) / supplyAtSnapshot;
            }
        }
    }

    function distributionCount() external view returns (uint256) {
        return distributions.length;
    }

    function remainingTokens() external view returns (uint256) {
        return saleAllocation - tokensSold;
    }

    function isMatured() external view returns (bool) {
        return block.timestamp >= maturityTimestamp;
    }
}
