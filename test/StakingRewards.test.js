const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakingRewards", function () {
  let stakingRewards;
  let mockToken;
  let mockNFT;
  let owner;
  let user1;
  let user2;
  let STAKE_AMOUNT;
  const YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    STAKE_AMOUNT = ethers.parseEther("1000");

    // Deploy Mock Token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy();

    // Deploy Mock NFT
    const MockNFT = await ethers.getContractFactory("MockNFT");
    mockNFT = await MockNFT.deploy();

    // Deploy StakingRewards
    const StakingRewards = await ethers.getContractFactory("StakingRewards");
    stakingRewards = await StakingRewards.deploy(
      await mockToken.getAddress(),
      await mockNFT.getAddress()
    );

    // Setup initial token balances
    await mockToken.mint(await user1.getAddress(), ethers.parseEther("10000"));
    await mockToken.mint(await user2.getAddress(), ethers.parseEther("10000"));
    await mockToken.mint(
      await stakingRewards.getAddress(),
      ethers.parseEther("1000000")
    ); // For rewards

    // Approve staking contract
    await mockToken
      .connect(user1)
      .approve(await stakingRewards.getAddress(), ethers.parseEther("10000"));
    await mockToken
      .connect(user2)
      .approve(await stakingRewards.getAddress(), ethers.parseEther("10000"));
  });

  describe("Base APY Rewards", function () {
    it("Should calculate correct base rewards", async function () {
      await stakingRewards.connect(user1).stake(STAKE_AMOUNT);

      // Move forward 30 days
      await time.increase(30 * 24 * 60 * 60);

      const pendingRewards = await stakingRewards.calculateRewards(
        await user1.getAddress()
      );
      const expectedRewards =
        (STAKE_AMOUNT * BigInt(5) * BigInt(30)) / BigInt(365) / BigInt(100);

      // Allow for small rounding differences
      expect(pendingRewards).to.be.closeTo(
        expectedRewards,
        ethers.parseEther("0.1")
      );
    });

    it("Should successfully claim rewards", async function () {
      await stakingRewards.connect(user1).stake(STAKE_AMOUNT);

      await time.increase(30 * 24 * 60 * 60);

      const beforeBalance = await mockToken.balanceOf(await user1.getAddress());
      await stakingRewards.connect(user1).claimRewards();
      const afterBalance = await mockToken.balanceOf(await user1.getAddress());

      expect(afterBalance).to.be.gt(beforeBalance);
    });
  });

  describe("Performance-Based Rewards", function () {
    it("Should increase APY when total staked reaches Tier 1", async function () {
      const tierAmount = ethers.parseEther("1000000"); // 1M tokens
      await mockToken.mint(await user1.getAddress(), tierAmount);
      await mockToken
        .connect(user1)
        .approve(await stakingRewards.getAddress(), tierAmount);

      await stakingRewards.connect(user1).stake(tierAmount);

      const apy = await stakingRewards.getCurrentAPY();
      expect(apy).to.equal(700); // Base 5% + 2% bonus = 7%
    });

    it("Should increase APY when total staked reaches Tier 2", async function () {
      const tierAmount = ethers.parseEther("5000000"); // 5M tokens
      await mockToken.mint(await user1.getAddress(), tierAmount);
      await mockToken
        .connect(user1)
        .approve(await stakingRewards.getAddress(), tierAmount);

      await stakingRewards.connect(user1).stake(tierAmount);

      const apy = await stakingRewards.getCurrentAPY();
      expect(apy).to.equal(1000); // Base 5% + 5% bonus = 10%
    });
  });

  describe("NFT-Boosted Rewards", function () {
    it("Should apply NFT boost multiplier", async function () {
      // Mint NFT to user1
      await mockNFT.mint(await user1.getAddress(), 1);

      await stakingRewards.connect(user1).stake(STAKE_AMOUNT);

      const multiplier = await stakingRewards.getUserMultiplier(
        await user1.getAddress()
      );
      expect(multiplier).to.equal(150); // 1.5x multiplier

      await time.increase(30 * 24 * 60 * 60);

      const normalRewards = await stakingRewards.calculateRewards(
        await user2.getAddress()
      );
      const boostedRewards = await stakingRewards.calculateRewards(
        await user1.getAddress()
      );

      expect(boostedRewards).to.be.gt(normalRewards);
    });
  });

  describe("Security Tests", function () {
    it("Should prevent reward manipulation through quick deposits/withdrawals", async function () {
      await stakingRewards.connect(user1).stake(STAKE_AMOUNT);

      // Try to game the system with multiple stakes/unstakes
      for (let i = 0; i < 5; i++) {
        await stakingRewards.connect(user1).unstake(STAKE_AMOUNT / BigInt(2));
        await stakingRewards.connect(user1).stake(STAKE_AMOUNT / BigInt(2));
      }

      const rewards = await stakingRewards.calculateRewards(
        await user1.getAddress()
      );
      const expectedMaxRewards = (STAKE_AMOUNT * BigInt(5)) / BigInt(100); // Max 5% APY

      expect(rewards).to.be.lt(expectedMaxRewards);
    });

    it("Should prevent unauthorized reward claims", async function () {
      await stakingRewards.connect(user1).stake(STAKE_AMOUNT);
      await time.increase(30 * 24 * 60 * 60);

      // Try to claim rewards from a different account
      await expect(stakingRewards.connect(user2).claimRewards()).to.not.be
        .reverted; // Should execute but with 0 rewards

      const user2Rewards = await stakingRewards.calculateRewards(
        await user2.getAddress()
      );
      expect(user2Rewards).to.equal(0);
    });
  });

  describe("Gas Optimization", function () {
    it("Should maintain reasonable gas costs for reward claims", async function () {
      await stakingRewards.connect(user1).stake(STAKE_AMOUNT);
      await time.increase(30 * 24 * 60 * 60);

      const tx = await stakingRewards.connect(user1).claimRewards();
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lt(200000); // Gas limit threshold
    });

    it("Should optimize multiple operations", async function () {
      // Test gas usage for multiple operations
      await stakingRewards.connect(user1).stake(STAKE_AMOUNT);
      await time.increase(30 * 24 * 60 * 60);

      const tx = await stakingRewards.connect(user1).unstake(STAKE_AMOUNT);
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lt(300000); // Gas limit threshold for unstake + reward claim
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero rewards period correctly", async function () {
      await stakingRewards.connect(user1).stake(STAKE_AMOUNT);

      const rewards = await stakingRewards.calculateRewards(
        await user1.getAddress()
      );
      expect(rewards).to.equal(0);
    });

    it("Should handle maximum stake amount", async function () {
      const maxAmount = ethers.parseEther("10000000"); // 10M tokens
      await mockToken.mint(await user1.getAddress(), maxAmount);
      await mockToken
        .connect(user1)
        .approve(await stakingRewards.getAddress(), maxAmount);

      await expect(stakingRewards.connect(user1).stake(maxAmount)).to.not.be
        .reverted;
    });
  });

  describe("Performance Analysis", function () {
    it("Should compare reward structures", async function () {
      // User with NFT boost
      await mockNFT.mint(await user1.getAddress(), 1);
      await stakingRewards.connect(user1).stake(STAKE_AMOUNT);

      // User without NFT boost
      await stakingRewards.connect(user2).stake(STAKE_AMOUNT);

      await time.increase(180 * 24 * 60 * 60); // 180 days

      const boostedRewards = await stakingRewards.calculateRewards(
        await user1.getAddress()
      );
      const normalRewards = await stakingRewards.calculateRewards(
        await user2.getAddress()
      );

      // NFT boost should provide 50% more rewards
      const expectedRatio = 150; // 1.5x
      const actualRatio = (boostedRewards * BigInt(100)) / normalRewards;
      expect(actualRatio).to.be.closeTo(BigInt(expectedRatio), 5); // Allow for small rounding differences
    });
  });
});
