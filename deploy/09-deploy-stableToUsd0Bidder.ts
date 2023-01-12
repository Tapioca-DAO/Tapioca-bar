import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify, updateDeployments, constants } from './utils';
import _ from 'lodash';
import { TContract } from 'tapioca-sdk/dist/shared';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    const contracts: TContract[] = [];

    const penrose = await deployments.get('Penrose');

    console.log('\n Deploying CurveSwapper');
    const curveSwapperArgs = [
        constants[chainId].crvStablePool,
        penrose.address,
    ];
    await deploy('CurveSwapper', {
        from: deployer,
        log: true,
        args: curveSwapperArgs,
    });
    await verify(hre, 'CurveSwapper', curveSwapperArgs);
    const deployedCurveSwapper = await deployments.get('CurveSwapper');
    contracts.push({
        address: deployedCurveSwapper.address,
        meta: { constructorArguments: curveSwapperArgs },
        name: 'CurveSwapper',
    });
    console.log(
        `Done. Deployed on ${
            deployedCurveSwapper.address
        } with args ${JSON.stringify(curveSwapperArgs)}`,
    );

    console.log('\n Deploying CurveStableToUsdoBidder');
    const stableToUsd0Args = [deployedCurveSwapper.address, '4'];
    await deploy('CurveStableToUsdoBidder', {
        from: deployer,
        log: true,
        args: stableToUsd0Args,
    });
    await verify(hre, 'CurveStableToUsdoBidder', stableToUsd0Args);
    const deployedStableToUsd0Swapper = await deployments.get(
        'CurveStableToUsdoBidder',
    );
    contracts.push({
        name: 'CurveStableToUsdoBidder',
        address: deployedStableToUsd0Swapper.address,
        meta: { constructorArguments: stableToUsd0Args },
    });
    console.log(
        `Done. Deployed on ${
            deployedStableToUsd0Swapper.address
        } with args ${JSON.stringify(stableToUsd0Args)}`,
    );

    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['StableToUSD0Bidder'];
