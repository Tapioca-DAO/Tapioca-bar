import hre, { ethers, network } from 'hardhat';
import { expect } from 'chai';
import { BN, register } from './test.utils';
import {
    loadFixture,
    setBalance,
} from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import { bigBang } from '../typechain/contracts/markets';
import { formatUnits } from 'ethers/lib/utils';
import {
    ERC20Mock,
    MockSwapper__factory,
} from '../gitsub_tapioca-sdk/src/typechain/tapioca-mocks';
import { YieldBox } from '../gitsub_tapioca-sdk/src/typechain/YieldBox';
import { BigBang } from '../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { BigNumber } from 'ethers';

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

        const borrowingFee = await wethBigBangMarket.borrowOpeningFee();
        expect(borrowingFee.eq(50)).to.be.true;
    });

    describe('addCollateral()', () => {
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

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                0,
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
    });

    describe('borrow() & repay()', () => {
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

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                0,
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
    });

    describe('liquidate()', () => {
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
                    'setMarketConfig',
                    [
                        5e2,
                        ethers.constants.AddressZero,
                        ethers.utils.toUtf8Bytes(''),
                        ethers.constants.AddressZero,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                    ],
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

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            await weth.connect(eoa1).freeMint(wethMintVal);
            const valShare = await yieldBox.toShare(
                wethAssetId,
                wethMintVal,
                false,
            );
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    wethAssetId,
                    eoa1.address,
                    eoa1.address,
                    0,
                    valShare,
                );
            await wethBigBangMarket
                .connect(eoa1)
                .addCollateral(eoa1.address, eoa1.address, false, 0, valShare);

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
                await wethBigBangMarket.userBorrowPart(eoa1.address),
                (
                    await wethBigBangMarket.computeTVLInfo(
                        eoa1.address,
                        exchangeRate,
                    )
                )[2],
                18,
                18,
                5,
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
                await wethBigBangMarket.userBorrowPart(eoa1.address),
                (
                    await wethBigBangMarket.computeTVLInfo(
                        eoa1.address,
                        exchangeRate,
                    )
                )[2],
                18,
                18,
                5,
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
                await wethBigBangMarket.userBorrowPart(eoa1.address),
                (
                    await wethBigBangMarket.computeTVLInfo(
                        eoa1.address,
                        exchangeRate,
                    )
                )[2],
                18,
                18,
                5,
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
                await wethBigBangMarket.userBorrowPart(eoa1.address),
                (
                    await wethBigBangMarket.computeTVLInfo(
                        eoa1.address,
                        exchangeRate,
                    )
                )[2],
                18,
                18,
                5,
            );
            expect(closingFactor.gt(prevClosingFactor)).to.be.true;
            prevClosingFactor = closingFactor;
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

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            await weth.connect(eoa1).freeMint(wethMintVal);
            const valShare = await yieldBox.toShare(
                wethAssetId,
                wethMintVal,
                false,
            );
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    wethAssetId,
                    eoa1.address,
                    eoa1.address,
                    0,
                    valShare,
                );
            await wethBigBangMarket
                .connect(eoa1)
                .addCollateral(eoa1.address, eoa1.address, false, 0, valShare);

            //borrow
            const usdoBorrowVal = wethMintVal
                .mul(74)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            await wethBigBangMarket
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

            // Can't liquidate
            const swapData = new ethers.utils.AbiCoder().encode(
                ['uint256'],
                [1],
            );
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
                await wethBigBangMarket.userBorrowPart(eoa1.address),
                (
                    await wethBigBangMarket.computeTVLInfo(
                        eoa1.address,
                        exchangeRate,
                    )
                )[2],
                18,
                18,
                5,
            );

            const liquidationBonus =
                await wethBigBangMarket.liquidationBonusAmount();
            const borrowPart = await wethBigBangMarket.userBorrowPart(
                eoa1.address,
            );

            expect(closingFactor.gt(0)).to.be.true;

            await expect(
                wethBigBangMarket.liquidate(
                    [eoa1.address],
                    [borrowPart],
                    multiSwapper.address,
                    swapData,
                ),
            ).to.not.be.reverted;

            return;
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
    });

    describe('fees', () => {
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
                    'setMarketConfig',
                    [
                        feeAmount,
                        ethers.constants.AddressZero,
                        ethers.utils.toUtf8Bytes(''),
                        ethers.constants.AddressZero,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                    ],
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

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            await weth.connect(eoa1).freeMint(wethMintVal);
            const valShare = await yieldBox.toShare(
                wethAssetId,
                wethMintVal,
                false,
            );
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    wethAssetId,
                    eoa1.address,
                    eoa1.address,
                    0,
                    valShare,
                );
            await wethBigBangMarket
                .connect(eoa1)
                .addCollateral(eoa1.address, eoa1.address, false, 0, valShare);

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
            expect(totalSupplyAfter.sub(totalSupplyBefore).eq(usdoBorrowVal)).to
                .be.true;

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
                bar.withdrawAllMarketFees(
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
                    'setMarketConfig',
                    [
                        feeAmount,
                        ethers.constants.AddressZero,
                        ethers.utils.toUtf8Bytes(''),
                        ethers.constants.AddressZero,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                    ],
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

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            await weth.connect(eoa1).freeMint(wethMintVal);
            const valShare = await yieldBox.toShare(
                wethAssetId,
                wethMintVal,
                false,
            );
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    wethAssetId,
                    eoa1.address,
                    eoa1.address,
                    0,
                    valShare,
                );
            await wethBigBangMarket
                .connect(eoa1)
                .addCollateral(eoa1.address, eoa1.address, false, 0, valShare);

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
            expect(totalSupplyAfter.sub(totalSupplyBefore).eq(usdoBorrowVal)).to
                .be.true;

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

            const calcAmount = await multiSwapper.getOutputAmount(
                swapData,
                '0x00',
            );
            await expect(
                bar.withdrawAllMarketFees(
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
                usdoBorrowValWithFee
                    .sub(usdoBorrowVal)
                    .gte(yieldBoxBalanceOfFee),
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
                    'setMarketConfig',
                    [
                        5e2,
                        ethers.constants.AddressZero,
                        ethers.utils.toUtf8Bytes(''),
                        ethers.constants.AddressZero,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                    ],
                );
            await bar.executeMarketFn(
                [wethBigBangMarket.address],
                [borrowFeeUpdateFn],
                true,
            );

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                    .addCollateral(
                        eoa.address,
                        eoa.address,
                        false,
                        0,
                        valShare,
                    );
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

                const userBorrowedAmount =
                    await wethBigBangMarket.userBorrowPart(eoa.address);

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
                bar.withdrawAllMarketFees(
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
                    'setMarketConfig',
                    [
                        5e2,
                        ethers.constants.AddressZero,
                        ethers.utils.toUtf8Bytes(''),
                        ethers.constants.AddressZero,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                    ],
                );
            await bar.executeMarketFn(
                [wethBigBangMarket.address],
                [borrowFeeUpdateFn],
                true,
            );

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                    .addCollateral(
                        eoa.address,
                        eoa.address,
                        false,
                        0,
                        valShare,
                    );
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

                const userBorrowedAmount =
                    await wethBigBangMarket.userBorrowPart(eoa.address);

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
                bar.withdrawAllMarketFees(
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

                const userBorrowedAmount =
                    await wethBigBangMarket.userBorrowPart(eoa.address);

                await wethBigBangMarket
                    .connect(eoa)
                    .repay(eoa.address, eoa.address, false, userBorrowedAmount);
            }

            const balance = await usd0.balanceOf(wethBigBangMarket.address);
            await expect(
                bar.withdrawAllMarketFees(
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
                    'setMarketConfig',
                    [
                        5e2,
                        ethers.constants.AddressZero,
                        ethers.utils.toUtf8Bytes(''),
                        ethers.constants.AddressZero,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                    ],
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

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            await weth.connect(eoa1).freeMint(wethMintVal);
            const valShare = await yieldBox.toShare(
                wethAssetId,
                wethMintVal,
                false,
            );
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    wethAssetId,
                    eoa1.address,
                    eoa1.address,
                    0,
                    valShare,
                );
            await wethBigBangMarket
                .connect(eoa1)
                .addCollateral(eoa1.address, eoa1.address, false, 0, valShare);

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

            const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(
                1000,
            );
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

            userBorrowPart = await wethBigBangMarket.userBorrowPart(
                eoa1.address,
            );
            expect(userBorrowPart.eq(0)).to.be.true;

            await bar.withdrawAllMarketFees(
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
                bar.withdrawAllMarketFees(
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
                bar.withdrawAllMarketFees(
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
    });

    describe('setters and debt', () => {
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

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                0,
                valShare,
            );

            const borrowCapUpdateFn =
                wethBigBangMarket.interface.encodeFunctionData(
                    'setMarketConfig',
                    [
                        0,
                        ethers.constants.AddressZero,
                        ethers.utils.toUtf8Bytes(''),
                        ethers.constants.AddressZero,
                        0,
                        0,
                        0,
                        0,
                        0,
                        1,
                        0,
                    ],
                );
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
                wethBigBangMarket.interface.encodeFunctionData(
                    'setMarketConfig',
                    [
                        5e2,
                        ethers.constants.AddressZero,
                        ethers.utils.toUtf8Bytes(''),
                        deployer.address,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                        0,
                    ],
                );
            await bar.executeMarketFn(
                [wethBigBangMarket.address],
                [setConservatorData],
                true,
            );

            await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                    0,
                    valShare,
                ),
            ).to.be.revertedWith('Market: paused');

            await wethBigBangMarket.updatePause(false);

            await wethBigBangMarket.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
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

            const borrowFeeUpdateFn =
                wethBigBangMarket.interface.encodeFunctionData(
                    'setBorrowOpeningFee',
                    [0],
                );
            await bar.executeMarketFn(
                [wethBigBangMarket.address],
                [borrowFeeUpdateFn],
                true,
            );
            await bar.executeMarketFn(
                [wbtcBigBangMarket.address],
                [borrowFeeUpdateFn],
                true,
            );

            //borrow from the main eth market
            await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox.setApprovalForAll(wethBigBangMarket.address, true);

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                50,
            );
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
                0,
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

            const wbtcMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                50,
            );
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
                0,
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
            expect(currentWbtcDebtRate.eq(ethers.utils.parseEther('0.022922')))
                .to.be.true;

            await wbtcBigBangMarket.borrow(
                deployer.address,
                deployer.address,
                wbtcMarketusdoBorrowVal,
            );

            currentWbtcDebtRate = await wbtcBigBangMarket.getDebtRate();
            expect(currentWbtcDebtRate.eq(ethers.utils.parseEther('0.035'))).to
                .be.true;
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
                    'setBorrowOpeningFee',
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

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                100,
            );
            await weth.connect(eoa1).freeMint(wethMintVal);
            const valShare = await yieldBox.toShare(
                wethAssetId,
                wethMintVal,
                false,
            );

            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    wethAssetId,
                    eoa1.address,
                    eoa1.address,
                    0,
                    valShare,
                );
            await wethBigBangMarket
                .connect(eoa1)
                .addCollateral(eoa1.address, eoa1.address, false, 0, valShare);

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
    });

    describe('batch', () => {
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

            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                wethBigBangMarket.interface.encodeFunctionData(
                    'addCollateral',
                    [deployer.address, deployer.address, false, 0, valShare],
                );
            const borrowEncoded =
                wethBigBangMarket.interface.encodeFunctionData('borrow', [
                    deployer.address,
                    deployer.address,
                    usdoBorrowVal,
                ]);

            await wethBigBangMarket.execute(
                [addCollateralEncoded, borrowEncoded],
                true,
            );

            const userBorrowPart = await wethBigBangMarket.userBorrowPart(
                deployer.address,
            );
            expect(userBorrowPart.gt(0)).to.be.true;
        });
    });

    describe('leverage', () => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let g: (a: string, t: number, r: boolean) => Promise<any>;

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        let getDebtAmount: (a: string) => Promise<any>;

        function E(n: number | bigint, p: number | bigint = 18) {
            return BN(BigInt(n) * 10n ** BigInt(p));
        }

        const prefundSwapper = async (
            swapperAddress: string,
            yieldBox: YieldBox,
            wethBigBangMarket: BigBang,
            weth: ERC20Mock,
            usdo: ERC20Mock,
            signer: SignerWithAddress,
            wethId: BigNumber,
            usdoId: BigNumber,
            timeTravel: any,
            prefundAsset: boolean,
        ) => {
            await yieldBox
                .connect(signer)
                .setApprovalForAll(wethBigBangMarket.address, true);
            await weth
                .connect(signer)
                .approve(yieldBox.address, ethers.constants.MaxUint256);

            await weth.connect(signer).freeMint(E(100));
            await yieldBox
                .connect(signer)
                .depositAsset(
                    wethId,
                    signer.address,
                    signer.address,
                    E(100),
                    0,
                );

            await wethBigBangMarket
                .connect(signer)
                .addCollateral(
                    signer.address,
                    signer.address,
                    false,
                    0,
                    E(100).mul(1e8),
                );

            await wethBigBangMarket
                .connect(signer)
                .borrow(signer.address, signer.address, E(50));
            if (prefundAsset) {
                await yieldBox
                    .connect(signer)
                    .withdraw(usdoId, signer.address, signer.address, E(10), 0);
                await usdo
                    .connect(signer)
                    .approve(yieldBox.address, ethers.constants.MaxUint256);
                await yieldBox
                    .connect(signer)
                    .depositAsset(
                        usdoId,
                        signer.address,
                        swapperAddress,
                        E(10),
                        0,
                    );
            }
            await timeTravel(86401);
            await weth.connect(signer).freeMint(E(10));
            await timeTravel(86401);
            await yieldBox
                .connect(signer)
                .depositAsset(wethId, signer.address, swapperAddress, E(10), 0);
        };

        const setUp = async () => {
            const {
                bar,
                weth,
                usdc,
                usd0,
                yieldBox,
                wethBigBangMarket,
                deployer,
                initContracts,
                __wethUsdcPrice,
                eoa1,
                timeTravel,
            } = await loadFixture(register);
            await initContracts();

            const wethId = await wethBigBangMarket.collateralId();
            const oracle = await wethBigBangMarket.oracle();

            // Confirm that the defaults from the main fixture are as expected
            expect(__wethUsdcPrice).to.equal(E(1000));
            // Open fee is out of 100k, so 0.05% by default:
            expect(await wethBigBangMarket.borrowOpeningFee()).to.equal(50);

            g = async (address, tokenId, roundUp = false) => {
                const share = await yieldBox.balanceOf(address, tokenId);
                const amount = await yieldBox.toAmount(tokenId, share, roundUp);
                return {
                    share: formatUnits(share),
                    amount: formatUnits(amount),
                };
            };

            getDebtAmount = async (address, roundUp = false) => {
                const part = await wethBigBangMarket.userBorrowPart(address);
                if (part.eq(0)) {
                    return part;
                }
                const total = await wethBigBangMarket.totalBorrow();
                let el = total.elastic;
                if (roundUp) {
                    el = el.add(total.base).sub(1);
                }
                return part.mul(el).div(total.base);
            };

            const MockSwapper = new MockSwapper__factory(deployer);
            const mockSwapper = await MockSwapper.deploy(yieldBox.address);
            await mockSwapper.deployed();
            await bar.setSwapper(mockSwapper.address, true);

            await yieldBox
                .connect(deployer)
                .setApprovalForAll(wethBigBangMarket.address, true);
            await weth.approve(yieldBox.address, ethers.constants.MaxUint256);

            await timeTravel(86401);
            await weth.freeMint(E(10));
            await timeTravel(86401);
            await yieldBox
                .connect(deployer)
                .depositAsset(
                    wethId,
                    deployer.address,
                    deployer.address,
                    E(10),
                    0,
                );

            await wethBigBangMarket
                .connect(deployer)
                .addCollateral(
                    deployer.address,
                    deployer.address,
                    false,
                    0,
                    E(10).mul(1e8),
                );

            await wethBigBangMarket
                .connect(deployer)
                .borrow(deployer.address, deployer.address, E(1));

            return {
                deployer,
                mockSwapper,
                usdc,
                weth,
                usd0,
                wethId,
                wethBigBangMarket,
                yieldBox,
                bar,
                eoa1,
                timeTravel,
            };
        };

        it('Should lever up by buying collateral', async () => {
            const {
                deployer,
                mockSwapper,
                weth,
                usd0,
                wethId,
                yieldBox,
                wethBigBangMarket,
                bar,
                eoa1,
                timeTravel,
            } = await loadFixture(setUp);

            expect(
                await wethBigBangMarket.userBorrowPart(deployer.address),
            ).to.equal(E(10_005).div(10_000));
            const ybBalance = await yieldBox.balanceOf(
                deployer.address,
                await bar.usdoAssetId(),
            );
            expect(ybBalance.eq(E(1).mul(1e8))).to.be.true;

            //prefund swapper with some USD0
            await prefundSwapper(
                mockSwapper.address,
                yieldBox,
                wethBigBangMarket,
                weth,
                usd0,
                eoa1,
                wethId,
                await wethBigBangMarket.assetId(),
                timeTravel,
                false,
            );

            const collateralBefore =
                await wethBigBangMarket.userCollateralShare(deployer.address);
            const borrowBefore = await wethBigBangMarket.userBorrowPart(
                deployer.address,
            );
            const ybBalanceOfDeployerAssetBefore = await yieldBox.balanceOf(
                deployer.address,
                await wethBigBangMarket.assetId(),
            );
            // Buy more collateral
            await wethBigBangMarket.buyCollateral(
                deployer.address,
                E(1), // One ETH; in amount
                0, // No additional payment
                E(10), // In actual amount again
                mockSwapper.address,
                [],
            );
            const collateralAfter = await wethBigBangMarket.userCollateralShare(
                deployer.address,
            );
            const borrowAfter = await wethBigBangMarket.userBorrowPart(
                deployer.address,
            );
            expect(collateralAfter.eq(collateralBefore.mul(2))).to.be.true;
            expect(borrowAfter.gt(borrowBefore)).to.be.true;

            const ybBalanceOfDeployerCollateral = await yieldBox.balanceOf(
                deployer.address,
                wethId,
            );
            expect(ybBalanceOfDeployerCollateral.eq(0)).to.be.true;

            const ybBalanceOfDeployerAssetAfter = await yieldBox.balanceOf(
                deployer.address,
                await wethBigBangMarket.assetId(),
            );

            expect(
                ybBalanceOfDeployerAssetBefore.eq(
                    ybBalanceOfDeployerAssetAfter,
                ),
            ).to.be.true;
        });

        it('Should lever down by selling collateral', async () => {
            const {
                deployer,
                mockSwapper,
                weth,
                usd0,
                wethId,
                yieldBox,
                wethBigBangMarket,
                bar,
                eoa1,
                timeTravel,
            } = await loadFixture(setUp);

            expect(
                await yieldBox.balanceOf(
                    deployer.address,
                    await wethBigBangMarket.assetId(),
                ),
            ).to.equal(E(1).mul(1e8)); //borrowed in setUp

            await prefundSwapper(
                mockSwapper.address,
                yieldBox,
                wethBigBangMarket,
                weth,
                usd0,
                deployer,
                wethId,
                await wethBigBangMarket.assetId(),
                timeTravel,
                true,
            );

            const collateralBefore =
                await wethBigBangMarket.userCollateralShare(deployer.address);
            const userBorrowBefore = await wethBigBangMarket.userBorrowPart(
                deployer.address,
            );
            const ybBalanceOfDeployerCollateralBefore =
                await yieldBox.balanceOf(deployer.address, wethId);

            const ybBalanceBeforeTest = await yieldBox.balanceOf(
                wethBigBangMarket.address,
                await wethBigBangMarket.assetId(),
            );

            await wethBigBangMarket.sellCollateral(
                deployer.address,
                E(10).mul(1e8),
                E(10),
                mockSwapper.address,
                [],
            );
            const collateralAfter = await wethBigBangMarket.userCollateralShare(
                deployer.address,
            );
            const userBorrowAfter = await wethBigBangMarket.userBorrowPart(
                deployer.address,
            );

            const ybBalanceOfDeployerCollateralAfter = await yieldBox.balanceOf(
                deployer.address,
                wethId,
            );
            const ybBalanceAfterTest = await yieldBox.balanceOf(
                wethBigBangMarket.address,
                await wethBigBangMarket.assetId(),
            );

            expect(ybBalanceOfDeployerCollateralBefore.eq(0)).to.be.true;
            expect(ybBalanceOfDeployerCollateralAfter.eq(0)).to.be.true;
            expect(ybBalanceAfterTest.eq(ybBalanceBeforeTest)).to.be.true;
            expect(userBorrowAfter.lt(userBorrowBefore)).to.be.true;
            expect(collateralAfter.lt(collateralBefore)).to.be.true;
        });
    });
});
