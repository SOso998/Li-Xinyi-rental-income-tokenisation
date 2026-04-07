const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();

  const adminAddress = process.env.ADMIN_ADDRESS || deployer.address;
  const demoInvestor = process.env.DEMO_INVESTOR;

  const tokenPrice = ethers.parseUnits("100", 18);
  const saleAllocation = 10_000n;
  const maturityTimestamp = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

  console.log("Deploying with account:", deployer.address);
  console.log("Admin / issuer:", adminAddress);

  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy();
  await mockUSDC.waitForDeployment();

  const RentShareToken = await ethers.getContractFactory("RentShareToken");
  const rentShareToken = await RentShareToken.deploy(adminAddress);
  await rentShareToken.waitForDeployment();

  const RentalIncomeVault = await ethers.getContractFactory("RentalIncomeVault");
  const vault = await RentalIncomeVault.deploy(
    await mockUSDC.getAddress(),
    await rentShareToken.getAddress(),
    adminAddress,
    tokenPrice,
    saleAllocation,
    maturityTimestamp
  );
  await vault.waitForDeployment();

  console.log("MockUSDC deployed to:", await mockUSDC.getAddress());
  console.log("RentShareToken deployed to:", await rentShareToken.getAddress());
  console.log("RentalIncomeVault deployed to:", await vault.getAddress());

  if (adminAddress.toLowerCase() === deployer.address.toLowerCase()) {
    const transferTx = await rentShareToken.transfer(await vault.getAddress(), saleAllocation);
    await transferTx.wait();

    const ownershipTx = await rentShareToken.transferOwnership(await vault.getAddress());
    await ownershipTx.wait();
  } else {
    console.log("Manual step required:");
    console.log("1. Transfer 10,000 RENT from admin to the vault");
    console.log("2. Transfer RentShareToken ownership to the vault");
  }

  const mintTx = await mockUSDC.mint(adminAddress, ethers.parseUnits("50000", 18));
  await mintTx.wait();

  if (demoInvestor) {
    const demoMintTx = await mockUSDC.mint(demoInvestor, ethers.parseUnits("20000", 18));
    await demoMintTx.wait();
    console.log("Minted demo MockUSDC to:", demoInvestor);
  }

  console.log("Suggested demo price per token: 100 mUSDC");
  console.log("Maturity timestamp:", maturityTimestamp.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
