import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { getDeployment } from './utils';

//npx hardhat setTrustedRemote --network arbitrum_goerli --chain 10106 --dst 0x6A0fd324D64a5353E3543b9C2115Fc1F1246ecF7 --src 0x8F6cD94077395cc971BDD913596dA5e97Ecb658c
//npx hardhat setTrustedRemote --network fuji_avalanche --chain 10143 --dst 0x8F6cD94077395cc971BDD913596dA5e97Ecb658c --src 0x6A0fd324D64a5353E3543b9C2115Fc1F1246ecF7

//npx hardhat setTrustedRemote --network arbitrum_goerli --chain 10109 --dst 0x5A5a5bcc184c71aB743CB312653715f527111e6D --src 0x8F6cD94077395cc971BDD913596dA5e97Ecb658c
//npx hardhat setTrustedRemote --network fuji_avalanche --chain 10109 --dst 0x5A5a5bcc184c71aB743CB312653715f527111e6D --src 0x6A0fd324D64a5353E3543b9C2115Fc1F1246ecF7

//npx hardhat setTrustedRemote --network mumbai --chain 10143 --dst 0x8F6cD94077395cc971BDD913596dA5e97Ecb658c --src 0x5A5a5bcc184c71aB743CB312653715f527111e6D
//npx hardhat setTrustedRemote --network mumbai --chain 10106 --dst 0x6A0fd324D64a5353E3543b9C2115Fc1F1246ecF7 --src 0x5A5a5bcc184c71aB743CB312653715f527111e6D

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
    await (await usd0Contract.setTrustedRemote(taskArgs.chain, path)).wait();

    console.log('Done');
};
