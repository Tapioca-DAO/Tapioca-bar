import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';

describe('Mixologist test', () => {
    it('Should deposit to yieldBox, add asset to mixologist, remove asset and withdraw', async () => {
        const { weth, yieldBox, wethUsdcMixologist, deployer, initContracts } =
            await register();

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
                false,
                mintValShare,
            )
        ).wait();

        // Remove asset from Mixologist
        await (
            await wethUsdcMixologist.removeAsset(deployer.address, mintValShare)
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
        } = await register();

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        // We get asset
        weth.freeMint(wethMintVal);
        usdc.connect(eoa1).freeMint(usdcMintVal);

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
            .borrow(eoa1.address, wethBorrowVal);
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
        } = await register();

        await initContracts(); // To prevent `Mixologist: below minimum`

        const lendVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const collateralVal = lendVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );
        const borrowVal = collateralVal
            .mul(50)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));
        weth.freeMint(lendVal);
        usdc.connect(eoa1).freeMint(collateralVal);

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
        await wethUsdcMixologist.connect(eoa1).borrow(eoa1.address, borrowVal);

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
            .repay(eoa1.address, false, userBorrowPart);

        expect(await wethUsdcMixologist.userBorrowPart(eoa1.address)).to.be.eq(
            BN(0),
        );
        // Withdraw collateral
        await (
            await wethUsdcMixologist
                .connect(eoa1)
                .removeCollateral(
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
            await wethUsdcMixologist.removeAsset(deployer.address, lendValShare)
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
        } = await register();

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal.mul(
            __wethUsdcPrice.div((1e18).toString()),
        );

        // We get asset
        weth.freeMint(wethMintVal);
        usdc.connect(eoa1).freeMint(usdcMintVal);

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
            .borrow(eoa1.address, wethBorrowVal);

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
            .repay(eoa1.address, false, userBorrowPart);

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
        } = await register();

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);

        // We get asset
        weth.freeMint(wethMintVal);

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
        ).to.be.revertedWith('Mx: flashloan insufficient funds');

        // Insufficient funds
        await expect(
            wethUsdcMixologist.flashLoan(
                maliciousOperator.address,
                maliciousOperator.address,
                wethMintVal,
                ethers.utils.hexlify(0),
            ),
        ).to.be.revertedWith('Mx: flashloan insufficient funds');

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

    it('should return ERC20 properties', async () => {
        const { wethUsdcMixologist } = await register();
        const name = await wethUsdcMixologist.name();
        const symbol = await wethUsdcMixologist.symbol();
        const decimals = await wethUsdcMixologist.decimals();
        const totalSupply = await wethUsdcMixologist.totalSupply();

        expect(symbol.toLowerCase()).eq('tmtt/weth-test');
        expect(decimals).to.eq(18);
        expect(totalSupply).to.eq(0);
    });

    it('should not allow initialization with bad arguments', async () => {
        const { bar, mediumRiskMC, yieldBox, wethUsdcOracle } =
            await register();

        const data = new ethers.utils.AbiCoder().encode(
            [
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
        const { wethUsdcMixologist, wethUsdcOracle } = await register();
        const amountForNothingBorrowed =
            await wethUsdcMixologist.computeAssetAmountToSolvency(
                ethers.constants.AddressZero,
                0,
            );
        expect(amountForNothingBorrowed.eq(0)).to.be.true;
    });

    it('should not update exchange rate', async () => {
        const { wethUsdcMixologist, wethUsdcOracle } = await register();
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
            eoa1,
            approveTokensAndSetBarApproval,
            deployer,
            wethUsdcMixologist,
        } = await register();

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = 1000;

        weth.freeMint(1000);
        await approveTokensAndSetBarApproval();
        await wethDepositAndAddAsset(wethMintVal);
        expect(
            await wethUsdcMixologist.balanceOf(deployer.address),
        ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));
        const share = await yieldBox.toShare(assetId, wethMintVal, false);

        await expect(
            wethUsdcMixologist.removeAsset(deployer.address, share),
        ).to.be.revertedWith('Mx: below minimum');
    });

    it('should set new swap paths', async () => {
        const {
            collateralSwapPath,
            tapSwapPath,
            wethUsdcMixologist,
            deployer,
            bar,
        } = await register();

        // function executeMixologistFn(address[] calldata mc, bytes[] memory data)

        const setCollateralInterface = new ethers.utils.Interface([
            'function setCollateralSwapPath(address[])',
        ]);
        const collateralSwapCalldata =
            setCollateralInterface.encodeFunctionData('setCollateralSwapPath', [
                collateralSwapPath,
            ]);
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [collateralSwapCalldata],
        );

        const setTapInterface = new ethers.utils.Interface([
            'function setTapSwapPath(address[])',
        ]);
        const tapSwapCalldata = setTapInterface.encodeFunctionData(
            'setTapSwapPath',
            [tapSwapPath],
        );
        await bar.executeMixologistFn(
            [wethUsdcMixologist.address],
            [tapSwapCalldata],
        );
    });

    it('deposit fees to yieldbox should not work for inexistent swapper', async () => {
        const { wethUsdcMixologist } = await register();

        await expect(
            wethUsdcMixologist.depositFeesToYieldBox(
                ethers.constants.AddressZero,
                { minAssetAmount: 1 },
            ),
        ).to.be.revertedWith('Mx: Invalid swapper');
    });

    it('should not be allowed to initialize twice', async () => {
        const { wethUsdcMixologist } = await register();

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
            multiSwapper,
            wethUsdcOracle,
            __wethUsdcPrice,
        } = await register();

        const assetId = await wethUsdcMixologist.assetId();
        const collateralId = await wethUsdcMixologist.collateralId();
        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdcMintVal = wethMintVal
            .mul(10)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        // We get asset
        weth.freeMint(wethMintVal);
        usdc.connect(eoa1).freeMint(usdcMintVal);

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
            .borrow(eoa1.address, firstBorrow);
        await wethUsdcMixologist.accrue();

        await wethUsdcMixologist
            .connect(eoa1)
            .borrow(eoa1.address, wethMintVal.sub(firstBorrow));

        await wethUsdcMixologist.accrue();
    });
});
