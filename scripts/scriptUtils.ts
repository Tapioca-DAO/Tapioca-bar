import { HardhatRuntimeEnvironment } from 'hardhat/types';
import fs from 'fs';

export const getBeachBarMarkets = async (hre: HardhatRuntimeEnvironment) => {
    let __sdk: any = {};
    try {
        __sdk = JSON.parse(
            fs.readFileSync('tapioca-sdk/src/addresses.json', 'utf-8'),
        );
    } catch (e) {}

    let beachBarAddr = '';
    try {
        beachBarAddr = (await hre.deployments.get('BeachBar')).address;
    } catch (e) {
        beachBarAddr = __sdk[await hre.getChainId()]['bar'];
    }

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
