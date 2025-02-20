// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IERC721Minimal.sol";

contract StakingRewards is ReentrancyGuard {
    using Math for uint256;

    struct StakeInfo {
        uint256 amount;
        uint256 timestamp;
        uint256 rewardDebt;
        uint256 lastClaimTimestamp;
    }

    // Constants
    uint256 public constant BASE_APY = 500; // 5% annual return (in basis points)
    uint256 public constant NFT_BOOST_MULTIPLIER = 150; // 1.5x multiplier (in percentages)
    uint256 public constant PERFORMANCE_TIER1_THRESHOLD = 1000000 * 1e18; // 1M tokens
    uint256 public constant PERFORMANCE_TIER1_BONUS = 200; // +2% APY
    uint256 public constant PERFORMANCE_TIER2_THRESHOLD = 5000000 * 1e18; // 5M tokens
    uint256 public constant PERFORMANCE_TIER2_BONUS = 500; // +5% APY
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // State variables
    IERC20 public immutable stakingToken;
    IERC721Minimal public immutable boosterNFT;
    uint256 public totalStaked;

    mapping(address => StakeInfo) public stakes;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    constructor(address _stakingToken, address _boosterNFT) {
        require(
            _stakingToken != address(0) && _boosterNFT != address(0),
            "Invalid address"
        );
        stakingToken = IERC20(_stakingToken);
        boosterNFT = IERC721Minimal(_boosterNFT);
    }

    function getCurrentAPY() public view returns (uint256) {
        uint256 apy = BASE_APY;

        // Add performance-based APY
        if (totalStaked >= PERFORMANCE_TIER2_THRESHOLD) {
            apy += PERFORMANCE_TIER2_BONUS;
        } else if (totalStaked >= PERFORMANCE_TIER1_THRESHOLD) {
            apy += PERFORMANCE_TIER1_BONUS;
        }

        return apy;
    }

    function getUserMultiplier(address user) public view returns (uint256) {
        // Check if user has booster NFT
        if (boosterNFT.balanceOf(user) > 0) {
            return NFT_BOOST_MULTIPLIER;
        }
        return 100; // Base multiplier (100%)
    }

    function calculateRewards(address user) public view returns (uint256) {
        StakeInfo storage userStakeInfo = stakes[user];
        if (userStakeInfo.amount == 0) return 0;

        uint256 timeElapsed = block.timestamp -
            userStakeInfo.lastClaimTimestamp;
        uint256 apy = getCurrentAPY();
        uint256 multiplier = getUserMultiplier(user);

        // Calculate rewards: amount * (APY * multiplier) * timeElapsed / (SECONDS_PER_YEAR * BASIS_POINTS * 100)
        uint256 reward = (userStakeInfo.amount *
            apy *
            multiplier *
            timeElapsed) / (SECONDS_PER_YEAR * BASIS_POINTS * 100);

        return reward;
    }

    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");

        // Claim any pending rewards before updating stake
        _claimRewards();

        // Update the stake info
        stakes[msg.sender].amount += _amount;
        stakes[msg.sender].timestamp = block.timestamp;
        stakes[msg.sender].lastClaimTimestamp = block.timestamp;
        totalStaked += _amount;

        // Transfer tokens to this contract
        require(
            stakingToken.transferFrom(msg.sender, address(this), _amount),
            "Transfer failed"
        );

        emit Staked(msg.sender, _amount);
    }

    function unstake(uint256 _amount) external nonReentrant {
        StakeInfo storage userStakeInfo = stakes[msg.sender];
        require(userStakeInfo.amount >= _amount, "Insufficient staked amount");

        // Claim any pending rewards before unstaking
        _claimRewards();

        // Update the stake info
        userStakeInfo.amount -= _amount;
        totalStaked -= _amount;

        // Transfer tokens back to user
        require(stakingToken.transfer(msg.sender, _amount), "Transfer failed");

        emit Unstaked(msg.sender, _amount);
    }

    function claimRewards() external nonReentrant {
        _claimRewards();
    }

    function _claimRewards() internal {
        uint256 rewards = calculateRewards(msg.sender);
        if (rewards > 0) {
            stakes[msg.sender].lastClaimTimestamp = block.timestamp;
            require(
                stakingToken.transfer(msg.sender, rewards),
                "Reward transfer failed"
            );
            emit RewardsClaimed(msg.sender, rewards);
        }
    }

    function getUserStake(
        address _user
    )
        external
        view
        returns (
            uint256 amount,
            uint256 timestamp,
            uint256 pendingRewards,
            uint256 currentAPY,
            uint256 userMultiplier
        )
    {
        StakeInfo memory userStakeInfo = stakes[_user];
        return (
            userStakeInfo.amount,
            userStakeInfo.timestamp,
            calculateRewards(_user),
            getCurrentAPY(),
            getUserMultiplier(_user)
        );
    }
}
