import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { IDeployerVMAdd } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { USD0__factory } from '../../typechain';

export const buildUSD0 = async (
    hre: HardhatRuntimeEnvironment,
    lzEndPoint: string,
    owner: string,
): Promise<IDeployerVMAdd<USD0__factory>> => {
    return {
        contract: await hre.ethers.getContractFactory('USDO'),
        deploymentName: 'USDO',
        args: [
            lzEndPoint,
            // YieldBox, to be replaced by VM
            hre.ethers.constants.AddressZero,
            owner,
        ],
        dependsOn: [{ argPosition: 1, deploymentName: 'YieldBox' }],
    };
};
