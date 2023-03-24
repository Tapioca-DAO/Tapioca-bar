import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('Multisig test', () => {
    it('should execute tx', async () => {
        const { deployer, eoa1 } = await loadFixture(register);

        const revertContract = await (
            await ethers.getContractFactory('ContractThatReverts')
        ).deploy();
        await revertContract.deployed();

        const callData = revertContract.interface.encodeFunctionData(
            'shouldNotRevert',
            [1],
        );

        const multisig = await (
            await ethers.getContractFactory('MultisigMock')
        ).deploy(1);
        await multisig.deployed();

        await multisig.submitTransaction(revertContract.address, 0, callData);

        const txCount = await multisig.getTransactionCount();
        expect(txCount.eq(1)).to.be.true;

        let txInfo = await multisig.getTransaction(0);
        expect(txInfo.executed).to.be.false;

        await multisig.connect(deployer).confirmTransaction(0);

        txInfo = await multisig.getTransaction(0);
        expect(txInfo.executed).to.be.false;

        await multisig.connect(deployer).executeTransaction(0);

        txInfo = await multisig.getTransaction(0);
        expect(txInfo.executed).to.be.true;
    });
});
