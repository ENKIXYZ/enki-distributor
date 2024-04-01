/**
 * @type import('hardhat/config').HardhatUserConfig
 */
require('dotenv').config()
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'

module.exports = {
    solidity: {
        compilers: [
            {
                version: '0.8.17',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 5000,
                    },
                },
            },
        ],
    },
    networks: {
        hardhat: {
            settings: {
                debug: {
                    revertStrings: 'debug',
                },
            },
        },
        metissepolia: {
            chainId: 59902,
            url: process.env.RPC_URL || 'https://sepolia.metisdevops.link',
            accounts:
                process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        andromeda: {
            chainId: 1088,
            url: process.env.RPC_URL || 'https://andromeda.metis.io/?owner=1088',
            accounts:
                process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
    },
}
