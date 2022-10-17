import * as dotenv from 'dotenv';

import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-chai-matchers';
import { HardhatUserConfig } from 'hardhat/config';
import 'hardhat-deploy';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';

dotenv.config();

const config: HardhatUserConfig & { dodoc?: any } = {
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
                version: '0.8.9',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 999,
                    },
                },
            },
            {
                version: '0.8.15',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 999,
                    },
                },
            },
        ],
    },
    namedAccounts: {
        deployer: 0,
    },
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            hardfork: 'merge',
            allowUnlimitedContractSize: true,
            accounts: {
                count: 10,
            },
            tags: ['testnet'],
        },
        //testnets
        goerli: {
            gasMultiplier: 2,
            url: process.env.GOERLI ?? 'https://rpc.ankr.com/eth_goerli',
            chainId: 5,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['testnet'],
            live: true,
        },
        bnb_testnet: {
            gasMultiplier: 2,
            url:
                process.env.BNBTESTNET ??
                'https://data-seed-prebsc-1-s1.binance.org:8545/',
            chainId: 97,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['testnet'],
            live: true,
        },
        fuji_avalanche: {
            gasMultiplier: 2,
            url:
                process.env.FUJIAVALANCHE ??
                'https://api.avax-test.network/ext/bc/C/rpc',
            chainId: 43113,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['testnet'],
            live: true,
        },
        mumbai: {
            gasMultiplier: 2,
            chainId: 80001,
            url: process.env.MUMBAI ?? 'https://rpc-mumbai.maticvigil.com/',
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['testnet'],
            live: true,
        },
        fantom_testnet: {
            gasMultiplier: 2,
            url:
                process.env.FANTOMTESTNET ??
                'https://rpc.testnet.fantom.network/',
            chainId: 0xfa2,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['testnet'],
            live: true,
        },
        arbitrum_goerli: {
            gasMultiplier: 2,
            url:
                process.env.ARBITRUMGOERLI ??
                'https://goerli-rollup.arbitrum.io/rpc',
            chainId: 421613,
            tags: ['testnet'],
            live: true,
        },
        optimism_goerli: {
            gasMultiplier: 2,
            url: process.env.OPTIMISMGOERLI ?? 'https://goerli.optimism.io/',
            chainId: 420,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['testnet'],
            live: true,
        },
        harmony_testnet: {
            gasMultiplier: 2,
            url: process.env.HARMONYTESTNET ?? 'https://api.s0.b.hmny.io',
            chainId: 1666700000,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['testnet'],
            live: true,
        },
        alfajores_celo: {
            gasMultiplier: 2,
            url:
                process.env.ALFAJORES ??
                'https://alfajores-forno.celo-testnet.org',
            chainId: 44787,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['testnet'],
            live: true,
        },
        baklava_celo: {
            gasMultiplier: 2,
            url:
                process.env.BAKLAVA ?? 'https://baklava-forno.celo-testnet.org',
            chainId: 62320,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['testnet'],
            live: true,
        },
        //mainnets
        eth: {
            url: process.env.ETH ?? 'https://mainnet.infura.io/v3/<api_key>',
            chainId: 1,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['mainnet'],
            live: true,
        },
        bnb: {
            url: process.env.BNB ?? 'https://bsc-dataseed.binance.org/',
            chainId: 56,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['mainnet'],
            live: true,
        },
        avalanche: {
            url:
                process.env.AVALANCHE ??
                'https://api.avax.network/ext/bc/C/rpc',
            chainId: 43114,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['mainnet'],
            live: true,
        },
        matic: {
            url: process.env.MATIC ?? 'https://rpc-mainnet.maticvigil.com',
            chainId: 0x89,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['mainnet'],
            live: true,
        },
        arbitrum: {
            url: process.env.ARBITRUM ?? 'https://rpc.ankr.com/arbitrum',
            chainId: 42161,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['mainnet'],
            live: true,
        },
        optimism: {
            url:
                process.env.OPTIMISM ??
                'https://opt-mainnet.g.alchemy.com/v2/<api_key>',
            chainId: 10,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['mainnet'],
            live: true,
        },
        fantom: {
            url: process.env.FANTOM ?? 'https://rpc.ftm.tools/',
            chainId: 0xfa,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['mainnet'],
            live: true,
        },
        harmony: {
            url: process.env.HARMONY ?? 'https://api.harmony.one/',
            chainId: 0x63564c40,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['mainnet'],
            live: true,
        },
        celo: {
            url: process.env.CELO ?? 'https://forno.celo.org',
            chainId: 42220,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['mainnet'],
            live: true,
        },
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
