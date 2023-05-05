import { BigNumber } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';

import { OracleMock__factory } from 'tapioca-sdk/dist/typechain/tapioca-mocks';
import OracleMockArtifact from 'tapioca-sdk/dist/artifacts/tapioca-mocks/OracleMock.json';

export const buildOracleMock = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
    symbol: string,
    rate: BigNumber,
): Promise<IDeployerVMAdd<OracleMock__factory>> => {
    const OracleMock = (await hre.ethers.getContractFactoryFromArtifact(
        OracleMockArtifact,
    )) as OracleMock__factory;

    return {
        contract: OracleMock,
        deploymentName: name,
        args: [name, symbol, rate],
    };
};
