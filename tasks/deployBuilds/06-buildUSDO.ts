import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { USDO__factory } from '../../typechain';

export const buildUSD0 = async (
    hre: HardhatRuntimeEnvironment,
    lzEndPoint: string,
    owner: string,
    yieldBox: string,
    cluster: string,
): Promise<IDeployerVMAdd<USDO__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('USDO'),
        deploymentName: 'USDO',
        args: [
            lzEndPoint,
            yieldBox,
            cluster,
            owner,
            hre.ethers.constants.AddressZero,
            hre.ethers.constants.AddressZero,
            hre.ethers.constants.AddressZero,
        ],
        dependsOn: [
            { argPosition: 1, deploymentName: 'YieldBox' },
            { argPosition: 2, deploymentName: 'Cluster' },
            { argPosition: 4, deploymentName: 'USDOLeverageModule' },
            { argPosition: 5, deploymentName: 'USDOMarketModule' },
            { argPosition: 6, deploymentName: 'USDOOptionsModule' },
        ],
        runStaticSimulation: false,
    };
};
