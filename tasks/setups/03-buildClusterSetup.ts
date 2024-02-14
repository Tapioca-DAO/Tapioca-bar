import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TDeploymentVMContract } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Multicall3 } from '@tapioca-sdk//typechain/tapioca-periphery';
import { Cluster } from '@tapioca-sdk/typechain/tapioca-periphery';
import { USDO } from '../../typechain';
import { getAfterDepContract } from '../utils';

export const buildClusterSetup = async (
    hre: HardhatRuntimeEnvironment,
    deps: TDeploymentVMContract[],
): Promise<Multicall3.CallStruct[]> => {
    const calls: Multicall3.CallStruct[] = [];

    const cluster = await getAfterDepContract<Cluster>(hre, deps, 'Cluster');

    const multiSwapperAddress = deps.find(
        (e) => e.name === 'MultiSwapper',
    )?.address;

    const usd0 = await getAfterDepContract<USDO>(hre, deps, 'USDO');

    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);

    /**
     * Add calls
     */
    console.log('[+] +Setting: Whitelisting MultiSwapper');
    await (
        await cluster.updateContract(
            chainInfo?.lzChainId,
            multiSwapperAddress,
            true,
        )
    ).wait(3);

    console.log('[+] +Setting: Setting USDO');
    await (
        await cluster.updateContract(chainInfo?.lzChainId, usd0.address, true)
    ).wait(3);

    return calls;
};
