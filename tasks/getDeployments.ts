import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

export const getDeployments = async (_hre: HardhatRuntimeEnvironment) => {
    const { deployments } = _hre;
    const all = (await deployments?.all()) ?? [];
    return Promise.all(
        Object.keys(all).map(async (e) => ({
            name: e,
            address: all[e].address,
        })),
    );
};

export const getDeployments__task: DeployFunction = async function (
    hre: HardhatRuntimeEnvironment,
) {
    console.log(await getDeployments(hre));
};
