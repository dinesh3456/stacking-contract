const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StakingContract", function () {
  let stakingContract;
  let mockToken;
  let owner;
  let user1;
  let user2;
  let STAKE_AMOUNT;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    STAKE_AMOUNT = ethers.parseEther("100");

    // Deploy Mock Token
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy();

    // Deploy Staking Contract
    const StakingContract = await ethers.getContractFactory("StakingContract");
    stakingContract = await StakingContract.deploy(
      await mockToken.getAddress()
    );

    // Mint tokens to user1
    await mockToken.mint(await user1.getAddress(), STAKE_AMOUNT * BigInt(2));
    // Approve staking contract
    await mockToken
      .connect(user1)
      .approve(await stakingContract.getAddress(), STAKE_AMOUNT * BigInt(2));
  });

  describe("Deployment", function () {
    it("Should set the correct staking token", async function () {
      expect(await stakingContract.stakingToken()).to.equal(
        await mockToken.getAddress()
      );
    });
  });

  describe("Staking", function () {
    it("Should allow users to stake tokens", async function () {
      await expect(stakingContract.connect(user1).stake(STAKE_AMOUNT))
        .to.emit(stakingContract, "Staked")
        .withArgs(await user1.getAddress(), STAKE_AMOUNT);

      const userStake = await stakingContract.getUserStake(
        await user1.getAddress()
      );
      expect(userStake[0]).to.equal(STAKE_AMOUNT);
    });

    it("Should fail if stake amount is 0", async function () {
      await expect(stakingContract.connect(user1).stake(0)).to.be.revertedWith(
        "Amount must be greater than 0"
      );
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      await stakingContract.connect(user1).stake(STAKE_AMOUNT);
    });

    it("Should not allow unstaking before lock-in period", async function () {
      await expect(
        stakingContract.connect(user1).unstake(STAKE_AMOUNT)
      ).to.be.revertedWith("Lock-in period not over");
    });

    it("Should allow unstaking after lock-in period", async function () {
      // Increase time by 7 days
      await time.increase(7 * 24 * 60 * 60);

      await expect(stakingContract.connect(user1).unstake(STAKE_AMOUNT))
        .to.emit(stakingContract, "Unstaked")
        .withArgs(await user1.getAddress(), STAKE_AMOUNT);

      const userStake = await stakingContract.getUserStake(
        await user1.getAddress()
      );
      expect(userStake[0]).to.equal(0);
    });

    it("Should fail if unstake amount exceeds staked amount", async function () {
      await time.increase(7 * 24 * 60 * 60);

      await expect(
        stakingContract.connect(user1).unstake(STAKE_AMOUNT * BigInt(2))
      ).to.be.revertedWith("Insufficient staked amount");
    });
  });
});
