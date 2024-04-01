import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Contract } from 'ethers';
import { Signer } from "@ethersproject/abstract-signer";
import { parseEther } from 'ethers/lib/utils';
import BalanceTree from '../src/balance-tree';

const URL1 = 'http://somewhere/logo1.png';
const URL2 = 'http://somewhere/logo2.png';

describe('MerkleDistributor', function () {
    let MerkleDistributor: Contract;
    let tree: BalanceTree;
    let token: Contract;
    let owner: Signer;
    let users: Signer[];
    let endTime: number;

    beforeEach(async function () {
        //@ts-ignore
        [owner, ...users] = await ethers.getSigners();

        tree = new BalanceTree([
            { account: await users[0].getAddress(), amount: parseEther('200') },
            { account: await users[1].getAddress(), amount: parseEther('300') },
            { account: await users[2].getAddress(), amount: parseEther('250') },
        ])

        const Token = await ethers.getContractFactory('TestERC20');
        token = await Token.deploy('Test', 'TST', parseEther('1000000'));
        await token.deployed();
        endTime = await ethers.provider.getBlock('latest').then(b => b.timestamp + 60 * 60); // 1 hour from now
        const MerkleDistributorFactory = await ethers.getContractFactory('MerkleDistributor');
        MerkleDistributor = await MerkleDistributorFactory.deploy('Explorer', 'EXPLORER', URL1, token.address, tree.getHexRoot());
        await MerkleDistributor.deployed();
        await token.transfer(MerkleDistributor.address, parseEther('1000000'));
        await MerkleDistributor.setWithdrawEnabledBefore(9999);
    });

    it('should claim nft and token', async function () {
        const nft = await ethers.getContractAt('ERC721', await MerkleDistributor.nft());
        await MerkleDistributor.claim(0, await users[0].getAddress(), parseEther('200'), tree.getProof(0, await users[0].getAddress(), parseEther('200')));
        await nft.connect(users[0]).approve(MerkleDistributor.address, 0);
        await MerkleDistributor.connect(users[0]).withdraw(0);
        expect(await token.balanceOf(await users[0].getAddress())).to.equal(parseEther('200'));
    });

    it('should all users claim nft and token', async function () {
        const nft = await ethers.getContractAt('ERC721', await MerkleDistributor.nft());
        expect(await MerkleDistributor.withdrawCount()).to.equal(0);
        expect(await MerkleDistributor.claimCount()).to.equal(0);

        await MerkleDistributor.claim(0, await users[0].getAddress(), parseEther('200'), tree.getProof(0, await users[0].getAddress(), parseEther('200')));
        expect(await MerkleDistributor.withdrawCount()).to.equal(0);
        expect(await MerkleDistributor.claimCount()).to.equal(1);
        await nft.connect(users[0]).approve(MerkleDistributor.address, 0);
        await MerkleDistributor.connect(users[0]).withdraw(0);

        await MerkleDistributor.claim(1, await users[1].getAddress(), parseEther('300'), tree.getProof(1, await users[1].getAddress(), parseEther('300')));
        await nft.connect(users[1]).approve(MerkleDistributor.address, 1);
        await MerkleDistributor.connect(users[1]).withdraw(1);

        await MerkleDistributor.claim(2, await users[2].getAddress(), parseEther('250'), tree.getProof(2, await users[2].getAddress(), parseEther('250')));
        await nft.connect(users[2]).approve(MerkleDistributor.address, 2);
        await MerkleDistributor.connect(users[2]).withdraw(2);

        expect(await MerkleDistributor.withdrawCount()).to.equal(3);
        expect(await MerkleDistributor.claimCount()).to.equal(3);
    });

    it('should set withdraw enabled before', async function () {
        const nft = await ethers.getContractAt('ERC721', await MerkleDistributor.nft());

        await MerkleDistributor.setWithdrawEnabledBefore(1);
        expect(await MerkleDistributor.withdrawEnabledBefore()).to.equal(1);

        await MerkleDistributor.claim(0, await users[0].getAddress(), parseEther('200'), tree.getProof(0, await users[0].getAddress(), parseEther('200')));
        await nft.connect(users[0]).approve(MerkleDistributor.address, 0);
        await MerkleDistributor.connect(users[0]).withdraw(0);

        await MerkleDistributor.claim(1, await users[1].getAddress(), parseEther('300'), tree.getProof(1, await users[1].getAddress(), parseEther('300')));
        await nft.connect(users[1]).approve(MerkleDistributor.address, 1);
        await expect(MerkleDistributor.connect(users[1]).withdraw(1)).revertedWith('MerkleDistributor: WITHDRAW_NOT_ENABLED');
    });

    it('should update token uri', async function () {
        const nft = await ethers.getContractAt('ERC721', await MerkleDistributor.nft());
        expect(await nft.tokenURI(0)).to.equal(URL1);
        await MerkleDistributor.setTokenURI(URL2);
        expect(await nft.tokenURI(0)).to.equal(URL2);
    });

    it('should not transfer nft ', async function () {
        const nft = await ethers.getContractAt('ERC721', await MerkleDistributor.nft());
        await MerkleDistributor.claim(0, await users[0].getAddress(), parseEther('200'), tree.getProof(0, await users[0].getAddress(), parseEther('200')));
        await expect(nft.connect(users[0]).transferFrom(await users[0].getAddress(), await users[1].getAddress(), 0)).revertedWith('DistributorNFT: TRANSFER_NOT_ALLOWED');
    });

    it('should not claim more than once', async function () {
        await MerkleDistributor.claim(0, await users[0].getAddress(), parseEther('200'), tree.getProof(0, await users[0].getAddress(), parseEther('200')));
        await expect(MerkleDistributor.claim(0, await users[0].getAddress(), parseEther('200'), tree.getProof(0, await users[0].getAddress(), parseEther('200')))).to.be.revertedWith('AlreadyClaimed');
    });

    it('should not withdraw more than once', async function () {
        await MerkleDistributor.claim(0, await users[0].getAddress(), parseEther('200'), tree.getProof(0, await users[0].getAddress(), parseEther('200')));
        const nft = await ethers.getContractAt('ERC721', await MerkleDistributor.nft());
        await nft.connect(users[0]).approve(MerkleDistributor.address, 0);
        await MerkleDistributor.connect(users[0]).withdraw(0);
        await expect(MerkleDistributor.connect(users[0]).withdraw(0)).to.be.revertedWith('DistributorNFT: DEACTIVATED');
    });

    it('should not claim nft and token with invalid proof', async function () {
        await expect(MerkleDistributor.connect(users[0]).claim(0, await users[0].getAddress(), 200, tree.getProof(1, await users[1].getAddress(), parseEther('300')))).to.be.revertedWith('InvalidProof');
    });

    it('should recover ERC20', async function () {
        await MerkleDistributor.recoverERC20(token.address);
        expect(await token.balanceOf(owner.getAddress())).to.equal(parseEther('1000000'));
    });

    it('should not withdraw tokens of other users', async function () {
        await MerkleDistributor.claim(0, await users[0].getAddress(), parseEther('200'), tree.getProof(0, await users[0].getAddress(), parseEther('200')));
        const nft = await ethers.getContractAt('ERC721', await MerkleDistributor.nft());
        await nft.connect(users[0]).approve(MerkleDistributor.address, 0);
        await expect(MerkleDistributor.connect(users[1]).withdraw(0)).to.be.revertedWith('DistributorNFT: INVALID_OWNER');
    });

    it('should not recover ERC20 by non-owner', async function () {
        expect(MerkleDistributor.connect(users[1]).recoverERC20(token.address)).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('should not set withdraw enabled before by non-owner', async function () {
        expect(MerkleDistributor.connect(users[1]).setWithdrawEnabledBefore(1)).to.be.revertedWith('Ownable: caller is not the owner');
    });
});