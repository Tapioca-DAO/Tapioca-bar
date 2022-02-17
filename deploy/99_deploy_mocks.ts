import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    if (hre.network.tags['testnet']) {
        const { deployments, getNamedAccounts } = hre;
        const { deploy } = deployments;
        const { deployer } = await getNamedAccounts();

        await deploy('ERC20Mock', {
            from: deployer,
            log: true,
            args: [hre.ethers.BigNumber.from(1e18).mul(1e6)],
        });

        await deploy('WETH9Mock', {
            from: deployer,
            log: true,
        });
    }
};
export default func;
func.tags = ['Mocks'];
