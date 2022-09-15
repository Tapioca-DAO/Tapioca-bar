import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

export const deployMockContracts__task: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment,
) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploy('WETH9Mock', {
        from: deployer,
        log: true,
    });
    await deploy('YieldBoxURIBuilder', {
        from: deployer,
        log: true,
    });
    const args = [
        (await deployments.get('WETH9Mock')).address,
        (await deployments.get('YieldBoxURIBuilder')).address,
    ];
    await deploy('YieldBox', {
        from: deployer,
        log: true,
        args,
    });

    try {
        const weth9Mock = await deployments.get('WETH9Mock');
        const yieldBox = await deployments.get('YieldBox');
        await hre.run('verify', {
            address: weth9Mock.address,
        });
        await hre.run('verify', {
            address: yieldBox.address,
            constructorArgsParams: args,
        });
    } catch (err) {
        console.log(err);
    }
};
