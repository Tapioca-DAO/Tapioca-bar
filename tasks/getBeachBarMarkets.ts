import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getBeachBarMarkets } from '../scripts/scriptUtils';

export const getBeachBarMarkets__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(await getBeachBarMarkets(hre));
};
