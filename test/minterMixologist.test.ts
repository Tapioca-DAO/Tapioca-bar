import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';

describe('MinterMixologist test', () => {
    it('should test initial values', async () => {
        const { wethMinterMixologist, usd0, bar, weth, wethAssetId } =
            await loadFixture(register);

        const savedAssetId = await wethMinterMixologist.assetId();
        const beachBarUsd0Id = await bar.usdoAssetId();
        expect(savedAssetId.eq(beachBarUsd0Id)).to.be.true;

        const savedAsset = await wethMinterMixologist.asset();
        const barUsd0 = await bar.usdoToken();
        expect(barUsd0.toLowerCase()).eq(savedAsset.toLowerCase());

        const savedCollateralId = await wethMinterMixologist.collateralId();
        expect(savedCollateralId.eq(wethAssetId)).to.be.true;

        const savedCollateral = await wethMinterMixologist.collateral();
        expect(weth.address.toLowerCase()).eq(savedCollateral.toLowerCase());

        const borrowingFee = await wethMinterMixologist.borrowingFee();
        expect(borrowingFee.eq(0)).to.be.true;
    });

    it('should add collateral', async () => {
        const { wethMinterMixologist, weth, wethAssetId, yieldBox, deployer } =
            await loadFixture(register);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethMinterMixologist.address, true);

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
        await wethMinterMixologist.addCollateral(
            deployer.address,
            deployer.address,
            false,
            valShare,
        );

        let collateralShares = await wethMinterMixologist.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.gt(0)).to.be.true;
        expect(collateralShares.eq(valShare)).to.be.true;

        await wethMinterMixologist.removeCollateral(
            deployer.address,
            deployer.address,
            collateralShares,
        );

        collateralShares = await wethMinterMixologist.userCollateralShare(
            deployer.address,
        );
        expect(collateralShares.eq(0)).to.be.true;
    });

    it('should borrow and repay', async () => {
        const {
            wethMinterMixologist,
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
        await yieldBox.setApprovalForAll(wethMinterMixologist.address, true);

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
        await wethMinterMixologist.addCollateral(
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

        await wethMinterMixologist.borrow(
            deployer.address,
            deployer.address,
            usdoBorrowVal,
        );

        let userBorrowPart = await wethMinterMixologist.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.gt(0)).to.be.true;

        const usd0Balance = await yieldBox.toAmount(
            await bar.usdoAssetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethMinterMixologist.assetId(),
            ),
            false,
        );
        expect(usd0Balance.gt(0)).to.be.true;
        expect(usd0Balance.eq(usdoBorrowVal)).to.be.true;

        timeTravel(10 * 86400);

        //repay
        userBorrowPart = await wethMinterMixologist.userBorrowPart(
            deployer.address,
        );
        await expect(
            wethMinterMixologist.repay(
                deployer.address,
                deployer.address,
                userBorrowPart,
            ),
        ).to.be.reverted;

        const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(500);
        await usd0.mint(deployer.address, usd0Extra);
        await usd0.approve(yieldBox.address, usd0Extra);
        await yieldBox.depositAsset(
            await wethMinterMixologist.assetId(),
            deployer.address,
            deployer.address,
            usd0Extra,
            0,
        );
        await wethMinterMixologist.repay(
            deployer.address,
            deployer.address,
            userBorrowPart,
        );
        userBorrowPart = await wethMinterMixologist.userBorrowPart(
            deployer.address,
        );
        expect(userBorrowPart.eq(0)).to.be.true;
    });

    it('should liquidate', async () => {
        const {
            wethMinterMixologist,
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
        await yieldBox.setApprovalForAll(wethMinterMixologist.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethMinterMixologist.address, true);

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
        await wethMinterMixologist
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        const usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await wethMinterMixologist
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

        // Can't liquidate
        const swapData = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        await expect(
            wethMinterMixologist.liquidate(
                [eoa1.address],
                [usdoBorrowVal],
                multiSwapper.address,
                swapData,
            ),
        ).to.be.reverted;

        const priceDrop = __usd0WethPrice.mul(15).div(10).div(100);
        await usd0WethOracle.set(__usd0WethPrice.add(priceDrop));

        const userCollateralShareBefore =
            await wethMinterMixologist.userCollateralShare(eoa1.address);

        const liquidatorAmountBefore = await yieldBox.toAmount(
            await wethMinterMixologist.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethMinterMixologist.assetId(),
            ),
            false,
        );

        const borrowPart = await wethMinterMixologist.userBorrowPart(
            eoa1.address,
        );
        await expect(
            wethMinterMixologist.liquidate(
                [eoa1.address],
                [borrowPart],
                multiSwapper.address,
                swapData,
            ),
        ).to.not.be.reverted;

        const liquidatorAmountAfter = await yieldBox.toAmount(
            await wethMinterMixologist.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethMinterMixologist.assetId(),
            ),
            false,
        );

        expect(liquidatorAmountAfter.gt(liquidatorAmountBefore)).to.be.true;

        const userCollateralShareAfter =
            await wethMinterMixologist.userCollateralShare(eoa1.address);
        expect(userCollateralShareBefore.gt(userCollateralShareAfter)).to.be
            .true;

        const userBorrowPartAfter = await wethMinterMixologist.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowPartAfter.eq(0)).to.be.true;
    });

    it('should update borrowing fee and withdraw fees with partial repayment', async () => {
        const {
            bar,
            wethMinterMixologist,
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
        await wethMinterMixologist
            .connect(deployer)
            .updateBorrowingFee(feeAmount);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethMinterMixologist.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethMinterMixologist.address, true);

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
        await wethMinterMixologist
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethMinterMixologist
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal),
        ).to.be.revertedWith('Mx: insolvent');

        const totalSupplyBefore = await usd0.totalSupply();

        usdoBorrowVal = wethMintVal
            .mul(10)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        await wethMinterMixologist
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
        const userBorrowPart = await wethMinterMixologist.userBorrowPart(
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
        const wethMinterBalance = await wethMinterMixologist.balanceOf(
            feeToAddress,
        );
        expect(wethMinterBalance.eq(0)).to.be.true;

        let yieldBoxBalanceOfFeeToInAsset = await yieldBox.toAmount(
            await wethMinterMixologist.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethMinterMixologist.assetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeToInAsset.eq(0)).to.be.true;

        const feeVeTap = await bar.feeVeTap();
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
                await wethMinterMixologist.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );

        let userBorrowedAmount = await wethMinterMixologist.userBorrowPart(
            eoa1.address,
        );
        const repaymentAmount = userBorrowedAmount.div(10);

        await wethMinterMixologist
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, repaymentAmount);
        userBorrowedAmount = await wethMinterMixologist.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowedAmount.gt(0)).to.be.true;

        //deposit fees to yieldBox
        await expect(
            wethMinterMixologist.depositFeesToYieldBox(
                multiSwapper.address,
                {
                    minAssetAmount: ethers.BigNumber.from((1e18).toString()),
                },
                userBorrowedAmount,
            ),
        ).to.be.revertedWith('Mx: Amount too big');

        await expect(
            wethMinterMixologist.depositFeesToYieldBox(
                multiSwapper.address,
                {
                    minAssetAmount: ethers.BigNumber.from((1e18).toString()),
                },
                repaymentAmount.mul(2),
            ),
        ).to.be.revertedWith('Mx: Not enough tokens');

        await expect(
            wethMinterMixologist.depositFeesToYieldBox(
                multiSwapper.address,
                {
                    minAssetAmount: ethers.BigNumber.from((1e18).toString()),
                },
                repaymentAmount,
            ),
        ).to.emit(wethMinterMixologist, 'LogYieldBoxFeesDeposit');

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
            wethMinterMixologist,
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
        await wethMinterMixologist
            .connect(deployer)
            .updateBorrowingFee(feeAmount);

        await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox.setApprovalForAll(wethMinterMixologist.address, true);

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(wethMinterMixologist.address, true);

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
        await wethMinterMixologist
            .connect(eoa1)
            .addCollateral(eoa1.address, eoa1.address, false, valShare);

        //borrow
        let usdoBorrowVal = wethMintVal
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await expect(
            wethMinterMixologist
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal),
        ).to.be.revertedWith('Mx: insolvent');

        const totalSupplyBefore = await usd0.totalSupply();

        usdoBorrowVal = wethMintVal
            .mul(10)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));
        await wethMinterMixologist
            .connect(eoa1)
            .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
        const userBorrowPart = await wethMinterMixologist.userBorrowPart(
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
        const wethMinterBalance = await wethMinterMixologist.balanceOf(
            feeToAddress,
        );
        expect(wethMinterBalance.eq(0)).to.be.true;

        let yieldBoxBalanceOfFeeToInAsset = await yieldBox.toAmount(
            await wethMinterMixologist.assetId(),
            await yieldBox.balanceOf(
                deployer.address,
                await wethMinterMixologist.assetId(),
            ),
            false,
        );
        expect(yieldBoxBalanceOfFeeToInAsset.eq(0)).to.be.true;

        const feeVeTap = await bar.feeVeTap();
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
                await wethMinterMixologist.assetId(),
                eoa1.address,
                eoa1.address,
                usd0Extra,
                0,
            );

        let userBorrowedAmount = await wethMinterMixologist.userBorrowPart(
            eoa1.address,
        );

        await wethMinterMixologist
            .connect(eoa1)
            .repay(eoa1.address, eoa1.address, userBorrowedAmount);
        userBorrowedAmount = await wethMinterMixologist.userBorrowPart(
            eoa1.address,
        );
        expect(userBorrowedAmount.eq(0)).to.be.true;

        //deposit fees to yieldBox
        const accruedFees = (await wethMinterMixologist.accrueInfo())[2];
        await expect(
            wethMinterMixologist.depositFeesToYieldBox(
                multiSwapper.address,
                {
                    minAssetAmount: ethers.BigNumber.from((1e18).toString()),
                },
                accruedFees,
            ),
        ).to.emit(wethMinterMixologist, 'LogYieldBoxFeesDeposit');

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

    
});
