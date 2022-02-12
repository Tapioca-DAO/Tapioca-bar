import * as dotenv from 'dotenv';

import { HardhatUserConfig } from 'hardhat/config';
import '@nomiclabs/hardhat-waffle';
import '@typechain/hardhat';
// import '@nomiclabs/hardhat-etherscan';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-gas-reporter';
import 'solidity-coverage';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: '0.6.12',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  namedAccounts: {
    deployer: 0,
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      accounts:
        process.env.PRIVATE_KEY !== undefined
          ? [
            {
              privateKey: process.env.PRIVATE_KEY,
              balance: '1000000000000000000000000',
            },
          ]
          : [],
    },
    testnet: {
      gasMultiplier: 2,
      url: 'https://rinkeby.boba.network/',
      chainId: 28,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      gasMultiplier: 2,
      live: true,
      url: "https://mainnet.boba.network/",
      chainId: 288,
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  // etherscan: {
  //   apiKey: process.env.BLOCKSCAN_KEY,
  // },
  gasReporter: {
    currency: 'USD',
    token: 'BOBA',
    coinmarketcap: process.env.COINMARKETCAP_API ?? '',
  },
  mocha: {
    timeout: 4000000,
  },
};

export default config;
