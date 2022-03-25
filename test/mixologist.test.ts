import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';

describe('Mixologist test', () => {
    it('Should deposit to bar, add asset to mixologist, remove asset and withdraw', async () => {
        const { weth, bar, wethUsdcMixologist, deployer, initContracts } = await register();

        await initContracts(); // To prevent `Mixologist: below minimum`

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        const balanceBefore = await weth.balanceOf(deployer.address);
        // Deposit assets to bar
        const mintValShare = await bar.toShare(await wethUsdcMixologist.assetId(), mintVal, false);
        await (await weth.approve(bar.address, mintVal)).wait();
        await (
            await bar['deposit(uint256,address,address,uint256,uint256)'](
                await wethUsdcMixologist.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();

        // Add asset to Mixologist
        await (await bar.setApprovalForAll(wethUsdcMixologist.address, true)).wait();
        await (await wethUsdcMixologist.addAsset(deployer.address, false, mintValShare)).wait();

        // Remove asset from Mixologist
        await (await wethUsdcMixologist.removeAsset(deployer.address, mintValShare)).wait();

        // Withdraw from bar
        await (
            await bar['withdraw(uint256,address,address,uint256,uint256,bool)'](
                await wethUsdcMixologist.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
                false,
            )
        ).wait();

        // Check the value of the asset
        const balanceAfter = await weth.balanceOf(deployer.address);
        expect(balanceAfter).to.equal(balanceBefore);
    });

    it('Should lend Weth, deposit Usdc collateral and borrow Weth and be liquidated for price drop', async () => {
        const {
            usdc,
            weth,
            bar,
            wethDepositAndAddAsset,
            usdcDepositAndAddCollateral,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcMixologist,
            multiSwapper,
            wethUsdcOracle,
            __wethUsdcPrice,
        } = await register();

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        weth.freeMint(wethMintVal);
        usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(await wethUsdcMixologist.balanceOf(deployer.address)).to.be.equal(await bar.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(await wethUsdcMixologist.userCollateralShare(eoa1.address)).equal(await bar.toShare(collateralId, usdcMintVal, false));

        // We borrow 74% collateral, max is 75%
        const wethBorrowVal = usdcMintVal.mul(74).div(100).div(__wethUsdcPrice.div((1e18).toString()));

        await wethUsdcMixologist.connect(eoa1).borrow(eoa1.address, wethBorrowVal);
        await bar
            .connect(eoa1)
            ['withdraw(uint256,address,address,uint256,uint256,bool)'](assetId, eoa1.address, eoa1.address, wethBorrowVal, 0, false);

        // Can't liquidate
        await expect(wethUsdcMixologist.liquidate([eoa1.address], [wethBorrowVal], multiSwapper.address)).to.be.reverted;

        // Can be liquidated price drop (USDC/WETH)
        const priceDrop = __wethUsdcPrice.mul(2).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

        await expect(wethUsdcMixologist.liquidate([eoa1.address], [wethBorrowVal], multiSwapper.address)).to.not.be.reverted;
    });

    it('Should accumulate fees for lender', async () => {
        const {
            usdc,
            weth,
            bar,
            eoa1,
            wethUsdcMixologist,
            deployer,
            initContracts,
            approveTokensAndSetBarApproval,
            usdcDepositAndAddCollateral,
            mixologistHelper,
            BN,
            __wethUsdcPrice,
        } = await register();

        await initContracts(); // To prevent `Mixologist: below minimum`

        const lendVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const collateralVal = lendVal.mul(__wethUsdcPrice.div((1e18).toString()));
        const borrowVal = collateralVal.mul(50).div(100).div(__wethUsdcPrice.div((1e18).toString()));
        weth.freeMint(lendVal);
        usdc.connect(eoa1).freeMint(collateralVal);

        /**
         * LEND
         */
        const balanceBefore = await weth.balanceOf(deployer.address);
        // Deposit assets to bar
        const lendValShare = await bar.toShare(await wethUsdcMixologist.assetId(), lendVal, false);
        await (await weth.approve(bar.address, lendVal)).wait();
        await (
            await bar['deposit(uint256,address,address,uint256,uint256)'](
                await wethUsdcMixologist.assetId(),
                deployer.address,
                deployer.address,
                0,
                lendValShare,
            )
        ).wait();

        // Add asset to Mixologist
        await (await bar.setApprovalForAll(wethUsdcMixologist.address, true)).wait();
        await (await wethUsdcMixologist.addAsset(deployer.address, false, lendValShare)).wait();

        /**
         * BORROW
         */
        const collateralId = await wethUsdcMixologist.collateralId();

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(collateralVal, eoa1);
        expect(await wethUsdcMixologist.userCollateralShare(eoa1.address)).equal(await bar.toShare(collateralId, collateralVal, false));

        // We borrow
        await wethUsdcMixologist.connect(eoa1).borrow(eoa1.address, borrowVal);

        // Validate fees
        const userBorrowPart = await wethUsdcMixologist.userBorrowPart(eoa1.address);
        const minCollateralShareRepay = await mixologistHelper.getCollateralSharesForBorrowPart(
            wethUsdcMixologist.address,
            borrowVal.mul(50).div(100000).add(borrowVal),
        );
        const userCollateralShareToRepay = await mixologistHelper.getCollateralSharesForBorrowPart(
            wethUsdcMixologist.address,
            userBorrowPart,
        );

        expect(userCollateralShareToRepay).to.be.eq(minCollateralShareRepay);

        // Repay borrow
        const assetId = await wethUsdcMixologist.assetId();

        await weth.connect(eoa1).freeMint(userBorrowPart);
        await bar.connect(eoa1)['deposit(uint256,address,address,uint256,uint256)'](assetId, eoa1.address, eoa1.address, userBorrowPart, 0);
        await wethUsdcMixologist.connect(eoa1).repay(eoa1.address, false, userBorrowPart);

        expect(await wethUsdcMixologist.userBorrowPart(eoa1.address)).to.be.eq(BN(0));

        // Withdraw collateral
        await (await wethUsdcMixologist.removeAsset(deployer.address, lendValShare)).wait();

        // Withdraw from bar
        await (
            await bar['withdraw(uint256,address,address,uint256,uint256,bool)'](
                assetId,
                deployer.address,
                deployer.address,
                0,
                await bar.balanceOf(deployer.address, assetId),
                false,
            )
        ).wait();

        // Check that the lender has an increased amount
        const balanceAfter = await weth.balanceOf(deployer.address);
        expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });

    it('Should accumulate fees and harvest them as $Tap to feeVeTap', async () => {
        const {
            usdc,
            weth,
            bar,
            eoa1,
            wethUsdcMixologist,
            deployer,
            approveTokensAndSetBarApproval,
            usdcDepositAndAddCollateral,
            jumpTime,
            wethDepositAndAddAsset,
            multiSwapper,
            mixologistFeeVeTap,
            mixologistHelper,
            __wethUsdcPrice,
        } = await register();

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        weth.freeMint(wethMintVal);
        usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(await wethUsdcMixologist.balanceOf(deployer.address)).to.be.equal(await bar.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(await wethUsdcMixologist.userCollateralShare(eoa1.address)).equal(await bar.toShare(collateralId, usdcMintVal, false));

        // We borrow 74% collateral, max is 75%
        const wethBorrowVal = usdcMintVal.mul(74).div(100).div(__wethUsdcPrice.div((1e18).toString()));
        await wethUsdcMixologist.connect(eoa1).borrow(eoa1.address, wethBorrowVal);

        // We jump time to accumulate fees
        const day = 86400;
        await jumpTime(180 * day);

        // Repay
        const userBorrowPart = await wethUsdcMixologist.userBorrowPart(eoa1.address);
        await weth.connect(eoa1).freeMint(userBorrowPart);
        await bar.connect(eoa1)['deposit(uint256,address,address,uint256,uint256)'](assetId, eoa1.address, eoa1.address, userBorrowPart, 0);
        await wethUsdcMixologist.connect(eoa1).repay(eoa1.address, false, userBorrowPart);

        const feesAmountInAsset = await mixologistHelper.getAmountForAssetFraction(
            wethUsdcMixologist.address,
            (
                await wethUsdcMixologist.accrueInfo()
            ).feesEarnedFraction,
        );

        // Confirm fees accumulation
        expect(userBorrowPart.gt(wethBorrowVal));
        // Withdraw fees from BeachBar
        await expect(bar.withdrawAllProtocolFees([multiSwapper.address])).to.emit(wethUsdcMixologist, 'LogBeachBarFeesDeposit');

        const tapAmountHarvested = await bar.toAmount(
            await bar.tapAssetId(),
            await bar.balanceOf(mixologistFeeVeTap.address, await bar.tapAssetId()),
            false,
        );
        // 0.31%
        const acceptableHarvestMargin = feesAmountInAsset.sub(feesAmountInAsset.mul(31).div(10000));
        expect(tapAmountHarvested.gte(acceptableHarvestMargin)).to.be.true;
    });
});
