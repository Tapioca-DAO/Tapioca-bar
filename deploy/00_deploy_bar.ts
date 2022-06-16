import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import fs from 'fs';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    let yieldboxAdrr: any = {};
    try {
        yieldboxAdrr = JSON.parse(fs.readFileSync('yieldbox.json', 'utf-8'));
    } catch (e) {}

    const yieldbox = yieldboxAdrr[await hre.getChainId()];
    const tap = '0x0';

    const args = [yieldbox, tap];
    await deploy('BeachBar', {
        from: deployer,
        log: true,
        args,
    });

    if (hre.network.live || hre.network.tags['rinkeby']) {
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
