import { ContractFactory } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';

export const buildMocks = async (
    hre: HardhatRuntimeEnvironment,
): Promise<IDeployerVMAdd<ContractFactory>[]> => {
    const builds: IDeployerVMAdd<ContractFactory>[] = [];

    // WETH
    builds.push({
        deploymentName: 'WETH9Mock',
        contract: await hre.ethers.getContractFactory('WETH9Mock'),
        args: [hre.ethers.utils.parseEther('10').toString()],
    });

    // ERC20FactoryMock
    builds.push({
        deploymentName: 'ERC20FactoryMock',
        contract: await hre.ethers.getContractFactory('ERC20FactoryMock'),
        args: [],
    });

    // USDC
    builds.push({
        deploymentName: 'ERC20Mock-USDC',
        contract: await hre.ethers.getContractFactory('ERC20Mock'),
        args: [
            hre.ethers.utils.parseEther('10000000').toString(),
            '18',
            hre.ethers.utils.parseEther('1000').toString(),
        ],
    });

    // OracleMockFactory
    builds.push({
        deploymentName: 'OracleMockFactory',
        contract: await hre.ethers.getContractFactory('OracleMockFactory'),
        args: [],
    });

    return builds;
};
