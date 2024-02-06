import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TDeploymentVMContract } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Multicall3 } from '@tapioca-sdk//typechain/tapioca-periphery';
import { Penrose, USDO } from '../../typechain';
import { getAfterDepContract } from '../utils';

export const buildPenroseSetup = async (
    hre: HardhatRuntimeEnvironment,
    deps: TDeploymentVMContract[],
): Promise<Multicall3.CallStruct[]> => {
    const calls: Multicall3.CallStruct[] = [];

    const penrose = await getAfterDepContract<Penrose>(hre, deps, 'Penrose');

    const usd0 = await getAfterDepContract<USDO>(hre, deps, 'USDO');

    /**
     * Add calls
     */
    console.log('[+] +Setting: Setting USDO');
    await (await penrose.setUsdoToken(usd0.address)).wait(3);

    return calls;
};
