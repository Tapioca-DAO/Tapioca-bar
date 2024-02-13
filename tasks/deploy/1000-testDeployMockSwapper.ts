import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { MockSwapper__factory } from '@tapioca-sdk/typechain/tapioca-mocks';
import MockSwapperArtifact from '@tapioca-sdk/artifacts/tapioca-mocks/MockSwapper.json';
import { EChainID } from '@tapioca-sdk/api/config';
import { loadVM } from '../utils';

const buildMockSwapper = async (
    hre: HardhatRuntimeEnvironment,
    yb: string,
): Promise<IDeployerVMAdd<MockSwapper__factory>> => {
    const MockSwapper = (await hre.ethers.getContractFactoryFromArtifact(
        MockSwapperArtifact,
    )) as MockSwapper__factory;

    return {
        contract: MockSwapper,
        deploymentName: 'MockSwapper',
        args: [yb],
        runStaticSimulation: true,
    };
};

export const testDeployMockSwapper__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    console.log('[+] Deploying: MockSwapper');
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const VM = await loadVM(hre, tag);

    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    const ybDeployment = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name == 'YieldBox');

    VM.add(await buildMockSwapper(hre, ybDeployment?.address));

    await VM.execute(3);
    VM.save();
    // if (chainInfo.chainId == EChainID.ARBITRUM_GOERLI) {
    //     const penroseDeployment = hre.SDK.db
    //         .loadLocalDeployment(tag, chainInfo.chainId)
    //         .find((e) => e.name == 'Penrose');
    //     const penroseContract = await hre.ethers.getContractAt(
    //         'Penrose',
    //         penroseDeployment?.address,
    //     );
    //     const swapperDeployment = hre.SDK.db
    //         .loadLocalDeployment(tag, chainInfo.chainId)
    //         .find((e) => e.name == 'MockSwapper');
    //     await penroseContract.setSwapper(
    //         swapperDeployment?.address,
    //         chainInfo.lzChainId,
    //         true,
    //     );
    // }
    await VM.verify();
};
