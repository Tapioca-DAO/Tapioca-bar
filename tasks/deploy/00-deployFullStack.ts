import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { Multicall3 } from '@tapioca-sdk//typechain/tapioca-periphery';
import { buildYieldBox } from '../deployBuilds/00-buildYieldBox';
import { buildPenrose } from '../deployBuilds/01-buildPenrose';
import { buildMasterContracts } from '../deployBuilds/02-buildMasterContracts';
import { buildMultiSwapper } from '../deployBuilds/04-buildMultiSwapper';
import { buildUSD0 } from '../deployBuilds/06-buildUSDO';
import { buildStableToUSD0Bidder } from '../deployBuilds/07-buildStableToUSD0Bidder';
import { buildBigBangModules } from '../deployBuilds/09-buildBigBangModules';
import { buildSingularityModules } from '../deployBuilds/08-buildSingularityModules';
import { buildPenroseSetup } from '../setups/01-buildPenroseSetup';
import { buildMasterContractsSetup } from '../setups/02-buildMasterContractsSetup';
import { buildUsdoFlashloanSetup } from '../setups/04-buildUsdoFlashloanSetup';
import { buildSimpleLeverageExecutor } from '../deployBuilds/14-buildSimpleLeverageExecutor';
import { loadVM } from '../utils';
import { buildUSDOModules } from '../deployBuilds/11-buildUSDOModules';
import { buildUSDOFlashloanHelper } from '../deployBuilds/13-buildUSDOFlashloanHelper';
import {
    CURVE_DEPLOYMENTS,
    UNISWAP_DEPLOYMENTS,
} from '@tapioca-sdk/api/constants';
import { buildCluster } from '../deployBuilds/12-buildCluster';

