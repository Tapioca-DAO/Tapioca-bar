import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const tap = '0x0';
    const args = [(await deployments.get('YieldBoxURIBuilder')).address, tap];
    await deploy('BeachBar', {
        from: deployer,
        log: true,
        args,
    });

    try {
        const bar = await deployments.get('BeachBar');
        await hre.run('verify', {
            address: bar.address,
            constructorArgsParams: args,
        });
    } catch (err) {
        console.log(err);
    }
};
export default func;
func.tags = ['BeachBar'];
