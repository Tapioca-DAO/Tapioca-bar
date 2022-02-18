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
            args: [hre.ethers.BigNumber.from(1e18.toString()).mul(1e6).toString()],
        });

        await deploy('WETH9Mock', {
            from: deployer,
            log: true,
        });
        if (hre.network.live || hre.network.tags['rinkeby']) {
            try {
                const erc20 = await deployments.get('ERC20Mock');
                await hre.run('verify', { address: erc20.address, constructorArgsParams: [hre.ethers.BigNumber.from(1e18.toString()).mul(1e6).toString()] });
            } catch (err) {
                console.log(err);
            }
            try {
                const weth = await deployments.get('WETH9Mock');
                await hre.run('verify', { address: weth.address  });
            } catch (err) {
                console.log(err);
            }
        }
    }
};
export default func;
func.tags = ['Mocks'];
