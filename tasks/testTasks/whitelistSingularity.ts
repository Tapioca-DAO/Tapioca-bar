import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';

// npx hardhat whitelistSingularity --network arbitrum_goerli --singularity 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B -sgl-proxy 0x006dcF07511D332299f83056731Cb15f0Aeb2F2B
export const whitelistSingularity__task = async (
    taskArgs: { singularity: string; sglProxy: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const proxyContract = await hre.ethers.getContractAt(
        'SGLProxy',
        taskArgs.sglProxy,
    );

    await proxyContract.updateSingularityStatus(taskArgs.singularity, true);

    console.log('\nDone');
};
