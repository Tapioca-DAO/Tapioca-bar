import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TDeploymentVMContract } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Multicall3 } from '@tapioca-sdk//typechain/tapioca-periphery';
import { USDO, USDOFlashloanHelper } from '../../typechain';
import { getAfterDepContract } from '../utils';

export const buildUsdoFlashloanSetup = async (
    hre: HardhatRuntimeEnvironment,
    deps: TDeploymentVMContract[],
): Promise<Multicall3.CallStruct[]> => {
    const calls: Multicall3.CallStruct[] = [];

    const usdoFlashloanHelper = await getAfterDepContract<USDOFlashloanHelper>(
        hre,
        deps,
        'USDOFlashloanHelper',
    );
    const usd0 = await getAfterDepContract<USDO>(hre, deps, 'USDO');

    /**
     * Add calls
     */
    console.log('[+] +Setting: Setting usdoFlashloanHelper');
    await (await usd0.setFlashloanHelper(usdoFlashloanHelper.address)).wait(3);

    await (
        await usd0.setMinterStatus(usdoFlashloanHelper.address, true)
    ).wait(3);
    await (
        await usd0.setBurnerStatus(usdoFlashloanHelper.address, true)
    ).wait(3);
    return calls;
};
