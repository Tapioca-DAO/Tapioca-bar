import hre, { ethers } from 'hardhat';
import { BigNumberish, BytesLike, Wallet } from 'ethers';
import { expect } from 'chai';
import { BN, getSGLPermitSignature, register } from './test.utils';
import {
    loadFixture,
    takeSnapshot,
} from '@nomicfoundation/hardhat-network-helpers';
import { LiquidationQueue__factory } from '../gitsub_tapioca-sdk/src/typechain/tapioca-periphery';
import {
    ERC20Mock,
    ERC20Mock__factory,
    LZEndpointMock__factory,
    OracleMock__factory,
    UniswapV3SwapperMock__factory,
} from '../gitsub_tapioca-sdk/src/typechain/tapioca-mocks';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import {
    BaseTOFT,
    BaseTOFTLeverageModule__factory,
    BaseTOFTMarketModule__factory,
    BaseTOFTOptionsModule__factory,
    BaseTOFTStrategyModule__factory,
    TapiocaOFT,
    TapiocaOFT__factory,
    TapiocaWrapper__factory,
} from '../gitsub_tapioca-sdk/src/typechain/tapiocaz';
import TapiocaOFTArtifact from '../gitsub_tapioca-sdk/src/artifacts/tapiocaz/TapiocaOFT.json';

