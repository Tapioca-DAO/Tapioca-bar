import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { exportSDK__task } from './tasks/exportSDK';
import { getBeachBarMarkets__task } from './tasks/getBeachBarMarkets';
import {
    getLocalDeployments__task,
    getSDKDeployments__task,
} from './tasks/getDeployments';

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

task(
    'exportSDK',
    'Generate and export the typings and/or addresses for the SDK. May deploy contracts.',
    exportSDK__task,
).addFlag('mainnet', 'Using the current chain ID deployments.');

task(
    'markets',
    'Display the list of deployed markets for the current chain ID.',
    getBeachBarMarkets__task,
);

task(
    'getLocalDeployments',
    'Print a list of locally deployed contracts.',
    getLocalDeployments__task,
);

task(
    'getSDKDeployments',
    'Print a list of SDK deployed contract.',
    getSDKDeployments__task,
);
