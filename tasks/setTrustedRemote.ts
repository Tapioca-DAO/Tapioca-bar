import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { getDeployment } from './utils';

//npx hardhat setTrustedRemote --network arbitrum_goerli --chain 10106 --dst 0x2Bd2DD6aD7AA00fF6C2A4db7aB67735451242A98 --src 0xAF933E0E75E0576511e17b173cc6e3D0a09DB764
//npx hardhat setTrustedRemote --network arbitrum_goerli --chain 10109 --dst 0x4C12521DA4d702b2c514725572aB9A2c57F98b0F --src 0xAF933E0E75E0576511e17b173cc6e3D0a09DB764
//npx hardhat setTrustedRemote --network arbitrum_goerli --chain 10112 --dst 0xd4F17F7E852e44fE7bfC3096D68ce2b7daA3E83B --src 0xAF933E0E75E0576511e17b173cc6e3D0a09DB764

//npx hardhat setTrustedRemote --network fuji_avalanche --chain 10143 --dst 0xAF933E0E75E0576511e17b173cc6e3D0a09DB764 --src 0x2Bd2DD6aD7AA00fF6C2A4db7aB67735451242A98
//npx hardhat setTrustedRemote --network fuji_avalanche --chain 10109 --dst 0x4C12521DA4d702b2c514725572aB9A2c57F98b0F --src 0x2Bd2DD6aD7AA00fF6C2A4db7aB67735451242A98
//npx hardhat setTrustedRemote --network fuji_avalanche --chain 10112 --dst 0xd4F17F7E852e44fE7bfC3096D68ce2b7daA3E83B --src 0x2Bd2DD6aD7AA00fF6C2A4db7aB67735451242A98

//npx hardhat setTrustedRemote --network mumbai --chain 10143 --dst 0xAF933E0E75E0576511e17b173cc6e3D0a09DB764 --src 0x4C12521DA4d702b2c514725572aB9A2c57F98b0F
//npx hardhat setTrustedRemote --network mumbai --chain 10106 --dst 0x2Bd2DD6aD7AA00fF6C2A4db7aB67735451242A98 --src 0x4C12521DA4d702b2c514725572aB9A2c57F98b0F
//npx hardhat setTrustedRemote --network mumbai --chain 10112 --dst 0xd4F17F7E852e44fE7bfC3096D68ce2b7daA3E83B --src 0x4C12521DA4d702b2c514725572aB9A2c57F98b0F

//npx hardhat setTrustedRemote --network fantom_testnet --chain 10143 --dst 0xAF933E0E75E0576511e17b173cc6e3D0a09DB764 --src 0xd4F17F7E852e44fE7bfC3096D68ce2b7daA3E83B
//npx hardhat setTrustedRemote --network fantom_testnet --chain 10109 --dst 0x4C12521DA4d702b2c514725572aB9A2c57F98b0F --src 0xd4F17F7E852e44fE7bfC3096D68ce2b7daA3E83B
//npx hardhat setTrustedRemote --network fantom_testnet --chain 10106 --dst 0x2Bd2DD6aD7AA00fF6C2A4db7aB67735451242A98 --src 0xd4F17F7E852e44fE7bfC3096D68ce2b7daA3E83B

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
