import hre, { ethers, network } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';

describe('BingBang test', () => {
    it('should test initial values', async () => {
        const { wethBingBangMarket, usd0, bar, weth, wethAssetId } =
            await loadFixture(register);

        const savedAssetId = await wethBingBangMarket.assetId();
        const penroseUsd0Id = await bar.usdoAssetId();
        expect(savedAssetId.eq(penroseUsd0Id)).to.be.true;

        const savedAsset = await wethBingBangMarket.asset();
        const barUsd0 = await bar.usdoToken();
        expect(barUsd0.toLowerCase()).eq(savedAsset.toLowerCase());

        const savedCollateralId = await wethBingBangMarket.collateralId();
        expect(savedCollateralId.eq(wethAssetId)).to.be.true;

        const savedCollateral = await wethBingBangMarket.collateral();
        expect(weth.address.toLowerCase()).eq(savedCollateral.toLowerCase());

        const borrowingFee = await wethBingBangMarket.borrowingFee();
        expect(borrowingFee.eq(0)).to.be.true;
    });

    it('should add collateral', async () => {
        const {
            wethBingBangMarket,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            eoa1,
        } = await loadFixture(register);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        await yieldBox.depositAsset(
            wethAssetId,
            deployer.address,
            deployer.address,
            0,
            valShare,
        );
        await expect(
            wethBingBangMarket
                .connect(eoa1)
                .addCollateral(
                    deployer.address,
                    deployer.address,
                    false,
                    valShare,
                ),
        ).to.be.reverted;
        await wethBingBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        let collateralShares = await wethBingBangMarket.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.gt(0)).to.be.true;
        expect(collateralShares.eq(valShare)).to.be.true;

        await wethBingBangMarket.removeCollateral(
            deployer.address,
            deployer.address,
            collateralShares,
        );

        collateralShares = await wethBingBangMarket.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.eq(0)).to.be.true;
    });

    it('should borrow and repay', async () => {
        const {
            wethBingBangMarket,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            bar,
            usd0,
            __wethUsdcPrice,
            timeTravel,
        } = await loadFixture(register);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        await yieldBox.depositAsset(
            wethAssetId,
            deployer.address,
            deployer.address,
            0,
            valShare,
        );
        await wethBingBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await wethBingBangMarket.borrow(
            deployer.address,
            deployer.address,
            usdoBorrowVal,
        );

        let userBorrowPart = await wethBingBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.gt(0)).to.be.true;

        const usd0Balance = await yieldBox.toAmount(
            await bar.usdoAssetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethBingBangMarket.assetId(),
            ),
            false,
        );
        expect(usd0Balance.gt(0)).to.be.true;
        expect(usd0Balance.eq(usdoBorrowVal)).to.be.true;

        timeTravel(10 * 86400);

        //repay
        userBorrowPart = await wethBingBangMarket.userBorrowPart(
            deployer.address,
        );
        await expect(
            wethBingBangMarket.repay(
                deployer.address,
                deployer.address,
                userBorrowPart,
            ),
        ).to.be.reverted;

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(500);
        await usd0.mint(deployer.address, usd0Extra);
        await usd0.approve(yieldBox.address, usd0Extra);
        await yieldBox.depositAsset(
            await wethBingBangMarket.assetId(),
            deployer.address,
            deployer.address,
            usd0Extra,
            0,
        );
        await wethBingBangMarket.repay(
            deployer.address,
            deployer.address,
            userBorrowPart,
        );
        userBorrowPart = await wethBingBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.eq(0)).to.be.true;
    });

    it('should liquidate', async () => {
        const {
            wethBingBangMarket,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            eoa1,
            __wethUsdcPrice,
            __usd0WethPrice,
            multiSwapper,
            usd0WethOracle,
        } = await loadFixture(register);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.connect(eoa1).freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        await yieldBox
            .connect(eoa1)
            .depositAsset(wethAssetId, eoa1.address, eoa1.address, 0, valShare);
        await wethBingBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await wethBingBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        // Can't liquidate
        const swapData = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        await expect(
            wethBingBangMarket.liquidate(
                [eoa1.address],
                [usdoBorrowVal],
                multiSwapper.address,
                swapData,
            ),
        ).to.be.reverted;

        const priceDrop = __usd0WethPrice.mul(15).div(10).div(100);
        await usd0WethOracle.set(__usd0WethPrice.add(priceDrop));

        const userCollateralShareBefore =
            await wethBingBangMarket.userCollateralShare(eoa1.address);

        const liquidatorAmountBefore = await yieldBox.toAmount(
            await wethBingBangMarket.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethBingBangMarket.assetId(),
            ),
            false,
        );

        const borrowPart = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );
        await expect(
            wethBingBangMarket.liquidate(
                [eoa1.address],
                [borrowPart],
                ethers.constants.AddressZero,
                swapData,
            ),
        ).to.be.reverted;
        await expect(
            wethBingBangMarket.liquidate(
                [eoa1.address],
                [borrowPart],
                multiSwapper.address,
                swapData,
            ),
        ).to.not.be.reverted;
        await expect(
            wethBingBangMarket.liquidate(
                [eoa1.address],
                [borrowPart],
                ethers.constants.AddressZero,
                [],
            ),
        ).to.be.reverted;
        const liquidatorAmountAfter = await yieldBox.toAmount(
            await wethBingBangMarket.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethBingBangMarket.assetId(),
            ),
            false,
        );

        expect(liquidatorAmountAfter.gt(liquidatorAmountBefore)).to.be.true;

        const userCollateralShareAfter =
            await wethBingBangMarket.userCollateralShare(eoa1.address);
        expect(userCollateralShareBefore.gt(userCollateralShareAfter)).to.be
            .true;

        const userBorrowPartAfter = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowPartAfter.eq(0)).to.be.true;
    });

    it('should update borrowing fee and withdraw fees with partial repayment', async () => {
        const {
            bar,
            wethBingBangMarket,
            weth,
            usd0,
            wethAssetId,
            yieldBox,
            deployer,
            eoa1,
            multiSwapper,
            timeTravel,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const feeAmount = 50000; //50%
        const borrowFeeUpdateFn =
            wethBingBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [feeAmount],
            );
        await bar.executeMarketFn(
            [wethBingBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.connect(eoa1).freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        await yieldBox
            .connect(eoa1)
            .depositAsset(wethAssetId, eoa1.address, eoa1.address, 0, valShare);
        await wethBingBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethBingBangMarket
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal),
        ).to.be.revertedWith('BingBang: insolvent');

        const totalSupplyBefore = await usd0.totalSupply();

        usdoBorrowVal = wethMintVal
            .mul(10)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        await wethBingBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
        const userBorrowPart = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );
        const usdoBorrowValWithFee = wethMintVal
            .mul(15)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        expect(userBorrowPart.eq(usdoBorrowValWithFee)).to.be.true;

        const totalSupplyAfter = await usd0.totalSupply();
        expect(totalSupplyAfter.sub(totalSupplyBefore).eq(usdoBorrowVal)).to.be
            .true;

        const feeToAddress = await bar.feeTo();
        const wethMinterBalance = await wethBingBangMarket.totalFees();
        expect(wethMinterBalance.eq(0)).to.be.true;

        let yieldBoxBalanceOfFeeToInAsset = await yieldBox.toAmount(
            await wethBingBangMarket.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethBingBangMarket.assetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeToInAsset.eq(0)).to.be.true;

        const feeVeTap = await bar.feeTo();

        let yieldBoxBalanceOfFeeVeTap = await yieldBox.toAmount(
            await wethBingBangMarket.collateralId(),
            await yieldBox.balanceOf(
                feeVeTap,
                await wethBingBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeVeTap.eq(0)).to.be.true;

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(600);
        await usd0.connect(deployer).mint(eoa1.address, usd0Extra);
        await usd0.connect(eoa1).approve(yieldBox.address, usd0Extra);
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                await wethBingBangMarket.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );

        timeTravel(100 * 86400);

        let userBorrowedAmount = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );
        const repaymentAmount = userBorrowedAmount.div(10);

        await wethBingBangMarket
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, repaymentAmount);
        userBorrowedAmount = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowedAmount.gt(0)).to.be.true;

        await expect(
            wethBingBangMarket.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: '1',
            }),
        ).to.emit(wethBingBangMarket, 'LogYieldBoxFeesDeposit');

        yieldBoxBalanceOfFeeVeTap = await yieldBox.toAmount(
            await wethBingBangMarket.collateralId(),
            await yieldBox.balanceOf(
                feeVeTap,
                await wethBingBangMarket.collateralId(),
            ),
            false,
        );

        expect(yieldBoxBalanceOfFeeVeTap.gt(0)).to.be.true;
        expect(
            usdoBorrowValWithFee
                .sub(usdoBorrowVal)
                .gte(yieldBoxBalanceOfFeeVeTap),
        ).to.be.true;
    });

    it('should update borrowing fee and withdraw fees', async () => {
        const {
            bar,
            wethBingBangMarket,
            weth,
            usd0,
            wethAssetId,
            yieldBox,
            deployer,
            eoa1,
            multiSwapper,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const feeAmount = 50000; //50%

        const borrowFeeUpdateFn =
            wethBingBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [feeAmount],
            );
        await bar.executeMarketFn(
            [wethBingBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.connect(eoa1).freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        await yieldBox
            .connect(eoa1)
            .depositAsset(wethAssetId, eoa1.address, eoa1.address, 0, valShare);
        await wethBingBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethBingBangMarket
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal),
        ).to.be.revertedWith('BingBang: insolvent');

        const totalSupplyBefore = await usd0.totalSupply();

        usdoBorrowVal = wethMintVal
            .mul(10)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        await wethBingBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
        const userBorrowPart = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );
        const usdoBorrowValWithFee = wethMintVal
            .mul(15)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        expect(userBorrowPart.eq(usdoBorrowValWithFee)).to.be.true;

        const totalSupplyAfter = await usd0.totalSupply();
        expect(totalSupplyAfter.sub(totalSupplyBefore).eq(usdoBorrowVal)).to.be
            .true;

        const feeToAddress = await bar.feeTo();
        const wethMinterBalance = await wethBingBangMarket.totalFees();
        expect(wethMinterBalance.eq(0)).to.be.true;

        const collateralAddress = await wethBingBangMarket.collateral();
        const collateralId = await wethBingBangMarket.collateralId();

        let yieldBoxBalanceOfFeeToInAsset = await yieldBox.toAmount(
            await wethBingBangMarket.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethBingBangMarket.assetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeToInAsset.eq(0)).to.be.true;

        const feeVeTap = await bar.feeTo();
        let yieldBoxBalanceOfFee = await yieldBox.toAmount(
            collateralId,
            await yieldBox.balanceOf(feeVeTap, collateralId),
            false,
        );
        expect(yieldBoxBalanceOfFee.eq(0)).to.be.true;

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(600);
        await usd0.connect(deployer).mint(eoa1.address, usd0Extra);
        await usd0.connect(eoa1).approve(yieldBox.address, usd0Extra);
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                await wethBingBangMarket.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );

        let userBorrowedAmount = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );

        await wethBingBangMarket
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, userBorrowedAmount);
        userBorrowedAmount = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowedAmount.eq(0)).to.be.true;

        //deposit fees to yieldBox
        const assetId = await wethBingBangMarket.assetId();
        const feeShareIn = await yieldBox.toShare(
            assetId,
            await usd0.balanceOf(wethBingBangMarket.address),
            false,
        );
        const calcAmount = await multiSwapper.getOutputAmount(
            assetId,
            feeShareIn,
            ethers.utils.defaultAbiCoder.encode(
                ['address[]'],
                [[usd0.address, collateralAddress]],
            ),
        );
        await expect(
            wethBingBangMarket.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: calcAmount.div(2),
            }),
        ).to.emit(wethBingBangMarket, 'LogYieldBoxFeesDeposit');

        yieldBoxBalanceOfFee = await yieldBox.toAmount(
            collateralId,
            await yieldBox.balanceOf(feeVeTap, collateralId),
            false,
        );
        expect(yieldBoxBalanceOfFee.gt(0)).to.be.true;
        expect(
            usdoBorrowValWithFee.sub(usdoBorrowVal).gte(yieldBoxBalanceOfFee),
        ).to.be.true;
    });

    it('should have multiple borrowers and check fees accrued over time', async () => {
        const {
            wethBingBangMarket,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            usd0,
            __wethUsdcPrice,
            multiSwapper,
            timeTravel,
            bar,
            eoas,
        } = await loadFixture(register);

        const borrowFeeUpdateFn =
            wethBingBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [5e2],
            );
        await bar.executeMarketFn(
            [wethBingBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        let usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            await weth
                .connect(eoa)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox
                .connect(eoa)
                .setApprovalForAll(wethBingBangMarket.address, true);

            await weth.connect(eoa).freeMint(wethMintVal);
            const valShare = await yieldBox.toShare(
                wethAssetId,
                wethMintVal,
                false,
            );
            timeTravel(86400);
            await yieldBox
                .connect(eoa)
                .depositAsset(
                    wethAssetId,
                    eoa.address,
                    eoa.address,
                    0,
                    valShare,
                );
            await wethBingBangMarket
                .connect(eoa)
                .addCollateral(eoa.address, eoa.address, false, valShare);
        }

        timeTravel(86400 * 5);
        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];

            await wethBingBangMarket
                .connect(eoa)
                .borrow(eoa.address, eoa.address, usdoBorrowVal);

            timeTravel(10 * 86400);
        }

        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const userBorrowPart = await wethBingBangMarket.userBorrowPart(
                eoa.address,
            );
            expect(userBorrowPart.gte(usdoBorrowVal)).to.be.true; //slightly bigger because of the opening borrow fee
        }

        //----------------

        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const usd0Balance = await yieldBox.toAmount(
                await bar.usdoAssetId(),
                await yieldBox.balanceOf(
                    eoa.address,
                    await wethBingBangMarket.assetId(),
                ),
                false,
            );
            expect(usd0Balance.eq(usdoBorrowVal)).to.be.true;
        }
        timeTravel(10 * 86400);

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(600);
        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];

            await usd0.connect(deployer).mint(eoa.address, usd0Extra);
            await usd0.connect(eoa).approve(yieldBox.address, usd0Extra);
            await yieldBox
                .connect(eoa)
                .depositAsset(
                    await wethBingBangMarket.assetId(),
                    eoa.address,
                    eoa.address,
                    usd0Extra,
                    0,
                );

            const userBorrowedAmount =
                await wethBingBangMarket.userBorrowPart(eoa.address);

            await wethBingBangMarket
                .connect(eoa)
                .repay(eoa.address, eoa.address, userBorrowedAmount);
        }

        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const usd0Balance = await yieldBox.toAmount(
                await bar.usdoAssetId(),
                await yieldBox.balanceOf(
                    eoa.address,
                    await wethBingBangMarket.assetId(),
                ),
                false,
            );
            expect(usd0Balance.lt(usd0Extra)).to.be.true;

            const userBorrowPart = await wethBingBangMarket.userBorrowPart(
                eoa.address,
            );
            expect(userBorrowPart.eq(0)).to.be.true;
        }

        //----------------
        const yieldBoxBalanceOfFeeBefore = await yieldBox.toAmount(
            await wethBingBangMarket.collateralId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await wethBingBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeBefore.eq(0)).to.be.true;

        //deposit fees to yieldBox
        await expect(
            wethBingBangMarket.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: '1',
            }),
        ).to.emit(wethBingBangMarket, 'LogYieldBoxFeesDeposit');

        const feeVeTap = await bar.feeTo();
        const yieldBoxBalanceOfFee = await yieldBox.toAmount(
            await wethBingBangMarket.collateralId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await wethBingBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFee.gt(0)).to.be.true;
    });

    it('should have multiple borrowers, do partial repayments and check fees accrued over time', async () => {
        const {
            wethBingBangMarket,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            usd0,
            __wethUsdcPrice,
            multiSwapper,
            timeTravel,
            bar,
            eoas,
        } = await loadFixture(register);

        const borrowFeeUpdateFn =
            wethBingBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [5e2],
            );
        await bar.executeMarketFn(
            [wethBingBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        let usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            await weth
                .connect(eoa)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox
                .connect(eoa)
                .setApprovalForAll(wethBingBangMarket.address, true);

            await weth.connect(eoa).freeMint(wethMintVal);
            const valShare = await yieldBox.toShare(
                wethAssetId,
                wethMintVal,
                false,
            );
            timeTravel(86400);
            await yieldBox
                .connect(eoa)
                .depositAsset(
                    wethAssetId,
                    eoa.address,
                    eoa.address,
                    0,
                    valShare,
                );
            await wethBingBangMarket
                .connect(eoa)
                .addCollateral(eoa.address, eoa.address, false, valShare);
        }

        timeTravel(86400 * 5);
        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];

            await wethBingBangMarket
                .connect(eoa)
                .borrow(eoa.address, eoa.address, usdoBorrowVal);

            timeTravel(10 * 86400);
        }

        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const userBorrowPart = await wethBingBangMarket.userBorrowPart(
                eoa.address,
            );
            expect(userBorrowPart.gte(usdoBorrowVal)).to.be.true; //slightly bigger because of the opening borrow fee
        }

        //----------------
        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const usd0Balance = await yieldBox.toAmount(
                await bar.usdoAssetId(),
                await yieldBox.balanceOf(
                    eoa.address,
                    await wethBingBangMarket.assetId(),
                ),
                false,
            );
            expect(usd0Balance.eq(usdoBorrowVal)).to.be.true;
        }
        timeTravel(10 * 86400);

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(600);
        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];

            await usd0.connect(deployer).mint(eoa.address, usd0Extra);
            await usd0.connect(eoa).approve(yieldBox.address, usd0Extra);
            await yieldBox
                .connect(eoa)
                .depositAsset(
                    await wethBingBangMarket.assetId(),
                    eoa.address,
                    eoa.address,
                    usd0Extra,
                    0,
                );

            const userBorrowedAmount =
                await wethBingBangMarket.userBorrowPart(eoa.address);

            await wethBingBangMarket
                .connect(eoa)
                .repay(eoa.address, eoa.address, userBorrowedAmount.div(2));
        }

        //----------------
        const yieldBoxBalanceOfFeeBefore = await yieldBox.toAmount(
            await wethBingBangMarket.collateralId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await wethBingBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeBefore.eq(0)).to.be.true;

        //deposit fees to yieldBox
        await expect(
            wethBingBangMarket.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: '1',
            }),
        ).to.emit(wethBingBangMarket, 'LogYieldBoxFeesDeposit');

        const yieldBoxBalanceOfFeeVe = await yieldBox.toAmount(
            await wethBingBangMarket.collateralId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await wethBingBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeVe.gt(0)).to.be.true;

        for (var i = 0; i < eoas.length; i++) {
            timeTravel(10 * 86400);
            const eoa = eoas[i];

            await usd0.connect(deployer).mint(eoa.address, usd0Extra);
            await usd0.connect(eoa).approve(yieldBox.address, usd0Extra);
            await yieldBox
                .connect(eoa)
                .depositAsset(
                    await wethBingBangMarket.assetId(),
                    eoa.address,
                    eoa.address,
                    usd0Extra,
                    0,
                );

            const userBorrowedAmount =
                await wethBingBangMarket.userBorrowPart(eoa.address);

            await wethBingBangMarket
                .connect(eoa)
                .repay(eoa.address, eoa.address, userBorrowedAmount);
        }

        const balance = await usd0.balanceOf(wethBingBangMarket.address);
        await expect(
            wethBingBangMarket.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: '1',
            }),
        ).to.emit(wethBingBangMarket, 'LogYieldBoxFeesDeposit');

        const yieldBoxFinalBalanceOfFeeVe = await yieldBox.toAmount(
            await wethBingBangMarket.collateralId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await wethBingBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxFinalBalanceOfFeeVe.gt(yieldBoxBalanceOfFeeVe)).to.be
            .true;
    });

    it('should perform multiple borrow operations, repay everything and withdraw fees', async () => {
        const {
            bar,
            wethBingBangMarket,
            weth,
            usd0,
            wethAssetId,
            yieldBox,
            eoa1,
            multiSwapper,
            timeTravel,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const borrowFeeUpdateFn =
            wethBingBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [5e2],
            );
        await bar.executeMarketFn(
            [wethBingBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.connect(eoa1).freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        await yieldBox
            .connect(eoa1)
            .depositAsset(wethAssetId, eoa1.address, eoa1.address, 0, valShare);
        await wethBingBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = wethMintVal
            .div(10)
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        //borrow 1
        await wethBingBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        //borrow 2
        await wethBingBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        //borrow 3
        await wethBingBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        let userBorrowPart = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );

        expect(userBorrowPart.gte(usdoBorrowVal.mul(3))).to.be.true;
        expect(userBorrowPart.lte(usdoBorrowVal.mul(4))).to.be.true;

        timeTravel(100 * 86400);

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(1000);
        await usd0.mint(eoa1.address, usd0Extra);
        await usd0.connect(eoa1).approve(yieldBox.address, usd0Extra);
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                await wethBingBangMarket.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );
        await wethBingBangMarket
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, userBorrowPart);
        userBorrowPart = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowPart.eq(0)).to.be.true;

        await wethBingBangMarket.depositFeesToYieldBox(
            multiSwapper.address,
            {
                minAssetAmount: 1,
            },
        );

        const feeVeTap = await bar.feeTo();
        const yieldBoxBalanceOfFeeVeTapShare = await yieldBox.balanceOf(
            feeVeTap,
            await wethBingBangMarket.collateralId(),
        );
        const yieldBoxBalanceOfFeeVeAmount = await yieldBox.toAmount(
            await wethBingBangMarket.collateralId(),
            yieldBoxBalanceOfFeeVeTapShare,
            false,
        );

        expect(yieldBoxBalanceOfFeeVeAmount.gt(0)).to.be.true;
    });

    it('should not allow depositing fees with invalid swapper', async () => {
        const { wethBingBangMarket, multiSwapper } = await loadFixture(
            register,
        );

        await expect(
            wethBingBangMarket.depositFeesToYieldBox(
                ethers.constants.AddressZero,
                { minAssetAmount: 1 },
            ),
        ).to.be.revertedWith('BingBang: Invalid swapper');

        await expect(
            wethBingBangMarket.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: 1,
            }),
        ).to.not.emit(wethBingBangMarket, 'LogYieldBoxFeesDeposit');
    });

    it('should test setters', async () => {
        const {
            bar,
            wethBingBangMarket,
            eoa1,
        } = await loadFixture(register);

        await expect(wethBingBangMarket.connect(eoa1).setBorrowCap(100)).to
            .be.reverted;

        await expect(
            wethBingBangMarket.connect(eoa1).updateBorrowingFee(100),
        ).to.be.reverted;

        let updateBorrowingFeeFn =
            wethBingBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [1e5],
            );
        await expect(
            bar.executeMarketFn(
                [wethBingBangMarket.address],
                [updateBorrowingFeeFn],
                true,
            ),
        ).to.be.reverted;

        let updateBorrowCapFn =
            wethBingBangMarket.interface.encodeFunctionData('setBorrowCap', [
                100,
            ]);
        await bar.executeMarketFn(
            [wethBingBangMarket.address],
            [updateBorrowCapFn],
            true,
        );

        updateBorrowingFeeFn =
            wethBingBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [100],
            );
        await bar.executeMarketFn(
            [wethBingBangMarket.address],
            [updateBorrowingFeeFn],
            true,
        );
    });

    it('should not be able to borrow when cap is reached', async () => {
        const {
            wethBingBangMarket,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            bar,
            __wethUsdcPrice,
        } = await loadFixture(register);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        await yieldBox.depositAsset(
            wethAssetId,
            deployer.address,
            deployer.address,
            0,
            valShare,
        );
        await wethBingBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        const borrowCapUpdateFn =
            wethBingBangMarket.interface.encodeFunctionData('setBorrowCap', [
                1,
            ]);
        await bar.executeMarketFn(
            [wethBingBangMarket.address],
            [borrowCapUpdateFn],
            true,
        );

        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethBingBangMarket.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            ),
        ).to.be.revertedWith('BingBang: borrow cap reached');
    });

    it('actions should not work when paused', async () => {
        const {
            wethBingBangMarket,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            bar,
            usd0,
            __wethUsdcPrice,
            timeTravel,
        } = await loadFixture(register);

        const setConservatorData =
            wethBingBangMarket.interface.encodeFunctionData(
                'setConservator',
                [deployer.address],
            );
        await bar.executeMarketFn(
            [wethBingBangMarket.address],
            [setConservatorData],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        await yieldBox.depositAsset(
            wethAssetId,
            deployer.address,
            deployer.address,
            0,
            valShare,
        );

        await wethBingBangMarket.updatePause(true);

        const pauseState = await wethBingBangMarket.paused();
        expect(pauseState).to.be.true;

        await expect(
            wethBingBangMarket.addCollateral(
                deployer.address,
                deployer.address,
                false,
                valShare,
            ),
        ).to.be.revertedWith('BingBang: paused');

        await wethBingBangMarket.updatePause(false);

        await wethBingBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        await wethBingBangMarket.updatePause(true);

        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethBingBangMarket.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            ),
        ).to.be.revertedWith('BingBang: paused');

        await wethBingBangMarket.updatePause(false);

        await expect(
            wethBingBangMarket.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            ),
        ).to.not.be.reverted;

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(500);
        await usd0.mint(deployer.address, usd0Extra);
        await usd0.approve(yieldBox.address, usd0Extra);
        await yieldBox.depositAsset(
            await wethBingBangMarket.assetId(),
            deployer.address,
            deployer.address,
            usd0Extra,
            0,
        );
        const userBorrowPart = await wethBingBangMarket.userBorrowPart(
            deployer.address,
        );

        await wethBingBangMarket.updatePause(true);

        await expect(
            wethBingBangMarket.repay(
                deployer.address,
                deployer.address,
                userBorrowPart,
            ),
        ).to.be.revertedWith('BingBang: paused');

        await wethBingBangMarket.updatePause(false);

        await expect(
            wethBingBangMarket.repay(
                deployer.address,
                deployer.address,
                userBorrowPart,
            ),
        ).not.to.be.reverted;

        await wethBingBangMarket.updatePause(true);

        let collateralShares = await wethBingBangMarket.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.gt(0)).to.be.true;
        expect(collateralShares.eq(valShare)).to.be.true;

        await expect(
            wethBingBangMarket.removeCollateral(
                deployer.address,
                deployer.address,
                collateralShares,
            ),
        ).to.be.revertedWith('BingBang: paused');

        await wethBingBangMarket.updatePause(false);

        await expect(
            wethBingBangMarket.removeCollateral(
                deployer.address,
                deployer.address,
                collateralShares,
            ),
        ).not.to.be.reverted;

        collateralShares = await wethBingBangMarket.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.eq(0)).to.be.true;
    });

    it("should test the variable debt", async () => {
        const {
            wethBingBangMarket,
            wbtcBingBangMarket,
            weth,
            wethAssetId,
            wbtc,
            wbtcAssetId,
            yieldBox,
            deployer,
            bar,
        } = await loadFixture(register);


        //borrow from the main eth market
        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(50);
        await weth.freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        await yieldBox.depositAsset(
            wethAssetId,
            deployer.address,
            deployer.address,
            0,
            valShare,
        );
        await wethBingBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );


        const usdoBorrowVal = ethers.utils.parseEther("10000");
        await wethBingBangMarket.borrow(
            deployer.address,
            deployer.address,
            usdoBorrowVal,
        );

        let userBorrowPart = await wethBingBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.eq(usdoBorrowVal)).to.be.true;

        const ethMarketTotalDebt = await wethBingBangMarket.getTotalDebt();
        expect(ethMarketTotalDebt.eq(userBorrowPart)).to.be.true;

        const ethMarketDebtRate = await wethBingBangMarket.getDebtRate();
        expect(ethMarketDebtRate.eq(ethers.utils.parseEther("0.005"))).to.be.true;

        //wbtc market
        const initialWbtcDebtRate = await wbtcBingBangMarket.getDebtRate();
        const minDebtRate = await wbtcBingBangMarket.minDebtRate();
        expect(initialWbtcDebtRate.eq(minDebtRate)).to.be.true;

        await wbtc.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wbtcBingBangMarket.address, true);

        const wbtcMintVal = ethers.BigNumber.from((1e18).toString()).mul(50);
        await wbtc.freeMint(wbtcMintVal);
        const wbtcValShare = await yieldBox.toShare(
            wbtcAssetId,
            wbtcMintVal,
            false,
        );
        await yieldBox.depositAsset(
            wbtcAssetId,
            deployer.address,
            deployer.address,
            0,
            wbtcValShare,
        );
        await wbtcBingBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            wbtcValShare,
        );

        const wbtcMarketusdoBorrowVal = ethers.utils.parseEther("2987");
        await wbtcBingBangMarket.borrow(
            deployer.address,
            deployer.address,
            wbtcMarketusdoBorrowVal,
        );

        userBorrowPart = await wbtcBingBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.eq(wbtcMarketusdoBorrowVal)).to.be.true;

        const wbtcMarketTotalDebt = await wbtcBingBangMarket.getTotalDebt();
        expect(wbtcMarketTotalDebt.eq(userBorrowPart)).to.be.true;

        let currentWbtcDebtRate = await wbtcBingBangMarket.getDebtRate();
        expect(currentWbtcDebtRate.eq(ethers.utils.parseEther("0.022922"))).to.be.true;

        await wbtcBingBangMarket.borrow(
            deployer.address,
            deployer.address,
            wbtcMarketusdoBorrowVal,
        );

        currentWbtcDebtRate = await wbtcBingBangMarket.getDebtRate();
        expect(currentWbtcDebtRate.eq(ethers.utils.parseEther("0.035"))).to.be.true;
    })

    it('should test debt rate accrual over year', async () => {
        const {
            bar,
            wethBingBangMarket,
            weth,
            usd0,
            wethAssetId,
            yieldBox,
            eoa1,
            multiSwapper,
            timeTravel,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const borrowFeeUpdateFn =
            wethBingBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [0],
            );
        await bar.executeMarketFn(
            [wethBingBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(100);
        await weth.connect(eoa1).freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );

        await yieldBox
            .connect(eoa1)
            .depositAsset(wethAssetId, eoa1.address, eoa1.address, 0, valShare);
        await wethBingBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = ethers.utils.parseEther("10000");
        await wethBingBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        let userBorrowPart = await wethBingBangMarket.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowPart.eq(usdoBorrowVal)).to.be.true;

        const debtRate = ethers.utils.formatEther(await wethBingBangMarket.getDebtRate());
        const totalDebtBefore = await wethBingBangMarket.getTotalDebt();
        await timeTravel(365 * 86400);
        await wethBingBangMarket.accrue();
        const totalDebtAfter = await wethBingBangMarket.getTotalDebt();

        const extra = ethers.utils.parseEther((10000 * parseFloat(debtRate)).toString());
        const debtDifference = totalDebtAfter.sub(totalDebtBefore);

        expect(extra).to.be.approximately(debtDifference, extra.mul(1).div(100));
    });

    it("should test approval", async () => {
        const {
            bar,
            wethBingBangMarket,
            weth,
            usd0,
            wethAssetId,
            yieldBox,
            eoa1,
            multiSwapper,
            timeTravel,
            __wethUsdcPrice,
            deployer,
        } = await loadFixture(register);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBingBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBingBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(100);
        await weth.connect(deployer).freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );

        await yieldBox
            .connect(deployer)
            .depositAsset(wethAssetId, deployer.address, deployer.address, 0, valShare);

        await expect(wethBingBangMarket
            .connect(eoa1)
            .addCollateral(deployer.address, deployer.address, false, valShare)).to.be.revertedWithCustomError(wethBingBangMarket, "NotApproved");

        await wethBingBangMarket.updateOperator(eoa1.address, true);

        await expect(wethBingBangMarket
            .connect(eoa1)
            .addCollateral(deployer.address, deployer.address, false, valShare)).to.not.be.revertedWithCustomError;

    })
});
