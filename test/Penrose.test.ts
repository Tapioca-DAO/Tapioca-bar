import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('Penrose test', () => {
    it('Should display Tapioca markets', async () => {
        const { bar } = await loadFixture(register);

        const markets = await bar.tapiocaMarkets();

        expect(markets.length).equal(1);
    });

    it('should return length of master contracts', async () => {
        const { bar } = await loadFixture(register);

        const length = await bar.masterContractLength();

        expect(length.gt(0)).to.be.true;
    });

    it('should not allow registering singularity without a proper master contract', async () => {
        const { bar } = await loadFixture(register);

        await expect(
            bar.registerSingularity(
                ethers.constants.AddressZero,
                ethers.utils.toUtf8Bytes(''),
                false,
            ),
        ).to.be.revertedWith('Penrose: MC not registered');
    });
""
    it('should not allow registering the same master contract twice', async () => {
        const { bar, mediumRiskMC } = await loadFixture(register);

        await expect(
            bar.registerMasterContract(mediumRiskMC.address, 1),
        ).to.be.revertedWith('Penrose: MC registered');
    });

    it('should not allow executing without a proper master contract', async () => {
        const { bar } = await loadFixture(register);

        await expect(
            bar.executeSingularityFn(
                [ethers.constants.AddressZero],
                [ethers.utils.toUtf8Bytes('')],
                true,
            ),
        ).to.be.revertedWith('Penrose: MC not registered');
    });

    it('should list all singularity registered markets', async () => {
        const { bar } = await loadFixture(register);
        const markets = await bar.tapiocaMarkets();
        expect(markets[0]).to.not.eq(ethers.constants.AddressZero);
    });

    it('should register a master contract', async () => {
        const { bar } = await loadFixture(register);

        const newMC = await (
            await ethers.getContractFactory('Singularity')
        ).deploy();
        await newMC.deployed();

        const mcLengthBefore = await bar.masterContractLength();

        await (await bar.registerMasterContract(newMC.address, 1)).wait();

        const mcLength = await bar.masterContractLength();
        expect(mcLength.eq(mcLengthBefore.add(1))).to.be.true;
    });

    it('should not withdraw for zero address swapper', async () => {
        const { bar } = await loadFixture(register);

        await expect(
            bar.withdrawAllProtocolFees(
                [ethers.constants.AddressZero],
                [
                    {
                        minAssetAmount: 1,
                    },
                ],
            ),
        ).to.be.revertedWith('Penrose: zero address');
    });
});
