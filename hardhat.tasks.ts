import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';
import { deployMarket__task } from './tasks/deployMarket';
import { deployBigBang__task } from './tasks/deployBigBang';
import { exportSDK__task } from './tasks/exportSDK';
import { getSingularityMarkets__task } from './tasks/getSingularityMarkets';
import { getBigBangMarkets__task } from './tasks/getBigBangMarkets';
import {
    getLocalDeployments__task,
    getSDKDeployments__task,
} from './tasks/getDeployments';
import { setBorrowCap__task } from './tasks/setBorrowCap';
import { registerYieldBoxAsset__task } from './tasks/registerYieldBoxAsset';
import { setLiquidationQueueBidSwapper__task } from './tasks/setLiquidationQueueBidSwapper';
import { setLiquidationQueueExecutionSwapper__task } from './tasks/setLiquidationQueueExecutionSwapper';
import { setLiquidationQueue__task } from './tasks/setLiquidationQueue';

import { getParticipantSingularityInfo__task } from './tasks/getParticipantSingularityInfo';
import { getParticipantBigBangInfo__task } from './tasks/getParticipantBigBangInfo';

import { getSingularityTotals__task } from './tasks/getSingularityTotals';
import { getBigBangTotals__task } from './tasks/getBigBangTotals';

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
    'singularityMarkets',
    'Display the list of deployed Singularity markets for the current chain ID.',
    getSingularityMarkets__task,
);
task(
    'bigBangMarkets',
    'Display the list of deployed BigBang markets for the current chain ID.',
    getBigBangMarkets__task,
);

task(
    'deployMarket',
    'Deploy a Singularity market, a Liquidation Queue and initialize it.',
    deployMarket__task,
)
    .addParam('name', 'Market name')
    .addParam('exchangeRatePrecision', 'Collateral decimals');

task('deployBigBang', 'Deploy a BigBang market', deployBigBang__task)
    .addParam('name', 'Market name')
    .addParam('exchangeRatePrecision', 'Collateral decimals');

task('deployOracleMock', 'Deploy Oracle mock', deployOracleMock__task).addParam(
    'name',
    'Market name',
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

task(
    'getParticipantSingularityInfo',
    'Returns lend & borrow details for a specific address',
    getParticipantSingularityInfo__task,
)
    .addParam('singularity', 'Singularity address')
    .addParam('participant', 'User address');

task(
    'getParticipantBigBangInfo',
    'Returns lend & borrow details for a specific address',
    getParticipantBigBangInfo__task,
)
    .addParam('singularity', 'Singularity address')
    .addParam('participant', 'User address');

task(
    'getSingularityTotals',
    'Returns Singularity totals info',
    getSingularityTotals__task,
).addParam('singularity', 'Singularity address');
task(
    'getBigBangTotals',
    'Returns BigBang totals info',
    getBigBangTotals__task,
).addParam('bigBang', 'BigBang address');

task('setBorrowCap', 'Set borrow cap for Singularity', setBorrowCap__task)
    .addParam('singularity', 'Singularity address', ' ')
    .addParam('bigBang', 'BigBang address', ' ')
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