// hh deployFullStack --network goerli
export const deployFullStack__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const signer = (await hre.ethers.getSigners())[0];
    const VM = await loadVM(hre, tag, true);

    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    if (!chainInfo) {
        throw new Error('Chain not found');
    }
    const isTestnet = chainInfo.tags[0] == 'testnet';

    let tapToken = hre.SDK.db
        .loadGlobalDeployment(tag, 'tap-token', chainInfo.chainId)
        .find((e) => e.name === 'TapOFT');
    if (!tapToken && isTestnet) {
        //try to take it again from local deployment
        tapToken = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name.startsWith('TapOFT'));
    }
    if (!tapToken) throw new Error('[-] TapToken not found');

    let weth = isTestnet
        ? hre.SDK.db
              .loadGlobalDeployment(tag, 'tapioca-mocks', chainInfo.chainId)
              .find((e) => e.name.startsWith('WETHMock'))
        : { address: TOKENS_DEPLOYMENTS[chainInfo?.chainId as EChainID]?.weth };

    if (!weth && isTestnet) {
        //try to take it again from local deployment
        weth = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name.startsWith('WETHMock'));
    }
    if (!weth) throw new Error('[-] Weth not found');

    let ybAddress = hre.ethers.constants.AddressZero;
    let yb = hre.SDK.db
        .loadGlobalDeployment(tag, 'yieldbox', chainInfo.chainId)
        .find((e) => e.name == 'YieldBox');

    if (!yb) {
        yb = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'YieldBox');
    }
    if (!yb && !isTestnet) throw new Error('[-] YieldBox not found');
    ybAddress = yb?.address;

    let clusterAddress = hre.ethers.constants.AddressZero;
    let clusterDep = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapioca-periphery', chainInfo.chainId)
        .find((e) => e.name == 'Cluster');

    if (!clusterDep) {
        clusterDep = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'Cluster');
    }
    if (!clusterDep && !isTestnet) throw new Error('[-] Cluster not found');
    clusterAddress = clusterDep.address;

    // 00 - Deploy YieldBox
    if (isTestnet) {
        if (!ybAddress || ybAddress == hre.ethers.constants.AddressZero) {
            console.log('Need to deploy YieldBox');
            const [ybURI, yieldBox] = await buildYieldBox(hre, weth.address);
            VM.add(ybURI).add(yieldBox);
        } else {
            console.log(`Using deployed YieldBox ${ybAddress}`);
        }
    }

    // 01 - Deploy Cluster
    if (isTestnet) {
        if (
            !clusterAddress ||
            clusterAddress == hre.ethers.constants.AddressZero
        ) {
            console.log('Need to deploy Cluster');
            const cluster = await buildCluster(
                hre,
                chainInfo.address,
                signer.address,
            );
            VM.add(cluster);
        } else {
            console.log(`Using deployed Cluster ${clusterAddress}`);
        }
    }

    // 02 - Penrose
    const penrose = await buildPenrose(
        hre,
        tapToken.address,
        weth.address,
        signer.address,
        ybAddress,
        clusterAddress,
        chainInfo.lzChainId,
    );
    VM.add(penrose);

    // 03 - Master contracts
    const [sgl, bb] = await buildMasterContracts(hre);
    VM.add(sgl).add(bb);

    // 04 - MultiSwapper
    if (isTestnet) {
        const uniswapperV2 = await buildMultiSwapper(
            hre,
            UNISWAP_DEPLOYMENTS[chainInfo?.chainId as EChainID]?.v2Router,
            UNISWAP_DEPLOYMENTS[chainInfo?.chainId as EChainID]?.v2factory,
            ybAddress,
            signer.address,
        );
        VM.add(uniswapperV2);
    }

    // 05 - SingularityModules
    const [liq, borrow, collateral, leverage] = await buildSingularityModules(
        hre,
    );
    VM.add(liq).add(borrow).add(collateral).add(leverage);

    // 06 - BigBang Modules
    const [bbLiq, bbBorrow, bbCollateral, bbLeverage] =
        await buildBigBangModules(hre);
    VM.add(bbLiq).add(bbBorrow).add(bbCollateral).add(bbLeverage);

    // 07 USDO
    const [
        leverageModule,
        leverageDestinationModule,
        marketModule,
        marketDestinationModule,
        optionsModule,
        optionsDestinationModule,
        genericModule,
    ] = await buildUSDOModules(
        chainInfo.address,
        hre,
        ybAddress,
        clusterAddress,
    );
    VM.add(leverageModule)
        .add(leverageDestinationModule)
        .add(marketModule)
        .add(marketDestinationModule)
        .add(optionsModule)
        .add(optionsDestinationModule)
        .add(genericModule);

    const usdo = await buildUSD0(
        hre,
        chainInfo.address,
        signer.address,
        ybAddress,
        clusterAddress,
    );
    VM.add(usdo);

    const usdoFlashloanHelper = await buildUSDOFlashloanHelper(
        hre,
        signer.address,
    );
    VM.add(usdoFlashloanHelper);

    const simpleLeverageExecutor = await buildSimpleLeverageExecutor(
        hre,
        clusterAddress,
        ybAddress,
    );
    VM.add(simpleLeverageExecutor);

    if (isTestnet) {
        // 08 - CurveSwapper-buildStableToUSD0Bidder
        const [curveSwapper, curveStableToUsd0] = await buildStableToUSD0Bidder(
            hre,
            CURVE_DEPLOYMENTS[chainInfo?.chainId as EChainID]?.stablePool,
            ybAddress,
        );
        VM.add(curveSwapper).add(curveStableToUsd0);
    }

    // Add and execute
    await VM.execute(3, false);
    VM.save();
    const { wantToVerify } = await inquirer.prompt({
        type: 'confirm',
        name: 'wantToVerify',
        message: 'Do you want to verify the contracts?',
    });
    if (wantToVerify) {
        try {
            await VM.verify();
        } catch {
            console.log('[-] Verification failed');
        }
    }

    // After deployment setup
    const vmList = VM.list();

    const multiCall = await VM.getMulticall();

    const calls: Multicall3.CallStruct[] = [
        ...(await buildPenroseSetup(hre, vmList)),
        ...(await buildMasterContractsSetup(hre, vmList)),
        ...(await buildUsdoFlashloanSetup(hre, vmList)),
    ];

    // Execute
    console.log('[+] After deployment setup calls number: ', calls.length);
    if (calls.length > 0) {
        try {
            const tx = await (await multiCall.multicall(calls)).wait(1);
            console.log(
                '[+] After deployment setup multicall Tx: ',
                tx.transactionHash,
            );
        } catch (e) {
            // If one fail, try them one by one
            for (const call of calls) {
                await (
                    await signer.sendTransaction({
                        data: call.callData,
                        to: call.target,
                    })
                ).wait();
            }
        }
    }

    console.log('[+] Stack deployed! 🎉');
};
