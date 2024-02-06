import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { LiquidationQueue__factory } from '@tapioca-sdk/typechain/tapioca-periphery';

//todo: remove skip when swappers references are updated
describe.skip('LiquidationQueue test', () => {
    describe('reverts', () => {
        it('should throw if premium too high or amount too low', async () => {
            const { liquidationQueue, deployer } = await loadFixture(register);

            await expect(
                liquidationQueue.bid(deployer.address, 40, 1),
            ).to.be.revertedWith('LQ: premium too high');

            await expect(liquidationQueue.bid(deployer.address, 10, 1)).to.be
                .reverted;
        });

        it('should now allow bid on uninitialized contract', async () => {
            const { deployer, LQ_META } = await loadFixture(register);

            const LiquidationQueue = new LiquidationQueue__factory(deployer);
            const liquidationQueueTest = await LiquidationQueue.deploy();

            await expect(
                liquidationQueueTest.bid(
                    deployer.address,
                    10,
                    LQ_META.minBidAmount,
                ),
            ).to.be.revertedWith('LQ: Not initialized');
        });

        it('should not allow initializing LQ twice', async () => {
            const { liquidationQueue, deployer, wethUsdcSingularity } =
                await loadFixture(register);

            const LQ_META = {
                activationTime: 600, // 10min
                minBidAmount: ethers.BigNumber.from((1e18).toString()).mul(200), // 200 USDC
                defaultBidAmount: ethers.BigNumber.from((1e18).toString()).mul(
                    400,
                ), // 400 USDC
                feeCollector: deployer.address,
                bidExecutionSwapper: ethers.constants.AddressZero,
                usdoSwapper: ethers.constants.AddressZero,
            };
            await expect(
                liquidationQueue.init(LQ_META, wethUsdcSingularity.address),
            ).to.be.revertedWith('LQ: Initialized');
        });

        it('should not allow setting bid swapper from not authorized account ', async () => {
            const { liquidationQueue } = await loadFixture(register);

            await expect(
                liquidationQueue.setBidExecutionSwapper(
                    ethers.constants.AddressZero,
                ),
            ).to.be.revertedWith('unauthorized');
        });

        it('sould not be able to redeem without a balance', async () => {
            const { liquidationQueue, deployer } = await loadFixture(register);

            await expect(
                liquidationQueue.redeem(deployer.address),
            ).to.be.revertedWith('LQ: No balance due');
        });

        it('should not allow bid execution from EOA', async () => {
            const { liquidationQueue, BN } = await loadFixture(register);

            await expect(
                liquidationQueue.executeBids(
                    BN(1e18).toString(),
                    ethers.utils.toUtf8Bytes(''),
                ),
            ).to.be.revertedWith('LQ: Only Singularity');
        });
    });

    describe('bids', () => {
        it('Should make a bid', async () => {
            const {
                liquidationQueue,
                deployer,
                weth,
                LQ_META,
                yieldBox,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 10;

            await (await weth.freeMint(LQ_META.minBidAmount)).wait();
            await timeTravel(86500);
            await (
                await weth.approve(yieldBox.address, LQ_META.minBidAmount)
            ).wait();
            await yieldBox.depositAsset(
                await liquidationQueue.lqAssetId(),
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount,
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await expect(
                liquidationQueue.bid(
                    deployer.address,
                    POOL,
                    LQ_META.minBidAmount,
                ),
            ).to.emit(liquidationQueue, 'Bid');

            expect(
                (
                    await liquidationQueue.getBidPoolUserInfo(
                        POOL,
                        deployer.address,
                    )
                ).liquidatedAssetAmount,
            ).to.equal(LQ_META.minBidAmount);
        });

        it('Should make a bid, wait 10min and activate it', async () => {
            const {
                liquidationQueue,
                deployer,
                weth,
                LQ_META,
                yieldBox,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 10;

            // Bid
            await (await weth.freeMint(LQ_META.minBidAmount)).wait();
            await timeTravel(86500);
            await (
                await weth.approve(yieldBox.address, LQ_META.minBidAmount)
            ).wait();
            await yieldBox.depositAsset(
                await liquidationQueue.lqAssetId(),
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount,
                0,
            );
            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await liquidationQueue.bid(
                deployer.address,
                POOL,
                LQ_META.minBidAmount,
            );

            // Require bid activation after 10min
            await expect(
                liquidationQueue.activateBid(deployer.address, POOL),
            ).to.be.revertedWith('LQ: too soon');

            // Wait 10min
            await timeTravel(10_000);

            // Activate bid
            await expect(
                liquidationQueue.activateBid(deployer.address, POOL),
            ).to.emit(liquidationQueue, 'ActivateBid');

            // Check for deleted bid pool entry queue
            expect(
                (
                    await liquidationQueue.getBidPoolUserInfo(
                        POOL,
                        deployer.address,
                    )
                ).liquidatedAssetAmount,
            ).to.be.eq(0);

            // Check for order book entry addition record
            const lastAdditionIdx = await liquidationQueue.orderBookInfos(POOL);
            const entry = await liquidationQueue.orderBookEntries(
                POOL,
                lastAdditionIdx.nextBidPush - 1,
            );

            expect(
                entry.bidder.toLowerCase() === deployer.address.toLowerCase() &&
                    entry.bidInfo.liquidatedAssetAmount.eq(
                        LQ_META.minBidAmount,
                    ),
            ).to.be.true;

            // Check order pool info update
            const poolInfo = await liquidationQueue.orderBookInfos(POOL);
            expect(poolInfo.nextBidPush).to.be.eq(1);
        });

        it('Should remove an inactivated bid', async () => {
            const {
                liquidationQueue,
                deployer,
                weth,
                LQ_META,
                yieldBox,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 10;
            const lqAssetId = await liquidationQueue.lqAssetId();

            // Bid
            await (await weth.freeMint(LQ_META.minBidAmount)).wait();
            await timeTravel(86500);
            await (
                await weth.approve(yieldBox.address, LQ_META.minBidAmount)
            ).wait();
            await yieldBox.depositAsset(
                lqAssetId,
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount,
                0,
            );
            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await liquidationQueue.bid(
                deployer.address,
                POOL,
                LQ_META.minBidAmount,
            );

            await expect(
                liquidationQueue.removeBid(deployer.address, POOL),
            ).to.emit(liquidationQueue, 'RemoveBid');

            // Check for deleted bid pool entry queue
            expect(
                (
                    await liquidationQueue.getBidPoolUserInfo(
                        POOL,
                        deployer.address,
                    )
                ).liquidatedAssetAmount,
            ).to.be.eq(0);

            // Check for fund return
            expect(
                await yieldBox.toAmount(
                    lqAssetId,
                    await yieldBox.balanceOf(deployer.address, lqAssetId),
                    false,
                ),
            ).to.be.eq(LQ_META.minBidAmount);
        });

        it('Should execute bids', async () => {
            const {
                deployer,
                eoa1,
                feeCollector,
                __wethUsdcPrice,
                liquidationQueue,
                LQ_META,
                weth,
                usdc,
                yieldBox,
                wethUsdcSingularity,
                wethUsdcOracle,
                multiSwapper,
                BN,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 5;
            const marketAssetId = await wethUsdcSingularity.assetId();
            const marketColId = await wethUsdcSingularity.collateralId();
            const lqAssetId = await liquidationQueue.lqAssetId();

            // Bid and activate
            await (await weth.freeMint(LQ_META.minBidAmount.mul(100))).wait();
            await timeTravel(86500);
            await (
                await weth.approve(
                    yieldBox.address,
                    LQ_META.minBidAmount.mul(100),
                )
            ).wait();
            await yieldBox.depositAsset(
                lqAssetId,
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount.mul(100),
                0,
            );
            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await liquidationQueue.bid(
                deployer.address,
                POOL,
                LQ_META.minBidAmount.mul(100),
            );
            await timeTravel(10_000);
            await liquidationQueue.activateBid(deployer.address, POOL);

            // Mint some weth to deposit as asset with EOA1
            const wethAmount = BN(1e18).mul(100);
            await weth.connect(eoa1).freeMint(wethAmount);
            await timeTravel(86500);
            await weth.connect(eoa1).approve(yieldBox.address, wethAmount);

            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    marketAssetId,
                    eoa1.address,
                    eoa1.address,
                    wethAmount,
                    0,
                );

            await yieldBox
                .connect(eoa1)
                .setApprovalForAll(wethUsdcSingularity.address, true);
            await wethUsdcSingularity
                .connect(eoa1)
                .addAsset(
                    eoa1.address,
                    eoa1.address,
                    false,
                    await yieldBox.toShare(marketAssetId, wethAmount, false),
                );

            // Mint some usdc to deposit as collateral and borrow with deployer
            const usdcAmount = wethAmount.mul(__wethUsdcPrice.div(BN(1e18)));
            const borrowAmount = usdcAmount
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div(BN(1e18)));

            await usdc.freeMint(usdcAmount);
            await timeTravel(86500);
            await usdc.approve(yieldBox.address, usdcAmount);
            await yieldBox.depositAsset(
                marketColId,
                deployer.address,
                deployer.address,
                usdcAmount,
                0,
            );
            await yieldBox.setApprovalForAll(wethUsdcSingularity.address, true);
            await wethUsdcSingularity.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                await yieldBox.toShare(marketColId, usdcAmount, false),
            );
            await wethUsdcSingularity.borrow(
                deployer.address,
                deployer.address,
                borrowAmount,
            );

            // Try to liquidate but with failure since price hasn't changed
            const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
            await expect(
                wethUsdcSingularity.liquidate(
                    [deployer.address],
                    [
                        await wethUsdcSingularity.userBorrowPart(
                            deployer.address,
                        ),
                    ],
                    [0],
                    [data],
                    data,
                    ethers.constants.AddressZero,
                ),
            ).to.be.reverted;

            // Make some price movement and liquidate
            const priceDrop = __wethUsdcPrice.mul(15).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();

            await expect(
                wethUsdcSingularity.liquidate(
                    [deployer.address],
                    [
                        await wethUsdcSingularity.userBorrowPart(
                            deployer.address,
                        ),
                    ],
                    [data],
                    data,
                    multiSwapper.address,
                ),
            ).to.not.be.reverted;

            await expect(
                wethUsdcSingularity.liquidate(
                    [deployer.address],
                    [
                        await wethUsdcSingularity.userBorrowPart(
                            deployer.address,
                        ),
                    ],
                    [data],
                    data,
                    multiSwapper.address,
                ),
            ).to.be.reverted;

            // Check that LQ balances has been added
            expect(
                await liquidationQueue.balancesDue(deployer.address),
            ).to.not.eq(0);
            await liquidationQueue.redeem(feeCollector.address);
            // Check LQ fees has been added after withdrawal
            expect(
                await liquidationQueue.balancesDue(feeCollector.address),
            ).to.not.eq(0);
        });

        it('should bid twice', async () => {
            const {
                liquidationQueue,
                weth,
                LQ_META,
                yieldBox,
                deployer,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 10;

            await (await weth.freeMint(LQ_META.minBidAmount.mul(2))).wait();
            await timeTravel(86500);
            await (
                await weth.approve(
                    yieldBox.address,
                    LQ_META.minBidAmount.mul(2),
                )
            ).wait();
            await yieldBox.depositAsset(
                await liquidationQueue.lqAssetId(),
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount.mul(2),
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await expect(
                liquidationQueue.bid(
                    deployer.address,
                    POOL,
                    LQ_META.minBidAmount,
                ),
            ).to.emit(liquidationQueue, 'Bid');

            await timeTravel(10_000);
            await expect(
                liquidationQueue.activateBid(deployer.address, POOL),
            ).to.emit(liquidationQueue, 'ActivateBid');

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await expect(
                liquidationQueue.bid(
                    deployer.address,
                    POOL,
                    LQ_META.minBidAmount,
                ),
            ).to.emit(liquidationQueue, 'Bid');

            await timeTravel(10_000);
            await expect(
                liquidationQueue.activateBid(deployer.address, POOL),
            ).to.emit(liquidationQueue, 'ActivateBid');
        });

        it('should bid with USDC through external swapper', async () => {
            const {
                deployer,
                penrose,
                yieldBox,
                liquidationQueue,
                wethUsdcSingularity,
                usdc,
                usdcAssetId,
                LQ_META,
                __wethUsdcPrice,
                usdoToWethBidder,
                usd0,
                deployCurveStableToUsdoBidder,
                timeTravel,
            } = await loadFixture(register);

            //deploy and register usdoSwapper and bidExecutionSwapper
            const { stableToUsdoBidder, curveSwapper } =
                await deployCurveStableToUsdoBidder(yieldBox, usdc, usd0);

            const usdofnData = wethUsdcSingularity.interface.encodeFunctionData(
                'setLiquidationQueueConfig',
                [
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    stableToUsdoBidder.address,
                ],
            );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [usdofnData],
                true,
            );

            const executionfnData =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'setLiquidationQueueConfig',
                    [
                        ethers.constants.AddressZero,
                        usdoToWethBidder.address,
                        ethers.constants.AddressZero,
                    ],
                );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [executionfnData],
                true,
            );

            const savedBidSwapper = (
                await liquidationQueue.liquidationQueueMeta()
            ).usdoSwapper;
            expect(savedBidSwapper.toLowerCase()).to.eq(
                stableToUsdoBidder.address.toLowerCase(),
            );

            /// --- Acts ----
            const POOL = 10;
            const lqMeta = await liquidationQueue.liquidationQueueMeta();
            expect(lqMeta.usdoSwapper).to.not.eq(ethers.constants.AddressZero);

            const toBid = LQ_META.defaultBidAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );
            await usdc.freeMint(toBid);
            await timeTravel(86500);
            await usdc.approve(yieldBox.address, toBid);
            await yieldBox.depositAsset(
                usdcAssetId,
                deployer.address,
                deployer.address,
                toBid,
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            const data = new ethers.utils.AbiCoder().encode(
                ['uint256', 'uint256'],
                [LQ_META.minBidAmount.div(1e3), LQ_META.minBidAmount],
            );
            await expect(
                liquidationQueue.bidWithStable(
                    deployer.address,
                    POOL,
                    usdcAssetId,
                    LQ_META.minBidAmount.sub(1e5),
                    new ethers.utils.AbiCoder().encode(
                        ['uint256', 'uint256'],
                        [0, 0],
                    ),
                ),
            ).to.be.revertedWith('LQ: bid too low');

            await expect(
                liquidationQueue.bidWithStable(
                    deployer.address,
                    POOL,
                    usdcAssetId,
                    toBid,
                    new ethers.utils.AbiCoder().encode(
                        ['uint256', 'uint256'],
                        [toBid.mul(10), toBid.mul(10)],
                    ),
                ),
            ).to.be.revertedWith('insufficient-amount-out');

            const testingUsdoToUsdcAmount =
                await stableToUsdoBidder.getOutputAmount(
                    wethUsdcSingularity.address,
                    usdcAssetId,
                    toBid,
                    ethers.utils.toUtf8Bytes(''),
                );
            expect(testingUsdoToUsdcAmount.gt(LQ_META.minBidAmount)).to.be.true;
            expect(testingUsdoToUsdcAmount.lte(toBid)).to.be.true;

            await expect(
                stableToUsdoBidder.setCurveSwapper(curveSwapper.address),
            ).to.emit(stableToUsdoBidder, 'CurveSwapperUpdated');

            await expect(
                liquidationQueue.bidWithStable(
                    deployer.address,
                    POOL,
                    usdcAssetId,
                    toBid,
                    data,
                ),
            ).to.emit(liquidationQueue, 'Bid');
            await expect(
                liquidationQueue.bidWithStable(
                    deployer.address,
                    9999999,
                    usdcAssetId,
                    toBid,
                    data,
                ),
            ).to.be.revertedWith('LQ: premium too high');

            const bidPoolInfo = await liquidationQueue.getBidPoolUserInfo(
                POOL,
                deployer.address,
            );
            expect(bidPoolInfo.usdoAmount.gt(LQ_META.minBidAmount)).to.be.true;
            expect(bidPoolInfo.usdoAmount.lte(toBid)).to.be.true;
        });

        it('should bid with USDO through external swapper', async () => {
            const {
                deployer,
                penrose,
                yieldBox,
                liquidationQueue,
                wethUsdcSingularity,
                usdc,
                usd0,
                weth,
                LQ_META,
                __uniRouter,
                __wethUsdcPrice,
                usdoToWethBidder,
                deployCurveStableToUsdoBidder,
            } = await loadFixture(register);

            //deploy and register usdoSwapper and bidExecutionSwapper
            const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
                yieldBox,
                usdc,
                usd0,
            );

            const usdofnData = wethUsdcSingularity.interface.encodeFunctionData(
                'setLiquidationQueueConfig',
                [
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    stableToUsdoBidder.address,
                ],
            );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [usdofnData],
                true,
            );

            const executionfnData =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'setLiquidationQueueConfig',
                    [
                        ethers.constants.AddressZero,
                        usdoToWethBidder.address,
                        ethers.constants.AddressZero,
                    ],
                );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [executionfnData],
                true,
            );

            const savedBidSwapper = (
                await liquidationQueue.liquidationQueueMeta()
            ).usdoSwapper;
            expect(savedBidSwapper.toLowerCase()).to.eq(
                stableToUsdoBidder.address.toLowerCase(),
            );

            /// --- Acts ----
            const POOL = 10;

            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            const toBid = LQ_META.defaultBidAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );
            await usd0.mint(deployer.address, toBid);
            await usd0.approve(yieldBox.address, toBid);
            await yieldBox.depositAsset(
                usdoAssetId,
                deployer.address,
                deployer.address,
                toBid,
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            const data = new ethers.utils.AbiCoder().encode(
                ['uint256', 'uint256'],
                [LQ_META.minBidAmount.div(1e3), LQ_META.minBidAmount],
            );
            const testOutput = await stableToUsdoBidder.getOutputAmount(
                wethUsdcSingularity.address,
                usdoAssetId,
                toBid,
                ethers.utils.toUtf8Bytes(''),
            );
            expect(testOutput.eq(toBid)).to.be.true;

            await expect(
                liquidationQueue.bidWithStable(
                    deployer.address,
                    POOL,
                    usdoAssetId,
                    toBid,
                    data,
                ),
            ).to.emit(liquidationQueue, 'Bid');

            const bidPoolInfo = await liquidationQueue.getBidPoolUserInfo(
                POOL,
                deployer.address,
            );
            expect(bidPoolInfo.usdoAmount.gt(LQ_META.minBidAmount)).to.be.true;
            expect(bidPoolInfo.usdoAmount.lte(toBid)).to.be.true;
        });

        it('should bid with stable, remove inactive bid, bid again, activate bid', async () => {
            const {
                deployer,
                penrose,
                yieldBox,
                liquidationQueue,
                wethUsdcSingularity,
                usdc,
                usd0,
                weth,
                usdcAssetId,
                LQ_META,
                __wethUsdcPrice,
                usdoToWethBidder,
                timeTravel,
                deployCurveStableToUsdoBidder,
                __uniRouter,
            } = await loadFixture(register);

            //deploy and register USDO

            //deploy and register usdoSwapper and bidExecutionSwapper
            const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
                yieldBox,
                usdc,
                usd0,
            );

            const usdofnData = wethUsdcSingularity.interface.encodeFunctionData(
                'setLiquidationQueueConfig',
                [
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    stableToUsdoBidder.address,
                ],
            );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [usdofnData],
                true,
            );

            const executionfnData =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'setLiquidationQueueConfig',
                    [
                        ethers.constants.AddressZero,
                        usdoToWethBidder.address,
                        ethers.constants.AddressZero,
                    ],
                );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [executionfnData],
                true,
            );

            /// --- Acts ----
            const POOL = 10;
            const lqMeta = await liquidationQueue.liquidationQueueMeta();
            expect(lqMeta.usdoSwapper).to.not.eq(ethers.constants.AddressZero);

            const toBid = LQ_META.defaultBidAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );
            await usdc.freeMint(toBid);
            await timeTravel(86500);
            await usdc.approve(yieldBox.address, toBid);
            await yieldBox.depositAsset(
                usdcAssetId,
                deployer.address,
                deployer.address,
                toBid,
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            const data = new ethers.utils.AbiCoder().encode(
                ['uint256', 'uint256'],
                [LQ_META.minBidAmount.div(1e3), LQ_META.minBidAmount],
            );
            await expect(
                liquidationQueue.bidWithStable(
                    deployer.address,
                    POOL,
                    usdcAssetId,
                    toBid,
                    data,
                ),
            ).to.emit(liquidationQueue, 'Bid');

            const bidPoolInfo = await liquidationQueue.getBidPoolUserInfo(
                POOL,
                deployer.address,
            );
            expect(bidPoolInfo.usdoAmount.gt(LQ_META.minBidAmount)).to.be.true;
            expect(bidPoolInfo.usdoAmount.lte(toBid)).to.be.true;

            // Remove inactive bid
            await expect(
                liquidationQueue.removeBid(deployer.address, POOL),
            ).to.emit(liquidationQueue, 'RemoveBid');

            // Bid again
            await usdc.freeMint(toBid);
            await timeTravel(86500);
            await usdc.approve(yieldBox.address, toBid);
            await yieldBox.depositAsset(
                usdcAssetId,
                deployer.address,
                deployer.address,
                toBid,
                0,
            );
            await expect(
                liquidationQueue.bidWithStable(
                    deployer.address,
                    POOL,
                    usdcAssetId,
                    toBid,
                    data,
                ),
            ).to.emit(liquidationQueue, 'Bid');
            // Wait 10min
            await timeTravel(10_000);

            // Activate bid
            await expect(
                liquidationQueue.activateBid(deployer.address, POOL),
            ).to.emit(liquidationQueue, 'ActivateBid');
        });

        it('should execute bids for stable bidders', async () => {
            const {
                deployer,
                penrose,
                yieldBox,
                liquidationQueue,
                wethUsdcSingularity,
                usdc,
                usd0,
                usdcAssetId,
                LQ_META,
                multiSwapper,
                timeTravel,
                __wethUsdcPrice,
                __uniRouter,
                weth,
                wethUsdcOracle,
                usdoToWethBidder,
                deployCurveStableToUsdoBidder,
            } = await loadFixture(register);

            //deploy and register usdoSwapper and bidExecutionSwapper
            const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
                yieldBox,
                usdc,
                usd0,
            );

            const usdofnData = wethUsdcSingularity.interface.encodeFunctionData(
                'setLiquidationQueueConfig',
                [
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    stableToUsdoBidder.address,
                ],
            );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [usdofnData],
                true,
            );

            const executionfnData =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'setLiquidationQueueConfig',
                    [
                        ethers.constants.AddressZero,
                        usdoToWethBidder.address,
                        ethers.constants.AddressZero,
                    ],
                );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [executionfnData],
                true,
            );

            const savedBidSwapper = (
                await liquidationQueue.liquidationQueueMeta()
            ).usdoSwapper;
            expect(savedBidSwapper.toLowerCase()).to.eq(
                stableToUsdoBidder.address.toLowerCase(),
            );

            /// --- Acts ----
            const POOL = 10;

            const toBid = LQ_META.defaultBidAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );
            await usdc.freeMint(toBid);
            await timeTravel(86500);
            await usdc.approve(yieldBox.address, toBid);
            await yieldBox.depositAsset(
                usdcAssetId,
                deployer.address,
                deployer.address,
                toBid,
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            const data = new ethers.utils.AbiCoder().encode(
                ['uint256', 'uint256'],
                [LQ_META.minBidAmount.div(1e3), LQ_META.minBidAmount],
            );

            await expect(
                liquidationQueue.bidWithStable(
                    deployer.address,
                    POOL,
                    usdcAssetId,
                    toBid,
                    data,
                ),
            ).to.emit(liquidationQueue, 'Bid');

            const bidPoolInfo = await liquidationQueue.getBidPoolUserInfo(
                POOL,
                deployer.address,
            );
            expect(bidPoolInfo.usdoAmount.gt(LQ_META.minBidAmount)).to.be.true;
            expect(bidPoolInfo.usdoAmount.lte(toBid)).to.be.true;

            // Wait 10min
            await timeTravel(10_000);

            // Activate bid
            await expect(
                liquidationQueue.activateBid(deployer.address, POOL),
            ).to.emit(liquidationQueue, 'ActivateBid');

            const accounts = await ethers.getSigners();

            const mixologistAssetId = await wethUsdcSingularity.assetId();
            const mixologistCollateralId =
                await wethUsdcSingularity.collateralId();
            const lqAssetId = await liquidationQueue.lqAssetId();

            //Lend from first account & borrow from the 2nd
            const usdcMintVal = LQ_META.defaultBidAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );

            await weth.connect(accounts[0]).freeMint(LQ_META.defaultBidAmount); //for lending
            await timeTravel(86500);
            await usdc.connect(accounts[0]).freeMint(usdcMintVal); //for collateral
            await timeTravel(86500);

            await weth.connect(accounts[1]).freeMint(LQ_META.defaultBidAmount); //for lending
            await timeTravel(86500);
            await usdc.connect(accounts[1]).freeMint(usdcMintVal); //for collateral
            await timeTravel(86500);

            const lendValShare = await yieldBox.toShare(
                mixologistAssetId,
                LQ_META.minBidAmount,
                false,
            );

            // --- lend
            const mixologistBalanceOfAccountBefore =
                await wethUsdcSingularity.balanceOf(accounts[0].address);
            await expect(
                mixologistBalanceOfAccountBefore,
                '✖️ Account 0 singularity balance before is not right',
            ).to.eq(0);

            await weth
                .connect(accounts[0])
                .approve(yieldBox.address, LQ_META.defaultBidAmount);

            await yieldBox
                .connect(accounts[0])
                .depositAsset(
                    lqAssetId,
                    accounts[0].address,
                    accounts[0].address,
                    LQ_META.defaultBidAmount,
                    0,
                );

            await yieldBox
                .connect(accounts[0])
                .setApprovalForAll(wethUsdcSingularity.address, true);

            await wethUsdcSingularity
                .connect(accounts[0])
                .addAsset(
                    accounts[0].address,
                    accounts[0].address,
                    false,
                    lendValShare,
                );

            const mixologistBalanceOfAccountAfter =
                await wethUsdcSingularity.balanceOf(accounts[0].address);

            await expect(
                parseFloat(
                    ethers.utils.formatEther(mixologistBalanceOfAccountAfter),
                ),
                '✖️ Account 0 singularity balance after lend operation is not right',
            ).to.eq(parseFloat(ethers.utils.formatEther(lendValShare)));

            // --- borrow
            const usdcDepositVal = LQ_META.minBidAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );
            const borrowVal = usdcDepositVal
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div((1e18).toString())); // We borrow 74% collateral, max is 75%

            await usdc
                .connect(accounts[1])
                .approve(yieldBox.address, usdcDepositVal);
            await yieldBox
                .connect(accounts[1])
                .depositAsset(
                    mixologistCollateralId,
                    accounts[1].address,
                    accounts[1].address,
                    usdcDepositVal,
                    0,
                );
            await yieldBox
                .connect(accounts[1])
                .setApprovalForAll(wethUsdcSingularity.address, true);
            const collateralShare = await yieldBox.toShare(
                mixologistCollateralId,
                usdcDepositVal,
                false,
            );
            await wethUsdcSingularity
                .connect(accounts[1])
                .addCollateral(
                    accounts[1].address,
                    accounts[1].address,
                    false,
                    0,
                    collateralShare,
                );
            await wethUsdcSingularity
                .connect(accounts[1])
                .borrow(accounts[1].address, accounts[1].address, borrowVal);

            //  ---liquidate now
            const swapData = new ethers.utils.AbiCoder().encode(
                ['uint256'],
                [1],
            );
            await expect(
                wethUsdcSingularity.liquidate(
                    [accounts[1].address],
                    [borrowVal],
                    [swapData],
                    swapData,
                    multiSwapper.address,
                ),
            ).to.be.reverted;

            const priceDrop = __wethUsdcPrice.mul(2).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

            const shareForCallerBefore = await yieldBox.balanceOf(
                accounts[0].address,
                lqAssetId,
            );

            await wethUsdcSingularity
                .connect(accounts[0])
                .liquidate(
                    [accounts[1].address],
                    [borrowVal],
                    [swapData],
                    swapData,
                    multiSwapper.address,
                );
            const shareForCallerAfter = await yieldBox.balanceOf(
                accounts[0].address,
                lqAssetId,
            );
            await expect(
                parseFloat(shareForCallerAfter.toString()),
                '✖️ After liquidation shares not right',
            ).to.be.greaterThan(parseFloat(shareForCallerBefore.toString()));
        });

        it('should execute bids for stable bidders using the entire bid amount', async () => {
            const {
                deployer,
                penrose,
                yieldBox,
                liquidationQueue,
                wethUsdcSingularity,
                usdc,
                usd0,
                usdcAssetId,
                LQ_META,
                multiSwapper,
                __wethUsdcPrice,
                __uniRouter,
                weth,
                wethUsdcOracle,
                usdoToWethBidder,
                deployCurveStableToUsdoBidder,
                timeTravel,
            } = await loadFixture(register);

            //deploy and register usdoSwapper and bidExecutionSwapper
            const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
                yieldBox,
                usdc,
                usd0,
            );

            const usdofnData = wethUsdcSingularity.interface.encodeFunctionData(
                'setLiquidationQueueConfig',
                [
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    stableToUsdoBidder.address,
                ],
            );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [usdofnData],
                true,
            );

            const executionfnData =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'setLiquidationQueueConfig',
                    [
                        ethers.constants.AddressZero,
                        usdoToWethBidder.address,
                        ethers.constants.AddressZero,
                    ],
                );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [executionfnData],
                true,
            );

            const savedBidSwapper = (
                await liquidationQueue.liquidationQueueMeta()
            ).usdoSwapper;
            expect(savedBidSwapper.toLowerCase()).to.eq(
                stableToUsdoBidder.address.toLowerCase(),
            );

            /// --- Acts ----
            const POOL = 10;

            const toBid = LQ_META.closeToMinBidAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );
            await usdc.freeMint(toBid);
            await timeTravel(86500);
            await usdc.approve(yieldBox.address, toBid);
            await yieldBox.depositAsset(
                usdcAssetId,
                deployer.address,
                deployer.address,
                toBid,
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            const data = new ethers.utils.AbiCoder().encode(
                ['uint256', 'uint256'],
                [LQ_META.minBidAmount.div(1e3), LQ_META.minBidAmount],
            );
            const accounts = await ethers.getSigners();
            await expect(
                liquidationQueue.bidWithStable(
                    deployer.address,
                    POOL,
                    usdcAssetId,
                    toBid,
                    data,
                ),
            ).to.emit(liquidationQueue, 'Bid');

            await usdc.connect(accounts[2]).freeMint(toBid);
            await timeTravel(86500);
            await usdc.connect(accounts[2]).approve(yieldBox.address, toBid);
            await yieldBox
                .connect(accounts[2])
                .depositAsset(
                    usdcAssetId,
                    accounts[2].address,
                    accounts[2].address,
                    toBid,
                    0,
                );

            await yieldBox
                .connect(accounts[2])
                .setApprovalForAll(liquidationQueue.address, true);
            await expect(
                liquidationQueue
                    .connect(accounts[2])
                    .bidWithStable(
                        accounts[2].address,
                        POOL,
                        usdcAssetId,
                        toBid,
                        data,
                    ),
            ).to.emit(liquidationQueue, 'Bid');

            const bidPoolInfoDeployer =
                await liquidationQueue.getBidPoolUserInfo(
                    POOL,
                    deployer.address,
                );
            expect(bidPoolInfoDeployer.usdoAmount.gt(LQ_META.minBidAmount)).to
                .be.true;
            expect(bidPoolInfoDeployer.usdoAmount.lte(toBid)).to.be.true;
            const bidPoolInfoAnotherAccount =
                await liquidationQueue.getBidPoolUserInfo(
                    POOL,
                    accounts[2].address,
                );

            expect(
                bidPoolInfoAnotherAccount.usdoAmount.gt(LQ_META.minBidAmount),
            ).to.be.true;
            expect(bidPoolInfoAnotherAccount.usdoAmount.lte(toBid)).to.be.true;

            // Wait 10min
            await timeTravel(10_000);

            // Activate bid
            await expect(
                liquidationQueue.activateBid(deployer.address, POOL),
            ).to.emit(liquidationQueue, 'ActivateBid');
            await expect(
                liquidationQueue
                    .connect(accounts[2])
                    .activateBid(accounts[2].address, POOL),
            ).to.emit(liquidationQueue, 'ActivateBid');

            const mixologistAssetId = await wethUsdcSingularity.assetId();
            const mixologistCollateralId =
                await wethUsdcSingularity.collateralId();
            const lqAssetId = await liquidationQueue.lqAssetId();

            //Lend from first account & borrow from the 2nd
            const lentAmount = LQ_META.defaultBidAmount.mul(2);
            const usdcMintVal = lentAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );

            await weth.connect(accounts[0]).freeMint(lentAmount); //for lending
            await timeTravel(86500);
            await usdc.connect(accounts[0]).freeMint(usdcMintVal); //for collateral

            await timeTravel(86500);
            await weth.connect(accounts[1]).freeMint(lentAmount); //for lending
            await timeTravel(86500);
            await usdc.connect(accounts[1]).freeMint(usdcMintVal); //for collateral
            await timeTravel(86500);

            const lendValShare = await yieldBox.toShare(
                mixologistAssetId,
                lentAmount,
                false,
            );

            // --- lend
            const mixologistBalanceOfAccountBefore =
                await wethUsdcSingularity.balanceOf(accounts[0].address);
            await expect(
                mixologistBalanceOfAccountBefore,
                '✖️ Account 0 singularity balance before is not right',
            ).to.eq(0);

            await weth
                .connect(accounts[0])
                .approve(yieldBox.address, lentAmount);

            await yieldBox
                .connect(accounts[0])
                .depositAsset(
                    lqAssetId,
                    accounts[0].address,
                    accounts[0].address,
                    lentAmount,
                    0,
                );

            await yieldBox
                .connect(accounts[0])
                .setApprovalForAll(wethUsdcSingularity.address, true);

            await wethUsdcSingularity
                .connect(accounts[0])
                .addAsset(
                    accounts[0].address,
                    accounts[0].address,
                    false,
                    lendValShare,
                );

            const mixologistBalanceOfAccountAfter =
                await wethUsdcSingularity.balanceOf(accounts[0].address);

            await expect(
                parseFloat(
                    ethers.utils.formatEther(mixologistBalanceOfAccountAfter),
                ),
                '✖️ Account 0 singularity balance after lend operation is not right',
            ).to.eq(parseFloat(ethers.utils.formatEther(lendValShare)));

            // --- borrow
            const usdcDepositVal = LQ_META.defaultBidAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );
            const borrowVal = usdcDepositVal
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div((1e18).toString())); // We borrow 74% collateral, max is 75%

            await usdc
                .connect(accounts[1])
                .approve(yieldBox.address, usdcDepositVal);
            await yieldBox
                .connect(accounts[1])
                .depositAsset(
                    mixologistCollateralId,
                    accounts[1].address,
                    accounts[1].address,
                    usdcDepositVal,
                    0,
                );
            await yieldBox
                .connect(accounts[1])
                .setApprovalForAll(wethUsdcSingularity.address, true);
            const collateralShare = await yieldBox.toShare(
                mixologistCollateralId,
                usdcDepositVal,
                false,
            );
            await wethUsdcSingularity
                .connect(accounts[1])
                .addCollateral(
                    accounts[1].address,
                    accounts[1].address,
                    false,
                    0,
                    collateralShare,
                );
            await wethUsdcSingularity
                .connect(accounts[1])
                .borrow(accounts[1].address, accounts[1].address, borrowVal);

            //  ---liquidate now
            const swapData = new ethers.utils.AbiCoder().encode(
                ['uint256'],
                [1],
            );
            await expect(
                wethUsdcSingularity.liquidate(
                    [accounts[1].address],
                    [borrowVal],
                    [swapData],
                    swapData,
                    multiSwapper.address,
                ),
            ).to.be.reverted;

            const priceDrop = __wethUsdcPrice.mul(2).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

            const shareForCallerBefore = await yieldBox.balanceOf(
                accounts[0].address,
                lqAssetId,
            );

            await wethUsdcSingularity
                .connect(accounts[0])
                .liquidate(
                    [accounts[1].address],
                    [borrowVal],
                    [swapData],
                    swapData,
                    multiSwapper.address,
                );
            const shareForCallerAfter = await yieldBox.balanceOf(
                accounts[0].address,
                lqAssetId,
            );
            await expect(
                parseFloat(shareForCallerAfter.toString()),
                '✖️ After liquidation shares not right',
            ).to.be.greaterThan(parseFloat(shareForCallerBefore.toString()));

            // Check that LQ balances has been added
            const deployerBalancesDue = await liquidationQueue.balancesDue(
                deployer.address,
            );
            const acc1BalancesDue = await liquidationQueue.balancesDue(
                accounts[1].address,
            );
            const acc2BalancesDue = await liquidationQueue.balancesDue(
                accounts[2].address,
            );
            expect(acc1BalancesDue.eq(0)).to.be.true;
            expect(deployerBalancesDue.gt(acc2BalancesDue)).to.be.true; //the first bidder
        });

        it('should try to active when no bids are placed', async () => {
            const { deployer, liquidationQueue } = await loadFixture(register);

            // Activate bid
            await expect(
                liquidationQueue.activateBid(deployer.address, 1),
            ).to.be.revertedWith('LQ: bid not available');
        });

        it('bid, activate, try to remove inactive bid', async () => {
            const {
                liquidationQueue,
                deployer,
                weth,
                LQ_META,
                yieldBox,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 10;

            await (await weth.freeMint(LQ_META.minBidAmount)).wait();
            await timeTravel(86500);
            await (
                await weth.approve(yieldBox.address, LQ_META.minBidAmount)
            ).wait();
            await yieldBox.depositAsset(
                await liquidationQueue.lqAssetId(),
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount,
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await expect(
                liquidationQueue.bid(
                    deployer.address,
                    POOL,
                    LQ_META.minBidAmount,
                ),
            ).to.emit(liquidationQueue, 'Bid');

            expect(
                (
                    await liquidationQueue.getBidPoolUserInfo(
                        POOL,
                        deployer.address,
                    )
                ).liquidatedAssetAmount,
            ).to.equal(LQ_META.minBidAmount);

            await timeTravel(86400);

            await expect(
                liquidationQueue.activateBid(deployer.address, POOL),
            ).to.emit(liquidationQueue, 'ActivateBid');

            // Check for deleted bid pool entry queue
            expect(
                (
                    await liquidationQueue.getBidPoolUserInfo(
                        POOL,
                        deployer.address,
                    )
                ).liquidatedAssetAmount,
            ).to.be.eq(0);

            // Check for order book entry addition record
            const lastAdditionIdx = await liquidationQueue.orderBookInfos(POOL);
            const entry = await liquidationQueue.orderBookEntries(
                POOL,
                lastAdditionIdx.nextBidPush - 1,
            );

            expect(
                entry.bidder.toLowerCase() === deployer.address.toLowerCase() &&
                    entry.bidInfo.liquidatedAssetAmount.eq(
                        LQ_META.minBidAmount,
                    ),
            ).to.be.true;

            // Check order pool info update
            const poolInfo = await liquidationQueue.orderBookInfos(POOL);
            expect(poolInfo.nextBidPush).to.be.eq(1);

            await expect(
                liquidationQueue.removeBid(deployer.address, POOL),
            ).to.be.revertedWith('LQ: bid not available');
        });

        it('place a few bids, active all of them', async () => {
            const {
                liquidationQueue,
                deployer,
                weth,
                LQ_META,
                yieldBox,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 10;

            await (await weth.freeMint(LQ_META.minBidAmount.mul(3))).wait();
            await timeTravel(86500);
            await (
                await weth.approve(
                    yieldBox.address,
                    LQ_META.minBidAmount.mul(3),
                )
            ).wait();
            await yieldBox.depositAsset(
                await liquidationQueue.lqAssetId(),
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount.mul(3),
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);

            //bid 1
            await liquidationQueue.bid(
                deployer.address,
                POOL,
                LQ_META.minBidAmount,
            );
            await timeTravel(86400);
            await liquidationQueue.activateBid(deployer.address, POOL);

            //bid 2
            await liquidationQueue.bid(
                deployer.address,
                POOL,
                LQ_META.minBidAmount,
            );
            await timeTravel(86400);
            await liquidationQueue.activateBid(deployer.address, POOL);

            //bid 3
            await liquidationQueue.bid(
                deployer.address,
                POOL,
                LQ_META.minBidAmount,
            );
            await timeTravel(86400);
            await liquidationQueue.activateBid(deployer.address, POOL);

            const bidIndexLen = await liquidationQueue.userBidIndexLength(
                deployer.address,
                POOL,
            );
            expect(bidIndexLen.eq(1)).to.be.true; //TODO: fix after confirmation

            // Check for deleted bid pool entry queue
            expect(
                (
                    await liquidationQueue.getBidPoolUserInfo(
                        POOL,
                        deployer.address,
                    )
                ).liquidatedAssetAmount,
            ).to.be.eq(0);

            // Check for order book entry addition record
            const lastAdditionIdx = await liquidationQueue.orderBookInfos(POOL);
            let entry = await liquidationQueue.orderBookEntries(
                POOL,
                lastAdditionIdx.nextBidPush - 1,
            );
            expect(
                entry.bidder.toLowerCase() === deployer.address.toLowerCase() &&
                    entry.bidInfo.liquidatedAssetAmount.eq(
                        LQ_META.minBidAmount,
                    ),
            ).to.be.true;

            entry = await liquidationQueue.orderBookEntries(
                POOL,
                lastAdditionIdx.nextBidPush - 2,
            );
            expect(
                entry.bidder.toLowerCase() === deployer.address.toLowerCase() &&
                    entry.bidInfo.liquidatedAssetAmount.eq(
                        LQ_META.minBidAmount,
                    ),
            ).to.be.true;

            entry = await liquidationQueue.orderBookEntries(
                POOL,
                lastAdditionIdx.nextBidPush - 3,
            );
            expect(
                entry.bidder.toLowerCase() === deployer.address.toLowerCase() &&
                    entry.bidInfo.liquidatedAssetAmount.eq(
                        LQ_META.minBidAmount,
                    ),
            ).to.be.true;
            expect(lastAdditionIdx.nextBidPush).to.eq(3);
        });

        it('should bid, activates id and try to remove inactive bid', async () => {
            const {
                liquidationQueue,
                deployer,
                weth,
                LQ_META,
                yieldBox,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 10;

            await (await weth.freeMint(LQ_META.minBidAmount)).wait();
            await timeTravel(86500);
            await (
                await weth.approve(yieldBox.address, LQ_META.minBidAmount)
            ).wait();
            await yieldBox.depositAsset(
                await liquidationQueue.lqAssetId(),
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount,
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);

            //bid 1
            await liquidationQueue.bid(
                deployer.address,
                POOL,
                LQ_META.minBidAmount,
            );
            await timeTravel(86400);
            await liquidationQueue.activateBid(deployer.address, POOL);
            await expect(
                liquidationQueue.removeBid(deployer.address, POOL),
            ).to.be.revertedWith('LQ: bid not available');
        });
    });

    describe('views', () => {
        it('should get the market', async () => {
            const { liquidationQueue, wethUsdcSingularity } = await loadFixture(
                register,
            );

            const market = await liquidationQueue.market();
            const mixologistName = await wethUsdcSingularity.name();
            expect(market.length > 0).to.be.true;
            expect(market).to.eq(mixologistName);
        });

        it('should return order book entries', async () => {
            const {
                liquidationQueue,
                weth,
                LQ_META,
                yieldBox,
                deployer,
                timeTravel,
            } = await loadFixture(register);

            const orderBookEntries =
                await liquidationQueue.getOrderBookPoolEntries(0);
            expect(orderBookEntries.length == 0).to.be.true;

            const POOL = 10;

            await (await weth.freeMint(LQ_META.minBidAmount.mul(2))).wait();
            await timeTravel(86500);
            await (
                await weth.approve(
                    yieldBox.address,
                    LQ_META.minBidAmount.mul(2),
                )
            ).wait();
            await yieldBox.depositAsset(
                await liquidationQueue.lqAssetId(),
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount.mul(2),
                0,
            );

            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await expect(
                liquidationQueue.bid(
                    deployer.address,
                    POOL,
                    LQ_META.minBidAmount,
                ),
            ).to.emit(liquidationQueue, 'Bid');

            await timeTravel(10_000);
            await expect(
                liquidationQueue.activateBid(deployer.address, POOL),
            ).to.emit(liquidationQueue, 'ActivateBid');

            const orderBookEntriesForExistingPool =
                await liquidationQueue.getOrderBookPoolEntries(POOL);
            expect(orderBookEntriesForExistingPool.length > 0).to.be.true;
        });

        it('should check different flows using the 18 decimals test tokens', async () => {
            const poolId = 1;
            const accounts = await ethers.getSigners();
            const {
                yieldBox,
                liquidationQueue,
                wethUsdcSingularity,
                LQ_META,
                penrose,
                usd0,
                weth,
                usdc,
                __wethUsdcPrice,
                multiSwapper,
                wethUsdcOracle,
                timeTravel,
            } = await loadFixture(register);

            const mixologistAssetId = await wethUsdcSingularity.assetId();
            const mixologistCollateralId =
                await wethUsdcSingularity.collateralId();
            const lqAssetId = await liquidationQueue.lqAssetId();
            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            expect(lqAssetId, '✖️ Wrong asset id').to.eq(mixologistAssetId);
            expect(lqAssetId, '✖️ Wrong collateral id').to.not.eq(
                mixologistCollateralId,
            );

            const usdcMintVal = LQ_META.defaultBidAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );
            const usdcDepositVal = LQ_META.minBidAmount.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );

            ///
            /// - get test funds
            ///
            for (const account of accounts) {
                await weth.connect(account).freeMint(LQ_META.defaultBidAmount); //for lending
                await timeTravel(86500);
                await usdc.connect(account).freeMint(usdcMintVal); //for collateral
                await timeTravel(86500);
            }

            const wethBalanceOfFirstAccount = parseFloat(
                ethers.utils.formatEther(
                    await weth.balanceOf(accounts[0].address),
                ),
            );
            const usdcBalanceOfFirstAccount = parseFloat(
                ethers.utils.formatEther(
                    await weth.balanceOf(accounts[0].address),
                ), //seems like the mock version of USDC has 18 decimals instead of 6
            );

            expect(wethBalanceOfFirstAccount, '✖️ WETH minting failed ').to.eq(
                parseFloat(ethers.utils.formatEther(LQ_META.defaultBidAmount)),
            );
            expect(usdcBalanceOfFirstAccount, '✖️ USDC minting failed').to.eq(
                parseFloat(ethers.utils.formatEther(LQ_META.defaultBidAmount)),
            );

            ///
            /// - deposit asset into the YieldBox
            ///
            for (const account of accounts) {
                const beforeDepositAmountOfAccount = await yieldBox.amountOf(
                    account.address,
                    lqAssetId,
                );
                expect(
                    parseFloat(
                        ethers.utils.formatEther(beforeDepositAmountOfAccount),
                    ),
                    `✖️ Initial amount not right for account ${accounts.indexOf(
                        account,
                    )}`,
                ).to.eq(0);

                await expect(
                    yieldBox
                        .connect(account)
                        .depositAsset(
                            lqAssetId,
                            account.address,
                            account.address,
                            LQ_META.defaultBidAmount,
                            0,
                        ),
                ).to.be.reverted;

                await weth
                    .connect(account)
                    .approve(yieldBox.address, LQ_META.defaultBidAmount);

                await yieldBox
                    .connect(account)
                    .depositAsset(
                        lqAssetId,
                        account.address,
                        account.address,
                        LQ_META.defaultBidAmount,
                        0,
                    );

                const amountOfAccount = await yieldBox.amountOf(
                    account.address,
                    lqAssetId,
                );
                expect(
                    parseFloat(ethers.utils.formatEther(amountOfAccount)),
                    `✖️ Amount not right for account ${accounts.indexOf(
                        account,
                    )}`,
                ).to.eq(
                    parseFloat(
                        ethers.utils.formatEther(LQ_META.defaultBidAmount),
                    ),
                );
            }

            ///
            /// - place some bids, try to activate before time and remove inactive
            ///
            for (const account of accounts) {
                await expect(
                    liquidationQueue
                        .connect(account)
                        .bid(account.address, poolId, LQ_META.minBidAmount),
                ).to.be.reverted;
                await expect(
                    liquidationQueue
                        .connect(account)
                        .removeBid(account.address, poolId),
                ).to.be.revertedWith('LQ: bid not available');

                await yieldBox
                    .connect(account)
                    .setApprovalForAll(liquidationQueue.address, true);
                await liquidationQueue
                    .connect(account)
                    .bid(account.address, poolId, LQ_META.minBidAmount);
                await expect(
                    liquidationQueue
                        .connect(account)
                        .activateBid(account.address, poolId),
                ).to.be.revertedWith('LQ: too soon');

                const bidInfo = await liquidationQueue.getBidPoolUserInfo(
                    poolId,
                    account.address,
                );
                expect(
                    parseFloat(
                        ethers.utils.formatEther(bidInfo.liquidatedAssetAmount),
                    ),
                    `✖️ Bid pool amount not right for account ${accounts.indexOf(
                        account,
                    )}`,
                ).to.eq(
                    parseFloat(ethers.utils.formatEther(LQ_META.minBidAmount)),
                );

                await liquidationQueue
                    .connect(account)
                    .removeBid(account.address, poolId);
            }

            const firstAccountYieldBoxBalanceBeforeBids =
                await yieldBox.toAmount(
                    lqAssetId,
                    await yieldBox.balanceOf(accounts[0].address, lqAssetId),
                    false,
                );

            ///
            /// - place some bids, activate them, remove activated bid
            ///
            for (const account of accounts) {
                await expect(
                    liquidationQueue
                        .connect(account)
                        .bid(account.address, poolId, LQ_META.minBidAmount),
                ).to.emit(liquidationQueue, 'Bid');
            }
            await timeTravel(600); //jump 10 mins to be able to activate bids
            for (const account of accounts) {
                await expect(
                    liquidationQueue
                        .connect(account)
                        .activateBid(account.address, poolId),
                ).to.emit(liquidationQueue, 'ActivateBid');

                const bidInfo = await liquidationQueue.getBidPoolUserInfo(
                    poolId,
                    account.address,
                );
                expect(
                    parseFloat(
                        ethers.utils.formatEther(bidInfo.liquidatedAssetAmount),
                    ),
                ).to.eq(0);

                const orderBookInfo = await liquidationQueue.orderBookInfos(
                    poolId,
                );
                const orderBookEntry = await liquidationQueue.orderBookEntries(
                    poolId,
                    orderBookInfo.nextBidPush - 1,
                );

                expect(
                    orderBookEntry.bidder.toLowerCase(),
                    `✖️ Bidder address not right for account ${accounts.indexOf(
                        account,
                    )}`,
                ).to.eq(account.address.toLowerCase());

                expect(
                    parseFloat(
                        ethers.utils.formatEther(
                            orderBookEntry.bidInfo.liquidatedAssetAmount,
                        ),
                    ),
                    `✖️ Activated bid amount not right for account ${accounts.indexOf(
                        account,
                    )}`,
                ).to.eq(
                    parseFloat(ethers.utils.formatEther(LQ_META.minBidAmount)),
                );
            }

            //should be 0 as no bid was executed
            const firstUserBalanceDue = await liquidationQueue.balancesDue(
                accounts[0].address,
            );
            expect(
                firstUserBalanceDue,
                '✖️ Due for first user not right',
            ).to.eq(0);

            ///
            /// - split accounts into 2 groups (first lends, the 2nd one borrows), place bids, change collateral price, execute bids
            ///
            if (accounts.length > 1) {
                const arrays = splitArray(accounts, 2);
                let firstHalf = arrays[0];
                let secondHalf = arrays[1];

                if (firstHalf.length < secondHalf.length) {
                    //make sure there's enough for borrowing
                    const temp = firstHalf;
                    firstHalf = secondHalf;
                    secondHalf = temp;
                }

                //place bids
                for (const account of accounts) {
                    await liquidationQueue
                        .connect(account)
                        .bid(account.address, poolId, LQ_META.minBidAmount);
                }
                //jump over the min activation period
                timeTravel(600);
                //activate bids
                for (const account of accounts) {
                    await liquidationQueue
                        .connect(account)
                        .activateBid(account.address, poolId);
                }
                //first half lends the asset
                const lendValShare = await yieldBox.toShare(
                    mixologistAssetId,
                    LQ_META.minBidAmount,
                    false,
                );
                for (const account of firstHalf) {
                    const mixologistBalanceOfAccountBefore =
                        await wethUsdcSingularity.balanceOf(account.address);
                    await expect(
                        mixologistBalanceOfAccountBefore,
                        `✖️ Account ${firstHalf.indexOf(
                            account,
                        )} singularity balance before is not right`,
                    ).to.eq(0);

                    await yieldBox
                        .connect(account)
                        .setApprovalForAll(wethUsdcSingularity.address, true);

                    await wethUsdcSingularity
                        .connect(account)
                        .addAsset(
                            account.address,
                            account.address,
                            false,
                            lendValShare,
                        );

                    const mixologistBalanceOfAccountAfter =
                        await wethUsdcSingularity.balanceOf(account.address);

                    await expect(
                        parseFloat(
                            ethers.utils.formatEther(
                                mixologistBalanceOfAccountAfter,
                            ),
                        ),
                        `✖️ Account ${firstHalf.indexOf(
                            account,
                        )} singularity balance after lend operation is not right`,
                    ).to.eq(parseFloat(ethers.utils.formatEther(lendValShare)));
                }

                const swapData = new ethers.utils.AbiCoder().encode(
                    ['uint256'],
                    [1],
                );
                //second half borrows
                const borrowVal = usdcDepositVal
                    .mul(74)
                    .div(100)
                    .div(__wethUsdcPrice.div((1e18).toString())); // We borrow 74% collateral, max is 75%
                for (const account of secondHalf) {
                    //we don't use skim; need yieldbox balance
                    await usdc
                        .connect(account)
                        .approve(yieldBox.address, usdcDepositVal);
                    await yieldBox
                        .connect(account)
                        .depositAsset(
                            mixologistCollateralId,
                            account.address,
                            account.address,
                            usdcDepositVal,
                            0,
                        );
                    //register collateral
                    await yieldBox
                        .connect(account)
                        .setApprovalForAll(wethUsdcSingularity.address, true);
                    const collateralShare = await yieldBox.toShare(
                        mixologistCollateralId,
                        usdcDepositVal,
                        false,
                    );
                    await wethUsdcSingularity
                        .connect(account)
                        .addCollateral(
                            account.address,
                            account.address,
                            false,
                            0,
                            collateralShare,
                        );

                    await wethUsdcSingularity
                        .connect(account)
                        .borrow(account.address, account.address, borrowVal);

                    // Can't liquidate yet
                    await expect(
                        wethUsdcSingularity.liquidate(
                            [account.address],
                            [borrowVal],
                            [swapData],
                            swapData,
                            multiSwapper.address,
                        ),
                    ).to.be.reverted;
                }

                //simulate a price drop
                const priceDrop = __wethUsdcPrice.mul(2).div(100);
                await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

                //liquidate accounts
                const liqudatableAccounts = secondHalf.map(
                    (el: SignerWithAddress) => el.address,
                );
                const liquidatebleAmonts = Array.from(
                    { length: liqudatableAccounts.length },
                    (_) => borrowVal,
                );
                const collateralSwapDatas = Array.from(
                    { length: liqudatableAccounts.length },
                    (_) => swapData,
                );

                const shareForCallerBefore = await yieldBox.balanceOf(
                    accounts[0].address,
                    lqAssetId,
                );

                await wethUsdcSingularity
                    .connect(accounts[0])
                    .liquidate(
                        liqudatableAccounts,
                        liquidatebleAmonts,
                        collateralSwapDatas,
                        swapData,
                        multiSwapper.address,
                    );
                const shareForCallerAfter = await yieldBox.balanceOf(
                    accounts[0].address,
                    lqAssetId,
                );

                await expect(
                    parseFloat(shareForCallerAfter.toString()),
                    '✖️ After liquidation shares not right',
                ).to.be.greaterThan(
                    parseFloat(shareForCallerBefore.toString()),
                );

                //redeem if everything is left
                for (const account of secondHalf) {
                    const dueAmount = await liquidationQueue.balancesDue(
                        account.address,
                    );
                    if (dueAmount.gt(0)) {
                        const balanceBeforeRedeem = await yieldBox.balanceOf(
                            account.address,
                            mixologistCollateralId,
                        );
                        await expect(
                            liquidationQueue
                                .connect(account)
                                .redeem(account.address),
                        ).to.emit(liquidationQueue, 'Redeem');
                        const balanceAfterRedeem = await yieldBox.balanceOf(
                            account.address,
                            mixologistCollateralId,
                        );
                        await expect(
                            parseFloat(balanceAfterRedeem.toString()),
                            '✖️ After redeem shares not right',
                        ).to.be.greaterThan(
                            parseFloat(balanceBeforeRedeem.toString()),
                        );
                    }
                }
            }
        });
    });

    describe('flow', () => {
        it('borrow, place bid; collateral drops, call without any bid being active => should rely on close liquidation', async () => {
            const {
                deployer,
                eoa1,
                __wethUsdcPrice,
                liquidationQueue,
                LQ_META,
                weth,
                usdc,
                yieldBox,
                wethUsdcSingularity,
                wethUsdcOracle,
                multiSwapper,
                BN,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 5;
            const marketAssetId = await wethUsdcSingularity.assetId();
            const marketColId = await wethUsdcSingularity.collateralId();
            const lqAssetId = await liquidationQueue.lqAssetId();

            // Bid
            await (await weth.freeMint(LQ_META.minBidAmount.mul(100))).wait();
            await timeTravel(86500);
            await (
                await weth.approve(
                    yieldBox.address,
                    LQ_META.minBidAmount.mul(100),
                )
            ).wait();
            await yieldBox.depositAsset(
                lqAssetId,
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount.mul(100),
                0,
            );
            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await liquidationQueue.bid(
                deployer.address,
                POOL,
                LQ_META.minBidAmount.mul(100),
            );

            // Mint some weth to deposit as asset with EOA1
            const wethAmount = BN(1e18).mul(100);
            await weth.connect(eoa1).freeMint(wethAmount);
            await weth.connect(eoa1).approve(yieldBox.address, wethAmount);

            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    marketAssetId,
                    eoa1.address,
                    eoa1.address,
                    wethAmount,
                    0,
                );

            await yieldBox
                .connect(eoa1)
                .setApprovalForAll(wethUsdcSingularity.address, true);
            await wethUsdcSingularity
                .connect(eoa1)
                .addAsset(
                    eoa1.address,
                    eoa1.address,
                    false,
                    await yieldBox.toShare(marketAssetId, wethAmount, false),
                );

            // Mint some usdc to deposit as collateral and borrow with deployer
            const usdcAmount = wethAmount.mul(__wethUsdcPrice.div(BN(1e18)));
            const borrowAmount = usdcAmount
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div(BN(1e18)));

            await usdc.freeMint(usdcAmount);
            await timeTravel(86500);
            await usdc.approve(yieldBox.address, usdcAmount);
            await yieldBox.depositAsset(
                marketColId,
                deployer.address,
                deployer.address,
                usdcAmount,
                0,
            );
            await yieldBox.setApprovalForAll(wethUsdcSingularity.address, true);
            await wethUsdcSingularity.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                await yieldBox.toShare(marketColId, usdcAmount, false),
            );
            const initialCollateral =
                await wethUsdcSingularity.userCollateralShare(deployer.address);
            expect(initialCollateral.gt(0)).to.be.true;
            await wethUsdcSingularity.borrow(
                deployer.address,
                deployer.address,
                borrowAmount,
            );

            // Try to liquidate but with failure since price hasn't changed
            const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
            await expect(
                wethUsdcSingularity.liquidate(
                    [deployer.address],
                    [
                        await wethUsdcSingularity.userBorrowPart(
                            deployer.address,
                        ),
                    ],
                    [data],
                    data,
                    ethers.constants.AddressZero,
                ),
            ).to.be.reverted;

            // Make some price movement and liquidate
            const priceDrop = __wethUsdcPrice.mul(5).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();

            const initialBorrowPart = await wethUsdcSingularity.userBorrowPart(
                deployer.address,
            );

            await expect(
                wethUsdcSingularity.liquidate(
                    [deployer.address],
                    [
                        await wethUsdcSingularity.userBorrowPart(
                            deployer.address,
                        ),
                    ],
                    [data],
                    data,
                    multiSwapper.address,
                ),
            ).to.not.be.reverted;

            await expect(
                wethUsdcSingularity.liquidate(
                    [eoa1.address],
                    [await wethUsdcSingularity.userBorrowPart(eoa1.address)],
                    [data],
                    data,
                    multiSwapper.address,
                ),
            ).to.be.reverted;

            // Check that LQ balances has been added
            expect(await liquidationQueue.balancesDue(deployer.address)).to.eq(
                0,
            );

            const finalBorrowPart = await wethUsdcSingularity.userBorrowPart(
                deployer.address,
            );
            expect(finalBorrowPart.lt(initialBorrowPart)).to.be.true;

            const finalCollateral =
                await wethUsdcSingularity.userCollateralShare(deployer.address);
            expect(finalCollateral.lt(initialCollateral)).to.be.true;
        });

        it('borrow, place small bid, activate, collateral drops, liquidate => should rely on close liquidation', async () => {
            const {
                deployer,
                eoa1,
                __wethUsdcPrice,
                liquidationQueue,
                LQ_META,
                weth,
                usdc,
                yieldBox,
                wethUsdcSingularity,
                wethUsdcOracle,
                multiSwapper,
                BN,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 5;
            const marketAssetId = await wethUsdcSingularity.assetId();
            const marketColId = await wethUsdcSingularity.collateralId();
            const lqAssetId = await liquidationQueue.lqAssetId();

            // Bid
            await (await weth.freeMint(LQ_META.minBidAmount)).wait();
            await timeTravel(86500);
            await (
                await weth.approve(yieldBox.address, LQ_META.minBidAmount)
            ).wait();
            await yieldBox.depositAsset(
                lqAssetId,
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount,
                0,
            );
            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await liquidationQueue.bid(
                deployer.address,
                POOL,
                LQ_META.minBidAmount,
            );
            await timeTravel(86400);
            await liquidationQueue.activateBid(deployer.address, POOL);

            // Mint some weth to deposit as asset with EOA1
            const wethAmount = BN(1e18).mul(100);
            await weth.connect(eoa1).freeMint(wethAmount);
            await timeTravel(86500);
            await weth.connect(eoa1).approve(yieldBox.address, wethAmount);
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    marketAssetId,
                    eoa1.address,
                    eoa1.address,
                    wethAmount,
                    0,
                );

            await yieldBox
                .connect(eoa1)
                .setApprovalForAll(wethUsdcSingularity.address, true);
            await wethUsdcSingularity
                .connect(eoa1)
                .addAsset(
                    eoa1.address,
                    eoa1.address,
                    false,
                    await yieldBox.toShare(marketAssetId, wethAmount, false),
                );

            // Mint some usdc to deposit as collateral and borrow with deployer
            const usdcAmount = wethAmount.mul(__wethUsdcPrice.div(BN(1e18)));
            const borrowAmount = usdcAmount
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div(BN(1e18)));

            await usdc.freeMint(usdcAmount);
            await timeTravel(86500);
            await usdc.approve(yieldBox.address, usdcAmount);
            await yieldBox.depositAsset(
                marketColId,
                deployer.address,
                deployer.address,
                usdcAmount,
                0,
            );
            await yieldBox.setApprovalForAll(wethUsdcSingularity.address, true);
            await wethUsdcSingularity.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                await yieldBox.toShare(marketColId, usdcAmount, false),
            );
            const initialCollateral =
                await wethUsdcSingularity.userCollateralShare(deployer.address);
            expect(initialCollateral.gt(0)).to.be.true;
            await wethUsdcSingularity.borrow(
                deployer.address,
                deployer.address,
                borrowAmount,
            );

            const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
            const priceDrop = __wethUsdcPrice.mul(5).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();

            const initialBorrowPart = await wethUsdcSingularity.userBorrowPart(
                deployer.address,
            );
            await expect(
                wethUsdcSingularity.liquidate(
                    [deployer.address],
                    [
                        await wethUsdcSingularity.userBorrowPart(
                            deployer.address,
                        ),
                    ],
                    [data],
                    data,
                    multiSwapper.address,
                ),
            ).to.not.be.reverted;

            // Check that LQ balances has been added
            expect(await liquidationQueue.balancesDue(deployer.address)).to.eq(
                0,
            );

            const finalBorrowPart = await wethUsdcSingularity.userBorrowPart(
                deployer.address,
            );
            expect(finalBorrowPart.lt(initialBorrowPart)).to.be.true;

            const finalCollateral =
                await wethUsdcSingularity.userCollateralShare(deployer.address);
            expect(finalCollateral.lt(initialCollateral)).to.be.true;

            const bidIndexLen = await liquidationQueue.userBidIndexLength(
                deployer.address,
                POOL,
            );
            expect(bidIndexLen.eq(1)).to.be.true;
        });

        it('borrow, place bid, activate, collateral drops, liquidate => should rely on LQ liquidation', async () => {
            const {
                deployer,
                eoa1,
                __wethUsdcPrice,
                liquidationQueue,
                LQ_META,
                weth,
                usdc,
                yieldBox,
                wethUsdcSingularity,
                wethUsdcOracle,
                multiSwapper,
                BN,
                timeTravel,
            } = await loadFixture(register);

            const POOL = 5;
            const marketAssetId = await wethUsdcSingularity.assetId();
            const marketColId = await wethUsdcSingularity.collateralId();
            const lqAssetId = await liquidationQueue.lqAssetId();

            // Bid
            await (await weth.freeMint(LQ_META.minBidAmount.mul(100))).wait();
            await timeTravel(86500);
            await (
                await weth.approve(
                    yieldBox.address,
                    LQ_META.minBidAmount.mul(100),
                )
            ).wait();
            await yieldBox.depositAsset(
                lqAssetId,
                deployer.address,
                deployer.address,
                LQ_META.minBidAmount.mul(100),
                0,
            );
            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await liquidationQueue.bid(
                deployer.address,
                POOL,
                LQ_META.minBidAmount.mul(100),
            );
            await timeTravel(86400);
            await liquidationQueue.activateBid(deployer.address, POOL);

            // Mint some weth to deposit as asset with EOA1
            const wethAmount = BN(1e18).mul(100);
            await weth.connect(eoa1).freeMint(wethAmount);
            await timeTravel(86500);
            await weth.connect(eoa1).approve(yieldBox.address, wethAmount);
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    marketAssetId,
                    eoa1.address,
                    eoa1.address,
                    wethAmount,
                    0,
                );

            await yieldBox
                .connect(eoa1)
                .setApprovalForAll(wethUsdcSingularity.address, true);
            await wethUsdcSingularity
                .connect(eoa1)
                .addAsset(
                    eoa1.address,
                    eoa1.address,
                    false,
                    await yieldBox.toShare(marketAssetId, wethAmount, false),
                );

            // Mint some usdc to deposit as collateral and borrow with deployer
            const usdcAmount = wethAmount.mul(__wethUsdcPrice.div(BN(1e18)));
            const borrowAmount = usdcAmount
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div(BN(1e18)));

            await usdc.freeMint(usdcAmount);
            await timeTravel(86500);
            await usdc.approve(yieldBox.address, usdcAmount);
            await yieldBox.depositAsset(
                marketColId,
                deployer.address,
                deployer.address,
                usdcAmount,
                0,
            );
            await yieldBox.setApprovalForAll(wethUsdcSingularity.address, true);
            await wethUsdcSingularity.addCollateral(
                deployer.address,
                deployer.address,
                false,
                0,
                await yieldBox.toShare(marketColId, usdcAmount, false),
            );
            const initialCollateral =
                await wethUsdcSingularity.userCollateralShare(deployer.address);
            expect(initialCollateral.gt(0)).to.be.true;
            await wethUsdcSingularity.borrow(
                deployer.address,
                deployer.address,
                borrowAmount,
            );

            const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
            const priceDrop = __wethUsdcPrice.mul(2).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();

            const initialBorrowPart = await wethUsdcSingularity.userBorrowPart(
                deployer.address,
            );

            // Check for deleted bid pool entry queue
            const lastAdditionIdx = await liquidationQueue.orderBookInfos(POOL);
            let entry = await liquidationQueue.orderBookEntries(
                POOL,
                lastAdditionIdx.nextBidPush - 1,
            );
            const initialBidAmount = entry.bidInfo.liquidatedAssetAmount;
            await expect(
                wethUsdcSingularity.liquidate(
                    [deployer.address],
                    [
                        await wethUsdcSingularity.userBorrowPart(
                            deployer.address,
                        ),
                    ],
                    [data],
                    data,
                    multiSwapper.address,
                ),
            ).to.not.be.reverted;

            // Check that LQ balances has been added
            expect((await liquidationQueue.balancesDue(deployer.address)).gt(0))
                .to.be.true;

            const finalBorrowPart = await wethUsdcSingularity.userBorrowPart(
                deployer.address,
            );
            const finalCollateral =
                await wethUsdcSingularity.userCollateralShare(deployer.address);
            expect(finalBorrowPart.lt(initialBorrowPart)).to.be.true;
            expect(finalCollateral.lt(initialCollateral)).to.be.true;

            // Check for deleted bid pool entry queue
            entry = await liquidationQueue.orderBookEntries(
                POOL,
                lastAdditionIdx.nextBidPush - 1,
            );
            expect(initialBidAmount.gt(entry.bidInfo.liquidatedAssetAmount)).to
                .be.true;
        });
    });
});

//TODO: move to utils if needed in other places
const splitArray = (arr: any, batches: number) => {
    const chunkLength = Math.max(arr.length / batches, 1);
    const chunks = [];
    for (let i = 0; i < batches; i++) {
        if (chunkLength * (i + 1) <= arr.length)
            chunks.push(arr.slice(chunkLength * i, chunkLength * (i + 1)));
    }
    return chunks;
};
