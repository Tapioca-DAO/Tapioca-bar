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

    console.log('\n Deploying WETH...');
    await deploy('WETH9Mock', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'WETH9Mock', []);
    const deployedWeth = await deployments.get('WETH9Mock');
    contracts.push({
        name: 'WETH9Mock',
        address: deployedWeth.address,
        meta: {},
    });
    console.log(
        `Done. Deployed WETH9Mock on ${deployedWeth.address} with no arguments`,
    );

    console.log('\n Deploying ERC20FactoryMock...');
    await deploy('ERC20FactoryMock', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'ERC20FactoryMock', []);
    const deployedERC20Factory = await deployments.get('ERC20FactoryMock');
    contracts.push({
        name: 'ERC20FactoryMock',
        address: deployedERC20Factory.address,
        meta: {},
    });
    const erc20FactoryContract = await hre.ethers.getContractAt(
        'ERC20FactoryMock',
        deployedERC20Factory.address,
    );
    console.log(
        `Done. Deployed ERC20FactoryMock on ${deployedERC20Factory.address} with no arguments`,
    );

    console.log('\n Deploying USDC...');
    await erc20FactoryContract.deployToken(
        hre.ethers.utils.parseEther('10000000000'),
        18,
    );
    const deployedUsdc = await hre.ethers.getContractAt(
        'ERC20Mock',
        await erc20FactoryContract.last(),
    );
    const usdcArgs = [
        hre.ethers.utils.parseEther('10000000000').toString(),
        18,
    ];
    await verify(hre, 'ERC20Mock', usdcArgs);
    contracts.push({
        name: 'ERC20Mock-USDC',
        address: deployedUsdc.address,
        meta: { constructorArguments: usdcArgs },
    });
    console.log(
        `Done. Deployed ERC20Mock-USDC on ${deployedUsdc.address} with args [${usdcArgs}]`,
    );

    console.log('\n Deploying WBTC...');
    await erc20FactoryContract.deployToken(
        hre.ethers.utils.parseEther('10000'),
        8,
    );
    const deployedWbtc = await hre.ethers.getContractAt(
        'ERC20Mock',
        await erc20FactoryContract.last(),
    );
    const wbtcArgs = [hre.ethers.utils.parseEther('10000000000').toString(), 8];
    await verify(hre, 'ERC20Mock', wbtcArgs);
    contracts.push({
        name: 'ERC20Mock-WBTC',
        address: deployedWbtc.address,
        meta: { constructorArguments: wbtcArgs },
    });
    console.log(
        `Done. Deployed ERC20Mock-WBTC on ${deployedWbtc.address} with args [${wbtcArgs}]`,
    );

    console.log('\n Deploying OracleMockFactory...');
    await deploy('OracleMockFactory', {
        from: deployer,
        log: true,
    });
    await verify(hre, 'OracleMockFactory', []);
    const deployedOracleMockFactory = await deployments.get(
        'OracleMockFactory',
    );
    contracts.push({
        name: 'OracleMockFactory',
        address: deployedOracleMockFactory.address,
        meta: {},
    });
    console.log(
        `Done. Deployed OracleMockFactory on ${deployedOracleMockFactory.address} with no arguments`,
    );
    await updateDeployments(contracts, chainId);
};

export default func;
func.tags = ['Mocks'];
