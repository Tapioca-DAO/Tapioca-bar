import { TPostDeployParams } from '../1-setupPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';

export async function setupRegisterMCInPenrose(params: TPostDeployParams) {
    const { hre, VM, deployed, calls } = params;

    const penroseDep = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.PENROSE,
    )!;
    const sglMediumRiskMC = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.SGL_MEDIUM_RISK_MC,
    )!;
    const bbMediumRiskMC = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.BB_MEDIUM_RISK_MC,
    )!;

    const penrose = await hre.ethers.getContractAt(
        'Penrose',
        penroseDep.address,
    );

    if (
        (await penrose.isSingularityMasterContractRegistered(
            sglMediumRiskMC.address,
        )) !== true
    ) {
        console.log(
            `\t[+] Registering SGL medium risk MC ${sglMediumRiskMC.address} in Penrose ${penroseDep.address}`,
        );
        calls.push({
            target: penrose.address,
            callData: penrose.interface.encodeFunctionData(
                'registerSingularityMasterContract',
                [sglMediumRiskMC.address, 1],
            ),
            allowFailure: false,
        });
    }

    if (
        (await penrose.isBigBangMasterContractRegistered(
            bbMediumRiskMC.address,
        )) !== true
    ) {
        console.log(
            `\t[+] Registering BB medium risk MC ${bbMediumRiskMC.address} in Penrose ${penroseDep.address}`,
        );
        calls.push({
            target: penrose.address,
            callData: penrose.interface.encodeFunctionData(
                'registerBigBangMasterContract',
                [bbMediumRiskMC.address, 1],
            ),
            allowFailure: false,
        });
    }
}
