import { DeployFunction } from 'hardhat-deploy/types';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    const tap = await (
        await hre.ethers.getContractFactory('ERC20Mock')
    ).deploy(hre.ethers.utils.parseEther('1000000000'));
    await tap.deployed();
    const args = [(await deployments.get('YieldBox')).address, tap.address];
    await deploy('BeachBar', {
        from: deployer,
        log: true,
        args,
    });

    if (hre.network.live) {
        try {
            const bar = await deployments.get('BeachBar');
            await hre.run('verify', {
                address: bar.address,
                constructorArgsParams: args,
            });
        } catch (err) {
            console.log(err);
        }
    }
};
export default func;
func.tags = ['BeachBar'];
