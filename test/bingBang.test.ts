import hre, { ethers, network } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';

describe('BingBang test', () => {
    it('should test initial values', async () => {
        const { wethMinterSingularity, usd0, bar, weth, wethAssetId } =
            await loadFixture(register);

        const savedAssetId = await wethMinterSingularity.assetId();
        const penroseUsd0Id = await bar.usdoAssetId();
        expect(savedAssetId.eq(penroseUsd0Id)).to.be.true;

        const savedAsset = await wethMinterSingularity.asset();
        const barUsd0 = await bar.usdoToken();
        expect(barUsd0.toLowerCase()).eq(savedAsset.toLowerCase());

        const savedCollateralId = await wethMinterSingularity.collateralId();
        expect(savedCollateralId.eq(wethAssetId)).to.be.true;

        const savedCollateral = await wethMinterSingularity.collateral();
        expect(weth.address.toLowerCase()).eq(savedCollateral.toLowerCase());

        const borrowingFee = await wethMinterSingularity.borrowingFee();
        expect(borrowingFee.eq(0)).to.be.true;
    });

    it('should add collateral', async () => {
        const {
            wethMinterSingularity,
            weth,
            wethAssetId,
            yieldBox,
            deployer,
            eoa1,
        } = await loadFixture(register);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethMinterSingularity.address, true);

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
            wethMinterSingularity
                .connect(eoa1)
                .addCollateral(
                    deployer.address,
                    deployer.address,
                    false,
                    valShare,
                ),
        ).to.be.reverted;
        await wethMinterSingularity.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        let collateralShares = await wethMinterSingularity.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.gt(0)).to.be.true;
        expect(collateralShares.eq(valShare)).to.be.true;

        await wethMinterSingularity.removeCollateral(
            deployer.address,
            deployer.address,
            collateralShares,
        );

        collateralShares = await wethMinterSingularity.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.eq(0)).to.be.true;
    });

    it('should borrow and repay', async () => {
        const {
            wethMinterSingularity,
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
        await yieldBox.setApprovalForAll(wethMinterSingularity.address, true);

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
        await wethMinterSingularity.addCollateral(
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

        await wethMinterSingularity.borrow(
            deployer.address,
            deployer.address,
            usdoBorrowVal,
        );

        let userBorrowPart = await wethMinterSingularity.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.gt(0)).to.be.true;

        const usd0Balance = await yieldBox.toAmount(
            await bar.usdoAssetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethMinterSingularity.assetId(),
            ),
            false,
        );
        expect(usd0Balance.gt(0)).to.be.true;
        expect(usd0Balance.eq(usdoBorrowVal)).to.be.true;

        timeTravel(10 * 86400);

        //repay
        userBorrowPart = await wethMinterSingularity.userBorrowPart(
            deployer.address,
        );
        await expect(
            wethMinterSingularity.repay(
                deployer.address,
                deployer.address,
                userBorrowPart,
            ),
        ).to.be.reverted;

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(500);
        await usd0.mint(deployer.address, usd0Extra);
        await usd0.approve(yieldBox.address, usd0Extra);
        await yieldBox.depositAsset(
            await wethMinterSingularity.assetId(),
            deployer.address,
            deployer.address,
            usd0Extra,
            0,
        );
        await wethMinterSingularity.repay(
            deployer.address,
            deployer.address,
            userBorrowPart,
        );
        userBorrowPart = await wethMinterSingularity.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.eq(0)).to.be.true;
    });

    it('should liquidate', async () => {
        const {
            wethMinterSingularity,
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
        await yieldBox.setApprovalForAll(wethMinterSingularity.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethMinterSingularity.address, true);

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
        await wethMinterSingularity
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await wethMinterSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        // Can't liquidate
        const swapData = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        await expect(
            wethMinterSingularity.liquidate(
                [eoa1.address],
                [usdoBorrowVal],
                multiSwapper.address,
                swapData,
            ),
        ).to.be.reverted;

        const priceDrop = __usd0WethPrice.mul(15).div(10).div(100);
        await usd0WethOracle.set(__usd0WethPrice.add(priceDrop));

        const userCollateralShareBefore =
            await wethMinterSingularity.userCollateralShare(eoa1.address);

        const liquidatorAmountBefore = await yieldBox.toAmount(
            await wethMinterSingularity.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethMinterSingularity.assetId(),
            ),
            false,
        );

        const borrowPart = await wethMinterSingularity.userBorrowPart(
            eoa1.address,
        );
        await expect(
            wethMinterSingularity.liquidate(
                [eoa1.address],
                [borrowPart],
                ethers.constants.AddressZero,
                swapData,
            ),
        ).to.be.reverted;
        await expect(
            wethMinterSingularity.liquidate(
                [eoa1.address],
                [borrowPart],
                multiSwapper.address,
                swapData,
            ),
        ).to.not.be.reverted;
        await expect(
            wethMinterSingularity.liquidate(
                [eoa1.address],
                [borrowPart],
                ethers.constants.AddressZero,
                [],
            ),
        ).to.be.reverted;
        const liquidatorAmountAfter = await yieldBox.toAmount(
            await wethMinterSingularity.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethMinterSingularity.assetId(),
            ),
            false,
        );

        expect(liquidatorAmountAfter.gt(liquidatorAmountBefore)).to.be.true;

        const userCollateralShareAfter =
            await wethMinterSingularity.userCollateralShare(eoa1.address);
        expect(userCollateralShareBefore.gt(userCollateralShareAfter)).to.be
            .true;

        const userBorrowPartAfter = await wethMinterSingularity.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowPartAfter.eq(0)).to.be.true;
    });

    it('should update borrowing fee and withdraw fees with partial repayment', async () => {
        const {
            bar,
            wethMinterSingularity,
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
        await wethMinterSingularity
            .connect(deployer)
            .updateBorrowingFee(feeAmount);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethMinterSingularity.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethMinterSingularity.address, true);

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
        await wethMinterSingularity
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethMinterSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal),
        ).to.be.revertedWith('SGL: insolvent');

        const totalSupplyBefore = await usd0.totalSupply();

        usdoBorrowVal = wethMintVal
            .mul(10)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        await wethMinterSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
        const userBorrowPart = await wethMinterSingularity.userBorrowPart(
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
        const wethMinterBalance = await wethMinterSingularity.balanceOf(
            feeToAddress,
        );
        expect(wethMinterBalance.eq(0)).to.be.true;

        let yieldBoxBalanceOfFeeToInAsset = await yieldBox.toAmount(
            await wethMinterSingularity.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethMinterSingularity.assetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeToInAsset.eq(0)).to.be.true;

        const feeVeTap = await bar.feeTo();
        const tapAssetId = await bar.tapAssetId();
        let yieldBoxBalanceOfFeeVeTap = await yieldBox.toAmount(
            tapAssetId,
            await yieldBox.balanceOf(feeVeTap, tapAssetId),
            false,
        );
        expect(yieldBoxBalanceOfFeeVeTap.eq(0)).to.be.true;

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(600);
        await usd0.connect(deployer).mint(eoa1.address, usd0Extra);
        await usd0.connect(eoa1).approve(yieldBox.address, usd0Extra);
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                await wethMinterSingularity.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );

        timeTravel(100 * 86400);

        let userBorrowedAmount = await wethMinterSingularity.userBorrowPart(
            eoa1.address,
        );
        const repaymentAmount = userBorrowedAmount.div(10);

        await wethMinterSingularity
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, repaymentAmount);
        userBorrowedAmount = await wethMinterSingularity.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowedAmount.gt(0)).to.be.true;

        await expect(
            wethMinterSingularity.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: ethers.BigNumber.from((1e10).toString()),
            }),
        ).to.emit(wethMinterSingularity, 'LogYieldBoxFeesDeposit');

        yieldBoxBalanceOfFeeVeTap = await yieldBox.toAmount(
            tapAssetId,
            await yieldBox.balanceOf(feeVeTap, tapAssetId),
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
            wethMinterSingularity,
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
        await wethMinterSingularity
            .connect(deployer)
            .updateBorrowingFee(feeAmount);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethMinterSingularity.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethMinterSingularity.address, true);

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
        await wethMinterSingularity
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethMinterSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal),
        ).to.be.revertedWith('SGL: insolvent');

        const totalSupplyBefore = await usd0.totalSupply();

        usdoBorrowVal = wethMintVal
            .mul(10)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        await wethMinterSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
        const userBorrowPart = await wethMinterSingularity.userBorrowPart(
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
        const wethMinterBalance = await wethMinterSingularity.balanceOf(
            feeToAddress,
        );
        expect(wethMinterBalance.eq(0)).to.be.true;

        let yieldBoxBalanceOfFeeToInAsset = await yieldBox.toAmount(
            await wethMinterSingularity.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethMinterSingularity.assetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeToInAsset.eq(0)).to.be.true;

        const feeVeTap = await bar.feeTo();
        const tapAssetId = await bar.tapAssetId();
        let yieldBoxBalanceOfFeeVeTap = await yieldBox.toAmount(
            tapAssetId,
            await yieldBox.balanceOf(feeVeTap, tapAssetId),
            false,
        );
        expect(yieldBoxBalanceOfFeeVeTap.eq(0)).to.be.true;

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(600);
        await usd0.connect(deployer).mint(eoa1.address, usd0Extra);
        await usd0.connect(eoa1).approve(yieldBox.address, usd0Extra);
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                await wethMinterSingularity.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );

        let userBorrowedAmount = await wethMinterSingularity.userBorrowPart(
            eoa1.address,
        );

        await wethMinterSingularity
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, userBorrowedAmount);
        userBorrowedAmount = await wethMinterSingularity.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowedAmount.eq(0)).to.be.true;

        //deposit fees to yieldBox
        await expect(
            wethMinterSingularity.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: ethers.BigNumber.from((1e10).toString()),
            }),
        ).to.emit(wethMinterSingularity, 'LogYieldBoxFeesDeposit');

        yieldBoxBalanceOfFeeVeTap = await yieldBox.toAmount(
            tapAssetId,
            await yieldBox.balanceOf(feeVeTap, tapAssetId),
            false,
        );
        expect(yieldBoxBalanceOfFeeVeTap.gt(0)).to.be.true;
        expect(
            usdoBorrowValWithFee
                .sub(usdoBorrowVal)
                .gte(yieldBoxBalanceOfFeeVeTap),
        ).to.be.true;
    });

    it('should have multiple borrowers and check fees accrued over time', async () => {
        const {
            wethMinterSingularity,
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

        await wethMinterSingularity.updateBorrowingFee(5e2); //0.5%

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
                .setApprovalForAll(wethMinterSingularity.address, true);

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
            await wethMinterSingularity
                .connect(eoa)
                .addCollateral(eoa.address, eoa.address, false, valShare);
        }

        timeTravel(86400 * 5);
        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];

            await wethMinterSingularity
                .connect(eoa)
                .borrow(eoa.address, eoa.address, usdoBorrowVal);

            timeTravel(10 * 86400);
        }

        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const userBorrowPart = await wethMinterSingularity.userBorrowPart(
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
                    await wethMinterSingularity.assetId(),
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
                    await wethMinterSingularity.assetId(),
                    eoa.address,
                    eoa.address,
                    usd0Extra,
                    0,
                );

            const userBorrowedAmount =
                await wethMinterSingularity.userBorrowPart(eoa.address);

            await wethMinterSingularity
                .connect(eoa)
                .repay(eoa.address, eoa.address, userBorrowedAmount);
        }

        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const usd0Balance = await yieldBox.toAmount(
                await bar.usdoAssetId(),
                await yieldBox.balanceOf(
                    eoa.address,
                    await wethMinterSingularity.assetId(),
                ),
                false,
            );
            expect(usd0Balance.lt(usd0Extra)).to.be.true;

            const userBorrowPart = await wethMinterSingularity.userBorrowPart(
                eoa.address,
            );
            expect(userBorrowPart.eq(0)).to.be.true;
        }

        //----------------
        const yieldBoxBalanceOfFeeVeTapBefore = await yieldBox.toAmount(
            await bar.tapAssetId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await bar.tapAssetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeVeTapBefore.eq(0)).to.be.true;

        //deposit fees to yieldBox
        await expect(
            wethMinterSingularity.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: ethers.BigNumber.from((1e18).toString()),
            }),
        ).to.emit(wethMinterSingularity, 'LogYieldBoxFeesDeposit');

        const yieldBoxBalanceOfFeeVeTap = await yieldBox.toAmount(
            await bar.tapAssetId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await bar.tapAssetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeVeTap.gt(0)).to.be.true;
    });

    it('should have multiple borrowers, do partial repayments and check fees accrued over time', async () => {
        const {
            wethMinterSingularity,
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

        await wethMinterSingularity.updateBorrowingFee(5e2); //0.5%

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
                .setApprovalForAll(wethMinterSingularity.address, true);

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
            await wethMinterSingularity
                .connect(eoa)
                .addCollateral(eoa.address, eoa.address, false, valShare);
        }

        timeTravel(86400 * 5);
        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];

            await wethMinterSingularity
                .connect(eoa)
                .borrow(eoa.address, eoa.address, usdoBorrowVal);

            timeTravel(10 * 86400);
        }

        for (var i = 0; i < eoas.length; i++) {
            const eoa = eoas[i];
            const userBorrowPart = await wethMinterSingularity.userBorrowPart(
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
                    await wethMinterSingularity.assetId(),
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
                    await wethMinterSingularity.assetId(),
                    eoa.address,
                    eoa.address,
                    usd0Extra,
                    0,
                );

            const userBorrowedAmount =
                await wethMinterSingularity.userBorrowPart(eoa.address);

            await wethMinterSingularity
                .connect(eoa)
                .repay(eoa.address, eoa.address, userBorrowedAmount.div(2));
        }

        //----------------
        const yieldBoxBalanceOfFeeVeTapBefore = await yieldBox.toAmount(
            await bar.tapAssetId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await bar.tapAssetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeVeTapBefore.eq(0)).to.be.true;

        //deposit fees to yieldBox
        await expect(
            wethMinterSingularity.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: ethers.BigNumber.from((1e18).toString()),
            }),
        ).to.emit(wethMinterSingularity, 'LogYieldBoxFeesDeposit');

        const yieldBoxBalanceOfFeeVeTap = await yieldBox.toAmount(
            await bar.tapAssetId(),
            await yieldBox.balanceOf(
                await bar.feeTo(),
                await bar.tapAssetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeVeTap.gt(0)).to.be.true;

        for (var i = 0; i < eoas.length; i++) {
            timeTravel(10 * 86400);
            const eoa = eoas[i];

            await usd0.connect(deployer).mint(eoa.address, usd0Extra);
            await usd0.connect(eoa).approve(yieldBox.address, usd0Extra);
            await yieldBox
                .connect(eoa)
                .depositAsset(
                    await wethMinterSingularity.assetId(),
                    eoa.address,
                    eoa.address,
                    usd0Extra,
                    0,
                );

            const userBorrowedAmount =
                await wethMinterSingularity.userBorrowPart(eoa.address);

            await wethMinterSingularity
                .connect(eoa)
                .repay(eoa.address, eoa.address, userBorrowedAmount);
        }

        const balance = await usd0.balanceOf(wethMinterSingularity.address);
        await expect(
            wethMinterSingularity.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: ethers.BigNumber.from((1e18).toString()),
            }),
        ).to.emit(wethMinterSingularity, 'LogYieldBoxFeesDeposit');

        const yieldBoxFinalBalanceOfFeeVeTap = await yieldBox.toAmount(
              await bar.tapAssetId(),
              await yieldBox.balanceOf(
              await bar.feeTo(),
              await bar.tapAssetId(),
            ),
            false,
        );
        expect(yieldBoxFinalBalanceOfFeeVeTap.gt(yieldBoxBalanceOfFeeVeTap)).to
            .be.true;
    });

    it('should perform multiple borrow operations, repay everything and withdraw fees', async () => {
        const {
            bar,
            wethMinterSingularity,
            weth,
            usd0,
            wethAssetId,
            yieldBox,
            eoa1,
            multiSwapper,
            timeTravel,
            __wethUsdcPrice,
        } = await loadFixture(register);

        await wethMinterSingularity.updateBorrowingFee(5e2); //0.5%

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethMinterSingularity.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethMinterSingularity.address, true);

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
        await wethMinterSingularity
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = wethMintVal
            .div(10)
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        //borrow 1
        await wethMinterSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        //borrow 2
        await wethMinterSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        //borrow 3
        await wethMinterSingularity
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        let userBorrowPart = await wethMinterSingularity.userBorrowPart(
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
                await wethMinterSingularity.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );
        await wethMinterSingularity
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, userBorrowPart);
        userBorrowPart = await wethMinterSingularity.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowPart.eq(0)).to.be.true;

        await wethMinterSingularity.depositFeesToYieldBox(
            multiSwapper.address,
            {
                minAssetAmount: 1,
            },
        );

        const feeVeTap = await bar.feeTo();
        const yieldBoxBalanceOfFeeVeTapShare = await yieldBox.balanceOf(
            feeVeTap,
            await bar.tapAssetId(),
        );
        const yieldBoxBalanceOfFeeVeTapAmount = await yieldBox.toAmount(
            await bar.tapAssetId(),
            yieldBoxBalanceOfFeeVeTapShare,
            false,
        );

        expect(yieldBoxBalanceOfFeeVeTapAmount.gt(0)).to.be.true;
    });

    it('should allow initialization with wrong values', async () => {
        const { bar } = await loadFixture(register);

        const minterFactory = await ethers.getContractFactory(
            'BingBang',
        );

        await expect(
            minterFactory.deploy(
                bar.address,
                ethers.constants.AddressZero,
                1,
                ethers.constants.AddressZero,
                [],
                [],
            ),
        ).to.be.revertedWith('SGL: bad pair');
    });

    it('should not allow depositing fees with invalid swapper', async () => {
        const { wethMinterSingularity, multiSwapper } = await loadFixture(
            register,
        );

        await expect(
            wethMinterSingularity.depositFeesToYieldBox(
                ethers.constants.AddressZero,
                { minAssetAmount: 1 },
            ),
        ).to.be.revertedWith('SGL: Invalid swapper');

        await expect(
            wethMinterSingularity.depositFeesToYieldBox(multiSwapper.address, {
                minAssetAmount: 1,
            }),
        ).to.not.emit(wethMinterSingularity, 'LogYieldBoxFeesDeposit');
    });

    it('should test setters', async () => {
        const { wethMinterSingularity, collateralSwapPath, tapSwapPath, eoa1 } =
            await loadFixture(register);

        await expect(
            wethMinterSingularity
                .connect(eoa1)
                .setCollateralSwapPath(collateralSwapPath),
        ).to.be.reverted;
        await expect(
            wethMinterSingularity.connect(eoa1).setTapSwapPath(tapSwapPath),
        ).to.be.reverted;
        await expect(wethMinterSingularity.connect(eoa1).setBorrowCap(100)).to
            .be.reverted;
        await expect(
            wethMinterSingularity.connect(eoa1).updateStabilityFee(100),
        ).to.be.reverted;
        await expect(
            wethMinterSingularity.updateStabilityFee(
                ethers.utils.parseEther('1'),
            ),
        ).to.be.revertedWith('SGL: value not valid');
        await expect(
            wethMinterSingularity.connect(eoa1).updateBorrowingFee(100),
        ).to.be.reverted;
        await expect(
            wethMinterSingularity.updateBorrowingFee(1e5),
        ).to.be.revertedWith('SGL: value not valid');

        await expect(
            wethMinterSingularity.setCollateralSwapPath(collateralSwapPath),
        ).to.emit(wethMinterSingularity, 'LogCollateralSwapPath');
        await expect(wethMinterSingularity.setTapSwapPath(tapSwapPath)).to.emit(
            wethMinterSingularity,
            'LogTapSwapPath',
        );
        await expect(wethMinterSingularity.setBorrowCap(100)).to.emit(
            wethMinterSingularity,
            'LogBorrowCapUpdated',
        );
        await expect(wethMinterSingularity.updateStabilityFee(100)).to.emit(
            wethMinterSingularity,
            'LogStabilityFee',
        );
        await expect(wethMinterSingularity.updateBorrowingFee(100)).to.emit(
            wethMinterSingularity,
            'LogBorrowingFee',
        );
    });

    it('should not be able to borrow when cap is reached', async () => {
        const {
            wethMinterSingularity,
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
        await yieldBox.setApprovalForAll(wethMinterSingularity.address, true);

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
        await wethMinterSingularity.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        await wethMinterSingularity.setBorrowCap(1);
        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethMinterSingularity.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            ),
        ).to.be.revertedWith('SGL: borrow cap reached');
    });
});
