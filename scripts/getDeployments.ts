import hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const getDeployments = async (_hre: HardhatRuntimeEnvironment) => {
    const { deployments } = _hre;
    const all = await deployments.all();
    return Object.keys(all).map(async (e) => ({ [e]: all[e].address }));
};

async function main() {
    (await getDeployments(hre)).map((e) => console.log(e));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
