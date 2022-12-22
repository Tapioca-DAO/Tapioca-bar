import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment } from './utils';

export const getBingBangMarkets = async (hre: HardhatRuntimeEnvironment) => {
    const penroseContract = await getDeployment(hre, 'Penrose');

    const addresses = await penroseContract.bingBangMarkets();
    const markets = [];

    for (const address of addresses) {
        const bingBang = await hre.ethers.getContractAt(
            'BingBang',
            address,
        );
        markets.push({
            [await bingBang.name()]: address,
        });
    }

    return markets;
};

export const getBingBangMarkets__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getBingBangMarkets(hre));
};
