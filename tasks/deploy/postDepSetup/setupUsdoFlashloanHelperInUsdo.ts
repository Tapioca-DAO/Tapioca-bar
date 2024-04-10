import { TPostDeployParams } from '../1-setupPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';

export async function setupUsdoFlashloanHelperInUsdo(
    params: TPostDeployParams,
) {
    const { hre, VM, deployed, calls } = params;

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
