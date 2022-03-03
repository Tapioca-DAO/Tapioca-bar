import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('BeachBar', {
        from: deployer,
        log: true,
        args: ['0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000'],
    });

    if (hre.network.live || hre.network.tags['rinkeby']) {
        try {
            const bar = await deployments.get('BeachBar');
            await hre.run('verify', {address: bar.address, constructorArgsParams: ['0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000'] });
        } catch (err) {
            console.log(err);
        }
    }
};
export default func;
func.tags = ['BeachBar'];
