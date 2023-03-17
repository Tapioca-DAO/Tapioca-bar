import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { getDeployment } from '../utils';

//npx hardhat setProxyAdapterParams --network fuji_avalanche
export const setProxyAdapterParams__task = async (
    taskArgs: { lzDestinationId?: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const proxyContract = await getDeployment(hre, 'MarketsProxy');
    const alreadySet = await proxyContract.useCustomAdapterParams();

    if (!alreadySet) {
        console.log('Setting custom adapter...');
        await (await proxyContract.setUseCustomAdapterParams(true)).wait(10);
    }

    if (taskArgs.lzDestinationId && taskArgs.lzDestinationId?.length > 0) {
        console.log('Setting destination min gas...');
        await (
            await proxyContract.setMinDstGas(taskArgs.lzDestinationId, 1, 1)
        ).wait();
    }
    console.log('Done');
};
