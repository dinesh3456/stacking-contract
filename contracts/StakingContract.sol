// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract StakingContract is ReentrancyGuard {
    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
    }

    IERC20 public stakingToken;
    uint256 public lockInPeriod = 7 days;

    mapping(address => StakeInfo) public stakes;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);

    constructor(address _stakingToken) {
        require(_stakingToken != address(0), "Invalid token address");
        stakingToken = IERC20(_stakingToken);
    }

    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");

        // Update the stake info
        stakes[msg.sender].amount += _amount;
        stakes[msg.sender].timestamp = block.timestamp;

        // Transfer tokens to this contract
        require(
            stakingToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );

        emit Staked(msg.sender, _amount);
    }

    function unstake(uint256 _amount) external nonReentrant {
        StakeInfo storage userStake = stakes[msg.sender];
        require(userStake.amount >= _amount, "Insufficient staked amount");
        require(
            block.timestamp >= userStake.timestamp + lockInPeriod,
            "Lock-in period not over"
        );

        // Update the stake info
        userStake.amount -= _amount;

        // Transfer tokens back to user
        require(stakingToken.transfer(msg.sender, _amount), "Transfer failed");

        emit Unstaked(msg.sender, _amount);
    }

    function getUserStake(
        address _user
    ) external view returns (uint256 amount, uint256 timestamp) {
        StakeInfo memory userStake = stakes[_user];
        return (userStake.amount, userStake.timestamp);
    }
}
