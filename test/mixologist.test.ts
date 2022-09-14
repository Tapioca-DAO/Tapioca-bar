import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('Mixologist test', () => {
    it('should add addset, remove asset and update exchange rate in a single tx', async () => {
        const { weth, yieldBox, wethUsdcMixologist, deployer, initContracts } =
            await loadFixture(register);

        await initContracts(); // To prevent `Mixologist: below minimum`

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        const balanceBefore = await weth.balanceOf(deployer.address);
        // Deposit assets to bar
        const mintValShare = await yieldBox.toShare(
            await wethUsdcMixologist.assetId(),
            mintVal,
            false,
        );
        await (await weth.approve(yieldBox.address, mintVal)).wait();
        await (
            await yieldBox.depositAsset(
                await wethUsdcMixologist.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();

        await (
            await yieldBox.setApprovalForAll(wethUsdcMixologist.address, true)
        ).wait();

        let addAssetFn = wethUsdcMixologist.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        const removeAssetFn = wethUsdcMixologist.interface.encodeFunctionData(
            'removeAsset',
            [deployer.address, deployer.address, mintValShare],
        );

        const updateExchangeRateFn =
            wethUsdcMixologist.interface.encodeFunctionData(
                'updateExchangeRate',
            );

        await (
            await wethUsdcMixologist.execute(
                [addAssetFn, removeAssetFn, updateExchangeRateFn],
                true,
            )
        ).wait();

        addAssetFn = wethUsdcMixologist.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, true, mintValShare],
        );

        await expect(
            wethUsdcMixologist.execute(
                [addAssetFn, removeAssetFn, updateExchangeRateFn],
                true,
            ),
        ).to.be.revertedWith('Mx: too much');

        // Withdraw from bar
        await (
            await yieldBox.withdraw(
                await wethUsdcMixologist.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();

        // Check the value of the asset
        const balanceAfter = await weth.balanceOf(deployer.address);
        expect(balanceAfter).to.equal(balanceBefore);
    });

    it('Should deposit Usdc collateral and borrow Weth in a single tx without lenders but revert with the right error code', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            eoa1,
            approveTokensAndSetBarApproval,
            wethUsdcMixologist,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        const usdcMintValShare = await yieldBox.toShare(
            collateralId,
            usdcMintVal,
            false,
        );
        await (
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    collateralId,
                    eoa1.address,
                    eoa1.address,
                    usdcMintVal,
                    0,
                )
        ).wait();

        const addCollateralFn = wethUsdcMixologist.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        const borrowFn = wethUsdcMixologist.interface.encodeFunctionData(
            'borrow',
            [eoa1.address, eoa1.address, wethBorrowVal],
        );

        await expect(
            wethUsdcMixologist
                .connect(eoa1)
                .execute([addCollateralFn, borrowFn], true),
        ).to.be.revertedWith('Mx: min limit');
    });

    it('Should deposit Usdc collateral and borrow Weth in a single tx without lenders and decode the error codes', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            eoa1,
            approveTokensAndSetBarApproval,
            wethUsdcMixologist,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        const usdcMintValShare = await yieldBox.toShare(
            collateralId,
            usdcMintVal,
            false,
        );
        await (
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    collateralId,
                    eoa1.address,
                    eoa1.address,
                    usdcMintVal,
                    0,
                )
        ).wait();

        const addCollateralFn = wethUsdcMixologist.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        const borrowFn = wethUsdcMixologist.interface.encodeFunctionData(
            'borrow',
            [eoa1.address, eoa1.address, wethBorrowVal],
        );

        const data = await wethUsdcMixologist
            .connect(eoa1)
            .callStatic.execute([addCollateralFn, borrowFn], false);

        expect(data.successes[0]).to.be.true;
        expect(data.successes[1]).to.be.false; //can't borrow as there are no lenders

        expect(data.results[0]).to.eq('Mx: no return data');
        expect(data.results[1]).to.eq('Mx: min limit');

        await expect(
            wethUsdcMixologist
                .connect(eoa1)
                .execute([addCollateralFn, borrowFn], false),
        ).not.to.be.reverted;
    });

    it('Should lend Weth, deposit Usdc collateral and borrow Weth in a single tx', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcMixologist,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        const wethMintValShare = await yieldBox.toShare(
            assetId,
            wethMintVal,
            false,
        );
        await (
            await yieldBox.depositAsset(
                assetId,
                deployer.address,
                deployer.address,
                0,
                wethMintValShare,
            )
        ).wait();

        const addAssetFn = wethUsdcMixologist.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, wethMintValShare],
        );
        await (await wethUsdcMixologist.execute([addAssetFn], true)).wait();
        expect(
            await wethUsdcMixologist.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        const usdcMintValShare = await yieldBox.toShare(
            collateralId,
            usdcMintVal,
            false,
        );
        await (
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    collateralId,
                    eoa1.address,
                    eoa1.address,
                    usdcMintVal,
                    0,
                )
        ).wait();

        const addCollateralFn = wethUsdcMixologist.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        const borrowFn = wethUsdcMixologist.interface.encodeFunctionData(
            'borrow',
            [eoa1.address, eoa1.address, wethBorrowVal],
        );

        await (
            await wethUsdcMixologist
                .connect(eoa1)
                .execute([addCollateralFn, borrowFn], true)
        ).wait();

        expect(
            await wethUsdcMixologist.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));
    });

    it('Should deposit to yieldBox, add asset to mixologist, remove asset and withdraw', async () => {
        const { weth, yieldBox, wethUsdcMixologist, deployer, initContracts } =
            await loadFixture(register);

        await initContracts(); // To prevent `Mixologist: below minimum`

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        const balanceBefore = await weth.balanceOf(deployer.address);
        // Deposit assets to bar
        const mintValShare = await yieldBox.toShare(
            await wethUsdcMixologist.assetId(),
            mintVal,
            false,
        );
        await (await weth.approve(yieldBox.address, mintVal)).wait();
        await (
            await yieldBox.depositAsset(
                await wethUsdcMixologist.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();

        // Add asset to Mixologist
        await (
            await yieldBox.setApprovalForAll(wethUsdcMixologist.address, true)
        ).wait();
        await (
            await wethUsdcMixologist.addAsset(
                deployer.address,
                deployer.address,
                false,
                mintValShare,
            )
        ).wait();

        // Remove asset from Mixologist
        await (
            await wethUsdcMixologist.removeAsset(
                deployer.address,
                deployer.address,
                mintValShare,
            )
        ).wait();

        // Withdraw from bar
        await (
            await yieldBox.withdraw(
                await wethUsdcMixologist.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();

        // Check the value of the asset
        const balanceAfter = await weth.balanceOf(deployer.address);
        expect(balanceAfter).to.equal(balanceBefore);
    });

    it('should not be able to borrow when cap is reached', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            wethDepositAndAddAsset,
            usdcDepositAndAddCollateral,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcMixologist,
            bar,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcMixologist.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(
            await wethUsdcMixologist.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        let borrowCapData = wethUsdcMixologist.interface.encodeFunctionData(
            'setBorrowCap',
            [wethBorrowVal.div(2)],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [borrowCapData],
        );
        const savedBorrowCap = await wethUsdcMixologist.totalBorrowCap();
        expect(savedBorrowCap.eq(wethBorrowVal.div(2))).to.be.true;

        await expect(
            wethUsdcMixologist
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, wethBorrowVal),
        ).to.be.revertedWith('Mx: borrow cap reached');

        borrowCapData = wethUsdcMixologist.interface.encodeFunctionData(
            'setBorrowCap',
            [0],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [borrowCapData],
        );

        await expect(
            wethUsdcMixologist
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, wethBorrowVal),
        ).to.not.be.reverted;
    });

    it('Should lend Weth, deposit Usdc collateral and borrow Weth and be liquidated for price drop', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            wethDepositAndAddAsset,
            usdcDepositAndAddCollateral,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcMixologist,
            multiSwapper,
            wethUsdcOracle,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcMixologist.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(
            await wethUsdcMixologist.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        // We borrow 74% collateral, max is 75%
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        await wethUsdcMixologist
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, wethBorrowVal);
        await yieldBox
            .connect(eoa1)
            .withdraw(assetId, eoa1.address, eoa1.address, wethBorrowVal, 0);

        const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);

        // Can't liquidate
        await expect(
            wethUsdcMixologist.liquidate(
                [eoa1.address],
                [wethBorrowVal],
                multiSwapper.address,
                data,
                data,
            ),
        ).to.be.reverted;

        // Can be liquidated price drop (USDC/WETH)
        const priceDrop = __wethUsdcPrice.mul(2).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

        await expect(
            wethUsdcMixologist.liquidate(
                [eoa1.address],
                [wethBorrowVal],
                multiSwapper.address,
                data,
                data,
            ),
        ).to.not.be.reverted;
    });

    it('Should accumulate fees for lender', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            eoa1,
            wethUsdcMixologist,
            deployer,
            initContracts,
            approveTokensAndSetBarApproval,
            usdcDepositAndAddCollateral,
            mixologistHelper,
            BN,
            __wethUsdcPrice,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Mixologist: below minimum`

        const lendVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const collateralVal = lendVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const borrowVal = collateralVal
            .mul(50)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));
        await weth.freeMint(lendVal);
        await usdc.connect(eoa1).freeMint(collateralVal);

        /**
         * LEND
         */
        const balanceBefore = await weth.balanceOf(deployer.address);
        // Deposit assets to bar
        const lendValShare = await yieldBox.toShare(
            await wethUsdcMixologist.assetId(),
            lendVal,
            false,
        );
        await (await weth.approve(yieldBox.address, lendVal)).wait();
        await (
            await yieldBox.depositAsset(
                await wethUsdcMixologist.assetId(),
                deployer.address,
                deployer.address,
                0,
                lendValShare,
            )
        ).wait();

        // Add asset to Mixologist
        await (
            await yieldBox.setApprovalForAll(wethUsdcMixologist.address, true)
        ).wait();
        await (
            await wethUsdcMixologist.addAsset(
                deployer.address,
                deployer.address,
                false,
                lendValShare,
            )
        ).wait();

        /**
         * BORROW
         */
        const collateralId = await wethUsdcMixologist.collateralId();

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(collateralVal, eoa1);
        expect(
            await wethUsdcMixologist.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, collateralVal, false));

        // We borrow
        await wethUsdcMixologist
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, borrowVal);

        // Validate fees
        const userBorrowPart = await wethUsdcMixologist.userBorrowPart(
            eoa1.address,
        );
        const minCollateralShareRepay =
            await mixologistHelper.getCollateralSharesForBorrowPart(
                wethUsdcMixologist.address,
                borrowVal.mul(50).div(100000).add(borrowVal),
            );
        const userCollateralShareToRepay =
            await mixologistHelper.getCollateralSharesForBorrowPart(
                wethUsdcMixologist.address,
                userBorrowPart,
            );

        expect(userCollateralShareToRepay).to.be.eq(minCollateralShareRepay);

        // Repay borrow
        const assetId = await wethUsdcMixologist.assetId();

        await weth.connect(eoa1).freeMint(userBorrowPart);

        await yieldBox
            .connect(eoa1)
            .depositAsset(
                assetId,
                eoa1.address,
                eoa1.address,
                userBorrowPart,
                0,
            );
        await wethUsdcMixologist
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, false, userBorrowPart);

        expect(await wethUsdcMixologist.userBorrowPart(eoa1.address)).to.be.eq(
            BN(0),
        );
        // Withdraw collateral
        await (
            await wethUsdcMixologist
                .connect(eoa1)
                .removeCollateral(
                    eoa1.address,
                    eoa1.address,
                    await wethUsdcMixologist.userCollateralShare(eoa1.address),
                )
        ).wait();

        await (
            await yieldBox
                .connect(eoa1)
                .withdraw(
                    collateralId,
                    eoa1.address,
                    eoa1.address,
                    0,
                    await yieldBox.balanceOf(eoa1.address, collateralId),
                )
        ).wait();

        // Withdraw assets
        await (
            await wethUsdcMixologist.removeAsset(
                deployer.address,
                deployer.address,
                lendValShare,
            )
        ).wait();

        await (
            await yieldBox.withdraw(
                assetId,
                deployer.address,
                deployer.address,
                0,
                await yieldBox.balanceOf(deployer.address, assetId),
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
            yieldBox,
            eoa1,
            wethUsdcMixologist,
            deployer,
            approveTokensAndSetBarApproval,
            usdcDepositAndAddCollateral,
            wethDepositAndAddAsset,
            multiSwapper,
            mixologistFeeVeTap,
            mixologistHelper,
            __wethUsdcPrice,
            timeTravel,
        } = await loadFixture(register);

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcMixologist.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(
            await wethUsdcMixologist.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        // We borrow 74% collateral, max is 75%
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));
        await wethUsdcMixologist
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, wethBorrowVal);

        // We jump time to accumulate fees
        const day = 86400;
        await timeTravel(180 * day);

        // Repay
        const userBorrowPart = await wethUsdcMixologist.userBorrowPart(
            eoa1.address,
        );
        await weth.connect(eoa1).freeMint(userBorrowPart);

        await yieldBox
            .connect(eoa1)
            .depositAsset(
                assetId,
                eoa1.address,
                eoa1.address,
                userBorrowPart,
                0,
            );
        await wethUsdcMixologist
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, false, userBorrowPart);

        const feesAmountInAsset =
            await mixologistHelper.getAmountForAssetFraction(
                wethUsdcMixologist.address,
                (
                    await wethUsdcMixologist.accrueInfo()
                ).feesEarnedFraction,
            );

        // Confirm fees accumulation
        expect(userBorrowPart.gt(wethBorrowVal));
        // Withdraw fees from BeachBar
        await expect(
            bar.withdrawAllProtocolFees(
                [multiSwapper.address],
                [{ minAssetAmount: 1 }],
            ),
        ).to.emit(wethUsdcMixologist, 'LogYieldBoxFeesDeposit');

        const tapAmountHarvested = await yieldBox.toAmount(
            await bar.tapAssetId(),
            await yieldBox.balanceOf(
                mixologistFeeVeTap.address,
                await bar.tapAssetId(),
            ),
            false,
        );
        // 0.31%
        const acceptableHarvestMargin = feesAmountInAsset.sub(
            feesAmountInAsset.mul(31).div(10000),
        );
        expect(tapAmountHarvested.gte(acceptableHarvestMargin)).to.be.true;
    });

    it('Should make a flashloan', async () => {
        const {
            weth,
            wethUsdcMixologist,
            approveTokensAndSetBarApproval,
            wethDepositAndAddAsset,
        } = await loadFixture(register);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);

        // We get asset
        await weth.freeMint(wethMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);

        // We deploy flashloan operator contracts
        const maliciousOperator = await (
            await ethers.getContractFactory('FlashLoanMockAttacker')
        ).deploy();
        const operator = await (
            await ethers.getContractFactory('FlashLoanMockSuccess')
        ).deploy();

        // Malicious operator
        await expect(
            wethUsdcMixologist.flashLoan(
                maliciousOperator.address,
                maliciousOperator.address,
                wethMintVal,
                ethers.utils.hexlify(0),
            ),
        ).to.be.revertedWith('Mx: insufficient funds');

        // Insufficient funds
        await expect(
            wethUsdcMixologist.flashLoan(
                maliciousOperator.address,
                maliciousOperator.address,
                wethMintVal,
                ethers.utils.hexlify(0),
            ),
        ).to.be.revertedWith('Mx: insufficient funds');

        await weth.freeMint(wethMintVal.mul(90).div(100_000)); // 0.09% fee
        await weth.transfer(operator.address, wethMintVal.mul(90).div(100_000));
        await expect(
            wethUsdcMixologist.flashLoan(
                operator.address,
                operator.address,
                wethMintVal,
                ethers.utils.hexlify(0),
            ),
        ).to.emit(wethUsdcMixologist, 'LogFlashLoan');
    });

    it('Should try to add asset to mixologist on behalf of another user and fail, then pass after approval', async () => {
        const {
            weth,
            yieldBox,
            wethUsdcMixologist,
            deployer,
            initContracts,
            eoa1,
        } = await loadFixture(register);

        await initContracts(); // To prevent `Mixologist: below minimum`

        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);

        // Mint WETH for both accounts
        await weth.freeMint(mintVal);
        await weth.connect(eoa1).freeMint(mintVal);

        // Deposit assets to bar
        const mintValShare = await yieldBox.toShare(
            await wethUsdcMixologist.assetId(),
            mintVal,
            false,
        );
        await (await weth.approve(yieldBox.address, mintVal)).wait();
        await (
            await weth.connect(eoa1).approve(yieldBox.address, mintVal)
        ).wait();

        await (
            await yieldBox.depositAsset(
                await wethUsdcMixologist.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            )
        ).wait();

        await (
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    await wethUsdcMixologist.assetId(),
                    eoa1.address,
                    eoa1.address,
                    0,
                    mintValShare,
                )
        ).wait();

        // Approve Mixologist in yieldBox
        await (
            await yieldBox.setApprovalForAll(wethUsdcMixologist.address, true)
        ).wait();
        await (
            await yieldBox
                .connect(eoa1)
                .setApprovalForAll(wethUsdcMixologist.address, true)
        ).wait();

        // Add asset from eoa1 to deployer without approval
        await expect(
            wethUsdcMixologist.addAsset(
                eoa1.address,
                deployer.address,
                false,
                mintValShare,
            ),
        ).to.be.revertedWithCustomError(wethUsdcMixologist, 'NotApproved');

        // Approve deployer as operator in Mixologist
        await expect(
            await wethUsdcMixologist
                .connect(eoa1)
                .setApprovalForAll(deployer.address, true),
        ).to.emit(wethUsdcMixologist, 'LogApprovalForAll');

        // Add asset from eoa1 to deployer with approval
        await (
            await wethUsdcMixologist.addAsset(
                eoa1.address,
                deployer.address,
                false,
                mintValShare,
            )
        ).wait();
    });

    it('should return ERC20 properties', async () => {
        const { wethUsdcMixologist } = await loadFixture(register);
        const symbol = await wethUsdcMixologist.symbol();
        const decimals = await wethUsdcMixologist.decimals();
        const totalSupply = await wethUsdcMixologist.totalSupply();

        expect(symbol.toLowerCase()).eq('tmtt/weth-test');
        expect(decimals).to.eq(18);
        expect(totalSupply).to.eq(0);
    });

    it('should not allow initialization with bad arguments', async () => {
        const {
            bar,
            mediumRiskMC,
            wethUsdcOracle,
            _mxLendingBorrowingModule,
            _mxLiquidationModule,
        } = await loadFixture(register);

        const data = new ethers.utils.AbiCoder().encode(
            [
                'address',
                'address',
                'address',
                'address',
                'uint256',
                'address',
                'uint256',
                'address',
                'address[]',
                'address[]',
            ],
            [
                _mxLiquidationModule.address,
                _mxLendingBorrowingModule.address,
                bar.address,
                ethers.constants.AddressZero,
                0,
                ethers.constants.AddressZero,
                0,
                wethUsdcOracle.address,
                [],
                [],
            ],
        );

        await expect(
            bar.registerMixologist(mediumRiskMC.address, data, true),
        ).to.be.revertedWith('Mx: bad pair');
    });

    it('should compute amount to solvency for nothing borrowed', async () => {
        const { wethUsdcMixologist } = await loadFixture(register);
        const amountForNothingBorrowed =
            await wethUsdcMixologist.computeAssetAmountToSolvency(
                ethers.constants.AddressZero,
                0,
            );
        expect(amountForNothingBorrowed.eq(0)).to.be.true;
    });

    it('should not update exchange rate', async () => {
        const { wethUsdcMixologist, wethUsdcOracle } = await loadFixture(
            register,
        );
        await wethUsdcOracle.setSuccess(false);

        await wethUsdcOracle.set(100);

        const previousExchangeRate = await wethUsdcMixologist.exchangeRate();
        await wethUsdcMixologist.updateExchangeRate();
        let currentExchangeRate = await wethUsdcMixologist.exchangeRate();

        expect(previousExchangeRate.eq(currentExchangeRate)).to.be.true;

        await wethUsdcOracle.setSuccess(true);
        await wethUsdcMixologist.updateExchangeRate();
        currentExchangeRate = await wethUsdcMixologist.exchangeRate();
        expect(currentExchangeRate.eq(100)).to.be.true;
    });

    it('removing everything should not be allowed', async () => {
        const {
            weth,
            yieldBox,
            wethDepositAndAddAsset,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcMixologist,
        } = await loadFixture(register);

        const assetId = await wethUsdcMixologist.assetId();
        const wethMintVal = 1000;

        await weth.freeMint(1000);
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcMixologist.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));
        const share = await yieldBox.toShare(assetId, wethMintVal, false);

        await expect(
            wethUsdcMixologist.removeAsset(
                deployer.address,
                deployer.address,
                share,
            ),
        ).to.be.revertedWith('Mx: min limit');
    });

    it('should set new swap paths', async () => {
        const { collateralSwapPath, tapSwapPath, wethUsdcMixologist, bar } =
            await loadFixture(register);

        const collateralSwapCalldata =
            wethUsdcMixologist.interface.encodeFunctionData(
                'setCollateralSwapPath',
                [collateralSwapPath],
            );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [collateralSwapCalldata],
        );

        const tapSwapCalldata = wethUsdcMixologist.interface.encodeFunctionData(
            'setTapSwapPath',
            [tapSwapPath],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [tapSwapCalldata],
        );
    });

    it('deposit fees to yieldbox should not work for inexistent swapper', async () => {
        const { wethUsdcMixologist } = await loadFixture(register);

        await expect(
            wethUsdcMixologist.depositFeesToYieldBox(
                ethers.constants.AddressZero,
                { minAssetAmount: 1 },
            ),
        ).to.be.revertedWith('Mx: Invalid swapper');
    });

    it('should not be allowed to initialize twice', async () => {
        const { wethUsdcMixologist } = await loadFixture(register);

        await expect(
            wethUsdcMixologist.init(ethers.utils.toUtf8Bytes('')),
        ).to.be.revertedWith('Mx: initialized');
        await wethUsdcMixologist.accrue();
        await wethUsdcMixologist.accrue();
    });

    it('should accrue when utilization is over & under target', async () => {
        const {
            usdc,
            weth,
            yieldBox,
            wethDepositAndAddAsset,
            usdcDepositAndAddCollateral,
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcMixologist,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        await weth.freeMint(wethMintVal);
        await usdc.connect(eoa1).freeMint(usdcMintVal);

        // We approve external operators
        await approveTokensAndSetBarApproval();
        await approveTokensAndSetBarApproval(eoa1);

        // We lend WETH as deployer
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcMixologist.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

        // We deposit USDC collateral
        await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
        expect(
            await wethUsdcMixologist.userCollateralShare(eoa1.address),
        ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

        const firstBorrow = ethers.BigNumber.from((1e17).toString());
        await wethUsdcMixologist
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, firstBorrow);
        await wethUsdcMixologist.accrue();

        await wethUsdcMixologist
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, wethMintVal.sub(firstBorrow));

        await wethUsdcMixologist.accrue();
    });

    it('should not execute when module does not exist', async () => {
        //register a mixologist without lending module
        const {
            usdc,
            weth,
            bar,
            yieldBox,
            wethAssetId,
            usdcAssetId,
            wethUsdcOracle,
            collateralSwapPath,
            tapSwapPath,
            mediumRiskMC,
            deployer,
        } = await loadFixture(register);
        const data = new ethers.utils.AbiCoder().encode(
            [
                'address',
                'address',
                'address',
                'address',
                'uint256',
                'address',
                'uint256',
                'address',
                'address[]',
                'address[]',
            ],
            [
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                bar.address,
                weth.address,
                wethAssetId,
                usdc.address,
                usdcAssetId,
                wethUsdcOracle.address,
                collateralSwapPath,
                tapSwapPath,
            ],
        );
        await (
            await bar.registerMixologist(mediumRiskMC.address, data, true)
        ).wait();
        const wethUsdcMixologist = await ethers.getContractAt(
            'Mixologist',
            await yieldBox.clonesOf(
                mediumRiskMC.address,
                (await yieldBox.clonesOfCount(mediumRiskMC.address)).sub(1),
            ),
        );

        expect(wethUsdcMixologist.address).to.not.eq(
            ethers.constants.AddressZero,
        );

        await expect(
            wethUsdcMixologist
                .connect(deployer)
                .borrow(deployer.address, deployer.address, 1),
        ).to.be.revertedWith('Mx: module not set');

        await expect(
            wethUsdcMixologist
                .connect(deployer)
                .computeAssetAmountToSolvency(deployer.address, 1),
        ).to.be.revertedWith('Mx: module not set');
    });
});
