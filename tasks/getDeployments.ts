import { HardhatRuntimeEnvironment } from 'hardhat/types';

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

export const getDeployments__task = async function (
    taskArgs: any,
    hre: HardhatRuntimeEnvironment,
) {
    console.log(await getDeployments(hre));
};
