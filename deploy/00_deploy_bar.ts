import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('TapiocaBar', {
        from: deployer,
        log: true,
        args: ['0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000'],
    });
};
export default func;
func.tags = ['TapiocaBar'];
