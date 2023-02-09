import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('MarketsHelper test', () => {
    it('Should deposit to yieldBox & add asset to singularity through SGL helper', async () => {
        const {
            weth,
            yieldBox,
            wethUsdcSingularity,
            deployer,
            initContracts,
            marketsHelper,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        await weth.approve(marketsHelper.address, mintVal);
        await marketsHelper.depositAndAddAsset(
            wethUsdcSingularity.address,
            mintVal,
            true,
        );
    });

    it('should deposit, add collateral and borrow through SGL helper', async () => {
        const {
            weth,
            yieldBox,
            wethUsdcSingularity,
            deployer,
            usdc,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const assetId = await wethUsdcSingularity.assetId();
        const collateralId = await wethUsdcSingularity.collateralId();

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approve(marketsHelper.address, usdcMintVal);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                usdcMintVal,
                borrowAmount,
                true,
                false,
                ethers.utils.toUtf8Bytes(''),
            );
    });

    it('should deposit, add collateral, borrow and withdraw through SGL helper', async () => {
        const {
            weth,
            wethUsdcSingularity,
            usdc,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approve(marketsHelper.address, usdcMintVal);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                usdcMintVal,
                borrowAmount,
                true,
                true,
                ethers.utils.toUtf8Bytes(''),
            );
    });

    it('should deposit, add collateral, borrow and withdraw through SGL helper without withdraw', async () => {
        const {
            weth,
            wethUsdcSingularity,
            usdc,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approve(marketsHelper.address, usdcMintVal);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                usdcMintVal,
                borrowAmount,
                true,
                false,
                ethers.utils.toUtf8Bytes(''),
            );
    });

    it('should add collateral, borrow and withdraw through SGL helper', async () => {
        const {
            weth,
            wethUsdcSingularity,
            usdc,
            usdcAssetId,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
            yieldBox,
            usdcDepositAndAddCollateral,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approve(marketsHelper.address, usdcMintVal);
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                usdcAssetId,
                eoa1.address,
                eoa1.address,
                usdcMintVal,
                0,
            );

        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                usdcMintVal,
                borrowAmount,
                false,
                true,
                ethers.utils.toUtf8Bytes(''),
            );
    });

    it('should deposit and repay through SGL helper', async () => {
        const {
            weth,
            wethUsdcSingularity,
            usdc,
            eoa1,
            initContracts,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approve(marketsHelper.address, usdcMintVal);
        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                usdcMintVal,
                borrowAmount,
                true,
                true,
                ethers.utils.toUtf8Bytes(''),
            );

        const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
            eoa1.address,
        );
        await weth.connect(eoa1).freeMint(userBorrowPart.mul(2));

        await weth
            .connect(eoa1)
            .approve(marketsHelper.address, userBorrowPart.mul(2));
        await wethUsdcSingularity
            .connect(eoa1)
            .approve(marketsHelper.address, userBorrowPart.mul(2));
        await marketsHelper
            .connect(eoa1)
            .depositAndRepay(
                wethUsdcSingularity.address,
                userBorrowPart.mul(2),
                userBorrowPart,
                true,
            );
    });

    it('should deposit, repay, remove collateral and withdraw through SGL helper', async () => {
        const {
            usdcAssetId,
            weth,
            wethUsdcSingularity,
            usdc,
            eoa1,
            initContracts,
            yieldBox,
            marketsHelper,
            __wethUsdcPrice,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Singularity: below minimum`

        const borrowAmount = ethers.BigNumber.from((1e17).toString());
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We lend WETH as deployer
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);

        await usdc.connect(eoa1).approve(marketsHelper.address, usdcMintVal);
        await wethUsdcSingularity
            .connect(eoa1)
            .approve(marketsHelper.address, usdcMintVal);

        await marketsHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                wethUsdcSingularity.address,
                usdcMintVal,
                borrowAmount,
                true,
                true,
                ethers.utils.toUtf8Bytes(''),
            );

        const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
            eoa1.address,
        );
        await weth.connect(eoa1).freeMint(userBorrowPart.mul(2));

        await weth
            .connect(eoa1)
            .approve(marketsHelper.address, userBorrowPart.mul(2));
        await wethUsdcSingularity
            .connect(eoa1)
            .approve(marketsHelper.address, userBorrowPart.mul(2));
        const collateralShare = await wethUsdcSingularity.userCollateralShare(
            eoa1.address,
        );
        const collateralAmount = await yieldBox.toAmount(
            usdcAssetId,
            collateralShare,
            false,
        );
        const usdcBalanceBefore = await usdc.balanceOf(eoa1.address);
        await marketsHelper
            .connect(eoa1)
            .depositRepayAndRemoveCollateral(
                wethUsdcSingularity.address,
                userBorrowPart.mul(2),
                userBorrowPart,
                collateralAmount,
                true,
                true,
            );
        const usdcBalanceAfter = await usdc.balanceOf(eoa1.address);
        expect(usdcBalanceAfter.gt(usdcBalanceBefore)).to.be.true;
        expect(usdcBalanceAfter.sub(usdcBalanceBefore).eq(collateralAmount)).to
            .be.true;
    });

    it('should mint and lend', async () => {
        const {
            weth,
            createWethUsd0Singularity,
            wethBigBangMarket,
            usd0,
            usdc,
            bar,
            wethAssetId,
            mediumRiskMC,
            deployCurveStableToUsdoBidder,
            initContracts,
            yieldBox,
            marketsHelper,
            deployer,
        } = await loadFixture(register);

        await initContracts();

        const usdoStratregy = await bar.emptyStrategies(usd0.address);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStratregy,
            0,
        );

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            ethers.utils.parseEther('1'),
            false,
        );

        const borrowAmount = ethers.BigNumber.from((1e18).toString()).mul(100);
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);

        // We get asset
        await weth.freeMint(wethMintVal);

        // Approve tokens
        // await approveTokensAndSetBarApproval();
        await yieldBox.setApprovalForAll(wethUsdoSingularity.address, true);
        await wethBigBangMarket.updateOperator(marketsHelper.address, true);
        await weth.approve(marketsHelper.address, wethMintVal);
        await wethUsdoSingularity.approve(
            marketsHelper.address,
            ethers.constants.MaxUint256,
        );

        await marketsHelper.mintAndLend(
            wethUsdoSingularity.address,
            wethBigBangMarket.address,
            wethMintVal,
            borrowAmount,
            true,
        );

        const bingBangCollateralShare =
            await wethBigBangMarket.userCollateralShare(deployer.address);
        const bingBangCollateralAmount = await yieldBox.toAmount(
            wethAssetId,
            bingBangCollateralShare,
            false,
        );
        expect(bingBangCollateralAmount.eq(wethMintVal)).to.be.true;

        const bingBangBorrowPart = await wethBigBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(bingBangBorrowPart.gte(borrowAmount)).to.be.true;

        const lentAssetShare = await wethUsdoSingularity.balanceOf(
            deployer.address,
        );
        const lentAssetAmount = await yieldBox.toAmount(
            usdoAssetId,
            lentAssetShare,
            false,
        );
        expect(lentAssetAmount.eq(borrowAmount)).to.be.true;
    });

    it('should remove asset, repay BingBang, remove collateral and withdraw', async () => {
        const {
            weth,
            createWethUsd0Singularity,
            wethBigBangMarket,
            usd0,
            usdc,
            bar,
            wethAssetId,
            mediumRiskMC,
            deployCurveStableToUsdoBidder,
            initContracts,
            yieldBox,
            marketsHelper,
            deployer,
        } = await loadFixture(register);

        await initContracts();

        const usdoStratregy = await bar.emptyStrategies(usd0.address);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStratregy,
            0,
        );

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            ethers.utils.parseEther('1'),
            false,
        );

        const borrowAmount = ethers.BigNumber.from((1e18).toString()).mul(100);
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);

        await usd0.mint(deployer.address, borrowAmount.mul(2));
        // We get asset
        await weth.freeMint(wethMintVal);

        // Approve tokens
        // await approveTokensAndSetBarApproval();
        await yieldBox.setApprovalForAll(wethUsdoSingularity.address, true);
        await wethBigBangMarket.updateOperator(marketsHelper.address, true);
        await weth.approve(marketsHelper.address, wethMintVal);
        await wethUsdoSingularity.approve(
            marketsHelper.address,
            ethers.constants.MaxUint256,
        );

        await marketsHelper.mintAndLend(
            wethUsdoSingularity.address,
            wethBigBangMarket.address,
            wethMintVal,
            borrowAmount,
            true,
        );

        await usd0.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.depositAsset(
            usdoAssetId,
            deployer.address,
            deployer.address,
            borrowAmount,
            0,
        );
        const wethBalanceBefore = await weth.balanceOf(deployer.address);
        const fraction = await wethUsdoSingularity.balanceOf(deployer.address);
        const fractionAmount = await yieldBox.toAmount(
            usdoAssetId,
            fraction,
            false,
        );
        const totalBingBangCollateral =
            await wethBigBangMarket.userCollateralShare(deployer.address);

        await expect(
            marketsHelper.removeAssetAndRepay(
                wethUsdoSingularity.address,
                wethBigBangMarket.address,
                fraction,
                fraction,
                totalBingBangCollateral,
                true,
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('SGL: min limit');

        await marketsHelper.removeAssetAndRepay(
            wethUsdoSingularity.address,
            wethBigBangMarket.address,
            fraction.div(2),
            await yieldBox.toAmount(usdoAssetId, fraction.div(3), false),
            totalBingBangCollateral.div(5),
            true,
            ethers.utils.toUtf8Bytes(''),
        );
        const wethBalanceAfter = await weth.balanceOf(deployer.address);

        expect(wethBalanceBefore.eq(0)).to.be.true;
        expect(wethBalanceAfter.eq(wethMintVal.div(5))).to.be.true;
    });

    it('should remove asset, repay BingBang and remove collateral', async () => {
        const {
            weth,
            createWethUsd0Singularity,
            wethBigBangMarket,
            usd0,
            usdc,
            bar,
            wethAssetId,
            mediumRiskMC,
            deployCurveStableToUsdoBidder,
            initContracts,
            yieldBox,
            marketsHelper,
            deployer,
        } = await loadFixture(register);

        await initContracts();

        const usdoStratregy = await bar.emptyStrategies(usd0.address);
        const usdoAssetId = await yieldBox.ids(
            1,
            usd0.address,
            usdoStratregy,
            0,
        );
        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
            false,
        );
        const { wethUsdoSingularity } = await createWethUsd0Singularity(
            usd0,
            weth,
            bar,
            usdoAssetId,
            wethAssetId,
            mediumRiskMC,
            yieldBox,
            stableToUsdoBidder,
            ethers.utils.parseEther('1'),
            false,
        );

        const borrowAmount = ethers.BigNumber.from((1e18).toString()).mul(100);
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);

        await usd0.mint(deployer.address, borrowAmount.mul(2));
        // We get asset
        await weth.freeMint(wethMintVal);

        // Approve tokens
        // await approveTokensAndSetBarApproval();
        await yieldBox.setApprovalForAll(wethUsdoSingularity.address, true);
        await wethBigBangMarket.updateOperator(marketsHelper.address, true);
        await weth.approve(marketsHelper.address, wethMintVal);
        await wethUsdoSingularity.approve(
            marketsHelper.address,
            ethers.constants.MaxUint256,
        );

        await marketsHelper.mintAndLend(
            wethUsdoSingularity.address,
            wethBigBangMarket.address,
            wethMintVal,
            borrowAmount,
            true,
        );

        await usd0.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.depositAsset(
            usdoAssetId,
            deployer.address,
            deployer.address,
            borrowAmount,
            0,
        );
        const wethCollateralBefore =
            await wethBigBangMarket.userCollateralShare(deployer.address);
        const fraction = await wethUsdoSingularity.balanceOf(deployer.address);
        const fractionAmount = await yieldBox.toAmount(
            usdoAssetId,
            fraction,
            false,
        );
        const totalBingBangCollateral =
            await wethBigBangMarket.userCollateralShare(deployer.address);

        await marketsHelper.removeAssetAndRepay(
            wethUsdoSingularity.address,
            wethBigBangMarket.address,
            fraction.div(2),
            await yieldBox.toAmount(usdoAssetId, fraction.div(3), false),
            totalBingBangCollateral.div(5),
            false,
            ethers.utils.toUtf8Bytes(''),
        );
        const wethCollateralAfter = await wethBigBangMarket.userCollateralShare(
            deployer.address,
        );

        expect(wethCollateralAfter.lt(wethCollateralBefore)).to.be.true;

        const wethBalanceAfter = await weth.balanceOf(deployer.address);
        expect(wethBalanceAfter.eq(0)).to.be.true;
    });
});
