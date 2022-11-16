import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('Bidders test', () => {
    it('should test name', async () => {
        const {
            usdoToWethBidder,
            wethUsdcSingularity,
            usdc,
            usd0,
            bar,
            deployCurveStableToUsdoBidder,
        } = await loadFixture(register);

        let savedName = await usdoToWethBidder.name();
        expect(savedName).to.eq('USD0 -> WETH (Uniswap V2)');

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
        );

        savedName = await stableToUsdoBidder.name();
        expect(savedName).to.eq('stable -> USD0 (3Crv+USD0)');
    });

    it('should not get input or output amount', async () => {
        const {
            usdoToWethBidder,
            wethUsdcSingularity,
            usdc,
            usd0,
            bar,
            deployCurveStableToUsdoBidder,
        } = await loadFixture(register);

        await expect(
            usdoToWethBidder.getInputAmount(
                wethUsdcSingularity.address,
                150,
                1,
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('token not valid');

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
        );
    });

    it('should set swappers', async () => {
        const {
            usdoToWethBidder,
            wethUsdcSingularity,
            usdc,
            bar,
            multiSwapper,
            usd0,
            deployCurveStableToUsdoBidder,
        } = await loadFixture(register);

        await expect(
            usdoToWethBidder.setUniswapSwapper(multiSwapper.address),
        ).to.emit(usdoToWethBidder, 'UniV2SwapperUpdated');

        const { stableToUsdoBidder, curveSwapper } =
            await deployCurveStableToUsdoBidder(bar, usdc, usd0);

        await expect(
            stableToUsdoBidder.setCurveSwapper(curveSwapper.address),
        ).to.emit(stableToUsdoBidder, 'CurveSwapperUpdated');
    });

    it('should not swap', async () => {
        const {
            usdoToWethBidder,
            wethUsdcSingularity,
            usdc,
            bar,
            yieldBox,
            deployCurveStableToUsdoBidder,
            usd0,
        } = await loadFixture(register);

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
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
        ).to.be.revertedWith('token not valid');

        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            ethers.constants.AddressZero,
            0,
        );

        await expect(
            stableToUsdoBidder.swap(
                wethUsdcSingularity.address,
                usdoAssetId,
                1,
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('only LQ');

        await expect(
            usdoToWethBidder.swap(
                wethUsdcSingularity.address,
                usdoAssetId,
                1,
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('only LQ');
    });

    it('should get inputAmout for CurveStableToUsdoBidder', async () => {
        const {
            wethUsdcSingularity,
            usdc,
            usd0,
            bar,
            yieldBox,
            deployCurveStableToUsdoBidder,
        } = await loadFixture(register);

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
        );

        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            ethers.constants.AddressZero,
            0,
        );

        const usdcAssetId = await yieldBox.ids(
            1,
            usdc.address,
            ethers.constants.AddressZero,
            0,
        );

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
