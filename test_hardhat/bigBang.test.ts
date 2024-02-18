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
            penrose,
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
        await wbtcBigBangMarket.addCollateral(
            deployer.address,
            deployer.address,
            false,
            0,
            wbtcValShare,
        );

        const wbtcMarketusdoBorrowVal = ethers.utils.parseEther('2987');
        /// @audit Borrow above minDebtSize
        await wbtcBigBangMarket.borrow(
            deployer.address,
            deployer.address,
            wbtcMarketusdoBorrowVal,
        );

        userBorrowPart = await wbtcBigBangMarket.userBorrowPart(
            deployer.address,
        );

        const wbtcMarketTotalDebt = await wbtcBigBangMarket.getTotalDebt();
        expect(wbtcMarketTotalDebt.eq(userBorrowPart)).to.be.true;

        /// @audit Repay to drag totalDebt below minDebtSize
        await wbtcBigBangMarket.repay(
            deployer.address,
            deployer.address,
            true,
            wbtcMarketusdoBorrowVal.mul(99).div(100),
        );
        console.log('We can repay, less than 100% so we go below min');

        // Accrue should revert now due to this
        try {
            await wbtcBigBangMarket.accrue();
        } catch (e) {
            console.log('e', e);
            console.log('And we got the revert we expected');
        }

        try {
            // We cannot repay rest
            await wbtcBigBangMarket.repay(
                deployer.address,
                deployer.address,
                true,
                wbtcMarketusdoBorrowVal.mul(1).div(100),
            );
        } catch (e) {
            console.log('e', e);
            console.log('We cannot repay');
        }

        try {
            // We cannot borrow anymore due to accrue
            await wbtcBigBangMarket.borrow(
                deployer.address,
                deployer.address,
                wbtcMarketusdoBorrowVal,
            );
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
            } = await loadFixture(register);

            const log = (message: string, shouldLog?: boolean) =>
                shouldLog && console.log(message);

            const shouldLog = false;

            const { penrose } = await registerPenrose(
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
                0,
                0, //not main market but we can work with the same configuration for this test
                false,
            );
            const usdcUsdoBigBangMarket = usdcUsdoBBData.bigBangMarket;
            await usd0.setMinterStatus(usdcUsdoBigBangMarket.address, true);
            await usd0.setBurnerStatus(usdcUsdoBigBangMarket.address, true);

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

            //add collateral to markets
            await wethUsdoBigBangMarket.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                wethCollateralShare,
            );
            await usdcUsdoBigBangMarket.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                usdcCollateralShare,
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

            await wethUsdoBigBangMarket.borrow(
                deployer.address,
                deployer.address,
                wethMarketBorrowVal,
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
            await usdcUsdoBigBangMarket.borrow(
                deployer.address,
                deployer.address,
                usdcMarketBorrowVal,
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
            await usdcUsdoBigBangMarket.repay(
                deployer.address,
                deployer.address,
                false,
                usdcMarketBorrowPart,
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
                eoa1.address,
                false,
                0,
                valShare,
            );

            //borrow
            const usdoBorrowVal = wethMintVal
                .mul(74)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            await wethBigBangMarket
                .connect(eoa1)
                .approveBorrow(deployer.address, valShare);
            await wethBigBangMarket.borrow(
                eoa1.address,
                eoa1.address,
                usdoBorrowVal,
            );
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
            await expect(
                wethBigBangMarket.repay(
                    eoa1.address,
                    eoa1.address,
                    false,
                    userBorrowPart,
                ),
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
            await wethBigBangMarket.repay(
                eoa1.address,
                eoa1.address,
                false,
                userBorrowPart,
            );
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
                penrose,
                wethBigBangMarket,
                weth,
                wethAssetId,
                yieldBox,
                eoa1,
                usd0WethOracle,
                __usd0WethPrice,
                __wethUsdcPrice,
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

            await expect(
                wethBigBangMarket.liquidate(
                    [eoa1.address],
                    [usdoBorrowVal],
                    [0],
                    [liquidationReceiver.address],
                    [liquidateData],
                ),
            ).to.be.reverted;

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
            await expect(
                wethBigBangMarket.liquidate(
                    [eoa1.address],
                    [usdoBorrowVal],
                    [0],
                    [liquidationReceiver.address],
                    [liquidateData],
                ),
            ).to.not.be.reverted;
            await expect(
                wethBigBangMarket.liquidate(
                    [eoa1.address],
                    [usdoBorrowVal],
                    [0],
                    [liquidationReceiver.address],
                    [liquidateData],
                ),
            ).to.be.reverted;
            await expect(
                wethBigBangMarket.liquidate(
                    [eoa1.address],
                    [usdoBorrowVal],
                    [0],
                    [],
                    [liquidateData],
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
    describe.skip('fees', () => {
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
                penrose,
                eoas,
                twTap,
            } = await loadFixture(register);

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
                expect(
                    userBorrowPart.gte(
                        usdoBorrowVal.sub(BN((10e18).toString())),
                    ),
                ).to.be.true; //slightly bigger because of the opening borrow fee
            }

            //----------------

            for (let i = 0; i < eoas.length; i++) {
                const eoa = eoas[i];
                const usd0Balance = await yieldBox.toAmount(
                    await penrose.usdoAssetId(),
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
                    await penrose.usdoAssetId(),
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
                    penrose.address,
                    await wethBigBangMarket.collateralId(),
                ),
                false,
            );
            expect(yieldBoxBalanceOfFeeBefore.eq(0)).to.be.true;

            //deposit fees to yieldBox
            await expect(
                penrose.withdrawAllMarketFees(
                    [wethBigBangMarket.address],
                    twTap.address,
                ),
            ).to.not.be.reverted;

            const feeBalance = await usd0.balanceOf(twTap.address);
            expect(feeBalance.eq(0)).to.be.true;
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
                penrose,
                eoas,
                twTap,
            } = await loadFixture(register);

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
                expect(
                    userBorrowPart.gte(
                        usdoBorrowVal.sub(BN((10e18).toString())),
                    ),
                ).to.be.true; //slightly bigger because of the opening borrow fee
            }

            //----------------
            for (let i = 0; i < eoas.length; i++) {
                const eoa = eoas[i];
                const usd0Balance = await yieldBox.toAmount(
                    await penrose.usdoAssetId(),
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
                    penrose.address,
                    await wethBigBangMarket.collateralId(),
                ),
                false,
            );
            expect(yieldBoxBalanceOfFeeBefore.eq(0)).to.be.true;

            //deposit fees to yieldBox
            await expect(
                penrose.withdrawAllMarketFees(
                    [wethBigBangMarket.address],
                    twTap.address,
                ),
            ).to.not.be.reverted;

            const yieldBoxBalanceOfFeeVe = await usd0.balanceOf(twTap.address);
            expect(yieldBoxBalanceOfFeeVe.eq(0)).to.be.true;

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
                penrose.withdrawAllMarketFees(
                    [wethBigBangMarket.address],
                    twTap.address,
                ),
            ).to.not.be.reverted;

            const yieldBoxFinalBalanceOfFeeVe = await usd0.balanceOf(
                twTap.address,
            );
            expect(yieldBoxFinalBalanceOfFeeVe.gte(yieldBoxBalanceOfFeeVe)).to
                .be.true;
        });

        it('should perform multiple borrow operations, repay everything and withdraw fees', async () => {
            const {
                penrose,
                wethBigBangMarket,
                weth,
                usd0,
                wethAssetId,
                yieldBox,
                eoa1,
                multiSwapper,
                timeTravel,
                __wethUsdcPrice,
                twTap,
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
            expect(
                userBorrowPart.gte(
                    usdoBorrowVal.mul(3).sub(BN((2e18).toString())),
                ),
            ).to.be.true;
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

            await penrose.withdrawAllMarketFees(
                [wethBigBangMarket.address],
                twTap.address,
            );

            const feeVeTap = penrose.address;
            const yieldBoxBalanceOfFeeVeAmount = await usd0.balanceOf(
                twTap.address,
            );

            expect(yieldBoxBalanceOfFeeVeAmount.eq(0)).to.be.true;
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

            await expect(
                wethBigBangMarket.borrow(
                    deployer.address,
                    deployer.address,
                    usdoBorrowVal,
                ),
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
                timeTravel,
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

            await expect(
                wethBigBangMarket.addCollateral(
                    deployer.address,
                    deployer.address,
                    false,
                    0,
                    valShare,
                ),
            ).to.be.reverted;

            await wethBigBangMarket.updatePause(2, false);

            await wethBigBangMarket.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                valShare,
            );

            await wethBigBangMarket.updatePause(0, true);

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
            ).to.be.reverted;

            await wethBigBangMarket.updatePause(0, false);

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

            await wethBigBangMarket.updatePause(1, true);

            await expect(
                wethBigBangMarket.repay(
                    deployer.address,
                    deployer.address,
                    false,
                    userBorrowPart,
                ),
            ).to.be.reverted;

            await wethBigBangMarket.updatePause(1, false);

            await expect(
                wethBigBangMarket.repay(
                    deployer.address,
                    deployer.address,
                    false,
                    userBorrowPart,
                ),
            ).not.to.be.reverted;

            await wethBigBangMarket.updatePause(3, true);

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
            ).to.be.reverted;

            await wethBigBangMarket.updatePause(3, false);

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
                penrose,
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

            const wbtcMarketTotalDebt = await wbtcBigBangMarket.getTotalDebt();
            expect(wbtcMarketTotalDebt.eq(userBorrowPart)).to.be.true;

            let currentWbtcDebtRate = await wbtcBigBangMarket.getDebtRate();
            expect(currentWbtcDebtRate.eq(ethers.utils.parseEther('0.035'))).to
                .be.true;

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
                penrose,
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
                penrose,
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
                penrose,
                eoa1,
                timeTravel,
                cluster,
            };
        };

        it.skip('Should lever up by buying collateral', async () => {
            const {
                deployer,
                mockSwapper,
                weth,
                usd0,
                wethId,
                yieldBox,
                wethBigBangMarket,
                penrose,
                eoa1,
                timeTravel,
                cluster,
            } = await loadFixture(setUp);

            await cluster.updateContract(
                hre.SDK.eChainId,
                mockSwapper.address,
                true,
            );

            await cluster.updateContract(
                hre.SDK.eChainId,
                wethBigBangMarket.address,
                true,
            );
            expect(
                await wethBigBangMarket.userBorrowPart(deployer.address),
            ).to.equal(E(10_000).div(10_000));
            const ybBalance = await yieldBox.balanceOf(
                deployer.address,
                await penrose.usdoAssetId(),
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

            // //prefund swapper with some WETH
            // await weth.freeMint(E(10));
            // await weth.transfer(mockSwapper.address, E(10));

            const collateralBefore =
                await wethBigBangMarket.userCollateralShare(deployer.address);
            const borrowBefore = await wethBigBangMarket.userBorrowPart(
                deployer.address,
            );
            const ybBalanceOfDeployerAssetBefore = await yieldBox.balanceOf(
                deployer.address,
                await wethBigBangMarket.assetId(),
            );
            const encoder = new ethers.utils.AbiCoder();
            const leverageData = encoder.encode(
                ['uint256', 'bytes'],
                [E(10), []],
            );
            // Buy more collateral
            await wethBigBangMarket.buyCollateral(
                deployer.address,
                E(1), // One ETH; in amount
                0, // No additional payment
                leverageData,
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

        it.skip('Should lever down by selling collateral', async () => {
            const {
                deployer,
                mockSwapper,
                weth,
                usd0,
                wethId,
                yieldBox,
                wethBigBangMarket,
                penrose,
                eoa1,
                timeTravel,
                cluster,
            } = await loadFixture(setUp);

            await cluster.updateContract(
                hre.SDK.eChainId,
                mockSwapper.address,
                true,
            );
            await cluster.updateContract(
                hre.SDK.eChainId,
                wethBigBangMarket.address,
                true,
            );

            expect(
                await yieldBox.balanceOf(
                    deployer.address,
                    await wethBigBangMarket.assetId(),
                ),
            ).to.equal(E(1).mul(1e8)); //borrowed in setUp

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
            await cluster.updateContract(
                hre.SDK.eChainId,
                mockSwapper.address,
                true,
            );
            const encoder = new ethers.utils.AbiCoder();
            const leverageData = encoder.encode(
                ['uint256', 'bytes'],
                [E(10), []],
            );

            await wethBigBangMarket.sellCollateral(
                deployer.address,
                E(10).mul(1e8),
                leverageData,
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
