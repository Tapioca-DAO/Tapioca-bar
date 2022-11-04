import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';


describe.skip('StargateStrategy test', () => {
    it("should test initial strategy values", async () => {
        const { yearnStrategy, weth, yieldBox } = await loadFixture(register);

        const name = await yearnStrategy.name();
        const description = await yearnStrategy.description();

        expect(name).eq("Yearn");
        expect(description).eq('Yearn strategy for wrapped native assets');

        const contractAddress = await yearnStrategy.contractAddress();
        expect(contractAddress.toLowerCase()).eq(weth.address.toLowerCase());

        const vaultAddress = await yearnStrategy.vault();
        expect(vaultAddress).to.not.eq(ethers.constants.AddressZero);

        const yieldBoxAddress = await yearnStrategy.yieldBox();
        expect(yieldBoxAddress.toLowerCase()).to.eq(yieldBox.address.toLowerCase());

        const currentBalance = await yearnStrategy.currentBalance();
        expect(currentBalance.eq(0)).to.be.true;

        const queued = await weth.balanceOf(yearnStrategy.address);
        expect(queued.eq(0)).to.be.true;
    });
});