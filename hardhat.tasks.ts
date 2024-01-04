import '@nomiclabs/hardhat-ethers';
import { task } from 'hardhat/config';

import { setBorrowCap__task } from './tasks/exec/setBorrowCap';

import { airdropGas__task } from './tasks/airdropGas';
import { deployEmptyStrats__task } from './tasks/deploy/02-deployEmptyStrats';
import { deployOracleMock__task } from './tasks/deploy/04-deployOracleMock';
import { setLiquidationQueue__task } from './tasks/exec/setLiquidationQueue';
import { setLiquidationQueueBidSwapper__task } from './tasks/exec/setLiquidationQueueBidSwapper';
import { setLiquidationQueueExecutionSwapper__task } from './tasks/exec/setLiquidationQueueExecutionSwapper';
import { setProxyAdapterParams__task } from './tasks/exec/setProxyAdapterParams';
import { setProxyTrustedRemote__task } from './tasks/exec/setProxyTrustedRemote';
import { registerYbAssets__task } from './tasks/exec/registerYbAssets';
import { hasStoredPayload__task } from './tasks/test-hasStoredPayload';
import { otherChainBorrow__task } from './tasks/test-otherChainBorrow';
import { retryPayload__task } from './tasks/test-retryPayload';
import { sameChainBorrow__task } from './tasks/test-sameChainBorrow';
import { getBigBangMarkets__task } from './tasks/view/getBigBangMarkets';
import { getBigBangTotals__task } from './tasks/view/getBigBangTotals';
import { getParticipantBigBangInfo__task } from './tasks/view/getParticipantBigBangInfo';
import { getParticipantSingularityInfo__task } from './tasks/view/getParticipantSingularityInfo';
import { getSingularityMarkets__task } from './tasks/view/getSingularityMarkets';
import { getSingularityTotals__task } from './tasks/view/getSingularityTotals';
import { whitelistSingularity__task } from './tasks/whitelistSingularity';
import {
    getLocalDeployments__task,
    getSDKDeployments__task,
} from './tasks/view/getDeployments';
import { deployFullStack__task } from './tasks/deploy/00-deployFullStack';
import { deployLinkedChainStack__task } from './tasks/deploy/01-deployLinkedChainStack';
import { deploySGLMarket__task } from './tasks/deploy/deploySGLMarket';
import { deployBigBangMarket__task } from './tasks/deploy/deployBigBangMarket';
import { deployOriginsMarket__task } from './tasks/deploy/deployOriginsMarket';
import { testCrossChainBorrow__task } from './tasks/test-borrow';
import { setMinterStatus__task } from './tasks/exec/setMinterStatus';
import { sameChainFlowTest__task } from './tasks/test-sameChainFlow';
import { crossChainRepay__task } from './tasks/test-crossChainRepay';
import { sendFrom__task } from './tasks/exec/sendFrom';
import { testDeployMockSwapper__task } from './tasks/deploy/1000-testDeployMockSwapper';
import { fillMockSwapper__test } from './tasks/exec/fillMockSwapper';
import { fillCluster__task } from './tasks/exec/fillCluster';
import { testGmxEarnCall__task } from './tasks/test-decode-gmx-call';
import { marketUpdatePause__task } from './tasks/exec/01-market-updatePause';
import { setLeverageExecutor__task } from './tasks/exec/02-market-setLeverageExecutor';
import { marketRescueEth__task } from './tasks/exec/03-market-rescueEth';
import { setMarketConfig__task } from './tasks/exec/04-market-setMarketConfig';
import { setSingularityConfig__task } from './tasks/exec/05-singularity-setSingularityConfig';
import { setMinAndMaxMintRange__task } from './tasks/exec/06-bb-setMinAndMaxMintRange';
import { setMinAndMaxMintFee__task } from './tasks/exec/07-bb-setMinAndMaxMintFee';
import { setAssetOracle__task } from './tasks/exec/08-bb-setAssetOracle';
import { setBigBangConfig__task } from './tasks/exec/09-bb-setBigBangConfig';
import { setPenroseCluster__task } from './tasks/exec/10-penrose-setCluster';
import { setBigBangEthMarketDebtRate__task } from './tasks/exec/11-penrose-setBigBangEthMarketDebtRate';
import { setBigBangEthMarket__task } from './tasks/exec/12-penrose-setBigBangEthMarket';
import { withdrawFees__task } from './tasks/exec/13-penrose-withdrawFees';
import { setUsdoFlashloanHelper__task } from './tasks/exec/14-usdo-setFlashloanHelper';
import { extractFeesFromUsdo__task } from './tasks/exec/15-usdo-extractFees';

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

