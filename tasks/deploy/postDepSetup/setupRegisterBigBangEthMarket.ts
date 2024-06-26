import { TPostDeployParams } from '../1-1-setupPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';

export async function setupRegisterBigBangEthMarket(params: TPostDeployParams) {
    const { hre, VM, deployed, calls, isHostChain } = params;

    if (isHostChain) {
        const penroseDep = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.PENROSE,
        )!;
        const penrose = await hre.ethers.getContractAt(
            'Penrose',
            penroseDep.address,
        );

        const mtETHDep = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.BB_MT_ETH_MARKET,
        )!;

        if (
            (await penrose.bigBangEthMarket()).toLocaleLowerCase() !==
            mtETHDep.address.toLocaleLowerCase()
        ) {
            console.log(
                `\t[+] Registering BigBang main ETH Market ${mtETHDep.address} in Penrose ${penroseDep.address}`,
            );
            calls.push({
                target: penrose.address,
                callData: penrose.interface.encodeFunctionData(
                    'setBigBangEthMarket',
                    [mtETHDep.address],
                ),
                allowFailure: false,
            });
        }
    }
}
