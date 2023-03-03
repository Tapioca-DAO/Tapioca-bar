import * as dotenv from 'dotenv';

import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomiclabs/hardhat-vyper';
import { HardhatUserConfig } from 'hardhat/config';
import 'hardhat-deploy';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import SDK from 'tapioca-sdk';
import { HttpNetworkConfig } from 'hardhat/types';
import 'hardhat-tracer';

dotenv.config();

let supportedChains: { [key: string]: HttpNetworkConfig } = SDK.API.utils
    .getSupportedChains()
    .reduce(
        (sdkChains, chain) => ({
            ...sdkChains,
            [chain.name]: <HttpNetworkConfig>{
                accounts:
                    process.env.PRIVATE_KEY !== undefined
                        ? [process.env.PRIVATE_KEY]
                        : [],
                live: true,
                url: `https://rpc.ankr.com/fantom_testnet`, //chain.rpc.replace('<api_key>', process.env.ALCHEMY_KEY),
                gasMultiplier: chain.tags.includes('testnet') ? 2 : 1,
                chainId: Number(chain.chainId),
            },
        }),
        {},
    );

const config: HardhatUserConfig & { dodoc?: any; vyper: any } = {
    solidity: {
        compilers: [
            {
                version: '0.6.12',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: '0.7.6',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: '0.8.9',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
            {
                version: '0.8.15',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    vyper: {
        compilers: [{ version: '0.2.16' }],
    },
    namedAccounts: {
        deployer: 0,
    },
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            forking: {
                url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
            },
            hardfork: 'merge',
            allowUnlimitedContractSize: true,
            accounts: {
                mnemonic:
                    'test test test test test test test test test test test junk',
                count: 10,
                accountsBalance: '1000000000000000000000',
            },
            tags: ['testnet'],
        },

        //testnets
        goerli: supportedChains['goerli'],
        bnb_testnet: supportedChains['bnb_testnet'],
        fuji_avalanche: supportedChains['fuji_avalanche'],
        mumbai: supportedChains['mumbai'],
        fantom_testnet: supportedChains['fantom_testnet'],
        arbitrum_goerli: supportedChains['arbitrum_goerli'],
        optimism_goerli: supportedChains['optimism_goerli'],
        harmony_testnet: supportedChains['harmony_testnet'],

        //mainnets
        ethereum: supportedChains['ethereum'],
        bnb: supportedChains['bnb'],
        avalanche: supportedChains['avalanche'],
        matic: supportedChains['polygon'],
        arbitrum: supportedChains['arbitrum'],
        optimism: supportedChains['optimism'],
        fantom: supportedChains['fantom'],
        harmony: supportedChains['harmony'],
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_KEY,
        customChains: [],
    },
    typechain: {
        outDir: 'typechain',
        target: 'ethers-v5',
    },
    gasReporter: {
        enabled: false,
    },
    mocha: {
        timeout: 4000000,
    },
    dodoc: {
        runOnCompile: true,
        freshOutput: true,
    },
};

export default config;
