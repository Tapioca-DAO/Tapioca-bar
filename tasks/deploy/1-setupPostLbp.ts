import {
    DeployerVM,
    TDeploymentVMContract,
    TTapiocaDeployerVmPass,
} from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { setupUsdoInPenrose } from './postDepSetup/setupUsdoInPenrose';
import { setupUsdoFlashloanHelperInUsdo } from './postDepSetup/setupUsdoFlashloanHelperInUsdo';
import { setupRegisterMCInPenrose } from './postDepSetup/setupRegisterMCInPenrose';
import { setupCreateYBAssets } from './postDepSetup/setupCreateYBAssets';
import { setupInitAndRegisterMarket } from './postDepSetup/setupInitAndRegisterMarket';

export type TPostDeployParams = {
    hre: HardhatRuntimeEnvironment;
    VM: DeployerVM;
    tag: string;
    deployed: TDeploymentVMContract[];
    calls: TapiocaMulticall.CallStruct[];
};

export async function setupPostLbp(params: TTapiocaDeployerVmPass<object>) {
    console.log('\n[+] Running post deploy task');

    const { hre, taskArgs, VM, chainInfo } = params;
    const { tag } = taskArgs;
    const deployed = VM.list();

    const calls: TapiocaMulticall.CallStruct[] = [];

    const setupParams: TPostDeployParams = { hre, VM, tag, deployed, calls };

    await setupUsdoInPenrose(setupParams);
    await setupRegisterMCInPenrose(setupParams);
    await setupUsdoFlashloanHelperInUsdo(setupParams);
    await setupCreateYBAssets(setupParams);
    await setupInitAndRegisterMarket(setupParams);
}
