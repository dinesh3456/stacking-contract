// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC721Minimal {
    function balanceOf(address owner) external view returns (uint256);
}