describe('Singularity test', () => {
    describe('test', () => {
        it.skip('should compute the right closing factor', async () => {
            const { wethUsdcSingularity, wbtcBigBangMarket, deployer, bar } =
                await loadFixture(register);

            let x = await wethUsdcSingularity.computeClosingFactor(
                ethers.utils.parseEther('7600'),
                ethers.utils.parseEther('10000'),
                18,
                18,
                5,
            );
            console.log(
                `Borrow part: 7600 with 18 decimals, collateral part: 10000 with 18 decimals, closing factor without bonus: ${ethers.utils.formatEther(
                    x,
                )}`,
            );

            x = await wethUsdcSingularity.computeClosingFactor(
                ethers.utils.parseEther('7000'),
                ethers.utils.parseEther('10000'),
                18,
                18,
                5,
            );
            console.log(
                `Borrow part: 7000 with 18 decimals, collateral part: 10000 with 18 decimals, closing factor without bonus: ${ethers.utils.formatEther(
                    x,
                )}`,
            );

            x = await wethUsdcSingularity.computeClosingFactor(
                ethers.utils.parseEther('8000'),
                ethers.utils.parseEther('10000'),
                18,
                18,
                5,
            );
            console.log(
                `Borrow part: 8000 with 18 decimals, collateral part: 10000 with 18 decimals, closing factor without bonus: ${ethers.utils.formatEther(
                    x,
                )}`,
            );

            x = await wethUsdcSingularity.computeClosingFactor(
                ethers.utils.parseEther('8000'),
                '10000000000',
                18,
                6,
                5,
            );
            console.log(
                `Borrow part: 8000 with 18 decimals, collateral part: 10000 with 6 decimals, closing factor without bonus: ${ethers.utils.formatEther(
                    x,
                )}`,
            );

            x = await wethUsdcSingularity.computeClosingFactor(
                ethers.utils.parseEther('4000'),
                ethers.utils.parseEther('5000'),
                18,
                18,
                5,
            );
            console.log(
                `Borrow part: 4000 with 18 decimals, collateral part: 5000 with 18 decimals, closing factor without bonus: ${ethers.utils.formatEther(
                    x,
                )}`,
            );

            x = await wethUsdcSingularity.computeClosingFactor(
                '8000000000',
                ethers.utils.parseEther('10000'),
                6,
                18,
                5,
            );
            console.log(
                `Borrow part: 8000 with 6 decimals, collateral part: 10000 with 18 decimals, closing factor without bonus: ${ethers.utils.formatEther(
                    x,
                )}`,
            );
        });
    });
    describe('setters', () => {
        it('should be able to set mutable properties', async () => {
            const { wethUsdcSingularity, wbtcBigBangMarket, deployer, bar } =
                await loadFixture(register);

            const toSetAddress = deployer.address;
            const toSetValue = 101;
            const toSetMaxValue = 102;

            //common properties
            let borrowingOpeningFee =
                await wethUsdcSingularity.borrowOpeningFee();
            let oracle = await wethUsdcSingularity.oracle();
            let oracleData = await wethUsdcSingularity.oracleData();
            let conservator = await wethUsdcSingularity.conservator();
            let callerFee = await wethUsdcSingularity.callerFee();
            let protocolFee = await wethUsdcSingularity.protocolFee();
            let liquidationBonusAmount =
                await wethUsdcSingularity.liquidationBonusAmount();
            let minLiquidatorReward =
                await wethUsdcSingularity.minLiquidatorReward();
            let maxLiquidatorReward =
                await wethUsdcSingularity.maxLiquidatorReward();
            let totalBorrowCap = await wethUsdcSingularity.totalBorrowCap();
            let collateralizationRate =
                await wethUsdcSingularity.collateralizationRate();

            // set common config
            let payload = wethUsdcSingularity.interface.encodeFunctionData(
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
                    0,
                    0,
                ],
            );
            await bar.executeMarketFn(
                [wethUsdcSingularity.address],
                [payload],
                false,
            );
            expect(
                borrowingOpeningFee.eq(
                    await wethUsdcSingularity.borrowOpeningFee(),
                ),
            ).to.be.true;
            expect(oracle).to.eq(await wethUsdcSingularity.oracle());
            expect(conservator).to.eq(await wethUsdcSingularity.conservator());
            expect(callerFee).to.eq(await wethUsdcSingularity.callerFee());
            expect(protocolFee).to.eq(await wethUsdcSingularity.protocolFee());
            expect(liquidationBonusAmount).to.eq(
                await wethUsdcSingularity.liquidationBonusAmount(),
            );
            expect(minLiquidatorReward).to.eq(
                await wethUsdcSingularity.minLiquidatorReward(),
            );
            expect(maxLiquidatorReward).to.eq(
                await wethUsdcSingularity.maxLiquidatorReward(),
            );
            expect(totalBorrowCap).to.eq(
                await wethUsdcSingularity.totalBorrowCap(),
            );
            expect(collateralizationRate).to.eq(
                await wethUsdcSingularity.collateralizationRate(),
            );

            payload = wethUsdcSingularity.interface.encodeFunctionData(
                'setMarketConfig',
                [
                    toSetValue,
                    toSetAddress,
                    ethers.utils.toUtf8Bytes(''),
                    toSetAddress,
                    toSetValue,
                    toSetValue,
                    toSetValue,
                    toSetValue,
                    toSetMaxValue,
                    toSetValue,
                    toSetValue,
                ],
            );
            await bar.executeMarketFn(
                [wethUsdcSingularity.address],
                [payload],
                false,
            );

            borrowingOpeningFee = await wethUsdcSingularity.borrowOpeningFee();
            oracle = await wethUsdcSingularity.oracle();
            oracleData = await wethUsdcSingularity.oracleData();
            conservator = await wethUsdcSingularity.conservator();
            callerFee = await wethUsdcSingularity.callerFee();
            protocolFee = await wethUsdcSingularity.protocolFee();
            liquidationBonusAmount =
                await wethUsdcSingularity.liquidationBonusAmount();
            minLiquidatorReward =
                await wethUsdcSingularity.minLiquidatorReward();
            maxLiquidatorReward =
                await wethUsdcSingularity.maxLiquidatorReward();
            totalBorrowCap = await wethUsdcSingularity.totalBorrowCap();
            collateralizationRate =
                await wethUsdcSingularity.collateralizationRate();

            expect(borrowingOpeningFee).to.eq(toSetValue);
            expect(oracle).to.eq(toSetAddress);
            expect(conservator).to.eq(toSetAddress);
            expect(callerFee).to.eq(toSetValue);
            expect(protocolFee).to.eq(toSetValue);
            expect(liquidationBonusAmount).to.eq(toSetValue);
            expect(minLiquidatorReward).to.eq(toSetValue);
            expect(maxLiquidatorReward).to.eq(toSetMaxValue);
            expect(totalBorrowCap).to.eq(toSetValue);
            expect(collateralizationRate).to.eq(toSetValue);

            await bar.setBigBangEthMarket(deployer.address);

            let minDebtRate = await wbtcBigBangMarket.minDebtRate();
            let maxDebtRate = await wbtcBigBangMarket.maxDebtRate();
            let debtRateAgainstEthMarket =
                await wbtcBigBangMarket.debtRateAgainstEthMarket();

            payload = wbtcBigBangMarket.interface.encodeFunctionData(
                'setBigBangConfig',
                [0, 0, 0, 0],
            );
            await bar.executeMarketFn(
                [wbtcBigBangMarket.address],
                [payload],
                false,
            );
            expect(minDebtRate).to.eq(await wbtcBigBangMarket.minDebtRate());
            expect(maxDebtRate).to.eq(await wbtcBigBangMarket.maxDebtRate());
            expect(debtRateAgainstEthMarket).to.eq(
                await wbtcBigBangMarket.debtRateAgainstEthMarket(),
            );

            payload = wbtcBigBangMarket.interface.encodeFunctionData(
                'setBigBangConfig',
                [toSetValue, toSetMaxValue, toSetValue, toSetValue],
            );
            await bar.executeMarketFn(
                [wbtcBigBangMarket.address],
                [payload],
                false,
            );
            minDebtRate = await wbtcBigBangMarket.minDebtRate();
            maxDebtRate = await wbtcBigBangMarket.maxDebtRate();
            debtRateAgainstEthMarket =
                await wbtcBigBangMarket.debtRateAgainstEthMarket();
            expect(minDebtRate).to.eq(toSetValue);
            expect(maxDebtRate).to.eq(toSetMaxValue);
            expect(debtRateAgainstEthMarket).to.eq(toSetValue);

            let lqCollateralizationRate =
                await wethUsdcSingularity.lqCollateralizationRate();
            let liquidationMultiplier =
                await wethUsdcSingularity.liquidationMultiplier();
            let minimumTargetUtilization =
                await wethUsdcSingularity.minimumTargetUtilization();
            let maximumTargetUtilization =
                await wethUsdcSingularity.maximumTargetUtilization();
            let minimumInterestPerSecond =
                await wethUsdcSingularity.minimumInterestPerSecond();
            let maximumInterestPerSecond =
                await wethUsdcSingularity.maximumInterestPerSecond();
            let interestElasticity =
                await wethUsdcSingularity.interestElasticity();

            payload = wethUsdcSingularity.interface.encodeFunctionData(
                'setSingularityConfig',
                [0, 0, 0, 0, 0, 0, 0],
            );
            await bar.executeMarketFn(
                [wethUsdcSingularity.address],
                [payload],
                false,
            );
            expect(lqCollateralizationRate).to.eq(
                await wethUsdcSingularity.lqCollateralizationRate(),
            );
            expect(liquidationMultiplier).to.eq(
                await wethUsdcSingularity.liquidationMultiplier(),
            );
            expect(minimumTargetUtilization).to.eq(
                await wethUsdcSingularity.minimumTargetUtilization(),
            );
            expect(maximumTargetUtilization).to.eq(
                await wethUsdcSingularity.maximumTargetUtilization(),
            );
            expect(minimumInterestPerSecond).to.eq(
                await wethUsdcSingularity.minimumInterestPerSecond(),
            );
            expect(maximumInterestPerSecond).to.eq(
                await wethUsdcSingularity.maximumInterestPerSecond(),
            );
            expect(interestElasticity).to.eq(
                await wethUsdcSingularity.interestElasticity(),
            );

            payload = wethUsdcSingularity.interface.encodeFunctionData(
                'setSingularityConfig',
                [
                    toSetValue,
                    toSetValue,
                    toSetValue,
                    toSetMaxValue,
                    toSetValue,
                    toSetMaxValue,
                    toSetValue,
                ],
            );
            await bar.executeMarketFn(
                [wethUsdcSingularity.address],
                [payload],
                false,
            );

            lqCollateralizationRate =
                await wethUsdcSingularity.lqCollateralizationRate();
            liquidationMultiplier =
                await wethUsdcSingularity.liquidationMultiplier();
            minimumTargetUtilization =
                await wethUsdcSingularity.minimumTargetUtilization();
            maximumTargetUtilization =
                await wethUsdcSingularity.maximumTargetUtilization();
            minimumInterestPerSecond =
                await wethUsdcSingularity.minimumInterestPerSecond();
            maximumInterestPerSecond =
                await wethUsdcSingularity.maximumInterestPerSecond();
            interestElasticity = await wethUsdcSingularity.interestElasticity();

            expect(lqCollateralizationRate).to.eq(toSetValue);
            expect(liquidationMultiplier).to.eq(toSetValue);
            expect(minimumTargetUtilization).to.eq(toSetValue);
            expect(maximumTargetUtilization).to.eq(toSetMaxValue);
            expect(minimumInterestPerSecond).to.eq(toSetValue);
            expect(maximumInterestPerSecond).to.eq(toSetMaxValue);
            expect(interestElasticity).to.eq(toSetValue);
        });
    });
    describe('reverts', () => {
        it('should not be allowed to initialize twice', async () => {
            const { wethUsdcSingularity } = await loadFixture(register);

            await expect(
                wethUsdcSingularity.init(ethers.utils.toUtf8Bytes('')),
            ).to.be.revertedWith('Market: initialized');
            await wethUsdcSingularity.accrue();
            await wethUsdcSingularity.accrue();
        });
        it('removing everything should not be allowed', async () => {
            const {
                weth,
                yieldBox,
                wethDepositAndAddAsset,
                approveTokensAndSetBarApproval,
                deployer,
                wethUsdcSingularity,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const wethMintVal = 1000;

            await weth.freeMint(1000);
            await approveTokensAndSetBarApproval();
            await wethDepositAndAddAsset(wethMintVal);
            expect(
                await wethUsdcSingularity.balanceOf(deployer.address),
            ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));
            const share = await yieldBox.toShare(assetId, wethMintVal, false);

            await expect(
                wethUsdcSingularity.removeAsset(
                    deployer.address,
                    deployer.address,
                    share,
                ),
            ).to.be.revertedWith('SGL: min limit');
        });
        it('actions should not work when the contract is paused', async () => {
            const {
                deployer,
                bar,
                usdc,
                BN,
                approveTokensAndSetBarApproval,
                usdcDepositAndAddCollateral,
                wethUsdcSingularity,
                wethDepositAndAddAsset,
                weth,
                __wethUsdcPrice,
                eoa1,
                magnetar,
                timeTravel,
            } = await loadFixture(register);

            const setConservatorData =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'setMarketConfig',
                    [
                        0,
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
                [wethUsdcSingularity.address],
                [setConservatorData],
                true,
            );

            const wethAmount = BN(1e18).mul(1);
            const usdcAmount = wethAmount
                .mul(__wethUsdcPrice.mul(2))
                .div((1e18).toString());

            await wethUsdcSingularity.updatePause(true);

            await usdc.freeMint(usdcAmount);
            await timeTravel(86500);
            await approveTokensAndSetBarApproval();
            await expect(
                usdcDepositAndAddCollateral(usdcAmount),
            ).to.be.revertedWith('Market: paused');

            await wethUsdcSingularity.updatePause(false);

            await usdc.freeMint(usdcAmount);
            await approveTokensAndSetBarApproval();
            await usdcDepositAndAddCollateral(usdcAmount);

            await wethUsdcSingularity.updatePause(true);

            await approveTokensAndSetBarApproval(eoa1);
            await weth.connect(eoa1).freeMint(wethAmount);
            await timeTravel(86500);
            await expect(
                wethDepositAndAddAsset(wethAmount, eoa1),
            ).to.be.revertedWith('Market: paused');

            await wethUsdcSingularity.updatePause(false);

            await approveTokensAndSetBarApproval(eoa1);
            await weth.connect(eoa1).freeMint(wethAmount);
            await timeTravel(86500);
            await expect(wethDepositAndAddAsset(wethAmount, eoa1)).not.to.be
                .reverted;
        });

        it('should not execute when module does not exist', async () => {
            //register a singularity without lending module
            const {
                usdc,
                weth,
                bar,
                yieldBox,
                wethAssetId,
                usdcAssetId,
                wethUsdcOracle,
                mediumRiskMC,
                deployer,
            } = await loadFixture(register);
            const data = new ethers.utils.AbiCoder().encode(
                [
                    'address',
                    'address',
                    'address',
                    'address',
                    'address',
                    'address',
                    'uint256',
                    'address',
                    'uint256',
                    'address',
                    'uint256',
                ],
                [
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                    bar.address,
                    weth.address,
                    wethAssetId,
                    usdc.address,
                    usdcAssetId,
                    wethUsdcOracle.address,
                    ethers.utils.parseEther('1'),
                ],
            );
            await (
                await bar.registerSingularity(mediumRiskMC.address, data, true)
            ).wait();
            const wethUsdcSingularity = await ethers.getContractAt(
                'Singularity',
                await bar.clonesOf(
                    mediumRiskMC.address,
                    (await bar.clonesOfCount(mediumRiskMC.address)).sub(1),
                ),
            );

            expect(wethUsdcSingularity.address).to.not.eq(
                ethers.constants.AddressZero,
            );

            await expect(
                wethUsdcSingularity
                    .connect(deployer)
                    .borrow(deployer.address, deployer.address, 1),
            ).to.be.revertedWith('SGL: module not set');
        });

        it('should not allow initialization with bad arguments', async () => {
            const {
                bar,
                mediumRiskMC,
                wethUsdcOracle,
                _sglCollateralModule,
                _sglBorrowModule,
                _sglLiquidationModule,
                _sglLeverageModule,
            } = await loadFixture(register);

            const data = new ethers.utils.AbiCoder().encode(
                [
                    'address',
                    'address',
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
                    'uint256',
                ],
                [
                    _sglLiquidationModule.address,
                    _sglBorrowModule.address,
                    _sglCollateralModule.address,
                    _sglLeverageModule.address,
                    bar.address,
                    ethers.constants.AddressZero,
                    0,
                    ethers.constants.AddressZero,
                    0,
                    wethUsdcOracle.address,
                    [],
                    [],
                    ethers.utils.parseEther('1'),
                ],
            );

            await expect(
                bar.registerSingularity(mediumRiskMC.address, data, true),
            ).to.be.revertedWith('SGL: bad pair');
        });

        it('Should deposit Usdc collateral and borrow Weth in a single tx without lenders but revert with the right error code', async () => {
            const {
                usdc,
                weth,
                yieldBox,
                eoa1,
                approveTokensAndSetBarApproval,
                wethUsdcSingularity,
                __wethUsdcPrice,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    collateralId,
                    eoa1.address,
                    eoa1.address,
                    usdcMintVal,
                    0,
                );

            const addCollateralFn =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'addCollateral',
                    [eoa1.address, eoa1.address, false, 0, usdcMintValShare],
                );
            const borrowFn = wethUsdcSingularity.interface.encodeFunctionData(
                'borrow',
                [eoa1.address, eoa1.address, wethBorrowVal],
            );

            await expect(
                wethUsdcSingularity
                    .connect(eoa1)
                    .execute([addCollateralFn, borrowFn], true),
            ).to.be.revertedWith('SGL: min limit');
        });

        it('Should deposit Usdc collateral and borrow Weth in a single tx without lenders and decode the error codes', async () => {
            const {
                usdc,
                weth,
                yieldBox,
                eoa1,
                approveTokensAndSetBarApproval,
                wethUsdcSingularity,
                __wethUsdcPrice,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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

            const addCollateralFn =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'addCollateral',
                    [eoa1.address, eoa1.address, false, 0, usdcMintValShare],
                );
            const borrowFn = wethUsdcSingularity.interface.encodeFunctionData(
                'borrow',
                [eoa1.address, eoa1.address, wethBorrowVal],
            );

            const data = await wethUsdcSingularity
                .connect(eoa1)
                .callStatic.execute([addCollateralFn, borrowFn], false);

            expect(data.successes[0]).to.be.true;
            expect(data.successes[1]).to.be.false; //can't borrow as there are no lenders

            expect(data.results[0]).to.eq('Market: no return data');
            expect(data.results[1]).to.eq('SGL: min limit');

            await expect(
                wethUsdcSingularity
                    .connect(eoa1)
                    .execute([addCollateralFn, borrowFn], false),
            ).not.to.be.reverted;
        });
    });

    describe('lending', () => {
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
                wethUsdcSingularity,
                multiSwapper,
                wethUsdcOracle,
                __wethUsdcPrice,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                await wethUsdcSingularity.balanceOf(deployer.address),
            ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

            // We deposit USDC collateral
            await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
            expect(
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

            // We borrow 74% collateral, max is 75%
            const wethBorrowVal = usdcMintVal
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div((1e18).toString()));

            await wethUsdcSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, wethBorrowVal);
            await yieldBox
                .connect(eoa1)
                .withdraw(
                    assetId,
                    eoa1.address,
                    eoa1.address,
                    wethBorrowVal,
                    0,
                );

            return;
            const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);

            // Can't liquidate
            await expect(
                wethUsdcSingularity.liquidate(
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
            await wethUsdcSingularity.updateExchangeRate();

            const exchangeRate = await wethUsdcSingularity.exchangeRate();
            const maxLiquidatable =
                await wethUsdcSingularity.computeClosingFactor(
                    eoa1.address,
                    exchangeRate,
                );
            const userBorrowedAmountBefore =
                await wethUsdcSingularity.userBorrowPart(eoa1.address);

            hre.tracer.enabled = true;
            await expect(
                wethUsdcSingularity.liquidate(
                    [eoa1.address],
                    [wethBorrowVal],
                    multiSwapper.address,
                    data,
                    data,
                ),
            ).to.not.be.reverted;
            hre.tracer.enabled = false;

            const userBorrowedAmountAfter =
                await wethUsdcSingularity.userBorrowPart(eoa1.address);

            expect(userBorrowedAmountAfter).to.be.approximately(
                userBorrowedAmountBefore.sub(maxLiquidatable),
                userBorrowedAmountAfter.mul(99).div(100),
            );
        });

        it('Should lend WBTC, deposit Usdc collateral and borrow WBTC and be liquidated for price drop', async () => {
            const {
                usdc,
                wbtc,
                yieldBox,
                wbtcDepositAndAddAsset,
                usdcDepositAndAddCollateralWbtcSingularity,
                eoa1,
                approveTokensAndSetBarApproval,
                deployer,
                wbtcUsdcSingularity,
                multiSwapper,
                wbtcUsdcOracle,
                __wbtcUsdcPrice,
            } = await loadFixture(register);

            const assetId = await wbtcUsdcSingularity.assetId();
            const collateralId = await wbtcUsdcSingularity.collateralId();
            const wbtcMintVal = ethers.BigNumber.from((1e8).toString()).mul(1);
            const usdcMintVal = wbtcMintVal
                .mul(1e10)
                .mul(__wbtcUsdcPrice.div((1e18).toString()));

            // We get asset
            await wbtc.freeMint(wbtcMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            // We approve external operators
            await approveTokensAndSetBarApproval();
            await approveTokensAndSetBarApproval(eoa1);

            // We lend WBTC as deployer
            await wbtcDepositAndAddAsset(wbtcMintVal);
            expect(
                await wbtcUsdcSingularity.balanceOf(deployer.address),
            ).to.be.equal(await yieldBox.toShare(assetId, wbtcMintVal, false));

            // We deposit USDC collateral
            await usdcDepositAndAddCollateralWbtcSingularity(usdcMintVal, eoa1);
            expect(
                await wbtcUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

            // We borrow 74% collateral, max is 75%
            const wbtcBorrowVal = usdcMintVal
                .mul(74)
                .div(100)
                .div(__wbtcUsdcPrice.div((1e18).toString()))
                .div(1e10);

            await wbtcUsdcSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, wbtcBorrowVal.toString());
            await yieldBox
                .connect(eoa1)
                .withdraw(
                    assetId,
                    eoa1.address,
                    eoa1.address,
                    wbtcBorrowVal,
                    0,
                );

            const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
            // Can't liquidate
            await expect(
                wbtcUsdcSingularity.liquidate(
                    [eoa1.address],
                    [wbtcBorrowVal],
                    multiSwapper.address,
                    data,
                    data,
                ),
            ).to.be.reverted;

            // Can be liquidated price drop (USDC/WETH)
            const priceDrop = __wbtcUsdcPrice.mul(20).div(100);

            await wbtcUsdcOracle.set(__wbtcUsdcPrice.add(priceDrop));

            await expect(
                wbtcUsdcSingularity.liquidate(
                    [eoa1.address],
                    [wbtcBorrowVal],
                    multiSwapper.address,
                    data,
                    data,
                ),
            ).to.not.be.reverted;
        });

        it('should add addset, remove asset and update exchange rate in a single tx', async () => {
            const {
                weth,
                yieldBox,
                usdc,
                wethUsdcSingularity,
                deployer,
                initContracts,
                bar,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

            const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
            await weth.freeMint(mintVal);

            const balanceBefore = await weth.balanceOf(deployer.address);
            // Deposit assets to bar
            const mintValShare = await yieldBox.toShare(
                await wethUsdcSingularity.assetId(),
                mintVal,
                false,
            );
            await (await weth.approve(yieldBox.address, mintVal)).wait();
            await (
                await yieldBox.depositAsset(
                    await wethUsdcSingularity.assetId(),
                    deployer.address,
                    deployer.address,
                    0,
                    mintValShare,
                )
            ).wait();

            await (
                await yieldBox.setApprovalForAll(
                    wethUsdcSingularity.address,
                    true,
                )
            ).wait();

            let addAssetFn = wethUsdcSingularity.interface.encodeFunctionData(
                'addAsset',
                [deployer.address, deployer.address, false, mintValShare],
            );
            const removeAssetFn =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'removeAsset',
                    [deployer.address, deployer.address, mintValShare],
                );

            const updateExchangeRateFn =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'updateExchangeRate',
                );

            await wethUsdcSingularity.execute(
                [addAssetFn, removeAssetFn, updateExchangeRateFn],
                true,
            );

            addAssetFn = wethUsdcSingularity.interface.encodeFunctionData(
                'addAsset',
                [deployer.address, deployer.address, true, mintValShare],
            );

            await expect(
                wethUsdcSingularity.execute(
                    [addAssetFn, removeAssetFn, updateExchangeRateFn],
                    true,
                ),
            ).to.be.revertedWith('SGL: too much');

            // Withdraw from bar
            await yieldBox.withdraw(
                await wethUsdcSingularity.assetId(),
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            );

            // Check the value of the asset
            const balanceAfter = await weth.balanceOf(deployer.address);
            expect(balanceAfter).to.equal(balanceBefore);
        });

        it('Should lend Weth, deposit Usdc collateral and borrow Weth in a single tx', async () => {
            const {
                usdc,
                weth,
                yieldBox,
                eoa1,
                approveTokensAndSetBarApproval,
                deployer,
                wethUsdcSingularity,
                magnetar,
                wethUsdcOracle,
                __wethUsdcPrice,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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

            const addAssetFn = wethUsdcSingularity.interface.encodeFunctionData(
                'addAsset',
                [deployer.address, deployer.address, false, wethMintValShare],
            );
            await (
                await wethUsdcSingularity.execute([addAssetFn], true)
            ).wait();
            expect(
                await wethUsdcSingularity.balanceOf(deployer.address),
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

            const addCollateralFn =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'addCollateral',
                    [eoa1.address, eoa1.address, false, 0, usdcMintValShare],
                );
            const borrowFn = wethUsdcSingularity.interface.encodeFunctionData(
                'borrow',
                [eoa1.address, eoa1.address, wethBorrowVal],
            );

            await (
                await wethUsdcSingularity
                    .connect(eoa1)
                    .execute([addCollateralFn, borrowFn], true)
            ).wait();

            expect(
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

            const dataFromHelper = (
                await magnetar.singularityMarketInfo(eoa1.address, [
                    wethUsdcSingularity.address,
                ])
            )[0];
            expect(dataFromHelper.market[0].toLowerCase()).eq(
                usdc.address.toLowerCase(),
            );
            expect(dataFromHelper.market[2].toLowerCase()).eq(
                weth.address.toLowerCase(),
            );
            expect(dataFromHelper.market[4].toLowerCase()).eq(
                wethUsdcOracle.address.toLowerCase(),
            );
            expect(dataFromHelper.market[7].eq(usdcMintValShare)).to.be.true;

            const borrowed = await wethUsdcSingularity.userBorrowPart(
                eoa1.address,
            );
            expect(dataFromHelper.market[9].eq(borrowed)).to.be.true;
        });

        it('Should deposit to yieldBox, add asset to singularity, remove asset and withdraw', async () => {
            const {
                weth,
                yieldBox,
                wethUsdcSingularity,
                deployer,
                initContracts,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

            const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
            await weth.freeMint(mintVal);

            const balanceBefore = await weth.balanceOf(deployer.address);
            // Deposit assets to bar
            const mintValShare = await yieldBox.toShare(
                await wethUsdcSingularity.assetId(),
                mintVal,
                false,
            );
            await (await weth.approve(yieldBox.address, mintVal)).wait();
            await (
                await yieldBox.depositAsset(
                    await wethUsdcSingularity.assetId(),
                    deployer.address,
                    deployer.address,
                    0,
                    mintValShare,
                )
            ).wait();

            // Add asset to Singularity
            await (
                await yieldBox.setApprovalForAll(
                    wethUsdcSingularity.address,
                    true,
                )
            ).wait();
            await (
                await wethUsdcSingularity.addAsset(
                    deployer.address,
                    deployer.address,
                    false,
                    mintValShare,
                )
            ).wait();

            // Remove asset from Singularity
            await (
                await wethUsdcSingularity.removeAsset(
                    deployer.address,
                    deployer.address,
                    mintValShare,
                )
            ).wait();

            // Withdraw from bar
            await (
                await yieldBox.withdraw(
                    await wethUsdcSingularity.assetId(),
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
    });

    describe('views', () => {
        it('should compute permit share', async () => {
            const {
                usdc,
                weth,
                yieldBox,
                eoa1,
                approveTokensAndSetBarApproval,
                deployer,
                wethUsdcSingularity,
                magnetar,
                wethUsdcOracle,
                __wethUsdcPrice,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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

            const addAssetFn = wethUsdcSingularity.interface.encodeFunctionData(
                'addAsset',
                [deployer.address, deployer.address, false, wethMintValShare],
            );
            await (
                await wethUsdcSingularity.execute([addAssetFn], true)
            ).wait();
            expect(
                await wethUsdcSingularity.balanceOf(deployer.address),
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

            const addCollateralFn =
                wethUsdcSingularity.interface.encodeFunctionData(
                    'addCollateral',
                    [eoa1.address, eoa1.address, false, 0, usdcMintValShare],
                );
            const borrowFn = wethUsdcSingularity.interface.encodeFunctionData(
                'borrow',
                [eoa1.address, eoa1.address, wethBorrowVal],
            );

            await (
                await wethUsdcSingularity
                    .connect(eoa1)
                    .execute([addCollateralFn, borrowFn], true)
            ).wait();

            expect(
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

            const dataFromHelper = (
                await magnetar.singularityMarketInfo(eoa1.address, [
                    wethUsdcSingularity.address,
                ])
            )[0];
            expect(dataFromHelper.market[0].toLowerCase()).eq(
                usdc.address.toLowerCase(),
            );
            expect(dataFromHelper.market[2].toLowerCase()).eq(
                weth.address.toLowerCase(),
            );
            expect(dataFromHelper.market[4].toLowerCase()).eq(
                wethUsdcOracle.address.toLowerCase(),
            );
            expect(dataFromHelper.market[7].eq(usdcMintValShare)).to.be.true;

            const borrowed = await wethUsdcSingularity.userBorrowPart(
                eoa1.address,
            );
            expect(dataFromHelper.market[9].eq(borrowed)).to.be.true;

            const permitShare =
                await wethUsdcSingularity.computeAllowedLendShare(
                    1,
                    await wethUsdcSingularity.assetId(),
                );
            expect(permitShare.gte(1)).to.be.true;
        });

        it('should test yieldBoxShares', async () => {
            const {
                eoa1,
                weth,
                yieldBox,
                deployer,
                wethUsdcSingularity,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                timeTravel,
            } = await loadFixture(register);

            await approveTokensAndSetBarApproval();
            await approveTokensAndSetBarApproval(eoa1);

            const assetId = await wethUsdcSingularity.assetId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );

            await weth.freeMint(wethMintVal);
            await timeTravel(86500);
            await wethDepositAndAddAsset(wethMintVal);

            let deployerYieldBoxShares =
                await wethUsdcSingularity.yieldBoxShares(
                    deployer.address,
                    assetId,
                );
            let eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                eoa1.address,
                assetId,
            );
            let yieldBoxSharesForSgl = await yieldBox.balanceOf(
                wethUsdcSingularity.address,
                assetId,
            );
            let yieldBoxSharesForDeployer = await yieldBox.balanceOf(
                deployer.address,
                assetId,
            );
            let yieldBoxSharesForEoa1 = await yieldBox.balanceOf(
                eoa1.address,
                assetId,
            );

            await weth.connect(eoa1).freeMint(wethMintVal);
            await timeTravel(86500);
            await wethDepositAndAddAsset(wethMintVal, eoa1);

            deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                deployer.address,
                assetId,
            );
            eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                eoa1.address,
                assetId,
            );
            yieldBoxSharesForSgl = await yieldBox.balanceOf(
                wethUsdcSingularity.address,
                assetId,
            );
            yieldBoxSharesForDeployer = await yieldBox.balanceOf(
                deployer.address,
                assetId,
            );
            yieldBoxSharesForEoa1 = await yieldBox.balanceOf(
                eoa1.address,
                assetId,
            );
            expect(
                eoa1YieldBoxShares
                    .add(deployerYieldBoxShares)
                    .eq(
                        yieldBoxSharesForSgl
                            .add(yieldBoxSharesForDeployer)
                            .add(yieldBoxSharesForEoa1),
                    ),
            ).to.be.true;

            deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                deployer.address,
                assetId,
            );
            eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                eoa1.address,
                assetId,
            );
            yieldBoxSharesForSgl = await yieldBox.balanceOf(
                wethUsdcSingularity.address,
                assetId,
            );
            yieldBoxSharesForDeployer = await yieldBox.balanceOf(
                deployer.address,
                assetId,
            );
            yieldBoxSharesForEoa1 = await yieldBox.balanceOf(
                eoa1.address,
                assetId,
            );
            expect(
                eoa1YieldBoxShares
                    .add(deployerYieldBoxShares)
                    .eq(
                        yieldBoxSharesForSgl
                            .add(yieldBoxSharesForDeployer)
                            .add(yieldBoxSharesForEoa1),
                    ),
            ).to.be.true;

            await weth.connect(eoa1).freeMint(wethMintVal);
            await timeTravel(86500);
            await wethDepositAndAddAsset(wethMintVal, eoa1);

            deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                deployer.address,
                assetId,
            );
            eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                eoa1.address,
                assetId,
            );
            yieldBoxSharesForSgl = await yieldBox.balanceOf(
                wethUsdcSingularity.address,
                assetId,
            );
            yieldBoxSharesForDeployer = await yieldBox.balanceOf(
                deployer.address,
                assetId,
            );
            yieldBoxSharesForEoa1 = await yieldBox.balanceOf(
                eoa1.address,
                assetId,
            );
            expect(
                eoa1YieldBoxShares
                    .add(deployerYieldBoxShares)
                    .eq(
                        yieldBoxSharesForSgl
                            .add(yieldBoxSharesForDeployer)
                            .add(yieldBoxSharesForEoa1),
                    ),
            ).to.be.true;
            const mintValShare = await yieldBox.toShare(
                assetId,
                wethMintVal,
                false,
            );

            await wethUsdcSingularity.removeAsset(
                deployer.address,
                deployer.address,
                mintValShare,
            );

            deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                deployer.address,
                assetId,
            );
            eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                eoa1.address,
                assetId,
            );
            yieldBoxSharesForSgl = await yieldBox.balanceOf(
                wethUsdcSingularity.address,
                assetId,
            );
            yieldBoxSharesForDeployer = await yieldBox.balanceOf(
                deployer.address,
                assetId,
            );
            yieldBoxSharesForEoa1 = await yieldBox.balanceOf(
                eoa1.address,
                assetId,
            );
            expect(
                eoa1YieldBoxShares
                    .add(deployerYieldBoxShares)
                    .eq(
                        yieldBoxSharesForSgl
                            .add(yieldBoxSharesForDeployer)
                            .add(yieldBoxSharesForEoa1),
                    ),
            ).to.be.true;

            await weth.freeMint(wethMintVal.mul(3));
            await timeTravel(86500);
            await wethDepositAndAddAsset(wethMintVal.mul(3));

            deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                deployer.address,
                assetId,
            );
            eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                eoa1.address,
                assetId,
            );
            yieldBoxSharesForSgl = await yieldBox.balanceOf(
                wethUsdcSingularity.address,
                assetId,
            );
            yieldBoxSharesForDeployer = await yieldBox.balanceOf(
                deployer.address,
                assetId,
            );
            yieldBoxSharesForEoa1 = await yieldBox.balanceOf(
                eoa1.address,
                assetId,
            );
            expect(
                eoa1YieldBoxShares
                    .add(deployerYieldBoxShares)
                    .eq(
                        yieldBoxSharesForSgl
                            .add(yieldBoxSharesForDeployer)
                            .add(yieldBoxSharesForEoa1),
                    ),
            ).to.be.true;

            await wethUsdcSingularity.removeAsset(
                deployer.address,
                deployer.address,
                mintValShare.mul(3),
            );
            await yieldBox.withdraw(
                assetId,
                deployer.address,
                deployer.address,
                0,
                mintValShare.mul(4),
            );

            deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                deployer.address,
                assetId,
            );
            eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                eoa1.address,
                assetId,
            );
            yieldBoxSharesForSgl = await yieldBox.balanceOf(
                wethUsdcSingularity.address,
                assetId,
            );
            yieldBoxSharesForDeployer = await yieldBox.balanceOf(
                deployer.address,
                assetId,
            );
            yieldBoxSharesForEoa1 = await yieldBox.balanceOf(
                eoa1.address,
                assetId,
            );
            expect(
                eoa1YieldBoxShares
                    .add(deployerYieldBoxShares)
                    .eq(
                        yieldBoxSharesForSgl
                            .add(yieldBoxSharesForDeployer)
                            .add(yieldBoxSharesForEoa1),
                    ),
            ).to.be.true;

            await wethUsdcSingularity
                .connect(eoa1)
                .removeAsset(eoa1.address, eoa1.address, mintValShare);

            deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                deployer.address,
                assetId,
            );
            eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                eoa1.address,
                assetId,
            );
            yieldBoxSharesForSgl = await yieldBox.balanceOf(
                wethUsdcSingularity.address,
                assetId,
            );
            yieldBoxSharesForDeployer = await yieldBox.balanceOf(
                deployer.address,
                assetId,
            );
            yieldBoxSharesForEoa1 = await yieldBox.balanceOf(
                eoa1.address,
                assetId,
            );
            expect(
                eoa1YieldBoxShares
                    .add(deployerYieldBoxShares)
                    .eq(
                        yieldBoxSharesForSgl
                            .add(yieldBoxSharesForDeployer)
                            .add(yieldBoxSharesForEoa1),
                    ),
            ).to.be.true;

            await yieldBox
                .connect(eoa1)
                .withdraw(assetId, eoa1.address, eoa1.address, 0, mintValShare);
            deployerYieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                deployer.address,
                assetId,
            );
            eoa1YieldBoxShares = await wethUsdcSingularity.yieldBoxShares(
                eoa1.address,
                assetId,
            );
            yieldBoxSharesForSgl = await yieldBox.balanceOf(
                wethUsdcSingularity.address,
                assetId,
            );
            yieldBoxSharesForDeployer = await yieldBox.balanceOf(
                deployer.address,
                assetId,
            );
            yieldBoxSharesForEoa1 = await yieldBox.balanceOf(
                eoa1.address,
                assetId,
            );
            expect(
                eoa1YieldBoxShares
                    .add(deployerYieldBoxShares)
                    .eq(
                        yieldBoxSharesForSgl
                            .add(yieldBoxSharesForDeployer)
                            .add(yieldBoxSharesForEoa1),
                    ),
            ).to.be.true;
        });

        it('should get correct amount from borrow part', async () => {
            const {
                deployer,
                usdc,
                BN,
                approveTokensAndSetBarApproval,
                usdcDepositAndAddCollateral,
                wethDepositAndAddAsset,
                wethUsdcSingularity,
                magnetar,
                __wethUsdcPrice,
                weth,
                eoa1,
            } = await loadFixture(register);

            const wethAmount = BN(1e18).mul(1);
            const usdcAmount = wethAmount
                .mul(__wethUsdcPrice.mul(2))
                .div((1e18).toString());

            await usdc.freeMint(usdcAmount);
            await approveTokensAndSetBarApproval();
            await usdcDepositAndAddCollateral(usdcAmount);

            await approveTokensAndSetBarApproval(eoa1);
            await weth.connect(eoa1).freeMint(wethAmount);
            await wethDepositAndAddAsset(wethAmount, eoa1);

            await wethUsdcSingularity.borrow(
                deployer.address,
                deployer.address,
                wethAmount,
            );

            const amountFromShares = await magnetar.getAmountForBorrowPart(
                wethUsdcSingularity.address,
                await wethUsdcSingularity.userBorrowPart(deployer.address),
            );

            expect(amountFromShares).to.be.approximately(
                wethAmount,
                wethAmount.mul(1).div(100),
            );
        });

        it('should compute fee withdrawals and execute', async () => {
            const {
                usdc,
                weth,
                bar,
                wethAssetId,
                yieldBox,
                eoa1,
                wethUsdcSingularity,
                deployer,
                approveTokensAndSetBarApproval,
                usdcDepositAndAddCollateral,
                wethDepositAndAddAsset,
                multiSwapper,
                singularityFeeTo,
                __wethUsdcPrice,
                timeTravel,
                magnetar,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                await wethUsdcSingularity.balanceOf(deployer.address),
            ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

            // We deposit USDC collateral
            await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
            expect(
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

            // We borrow 74% collateral, max is 75%
            const wethBorrowVal = usdcMintVal
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div((1e18).toString()));
            await wethUsdcSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, wethBorrowVal);

            // We jump time to accumulate fees
            const day = 86400;
            await timeTravel(180 * day);

            // Repay
            const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
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
            await wethUsdcSingularity
                .connect(eoa1)
                .repay(eoa1.address, eoa1.address, false, userBorrowPart);

            const feesAmountInAsset = await magnetar.getAmountForAssetFraction(
                wethUsdcSingularity.address,
                (
                    await wethUsdcSingularity.accrueInfo()
                ).feesEarnedFraction,
            );

            // Confirm fees accumulation
            expect(userBorrowPart.gt(wethBorrowVal));

            const feeShareIn = await yieldBox.toShare(
                assetId,
                feesAmountInAsset,
                false,
            );
            const marketAsset = await wethUsdcSingularity.asset();
            const marketCollateral = await wethUsdcSingularity.collateral();
            const marketAssetId = await wethUsdcSingularity.assetId();

            const swapData = await multiSwapper[
                'buildSwapData(uint256,uint256,uint256,uint256,bool,bool)'
            ](marketAssetId, collateralId, 0, feeShareIn, true, true);
            const feeMinAmount = await multiSwapper.getOutputAmount(
                swapData,
                '0x00',
            );

            // Withdraw fees from Penrose
            const markets = [wethUsdcSingularity.address];
            const swappers = [multiSwapper.address];
            const dexData = [{ minAssetAmount: feeMinAmount }];

            await expect(
                bar.withdrawAllMarketFees(markets, swappers, dexData),
            ).to.emit(bar, 'LogYieldBoxFeesDeposit');

            const amountHarvested = await yieldBox.toAmount(
                wethAssetId,
                await yieldBox.balanceOf(singularityFeeTo.address, wethAssetId),
                false,
            );
            // 0.31%
            const acceptableHarvestMargin = feesAmountInAsset.sub(
                feesAmountInAsset.mul(31).div(10000),
            );
            expect(amountHarvested.gte(acceptableHarvestMargin)).to.be.true;
        });

        it('should compute amount to solvency for nothing borrowed', async () => {
            const { wethUsdcSingularity } = await loadFixture(register);
            const amountForNothingBorrowed =
                await wethUsdcSingularity.computeTVLInfo(
                    ethers.constants.AddressZero,
                    0,
                );
            expect(amountForNothingBorrowed[0].eq(0)).to.be.true;
        });
        it('should return ERC20 properties', async () => {
            const { wethUsdcSingularity } = await loadFixture(register);
            const symbol = await wethUsdcSingularity.symbol();
            const decimals = await wethUsdcSingularity.decimals();
            const totalSupply = await wethUsdcSingularity.totalSupply();

            expect(symbol.toLowerCase()).to.contain(
                'tmusdcm/wethm-wethmoracle',
            );
            expect(decimals).to.eq(18);
            expect(totalSupply).to.eq(0);
        });
    });

    describe('caps & limits', () => {
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
                wethUsdcSingularity,
                __wethUsdcPrice,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                await wethUsdcSingularity.balanceOf(deployer.address),
            ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

            // We deposit USDC collateral
            await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
            expect(
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

            const firstBorrow = ethers.BigNumber.from((1e17).toString());
            await wethUsdcSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, firstBorrow);
            await wethUsdcSingularity.accrue();

            await wethUsdcSingularity
                .connect(eoa1)
                .borrow(
                    eoa1.address,
                    eoa1.address,
                    wethMintVal.sub(firstBorrow),
                );

            await wethUsdcSingularity.accrue();
        });
        it('should not update exchange rate', async () => {
            const { wethUsdcSingularity, wethUsdcOracle } = await loadFixture(
                register,
            );
            await wethUsdcOracle.setSuccess(false);

            await wethUsdcOracle.set(100);

            const previousExchangeRate =
                await wethUsdcSingularity.exchangeRate();
            await wethUsdcSingularity.updateExchangeRate();
            let currentExchangeRate = await wethUsdcSingularity.exchangeRate();

            expect(previousExchangeRate.eq(currentExchangeRate)).to.be.true;

            await wethUsdcOracle.setSuccess(true);
            await wethUsdcSingularity.updateExchangeRate();
            currentExchangeRate = await wethUsdcSingularity.exchangeRate();
            expect(currentExchangeRate.eq(100)).to.be.true;
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
                wethUsdcSingularity,
                bar,
                __wethUsdcPrice,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                await wethUsdcSingularity.balanceOf(deployer.address),
            ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

            // We deposit USDC collateral
            await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
            expect(
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

            const wethBorrowVal = usdcMintVal
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div((1e18).toString()));

            let borrowCapData =
                wethUsdcSingularity.interface.encodeFunctionData(
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
                        wethBorrowVal.div(2),
                        0,
                    ],
                );
            await bar.executeMarketFn(
                [wethUsdcSingularity.address],
                [borrowCapData],
                true,
            );
            const savedBorrowCap = await wethUsdcSingularity.totalBorrowCap();
            expect(savedBorrowCap.eq(wethBorrowVal.div(2))).to.be.true;

            await expect(
                wethUsdcSingularity
                    .connect(eoa1)
                    .borrow(eoa1.address, eoa1.address, wethBorrowVal),
            ).to.be.revertedWith('SGL: borrow cap reached');

            borrowCapData = wethUsdcSingularity.interface.encodeFunctionData(
                'setBorrowCap',
                [0],
            );
            await bar.executeMarketFn(
                [wethUsdcSingularity.address],
                [borrowCapData],
                true,
            );

            await expect(
                wethUsdcSingularity
                    .connect(eoa1)
                    .borrow(eoa1.address, eoa1.address, wethBorrowVal),
            ).to.not.be.reverted;
        });
    });

    describe('fees & liquidations', () => {
        it('should test liquidator rewards & closing factor', async () => {
            const {
                eoa1,
                usdc,
                weth,
                yieldBox,
                deployer,
                wethUsdcSingularity,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                __wethUsdcPrice,
                timeTravel,
                usdcDepositAndAddCollateral,
                magnetar,
                BN,
                wethUsdcOracle,
            } = await loadFixture(register);

            const wethAmount = BN(1e18).mul(1);
            const usdcAmount = wethAmount
                .mul(__wethUsdcPrice.mul(3))
                .div((1e18).toString());

            await usdc.freeMint(usdcAmount);
            await approveTokensAndSetBarApproval();
            await usdcDepositAndAddCollateral(usdcAmount);

            await approveTokensAndSetBarApproval(eoa1);
            await weth.connect(eoa1).freeMint(wethAmount);
            await wethDepositAndAddAsset(wethAmount, eoa1);

            //30%
            await wethUsdcSingularity.borrow(
                deployer.address,
                deployer.address,
                wethAmount,
            );

            await wethUsdcSingularity.updateExchangeRate();
            let exchangeRate = await wethUsdcSingularity.exchangeRate();
            let reward = await wethUsdcSingularity.computeLiquidatorReward(
                deployer.address,
                exchangeRate,
            );

            expect(reward.eq(0)).to.be.true;

            await timeTravel(86500);
            //60%
            await weth.connect(eoa1).freeMint(wethAmount);
            await wethDepositAndAddAsset(wethAmount, eoa1);
            await wethUsdcSingularity.borrow(
                deployer.address,
                deployer.address,
                wethAmount,
            );
            reward = await wethUsdcSingularity.computeLiquidatorReward(
                deployer.address,
                exchangeRate,
            );
            expect(reward.eq(0)).to.be.true;

            await timeTravel(86500);

            //20% price drop
            let priceDrop = __wethUsdcPrice.mul(20).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();
            exchangeRate = await wethUsdcSingularity.exchangeRate();

            let prevReward;
            reward = await wethUsdcSingularity.computeLiquidatorReward(
                deployer.address,
                exchangeRate,
            );
            prevReward = reward;
            expect(reward.gt(0)).to.be.true;
            let prevClosingFactor;
            let closingFactor = await wethUsdcSingularity.computeClosingFactor(
                await wethUsdcSingularity.userBorrowPart(deployer.address),
                (
                    await wethUsdcSingularity.computeTVLInfo(
                        deployer.address,
                        exchangeRate,
                    )
                )[2],
                18,
                18,
                5,
            );
            expect(closingFactor.gt(0)).to.be.true;
            prevClosingFactor = closingFactor;

            priceDrop = __wethUsdcPrice.mul(25).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();
            exchangeRate = await wethUsdcSingularity.exchangeRate();
            reward = await wethUsdcSingularity.computeLiquidatorReward(
                deployer.address,
                exchangeRate,
            );
            expect(reward.lt(prevReward)).to.be.true;
            prevReward = reward;
            closingFactor = await wethUsdcSingularity.computeClosingFactor(
                await wethUsdcSingularity.userBorrowPart(deployer.address),
                (
                    await wethUsdcSingularity.computeTVLInfo(
                        deployer.address,
                        exchangeRate,
                    )
                )[2],
                18,
                18,
                5,
            );
            expect(closingFactor.gt(prevClosingFactor)).to.be.true;
            prevClosingFactor = closingFactor;

            priceDrop = __wethUsdcPrice.mul(35).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();
            exchangeRate = await wethUsdcSingularity.exchangeRate();
            reward = await wethUsdcSingularity.computeLiquidatorReward(
                deployer.address,
                exchangeRate,
            );
            expect(reward.lt(prevReward)).to.be.true;
            prevReward = reward;
            closingFactor = await wethUsdcSingularity.computeClosingFactor(
                await wethUsdcSingularity.userBorrowPart(deployer.address),
                (
                    await wethUsdcSingularity.computeTVLInfo(
                        deployer.address,
                        exchangeRate,
                    )
                )[2],
                18,
                18,
                5,
            );
            expect(closingFactor.gt(prevClosingFactor)).to.be.true;
            prevClosingFactor = closingFactor;

            priceDrop = __wethUsdcPrice.mul(50).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();
            exchangeRate = await wethUsdcSingularity.exchangeRate();
            reward = await wethUsdcSingularity.computeLiquidatorReward(
                deployer.address,
                exchangeRate,
            );
            expect(reward.lt(prevReward)).to.be.true;
            prevReward = reward;
            closingFactor = await wethUsdcSingularity.computeClosingFactor(
                await wethUsdcSingularity.userBorrowPart(deployer.address),
                (
                    await wethUsdcSingularity.computeTVLInfo(
                        deployer.address,
                        exchangeRate,
                    )
                )[2],
                18,
                18,
                5,
            );
            expect(closingFactor.gt(prevClosingFactor)).to.be.true;
            prevClosingFactor = closingFactor;

            priceDrop = __wethUsdcPrice.mul(60).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();
            exchangeRate = await wethUsdcSingularity.exchangeRate();
            reward = await wethUsdcSingularity.computeLiquidatorReward(
                deployer.address,
                exchangeRate,
            );
            expect(reward.eq(prevReward)).to.be.true;
            prevReward = reward;
            closingFactor = await wethUsdcSingularity.computeClosingFactor(
                await wethUsdcSingularity.userBorrowPart(deployer.address),
                (
                    await wethUsdcSingularity.computeTVLInfo(
                        deployer.address,
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
        it('Should accumulate fees for lender', async () => {
            const {
                usdc,
                weth,
                yieldBox,
                eoa1,
                wethUsdcSingularity,
                deployer,
                initContracts,
                approveTokensAndSetBarApproval,
                usdcDepositAndAddCollateral,
                magnetar,
                BN,
                __wethUsdcPrice,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

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
                await wethUsdcSingularity.assetId(),
                lendVal,
                false,
            );
            await (await weth.approve(yieldBox.address, lendVal)).wait();
            await (
                await yieldBox.depositAsset(
                    await wethUsdcSingularity.assetId(),
                    deployer.address,
                    deployer.address,
                    0,
                    lendValShare,
                )
            ).wait();

            // Add asset to Singularity
            await (
                await yieldBox.setApprovalForAll(
                    wethUsdcSingularity.address,
                    true,
                )
            ).wait();
            await (
                await wethUsdcSingularity.addAsset(
                    deployer.address,
                    deployer.address,
                    false,
                    lendValShare,
                )
            ).wait();

            /**
             * BORROW
             */
            const collateralId = await wethUsdcSingularity.collateralId();

            // We approve external operators
            await approveTokensAndSetBarApproval();
            await approveTokensAndSetBarApproval(eoa1);

            // We deposit USDC collateral
            await usdcDepositAndAddCollateral(collateralVal, eoa1);
            expect(
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, collateralVal, false));

            // We borrow
            await wethUsdcSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, borrowVal);

            // Validate fees
            const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
                eoa1.address,
            );
            const minCollateralShareRepay =
                await magnetar.getCollateralSharesForBorrowPart(
                    wethUsdcSingularity.address,
                    borrowVal.mul(50).div(100000).add(borrowVal),
                    ethers.BigNumber.from((1e5).toString()),
                    ethers.BigNumber.from((1e18).toString()),
                );
            const userCollateralShareToRepay =
                await magnetar.getCollateralSharesForBorrowPart(
                    wethUsdcSingularity.address,
                    userBorrowPart,
                    ethers.BigNumber.from((1e5).toString()),
                    ethers.BigNumber.from((1e18).toString()),
                );

            expect(userCollateralShareToRepay).to.be.eq(
                minCollateralShareRepay,
            );

            // Repay borrow
            const assetId = await wethUsdcSingularity.assetId();

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
            await wethUsdcSingularity
                .connect(eoa1)
                .repay(eoa1.address, eoa1.address, false, userBorrowPart);

            expect(
                await wethUsdcSingularity.userBorrowPart(eoa1.address),
            ).to.be.eq(BN(0));
            // Withdraw collateral
            await (
                await wethUsdcSingularity
                    .connect(eoa1)
                    .removeCollateral(
                        eoa1.address,
                        eoa1.address,
                        await wethUsdcSingularity.userCollateralShare(
                            eoa1.address,
                        ),
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
                await wethUsdcSingularity.removeAsset(
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

        it('Should accumulate fees and harvest them as collateral', async () => {
            const {
                usdc,
                weth,
                bar,
                yieldBox,
                eoa1,
                wethUsdcSingularity,
                deployer,
                approveTokensAndSetBarApproval,
                usdcDepositAndAddCollateral,
                wethDepositAndAddAsset,
                multiSwapper,
                singularityFeeTo,
                __wethUsdcPrice,
                timeTravel,
                magnetar,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
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
                await wethUsdcSingularity.balanceOf(deployer.address),
            ).to.be.equal(await yieldBox.toShare(assetId, wethMintVal, false));

            // We deposit USDC collateral
            await usdcDepositAndAddCollateral(usdcMintVal, eoa1);
            expect(
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

            // We borrow 74% collateral, max is 75%
            const wethBorrowVal = usdcMintVal
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div((1e18).toString()));
            await wethUsdcSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, wethBorrowVal);

            // We jump time to accumulate fees
            const day = 86400;
            await timeTravel(180 * day);

            // Repay
            const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
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
            await wethUsdcSingularity
                .connect(eoa1)
                .repay(eoa1.address, eoa1.address, false, userBorrowPart);

            const feesAmountInAsset = await magnetar.getAmountForAssetFraction(
                wethUsdcSingularity.address,
                (
                    await wethUsdcSingularity.accrueInfo()
                ).feesEarnedFraction,
            );

            // Confirm fees accumulation
            expect(userBorrowPart.gt(wethBorrowVal));
            // Withdraw fees from Penrose
            const markets = await bar.singularityMarkets();
            const swappers = [];
            const swapData = [];
            for (let i = 0; i < markets.length; i++) {
                swappers.push(multiSwapper.address);
                swapData.push({ minAssetAmount: 1 });
            }
            await expect(
                bar.withdrawAllMarketFees(markets, swappers, swapData),
            ).to.emit(bar, 'LogYieldBoxFeesDeposit');

            const amountHarvested = await yieldBox.toAmount(
                await bar.wethAssetId(),
                await yieldBox.balanceOf(
                    singularityFeeTo.address,
                    await bar.wethAssetId(),
                ),
                false,
            );
            // 0.31%
            const acceptableHarvestMargin = feesAmountInAsset.sub(
                feesAmountInAsset.mul(31).div(10000),
            );
            expect(amountHarvested.gte(acceptableHarvestMargin)).to.be.true;
        });

        it('deposit fees to yieldbox should not work for inexistent swapper', async () => {
            const { wethUsdcSingularity, bar } = await loadFixture(register);
            await expect(
                bar.withdrawAllMarketFees(
                    [wethUsdcSingularity.address],
                    [ethers.constants.AddressZero],
                    [{ minAssetAmount: 1 }],
                ),
            ).to.be.revertedWith('Penrose: zero address');

            await expect(
                bar.withdrawAllMarketFees(
                    [wethUsdcSingularity.address],
                    [wethUsdcSingularity.address],
                    [{ minAssetAmount: 1 }],
                ),
            ).to.be.revertedWith('Penrose: Invalid swapper');
        });
    });

    describe('borrowing', () => {
        it('should allow multiple borrowers', async () => {
            const {
                usdc,
                eoa1,
                weth,
                yieldBox,
                multiSwapper,
                deployer,
                wethUsdcSingularity,
                timeTravel,
                __wethUsdcPrice,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                usdcDepositAndAddCollateral,
                eoas,
                bar,
            } = await loadFixture(register);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            const usdcMintVal = wethMintVal
                .mul(10)
                .mul(__wethUsdcPrice.div((1e18).toString()));
            const wethBorrowVal = usdcMintVal
                .mul(74)
                .div(100)
                .div(__wethUsdcPrice.div((1e18).toString()));

            await weth.freeMint(wethMintVal.mul(10));
            await approveTokensAndSetBarApproval();
            await wethDepositAndAddAsset(wethMintVal.mul(10));
            expect(
                await wethUsdcSingularity.balanceOf(deployer.address),
            ).to.be.equal(
                await yieldBox.toShare(assetId, wethMintVal.mul(10), false),
            );

            const wethYieldShareFromSGLAfter =
                await wethUsdcSingularity.yieldBoxShares(
                    deployer.address,
                    assetId,
                );

            expect(
                wethYieldShareFromSGLAfter.eq(
                    await yieldBox.toShare(assetId, wethMintVal.mul(10), false),
                ),
            ).to.be.true;

            for (let i = 0; i < eoas.length; i++) {
                const eoa = eoas[i];
                await usdc.connect(eoa).freeMint(usdcMintVal);
                await approveTokensAndSetBarApproval(eoa);
                await usdcDepositAndAddCollateral(usdcMintVal, eoa);
                expect(
                    await wethUsdcSingularity.userCollateralShare(eoa.address),
                ).equal(
                    await yieldBox.toShare(collateralId, usdcMintVal, false),
                );
                timeTravel(86400);
            }

            timeTravel(86400 * 5);
            const firstBorrow = ethers.BigNumber.from((1e17).toString());

            for (let i = 0; i < eoas.length; i++) {
                const eoa = eoas[i];
                await wethUsdcSingularity
                    .connect(eoa)
                    .borrow(eoa.address, eoa.address, firstBorrow);
                timeTravel(10 * 86400);
            }

            timeTravel(10 * 86400);
            await bar.withdrawAllMarketFees(
                [wethUsdcSingularity.address],
                [multiSwapper.address],
                [
                    {
                        minAssetAmount: 1,
                    },
                ],
            );
        });
    });

    describe('Permit', async () => {
        it('should test permit lend & borrow', async () => {
            const { deployer, eoa1, wethUsdcSingularity, BN } =
                await loadFixture(register);

            const deadline =
                (await ethers.provider.getBlock('latest')).timestamp + 10_000;

            const { v, r, s } = await getSGLPermitSignature(
                'Permit',
                deployer,
                wethUsdcSingularity,
                eoa1.address,
                (1e18).toString(),
                BN(deadline),
            );

            const snapshot = await takeSnapshot();
            await expect(
                wethUsdcSingularity.permit(
                    deployer.address,
                    eoa1.address,
                    (1e18).toString(),
                    deadline,
                    v,
                    r,
                    s,
                ),
            )
                .to.emit(wethUsdcSingularity, 'Approval')
                .withArgs(deployer.address, eoa1.address, (1e18).toString());

            await snapshot.restore();
            await expect(
                wethUsdcSingularity.permitBorrow(
                    deployer.address,
                    eoa1.address,
                    (1e18).toString(),
                    deadline,
                    v,
                    r,
                    s,
                ),
            ).to.be.reverted;

            {
                const deadline =
                    (await ethers.provider.getBlock('latest')).timestamp +
                    10_000;

                const { v, r, s } = await getSGLPermitSignature(
                    'PermitBorrow',
                    deployer,
                    wethUsdcSingularity,
                    eoa1.address,
                    (1e18).toString(),
                    BN(deadline),
                );

                await expect(
                    wethUsdcSingularity.permitBorrow(
                        deployer.address,
                        eoa1.address,
                        (1e18).toString(),
                        deadline,
                        v,
                        r,
                        s,
                    ),
                )
                    .to.emit(wethUsdcSingularity, 'ApprovalBorrow')
                    .withArgs(
                        deployer.address,
                        eoa1.address,
                        (1e18).toString(),
                    );
            }
        });
    });

    describe('usdo SGL', async () => {
        it.skip('should test interest rate', async () => {
            const {
                deployer,
                bar,
                eoa1,
                yieldBox,
                weth,
                wethAssetId,
                mediumRiskMC,
                wethUsdcOracle,
                usdc,
                usd0,
                __wethUsdcPrice,
                deployCurveStableToUsdoBidder,
                timeTravel,
            } = await loadFixture(register);
            //deploy and register USDO

            const usdoStratregy = await bar.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            //Deploy & set Singularity
            const _sglLiquidationModule = await (
                await ethers.getContractFactory('SGLLiquidation')
            ).deploy();
            await _sglLiquidationModule.deployed();
            const _sglBorrow = await (
                await ethers.getContractFactory('SGLBorrow')
            ).deploy();
            await _sglBorrow.deployed();
            const _sglCollateral = await (
                await ethers.getContractFactory('SGLCollateral')
            ).deploy();
            await _sglCollateral.deployed();
            const _sglLeverage = await (
                await ethers.getContractFactory('SGLLeverage')
            ).deploy();
            await _sglLeverage.deployed();

            const collateralSwapPath = [usd0.address, weth.address];

            const newPrice = __wethUsdcPrice.div(1000000);
            await wethUsdcOracle.set(newPrice);

            const data = new ethers.utils.AbiCoder().encode(
                [
                    'address',
                    'address',
                    'address',
                    'address',
                    'address',
                    'address',
                    'uint256',
                    'address',
                    'uint256',
                    'address',
                    'uint256',
                ],
                [
                    _sglLiquidationModule.address,
                    _sglBorrow.address,
                    _sglCollateral.address,
                    _sglLeverage.address,
                    bar.address,
                    usd0.address,
                    usdoAssetId,
                    weth.address,
                    wethAssetId,
                    wethUsdcOracle.address,
                    ethers.utils.parseEther('1'),
                ],
            );
            await bar.registerSingularity(mediumRiskMC.address, data, true);
            const wethUsdoSingularity = await ethers.getContractAt(
                'Singularity',
                await bar.clonesOf(
                    mediumRiskMC.address,
                    (await bar.clonesOfCount(mediumRiskMC.address)).sub(1),
                ),
            );

            //Deploy & set LiquidationQueue
            await usd0.setMinterStatus(wethUsdoSingularity.address, true);
            await usd0.setBurnerStatus(wethUsdoSingularity.address, true);

            const LiquidationQueue = new LiquidationQueue__factory(deployer);
            const liquidationQueue = await LiquidationQueue.deploy();

            const feeCollector = new ethers.Wallet(
                ethers.Wallet.createRandom().privateKey,
                ethers.provider,
            );

            const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
                yieldBox,
                usdc,
                usd0,
            );

            const LQ_META = {
                activationTime: 600, // 10min
                minBidAmount: ethers.BigNumber.from((1e18).toString()).mul(200), // 200 USDC
                closeToMinBidAmount: ethers.BigNumber.from(
                    (1e18).toString(),
                ).mul(202),
                defaultBidAmount: ethers.BigNumber.from((1e18).toString()).mul(
                    400,
                ), // 400 USDC
                feeCollector: feeCollector.address,
                bidExecutionSwapper: ethers.constants.AddressZero,
                usdoSwapper: stableToUsdoBidder.address,
            };
            await liquidationQueue.init(LQ_META, wethUsdoSingularity.address);

            const payload = wethUsdoSingularity.interface.encodeFunctionData(
                'setLiquidationQueueConfig',
                [
                    liquidationQueue.address,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                ],
            );

            await (
                await bar.executeMarketFn(
                    [wethUsdoSingularity.address],
                    [payload],
                    true,
                )
            ).wait();

            //get tokens
            const wethAmount = ethers.BigNumber.from((1e18).toString()).mul(
                100,
            );
            const usdoAmount = ethers.BigNumber.from((1e18).toString()).mul(
                20000,
            );
            await usd0.mint(deployer.address, usdoAmount);
            await weth.connect(eoa1).freeMint(wethAmount);

            //aprove external operators
            await usd0
                .connect(deployer)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await weth
                .connect(deployer)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox
                .connect(deployer)
                .setApprovalForAll(wethUsdoSingularity.address, true);

            await usd0
                .connect(eoa1)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await weth
                .connect(eoa1)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox
                .connect(eoa1)
                .setApprovalForAll(wethUsdoSingularity.address, true);

            // We lend Usdo as deployer
            const usdoLendValue = usdoAmount.div(2);
            const _valShare = await yieldBox.toShare(
                usdoAssetId,
                usdoLendValue,
                false,
            );
            await yieldBox.depositAsset(
                usdoAssetId,
                deployer.address,
                deployer.address,
                0,
                _valShare,
            );
            await wethUsdoSingularity.addAsset(
                deployer.address,
                deployer.address,
                false,
                _valShare,
            );
            expect(
                await wethUsdoSingularity.balanceOf(deployer.address),
            ).to.be.equal(
                await yieldBox.toShare(usdoAssetId, usdoLendValue, false),
            );

            //we lend weth collateral
            const wethDepositAmount = ethers.BigNumber.from(
                (1e18).toString(),
            ).mul(12);
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    wethAssetId,
                    eoa1.address,
                    eoa1.address,
                    wethDepositAmount,
                    0,
                );
            const _wethValShare = await yieldBox
                .connect(eoa1)
                .balanceOf(eoa1.address, wethAssetId);
            await wethUsdoSingularity
                .connect(eoa1)
                .addCollateral(
                    eoa1.address,
                    eoa1.address,
                    false,
                    0,
                    _wethValShare,
                );
            expect(
                await wethUsdoSingularity.userCollateralShare(eoa1.address),
            ).equal(
                await yieldBox.toShare(wethAssetId, wethDepositAmount, false),
            );

            //borrow
            const usdoBorrowVal = ethers.utils.parseEther('8500');

            console.log(
                `usdoBorrowVal ${ethers.utils.formatEther(usdoBorrowVal)}`,
            );
            console.log(
                `lent ${(await wethUsdoSingularity.totalAsset())[0] / 1e26}`,
            );

            await wethUsdoSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal);

            let accrueInfo = await wethUsdoSingularity.accrueInfo();
            console.log(
                `interestPerSecond ${
                    (accrueInfo.interestPerSecond * 60 * 60 * 24 * 365) / 1e16
                }`,
            );

            for (let i = 1; i < 100; i++) {
                console.log(i);
                await timeTravel(7200);
                await wethUsdoSingularity.accrue();
                accrueInfo = await wethUsdoSingularity.accrueInfo();
                console.log(
                    `interestPerSecond ${
                        (accrueInfo.interestPerSecond * 60 * 60 * 24 * 365) /
                        1e16
                    }`,
                );
            }
        });

        it('should create and test wethUsd0 singularity', async () => {
            const {
                deployer,
                bar,
                eoa1,
                yieldBox,
                weth,
                wethAssetId,
                usdcAssetId,
                mediumRiskMC,
                wethUsdcOracle,
                usdc,
                usd0,
                __wethUsdcPrice,
                deployCurveStableToUsdoBidder,
                multiSwapper,
                BN,
                timeTravel,
            } = await loadFixture(register);
            //deploy and register USDO

            const usdoStratregy = await bar.emptyStrategies(usd0.address);
            const usdoAssetId = await yieldBox.ids(
                1,
                usd0.address,
                usdoStratregy,
                0,
            );

            //Deploy & set Singularity
            const _sglLiquidationModule = await (
                await ethers.getContractFactory('SGLLiquidation')
            ).deploy();
            await _sglLiquidationModule.deployed();
            const _sglBorrow = await (
                await ethers.getContractFactory('SGLBorrow')
            ).deploy();
            await _sglBorrow.deployed();
            const _sglCollateral = await (
                await ethers.getContractFactory('SGLCollateral')
            ).deploy();
            await _sglCollateral.deployed();
            const _sglLeverage = await (
                await ethers.getContractFactory('SGLLeverage')
            ).deploy();
            await _sglLeverage.deployed();

            const collateralSwapPath = [usd0.address, weth.address];

            const newPrice = __wethUsdcPrice.div(1000000);
            await wethUsdcOracle.set(newPrice);

            const data = new ethers.utils.AbiCoder().encode(
                [
                    'address',
                    'address',
                    'address',
                    'address',
                    'address',
                    'address',
                    'uint256',
                    'address',
                    'uint256',
                    'address',
                    'uint256',
                ],
                [
                    _sglLiquidationModule.address,
                    _sglBorrow.address,
                    _sglCollateral.address,
                    _sglLeverage.address,
                    bar.address,
                    usd0.address,
                    usdoAssetId,
                    weth.address,
                    wethAssetId,
                    wethUsdcOracle.address,
                    ethers.utils.parseEther('1'),
                ],
            );
            await bar.registerSingularity(mediumRiskMC.address, data, true);
            const wethUsdoSingularity = await ethers.getContractAt(
                'Singularity',
                await bar.clonesOf(
                    mediumRiskMC.address,
                    (await bar.clonesOfCount(mediumRiskMC.address)).sub(1),
                ),
            );

            //Deploy & set LiquidationQueue
            await usd0.setMinterStatus(wethUsdoSingularity.address, true);
            await usd0.setBurnerStatus(wethUsdoSingularity.address, true);

            const LiquidationQueue = new LiquidationQueue__factory(deployer);
            const liquidationQueue = await LiquidationQueue.deploy();

            const feeCollector = new ethers.Wallet(
                ethers.Wallet.createRandom().privateKey,
                ethers.provider,
            );

            const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
                yieldBox,
                usdc,
                usd0,
            );

            const LQ_META = {
                activationTime: 600, // 10min
                minBidAmount: ethers.BigNumber.from((1e18).toString()).mul(200), // 200 USDC
                closeToMinBidAmount: ethers.BigNumber.from(
                    (1e18).toString(),
                ).mul(202),
                defaultBidAmount: ethers.BigNumber.from((1e18).toString()).mul(
                    400,
                ), // 400 USDC
                feeCollector: feeCollector.address,
                bidExecutionSwapper: ethers.constants.AddressZero,
                usdoSwapper: stableToUsdoBidder.address,
            };
            await liquidationQueue.init(LQ_META, wethUsdoSingularity.address);

            const payload = wethUsdoSingularity.interface.encodeFunctionData(
                'setLiquidationQueueConfig',
                [
                    liquidationQueue.address,
                    ethers.constants.AddressZero,
                    ethers.constants.AddressZero,
                ],
            );

            await (
                await bar.executeMarketFn(
                    [wethUsdoSingularity.address],
                    [payload],
                    true,
                )
            ).wait();

            //get tokens
            const wethAmount = ethers.BigNumber.from((1e18).toString()).mul(
                100,
            );
            const usdoAmount = ethers.BigNumber.from((1e18).toString()).mul(
                20000,
            );
            await usd0.mint(deployer.address, usdoAmount);
            await weth.connect(eoa1).freeMint(wethAmount);

            //aprove external operators
            await usd0
                .connect(deployer)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await weth
                .connect(deployer)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox
                .connect(deployer)
                .setApprovalForAll(wethUsdoSingularity.address, true);

            await usd0
                .connect(eoa1)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await weth
                .connect(eoa1)
                .approve(yieldBox.address, ethers.constants.MaxUint256);
            await yieldBox
                .connect(eoa1)
                .setApprovalForAll(wethUsdoSingularity.address, true);

            // We lend Usdo as deployer
            const usdoLendValue = usdoAmount.div(2);
            const _valShare = await yieldBox.toShare(
                usdoAssetId,
                usdoLendValue,
                false,
            );
            await yieldBox.depositAsset(
                usdoAssetId,
                deployer.address,
                deployer.address,
                0,
                _valShare,
            );
            await wethUsdoSingularity.addAsset(
                deployer.address,
                deployer.address,
                false,
                _valShare,
            );
            expect(
                await wethUsdoSingularity.balanceOf(deployer.address),
            ).to.be.equal(
                await yieldBox.toShare(usdoAssetId, usdoLendValue, false),
            );

            //we lend weth collateral
            const wethDepositAmount = ethers.BigNumber.from(
                (1e18).toString(),
            ).mul(1);
            await yieldBox
                .connect(eoa1)
                .depositAsset(
                    wethAssetId,
                    eoa1.address,
                    eoa1.address,
                    wethDepositAmount,
                    0,
                );
            const _wethValShare = await yieldBox
                .connect(eoa1)
                .balanceOf(eoa1.address, wethAssetId);
            await wethUsdoSingularity
                .connect(eoa1)
                .addCollateral(
                    eoa1.address,
                    eoa1.address,
                    false,
                    0,
                    _wethValShare,
                );
            expect(
                await wethUsdoSingularity.userCollateralShare(eoa1.address),
            ).equal(
                await yieldBox.toShare(wethAssetId, wethDepositAmount, false),
            );

            //borrow
            const usdoBorrowVal = wethDepositAmount
                .mul(74)
                .div(100)
                .mul(__wethUsdcPrice.div((1e18).toString()));

            await wethUsdoSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, usdoBorrowVal);
            await yieldBox
                .connect(eoa1)
                .withdraw(
                    usdoAssetId,
                    eoa1.address,
                    eoa1.address,
                    usdoBorrowVal,
                    0,
                );
            const usdoBalanceOfEoa = await usd0.balanceOf(eoa1.address);

            // Can't liquidate
            const swapData = new ethers.utils.AbiCoder().encode(
                ['uint256'],
                [1],
            );
            await expect(
                wethUsdoSingularity.liquidate(
                    [eoa1.address],
                    [usdoBorrowVal],
                    multiSwapper.address,
                    swapData,
                    swapData,
                ),
            ).to.be.reverted;

            const priceDrop = newPrice.mul(2).div(100);
            await wethUsdcOracle.set(newPrice.add(priceDrop));

            const lqAssetId = await liquidationQueue.lqAssetId();
            expect(lqAssetId.eq(usdoAssetId)).to.be.true;

            await usdc.freeMint(
                ethers.BigNumber.from((1e18).toString()).mul(1000),
            );
            await usdc.approve(
                yieldBox.address,
                ethers.BigNumber.from((1e18).toString()).mul(1000),
            );
            await yieldBox.depositAsset(
                usdcAssetId,
                deployer.address,
                deployer.address,
                ethers.BigNumber.from((1e18).toString()).mul(1000),
                0,
            );
            await yieldBox.setApprovalForAll(liquidationQueue.address, true);
            await expect(
                liquidationQueue.bidWithStable(
                    deployer.address,
                    1,
                    usdcAssetId,
                    ethers.BigNumber.from((1e18).toString()).mul(1000),
                    swapData,
                ),
            ).to.emit(liquidationQueue, 'Bid');
            await timeTravel(10_000);
            await expect(
                liquidationQueue.activateBid(deployer.address, 1),
            ).to.emit(liquidationQueue, 'ActivateBid');

            await expect(
                wethUsdoSingularity.liquidate(
                    [eoa1.address],
                    [usdoBorrowVal],
                    multiSwapper.address,
                    swapData,
                    swapData,
                ),
            ).to.not.be.reverted;
        });
    });

    describe('multiHopBuyCollateral()', async () => {
        const deployYieldBox = async (signer: SignerWithAddress) => {
            const uriBuilder = await (
                await ethers.getContractFactory('YieldBoxURIBuilder')
            ).deploy();

            const yieldBox = await (
                await ethers.getContractFactory('YieldBox')
            ).deploy(ethers.constants.AddressZero, uriBuilder.address);
            return { uriBuilder, yieldBox };
        };

        const deployLZEndpointMock = async (
            chainId: number,
            signer: SignerWithAddress,
        ) => {
            const LZEndpointMock = new LZEndpointMock__factory(signer);
            return await LZEndpointMock.deploy(chainId);
        };

        const deployTapiocaWrapper = async (signer: SignerWithAddress) => {
            const TapiocaWrapper = new TapiocaWrapper__factory(signer);
            return await TapiocaWrapper.deploy(signer.address);
        };

        const Tx_deployTapiocaOFT = async (
            lzEndpoint: string,
            isNative: boolean,
            erc20Address: string,
            yieldBoxAddress: string,
            hostChainID: number,
            hostChainNetworkSigner: SignerWithAddress,
        ) => {
            const erc20 = (
                await ethers.getContractAt('IERC20Metadata', erc20Address)
            ).connect(hostChainNetworkSigner);

            const erc20name = await erc20.name();
            const erc20symbol = await erc20.symbol();
            const erc20decimal = await erc20.decimals();

            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore

            const BaseTOFTLeverageModule = new BaseTOFTLeverageModule__factory(
                hostChainNetworkSigner,
            );
            const leverageModule = await BaseTOFTLeverageModule.deploy(
                lzEndpoint,
                erc20Address,
                yieldBoxAddress,
                erc20name,
                erc20symbol,
                erc20decimal,
                hostChainID,
            );

            const BaseTOFTStrategyModule = new BaseTOFTStrategyModule__factory(
                hostChainNetworkSigner,
            );
            const strategyModule = await BaseTOFTStrategyModule.deploy(
                lzEndpoint,
                erc20Address,
                yieldBoxAddress,
                erc20name,
                erc20symbol,
                erc20decimal,
                hostChainID,
            );

            const BaseTOFTMarketModule = new BaseTOFTMarketModule__factory(
                hostChainNetworkSigner,
            );
            const marketModule = await BaseTOFTMarketModule.deploy(
                lzEndpoint,
                erc20Address,
                yieldBoxAddress,
                erc20name,
                erc20symbol,
                erc20decimal,
                hostChainID,
            );

            const BaseTOFTOptionsModule = new BaseTOFTOptionsModule__factory(
                hostChainNetworkSigner,
            );
            const optionsModule = await BaseTOFTOptionsModule.deploy(
                lzEndpoint,
                erc20Address,
                yieldBoxAddress,
                erc20name,
                erc20symbol,
                erc20decimal,
                hostChainID,
            );

            const args: Parameters<TapiocaOFT__factory['deploy']> = [
                lzEndpoint,
                erc20Address,
                yieldBoxAddress,
                erc20name,
                erc20symbol,
                erc20decimal,
                hostChainID,
                leverageModule.address,
                strategyModule.address,
                marketModule.address,
                optionsModule.address,
            ];

            const TapiocaOFT = new TapiocaOFT__factory(hostChainNetworkSigner);
            const txData = TapiocaOFT.getDeployTransaction(...args)
                .data as BytesLike;

            return { txData, args };
        };

        const attachTapiocaOFT = async (
            address: string,
            signer: SignerWithAddress,
        ) => {
            const tapiocaOFT = new ethers.Contract(
                address,
                TapiocaOFTArtifact.abi,
                signer,
            );
            return tapiocaOFT.connect(signer);
        };

        const mintAndApprove = async (
            erc20Mock: ERC20Mock,
            toft: BaseTOFT,
            signer: SignerWithAddress,
            amount: BigNumberish,
        ) => {
            await erc20Mock.freeMint(amount);
            await erc20Mock.approve(toft.address, amount);
        };

        it('should bounce between 2 chains', async () => {
            const {
                deployer,
                tap,
                weth,
                createTokenEmptyStrategy,
                deployCurveStableToUsdoBidder,
                magnetar,
                createWethUsd0Singularity,
                registerBigBangMarket,
                wethUsdcOracle,
            } = await loadFixture(register);

            //Deploy LZEndpointMock
            const LZEndpointMock_chainID_0 = await deployLZEndpointMock(
                0,
                deployer,
            );
            const LZEndpointMock_chainID_10 = await deployLZEndpointMock(
                10,
                deployer,
            );

            //Deploy TapiocaWrapper
            const tapiocaWrapper_0 = await deployTapiocaWrapper(deployer);
            const tapiocaWrapper_10 = await deployTapiocaWrapper(deployer);

            //Deploy YB and Strategies
            const yieldBox0Data = await deployYieldBox(deployer);
            const YieldBox_0 = yieldBox0Data.yieldBox;

            const usdo_0_leverage = await (
                await ethers.getContractFactory('USDOLeverageModule')
            ).deploy(LZEndpointMock_chainID_0.address, YieldBox_0.address);
            const usdo_0_market = await (
                await ethers.getContractFactory('USDOMarketModule')
            ).deploy(LZEndpointMock_chainID_0.address, YieldBox_0.address);
            const usdo_0_options = await (
                await ethers.getContractFactory('USDOOptionsModule')
            ).deploy(LZEndpointMock_chainID_0.address, YieldBox_0.address);

            const USDO_0 = await (
                await ethers.getContractFactory('USDO')
            ).deploy(
                LZEndpointMock_chainID_0.address,
                YieldBox_0.address,
                deployer.address,
                usdo_0_leverage.address,
                usdo_0_market.address,
                usdo_0_options.address,
            );
            await USDO_0.deployed();

            const usdo_10_leverage = await (
                await ethers.getContractFactory('USDOLeverageModule')
            ).deploy(LZEndpointMock_chainID_10.address, YieldBox_0.address);
            const usdo_10_market = await (
                await ethers.getContractFactory('USDOMarketModule')
            ).deploy(LZEndpointMock_chainID_10.address, YieldBox_0.address);
            const usdo_10_options = await (
                await ethers.getContractFactory('USDOOptionsModule')
            ).deploy(LZEndpointMock_chainID_10.address, YieldBox_0.address);
            const USDO_10 = await (
                await ethers.getContractFactory('USDO')
            ).deploy(
                LZEndpointMock_chainID_10.address,
                YieldBox_0.address,
                deployer.address,
                usdo_10_leverage.address,
                usdo_10_market.address,
                usdo_10_options.address,
            );
            await USDO_10.deployed();

            //Deploy Penrose
            const BAR_0 = await (
                await ethers.getContractFactory('Penrose')
            ).deploy(
                YieldBox_0.address,
                tap.address,
                weth.address,
                deployer.address,
            );
            await BAR_0.deployed();
            await BAR_0.setUsdoToken(USDO_0.address);

            //Deploy ERC20Mock
            const ERC20Mock = new ERC20Mock__factory(deployer);
            const erc20Mock = await ERC20Mock.deploy(
                'erc20Mock',
                'MOCK',
                0,
                18,
                deployer.address,
            );
            await erc20Mock.toggleRestrictions();

            // master contract
            const mediumRiskMC_0 = await (
                await ethers.getContractFactory('Singularity')
            ).deploy();
            await mediumRiskMC_0.deployed();
            await BAR_0.registerSingularityMasterContract(
                mediumRiskMC_0.address,
                1,
            );

            const mediumRiskMCBigBang_0 = await (
                await ethers.getContractFactory('BigBang')
            ).deploy();
            await mediumRiskMCBigBang_0.deployed();
            await BAR_0.registerBigBangMasterContract(
                mediumRiskMCBigBang_0.address,
                1,
            );

            //Deploy TapiocaOFT
            {
                const txData =
                    await tapiocaWrapper_0.populateTransaction.createTOFT(
                        erc20Mock.address,
                        (
                            await Tx_deployTapiocaOFT(
                                LZEndpointMock_chainID_0.address,
                                false,
                                erc20Mock.address,
                                YieldBox_0.address,
                                31337,
                                deployer,
                            )
                        ).txData,
                        ethers.utils.randomBytes(32),
                        false,
                    );
                txData.gasLimit = await hre.ethers.provider.estimateGas(txData);
                await deployer.sendTransaction(txData);
            }
            const tapiocaOFT0 = (await attachTapiocaOFT(
                await tapiocaWrapper_0.tapiocaOFTs(
                    (await tapiocaWrapper_0.tapiocaOFTLength()).sub(1),
                ),
                deployer,
            )) as TapiocaOFT;

            {
                const txData =
                    await tapiocaWrapper_10.populateTransaction.createTOFT(
                        erc20Mock.address,
                        (
                            await Tx_deployTapiocaOFT(
                                LZEndpointMock_chainID_10.address,
                                false,
                                erc20Mock.address,
                                YieldBox_0.address,
                                31337,
                                deployer,
                            )
                        ).txData,
                        ethers.utils.randomBytes(32),
                        false,
                    );
                txData.gasLimit = await hre.ethers.provider.estimateGas(txData);
                await deployer.sendTransaction(txData);
            }
            const tapiocaOFT10 = (await attachTapiocaOFT(
                await tapiocaWrapper_10.tapiocaOFTs(
                    (await tapiocaWrapper_10.tapiocaOFTLength()).sub(1),
                ),
                deployer,
            )) as TapiocaOFT;

            //Deploy strategies
            const Strategy_0 = await createTokenEmptyStrategy(
                YieldBox_0.address,
                tapiocaOFT0.address,
            );
            const Strategy_10 = await createTokenEmptyStrategy(
                YieldBox_0.address,
                tapiocaOFT10.address,
            );

            // Set trusted remotes
            const dstChainId0 = await LZEndpointMock_chainID_0.getChainId();
            const dstChainId10 = await LZEndpointMock_chainID_10.getChainId();

            await USDO_0.setTrustedRemote(
                dstChainId10,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [USDO_10.address, USDO_0.address],
                ),
            );
            await USDO_0.setTrustedRemote(
                31337,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [USDO_10.address, USDO_0.address],
                ),
            );

            await USDO_10.setTrustedRemote(
                dstChainId0,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [USDO_0.address, USDO_10.address],
                ),
            );
            await USDO_10.setTrustedRemote(
                31337,
                ethers.utils.solidityPack(
                    ['address', 'address'],
                    [USDO_0.address, USDO_10.address],
                ),
            );

            await tapiocaWrapper_0.executeTOFT(
                tapiocaOFT0.address,
                tapiocaOFT0.interface.encodeFunctionData('setTrustedRemote', [
                    dstChainId10,
                    ethers.utils.solidityPack(
                        ['address', 'address'],
                        [tapiocaOFT10.address, tapiocaOFT0.address],
                    ),
                ]),
                true,
            );

            await tapiocaWrapper_0.executeTOFT(
                tapiocaOFT0.address,
                tapiocaOFT0.interface.encodeFunctionData('setTrustedRemote', [
                    31337,
                    ethers.utils.solidityPack(
                        ['address', 'address'],
                        [tapiocaOFT10.address, tapiocaOFT0.address],
                    ),
                ]),
                true,
            );

            await tapiocaWrapper_10.executeTOFT(
                tapiocaOFT10.address,
                tapiocaOFT10.interface.encodeFunctionData('setTrustedRemote', [
                    dstChainId0,
                    ethers.utils.solidityPack(
                        ['address', 'address'],
                        [tapiocaOFT0.address, tapiocaOFT10.address],
                    ),
                ]),
                true,
            );

            await tapiocaWrapper_10.executeTOFT(
                tapiocaOFT10.address,
                tapiocaOFT10.interface.encodeFunctionData('setTrustedRemote', [
                    dstChainId10,
                    ethers.utils.solidityPack(
                        ['address', 'address'],
                        [tapiocaOFT0.address, tapiocaOFT10.address],
                    ),
                ]),
                true,
            );

            await tapiocaWrapper_10.executeTOFT(
                tapiocaOFT10.address,
                tapiocaOFT10.interface.encodeFunctionData('setTrustedRemote', [
                    31337,
                    ethers.utils.solidityPack(
                        ['address', 'address'],
                        [tapiocaOFT0.address, tapiocaOFT10.address],
                    ),
                ]),
                true,
            );

            // Link endpoints with addresses
            await LZEndpointMock_chainID_0.setDestLzEndpoint(
                tapiocaOFT0.address,
                LZEndpointMock_chainID_10.address,
            );
            await LZEndpointMock_chainID_10.setDestLzEndpoint(
                tapiocaOFT0.address,
                LZEndpointMock_chainID_0.address,
            );
            await LZEndpointMock_chainID_0.setDestLzEndpoint(
                tapiocaOFT0.address,
                LZEndpointMock_chainID_0.address,
            );

            await LZEndpointMock_chainID_10.setDestLzEndpoint(
                tapiocaOFT10.address,
                LZEndpointMock_chainID_10.address,
            );
            await LZEndpointMock_chainID_0.setDestLzEndpoint(
                tapiocaOFT10.address,
                LZEndpointMock_chainID_10.address,
            );
            await LZEndpointMock_chainID_10.setDestLzEndpoint(
                tapiocaOFT10.address,
                LZEndpointMock_chainID_0.address,
            );

            await LZEndpointMock_chainID_0.setDestLzEndpoint(
                USDO_10.address,
                LZEndpointMock_chainID_10.address,
            );
            await LZEndpointMock_chainID_0.setDestLzEndpoint(
                USDO_0.address,
                LZEndpointMock_chainID_10.address,
            );
            await LZEndpointMock_chainID_10.setDestLzEndpoint(
                USDO_0.address,
                LZEndpointMock_chainID_0.address,
            );
            await LZEndpointMock_chainID_10.setDestLzEndpoint(
                USDO_10.address,
                LZEndpointMock_chainID_0.address,
            );

            //Register tokens on YB
            await YieldBox_0.registerAsset(
                1,
                tapiocaOFT0.address,
                Strategy_0.address,
                0,
            );
            await YieldBox_0.registerAsset(
                1,
                tapiocaOFT10.address,
                Strategy_10.address,
                0,
            );

            const tapiocaOFT0Id = await YieldBox_0.ids(
                1,
                tapiocaOFT0.address,
                Strategy_0.address,
                0,
            );
            const tapiocaOFT10Id = await YieldBox_0.ids(
                1,
                tapiocaOFT10.address,
                Strategy_10.address,
                0,
            );
            expect(tapiocaOFT0Id.gt(0)).to.be.true;
            expect(tapiocaOFT10Id.gt(0)).to.be.true;
            expect(tapiocaOFT10Id.gt(tapiocaOFT0Id)).to.be.true;

            const bigDummyAmount = ethers.utils.parseEther('10');
            await mintAndApprove(
                erc20Mock,
                tapiocaOFT0,
                deployer,
                bigDummyAmount,
            );
            await tapiocaOFT0.wrap(
                deployer.address,
                deployer.address,
                bigDummyAmount,
            );

            await tapiocaOFT0.approve(
                YieldBox_0.address,
                ethers.constants.MaxUint256,
            );
            const toDepositShare = await YieldBox_0.toShare(
                tapiocaOFT0Id,
                bigDummyAmount,
                false,
            );
            await YieldBox_0.depositAsset(
                tapiocaOFT0Id,
                deployer.address,
                deployer.address,
                0,
                toDepositShare,
            );

            let yb0Balance = await YieldBox_0.amountOf(
                deployer.address,
                tapiocaOFT0Id,
            );
            expect(yb0Balance.eq(bigDummyAmount)).to.be.true; //bc of the yield
            const { stableToUsdoBidder, curveSwapper } =
                await deployCurveStableToUsdoBidder(
                    YieldBox_0,
                    tapiocaOFT0,
                    USDO_0,
                    false,
                );
            let sglMarketData = await createWethUsd0Singularity(
                USDO_0,
                tapiocaOFT0,
                BAR_0,
                await BAR_0.usdoAssetId(),
                tapiocaOFT0Id,
                mediumRiskMC_0,
                YieldBox_0,
                stableToUsdoBidder,
                0,
            );
            const SGL_0 = sglMarketData.wethUsdoSingularity;

            sglMarketData = await createWethUsd0Singularity(
                USDO_0,
                tapiocaOFT10,
                BAR_0,
                await BAR_0.usdoAssetId(),
                tapiocaOFT10Id,
                mediumRiskMC_0,
                YieldBox_0,
                stableToUsdoBidder,
                0,
            );
            const SGL_10 = sglMarketData.wethUsdoSingularity;

            await tapiocaOFT0.approve(
                SGL_0.address,
                ethers.constants.MaxUint256,
            );
            await YieldBox_0.setApprovalForAll(SGL_0.address, true);
            await SGL_0.addCollateral(
                deployer.address,
                deployer.address,
                false,
                bigDummyAmount,
                0,
            );
            const collateralShare = await SGL_0.userCollateralShare(
                deployer.address,
            );
            expect(collateralShare.gt(0)).to.be.true;

            const collateralAmount = await YieldBox_0.toAmount(
                tapiocaOFT0Id,
                collateralShare,
                false,
            );
            expect(collateralAmount.eq(bigDummyAmount)).to.be.true;

            //test wrap
            await mintAndApprove(
                erc20Mock,
                tapiocaOFT10,
                deployer,
                bigDummyAmount,
            );
            await tapiocaOFT10.wrap(
                deployer.address,
                deployer.address,
                bigDummyAmount,
            );
            const tapioca10Balance = await tapiocaOFT10.balanceOf(
                deployer.address,
            );
            expect(tapioca10Balance.eq(bigDummyAmount)).to.be.true;

            await tapiocaOFT10.approve(
                YieldBox_0.address,
                ethers.constants.MaxUint256,
            );
            await YieldBox_0.depositAsset(
                tapiocaOFT10Id,
                deployer.address,
                deployer.address,
                0,
                toDepositShare,
            );

            yb0Balance = await YieldBox_0.amountOf(
                deployer.address,
                tapiocaOFT10Id,
            );
            expect(yb0Balance.eq(bigDummyAmount)).to.be.true; //bc of the yield

            await tapiocaOFT10.approve(
                SGL_10.address,
                ethers.constants.MaxUint256,
            );
            await YieldBox_0.setApprovalForAll(SGL_10.address, true);
            await SGL_10.addCollateral(
                deployer.address,
                deployer.address,
                false,
                bigDummyAmount,
                0,
            );

            const sgl10CollateralShare = await SGL_10.userCollateralShare(
                deployer.address,
            );
            expect(sgl10CollateralShare.eq(collateralShare)).to.be.true;
            const UniswapV3SwapperMock = new UniswapV3SwapperMock__factory(
                deployer,
            );
            const uniV3SwapperMock = await UniswapV3SwapperMock.deploy(
                ethers.constants.AddressZero,
            );

            //lend some USD0 to SGL_10
            const oraclePrice = BN(1).mul((1e18).toString());
            const OracleMock = new OracleMock__factory(deployer);
            const oracleMock = await OracleMock.deploy(
                'WETHMOracle',
                'WETHMOracle',
                (1e18).toString(),
            );
            await wethUsdcOracle.deployed();
            await wethUsdcOracle.set(oraclePrice);

            const { bigBangMarket } = await registerBigBangMarket(
                mediumRiskMCBigBang_0.address,
                YieldBox_0,
                BAR_0,
                weth,
                await BAR_0.wethAssetId(),
                oracleMock,
                0,
                0,
                0,
                0,
                0,
            );
            await weth.freeMint(bigDummyAmount.mul(5));
            await weth.approve(
                bigBangMarket.address,
                ethers.constants.MaxUint256,
            );
            await weth.approve(YieldBox_0.address, ethers.constants.MaxUint256);
            await YieldBox_0.setApprovalForAll(bigBangMarket.address, true);
            await YieldBox_0.depositAsset(
                await BAR_0.wethAssetId(),
                deployer.address,
                deployer.address,
                bigDummyAmount.mul(5),
                0,
            );
            await bigBangMarket.addCollateral(
                deployer.address,
                deployer.address,
                false,
                bigDummyAmount.mul(5),
                0,
            );
            const bigBangCollateralShare =
                await bigBangMarket.userCollateralShare(deployer.address);
            expect(bigBangCollateralShare.gt(0)).to.be.true;

            const collateralIdSaved = await bigBangMarket.collateralId();
            const wethId = await BAR_0.wethAssetId();
            expect(collateralIdSaved.eq(wethId)).to.be.true;

            await USDO_0.setMinterStatus(bigBangMarket.address, true);
            await bigBangMarket.borrow(
                deployer.address,
                deployer.address,
                bigDummyAmount.mul(3),
            );

            const usdoBorrowPart = await bigBangMarket.userBorrowPart(
                deployer.address,
            );
            expect(usdoBorrowPart.gt(0)).to.be.true;

            await YieldBox_0.withdraw(
                await bigBangMarket.assetId(),
                deployer.address,
                deployer.address,
                bigDummyAmount.mul(3),
                0,
            );
            const usdoBalance = await USDO_0.balanceOf(deployer.address);
            expect(usdoBalance.gt(0)).to.be.true;

            const usdoBalanceShare = await YieldBox_0.toShare(
                await bigBangMarket.assetId(),
                usdoBalance.div(2),
                false,
            );
            await USDO_0.approve(
                YieldBox_0.address,
                ethers.constants.MaxUint256,
            );
            await YieldBox_0.depositAsset(
                await bigBangMarket.assetId(),
                deployer.address,
                deployer.address,
                usdoBalance.div(2),
                0,
            );
            await SGL_10.addAsset(
                deployer.address,
                deployer.address,
                false,
                usdoBalanceShare,
            );
            const totalSGL10Asset = await SGL_10.totalAsset();
            expect(totalSGL10Asset[0].gt(0)).to.be.true;

            let airdropAdapterParamsDst = hre.ethers.utils.solidityPack(
                ['uint16', 'uint', 'uint', 'address'],
                [
                    2,
                    1_000_000, //extra gas limit; min 200k
                    ethers.utils.parseEther('2'), //amount of eth to airdrop
                    USDO_10.address,
                ],
            );

            const airdropAdapterParamsSrc = hre.ethers.utils.solidityPack(
                ['uint16', 'uint', 'uint', 'address'],
                [
                    2,
                    1_000_000, //extra gas limit; min 200k
                    ethers.utils.parseEther('1'), //amount of eth to airdrop
                    magnetar.address,
                ],
            );

            const sgl10Asset = await SGL_10.asset();
            expect(sgl10Asset).to.eq(USDO_0.address);

            const userCollateralShareBefore = await SGL_0.userCollateralShare(
                deployer.address,
            );
            expect(userCollateralShareBefore.eq(bigDummyAmount.mul(1e8))).to.be
                .true;

            const borrowPartBefore = await SGL_10.userBorrowPart(
                deployer.address,
            );
            expect(borrowPartBefore.eq(0)).to.be.true;

            await BAR_0.setSwapper(uniV3SwapperMock.address, true);

            await SGL_0.approve(
                tapiocaOFT0.address,
                ethers.constants.MaxUint256,
            );
            await SGL_0.approveBorrow(
                tapiocaOFT0.address,
                ethers.constants.MaxUint256,
            );

            await SGL_10.multiHopBuyCollateral(
                deployer.address,
                0,
                bigDummyAmount,
                {
                    tokenOut: await tapiocaOFT10.erc20(),
                    amountOutMin: 0,
                    data: ethers.utils.toUtf8Bytes(''),
                },
                {
                    srcExtraGasLimit: 1_000_000,
                    lzSrcChainId: 0,
                    lzDstChainId: 10,
                    zroPaymentAddress: ethers.constants.AddressZero,
                    dstAirdropAdapterParam: airdropAdapterParamsDst,
                    srcAirdropAdapterParam: airdropAdapterParamsSrc,
                    refundAddress: deployer.address,
                },
                {
                    swapper: uniV3SwapperMock.address,
                    magnetar: magnetar.address,
                    tOft: tapiocaOFT10.address,
                    srcMarket: SGL_0.address, //there should be SGL_10 here in a normal situation; however, due to the current setup and how tokens are linked together, it will point to SGL_0
                },
                {
                    value: ethers.utils.parseEther('10'),
                },
            );
            const userCollateralShareAfter = await SGL_0.userCollateralShare(
                deployer.address,
            );

            expect(userCollateralShareAfter.gt(userCollateralShareBefore)).to.be
                .true;
            const userCollateralAmount = await YieldBox_0.toAmount(
                tapiocaOFT10Id,
                userCollateralShareAfter,
                false,
            );
            expect(userCollateralAmount.eq(bigDummyAmount.mul(2))).to.be.true;
            const borrowPartAfter = await SGL_10.userBorrowPart(
                deployer.address,
            );
            expect(borrowPartAfter.gt(bigDummyAmount)).to.be.true;

            //fill in swapper with some USD0

            airdropAdapterParamsDst = hre.ethers.utils.solidityPack(
                ['uint16', 'uint', 'uint', 'address'],
                [
                    2,
                    1_000_000, //extra gas limit; min 200k
                    ethers.utils.parseEther('2'), //amount of eth to airdrop
                    tapiocaOFT10.address,
                ],
            );

            await SGL_0.approve(USDO_0.address, ethers.constants.MaxUint256);

            const forDeposit = await USDO_0.balanceOf(deployer.address);
            await YieldBox_0.depositAsset(
                await SGL_0.assetId(),
                deployer.address,
                deployer.address,
                forDeposit,
                0,
            );

            await SGL_0.addAsset(
                deployer.address,
                deployer.address,
                false,
                await YieldBox_0.toShare(
                    await SGL_0.assetId(),
                    forDeposit,
                    false,
                ),
            );

            // const airdropAdapterParams = hre.ethers.utils.solidityPack(
            //     ['uint16', 'uint', 'uint', 'address'],
            //     [
            //         2, //it needs to be 2
            //         1_000_000, //extra gas limit; min 200k
            //         ethers.utils.parseEther('1'), //amount of eth to airdrop
            //         USDO_0.address,
            //     ],
            // );

            // hre.tracer.enabled = true;
            // await YieldBox_0.setApprovalForAll(magnetar.address, true);
            // const lent = await SGL_0.balanceOf(deployer.address);
            // await USDO_10.removeAsset(
            //     deployer.address,
            //     deployer.address,
            //     0,
            //     {
            //         withdraw: true,
            //         withdrawLzFeeAmount: ethers.utils.parseEther('1'),
            //         withdrawOnOtherChain: true,
            //         withdrawLzChainId: 10,
            //         withdrawAdapterParams: hre.ethers.utils.solidityPack(
            //             ['uint16', 'uint256'],
            //             [1, 200000],
            //         ),
            //     },
            //     {
            //         extraGasLimit: 1_000_000,
            //         zroPaymentAddress: ethers.constants.AddressZero,
            //     },
            //     {
            //         market: SGL_0.address,
            //         marketHelper: magnetar.address,
            //         share: bigDummyAmount.div(10).mul(1e8),
            //     },
            //     [],
            //     airdropAdapterParams,
            //     {
            //         value: ethers.utils.parseEther('2'),
            //     },
            // );
            // hre.tracer.enabled = false;
            // return;

            //bc of the actual setup we need to simulate an existing position
            await SGL_0.borrow(
                deployer.address,
                deployer.address,
                bigDummyAmount,
            );

            const borroPartBeforeLeverageDown = await SGL_0.userBorrowPart(
                deployer.address,
            );
            const collateralShareBeforeLeverageDown =
                await SGL_0.userCollateralShare(deployer.address);
            await SGL_0.multiHopSellCollateral(
                deployer.address,
                userCollateralShareAfter.div(4),
                {
                    tokenOut: USDO_10.address,
                    amountOutMin: 0,
                    data: new ethers.utils.AbiCoder().encode(['bool'], [true]),
                },
                {
                    srcExtraGasLimit: 1_000_000,
                    lzSrcChainId: 0,
                    lzDstChainId: 10,
                    zroPaymentAddress: ethers.constants.AddressZero,
                    dstAirdropAdapterParam: airdropAdapterParamsDst,
                    srcAirdropAdapterParam: airdropAdapterParamsSrc,
                    refundAddress: deployer.address,
                },
                {
                    swapper: uniV3SwapperMock.address,
                    magnetar: magnetar.address,
                    tOft: tapiocaOFT10.address,
                    srcMarket: SGL_0.address,
                },
                {
                    value: ethers.utils.parseEther('10'),
                },
            );
            const borroPartAfterLeverageDown = await SGL_0.userBorrowPart(
                deployer.address,
            );
            const collateralShareAfterLeverageDown =
                await SGL_0.userCollateralShare(deployer.address);

            expect(borroPartAfterLeverageDown.lt(borroPartBeforeLeverageDown))
                .to.be.true;
            expect(
                collateralShareAfterLeverageDown.lt(
                    collateralShareBeforeLeverageDown,
                ),
            ).to.be.true;
        });
    });
});
