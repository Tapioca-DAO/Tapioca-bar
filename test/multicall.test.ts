import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { Multicall3 } from '../typechain';

describe('Multicall test', () => {
    it('should test revert string', async () => {
        const revertContract = await (
            await ethers.getContractFactory('ContractThatReverts')
        ).deploy();
        await revertContract.deployed();

        const multiCall = await (
            await ethers.getContractFactory('Multicall3')
        ).deploy();
        await multiCall.deployed();

        const calls: Multicall3.Call3Struct[] = [];
        const callData = revertContract.interface.encodeFunctionData(
            'shouldRevert',
            [1],
        );

        calls.push({
            target: revertContract.address,
            allowFailure: false,
            callData,
        });
        await expect(multiCall.multicall(calls)).to.be.revertedWith(
            await revertContract.revertStr(),
        );
    });

    it.only('should test revert string through TapiocaDeployer', async () => {
        const tapiocaDeployer = await (
            await ethers.getContractFactory('TapiocaDeployerMock')
        ).deploy();
        await tapiocaDeployer.deployed();

        const multiCall = await (
            await ethers.getContractFactory('Multicall3')
        ).deploy();
        await multiCall.deployed();

        const contract = {
            contract: await ethers.getContractFactory(
                'ContractThatCannotBeDeployed',
            ),
            deploymentName: 'ContractThatCannotBeDeployed',
            args: [],
        };

        const creationCode =
            contract.contract.bytecode +
            contract.contract.interface
                .encodeDeploy(contract.args)
                .split('x')[1];
        const salt = ethers.utils.solidityKeccak256(['string'], ['RandomSalt']);

        const callData = tapiocaDeployer.interface.encodeFunctionData(
            'deploy',
            [0, salt, creationCode, 'ContractThatCannotBeDeployed'],
        );

        const calls: Multicall3.Call3Struct[] = [];
        calls.push({
            target: tapiocaDeployer.address,
            allowFailure: false,
            callData,
        });

        await expect(multiCall.multicall(calls)).to.be.revertedWith(
            'Create2: Failed deploying contract ContractThatCannotBeDeployed',
        );
    });
});
