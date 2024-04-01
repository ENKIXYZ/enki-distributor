// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity =0.8.17;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract DistributorNFT is ERC721 {
    string public _tokenURI;
    address public minter;
    mapping(uint256 => uint256) public claimableAmounts;

    constructor(string memory name, string memory symbol, string memory tokenURI_, address _minter) ERC721(name, symbol) {
        minter = _minter;
        _tokenURI = tokenURI_;
    }

    function mint(address to, uint256 tokenId, uint256 claimableAmount) external {
        require(msg.sender == minter, "DistributorNFT: FORBIDDEN");
        require(claimableAmount > 0, "DistributorNFT: INVALID_CLAIMABLE_AMOUNT");
        claimableAmounts[tokenId] = claimableAmount;
        _mint(to, tokenId);
    }

    function deactivateFrom(address from, uint256 tokenId) external {
        require(ownerOf(tokenId) == from, "DistributorNFT: INVALID_OWNER");
        require(claimableAmounts[tokenId] > 0, "DistributorNFT: DEACTIVATED");
        claimableAmounts[tokenId] = 0;
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal override {
        require(from == address(0), "DistributorNFT: TRANSFER_NOT_ALLOWED");
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return _tokenURI;
    }

    function setTokenURI(string memory tokenURI_) external {
        require(msg.sender == minter, "DistributorNFT: FORBIDDEN");
        _tokenURI = tokenURI_;
    }
}