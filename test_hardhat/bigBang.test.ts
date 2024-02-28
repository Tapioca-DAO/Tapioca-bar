import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { YieldBox } from '@tapioca-sdk/typechain/YieldBox';
import {
    ERC20Mock,
    MockSwapper__factory,
} from '@tapioca-sdk/typechain/tapioca-mocks';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { formatUnits } from 'ethers/lib/utils';
import hre, { ethers } from 'hardhat';
import { BN, register } from './test.utils';
import { uint200, type } from 'solidity-math';

describe('BigBang test', () => {
    it.skip('should test liquidator reward', async () => {
        const testFactory = await ethers.getContractFactory('Test');
        const testContract = await testFactory.deploy();
        await testContract.deployed();

        console.log(
            `fee for rate 0.8e18 is ${
                ((await testContract.getCallerReward(
                    ethers.utils.parseEther('1'),
                    ethers.utils.parseEther('0.9'),
                    ethers.utils.parseEther('1.1'),
                    8e4,
                    9e4,
                )) /
                    1e5) *
                100
            } %`,
        );

        console.log(
            `fee for rate 1.05e18 is ${
                ((await testContract.getCallerReward(
                    ethers.utils.parseEther('1.05'),
                    ethers.utils.parseEther('0.9'),
                    ethers.utils.parseEther('1.1'),
                    8e4,
                    9e4,
                )) /
                    1e5) *
                100
            } %`,
        );

        console.log(
            `fee for rate 0.95e18 is ${
                ((await testContract.getCallerReward(
                    ethers.utils.parseEther('0.95'),
                    ethers.utils.parseEther('0.9'),
                    ethers.utils.parseEther('1.1'),
                    8e4,
                    9e4,
                )) /
                    1e5) *
                100
            } %`,
        );
    });
    it.skip('should test mint fee', async () => {
        const testFactory = await ethers.getContractFactory('Test');
        const testContract = await testFactory.deploy();
        await testContract.deployed();
        console.log(
            `fee for rate 0.9875e18 is ${
                ((await testContract.computeMintFeeTest(
                    ethers.utils.parseEther('0.9875'),
                    0,
                    1000,
                )) /
                    1e5) *
                100
            } %`,
        );
        console.log(
            `fee for rate 0.875e18 is ${
                ((await testContract.computeMintFeeTest(
                    ethers.utils.parseEther('0.875'),
                    0,
                    1000,
                )) /
                    1e5) *
                100
            } %`,
        );
        console.log(
            `fee for rate 1.2e18 is ${
                ((await testContract.computeMintFeeTest(
                    ethers.utils.parseEther('1.2'),
                    0,
                    1000,
                )) /
                    1e5) *
                100
            }  %`,
        );
        console.log(
            `fee for rate 0.8e18 is ${
                ((await testContract.computeMintFeeTest(
                    ethers.utils.parseEther('0.8'),
                    0,
                    1000,
                )) /
                    1e5) *
                100
            } %`,
        );

        console.log(
            `fee for rate 1e18 is ${
                ((await testContract.computeMintFeeTest(
                    ethers.utils.parseEther('1'),
                    0,
                    1000,
                )) /
                    1e5) *
                100
            } %`,
        );

        console.log(
            `fee for rate 1.01e18 is ${
                ((await testContract.computeMintFeeTest(
                    ethers.utils.parseEther('1.01'),
                    0,
                    1000,
                )) /
                    1e5) *
                100
            } %`,
        );

        console.log(
            `fee for rate 1.015e18 is ${
                ((await testContract.computeMintFeeTest(
                    ethers.utils.parseEther('1.015'),
                    0,
                    1000,
                )) /
                    1e5) *
                100
            } %`,
        );

        console.log(
            `fee for rate 0.99e18 is ${
                ((await testContract.computeMintFeeTest(
                    ethers.utils.parseEther('0.99'),
                    0,
                    1000,
                )) /
                    1e5) *
                100
            } %`,
        );
    });
    it('Can bork the pools via the function', async () => {
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
            marketHelper,
            pearlmit,
        } = await loadFixture(register);

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

        let addCollateralData = await marketHelper.addCollateral(
            deployer.address,
            deployer.address,
            false,
            0,
            valShare,
        );
        await wethBigBangMarket.execute(
            addCollateralData[0],
            addCollateralData[1],
            true,
        );

        const usdoBorrowVal = ethers.utils.parseEther('10000');
        let borrowData = await marketHelper.borrow(
            deployer.address,
            deployer.address,
            usdoBorrowVal,
        );
        await wethBigBangMarket.execute(borrowData[0], borrowData[1], true);

        let userBorrowPart = await wethBigBangMarket.userBorrowPart(
            deployer.address,
        );

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
        await wbtc.freeMint(wbtcMintVal.mul(5));
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
        addCollateralData = await marketHelper.addCollateral(
            deployer.address,
            deployer.address,
            false,
            0,
            wbtcValShare,
        );
        await wbtcBigBangMarket.execute(
            addCollateralData[0],
            addCollateralData[1],
            true,
        );

        const wbtcMarketusdoBorrowVal = ethers.utils.parseEther('2987');
        /// @audit Borrow above minDebtSize
        borrowData = await marketHelper.borrow(
            deployer.address,
            deployer.address,
            wbtcMarketusdoBorrowVal,
        );
        await wbtcBigBangMarket.execute(borrowData[0], borrowData[1], true);

        userBorrowPart = await wbtcBigBangMarket.userBorrowPart(
            deployer.address,
        );

        const wbtcMarketTotalDebt = await wbtcBigBangMarket.getTotalDebt();
        expect(wbtcMarketTotalDebt.eq(userBorrowPart)).to.be.true;
        /// @audit Repay to drag totalDebt below minDebtSize
        let repayData = await marketHelper.repay(
            deployer.address,
            deployer.address,
            true,
            wbtcMarketusdoBorrowVal.mul(99).div(100),
        );
        await wbtcBigBangMarket.execute(repayData[0], repayData[1], true);

        console.log('We can repay, less than 100% so we go below min');

        // Accrue should revert now due to this
        try {
            await wbtcBigBangMarket.accrue();
        } catch (e) {
            console.log('e', e);
            console.log('And we got the revert we expected');
        }

        try {
            repayData = await marketHelper.repay(
                deployer.address,
                deployer.address,
                true,
                wbtcMarketusdoBorrowVal.mul(1).div(100),
            );
            // We cannot repay rest
            await wbtcBigBangMarket.execute(repayData[0], repayData[1], true);
        } catch (e) {
            console.log('e', e);
            console.log('We cannot repay');
        }

        try {
            // We cannot borrow anymore due to accrue
            borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                wbtcMarketusdoBorrowVal,
            );
            await wethBigBangMarket.execute(borrowData[0], borrowData[1], true);
        } catch (e) {
            console.log('e', e);
            console.log('And we cannot borrow');
        }
    });
    it('should test initial values', async () => {
        const { wethBigBangMarket, usd0, penrose, weth, wethAssetId } =
            await loadFixture(register);

        const savedAssetId = await wethBigBangMarket.assetId();
        const penroseUsd0Id = await penrose.usdoAssetId();
        expect(savedAssetId.eq(penroseUsd0Id)).to.be.true;

        const savedAsset = await wethBigBangMarket.asset();
        const barUsd0 = await penrose.usdoToken();
        expect(barUsd0.toLowerCase()).eq(savedAsset.toLowerCase());

        const savedCollateralId = await wethBigBangMarket.collateralId();
        expect(savedCollateralId.eq(wethAssetId)).to.be.true;

        const savedCollateral = await wethBigBangMarket.collateral();
        expect(weth.address.toLowerCase()).eq(savedCollateral.toLowerCase());
    });

    describe('open interest', () => {
        it('should view & mint on total debt', async () => {
            const {
                registerBigBangMarket,
                weth,
                // wethAssetId,
                usdc,
                usdcAssetId,
                yieldBox,
                deployer,
                eoa1,
                mediumRiskBigBangMC,
                usd0WethOracle,
                multiSwapper,
                cluster,
                registerUsd0Contract,
                timeTravel,
                __wethUsdcPrice,
                twTap,
                registerPenrose,
                tap,
                //pearlmit,
                marketHelper,
            } = await loadFixture(register);

            const log = (message: string, shouldLog?: boolean) =>
                shouldLog && console.log(message);

            const shouldLog = false;

            const { penrose, pearlmit } = await registerPenrose(
                yieldBox.address,
                cluster.address,
                tap.address,
                weth.address,
                false,
            );

            const wethAssetId = await penrose.mainAssetId();

            await penrose.registerBigBangMasterContract(
                mediumRiskBigBangMC.address,
                1,
            );
            await penrose.setBigBangEthMarketDebtRate((5e15).toString());

            const chainId = hre.SDK.eChainId;
            const { usd0, lzEndpointContract, usd0Flashloan } =
                await registerUsd0Contract(
                    chainId,
                    yieldBox.address,
                    cluster.address,
                    deployer.address,
                    pearlmit.address,
                    false,
                );
            await penrose.setUsdoToken(usd0.address);
            await usd0.setMinterStatus(penrose.address, true);

            const wethUsdoBBData = await registerBigBangMarket(
                mediumRiskBigBangMC.address,
                yieldBox,
                penrose,
                weth,
                wethAssetId,
                usd0WethOracle,
                multiSwapper.address,
                cluster.address,
                ethers.utils.parseEther('1'),
                0,
                0,
                0, //ignored, as this is the main market
                false,
            );
            const wethUsdoBigBangMarket = wethUsdoBBData.bigBangMarket;
            await usd0.setMinterStatus(wethUsdoBigBangMarket.address, true);
            await usd0.setBurnerStatus(wethUsdoBigBangMarket.address, true);
            await penrose.setBigBangEthMarket(wethUsdoBigBangMarket.address);

            const usdcUsdoBBData = await registerBigBangMarket(
                mediumRiskBigBangMC.address,
                yieldBox,
                penrose,
                usdc,
                usdcAssetId,
                usd0WethOracle,
                multiSwapper.address,
                cluster.address,
                ethers.utils.parseEther('1'),
                0,
                0,
                0, //not main market but we can work with the same configuration for this test
                false,
            );
            const usdcUsdoBigBangMarket = usdcUsdoBBData.bigBangMarket;
            await usd0.setMinterStatus(usdcUsdoBigBangMarket.address, true);
            await usd0.setBurnerStatus(usdcUsdoBigBangMarket.address, true);

            await yieldBox.setApprovalForAll(
                wethUsdoBigBangMarket.address,
                true,
            );
            await pearlmit.approve(
                yieldBox.address,
                wethAssetId,
                wethUsdoBigBangMarket.address,
                ethers.utils.parseEther('900000000000000'),
                '9000000000',
            );
            await pearlmit.approve(
                yieldBox.address,
                await penrose.usdoAssetId(),
                wethUsdoBigBangMarket.address,
                ethers.utils.parseEther('900000000000000'),
                '9000000000',
            );

            await yieldBox.setApprovalForAll(
                usdcUsdoBigBangMarket.address,
                true,
            );
            await pearlmit.approve(
                yieldBox.address,
                usdcAssetId,
                usdcUsdoBigBangMarket.address,
                ethers.utils.parseEther('900000000000000'),
                '9000000000',
            );
            await pearlmit.approve(
                yieldBox.address,
                await penrose.usdoAssetId(),
                usdcUsdoBigBangMarket.address,
                ethers.utils.parseEther('900000000000000'),
                '9000000000',
            );

            await yieldBox.setApprovalForAll(pearlmit.address, true);

            await usd0.approve(pearlmit.address, ethers.constants.MaxUint256);
            await weth.approve(pearlmit.address, ethers.constants.MaxUint256);
            const setAssetOracleFn =
                wethUsdoBigBangMarket.interface.encodeFunctionData(
                    'setAssetOracle',
                    [usd0WethOracle.address, '0x'],
                );

            await penrose.executeMarketFn(
                [wethUsdoBigBangMarket.address, usdcUsdoBigBangMarket.address],
                [setAssetOracleFn, setAssetOracleFn],
                true,
            );

            //nothing should be minted so far
            let totalUsdoSupply = await usd0.totalSupply();
            expect(totalUsdoSupply.eq(0)).to.be.true;

            //nothing should be minted so far
            await timeTravel(10 * 86400);
            totalUsdoSupply = await usd0.totalSupply();
            expect(totalUsdoSupply.eq(0)).to.be.true;

            //approve collaterals for yieldBox
            await weth.approve(yieldBox.address, ethers.constants.MaxUint256);
            await usdc.approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox.setApprovalForAll(
                wethUsdoBigBangMarket.address,
                true,
            );
            await yieldBox.setApprovalForAll(
                usdcUsdoBigBangMarket.address,
                true,
            );

            //mint collaterals
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            const usdcMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            await weth.freeMint(wethMintVal);
            await usdc.freeMint(usdcMintVal);

            //deposit collateral amounts to yieldBox
            const wethCollateralShare = await yieldBox.toShare(
                wethAssetId,
                wethMintVal,
                false,
            );
            await yieldBox.depositAsset(
                wethAssetId,
                deployer.address,
                deployer.address,
                0,
                wethCollateralShare,
            );

            const usdcCollateralShare = await yieldBox.toShare(
                usdcAssetId,
                usdcMintVal,
                false,
            );
            await yieldBox.depositAsset(
                usdcAssetId,
                deployer.address,
                deployer.address,
                0,
                usdcCollateralShare,
            );

            let addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                wethCollateralShare,
            );
            //add collateral to markets
            await wethUsdoBigBangMarket.execute(
                addCollateralData[0],
                addCollateralData[1],
                true,
            );
            return;
            addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                usdcCollateralShare,
            );
            await usdcUsdoBigBangMarket.execute(
                addCollateralData[0],
                addCollateralData[1],
                true,
            );

            //usdo supply should still be 0 at this time
            totalUsdoSupply = await usd0.totalSupply();
            expect(totalUsdoSupply.eq(0)).to.be.true;

            let totalDebt = await penrose.viewTotalDebt();
            expect(totalDebt.eq(0)).to.be.true;

            //borrow from weth market
            const wethMarketBorrowVal = wethMintVal
                .mul(74)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            let borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                wethMarketBorrowVal,
            );
            await wethUsdoBigBangMarket.execute(
                borrowData[0],
                borrowData[1],
                true,
            );

            //usdo supply should not be 0 at this time
            totalUsdoSupply = await usd0.totalSupply();
            expect(totalUsdoSupply.gt(0)).to.be.true;
            totalDebt = await penrose.viewTotalDebt();
            expect(totalDebt.gt(totalUsdoSupply)).to.be.true;

            //borrow from usdc market
            const usdcMarketBorrowVal = usdcMintVal
                .mul(74)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                usdcMarketBorrowVal,
            );
            await usdcUsdoBigBangMarket.execute(
                borrowData[0],
                borrowData[1],
                true,
            );

            totalUsdoSupply = await usd0.totalSupply();
            expect(totalUsdoSupply.gt(0)).to.be.true;
            totalDebt = await penrose.viewTotalDebt();
            expect(totalDebt.gt(totalUsdoSupply)).to.be.true;

            log(`totalUsdoSupply ${totalUsdoSupply}`, shouldLog);
            log(`totalDebt       ${totalDebt}`, shouldLog);

            log('[+] travel 100 days into the future', shouldLog);
            await timeTravel(100 * 86400);

            //call computeTotalDebt to reaccrue all markets
            await penrose.computeTotalDebt();

            totalUsdoSupply = await usd0.totalSupply();
            expect(totalUsdoSupply.gt(0)).to.be.true;
            totalDebt = await penrose.viewTotalDebt();
            expect(totalDebt.gt(totalUsdoSupply)).to.be.true;

            log(`totalUsdoSupply ${totalUsdoSupply}`, shouldLog);
            log(`totalDebt       ${totalDebt}`, shouldLog);

            //compute possible open interest mintable amount
            //this will be compared with the final supply

            await twTap.addRewardToken(usd0.address);
            //mint supply
            log('[+] minting the supply', shouldLog);
            await penrose.mintOpenInterestDebt(twTap.address);

            totalUsdoSupply = await usd0.totalSupply();
            totalDebt = await penrose.viewTotalDebt();
            log(`totalUsdoSupply ${totalUsdoSupply}`, shouldLog);
            log(`totalDebt       ${totalDebt}`, shouldLog);
            expect(totalDebt).to.be.closeTo(totalUsdoSupply, 1e4);

            let totalBorrowInfo = await wethUsdoBigBangMarket.totalBorrow();
            log('[+] travel another 100 days into the future', shouldLog);
            await timeTravel(100 * 86400);

            //call computeTotalDebt to reaccrue all markets
            await penrose.computeTotalDebt();

            totalUsdoSupply = await usd0.totalSupply();
            expect(totalUsdoSupply.gt(0)).to.be.true;
            totalDebt = await penrose.viewTotalDebt();

            totalBorrowInfo = await wethUsdoBigBangMarket.totalBorrow();
            const debtRate = await wethUsdoBigBangMarket.getDebtRate();
            const mainDebtRate = await penrose.bigBangEthDebtRate();
            const isMain = await wethUsdoBigBangMarket.isMainMarket();

            expect(totalDebt.gt(totalUsdoSupply)).to.be.true;

            log(`totalUsdoSupply ${totalUsdoSupply}`, shouldLog);
            log(`totalDebt       ${totalDebt}`, shouldLog);

            //mint supply
            log('[+] minting the supply', shouldLog);
            await penrose.mintOpenInterestDebt(twTap.address);

            totalUsdoSupply = await usd0.totalSupply();
            totalDebt = await penrose.viewTotalDebt();
            log(`totalUsdoSupply ${totalUsdoSupply}`, shouldLog);
            log(`totalDebt       ${totalDebt}`, shouldLog);
            expect(totalDebt).to.be.closeTo(totalUsdoSupply, 1e4);

            //repay usdc market
            let usdcMarketBorrowPart =
                await usdcUsdoBigBangMarket.userBorrowPart(deployer.address);
            const repayData = await marketHelper.repay(
                deployer.address,
                deployer.address,
                false,
                usdcMarketBorrowPart,
            );
            await usdcUsdoBigBangMarket.execute(
                repayData[0],
                repayData[1],
                true,
            ); //user should have extra USDO in yieldBox because of the 2 borrows (each from one market)
            usdcMarketBorrowPart = await usdcUsdoBigBangMarket.userBorrowPart(
                deployer.address,
            );
            expect(usdcMarketBorrowPart.eq(0)).to.be.true;

            //recompute total debt & total supply
            await penrose.computeTotalDebt();
            totalUsdoSupply = await usd0.totalSupply();
            totalDebt = await penrose.viewTotalDebt();
            log(`totalUsdoSupply ${totalUsdoSupply}`, shouldLog);
            log(`totalDebt       ${totalDebt}`, shouldLog);
            expect(totalDebt).to.be.closeTo(totalUsdoSupply, 1e14); //debt should still be close to totalSupply because repay decreases both; however there was a slight increase due to a new accrue
            expect(totalDebt.gt(totalUsdoSupply)).to.be.true;

            log('[+] travel another 100 days into the future', shouldLog);
            await timeTravel(100 * 86400);

            //call computeTotalDebt to reaccrue all markets
            await penrose.computeTotalDebt();

            totalUsdoSupply = await usd0.totalSupply();
            expect(totalUsdoSupply.gt(0)).to.be.true;
            totalDebt = await penrose.viewTotalDebt();
            expect(totalDebt.gt(totalUsdoSupply)).to.be.true;

            log(`totalUsdoSupply ${totalUsdoSupply}`, shouldLog);
            log(`totalDebt       ${totalDebt}`, shouldLog);

            //mint supply
            log('[+] minting the supply', shouldLog);
            await penrose.mintOpenInterestDebt(twTap.address);

            totalUsdoSupply = await usd0.totalSupply();
            totalDebt = await penrose.viewTotalDebt();
            log(`totalUsdoSupply ${totalUsdoSupply}`, shouldLog);
            log(`totalDebt       ${totalDebt}`, shouldLog);
            expect(totalDebt).to.be.closeTo(totalUsdoSupply, 1e4);
        });
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
                marketHelper,
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

            const addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                valShare,
            );
            await wethBigBangMarket.execute(
                addCollateralData[0],
                addCollateralData[1],
                true,
            );

            let collateralShares = await wethBigBangMarket.userCollateralShare(
                deployer.address,
            );
            expect(collateralShares.gt(0)).to.be.true;
            expect(collateralShares.eq(valShare)).to.be.true;

            const removeCollateralData = await marketHelper.removeCollateral(
                deployer.address,
                deployer.address,
                collateralShares,
            );
            await wethBigBangMarket.execute(
                removeCollateralData[0],
                removeCollateralData[1],
                true,
            );

            collateralShares = await wethBigBangMarket.userCollateralShare(
                deployer.address,
            );
            expect(collateralShares.eq(0)).to.be.true;
        });
    });

    describe('borrow() & repay()', () => {
        it('should borrow and repay from different senders', async () => {
            const {
                wethBigBangMarket,
                weth,
                wethAssetId,
                yieldBox,
                deployer,
                penrose,
                usd0,
                __wethUsdcPrice,
                timeTravel,
                eoa1,
                marketHelper,
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

            const addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                eoa1.address,
                false,
                0,
                valShare,
            );
            await wethBigBangMarket.execute(
                addCollateralData[0],
                addCollateralData[1],
                true,
            );

            //borrow
            const usdoBorrowVal = wethMintVal
                .mul(74)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            await wethBigBangMarket
                .connect(eoa1)
                .approveBorrow(deployer.address, valShare);

            const borrowData = await marketHelper.borrow(
                eoa1.address,
                eoa1.address,
                usdoBorrowVal,
            );
            await wethBigBangMarket.execute(borrowData[0], borrowData[1], true);

            let userBorrowPart = await wethBigBangMarket.userBorrowPart(
                eoa1.address,
            );
            expect(userBorrowPart.gt(0)).to.be.true;

            const usd0Balance = await yieldBox.toAmount(
                await penrose.usdoAssetId(),
                await yieldBox.balanceOf(
                    eoa1.address,
                    await wethBigBangMarket.assetId(),
                ),
                false,
            );
            expect(usd0Balance.gt(0)).to.be.true;
            expect(usd0Balance.eq(usdoBorrowVal)).to.be.true;

            timeTravel(10 * 86400);

            //repay
            userBorrowPart = await wethBigBangMarket.userBorrowPart(
                eoa1.address,
            );
            await wethBigBangMarket
                .connect(eoa1)
                .approveBorrow(deployer.address, valShare);
            let repayData = await marketHelper.repay(
                eoa1.address,
                eoa1.address,
                false,
                userBorrowPart,
            );
            await expect(
                wethBigBangMarket.execute(repayData[0], repayData[1], true),
            ).to.be.reverted;

            const usd0Extra = ethers.BigNumber.from((1e18).toString()).mul(
                5000,
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
            await yieldBox
                .connect(eoa1)
                .setApprovalForAsset(
                    wethBigBangMarket.address,
                    await wethBigBangMarket.assetId(),
                    true,
                );

            repayData = await marketHelper.repay(
                eoa1.address,
                eoa1.address,
                false,
                userBorrowPart,
            );
            await wethBigBangMarket.execute(repayData[0], repayData[1], true);

            userBorrowPart = await wethBigBangMarket.userBorrowPart(
                eoa1.address,
            );
            expect(userBorrowPart.eq(0)).to.be.true;
        });

        it('should borrow and repay', async () => {
            const {
                wethBigBangMarket,
                weth,
                wethAssetId,
                yieldBox,
                deployer,
                penrose,
                usd0,
                __wethUsdcPrice,
                timeTravel,
                marketHelper,
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

            const addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                valShare,
            );
            await wethBigBangMarket.execute(
                addCollateralData[0],
                addCollateralData[1],
                true,
            );

            //borrow
            const usdoBorrowVal = wethMintVal
                .mul(74)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            const borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            );
            await wethBigBangMarket.execute(borrowData[0], borrowData[1], true);

            let userBorrowPart = await wethBigBangMarket.userBorrowPart(
                deployer.address,
            );
            expect(userBorrowPart.gt(0)).to.be.true;

            const usd0Balance = await yieldBox.toAmount(
                await penrose.usdoAssetId(),
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

            let repayData = await marketHelper.repay(
                deployer.address,
                deployer.address,
                false,
                userBorrowPart,
            );
            await expect(
                wethBigBangMarket.execute(repayData[0], repayData[1], true),
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
            repayData = await marketHelper.repay(
                deployer.address,
                deployer.address,
                false,
                userBorrowPart,
            );
            await wethBigBangMarket.execute(repayData[0], repayData[1], true);
            userBorrowPart = await wethBigBangMarket.userBorrowPart(
                deployer.address,
            );
            expect(userBorrowPart.eq(0)).to.be.true;
        });
    });

    describe('liquidate()', () => {
        it('should test liquidator rewards & closing factor', async () => {
            const {
                penrose,
                wethBigBangMarket,
                weth,
                wethAssetId,
                yieldBox,
                eoa1,
                usd0WethOracle,
                __usd0WethPrice,
                __wethUsdcPrice,
                marketHelper,
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

            const addCollateralData = await marketHelper.addCollateral(
                eoa1.address,
                eoa1.address,
                false,
                0,
                valShare,
            );
            await wethBigBangMarket
                .connect(eoa1)
                .execute(addCollateralData[0], addCollateralData[1], true);

            //borrow
            const usdoBorrowVal = wethMintVal
                .mul(30)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            //30%
            let borrowData = await marketHelper.borrow(
                eoa1.address,
                eoa1.address,
                usdoBorrowVal,
            );
            await wethBigBangMarket
                .connect(eoa1)
                .execute(borrowData[0], borrowData[1], true);

            await wethBigBangMarket.updateExchangeRate();
            let exchangeRate = await wethBigBangMarket.exchangeRate();
            let reward = await wethBigBangMarket.computeLiquidatorReward(
                eoa1.address,
                exchangeRate,
            );
            expect(reward.eq(0)).to.be.true;

            //60%
            borrowData = await marketHelper.borrow(
                eoa1.address,
                eoa1.address,
                usdoBorrowVal,
            );
            await wethBigBangMarket
                .connect(eoa1)
                .execute(borrowData[0], borrowData[1], true);

            reward = await wethBigBangMarket.computeLiquidatorReward(
                eoa1.address,
                exchangeRate,
            );
            expect(reward.eq(0)).to.be.true;

            //25% price drop
            const priceDrop = __usd0WethPrice.mul(35).div(100);
            await usd0WethOracle.set(__usd0WethPrice.add(priceDrop));
            await wethBigBangMarket.updateExchangeRate();
            exchangeRate = await wethBigBangMarket.exchangeRate();

            let prevClosingFactor;
            const closingFactor = await wethBigBangMarket.computeClosingFactor(
                await wethBigBangMarket.userBorrowPart(eoa1.address),
                (
                    await wethBigBangMarket.computeTVLInfo(
                        eoa1.address,
                        exchangeRate,
                    )
                )[2],
                5,
            );
            expect(closingFactor.gt(0)).to.be.true;
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
                deployLiquidationReceiverMock,
                marketHelper,
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
                20,
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

            const addCollateralData = await marketHelper.addCollateral(
                eoa1.address,
                eoa1.address,
                false,
                0,
                valShare,
            );
            await wethBigBangMarket
                .connect(eoa1)
                .execute(addCollateralData[0], addCollateralData[1], true);

            //borrow
            const usdoBorrowVal = wethMintVal
                .mul(74)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            const borrowData = await marketHelper.borrow(
                eoa1.address,
                eoa1.address,
                usdoBorrowVal,
            );
            await wethBigBangMarket
                .connect(eoa1)
                .execute(borrowData[0], borrowData[1], true);

            await yieldBox
                .connect(eoa1)
                .withdraw(
                    await wethBigBangMarket.assetId(),
                    eoa1.address,
                    eoa1.address,
                    usdoBorrowVal.div(2),
                    0,
                );

            // Can't liquidate
            const liquidateData = new ethers.utils.AbiCoder().encode(
                ['uint256'],
                [usdoBorrowVal.div(2)],
            );
            const liquidationReceiver = await deployLiquidationReceiverMock(
                await wethBigBangMarket.asset(),
            );

            const erc20 = await ethers.getContractAt(
                '@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20',
                await wethBigBangMarket.asset(),
            );
            await erc20
                .connect(eoa1)
                .transfer(liquidationReceiver.address, usdoBorrowVal.div(2));

            let lqData = await marketHelper.liquidate(
                [eoa1.address],
                [usdoBorrowVal],
                [0],
                [liquidationReceiver.address],
                [liquidateData],
            );
            await expect(wethBigBangMarket.execute(lqData[0], lqData[1], true))
                .to.be.reverted;

            const priceDrop = __usd0WethPrice.mul(10).div(100);
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
            const closingFactor = await wethBigBangMarket.computeClosingFactor(
                await wethBigBangMarket.userBorrowPart(eoa1.address),
                (
                    await wethBigBangMarket.computeTVLInfo(
                        eoa1.address,
                        exchangeRate,
                    )
                )[2],
                5,
            );
            const borrowPart = await wethBigBangMarket.userBorrowPart(
                eoa1.address,
            );
            expect(closingFactor.gt(0)).to.be.true;
            lqData = await marketHelper.liquidate(
                [eoa1.address],
                [usdoBorrowVal],
                [0],
                [liquidationReceiver.address],
                [liquidateData],
            );
            await expect(wethBigBangMarket.execute(lqData[0], lqData[1], true))
                .to.not.be.reverted;
            await expect(wethBigBangMarket.execute(lqData[0], lqData[1], true))
                .to.be.reverted;
            await expect(wethBigBangMarket.execute(lqData[0], lqData[1], true))
                .to.be.reverted;
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

    describe('setters and debt', () => {
        it('should not be able to borrow when cap is reached', async () => {
            const {
                wethBigBangMarket,
                weth,
                wethAssetId,
                yieldBox,
                deployer,
                penrose,
                __wethUsdcPrice,
                marketHelper,
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
            const addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                valShare,
            );
            await wethBigBangMarket.execute(
                addCollateralData[0],
                addCollateralData[1],
                true,
            );

            const borrowCapUpdateFn =
                wethBigBangMarket.interface.encodeFunctionData(
                    'setMarketConfig',
                    [
                        ethers.constants.AddressZero,
                        ethers.utils.toUtf8Bytes(''),
                        ethers.constants.AddressZero,
                        0,
                        0,
                        0,
                        0,
                        1,
                        0,
                        0,
                    ],
                );
            await penrose.executeMarketFn(
                [wethBigBangMarket.address],
                [borrowCapUpdateFn],
                true,
            );

            //borrow
            const usdoBorrowVal = wethMintVal
                .mul(74)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            const borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            );
            await expect(
                wethBigBangMarket.execute(borrowData[0], borrowData[1], true),
            ).to.be.reverted;
        });

        it('actions should not work when paused', async () => {
            const {
                wethBigBangMarket,
                weth,
                wethAssetId,
                yieldBox,
                deployer,
                penrose,
                usd0,
                __wethUsdcPrice,
                marketHelper,
            } = await loadFixture(register);

            const setConservatorData =
                wethBigBangMarket.interface.encodeFunctionData(
                    'setMarketConfig',
                    [
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
            await penrose.executeMarketFn(
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

            await wethBigBangMarket.updatePause(2, true);

            const pauseState = await wethBigBangMarket.pauseOptions(2);
            expect(pauseState).to.be.true;

            let addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                valShare,
            );
            await expect(
                wethBigBangMarket.execute(
                    addCollateralData[0],
                    addCollateralData[1],
                    true,
                ),
            ).to.be.reverted;

            await wethBigBangMarket.updatePause(2, false);
            addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                valShare,
            );
            await wethBigBangMarket.execute(
                addCollateralData[0],
                addCollateralData[1],
                true,
            );

            await wethBigBangMarket.updatePause(0, true);

            //borrow
            const usdoBorrowVal = wethMintVal
                .mul(74)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            let borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            );
            await expect(
                wethBigBangMarket.execute(borrowData[0], borrowData[1], true),
            ).to.be.reverted;

            await wethBigBangMarket.updatePause(0, false);

            borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            );
            await expect(
                wethBigBangMarket.execute(borrowData[0], borrowData[1], true),
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

            await wethBigBangMarket.updatePause(1, true);

            let repayData = await marketHelper.repay(
                deployer.address,
                deployer.address,
                false,
                userBorrowPart,
            );
            await expect(
                wethBigBangMarket.execute(repayData[0], repayData[1], true),
            ).to.be.reverted;

            await wethBigBangMarket.updatePause(1, false);

            repayData = await marketHelper.repay(
                deployer.address,
                deployer.address,
                false,
                userBorrowPart,
            );
            await expect(
                wethBigBangMarket.execute(repayData[0], repayData[1], true),
            ).not.to.be.reverted;

            await wethBigBangMarket.updatePause(3, true);

            let collateralShares = await wethBigBangMarket.userCollateralShare(
                deployer.address,
            );
            expect(collateralShares.gt(0)).to.be.true;
            expect(collateralShares.eq(valShare)).to.be.true;

            let removeCollateralData = await marketHelper.removeCollateral(
                deployer.address,
                deployer.address,
                collateralShares,
            );
            await expect(
                wethBigBangMarket.execute(
                    removeCollateralData[0],
                    removeCollateralData[1],
                    true,
                ),
            ).to.be.reverted;

            await wethBigBangMarket.updatePause(3, false);

            removeCollateralData = await marketHelper.removeCollateral(
                deployer.address,
                deployer.address,
                collateralShares,
            );
            await expect(
                wethBigBangMarket.execute(
                    removeCollateralData[0],
                    removeCollateralData[1],
                    true,
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
                marketHelper,
            } = await loadFixture(register);

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
            let addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                valShare,
            );
            await wethBigBangMarket.execute(
                addCollateralData[0],
                addCollateralData[1],
                true,
            );

            const usdoBorrowVal = ethers.utils.parseEther('10000');

            let borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                usdoBorrowVal,
            );
            await wethBigBangMarket.execute(borrowData[0], borrowData[1], true);

            let userBorrowPart = await wethBigBangMarket.userBorrowPart(
                deployer.address,
            );

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

            addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                wbtcValShare,
            );
            await wbtcBigBangMarket.execute(
                addCollateralData[0],
                addCollateralData[1],
                true,
            );

            const wbtcMarketusdoBorrowVal = ethers.utils.parseEther('2987');
            borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                wbtcMarketusdoBorrowVal,
            );
            await wbtcBigBangMarket.execute(borrowData[0], borrowData[1], true);

            userBorrowPart = await wbtcBigBangMarket.userBorrowPart(
                deployer.address,
            );

            const wbtcMarketTotalDebt = await wbtcBigBangMarket.getTotalDebt();
            expect(wbtcMarketTotalDebt.eq(userBorrowPart)).to.be.true;

            let currentWbtcDebtRate = await wbtcBigBangMarket.getDebtRate();
            expect(currentWbtcDebtRate.eq(ethers.utils.parseEther('0.035'))).to
                .be.true;

            borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                wbtcMarketusdoBorrowVal,
            );
            await wbtcBigBangMarket.execute(borrowData[0], borrowData[1], true);
            currentWbtcDebtRate = await wbtcBigBangMarket.getDebtRate();
            expect(currentWbtcDebtRate.eq(ethers.utils.parseEther('0.035'))).to
                .be.true;
        });

        it('should test debt rate accrual over year', async () => {
            const {
                wethBigBangMarket,
                weth,
                wethAssetId,
                yieldBox,
                eoa1,
                timeTravel,
                marketHelper,
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

            const addCollateralData = await marketHelper.addCollateral(
                eoa1.address,
                eoa1.address,
                false,
                0,
                valShare,
            );
            await wethBigBangMarket
                .connect(eoa1)
                .execute(addCollateralData[0], addCollateralData[1], true);

            //borrow
            const usdoBorrowVal = ethers.utils.parseEther('10000');
            const borrowData = await marketHelper.borrow(
                eoa1.address,
                eoa1.address,
                usdoBorrowVal,
            );
            await wethBigBangMarket
                .connect(eoa1)
                .execute(borrowData[0], borrowData[1], true);

            const userBorrowPart = await wethBigBangMarket.userBorrowPart(
                eoa1.address,
            );

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

                await yieldBox
                    .connect(signer)
                    .withdraw(usdoId, signer.address, signer.address, E(10), 0);
                await usdo.connect(signer).transfer(swapperAddress, E(10));
            }
            await timeTravel(86401);
            await weth.connect(signer).freeMint(E(10));
            await timeTravel(86401);
            await weth.connect(signer).freeMint(E(10));
            await yieldBox
                .connect(signer)
                .depositAsset(wethId, signer.address, swapperAddress, E(10), 0);
            await weth.connect(signer).transfer(swapperAddress, E(10));
        };

        const setUp = async () => {
            const {
                penrose,
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
                cluster,
                wethBigBangMarketLeverageExecutor,
                marketHelper,
            } = await loadFixture(register);
            await initContracts();

            const wethId = await wethBigBangMarket.collateralId();
            const oracle = await wethBigBangMarket.oracle();

            // Confirm that the defaults from the main fixture are as expected
            expect(__wethUsdcPrice).to.equal(E(1000));

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
            await cluster.updateContract(
                hre.SDK.eChainId,
                mockSwapper.address,
                true,
            );

            await wethBigBangMarketLeverageExecutor.setSwapper(
                mockSwapper.address,
            );

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

            const addCollateralData = await marketHelper.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                E(10).mul(1e8),
            );
            await wethBigBangMarket
                .connect(deployer)
                .execute(addCollateralData[0], addCollateralData[1], true);

            const borrowData = await marketHelper.borrow(
                deployer.address,
                deployer.address,
                E(1),
            );
            await wethBigBangMarket
                .connect(deployer)
                .execute(borrowData[0], borrowData[1], true);

            return {
                deployer,
                mockSwapper,
                usdc,
                weth,
                usd0,
                wethId,
                wethBigBangMarket,
                yieldBox,
                penrose,
                eoa1,
                timeTravel,
                cluster,
            };
        };
    });
});
