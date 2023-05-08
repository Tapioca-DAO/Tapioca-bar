import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TDeploymentVMContract } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import {
    Multicall3,
    UniswapV2Swapper,
} from 'tapioca-sdk/dist/typechain/tapioca-periphery';
import { Penrose, USDO } from '../../typechain';
import { getAfterDepContract } from '../utils';

export const buildPenroseSetup = async (
    hre: HardhatRuntimeEnvironment,
    deps: TDeploymentVMContract[],
    feeTo: string,
): Promise<Multicall3.CallStruct[]> => {
    const calls: Multicall3.CallStruct[] = [];

    const penrose = await getAfterDepContract<Penrose>(hre, deps, 'Penrose');

    const multiSwapperAddress = deps.find(
        (e) => e.name === 'MultiSwapper',
    )?.address;

    const usd0 = await getAfterDepContract<USDO>(hre, deps, 'USDO');

    /**
     * Add calls
     */
    console.log('[+] +Setting: Setting Penrose feeTo');
    await (await penrose.setFeeTo(feeTo)).wait(3);

    console.log('[+] +Setting: Setting MultiSwapper');
    await (await penrose.setSwapper(multiSwapperAddress, true)).wait(3);

    console.log('[+] +Setting: Setting USDO');
    await (await penrose.setUsdoToken(usd0.address)).wait(3);

    return calls;
};
