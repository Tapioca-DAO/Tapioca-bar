import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { deployMarket__task } from './tasks/deployMarket';
import { deployMinterMarket__task } from './tasks/deployMinterMarket';
import { exportSDK__task } from './tasks/exportSDK';
import { getPenroseMarkets__task } from './tasks/getPenroseMarkets';
import {
    getLocalDeployments__task,
    getSDKDeployments__task,
} from './tasks/getDeployments';
import { setCollateralSwapPath__task } from './tasks/setCollateralSwapPath';
import { setTapSwapPath__task } from './tasks/setTapSwapPath';
import { setBorrowCap__task } from './tasks/setBorrowCap';
import { registerYieldBoxAsset__task } from './tasks/registerYieldBoxAsset';
import { setLiquidationQueueBidSwapper__task } from './tasks/setLiquidationQueueBidSwapper';
import { setLiquidationQueueExecutionSwapper__task } from './tasks/setLiquidationQueueExecutionSwapper';
import { setLiquidationQueue__task } from './tasks/setLiquidationQueue';
import { getParticipantSingularityInfo__task } from './tasks/getParticipantSingularityInfo';
import { getSingularityTotals__task } from './tasks/getSingularityTotals';
import { deployOracleMock__task } from './tasks/deployOracleMock';

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
    getPenroseMarkets__task,
);

task(
    'deployMarket',
    'Deploy a Singularity market, a Liquidation Queue and initialize it.',
    deployMarket__task,
).addParam('name', 'Market name');

task(
    'deployMinterMarket',
    'Deploy a MinterSingularity market',
    deployMinterMarket__task,
).addParam('name', 'Market name');

task(
    'deployOracleMock',
    'Deploy USDC-WETH Oracle mock',
    deployOracleMock__task,
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

//Singularity viewers
task(
    'getParticipantSingularityInfo',
    'Returns lend & borrow details for a specific address',
    getParticipantSingularityInfo__task,
)
    .addParam('singularity', 'Singularity address')
    .addParam('participant', 'User address');

task(
    'getSingularityTotals',
    'Returns singularity totals info',
    getSingularityTotals__task,
).addParam('singularity', 'Singularity address');

//Singularity setters
task(
    'setColleteralSwapPath',
    'Updates collateral swap path for Singularity',
    setCollateralSwapPath__task,
)
    .addParam('singularity', 'Singularity address')
    .addParam('path', 'Collateral swap path []');

task(
    'setTapSwapPath',
    'Updates TAP swap path for Singularity',
    setTapSwapPath__task,
)
    .addParam('singularity', 'Singularity address')
    .addParam('path', 'TAP swap path []');

task('setBorrowCap', 'Set borrow cap for Singularity', setBorrowCap__task)
    .addParam('singularity', 'Singularity address')
    .addParam('cap', 'Borrow cap value');

task(
    'setLiquidationQueueBidSwapper',
    'Updates LiquidationQueue bid swapper',
    setLiquidationQueueBidSwapper__task,
)
    .addParam('singularity', 'Singularity address')
    .addParam('swapper', 'Swapper address');

task(
    'setLiquidationQueueExecutionSwapper',
    'Updates LiquidationQueue execution swapper',
    setLiquidationQueueExecutionSwapper__task,
)
    .addParam('singularity', 'Singularity address')
    .addParam('swapper', 'Swapper address');

task(
    'setLiquidationQueue',
    'Updates LiquidationQueue',
    setLiquidationQueue__task,
)
    .addParam('singularity', 'Singularity address')
    .addParam('liquidationQueue', 'LiquidationQueue address')
    .addParam('meta', 'LiquidationQueue meta object');

task(
    'registerYieldBoxAsset',
    'Register YieldBox asset',
    registerYieldBoxAsset__task,
).addParam('address', 'Asset address');
