// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.17;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {IMerkleDistributor} from "./interfaces/IMerkleDistributor.sol";
import {DistributorNFT} from "./DistributorNFT.sol";

error AlreadyClaimed();
error InvalidProof();

contract MerkleDistributor is IMerkleDistributor, Ownable {
    using SafeERC20 for IERC20;
    address public immutable override nft;
    address public immutable override token;
    bytes32 public immutable override merkleRoot;

    uint64 public override withdrawEnabledBefore;
    uint64 public override withdrawCount;
    uint64 public override claimCount;

    // This is a packed array of booleans.
    mapping(uint256 => uint256) private claimedBitMap;

    constructor(uint64 withdrawEnabledBefore_, string memory nftName, string memory nftSymbol, string memory tokenURI, address token_, bytes32 merkleRoot_) {
        require(token_ != address(0), "MerkleDistributor: INVALID_TOKEN");
        require(merkleRoot_ != bytes32(0), "MerkleDistributor: INVALID_MERKLE_ROOT");

        withdrawEnabledBefore = withdrawEnabledBefore_;
        nft = address(new DistributorNFT(nftName, nftSymbol, tokenURI, address(this)));
        token = token_;
        merkleRoot = merkleRoot_;
    }

    function isClaimed(uint256 index) public view override returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[claimedWordIndex] = claimedBitMap[claimedWordIndex] | (1 << claimedBitIndex);
    }

    function setWithdrawEnabledBefore(uint64 withdrawEnabledBefore_) external onlyOwner {
        withdrawEnabledBefore = withdrawEnabledBefore_;
    }

    function recoverERC20(address token_) external onlyOwner {
        IERC20(token_).safeTransfer(msg.sender, IERC20(token_).balanceOf(address(this)));
    }

    function setTokenURI(string memory tokenURI) external onlyOwner {
        DistributorNFT(nft).setTokenURI(tokenURI);
    }

    function claim(uint256 index, address account, uint256 amount, bytes32[] calldata merkleProof)
        public
        virtual
        override
    {
        if (isClaimed(index)) revert AlreadyClaimed();

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount));
        if (!MerkleProof.verify(merkleProof, merkleRoot, node)) revert InvalidProof();

        // Mark it claimed and send the token.
        _setClaimed(index);

        claimCount += 1;

        DistributorNFT(nft).mint(account, index, amount);

        emit Claimed(index, account, amount);
    }
    
    function withdraw(uint256 tokenId) public virtual override {
        require(tokenId < withdrawEnabledBefore, "MerkleDistributor: WITHDRAW_NOT_ENABLED");

        DistributorNFT _nft = DistributorNFT(nft);
        uint256 amount = _nft.claimableAmounts(tokenId);
        _nft.deactivateFrom(msg.sender, tokenId);
        withdrawCount += 1;

        require(IERC20(token).balanceOf(address(this)) >= amount, "MerkleDistributor: INSUFFICIENT_BALANCE");
        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(tokenId, msg.sender, amount);
    }
}
