import hre, { ethers, network } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';

describe('BigBang test', () => {
    it('should test initial values', async () => {
        const { wethBigBangMarket, usd0, bar, weth, wethAssetId } =
            await loadFixture(register);

        const savedAssetId = await wethBigBangMarket.assetId();
        const penroseUsd0Id = await bar.usdoAssetId();
        expect(savedAssetId.eq(penroseUsd0Id)).to.be.true;

        const savedAsset = await wethBigBangMarket.asset();
        const barUsd0 = await bar.usdoToken();
        expect(barUsd0.toLowerCase()).eq(savedAsset.toLowerCase());

        const savedCollateralId = await wethBigBangMarket.collateralId();
        expect(savedCollateralId.eq(wethAssetId)).to.be.true;

        const savedCollateral = await wethBigBangMarket.collateral();
        expect(weth.address.toLowerCase()).eq(savedCollateral.toLowerCase());

        const borrowingFee = await wethBigBangMarket.borrowingFee();
        expect(borrowingFee.eq(0)).to.be.true;
    });

    it('should add collateral', async () => {
        const {
            wethBigBangMarket,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            eoa1,
        } = await loadFixture(register);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

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
            wethBigBangMarket
                .connect(eoa1)
                .addCollateral(
                    deployer.address,
                    deployer.address,
                    false,
                    valShare,
                ),
        ).to.be.reverted;
        await wethBigBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        let collateralShares = await wethBigBangMarket.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.gt(0)).to.be.true;
        expect(collateralShares.eq(valShare)).to.be.true;

        await wethBigBangMarket.removeCollateral(
            deployer.address,
            deployer.address,
            collateralShares,
        );

        collateralShares = await wethBigBangMarket.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.eq(0)).to.be.true;
    });

    it('should borrow and repay', async () => {
        const {
            wethBigBangMarket,
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
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

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
        await wethBigBangMarket.addCollateral(
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

        await wethBigBangMarket.borrow(
            deployer.address,
            deployer.address,
            usdoBorrowVal,
        );

        let userBorrowPart = await wethBigBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.gt(0)).to.be.true;

        const usd0Balance = await yieldBox.toAmount(
            await bar.usdoAssetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethBigBangMarket.assetId(),
            ),
            false,
        );
        expect(usd0Balance.gt(0)).to.be.true;
        expect(usd0Balance.eq(usdoBorrowVal)).to.be.true;

        timeTravel(10 * 86400);

        //repay
        userBorrowPart = await wethBigBangMarket.userBorrowPart(
            deployer.address,
        );
        await expect(
            wethBigBangMarket.repay(
                deployer.address,
                deployer.address,
                false,
                userBorrowPart,
            ),
        ).to.be.reverted;

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(500);
        await usd0.mint(deployer.address, usd0Extra);
        await usd0.approve(yieldBox.address, usd0Extra);
        await yieldBox.depositAsset(
            await wethBigBangMarket.assetId(),
            deployer.address,
            deployer.address,
            usd0Extra,
            0,
        );
        await wethBigBangMarket.repay(
            deployer.address,
            deployer.address,
            false,
            userBorrowPart,
        );
        userBorrowPart = await wethBigBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.eq(0)).to.be.true;
    });

    it('should liquidate', async () => {
        const {
            wethBigBangMarket,
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
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBigBangMarket.address, true);

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
        await wethBigBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await wethBigBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        // Can't liquidate
        const swapData = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        await expect(
            wethBigBangMarket.liquidate(
                [eoa1.address],
                [usdoBorrowVal],
                multiSwapper.address,
                swapData,
            ),
        ).to.be.reverted;

        const priceDrop = __usd0WethPrice.mul(15).div(10).div(100);
        await usd0WethOracle.set(__usd0WethPrice.add(priceDrop));

        const userCollateralShareBefore =
            await wethBigBangMarket.userCollateralShare(eoa1.address);

        const liquidatorAmountBefore = await yieldBox.toAmount(
            await wethBigBangMarket.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethBigBangMarket.assetId(),
            ),
            false,
        );

        await wethBigBangMarket.updateExchangeRate();
        const exchangeRate = await wethBigBangMarket.exchangeRate();

        const tvlInfo = await wethBigBangMarket.computeTVLInfo(
            eoa1.address,
            exchangeRate,
        );

        const closingFactor = await wethBigBangMarket.computeClosingFactor(
            eoa1.address,
            exchangeRate,
        );

        const liquidationBonus =
            await wethBigBangMarket.liquidationBonusAmount();
        const borrowPart = await wethBigBangMarket.userBorrowPart(eoa1.address);
        const bonus = borrowPart.mul(liquidationBonus).div(1e5);

        expect(closingFactor.gt(0)).to.be.true;
        expect(closingFactor.sub(bonus).eq(tvlInfo[0])).to.be.true;
        await expect(
            wethBigBangMarket.liquidate(
                [eoa1.address],
                [borrowPart],
                ethers.constants.AddressZero,
                swapData,
            ),
        ).to.be.reverted;
        await expect(
            wethBigBangMarket.liquidate(
                [eoa1.address],
                [borrowPart],
                multiSwapper.address,
                swapData,
            ),
        ).to.not.be.reverted;
        await expect(
            wethBigBangMarket.liquidate(
                [eoa1.address],
                [borrowPart],
                ethers.constants.AddressZero,
                [],
            ),
        ).to.be.reverted;
        const liquidatorAmountAfter = await yieldBox.toAmount(
            await wethBigBangMarket.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethBigBangMarket.assetId(),
            ),
            false,
        );

        expect(liquidatorAmountAfter.gt(liquidatorAmountBefore)).to.be.true;

        const userCollateralShareAfter =
            await wethBigBangMarket.userCollateralShare(eoa1.address);
        expect(userCollateralShareBefore.gt(userCollateralShareAfter)).to.be
            .true;

        const userBorrowPartAfter = await wethBigBangMarket.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowPartAfter.lt(borrowPart)).to.be.true;
    });

    it('should update borrowing fee and withdraw fees with partial repayment', async () => {
        const {
            bar,
            wethBigBangMarket,
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
            wethBigBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [feeAmount],
            );
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBigBangMarket.address, true);

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
        await wethBigBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethBigBangMarket
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal),
        ).to.be.revertedWith('Market: insolvent');

        const totalSupplyBefore = await usd0.totalSupply();

        usdoBorrowVal = wethMintVal
            .mul(10)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        await wethBigBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
        const userBorrowPart = await wethBigBangMarket.userBorrowPart(
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
        const wethMinterBalance = await wethBigBangMarket.totalFees();
        expect(wethMinterBalance.eq(0)).to.be.true;

        const yieldBoxBalanceOfFeeToInAsset = await yieldBox.toAmount(
            await wethBigBangMarket.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethBigBangMarket.assetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeToInAsset.eq(0)).to.be.true;

        const feeVeTap = await bar.feeTo();

        let yieldBoxBalanceOfFeeVeTap = await yieldBox.toAmount(
            await wethBigBangMarket.collateralId(),
            await yieldBox.balanceOf(
                feeVeTap,
                await wethBigBangMarket.collateralId(),
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
                await wethBigBangMarket.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );

        timeTravel(100 * 86400);

        let userBorrowedAmount = await wethBigBangMarket.userBorrowPart(
            eoa1.address,
        );
        const repaymentAmount = userBorrowedAmount.div(10);

        await wethBigBangMarket
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, false, repaymentAmount);
        userBorrowedAmount = await wethBigBangMarket.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowedAmount.gt(0)).to.be.true;

        await expect(
            bar.withdrawAllBigBangFees(
                [wethBigBangMarket.address],
                [multiSwapper.address],
                [
                    {
                        minAssetAmount: '1',
                    },
                ],
            ),
        ).to.emit(bar, 'LogYieldBoxFeesDeposit');

        yieldBoxBalanceOfFeeVeTap = await yieldBox.toAmount(
            await wethBigBangMarket.collateralId(),
            await yieldBox.balanceOf(
                feeVeTap,
                await wethBigBangMarket.collateralId(),
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
            wethBigBangMarket,
            weth,
            usd0,
            wethAssetId,
            yieldBox,
            deployer,
            eoa1,
            multiSwapper,
            __wethUsdcPrice,
            createSimpleSwapData,
        } = await loadFixture(register);

        const feeAmount = 50000; //50%

        const borrowFeeUpdateFn =
            wethBigBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [feeAmount],
            );
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBigBangMarket.address, true);

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
        await wethBigBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethBigBangMarket
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal),
        ).to.be.revertedWith('Market: insolvent');

        const totalSupplyBefore = await usd0.totalSupply();

        usdoBorrowVal = wethMintVal
            .mul(10)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        await wethBigBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
        const userBorrowPart = await wethBigBangMarket.userBorrowPart(
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
        const wethMinterBalance = await wethBigBangMarket.totalFees();
        expect(wethMinterBalance.eq(0)).to.be.true;

        const collateralAddress = await wethBigBangMarket.collateral();
        const collateralId = await wethBigBangMarket.collateralId();

        const yieldBoxBalanceOfFeeToInAsset = await yieldBox.toAmount(
            await wethBigBangMarket.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethBigBangMarket.assetId(),
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
                await wethBigBangMarket.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );

        let userBorrowedAmount = await wethBigBangMarket.userBorrowPart(
            eoa1.address,
        );

        await wethBigBangMarket
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, false, userBorrowedAmount);
        userBorrowedAmount = await wethBigBangMarket.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowedAmount.eq(0)).to.be.true;

        //deposit fees to yieldBox
        const assetId = await wethBigBangMarket.assetId();
        const feeShareIn = await yieldBox.toShare(
            assetId,
            await usd0.balanceOf(wethBigBangMarket.address),
            false,
        );

        //
        const swapData = await multiSwapper[
            'buildSwapData(uint256,uint256,uint256,uint256,bool,bool)'
        ](assetId, collateralId, 0, feeShareIn, true, true);

        const calcAmount = await multiSwapper.getOutputAmount(swapData, '0x00');
        await expect(
            bar.withdrawAllBigBangFees(
                [wethBigBangMarket.address],
                [multiSwapper.address],
                [
                    {
                        minAssetAmount: calcAmount.div(2),
                    },
                ],
            ),
        ).to.emit(bar, 'LogYieldBoxFeesDeposit');

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
            wethBigBangMarket,
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
            wethBigBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [5e2],
            );
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            await weth
                .connect(eoa)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox
                .connect(eoa)
                .setApprovalForAll(wethBigBangMarket.address, true);

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
            await wethBigBangMarket
                .connect(eoa)
                .addCollateral(eoa.address, eoa.address, false, valShare);
        }

        timeTravel(86400 * 5);
        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];

            await wethBigBangMarket
                .connect(eoa)
                .borrow(eoa.address, eoa.address, usdoBorrowVal);

            timeTravel(10 * 86400);
        }

        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const userBorrowPart = await wethBigBangMarket.userBorrowPart(
                eoa.address,
            );
            expect(userBorrowPart.gte(usdoBorrowVal)).to.be.true; //slightly bigger because of the opening borrow fee
        }

        //----------------

        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const usd0Balance = await yieldBox.toAmount(
                await bar.usdoAssetId(),
                await yieldBox.balanceOf(
                    eoa.address,
                    await wethBigBangMarket.assetId(),
                ),
                false,
            );
            expect(usd0Balance.eq(usdoBorrowVal)).to.be.true;
        }
        timeTravel(10 * 86400);

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(600);
        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];

            await usd0.connect(deployer).mint(eoa.address, usd0Extra);
            await usd0.connect(eoa).approve(yieldBox.address, usd0Extra);
            await yieldBox
                .connect(eoa)
                .depositAsset(
                    await wethBigBangMarket.assetId(),
                    eoa.address,
                    eoa.address,
                    usd0Extra,
                    0,
                );

            const userBorrowedAmount = await wethBigBangMarket.userBorrowPart(
                eoa.address,
            );

            await wethBigBangMarket
                .connect(eoa)
                .repay(eoa.address, eoa.address, false, userBorrowedAmount);
        }

        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const usd0Balance = await yieldBox.toAmount(
                await bar.usdoAssetId(),
                await yieldBox.balanceOf(
                    eoa.address,
                    await wethBigBangMarket.assetId(),
                ),
                false,
            );
            expect(usd0Balance.lt(usd0Extra)).to.be.true;

            const userBorrowPart = await wethBigBangMarket.userBorrowPart(
                eoa.address,
            );
            expect(userBorrowPart.eq(0)).to.be.true;
        }

        //----------------
        const yieldBoxBalanceOfFeeBefore = await yieldBox.toAmount(
            await wethBigBangMarket.collateralId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await wethBigBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeBefore.eq(0)).to.be.true;

        //deposit fees to yieldBox
        await expect(
            bar.withdrawAllBigBangFees(
                [wethBigBangMarket.address],
                [multiSwapper.address],
                [
                    {
                        minAssetAmount: '1',
                    },
                ],
            ),
        ).to.emit(bar, 'LogYieldBoxFeesDeposit');

        const feeVeTap = await bar.feeTo();
        const yieldBoxBalanceOfFee = await yieldBox.toAmount(
            await wethBigBangMarket.collateralId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await wethBigBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFee.gt(0)).to.be.true;
    });

    it('should have multiple borrowers, do partial repayments and check fees accrued over time', async () => {
        const {
            wethBigBangMarket,
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
            wethBigBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [5e2],
            );
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            await weth
                .connect(eoa)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox
                .connect(eoa)
                .setApprovalForAll(wethBigBangMarket.address, true);

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
            await wethBigBangMarket
                .connect(eoa)
                .addCollateral(eoa.address, eoa.address, false, valShare);
        }

        timeTravel(86400 * 5);
        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];

            await wethBigBangMarket
                .connect(eoa)
                .borrow(eoa.address, eoa.address, usdoBorrowVal);

            timeTravel(10 * 86400);
        }

        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const userBorrowPart = await wethBigBangMarket.userBorrowPart(
                eoa.address,
            );
            expect(userBorrowPart.gte(usdoBorrowVal)).to.be.true; //slightly bigger because of the opening borrow fee
        }

        //----------------
        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const usd0Balance = await yieldBox.toAmount(
                await bar.usdoAssetId(),
                await yieldBox.balanceOf(
                    eoa.address,
                    await wethBigBangMarket.assetId(),
                ),
                false,
            );
            expect(usd0Balance.eq(usdoBorrowVal)).to.be.true;
        }
        timeTravel(10 * 86400);

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(600);
        for (let i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];

            await usd0.connect(deployer).mint(eoa.address, usd0Extra);
            await usd0.connect(eoa).approve(yieldBox.address, usd0Extra);
            await yieldBox
                .connect(eoa)
                .depositAsset(
                    await wethBigBangMarket.assetId(),
                    eoa.address,
                    eoa.address,
                    usd0Extra,
                    0,
                );

            const userBorrowedAmount = await wethBigBangMarket.userBorrowPart(
                eoa.address,
            );

            await wethBigBangMarket
                .connect(eoa)
                .repay(
                    eoa.address,
                    eoa.address,
                    false,
                    userBorrowedAmount.div(2),
                );
        }

        //----------------
        const yieldBoxBalanceOfFeeBefore = await yieldBox.toAmount(
            await wethBigBangMarket.collateralId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await wethBigBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeBefore.eq(0)).to.be.true;

        //deposit fees to yieldBox
        await expect(
            bar.withdrawAllBigBangFees(
                [wethBigBangMarket.address],
                [multiSwapper.address],
                [
                    {
                        minAssetAmount: '1',
                    },
                ],
            ),
        ).to.emit(bar, 'LogYieldBoxFeesDeposit');

        const yieldBoxBalanceOfFeeVe = await yieldBox.toAmount(
            await wethBigBangMarket.collateralId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await wethBigBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeVe.gt(0)).to.be.true;

        for (let i = 0; i < eoas.length; i++) {
            timeTravel(10 * 86400);
            const eoa = eoas[i];

            await usd0.connect(deployer).mint(eoa.address, usd0Extra);
            await usd0.connect(eoa).approve(yieldBox.address, usd0Extra);
            await yieldBox
                .connect(eoa)
                .depositAsset(
                    await wethBigBangMarket.assetId(),
                    eoa.address,
                    eoa.address,
                    usd0Extra,
                    0,
                );

            const userBorrowedAmount = await wethBigBangMarket.userBorrowPart(
                eoa.address,
            );

            await wethBigBangMarket
                .connect(eoa)
                .repay(eoa.address, eoa.address, false, userBorrowedAmount);
        }

        const balance = await usd0.balanceOf(wethBigBangMarket.address);
        await expect(
            bar.withdrawAllBigBangFees(
                [wethBigBangMarket.address],
                [multiSwapper.address],
                [
                    {
                        minAssetAmount: '1',
                    },
                ],
            ),
        ).to.emit(bar, 'LogYieldBoxFeesDeposit');

        const yieldBoxFinalBalanceOfFeeVe = await yieldBox.toAmount(
            await wethBigBangMarket.collateralId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await wethBigBangMarket.collateralId(),
            ),
            false,
        );
        expect(yieldBoxFinalBalanceOfFeeVe.gt(yieldBoxBalanceOfFeeVe)).to.be
            .true;
    });

    it('should perform multiple borrow operations, repay everything and withdraw fees', async () => {
        const {
            bar,
            wethBigBangMarket,
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
            wethBigBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [5e2],
            );
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBigBangMarket.address, true);

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
        await wethBigBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        const usdoBorrowVal = wethMintVal
            .div(10)
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        //borrow 1
        await wethBigBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        //borrow 2
        await wethBigBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        //borrow 3
        await wethBigBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        let userBorrowPart = await wethBigBangMarket.userBorrowPart(
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
                await wethBigBangMarket.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );
        await wethBigBangMarket
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, false, userBorrowPart);

        userBorrowPart = await wethBigBangMarket.userBorrowPart(eoa1.address);
        expect(userBorrowPart.eq(0)).to.be.true;

        await bar.withdrawAllBigBangFees(
            [wethBigBangMarket.address],
            [multiSwapper.address],
            [
                {
                    minAssetAmount: '1',
                },
            ],
        );

        const feeVeTap = await bar.feeTo();
        const yieldBoxBalanceOfFeeVeTapShare = await yieldBox.balanceOf(
            feeVeTap,
            await wethBigBangMarket.collateralId(),
        );
        const yieldBoxBalanceOfFeeVeAmount = await yieldBox.toAmount(
            await wethBigBangMarket.collateralId(),
            yieldBoxBalanceOfFeeVeTapShare,
            false,
        );

        expect(yieldBoxBalanceOfFeeVeAmount.gt(0)).to.be.true;
    });

    it('should not allow depositing fees with invalid swapper', async () => {
        const { wethBigBangMarket, multiSwapper, bar } = await loadFixture(
            register,
        );

        await expect(
            bar.withdrawAllBigBangFees(
                [wethBigBangMarket.address],
                [wethBigBangMarket.address],
                [
                    {
                        minAssetAmount: '1',
                    },
                ],
            ),
        ).to.be.revertedWith('Penrose: Invalid swapper');

        await expect(
            bar.withdrawAllBigBangFees(
                [wethBigBangMarket.address],
                [multiSwapper.address],
                [
                    {
                        minAssetAmount: '1',
                    },
                ],
            ),
        ).to.not.emit(bar, 'LogYieldBoxFeesDeposit');
    });

    it('should test setters', async () => {
        const { bar, wethBigBangMarket, eoa1 } = await loadFixture(register);

        await expect(wethBigBangMarket.connect(eoa1).setBorrowCap(100)).to.be
            .reverted;

        await expect(wethBigBangMarket.connect(eoa1).updateBorrowingFee(100)).to
            .be.reverted;

        let updateBorrowingFeeFn =
            wethBigBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [1e5],
            );
        await expect(
            bar.executeMarketFn(
                [wethBigBangMarket.address],
                [updateBorrowingFeeFn],
                true,
            ),
        ).to.be.reverted;

        const updateBorrowCapFn =
            wethBigBangMarket.interface.encodeFunctionData('setBorrowCap', [
                100,
            ]);
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [updateBorrowCapFn],
            true,
        );

        updateBorrowingFeeFn = wethBigBangMarket.interface.encodeFunctionData(
            'updateBorrowingFee',
            [100],
        );
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [updateBorrowingFeeFn],
            true,
        );
    });

    it('should not be able to borrow when cap is reached', async () => {
        const {
            wethBigBangMarket,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            bar,
            __wethUsdcPrice,
        } = await loadFixture(register);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

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
        await wethBigBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        const borrowCapUpdateFn =
            wethBigBangMarket.interface.encodeFunctionData('setBorrowCap', [1]);
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [borrowCapUpdateFn],
            true,
        );

        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethBigBangMarket.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            ),
        ).to.be.revertedWith('BigBang: borrow cap reached');
    });

    it('actions should not work when paused', async () => {
        const {
            wethBigBangMarket,
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
            wethBigBangMarket.interface.encodeFunctionData('setConservator', [
                deployer.address,
            ]);
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [setConservatorData],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

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

        await wethBigBangMarket.updatePause(true);

        const pauseState = await wethBigBangMarket.paused();
        expect(pauseState).to.be.true;

        await expect(
            wethBigBangMarket.addCollateral(
                deployer.address,
                deployer.address,
                false,
                valShare,
            ),
        ).to.be.revertedWith('Market: paused');

        await wethBigBangMarket.updatePause(false);

        await wethBigBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        await wethBigBangMarket.updatePause(true);

        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethBigBangMarket.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            ),
        ).to.be.revertedWith('Market: paused');

        await wethBigBangMarket.updatePause(false);

        await expect(
            wethBigBangMarket.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            ),
        ).to.not.be.reverted;

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(500);
        await usd0.mint(deployer.address, usd0Extra);
        await usd0.approve(yieldBox.address, usd0Extra);
        await yieldBox.depositAsset(
            await wethBigBangMarket.assetId(),
            deployer.address,
            deployer.address,
            usd0Extra,
            0,
        );
        const userBorrowPart = await wethBigBangMarket.userBorrowPart(
            deployer.address,
        );

        await wethBigBangMarket.updatePause(true);

        await expect(
            wethBigBangMarket.repay(
                deployer.address,
                deployer.address,
                false,
                userBorrowPart,
            ),
        ).to.be.revertedWith('Market: paused');

        await wethBigBangMarket.updatePause(false);

        await expect(
            wethBigBangMarket.repay(
                deployer.address,
                deployer.address,
                false,
                userBorrowPart,
            ),
        ).not.to.be.reverted;

        await wethBigBangMarket.updatePause(true);

        let collateralShares = await wethBigBangMarket.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.gt(0)).to.be.true;
        expect(collateralShares.eq(valShare)).to.be.true;

        await expect(
            wethBigBangMarket.removeCollateral(
                deployer.address,
                deployer.address,
                collateralShares,
            ),
        ).to.be.revertedWith('Market: paused');

        await wethBigBangMarket.updatePause(false);

        await expect(
            wethBigBangMarket.removeCollateral(
                deployer.address,
                deployer.address,
                collateralShares,
            ),
        ).not.to.be.reverted;

        collateralShares = await wethBigBangMarket.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.eq(0)).to.be.true;
    });

    it('should test the variable debt', async () => {
        const {
            wethBigBangMarket,
            wbtcBigBangMarket,
            weth,
            wethAssetId,
            wbtc,
            wbtcAssetId,
            yieldBox,
            deployer,
            timeTravel,
            bar,
        } = await loadFixture(register);

        //borrow from the main eth market
        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(50);
        await weth.updateMintLimit(wethMintVal.mul(100));
        await timeTravel(86401);
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
        await wethBigBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        const usdoBorrowVal = ethers.utils.parseEther('10000');
        await wethBigBangMarket.borrow(
            deployer.address,
            deployer.address,
            usdoBorrowVal,
        );

        let userBorrowPart = await wethBigBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.eq(usdoBorrowVal)).to.be.true;

        const ethMarketTotalDebt = await wethBigBangMarket.getTotalDebt();
        expect(ethMarketTotalDebt.eq(userBorrowPart)).to.be.true;

        const ethMarketDebtRate = await wethBigBangMarket.getDebtRate();
        expect(ethMarketDebtRate.eq(ethers.utils.parseEther('0.005'))).to.be
            .true;

        //wbtc market
        const initialWbtcDebtRate = await wbtcBigBangMarket.getDebtRate();
        const minDebtRate = await wbtcBigBangMarket.minDebtRate();
        expect(initialWbtcDebtRate.eq(minDebtRate)).to.be.true;

        await wbtc.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wbtcBigBangMarket.address, true);

        const wbtcMintVal = ethers.BigNumber.from((1e18).toString()).mul(50);
        await wbtc.updateMintLimit(wbtcMintVal.mul(10));
        await timeTravel(86401);
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
        await wbtcBigBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            wbtcValShare,
        );

        const wbtcMarketusdoBorrowVal = ethers.utils.parseEther('2987');
        await wbtcBigBangMarket.borrow(
            deployer.address,
            deployer.address,
            wbtcMarketusdoBorrowVal,
        );

        userBorrowPart = await wbtcBigBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.eq(wbtcMarketusdoBorrowVal)).to.be.true;

        const wbtcMarketTotalDebt = await wbtcBigBangMarket.getTotalDebt();
        expect(wbtcMarketTotalDebt.eq(userBorrowPart)).to.be.true;

        let currentWbtcDebtRate = await wbtcBigBangMarket.getDebtRate();
        expect(currentWbtcDebtRate.eq(ethers.utils.parseEther('0.022922'))).to
            .be.true;

        await wbtcBigBangMarket.borrow(
            deployer.address,
            deployer.address,
            wbtcMarketusdoBorrowVal,
        );

        currentWbtcDebtRate = await wbtcBigBangMarket.getDebtRate();
        expect(currentWbtcDebtRate.eq(ethers.utils.parseEther('0.035'))).to.be
            .true;
    });

    it('should test debt rate accrual over year', async () => {
        const {
            bar,
            wethBigBangMarket,
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
            wethBigBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [0],
            );
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBigBangMarket.address, true);

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
        await wethBigBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        const usdoBorrowVal = ethers.utils.parseEther('10000');
        await wethBigBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        const userBorrowPart = await wethBigBangMarket.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowPart.eq(usdoBorrowVal)).to.be.true;

        const debtRate = ethers.utils.formatEther(
            await wethBigBangMarket.getDebtRate(),
        );
        const totalDebtBefore = await wethBigBangMarket.getTotalDebt();
        await timeTravel(365 * 86400);
        await wethBigBangMarket.accrue();
        const totalDebtAfter = await wethBigBangMarket.getTotalDebt();

        const extra = ethers.utils.parseEther(
            (10000 * parseFloat(debtRate)).toString(),
        );
        const debtDifference = totalDebtAfter.sub(totalDebtBefore);

        expect(extra).to.be.approximately(
            debtDifference,
            extra.mul(1).div(100),
        );
    });

    it('should test approval', async () => {
        const {
            bar,
            wethBigBangMarket,
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
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBigBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(100);
        await weth.connect(deployer).freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );

        await yieldBox
            .connect(deployer)
            .depositAsset(
                wethAssetId,
                deployer.address,
                deployer.address,
                0,
                valShare,
            );

        await expect(
            wethBigBangMarket
                .connect(eoa1)
                .addCollateral(
                    deployer.address,
                    deployer.address,
                    false,
                    valShare,
                ),
        ).to.be.revertedWithCustomError(wethBigBangMarket, 'NotApproved');

        await wethBigBangMarket.updateOperator(eoa1.address, true);

        await expect(
            wethBigBangMarket
                .connect(eoa1)
                .addCollateral(
                    deployer.address,
                    deployer.address,
                    false,
                    valShare,
                ),
        ).to.not.be.revertedWithCustomError;
    });

    it('should batch calls', async () => {
        const {
            wethBigBangMarket,
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
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

        const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        await weth.freeMint(wethMintVal);
        const valShare = await yieldBox.toShare(
            wethAssetId,
            wethMintVal,
            false,
        );
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await yieldBox.depositAsset(
            wethAssetId,
            deployer.address,
            deployer.address,
            0,
            valShare,
        );

        const addCollateralEncoded =
            wethBigBangMarket.interface.encodeFunctionData('addCollateral', [
                deployer.address,
                deployer.address,
                false,
                valShare,
            ]);
        const borrowEncoded = wethBigBangMarket.interface.encodeFunctionData(
            'borrow',
            [deployer.address, deployer.address, usdoBorrowVal],
        );

        await wethBigBangMarket.execute(
            [addCollateralEncoded, borrowEncoded],
            true,
        );

        const userBorrowPart = await wethBigBangMarket.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.gt(0)).to.be.true;
    });

    it('should test liquidator rewards & closing factor', async () => {
        const {
            bar,
            wethBigBangMarket,
            weth,
            wethAssetId,
            yieldBox,
            eoa1,
            usd0WethOracle,
            __usd0WethPrice,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const borrowFeeUpdateFn =
            wethBigBangMarket.interface.encodeFunctionData(
                'updateBorrowingFee',
                [5e2],
            );
        await bar.executeMarketFn(
            [wethBigBangMarket.address],
            [borrowFeeUpdateFn],
            true,
        );

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethBigBangMarket.address, true);

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
        await wethBigBangMarket
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(30)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        //30%
        await wethBigBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        await wethBigBangMarket.updateExchangeRate();
        let exchangeRate = await wethBigBangMarket.exchangeRate();
        let reward = await wethBigBangMarket.computeLiquidatorReward(
            eoa1.address,
            exchangeRate,
        );
        expect(reward.eq(0)).to.be.true;

        //60%
        await wethBigBangMarket
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
        reward = await wethBigBangMarket.computeLiquidatorReward(
            eoa1.address,
            exchangeRate,
        );
        expect(reward.eq(0)).to.be.true;

        //25% price drop
        let priceDrop = __usd0WethPrice.mul(25).div(100);
        await usd0WethOracle.set(__usd0WethPrice.add(priceDrop));
        await wethBigBangMarket.updateExchangeRate();
        exchangeRate = await wethBigBangMarket.exchangeRate();

        let prevClosingFactor;
        let closingFactor = await wethBigBangMarket.computeClosingFactor(
            eoa1.address,
            exchangeRate,
        );
        expect(closingFactor.gt(0)).to.be.true;
        prevClosingFactor = closingFactor;

        let prevReward;
        reward = await wethBigBangMarket.computeLiquidatorReward(
            eoa1.address,
            exchangeRate,
        );
        prevReward = reward;
        expect(reward.gt(0)).to.be.true;

        priceDrop = __usd0WethPrice.mul(35).div(100);
        await usd0WethOracle.set(__usd0WethPrice.add(priceDrop));
        await wethBigBangMarket.updateExchangeRate();
        exchangeRate = await wethBigBangMarket.exchangeRate();
        reward = await wethBigBangMarket.computeLiquidatorReward(
            eoa1.address,
            exchangeRate,
        );
        expect(reward.lt(prevReward)).to.be.true;
        prevReward = reward;
        closingFactor = await wethBigBangMarket.computeClosingFactor(
            eoa1.address,
            exchangeRate,
        );
        expect(closingFactor.gt(prevClosingFactor)).to.be.true;
        prevClosingFactor = closingFactor;

        priceDrop = __usd0WethPrice.mul(50).div(100);
        await usd0WethOracle.set(__usd0WethPrice.add(priceDrop));
        await wethBigBangMarket.updateExchangeRate();
        exchangeRate = await wethBigBangMarket.exchangeRate();
        reward = await wethBigBangMarket.computeLiquidatorReward(
            eoa1.address,
            exchangeRate,
        );
        expect(reward.lt(prevReward)).to.be.true;
        prevReward = reward;
        closingFactor = await wethBigBangMarket.computeClosingFactor(
            eoa1.address,
            exchangeRate,
        );
        expect(closingFactor.gt(prevClosingFactor)).to.be.true;
        prevClosingFactor = closingFactor;

        priceDrop = __usd0WethPrice.mul(60).div(100);
        await usd0WethOracle.set(__usd0WethPrice.add(priceDrop));
        await wethBigBangMarket.updateExchangeRate();
        exchangeRate = await wethBigBangMarket.exchangeRate();
        reward = await wethBigBangMarket.computeLiquidatorReward(
            eoa1.address,
            exchangeRate,
        );
        expect(reward.lt(prevReward)).to.be.true;
        prevReward = reward;
        closingFactor = await wethBigBangMarket.computeClosingFactor(
            eoa1.address,
            exchangeRate,
        );
        expect(closingFactor.gt(prevClosingFactor)).to.be.true;
        prevClosingFactor = closingFactor;
    });
});
