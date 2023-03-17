import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TDeploymentVMContract } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { Multicall3 } from 'tapioca-sdk/dist/typechain/utils/MultiCall';
import { MultiSwapper, Penrose, USD0 } from '../../typechain';
import { getAfterDepContract } from '../utils';

export const buildPenroseSetup = async (
    hre: HardhatRuntimeEnvironment,
    deps: TDeploymentVMContract[],
    feeTo: string,
): Promise<Multicall3.Call3Struct[]> => {
    const calls: Multicall3.Call3Struct[] = [];

    const penrose = await getAfterDepContract<Penrose>(hre, deps, 'Penrose');
    const multiSwapper = await getAfterDepContract<MultiSwapper>(
        hre,
        deps,
        'MultiSwapper',
    );
    const usd0 = await getAfterDepContract<USD0>(hre, deps, 'USD0');

    /**
     * Add calls
     */
    console.log('[+] +Setting: Setting Penrose feeTo');
    await (await penrose.setFeeTo(feeTo)).wait(3);

    console.log('[+] +Setting: Setting MultiSwapper');
    await (await penrose.setSwapper(multiSwapper.address, true)).wait(3);

    console.log('[+] +Setting: Setting USD0');
    await (await penrose.setUsdoToken(usd0.address)).wait(3);

    return calls;
};
