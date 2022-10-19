import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { deployMarket__task } from './tasks/deployMarket';
import { deployMinterMarket__task } from './tasks/deployMinterMarket';
import { exportSDK__task } from './tasks/exportSDK';
import { getBeachBarMarkets__task } from './tasks/getBeachBarMarkets';
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
import { getParticipantMixologistInfo__task } from './tasks/getParticipantMixologistInfo';
import { getMixologistTotals__task } from './tasks/getMixologistTotals';
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
    getBeachBarMarkets__task,
);

task(
    'deployMarket',
    'Deploy a Mixologist market, a Liquidation Queue and initialize it.',
    deployMarket__task,
).addParam('name', 'Market name');

task(
    'deployMinterMarket',
    'Deploy a MinterMixologist market',
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

//Mixologist viwers
task(
    'getParticipantMixologistInfo',
    'Returns lend & borrow details for a specific address',
    getParticipantMixologistInfo__task,
)
    .addParam('mixologist', 'Mixologist address')
    .addParam('participant', 'User address');

task(
    'getMixologistTotals',
    'Returns mixologist totals info',
    getMixologistTotals__task,
).addParam('mixologist', 'Mixologist address');

//Mixologist setters
task(
    'setColleteralSwapPath',
    'Updates collateral swap path for Mixologist',
    setCollateralSwapPath__task,
)
    .addParam('mixologist', 'Mixologist address')
    .addParam('path', 'Collateral swap path []');

task(
    'setTapSwapPath',
    'Updates TAP swap path for Mixologist',
    setTapSwapPath__task,
)
    .addParam('mixologist', 'Mixologist address')
    .addParam('path', 'TAP swap path []');

task('setBorrowCap', 'Set borrow cap for Mixologist', setBorrowCap__task)
    .addParam('mixologist', 'Mixologist address')
    .addParam('cap', 'Borrow cap value');

task(
    'setLiquidationQueueBidSwapper',
    'Updates LiquidationQueue bid swapper',
    setLiquidationQueueBidSwapper__task,
)
    .addParam('mixologist', 'Mixologist address')
    .addParam('swapper', 'Swapper address');

task(
    'setLiquidationQueueExecutionSwapper',
    'Updates LiquidationQueue execution swapper',
    setLiquidationQueueExecutionSwapper__task,
)
    .addParam('mixologist', 'Mixologist address')
    .addParam('swapper', 'Swapper address');

task(
    'setLiquidationQueue',
    'Updates LiquidationQueue',
    setLiquidationQueue__task,
)
    .addParam('mixologist', 'Mixologist address')
    .addParam('liquidationQueue', 'LiquidationQueue address')
    .addParam('meta', 'LiquidationQueue meta object');

task(
    'registerYieldBoxAsset',
    'Register YieldBox asset',
    registerYieldBoxAsset__task,
).addParam('address', 'Asset address');
