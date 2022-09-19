import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { TContract } from 'tapioca-sdk/dist/shared';
import { getDeployments } from './getDeployments';

export const getBeachBarMarkets = async (hre: HardhatRuntimeEnvironment) => {
    let deployments: TContract[] = [];
    try {
        deployments = await getDeployments(hre, true);
    } catch (e) {
        deployments = await getDeployments(hre);
    }

    const beachBar = _.find(deployments, { name: 'bar' });
    if (!beachBar) {
        throw new Error('[-] BeachBar not found');
    }
    const beachBarContract = await hre.ethers.getContractAt(
        'BeachBar',
        beachBar.address,
    );

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
