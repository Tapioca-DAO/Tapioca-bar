import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { getDeployments__task } from './tasks/getDeployments';
import { exportSDK__task } from './tasks/exportSDK';
import { getBeachBarMarkets__task } from './tasks/getBeachBarMarkets';

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
    'getDeployments',
    'Print a list of deployed contract.',
    getDeployments__task,
);
