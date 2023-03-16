import { BigNumber } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { OracleMock__factory } from '../../typechain';

export const buildOracleMock = async (
    hre: HardhatRuntimeEnvironment,
    name: string,
    symbol: string,
    rate: BigNumber,
): Promise<IDeployerVMAdd<OracleMock__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('OracleMock'),
        deploymentName: 'OracleMock',
        args: [name, symbol, rate],
    };
};
