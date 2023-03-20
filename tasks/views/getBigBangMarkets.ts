import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { getDeployment } from '../utils';

export const getBigBangMarkets = async (hre: HardhatRuntimeEnvironment) => {
    const penroseContract = await getDeployment(hre, 'Penrose');

    const addresses = await penroseContract.bigBangMarkets();
    const markets = [];

    for (const address of addresses) {
        const bigBang = await hre.ethers.getContractAt('BigBang', address);
        markets.push({
            [await bigBang.name()]: address,
        });
    }

    return markets;
};

export const getBigBangMarkets__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getBigBangMarkets(hre));
};
