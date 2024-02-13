import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';
import {
    getBigBangContract,
    getDeployment,
    getSingularityContract,
} from '../utils';

//Execution example:
export const setCap = async (taskArgs: any, hre: HardhatRuntimeEnvironment) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');

    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);

    // const penroseDeployment = hre.SDK.db
    //     .loadLocalDeployment(tag, chainInfo.chainId)
    //     .find((e) => e.name == 'Penrose');
    // const penroseContract = await hre.ethers.getContractAt('Penrose', penroseDeployment?.address);

    const { contract: penrose } =
        await hre.SDK.hardhatUtils.getLocalContract<Penrose>(
            hre,
            'Penrose',
            tag,
        );

    let marketAddress;
    if (hre.ethers.utils.isAddress(taskArgs.singularity)) {
        marketAddress = taskArgs.singularity;
    } else if (hre.ethers.utils.isAddress(taskArgs.bigBang)) {
        marketAddress = taskArgs.bigBang;
        // callData = bigBangContract.interface.encodeFunctionData(
        //     'setAssetOracle',
        //     ['0xa39B0dbeE0A6e772313C12C51F8BF08553519101', '0x']
        // )
    }

    const market = await hre.ethers.getContractAt('Market', marketAddress);
    const callData = market.interface.encodeFunctionData('setMarketConfig', [
        hre.ethers.constants.AddressZero,
        hre.ethers.utils.toUtf8Bytes(''),
        hre.ethers.constants.AddressZero,
        0,
        0,
        0,
        0,
        0,
        taskArgs.cap,
        0,
        0,
    ]);
    await (
        await penrose.executeMarketFn([marketAddress], [callData], true)
    ).wait();
};

export const setBorrowCap__task = async (
    args: any,
    hre: HardhatRuntimeEnvironment,
) => {
    console.log(
        `Setting borrow cap ('${args['path']}') on singularity: ${args['singularity']} and/or bigBang: ${args['bigBang']}`,
    );
    await setCap(args, hre);
    console.log('Execution completed');
};
