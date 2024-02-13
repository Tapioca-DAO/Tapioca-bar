import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('Penrose test', () => {
    describe('views', () => {
        it('Should display Tapioca markets', async () => {
            const { penrose } = await loadFixture(register);

            const markets = await penrose.singularityMarkets();

            expect(markets.length).equal(2); //weth-usdc & wbtc-usdc
        });

        it('should return length of master contracts', async () => {
            const { penrose } = await loadFixture(register);

            const length = await penrose.singularityMasterContractLength();

            expect(length.gt(0)).to.be.true;
        });

        it('should list all singularity registered markets', async () => {
            const { penrose } = await loadFixture(register);
            const markets = await penrose.singularityMarkets();
            expect(markets[0]).to.not.eq(ethers.constants.AddressZero);

            const isMarketRegistered = await penrose.isMarketRegistered(
                markets[0],
            );
            expect(isMarketRegistered).to.be.true;

            const nonRegisteredMarket = await penrose.isMarketRegistered(
                penrose.address,
            );
            expect(nonRegisteredMarket).to.be.false;
        });
    });

    describe('allowances', () => {
        it('should not allow registering singularity without a proper master contract', async () => {
            const { penrose } = await loadFixture(register);

            await expect(
                penrose.registerSingularity(
                    ethers.constants.AddressZero,
                    ethers.utils.toUtf8Bytes(''),
                    false,
                ),
            ).to.be.reverted;
        });

        it('should not allow registering the same master contract twice', async () => {
            const { penrose, mediumRiskMC } = await loadFixture(register);

            await expect(
                penrose.registerSingularityMasterContract(
                    mediumRiskMC.address,
                    1,
                ),
            ).to.be.reverted;
        });

        it('should not allow executing without a proper master contract', async () => {
            const { penrose } = await loadFixture(register);

            await expect(
                penrose.executeMarketFn(
                    [ethers.constants.AddressZero],
                    [ethers.utils.toUtf8Bytes('')],
                    true,
                ),
            ).to.be.reverted;
        });

        it('should not allow to call withdraw when paused', async () => {
            const { penrose, deployer } = await loadFixture(register);
            await penrose.setConservator(deployer.address);
            await penrose.updatePause(true);
            await expect(
                penrose.withdrawAllMarketFees(
                    [ethers.constants.AddressZero],
                    ethers.constants.AddressZero,
                ),
            ).to.be.reverted;

            await expect(
                penrose.withdrawAllMarketFees(
                    [ethers.constants.AddressZero],
                    ethers.constants.AddressZero,
                ),
            ).to.be.reverted;
        });

        it('should not allow to call execute when paused', async () => {
            const { penrose, deployer } = await loadFixture(register);
            await penrose.setConservator(deployer.address);
            await penrose.updatePause(true);
            await expect(
                penrose.executeMarketFn(
                    [ethers.constants.AddressZero],
                    [ethers.utils.toUtf8Bytes('')],
                    true,
                ),
            ).to.be.reverted;
        });
    });

    describe('setters', () => {
        it('should register a master contract', async () => {
            const { penrose } = await loadFixture(register);

            const newMC = await (
                await ethers.getContractFactory('Singularity')
            ).deploy();
            await newMC.deployed();

            const mcLengthBefore =
                await penrose.singularityMasterContractLength();

            await (
                await penrose.registerSingularityMasterContract(
                    newMC.address,
                    1,
                )
            ).wait();

            const mcLength = await penrose.singularityMasterContractLength();
            expect(mcLength.eq(mcLengthBefore.add(1))).to.be.true;
        });
    });
});
