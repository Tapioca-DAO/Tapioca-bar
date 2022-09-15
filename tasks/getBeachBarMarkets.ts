import { HardhatRuntimeEnvironment } from 'hardhat/types';

export const getBeachBarMarkets = async (hre: HardhatRuntimeEnvironment) => {
    const beachBarAddr = (await hre.deployments.get('BeachBar')).address;
    const beachBar = await hre.ethers.getContractAt('BeachBar', beachBarAddr);

    const addresses = await beachBar.tapiocaMarkets();
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
