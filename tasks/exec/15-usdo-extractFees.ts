import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';

export const extractFeesFromUsdo__task = async (
    taskArgs: { usdo: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const usdo = await hre.ethers.getContractAt('USDO', taskArgs.usdo);
    await (await usdo.extractFees()).wait(3);
};
