import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';

describe('Bidders test', () => {
    it('should test name', async () => {
        const {
            usdoToWethBidder,
            wethUsdcMixologist,
            usdc,
            bar,
            deployCurveStableToUsdoBidder,
        } = await register();

        let savedName = await usdoToWethBidder.name();
        expect(savedName).to.eq('USD0 -> WETH (Uniswap V2)');

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            wethUsdcMixologist,
            bar,
            usdc,
            usdc,
        );

        savedName = await stableToUsdoBidder.name();
        expect(savedName).to.eq('stable -> USD0 (3Crv+USD0)');
    });

    it('should not get input or output amount', async () => {
        const {
            usdoToWethBidder,
            wethUsdcMixologist,
            usdc,
            bar,
            deployCurveStableToUsdoBidder,
            deployAndSetUsdo,
            BN,
        } = await register();

        await expect(
            usdoToWethBidder.getInputAmount(
                150,
                1,
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('token not valid');

        await expect(
            usdoToWethBidder.getOutputAmount(
                1,
                1,
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('USD0 not set');
        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            wethUsdcMixologist,
            bar,
            usdc,
            usdc,
        );

        await expect(
            stableToUsdoBidder.getInputAmount(
                150,
                1,
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('USD0 not set');
    });

    it('should set swappers', async () => {
        const {
            usdoToWethBidder,
            wethUsdcMixologist,
            usdc,
            bar,
            multiSwapper,
            deployCurveStableToUsdoBidder,
            deployAndSetUsdo,
        } = await register();

        await expect(
            usdoToWethBidder.setUniswapSwapper(multiSwapper.address),
        ).to.emit(usdoToWethBidder, 'UniV2SwapperUpdated');

        const { usdo } = await deployAndSetUsdo(bar);
        const { stableToUsdoBidder, curveSwapper } =
            await deployCurveStableToUsdoBidder(
                wethUsdcMixologist,
                bar,
                usdc,
                usdo,
            );

        await expect(
            stableToUsdoBidder.setCurveSwapper(curveSwapper.address),
        ).to.emit(stableToUsdoBidder, 'CurveSwapperUpdated');
    });

    it('should not swap', async () => {
        const {
            usdoToWethBidder,
            wethUsdcMixologist,
            usdc,
            bar,
            yieldBox,
            deployCurveStableToUsdoBidder,
            deployAndSetUsdo,
        } = await register();

        const { stableToUsdoBidder, curveSwapper } =
            await deployCurveStableToUsdoBidder(
                wethUsdcMixologist,
                bar,
                usdc,
                usdc,
            );

        await expect(
            stableToUsdoBidder.swap(1, 1, ethers.utils.toUtf8Bytes('')),
        ).to.be.revertedWith('USD0 not set');
        await expect(
            usdoToWethBidder.swap(1, 1, ethers.utils.toUtf8Bytes('')),
        ).to.be.revertedWith('USD0 not set');
        const { usdo } = await deployAndSetUsdo(bar);
        await expect(
            usdoToWethBidder.swap(1, 1, ethers.utils.toUtf8Bytes('')),
        ).to.be.revertedWith('token not valid');

        const usdoAssetId = await yieldBox.ids(
            1,
            usdo.address,
            ethers.constants.AddressZero,
            0,
        );

        await expect(
            stableToUsdoBidder.swap(
                usdoAssetId,
                1,
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('only LQ');

        await expect(
            usdoToWethBidder.swap(usdoAssetId, 1, ethers.utils.toUtf8Bytes('')),
        ).to.be.revertedWith('only LQ');
    });

    it('should get inputAmout for CurveStableToUsdoBidder', async () => {
        const {
            wethUsdcMixologist,
            usdc,
            bar,
            yieldBox,
            deployCurveStableToUsdoBidder,
            deployAndSetUsdo,
        } = await register();

        const { usdo } = await deployAndSetUsdo(bar);
        const { stableToUsdoBidder, curveSwapper } =
            await deployCurveStableToUsdoBidder(
                wethUsdcMixologist,
                bar,
                usdc,
                usdo,
            );

        const usdoAssetId = await yieldBox.ids(
            1,
            usdo.address,
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
                usdoAssetId,
                100,
                ethers.utils.toUtf8Bytes(''),
            ),
        ).not.to.be.reverted;

        await expect(
            await stableToUsdoBidder.getInputAmount(
                usdcAssetId,
                100,
                ethers.utils.toUtf8Bytes(''),
            ),
        ).not.to.be.reverted;
    });
});
