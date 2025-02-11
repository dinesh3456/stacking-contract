# Staking Contract Documentation

## Overview

This smart contract implements a staking mechanism that allows users to deposit ERC-20 tokens and withdraw them after a lock-in period. The contract is designed with security and gas efficiency in mind, utilizing OpenZeppelin's security patterns.

## Contract Architecture

### Core Components

1. **StakeInfo Structure**

   - `amount`: Tracks the user's staked token amount
   - `timestamp`: Records when the user last staked tokens

2. **State Variables**

   - `stakingToken`: The ERC-20 token that can be staked
   - `lockInPeriod`: Time duration tokens must remain staked (7 days)
   - `stakes`: Mapping of user addresses to their StakeInfo

3. **Events**
   - `Staked(address indexed user, uint256 amount)`
   - `Unstaked(address indexed user, uint256 amount)`

## Key Functions

### stake(uint256 \_amount)

Allows users to stake tokens:

- Validates amount is greater than 0
- Updates user's stake information
- Transfers tokens from user to contract
- Emits Staked event

### unstake(uint256 \_amount)

Allows users to withdraw staked tokens:

- Checks if lock-in period has elapsed
- Validates sufficient stake balance
- Updates user's stake information
- Transfers tokens back to user
- Emits Unstaked event

### getUserStake(address \_user)

View function to check user's stake:

- Returns current staked amount and timestamp

## Security Features

1. **Reentrancy Protection**

   - Uses OpenZeppelin's ReentrancyGuard
   - Prevents potential reentrancy attacks during stake/unstake

2. **Safe Token Transfers**

   - Validates all token transfers
   - Requires successful transfer confirmation

3. **Input Validation**
   - Checks for zero amounts
   - Validates sufficient balances
   - Ensures lock-in period compliance

## Testing

The contract includes comprehensive tests covering:

1. Deployment validation
2. Staking functionality
3. Unstaking restrictions
4. Lock-in period enforcement
5. Balance tracking accuracy
6. Event emission verification

## Development and Deployment

### Prerequisites

- Node.js and npm installed
- Hardhat development environment

### Setup

```bash
npm install
```

### Testing

```bash
npx hardhat test
```

### Deployment

```bash
npx hardhat run scripts/deploy.js --network <network-name>
```

## Security Considerations

1. **Token Compatibility**

   - Contract works with standard ERC-20 tokens
   - Tokens with transfer fees or non-standard implementations may not work correctly

2. **Lock-in Period**

   - Fixed 7-day lock-in period
   - Cannot be modified after deployment

3. **Access Control**
   - No special admin privileges
   - All users have equal access to functionality

## Gas Optimization

The contract implements several gas optimization techniques:

1. Uses storage pointers for state modifications
2. Minimizes state changes
3. Efficient use of events for tracking
4. Optimized data structures
