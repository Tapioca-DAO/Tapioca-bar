import {
    DeployerVM,
    TDeploymentVMContract,
    TTapiocaDeployerVmPass,
} from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { setupCreateYBAssets } from './postDepSetup/setupCreateYBAssets';
import { setupInitAndRegisterMarket } from './postDepSetup/setupInitAndRegisterMarket';
import { setupRegisterBBAndSGLMarketsInPenrose } from './postDepSetup/setupRegisterBBAndSGLMarketsInPenrose';
import { setupRegisterBBAsMinterBurnerInUsdo } from './postDepSetup/setupRegisterBBAsMinterBurnerInUsdo';
import { setupRegisterBigBangEthMarket } from './postDepSetup/setupRegisterBigBangEthMarket';
import { setupRegisterMCInPenrose } from './postDepSetup/setupRegisterMCInPenrose';
import { setupUsdoFlashloanHelperInUsdo } from './postDepSetup/setupUsdoFlashloanHelperInUsdo';
import { setupUsdoInPenrose } from './postDepSetup/setupUsdoInPenrose';
import { setupDepositYbAssets } from './postDepSetup/setupDepositYbAssets';

export type TPostDeployParams = {
    hre: HardhatRuntimeEnvironment;
    VM: DeployerVM;
    tag: string;
    deployed: TDeploymentVMContract[];
    calls: TapiocaMulticall.CallStruct[];
    isTestnet: boolean;
    isHostChain: boolean;
    isSideChain: boolean;
};

export async function setupPostLbp1(params: TTapiocaDeployerVmPass<object>) {
    console.log('\n[+] Running post deploy task');

    const {
        hre,
        taskArgs,
        VM,
        chainInfo,
        isTestnet,
        isHostChain,
        isSideChain,
    } = params;
    const { tag } = taskArgs;
    const deployed = VM.list();

    const calls1: TapiocaMulticall.CallStruct[] = [];
    const setupParams1: TPostDeployParams = {
        hre,
        VM,
        tag,
        deployed,
        calls: calls1,
        isTestnet,
        isHostChain,
        isSideChain,
    };

    await setupUsdoInPenrose(setupParams1);
    await setupRegisterMCInPenrose(setupParams1);
    await setupRegisterBBAndSGLMarketsInPenrose(setupParams1);
    await setupRegisterBigBangEthMarket(setupParams1);
    await setupUsdoFlashloanHelperInUsdo(setupParams1);
    await setupCreateYBAssets(setupParams1);
    await VM.executeMulticall(calls1, { gasLimit: 20_000_000 });

    // YB Asset IDs needs to be created before this
    const calls2: TapiocaMulticall.CallStruct[] = [];
    const setupParams2: TPostDeployParams = {
        ...setupParams1,
        calls: calls2,
    };
    await setupDepositYbAssets(setupParams2);
    await setupInitAndRegisterMarket(setupParams2);
    await setupRegisterBBAsMinterBurnerInUsdo(setupParams2);

    await VM.executeMulticall(calls2, { gasLimit: 20_000_000 });

    console.log('[+] Post deploy task completed');
}
