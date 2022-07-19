import * as dotenv from 'dotenv';

import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
import '@nomiclabs/hardhat-etherscan';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-contract-sizer';
import '@primitivefi/hardhat-dodoc';
// import 'hardhat-gas-reporter';
// import 'solidity-coverage';

dotenv.config();

const config: HardhatUserConfig = {
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
                version: '0.8.15',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 100,
                    },
                },
            },
        ],
        overrides: {
            'contracts/mixologist/Mixologist.sol': {
                version: '0.8.15',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        },
    },
    namedAccounts: {
        deployer: 0,
    },
    defaultNetwork: 'hardhat',
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
            accounts:
                {
                    // Default size of accounts is 100, but can be changed in .env
                    count:
                        process.env.ACCOUNTS_NUMBER !== undefined
                            ? parseInt(process.env.ACCOUNTS_NUMBER)
                            : 100,
                },
        },
        rinkeby: {
            gasMultiplier: 2,
            url:
                process.env.RINKEBY ??
                'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
            chainId: 4,
            accounts:
                process.env.PRIVATE_KEY !== undefined
                    ? [process.env.PRIVATE_KEY]
                    : [],
            tags: ['testnet'],
        },
    },
    etherscan: {
        apiKey: {
            rinkeby: process.env.RINKEBY_KEY ?? '',
        },
    },
    // gasReporter: {
    //     currency: 'USD',
    //     token: 'BOBA',
    //     coinmarketcap: process.env.COINMARKETCAP_API ?? '',
    // },
    mocha: {
        timeout: 4000000,
    },
    dodoc: {
        runOnCompile: true,
        freshOutput: true,
    },
};

export default config;
