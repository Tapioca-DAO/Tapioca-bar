import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';
import { verify, updateDeployments, constants } from './utils';
import _ from 'lodash';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = await hre.getChainId();
    const contracts: any[] = [];

    const beachBar = await deployments.get('BeachBar');

    console.log(`\n Deploying CurveSwapper`);
    const curveSwapperArgs = [
        constants[chainId].curveStablePool,
        beachBar.address,
    ];
    await deploy('CurveSwapper', {
        from: deployer,
        log: true,
        args: curveSwapperArgs,
    });
    await verify(hre, 'CurveSwapper', curveSwapperArgs);
    const deployedCurveSwapper = await deployments.get('CurveSwapper');
    contracts.push({
        contract: deployedCurveSwapper,
        args: curveSwapperArgs,
        artifact: 'CurveSwapper',
    });
    console.log(`Done`);

    console.log(`\n Deploying CurveStableToUsdoBidder`);
    // constructor(CurveSwapper curveSwapper_, uint256 curvePoolAssetCount_) {
    const stableToUsd0Args = [deployedCurveSwapper.address, 4];
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
        contract: deployedStableToUsd0Swapper,
        args: stableToUsd0Args,
        artifact: 'CurveStableToUsdoBidder',
    });
    console.log(`Done`);

    updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['StableToUSD0Bidder'];
