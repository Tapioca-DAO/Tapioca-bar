import { TPostDeployParams } from '../1-setupPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';

export async function setupUsdoInPenrose(params: TPostDeployParams) {
    const { hre, VM, deployed, calls } = params;

    const penroseDep = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.PENROSE,
    )!;
    const usdoDep = deployed.find((e) => e.name === DEPLOYMENT_NAMES.USDO)!;

    const penrose = await hre.ethers.getContractAt(
        'Penrose',
        penroseDep.address,
    );

    if (
        (await penrose.usdoToken()).toLowerCase() !==
        usdoDep.address.toLowerCase()
    ) {
        console.log(
            `\t[+] Setting up USDO ${usdoDep.address} in Penrose ${penroseDep.address}`,
        );
        calls.push({
            target: penrose.address,
            callData: penrose.interface.encodeFunctionData('setUsdoToken', [
                usdoDep.address,
            ]),
            allowFailure: false,
        });
    }
}
