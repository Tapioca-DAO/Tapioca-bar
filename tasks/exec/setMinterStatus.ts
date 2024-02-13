import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';

export const setMinterStatus__task = async (
    taskArgs: { operator: string; status: boolean },
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    if (!chainInfo) {
        throw new Error('Chain not found');
    }
    const usdoDeployment = hre.SDK.db
        .loadLocalDeployment(tag, chainInfo.chainId)
        .find((e) => e.name == 'USDO');
    if (!usdoDeployment) {
        throw new Error('[-] USDO not found');
    }
    const usdoContract = await hre.ethers.getContractAt(
        'USDO',
        usdoDeployment?.address,
    );

    await usdoContract.setMinterStatus(taskArgs.operator, taskArgs.status);
    console.log('[+] Status updated');
};
