import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';

export const setUsdoFlashloanHelper__task = async (
    taskArgs: { usdo: string; helper: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const usdo = await hre.ethers.getContractAt('USDO', taskArgs.usdo);
    await (await usdo.setFlashloanHelper(taskArgs.helper)).wait(3);
};
