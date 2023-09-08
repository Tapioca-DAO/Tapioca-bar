import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { buildYieldBox } from '../deployBuilds/00-buildYieldBox';
import { buildUSD0 } from '../deployBuilds/06-buildUSDO';
import { buildUSDOModules } from '../deployBuilds/11-buildUSDOModules';
import { buildCluster } from '../deployBuilds/12-buildCluster';
import { loadVM } from '../utils';

// hh deployLinkedChainStack --network bsc_testnet
export const deployLinkedChainStack__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const signer = (await hre.ethers.getSigners())[0];
    const VM = await loadVM(hre, tag, true);

    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );

    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    let weth = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapioca-mocks', chainInfo.chainId)
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

    let ybAddress = hre.ethers.constants.AddressZero;
    let yb = hre.SDK.db
        .loadGlobalDeployment(tag, 'YieldBox', chainInfo.chainId)
        .find((e) => e.name == 'YieldBox');

    if (!yb) {
        yb = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'YieldBox');
    }
    if (yb) {
        ybAddress = yb.address;
    }

    let clusterAddress = hre.ethers.constants.AddressZero;
    let clusterDep = hre.SDK.db
        .loadGlobalDeployment(tag, 'Cluster', chainInfo.chainId)
        .find((e) => e.name == 'Cluster');

    if (!clusterDep) {
        clusterDep = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'Cluster');
    }
    if (clusterDep) {
        clusterAddress = clusterDep.address;
    }

    // 00 YieldBox
    const [ybURI, yieldBox] = await buildYieldBox(hre, weth.address);
    VM.add(ybURI).add(yieldBox);

    // 01 - Deploy Cluster
    const cluster = await buildCluster(hre, chainInfo.lzChainId);
    VM.add(cluster);

    // 02 USDO
    const [leverageModule, marketModule, optionsModule] =
        await buildUSDOModules(
            chainInfo.address,
            hre,
            ybAddress,
            clusterAddress,
        );
    VM.add(leverageModule).add(marketModule).add(optionsModule);

    const usdo = await buildUSD0(
        hre,
        chainInfo.address,
        signer.address,
        ybAddress,
        clusterAddress,
    );
    VM.add(usdo);

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

    console.log('[+] Stack deployed! 🎉');
};
