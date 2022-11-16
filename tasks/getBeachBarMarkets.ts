import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment } from './utils';

export const getBeachBarMarkets = async (hre: HardhatRuntimeEnvironment) => {
    const beachBarContract = await getDeployment(hre, 'BeachBar');

    const addresses = await beachBarContract.tapiocaMarkets();
    const markets = [];

    for (const address of addresses) {
        const singularity = await hre.ethers.getContractAt(
            'Singularity',
            address,
        );
        markets.push({
            [await singularity.name()]: address,
        });
    }

    return markets;
};

export const getBeachBarMarkets__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getBeachBarMarkets(hre));
};
