// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.5.0;

// Allows anyone to claim a token if they exist in a merkle root.
interface IMerkleDistributor {
    // Returns the address of the NFToken distributed by this contract.
    function nft() external view returns (address);
    // Returns the address of the token distributed by this contract.
    function token() external view returns (address);
    // Returns the merkle root of the merkle tree containing account balances available to claim.
    function merkleRoot() external view returns (bytes32);
    // Returns the index before which the withdraw function is enabled.
    function withdrawEnabledBefore() external view returns (uint64);
    // Returns the number of withdraws made.
    function withdrawCount() external view returns (uint64);
    // Returns the number of claims made.
    function claimCount() external view returns (uint64);
    // Returns true if the index has been marked claimed.
    function isClaimed(uint256 index) external view returns (bool);
    // Claim the given amount of the token to the given address. Reverts if the inputs are invalid.
    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof) external;
    // withdraw the ERC20 token according to the tokenId
    function withdraw(uint256 tokenId) external;

    // This event is triggered whenever a call to #claim succeeds.
    event Claimed(uint256 index, address account, uint256 amount);
    // This event is triggered whenever a call to #withdraw succeeds.
    event Withdrawn(uint256 tokenId, address account, uint256 amount);
}
