import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { Multicall3 } from '@tapioca-sdk//typechain/tapioca-periphery';
import { buildYieldBox } from '../deployBuilds/00-buildYieldBox';
import { buildUSD0 } from '../deployBuilds/06-buildUSDO';
import { buildUSDOModules } from '../deployBuilds/11-buildUSDOModules';
import { buildCluster } from '../deployBuilds/12-buildCluster';
import { buildUSDOFlashloanHelper } from '../deployBuilds/13-buildUSDOFlashloanHelper';
import { buildUsdoFlashloanSetup } from '../setups/04-buildUsdoFlashloanSetup';
import { buildSimpleLeverageExecutor } from '../deployBuilds/14-buildSimpleLeverageExecutor';
import { buildMultiSwapper } from '../deployBuilds/04-buildMultiSwapper';
import { UNISWAP_DEPLOYMENTS } from '@tapioca-sdk/api/constants';
import { loadVM } from '../utils';

// hh deployLinkedChainStack --network bsc_testnet
export const deployLinkedChainStack__task = async (
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
    if (!weth) {
        throw new Error('[-] Token not found');
    }

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

    // 02 USDO
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

    const simpleLeverageExecutor = await buildSimpleLeverageExecutor(
        hre,
        clusterAddress,
        ybAddress,
    );
    VM.add(simpleLeverageExecutor);

    // Add and execute
    await VM.execute(3, true);
    VM.save();
    const { wantToVerify } = await inquirer.prompt({
        type: 'confirm',
        name: 'wantToVerify',
        message: 'Do you want to verify the contracts?',
    });
    if (wantToVerify) {
        try {
            await VM.verify();
        } catch (e) {
            console.log('[-] Verification failed');
            console.log(`error: ${JSON.stringify(e)}`);
        }
    }

    // After deployment setup
    const vmList = VM.list();

    const multiCall = await VM.getMulticall();

    const calls: Multicall3.CallStruct[] = [
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
