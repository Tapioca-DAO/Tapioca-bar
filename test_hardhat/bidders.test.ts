import hre, { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import CurveSwapperArtifact from '@tapioca-sdk/artifacts/tapioca-periphery/CurveSwapper.json';
import { CurveSwapper } from '@tapioca-sdk/typechain/tapioca-periphery';

describe.skip('Bidders test', () => {
    it('should test name', async () => {
        const {
            usdoToWethBidder,
            wethUsdcSingularity,
            usdc,
            usd0,
            yieldBox,
            deployCurveStableToUsdoBidder,
        } = await loadFixture(register);

        let savedName = await usdoToWethBidder.name();
        expect(savedName).to.eq('USDO -> WETH (Uniswap V2)');

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            yieldBox,
            usdc,
            usd0,
        );

        savedName = await stableToUsdoBidder.name();
        expect(savedName).to.eq('stable -> USDO (3Crv+USDO)');
    });

    describe('getInputAmount()', () => {
        it('should not get input or output amount', async () => {
            const {
                usdoToWethBidder,
                wethUsdcSingularity,
                usdc,
                usd0,
                penrose,
                yieldBox,
                deployCurveStableToUsdoBidder,
            } = await loadFixture(register);

            await expect(
                usdoToWethBidder.getInputAmount(
                    wethUsdcSingularity.address,
                    150,
                    1,
                    ethers.utils.toUtf8Bytes(''),
                ),
            ).to.be.reverted;

            const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
                yieldBox,
                usdc,
                usd0,
            );
        });

        it('should get inputAmout for CurveStableToUsdoBidder', async () => {
            const {
                wethUsdcSingularity,
                usdc,
                usdcAssetId,
                usd0,
                penrose,
                yieldBox,
                deployCurveStableToUsdoBidder,
                deployer,
            } = await loadFixture(register);

            const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
                yieldBox,
                usdc,
                usd0,
            );
            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            const swapper = await stableToUsdoBidder.curveSwapper();
            const swapperContract = new ethers.Contract(
                swapper,
                CurveSwapperArtifact.abi,
                deployer,
            ) as CurveSwapper;

            const testBuild = await swapperContract
                .connect(deployer)
                ['buildSwapData(uint256,uint256,uint256,uint256,bool,bool)'](
                    usdcAssetId,
                    usdoAssetId,
                    100,
                    0,
                    true,
                    true,
                );
            expect(testBuild.length).gt(0);

            await expect(
                await stableToUsdoBidder.getInputAmount(
                    wethUsdcSingularity.address,
                    usdoAssetId,
                    100,
                    ethers.utils.toUtf8Bytes(''),
                ),
            ).not.to.be.reverted;

            await expect(
                await stableToUsdoBidder.getInputAmount(
                    wethUsdcSingularity.address,
                    usdcAssetId,
                    100,
                    ethers.utils.toUtf8Bytes(''),
                ),
            ).not.to.be.reverted;
        });
    });

    describe('setters', () => {
        it('should set swappers', async () => {
            const {
                usdoToWethBidder,
                wethUsdcSingularity,
                usdc,
                penrose,
                yieldBox,
                multiSwapper,
                usd0,
                deployCurveStableToUsdoBidder,
            } = await loadFixture(register);

            await expect(
                usdoToWethBidder.setUniswapSwapper(multiSwapper.address),
            ).to.emit(usdoToWethBidder, 'UniV2SwapperUpdated');

            const { stableToUsdoBidder, curveSwapper } =
                await deployCurveStableToUsdoBidder(yieldBox, usdc, usd0);

            await expect(
                stableToUsdoBidder.setCurveSwapper(curveSwapper.address),
            ).to.emit(stableToUsdoBidder, 'CurveSwapperUpdated');
        });
    });

    describe('swap()', () => {
        it('should not swap', async () => {
            const {
                usdoToWethBidder,
                wethUsdcSingularity,
                usdc,
                penrose,
                deployCurveStableToUsdoBidder,
                usd0,
                yieldBox,
            } = await loadFixture(register);

            const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
                yieldBox,
                usdc,
                usd0,
            );

            await expect(
                usdoToWethBidder.swap(
                    wethUsdcSingularity.address,
                    1,
                    1,
                    ethers.utils.toUtf8Bytes(''),
                ),
            ).to.be.reverted;

            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            await expect(
                stableToUsdoBidder.swap(
                    wethUsdcSingularity.address,
                    usdoAssetId,
                    1,
                    ethers.utils.toUtf8Bytes(''),
                ),
            ).to.be.reverted;

            await expect(
                usdoToWethBidder.swap(
                    wethUsdcSingularity.address,
                    usdoAssetId,
                    1,
                    ethers.utils.toUtf8Bytes(''),
                ),
            ).to.be.reverted;
        });
    });
});
