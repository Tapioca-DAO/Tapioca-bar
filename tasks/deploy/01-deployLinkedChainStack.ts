import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { typechain } from 'tapioca-sdk';
import { Multicall3 } from 'tapioca-sdk/dist/typechain/utils/MultiCall';
import { constants } from '../../deploy/utils';
import { buildYieldBox } from '../deployBuilds/00-buildYieldBox';
import { buildPenrose } from '../deployBuilds/01-buildPenrose';
import { buildMasterContracts } from '../deployBuilds/02-buildMasterContracts';
import { buildMarketHelpers } from '../deployBuilds/03-buildMarketHelpers';
import { buildMultiSwapper } from '../deployBuilds/04-buildMultiSwapper';
import { buildUSD0 } from '../deployBuilds/06-buildUSDO';
import { buildStableToUSD0Bidder } from '../deployBuilds/07-buildStableToUSD0Bidder';
import { buildSingularityModules } from '../deployBuilds/08-buildSingularityModules';
import { buildMarketProxy } from '../deployBuilds/09-buildMarketProxy';
import { buildEmptyStrat } from '../deployBuilds/10-buildEmptyStrat';
import { buildPenroseSetup } from '../setups/01-buildPenroseSetup';
import { buildMasterContractsSetup } from '../setups/02-buildMasterContractsSetup';
import { loadVM } from '../utils';

// hh deployLinkedChainStack --network bsc_testnet
export const deployLinkedChainStack__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const signer = (await hre.ethers.getSigners())[0];
    const VM = await loadVM(hre, tag);

    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );

    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    let weth = hre.SDK.db
        .loadGlobalDeployment(tag, 'tap-token', chainInfo.chainId)
        .find((e) => e.name.startsWith('WETHMock'));

    if (!weth) {
        //try to take it again from local deployment
        weth = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name.startsWith('WETHMock'));
    }

    if (!weth) {
        throw new Error('[-] Token not found');
    }

    // 01 YieldBox
    const [ybURI, yieldBox] = await buildYieldBox(hre, weth.address);
    VM.add(ybURI).add(yieldBox);

    // 02 USDO
    VM.add(await buildUSD0(hre, chainInfo.address, signer.address));

    // 03 - MarketsProxy
    const marketProxy = await buildMarketProxy(
        hre,
        chainInfo.address,
        signer.address,
    );
    VM.add(marketProxy);

    // Add and execute
    await VM.execute(3);
    VM.save();
    const { wantToVerify } = await inquirer.prompt({
        type: 'confirm',
        name: 'wantToVerify',
        message: 'Do you want to verify the contracts?',
    });
    if (wantToVerify) {
        await VM.verify();
    }

    console.log('[+] Stack deployed! 🎉');
};
