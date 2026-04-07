# Coursework Mapping Note

## Asset -> token

The underlying asset is not the building itself. The tokenised asset is the right to receive a proportional share of the student accommodation's future net rental income over the next 12 months.

`RentShareToken` represents that claim as a fungible token:

- total supply is fixed at `10,000`
- each token represents `0.01%` of the revenue-sharing pool
- the token is divisible only at the whole-token level to keep the coursework demo simple

This supports the argument that a fungible token is suitable because every unit carries the same economic claim.

## Token -> issuance

`RentalIncomeVault` performs the primary issuance process:

- investors pay `MockUSDC`
- they receive `RentShareToken`
- the sale price is fixed and transparent
- sale proceeds go directly to the issuer/admin wallet

This maps to a simple primary market design without unnecessary auction mechanics.

## Token -> transferability and market logic

Because `RentShareToken` is a standard ERC-20, investors can transfer it freely between wallets.

For coursework purposes, this demonstrates:

- fractional access
- simple peer-to-peer secondary transferability
- the idea that liquidity can emerge after initial issuance even without building a full exchange

## Token -> revenue distribution

`RentalIncomeVault` also manages rental income distributions:

- the admin deposits `MockUSDC` representing net rental income
- each deposit creates a snapshot of token holdings
- investors later claim according to their balances at each snapshot
- deposits are only allowed after the full token sale is completed, so every token in the snapshot denominator is held by an investor rather than sitting unsold in the vault

This makes the economic logic easy to explain:

- whoever held the token when revenue was recorded is entitled to that distribution
- later transfers do not rewrite past entitlements

## Maturity logic

The design matches the 12-month income-right concept:

- after maturity, no new token sales are allowed
- after maturity, no new revenue deposits are allowed
- claims on already-recorded distributions remain open

This is the simplest way to model an income right that expires without adding forced burn or freeze mechanics.

## Risk and limitation mapping

The prototype also supports critical discussion in the report:

- legal/off-chain risk: the real rental income still depends on off-chain collection and issuer honesty
- technical risk: smart contract bugs or incorrect deployment can affect sales and claims
- market risk: secondary liquidity is not guaranteed just because the token is transferable
- structural limitation: the blockchain records token claims, but does not by itself verify real rental cash flows
