require('dotenv').config()
require('@nomiclabs/hardhat-ethers')
const { ethers } = require('hardhat')
const { FIRST, NAME, TOKEN, ROOT } = process.env;
const URI = `https://cdn.enkixyz.com/fantasy-nft/nft_${NAME}.png`

async function main() {
    const MerkleDistributor = await ethers.getContractFactory('MerkleDistributor')
    const merkleDistributor = await MerkleDistributor.deploy(FIRST, `ENKI ${NAME}`, NAME.toUpperCase(), URI, TOKEN, ROOT);
    await merkleDistributor.deployed()
    console.log(`merkleDistributor deployed at ${merkleDistributor.address}`)
}

main()
    // eslint-disable-next-line no-process-exit
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        // eslint-disable-next-line no-process-exit
        process.exit(1)
    })