/**
 * Getters
 */
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

/**
 * Execs
 */

task(
    'setMinterStatus',
    'Set minter status on USDO for an operator',
    setMinterStatus__task,
)
    .addParam('operator', 'Minter address')
    .addParam('status', 'true/false');

task(
    'setBurnerStatus',
    'Set burner status on USDO for an operator',
    setMinterStatus__task,
)
    .addParam('operator', 'Burner address')
    .addParam('status', 'true/false');

/**
 * 
/**
 * Deploy
 */

task('deploySGLMarket', 'Deploy a Singularity market', deploySGLMarket__task)
    .addOptionalParam('overrideOptions', 'Override options')
    .addOptionalParam(
        'executorName',
        'Deployed leverage executor contract name',
    )
    .addOptionalParam('oracleName', 'Deployed oracle name')
    .addOptionalParam('tokenStrategyName', 'Deployed token strategy name');

task(
    'deployBigBangMarket',
    'Deploy a BigBang market',
    deployBigBangMarket__task,
).addOptionalParam('overrideOptions', 'Override options');

task(
    'deployOriginsMarket',
    'Deploy a Origin market',
    deployOriginsMarket__task,
).addOptionalParam('overrideOptions', 'Override options');

task(
    'deployFullStack',
    'Deploy the stack, use it for the host chain. Includes the following contract:\nYieldBox, USDO, Penrose, MasterContracts, MarketHelper, MultiSwapper, SingularityModules, CurveSwapper, StableToUSD0Bidder',
    deployFullStack__task,
);

task(
    'deployLinkedChainStack',
    'Deploy the stack, use it for the host chain. Includes the following contract:\nYieldBox, USDO, Penromse, MasterContracts, MarketHelper, MultiSwapper, SingularityModules, CurveSwapper, StableToUSD0Bidder',
    deployLinkedChainStack__task,
);
task('deployOracleMock', 'Deploy Oracle mock', deployOracleMock__task).addParam(
    'name',
    'Market name',
);

task(
    'deployEmptyStrats',
    'Deploy a bunch of ERC20WithoutStrategy for YieldBox',
    deployEmptyStrats__task,
).addParam(
    'type',
    'Deploy empty strats for contracts of type:  TOFT = 0, MarketsProxy = 1, USDO = 2, TAP = 3,',
    '0',
);

task('setBorrowCap', 'Set borrow cap for Singularity', setBorrowCap__task)
    .addOptionalParam('singularity', 'Singularity address', ' ')
    .addOptionalParam('bigBang', 'BigBang address', ' ')
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
    'registerYbAssets',
    'Register a bunch of YieldBox assets',
    registerYbAssets__task,
).addVariadicPositionalParam('strategies', 'Specific strategies name');

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
    'whitelistSingularity',
    'Whitelist singularity status on SGLProxy',
    whitelistSingularity__task,
)
    .addParam('singularity', 'SGL address')
    .addParam('sglProxy', 'SGLProxy addressF');

task('airdropGas', 'Airdrop gas to msg.sender', airdropGas__task)
    .addParam('amount', 'Amount of gas to airdrop')
    .addParam('dstChain', 'Destination chain id')
    .addParam('dstAddress', 'Destination address')
    .addOptionalParam(
        'recursive',
        'Number of time the airdrop should be called',
    );

task(
    'testCrossChainBorrow',
    'Test crosschain borrow',
    testCrossChainBorrow__task,
);

task('testCrossChainRepay', 'Test crosschain repay', crossChainRepay__task);

