import { IDeployerVMAdd } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { UsdoInitStructStruct } from '@typechain/contracts/usdo/Usdo';
import {
    UsdoMarketReceiverModule__factory,
    UsdoOptionReceiverModule__factory,
    UsdoReceiver__factory,
    UsdoSender__factory,
} from '@typechain/index';

import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DEPLOYMENT_NAMES } from 'tasks/deploy/DEPLOY_CONFIG';

export const buildUSDOModules = async (
    hre: HardhatRuntimeEnvironment,
): Promise<
    [
        IDeployerVMAdd<UsdoSender__factory>,
        IDeployerVMAdd<UsdoReceiver__factory>,
        IDeployerVMAdd<UsdoMarketReceiverModule__factory>,
        IDeployerVMAdd<UsdoOptionReceiverModule__factory>,
    ]
> => {
    const addrOne = '0x0000000000000000000000000000000000000001';
    const initStruct: UsdoInitStructStruct = {
        cluster: addrOne,
        delegate: addrOne,
        endpoint: hre.SDK.chainInfo.address, // Needs to be a real or mocked endpoint because of the external call made to it on construction
        extExec: addrOne,
        pearlmit: addrOne,
        yieldBox: addrOne,
    };
    return [
        {
            contract: await hre.ethers.getContractFactory('UsdoSender'),
            deploymentName: DEPLOYMENT_NAMES.USDO_SENDER_MODULE,
            args: [initStruct],
        },
        {
            contract: await hre.ethers.getContractFactory('UsdoReceiver'),
            deploymentName: DEPLOYMENT_NAMES.USDO_RECEIVER_MODULE,
            args: [initStruct],
        },
        {
            contract: await hre.ethers.getContractFactory(
                'UsdoMarketReceiverModule',
            ),
            deploymentName: DEPLOYMENT_NAMES.USDO_MARKET_RECEIVER_MODULE,
            args: [initStruct],
        },
        {
            contract: await hre.ethers.getContractFactory(
                'UsdoOptionReceiverModule',
            ),
            deploymentName: DEPLOYMENT_NAMES.USDO_OPTION_RECEIVER_MODULE,
            args: [initStruct],
        },
    ];
};
