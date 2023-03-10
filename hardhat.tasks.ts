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
import { deployYbStrategy__task } from './tasks/deployEmptyYieldBoxStrategy';
import { setTrustedRemote__task } from './tasks/setTrustedRemote';
import { setProxyTrustedRemote__task } from './tasks/setProxyTrustedRemote';
import { setProxyAdapterParams__task } from './tasks/setProxyAdapterParams';

import { sameChainBorrow__task } from './tasks/test-sameChainBorrow';
import { otherChainBorrow__task } from './tasks/test-otherChainBorrow';
import { hasStoredPayload__task } from './tasks/test-hasStoredPayload';
import { retryPayload__task } from './tasks/test-retryPayload';
import { configurePacketTypes__task } from './tasks/configurePacketTypes';
import { whitelistSingularity__task } from './tasks/whitelistSingularity';
import { airdropGas__task } from './tasks/airdropGas';
import { batchSetTrustedRemote__task } from './tasks/batchSetTrustedRemote';
import { batchConfigureAdapterParams__task } from './tasks/batchConfigureAdapterParams';

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
).addOptionalParam('tag', 'Tag to export');

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
    'deployYbStrategy',
    'Deploy ERC20WithoutStrategy for YieldBox',
    deployYbStrategy__task,
)
    .addParam('yieldbox', 'YieldBox address')
    .addParam('token', 'ERC20 token address');

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

task(
    'setTrustedRemote',
    'Calls setTrustedRemote on USD0 contract',
    setTrustedRemote__task,
)
    .addParam('chain', 'LZ destination chain id for trusted remotes')
    .addParam('dst', 'USD0 destination address')
    .addParam('src', 'USD0 source address');

task(
    'setProxyTrustedRemote',
    'Calls setProxyTrustedRemote on MarketsProxy contract',
    setProxyTrustedRemote__task,
)
    .addParam('chain', 'LZ destination chain id for trusted remotes')
    .addParam('dst', 'MarketsProxy destination address')
    .addParam('src', 'MarketsProxy source address');

task(
    'setProxyAdapterParams',
    'Sets setUseCustomAdapterParams on MarketsProxy contract',
    setProxyAdapterParams__task,
).addOptionalParam(
    'lzDestinationId',
    'Destination LZ chain id to set min gas for',
);

task(
    'sameChainBorrow',
    'Deposits, adds collateral and borrows from the same chain',
    sameChainBorrow__task,
)
    .addParam('market', 'Singularity address')
    .addParam('marketHelper', 'MarketsHelper address')
    .addParam('collateralAmount', 'Collateral amount to add')
    .addParam('borrowAmount', 'Borrow amount to get');

task(
    'otherChainBorrow',
    'Deposits, adds collateral and borrows from the another chain',
    otherChainBorrow__task,
)
    .addParam('srcLzChainId', 'LZ source chain id')
    .addParam('destLzChainId', 'LZ destination chain id')
    .addParam('extraGas', 'Extra gas for LZ send tx')
    .addParam('assetId', 'Destination YieldBox asset id')
    .addParam('zroAddress', 'ZRO address')
    .addParam('depositGas', 'ETH sent for tx for YB deposit')
    .addParam('singularityGas', 'ETH sent for tx for Singularity operations')
    .addParam('airdropGas', 'ETH airdropped for withdraw operation')
    .addParam('depositAmount', 'ETH sent for tx')
    .addParam('oft', 'Tapioca OFT address')
    .addParam('proxy', 'Proxy contract address')
    .addParam('collateralShare', 'Collateral shares to add')
    .addParam('borrowAmount', 'Asset amount to borrow')
    .addParam('withdraw', 'True/false')
    .addParam('singularityDestination', 'Singularity destination');

task(
    'hasStoredPayload',
    'Check if endpoint has a stored payload',
    hasStoredPayload__task,
)
    .addParam('srcChainId', 'LZ source chain id')
    .addParam('srcAddress', 'Source address')
    .addParam('dstAddress', 'Destination address')
    .addParam('lzEndpoint', 'LZ endpoint address');

task('retryPayload', 'Retry a failed payload', retryPayload__task)
    .addParam('srcChainId', 'LZ source chain id')
    .addParam('srcAddress', 'Source address represented as bytes')
    .addParam('dstAddress', 'Destination address')
    .addParam('blockHash', 'Blockhash where to take the event from bytes')
    .addParam('lzEndpoint', 'LZ endpoint address');

task(
    'configurePacketTypes',
    'Cofigures min destination gas and the usage of custom adapters',
    configurePacketTypes__task,
)
    .addParam('dstLzChainId', 'LZ destination chain id for trusted remotes')
    .addParam('contract', 'Contract name: USD0, MarketsProxy')
    .addParam('src', 'tOFT address');

task(
    'whitelistSingularity',
    'Whitelist singularity status on SGLProxy',
    whitelistSingularity__task,
)
    .addParam('singularity', 'SGL address')
    .addParam('sglProxy', 'SGLProxy addressF');

task('airdropGas', 'Airdrop gas to msg.sender', airdropGas__task)
    .addParam('amount', 'Amount of gas to airdrop')
    .addParam('dstChain', 'Destination chain id')
    .addParam('dstAddress', 'Destination address');

task(
    'batchSetTrustedRemote',
    'Set trusted remote between all available tOFT contracts for the current chain',
    batchSetTrustedRemote__task,
).addParam('contract', 'Contract name to filter by');

task(
    'batchConfigureAdapterParams',
    'Sets OFT to use adapter params and the minimum destination gas between all available tOFT contracts for the current chain',
    batchConfigureAdapterParams__task,
).addParam('contract', 'Contract name to filter by');
