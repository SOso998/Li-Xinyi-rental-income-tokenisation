# Li-Xinyi-rental-income-tokenisation
# Asset Tokenisation MVP

This repository contains a coursework-sized prototype for tokenising the future 12 months of net rental income from a student accommodation asset.

The system is intentionally minimal:

- `RentShareToken` is a fixed-supply ERC-20 token with `10,000` total tokens.
- `RentalIncomeVault` handles token sales, rental income deposits, and investor claims.
- `MockUSDC` simulates the payment and distribution stablecoin used in demos and tests.

## Project structure

```text
contracts/
  MockUSDC.sol
  RentShareToken.sol
  RentalIncomeVault.sol
scripts/
  deploy.js
test/
  RentalIncomeVault.test.js
hardhat.config.js
README.md
COURSEWORK_MAPPING.md
```

## Design choices

- `RentShareToken` uses `0` decimals so each token is easy to explain in coursework and Remix demos.
- `MockUSDC` uses `18` decimals so Remix inputs can stay human-readable.
- The primary sale uses a fixed price.
- Revenue distribution uses token snapshots, which makes transferability and historical entitlement easy to explain.
- Revenue can only be deposited after the full sale allocation has been sold, so unsold tokens do not dilute the distribution denominator.
- After maturity, new sales and new revenue deposits stop, but historical claims remain open.

## Setup

1. Install Node.js 18+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`.
4. Fill in `SEPOLIA_RPC_URL`, `PRIVATE_KEY`, and optionally `ADMIN_ADDRESS`.

## Compile and test

```bash
npm install
npm run compile
npm test
```

## Deploy to Sepolia

```bash
npm run deploy:sepolia
```

The deploy script will:

- deploy `MockUSDC`
- deploy `RentShareToken`
- deploy `RentalIncomeVault`
- transfer the 10,000 RENT sale allocation to the vault when the deployer is also the admin
- transfer token ownership to the vault so it can create snapshots
- mint demo `MockUSDC` for the admin and an optional demo investor

## Remix demo flow

If you want to demonstrate the logic in Remix instead of Hardhat scripts:

1. Deploy `MockUSDC`.
2. Deploy `RentShareToken` with your wallet as `initialHolder`.
3. Deploy `RentalIncomeVault` with:
   - `paymentTokenAddress = MockUSDC address`
   - `shareTokenAddress = RentShareToken address`
   - `saleRecipientAddress = issuer/admin wallet`
   - `tokenPrice = 100000000000000000000` for `100 mUSDC`
   - `tokensForSale = 10000`
   - `maturity = future Unix timestamp`
4. From `RentShareToken`, transfer `10000` RENT to the vault.
5. From `RentShareToken`, call `transferOwnership(vaultAddress)`.
6. Mint `MockUSDC` to investor wallets.
7. From each investor wallet:
   - approve the vault to spend `MockUSDC`
   - call `buyTokens`
8. Transfer some RENT between investors to show secondary market transferability.
9. From the admin wallet:
   - approve the vault to spend `MockUSDC`
   - call `depositRevenue`
10. From investor wallets:
   - call `claimable`
   - call `claim`

## Sepolia demo checklist

- Show the RENT total supply is fixed at `10,000`.
- Show investors can buy at a fixed price.
- Show RENT is transferable wallet-to-wallet.
- Show a revenue deposit creates a claimable payout.
- Show users can claim based on snapshot balances.
- Show that after maturity the vault rejects new sales and new revenue deposits.

## Notes

- This is a coursework prototype, not a production protocol.
- It does not include KYC, legal enforcement, real rental data verification, governance, or AMM integration.
- Small rounding dust may remain in the vault because claims are integer-divided across snapshots.
