import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { MockSwapper__factory } from '../../gitsub_tapioca-sdk/src/typechain/tapioca-mocks';
import { buildOracleMock } from '../deployBuilds/05-buildOracleMock';
import { loadVM } from '../utils';
import MockSwapperArtifact from 'tapioca-sdk/dist/artifacts/tapioca-mocks/MockSwapper.json';

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

    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    const ybDeployment = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name == 'YieldBox');

    VM.add(await buildMockSwapper(hre, ybDeployment?.address));

    await VM.execute(3);
    VM.save();
    await VM.verify();
};
