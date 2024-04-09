import {
    DeployerVM,
    TDeploymentVMContract,
    TTapiocaDeployerVmPass,
} from '@tapioca-sdk/ethers/hardhat/DeployerVM';
import { DEPLOYMENT_NAMES } from './DEPLOY_CONFIG';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TapiocaMulticall } from '@tapioca-sdk/typechain/tapioca-periphery';

export async function tapiocaPostDeployTask(
    params: TTapiocaDeployerVmPass<object>,
) {
    console.log('\n[+] Running post deploy task');

    const { hre, taskArgs, VM, chainInfo } = params;
    const { tag } = taskArgs;
    const deployed = VM.list();

    const calls: TapiocaMulticall.CallStruct[] = [];

    await setupUsdoFlashloanHelper(hre, VM, deployed, calls);
}

async function setupUsdoFlashloanHelper(
    hre: HardhatRuntimeEnvironment,
    VM: DeployerVM,
    deployed: TDeploymentVMContract[],
    calls: TapiocaMulticall.CallStruct[],
) {
    const flashloanHelperDep = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.USDO_FLASHLOAN_HELPER,
    )!;

    const usdoDep = deployed.find((e) => e.name === DEPLOYMENT_NAMES.USDO)!;

    const usdoFlashloanHelper = await hre.ethers.getContractAt(
        'USDOFlashloanHelper',
        flashloanHelperDep.address,
    );
    const usdo = await hre.ethers.getContractAt('Usdo', usdoDep.address);

    if (
        (await usdo.flashLoanHelper()).toLowerCase() !==
        usdoFlashloanHelper.address.toLowerCase()
    ) {
        console.log(
            `\t[+] Setting up USDOFlashloanHelper ${flashloanHelperDep.address} in USDO ${usdoDep.address}`,
        );
        calls.push({
            target: usdo.address,
            callData: usdo.interface.encodeFunctionData('setFlashloanHelper', [
                usdoFlashloanHelper.address,
            ]),
            allowFailure: false,
        });
    }

    if (
        (await usdo.allowedMinter(
            hre.SDK.chainInfo.lzChainId,
            usdoFlashloanHelper.address.toLowerCase(),
        )) !== true
    ) {
        console.log(
            `\t[+] Setting up USDOFlashloanHelper ${flashloanHelperDep.address} as MINTER in USDO ${usdoDep.address}`,
        );
        calls.push({
            target: usdo.address,
            callData: usdo.interface.encodeFunctionData('setMinterStatus', [
                usdoFlashloanHelper.address,
                true,
            ]),
            allowFailure: false,
        });
    }

    if (
        (await usdo.allowedBurner(
            hre.SDK.chainInfo.lzChainId,
            usdoFlashloanHelper.address.toLowerCase(),
        )) !== true
    ) {
        console.log(
            `\t[+] Setting up USDOFlashloanHelper ${flashloanHelperDep.address} as BURNER in USDO ${usdoDep.address}`,
        );
        calls.push({
            target: usdo.address,
            callData: usdo.interface.encodeFunctionData('setBurnerStatus', [
                usdoFlashloanHelper.address,
                true,
            ]),
            allowFailure: false,
        });
    }
}
