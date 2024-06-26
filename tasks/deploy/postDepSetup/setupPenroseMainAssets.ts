import { IYieldBox } from '@typechain/index';
import { deploy__LoadDeployments_Arb } from '../1-1-deployPostLbp';
import { TPostDeployParams } from '../1-1-setupPostLbp';
import { DEPLOYMENT_NAMES } from '../DEPLOY_CONFIG';

export async function setupPenroseMainAssets(params: TPostDeployParams) {
    const {
        hre,
        VM,
        deployed,
        calls,
        isHostChain,
        isSideChain,
        tag,
        isTestnet,
    } = params;

    const penroseDep = deployed.find(
        (e) => e.name === DEPLOYMENT_NAMES.PENROSE,
    )!;

    const penrose = await hre.ethers.getContractAt(
        'Penrose',
        penroseDep.address,
    );

    if (isHostChain) {
        const {
            mtETH,
            yieldBox: yieldBoxDep,
            tapToken,
        } = deploy__LoadDeployments_Arb({
            hre,
            tag,
            isTestnet,
        });

        const yieldBox = (await hre.ethers.getContractAt(
            'tapioca-periph/interfaces/yieldbox/IYieldBox.sol:IYieldBox',
            yieldBoxDep,
        )) as IYieldBox;

        const strategyAddr = deployed.find(
            (e) => e.name === DEPLOYMENT_NAMES.YB_MT_ETH_ASSET_WITHOUT_STRATEGY,
        )!.address;

        const mtEthCollateralId = await yieldBox.ids(1, mtETH, strategyAddr, 0);

        if ((await penrose.mainToken()).toLowerCase() !== mtETH.toLowerCase()) {
            console.log(
                `\t[+] Registering mtETH main market ${mtETH} assetID ${mtEthCollateralId} in Penrose ${penroseDep.address}`,
            );
            calls.push({
                target: penrose.address,
                callData: penrose.interface.encodeFunctionData(
                    'setMainTokens',
                    [mtETH, mtEthCollateralId, tapToken, 0],
                ),
                allowFailure: false,
            });
        }
    }
}
