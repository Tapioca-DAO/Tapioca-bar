import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { getDeployment } from './utils';

//npx hardhat setTrustedRemote --network goerli --chain 10106 --dst 0x6C09376f75F381D34fcF22Bd870db5dccEe8687D --src 0xBc223d1c84c5F53f1056150D81B421377b76a0D5
//npx hardhat setTrustedRemote --network fuji_avalanche --chain 10121 --dst 0xBc223d1c84c5F53f1056150D81B421377b76a0D5 --src 0x6C09376f75F381D34fcF22Bd870db5dccEe8687D
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
