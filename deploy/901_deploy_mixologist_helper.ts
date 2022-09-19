import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('MixologistHelper', {
        from: deployer,
        log: true,
    });

    if (hre.network.live) {
        try {
            const helper = await deployments.get('MixologistHelper');
            await hre.run('verify', { address: helper.address });
        } catch (err) {
            console.log(err);
        }
    }
};
export default func;
func.tags = ['MixologistHelper'];
