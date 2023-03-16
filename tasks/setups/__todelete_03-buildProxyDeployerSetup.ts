import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TDeploymentVMContract } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { TContract } from 'tapioca-sdk/dist/shared';
import { Multicall3 } from 'tapioca-sdk/dist/typechain/utils/MultiCall';
import { v4 as uuidv4 } from 'uuid';
import { ProxyDeployer } from '../../typechain';
import { getAfterDepContract } from '../utils';

export const buildProxyDeployerSetup = async (
    hre: HardhatRuntimeEnvironment,
    deps: TDeploymentVMContract[],
    lzEndPoint: string,
): Promise<{ calls: Multicall3.Call3Struct[]; toSave: TContract[] }> => {
    const calls: Multicall3.Call3Struct[] = [];

    const proxyDeployer = await getAfterDepContract<ProxyDeployer>(
        hre,
        deps,
        'ProxyDeployer',
    );

    /**
     * Add calls
     */
    console.log('[+] +Setting: Deploying MarketsProxy');
    const salt = hre.ethers.utils.solidityKeccak256(['string'], [uuidv4()]);
    await (await proxyDeployer.deployWithCreate2(lzEndPoint, salt)).wait(3);

    const count = await proxyDeployer.proxiesCount();
    const proxy = await proxyDeployer.proxies(count.sub(1));

    return {
        calls,
        toSave: [
            {
                name: 'MarketsProxy',
                address: proxy,
                meta: { salt },
            },
        ],
    };
};
