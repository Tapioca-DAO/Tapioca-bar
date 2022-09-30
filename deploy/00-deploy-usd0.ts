import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { constants } from './utils';
import _ from 'lodash';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    //TBD
    const chainId = await hre.getChainId();

    let usdoAddress = constants[chainId].usdoAddress;
    if (
        hre.ethers.utils.isAddress(usdoAddress!) &&
        usdoAddress != hre.ethers.constants.AddressZero
    ) {
        console.log(`USD0 already deployed. Skipping...`);
        return;
    }
};

export default func;
func.tags = ['USD0'];
