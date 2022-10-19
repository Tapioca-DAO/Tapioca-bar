import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment } from './utils';

export const getBeachBarMarkets = async (hre: HardhatRuntimeEnvironment) => {
    const beachBarContract = await getDeployment(hre, 'BeachBar');

    const addresses = await beachBarContract.tapiocaMarkets();
    const markets = [];

    for (const address of addresses) {
        const mixologist = await hre.ethers.getContractAt(
            'Mixologist',
            address,
        );
        markets.push({
            [await mixologist.name()]: address,
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