// To Remove
task('sendFrom', 'Calls toftSendFrom on tOFT contract', sendFrom__task)
    .addParam('contractName', 'Name of the contract')
    .addParam('src', 'Name of the source chain')
    .addParam('dst', 'Name of the destination chain')
    .addParam('value', 'Amount to send, (ex: 1.45)');

/**
 * Test
 */
task(
    'sameChainFlowTest',
    'Test complete flow on same chain',
    sameChainFlowTest__task,
)
    .addParam('bbMarket', 'BigBang market address')
    .addParam('sglMarket', 'SGL market address')
    .addParam('magnetarAddress', 'Magnetar address');

task(
    'testDeployMockSwapper',
    'Deploy MockSwapper',
    testDeployMockSwapper__task,
);

task('fillMockSwapper', 'Fill MockSwapper with tokens', fillMockSwapper__test)
    .addParam('toft', 'tOFT address')
    .addParam('assetid', 'tOFT YB asset id');

task(
    'fillCluster',
    'Whitelist contracts on Cluster',
    fillCluster__task,
).addVariadicPositionalParam('chains', 'block.chainid array');

task('testGmxCall', 'decode gmx call', testGmxEarnCall__task).addParam(
    'tx',
    'TX hash',
);

task(
    'marketUpdatePause',
    'Updates pause state of a market',
    marketUpdatePause__task,
)
    .addParam('market', 'Market address')
    .addParam('type', 'PauseType')
    .addParam('status', 'Pause status');

task(
    'setLeverageExecutor',
    'Sets the leverage executor on a market',
    setLeverageExecutor__task,
)
    .addParam('market', 'Market address')
    .addParam('executor', 'Leverage exectutor address');

task('marketRescueEth', 'Rescue native from market', marketRescueEth__task)
    .addParam('market', 'Market address')
    .addParam('amount', 'The amount to save')
    .addParam('to', 'Receiver address');

task('setMarketConfig', 'Set config', setMarketConfig__task).addParam(
    'market',
    'Market address',
);

task('setSingularityConfig', 'Set config', setSingularityConfig__task).addParam(
    'singularity',
    'Singularity address',
);

task('setMinAndMaxMintRange', 'Set mint fee range', setMinAndMaxMintRange__task)
    .addParam('bb', 'BigBang address')
    .addParam('start', 'Mint fee start')
    .addParam('end', 'Mint fee end');

task('setMinAndMaxMintFee', 'Set mint fee range', setMinAndMaxMintFee__task)
    .addParam('bb', 'BigBang address')
    .addParam('min', 'Mint min fee')
    .addParam('max', 'Mint max fee');

task('setAssetOracle', 'Set mint fee range', setAssetOracle__task)
    .addParam('bb', 'BigBang address')
    .addParam('oracle', 'Oracle address')
    .addParam('oracleData', 'Oracle data');

task('setBigBangConfig', 'Set config', setBigBangConfig__task).addParam(
    'bb',
    'BigBang address',
);

task('setPenroseCluster', 'Set config', setPenroseCluster__task)
    .addParam('penrose', 'Penrose address')
    .addParam('cluster', 'Cluster address');

task(
    'setBigBangEthMarketDebtRate',
    'Set config',
    setBigBangEthMarketDebtRate__task,
)
    .addParam('penrose', 'Penrose address')
    .addParam('rate', 'Rate amount');

task('setBigBangEthMarket', 'Set config', setBigBangEthMarket__task)
    .addParam('penrose', 'Penrose address')
    .addParam('bb', 'BB market');

task('withdrawMarketFees', 'Set config', withdrawFees__task)
    .addParam('penrose', 'Penrose address')
    .addParam('twTap', 'twTap address')
    .addVariadicPositionalParam('markets', 'Market addresses');

task(
    'setUsdoFlashloanHelper',
    'Set USDO flashloan helper',
    setUsdoFlashloanHelper__task,
).addParam('helper', 'Flashloan helper address');

task(
    'extractFeesFromUsdo',
    'Extract fees from USDO',
    extractFeesFromUsdo__task,
);
