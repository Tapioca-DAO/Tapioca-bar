import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { getDeployment } from './utils';

//npx hardhat setTrustedRemote --network arbitrum_goerli --chain 10106 --dst 0x365b6FB3f37c8f963c8d9d8b815e9a8cF81Df594 --src 0xD50dBD20c67edfE03aD83490091645E7a9AF115d
//npx hardhat setTrustedRemote --network fuji_avalanche --chain 10143 --dst 0xD50dBD20c67edfE03aD83490091645E7a9AF115d --src 0x365b6FB3f37c8f963c8d9d8b815e9a8cF81Df594
export const setTrustedRemote__task = async (
    taskArgs: { chain: string; dst: string; src: string },
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('\nRetrieving USD0');
    const usd0Contract = await getDeployment(hre, 'USD0');

    const path = hre.ethers.utils.solidityPack(
        ['address', 'address'],
        [taskArgs.dst, taskArgs.src],
    );
    console.log(`Setting trusted remote with path ${path}`);
    await usd0Contract.setTrustedRemote(taskArgs.chain, path);

    console.log('Done');
};
