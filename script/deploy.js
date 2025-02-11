const hre = require("hardhat");

async function main() {
  // Deploy Mock Token first
  const MockToken = await hre.ethers.getContractFactory("MockERC20");
  const mockToken = await MockToken.deploy();
  await mockToken.deployed();
  console.log("MockToken deployed to:", mockToken.address);

  // Deploy Staking Contract
  const StakingContract = await hre.ethers.getContractFactory(
    "StakingContract"
  );
  const stakingContract = await StakingContract.deploy(mockToken.address);
  await stakingContract.deployed();
  console.log("StakingContract deployed to:", stakingContract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
