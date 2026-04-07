const { expect } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { ethers } = require("hardhat");

describe("Rental income tokenisation MVP", function () {
  async function deployFixture() {
    const [owner, investorA, investorB] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();

    const RentShareToken = await ethers.getContractFactory("RentShareToken");
    const rentShareToken = await RentShareToken.deploy(owner.address);

    const maturity = (await time.latest()) + 365 * 24 * 60 * 60;
    const pricePerToken = ethers.parseUnits("100", 18);

    const RentalIncomeVault = await ethers.getContractFactory("RentalIncomeVault");
    const vault = await RentalIncomeVault.deploy(
      await mockUSDC.getAddress(),
      await rentShareToken.getAddress(),
      owner.address,
      pricePerToken,
      10_000,
      maturity
    );

    await rentShareToken.transfer(await vault.getAddress(), 10_000);
    await rentShareToken.transferOwnership(await vault.getAddress());

    await mockUSDC.mint(investorA.address, ethers.parseUnits("1000000", 18));
    await mockUSDC.mint(investorB.address, ethers.parseUnits("1000000", 18));
    await mockUSDC.mint(owner.address, ethers.parseUnits("1000000", 18));

    return {
      owner,
      investorA,
      investorB,
      mockUSDC,
      rentShareToken,
      vault,
      pricePerToken,
      maturity
    };
  }

  it("allows investors to buy tokens at a fixed price", async function () {
    const { investorA, mockUSDC, rentShareToken, vault, pricePerToken, owner } = await loadFixture(deployFixture);

    await mockUSDC.connect(investorA).approve(await vault.getAddress(), pricePerToken * 10n);
    await expect(vault.connect(investorA).buyTokens(10))
      .to.emit(vault, "TokensPurchased");

    expect(await rentShareToken.balanceOf(investorA.address)).to.equal(10);
    expect(await mockUSDC.balanceOf(owner.address)).to.equal(ethers.parseUnits("1001000", 18));
  });

  it("keeps the RENT token freely transferable after purchase", async function () {
    const { investorA, investorB, mockUSDC, rentShareToken, vault, pricePerToken } = await loadFixture(deployFixture);

    await mockUSDC.connect(investorA).approve(await vault.getAddress(), pricePerToken * 10n);
    await vault.connect(investorA).buyTokens(10);

    await rentShareToken.connect(investorA).transfer(investorB.address, 4);

    expect(await rentShareToken.balanceOf(investorA.address)).to.equal(6);
    expect(await rentShareToken.balanceOf(investorB.address)).to.equal(4);
  });

  it("distributes revenue according to balances recorded at each snapshot", async function () {
    const { owner, investorA, investorB, mockUSDC, rentShareToken, vault, pricePerToken } = await loadFixture(deployFixture);

    await mockUSDC.connect(investorA).approve(await vault.getAddress(), pricePerToken * 6000n);
    await vault.connect(investorA).buyTokens(6000);

    await mockUSDC.connect(investorB).approve(await vault.getAddress(), pricePerToken * 4000n);
    await vault.connect(investorB).buyTokens(4000);

    await mockUSDC.connect(owner).approve(await vault.getAddress(), ethers.parseUnits("1000", 18));
    await vault.connect(owner).depositRevenue(ethers.parseUnits("1000", 18));

    await rentShareToken.connect(investorA).transfer(investorB.address, 1000);

    await mockUSDC.connect(owner).approve(await vault.getAddress(), ethers.parseUnits("500", 18));
    await vault.connect(owner).depositRevenue(ethers.parseUnits("500", 18));

    expect(await vault.claimable(investorA.address)).to.equal(ethers.parseUnits("850", 18));
    expect(await vault.claimable(investorB.address)).to.equal(ethers.parseUnits("650", 18));

    await expect(vault.connect(investorA).claim()).to.emit(vault, "RevenueClaimed");
    await expect(vault.connect(investorB).claim()).to.emit(vault, "RevenueClaimed");

    expect(await mockUSDC.balanceOf(investorA.address)).to.equal(ethers.parseUnits("400850", 18));
    expect(await mockUSDC.balanceOf(investorB.address)).to.equal(ethers.parseUnits("600650", 18));
  });

  it("rejects revenue deposits before all sale tokens are sold", async function () {
    const { owner, mockUSDC, vault } = await loadFixture(deployFixture);

    await mockUSDC.connect(owner).approve(await vault.getAddress(), ethers.parseUnits("100", 18));

    await expect(vault.connect(owner).depositRevenue(ethers.parseUnits("100", 18)))
      .to.be.revertedWith("All tokens must be sold before revenue distribution");
  });

  it("blocks new sales and deposits after maturity but still allows claims", async function () {
    const { owner, investorA, mockUSDC, vault, pricePerToken, maturity } = await loadFixture(deployFixture);

    await mockUSDC.connect(investorA).approve(await vault.getAddress(), pricePerToken * 10000n);
    await vault.connect(investorA).buyTokens(10000);

    await mockUSDC.connect(owner).approve(await vault.getAddress(), ethers.parseUnits("100", 18));
    await vault.connect(owner).depositRevenue(ethers.parseUnits("100", 18));

    await time.increaseTo(maturity + 1);

    await expect(vault.connect(investorA).buyTokens(1)).to.be.revertedWith("Sale has matured");
    await expect(vault.connect(owner).depositRevenue(ethers.parseUnits("1", 18))).to.be.revertedWith("Vault has matured");

    await expect(vault.connect(investorA).claim()).to.emit(vault, "RevenueClaimed");
  });
});
