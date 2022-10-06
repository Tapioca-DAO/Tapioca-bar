import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { register } from '../test/test.utils';
import { TContract, TProjectDeployment } from 'tapioca-sdk/dist/api/exportSDK';
import fs from 'fs';
import _ from 'lodash';
import { updateDeployments } from './utils';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {
        __uniFactory,
        __uniRouter,
        bar,
        liquidationQueue,
        mixologistHelper,
        usdc,
        weth,
        yieldBox,
        wethUsdcOracle,
        wethUsdcMixologist,
        verifyEtherscanQueue,
    } = await register(true);

    const contracts = {
        __uniFactory,
        __uniRouter,
        bar,
        liquidationQueue,
        mixologistHelper,
        usdc,
        weth,
        yieldBox,
        wethUsdcOracle,
        wethUsdcMixologist,
    };

    const chainId = await hre.getChainId();
    const projectDeployment: TProjectDeployment = {
        [chainId]: [],
    };
    for (const contract of Object.keys(contracts) as Array<
        keyof typeof contracts
    >) {
        const etherScanVerification = _.find(
            verifyEtherscanQueue,
            (e) => e.address === contracts[contract].address,
        );
        const meta = {
            constructorArguments: etherScanVerification?.args,
            toVerify: !!etherScanVerification,
        };

        (projectDeployment[Number(chainId) as 10] as TContract[]).push({
            name: contract,
            address: contracts[contract].address,
            meta,
        });
    }

    await updateDeployments(projectDeployment[chainId], chainId);

    for (const contract of verifyEtherscanQueue) {
        console.log(
            '[+] Verifying',
            _.find(
                projectDeployment[chainId as unknown as 10],
                (e) => e.address === contract.address,
            )?.name,
            contract.address,
        );
        try {
            await hre.run('verify', {
                address: contract.address,
                constructorArguments: contract.args,
            });
        } catch (err) {
            console.log(err);
        }
    }
};
export default func;
func.tags = ['testEnv', 'testnet'];
