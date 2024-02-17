import hre, { ethers } from 'hardhat';
import { BigNumberish, BytesLike, Wallet } from 'ethers';
import { expect } from 'chai';
import {
    BN,
    getSGLPermitSignature,
    performMarketHelperCall,
    register,
} from './test.utils';
import {
    loadFixture,
    takeSnapshot,
} from '@nomicfoundation/hardhat-network-helpers';
import {
    LiquidationQueue__factory,
    Cluster__factory,
} from '@tapioca-sdk/typechain/tapioca-periphery';
import {
    ERC20Mock,
    ERC20Mock__factory,
    LZEndpointMock__factory,
    OracleMock__factory,
    UniswapV3SwapperMock__factory,
} from '@tapioca-sdk/typechain/tapioca-mocks';
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
} from '@tapioca-sdk/typechain/tapiocaz';
import TapiocaOFTArtifact from '@tapioca-sdk/artifacts/tapiocaz/TapiocaOFT.json';

describe('Singularity test', () => {
    describe('test', () => {
        it.skip('should compute the right closing factor', async () => {
            const {
                wethUsdcSingularity,
                wbtcBigBangMarket,
                deployer,
                penrose,
            } = await loadFixture(register);

            // const borrowFeeUpdateFn =
            //     wethUsdcSingularity.interface.encodeFunctionData(
            //         'setMarketConfig',
            //         [
            //             5e2,
            //             ethers.constants.AddressZero,
            //             ethers.utils.toUtf8Bytes(''),
            //             ethers.constants.AddressZero,
            //             0,
            //             0,
            //             0,
            //             0,
            //             0,
            //             0,
            //             80000,
            //         ],
            //     );
            // await penrose.executeMarketFn(
            //     [wethUsdcSingularity.address],
            //     [borrowFeeUpdateFn],
            //     true,
            // );

            let x = await wethUsdcSingularity.computeClosingFactor(
                ethers.utils.parseEther('7600'),
                ethers.utils.parseEther('10000'),
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
                5,
            );
            console.log(
                `Borrow part: 8000 with 18 decimals, collateral part: 10000 with 18 decimals, closing factor without bonus: ${ethers.utils.formatEther(
                    x,
                )}`,
            );

            x = await wethUsdcSingularity.computeClosingFactor(
                ethers.utils.parseEther('4000'),
                ethers.utils.parseEther('5000'),
                5,
            );
            console.log(
                `Borrow part: 4000 with 18 decimals, collateral part: 5000 with 18 decimals, closing factor without bonus: ${ethers.utils.formatEther(
                    x,
                )}`,
            );
        });
    });
    describe('setters', () => {
        it('should be able to set mutable properties', async () => {
            const {
                wethUsdcSingularity,
                wbtcBigBangMarket,
                deployer,
                penrose,
            } = await loadFixture(register);

            const toSetAddress = deployer.address;
            const toSetValue = 101;
            const toSetMaxValue = 102;

            //common properties
            let borrowingOpeningFee =
                await wethUsdcSingularity.borrowOpeningFee();
            let oracle = await wethUsdcSingularity.oracle();
            let oracleData = await wethUsdcSingularity.oracleData();
            let conservator = await wethUsdcSingularity.conservator();
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
                'setSingularityConfig',
                [0, 0, 0, 0, 0, 0, 0, 0],
            );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [payload],
                false,
            );
            expect(oracle).to.eq(await wethUsdcSingularity.oracle());
            expect(conservator).to.eq(await wethUsdcSingularity.conservator());
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
                    toSetAddress,
                    ethers.utils.toUtf8Bytes(''),
                    toSetAddress,
                    toSetValue,
                    toSetValue,
                    toSetValue,
                    toSetMaxValue,
                    toSetValue,
                    toSetValue,
                    toSetMaxValue,
                ],
            );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [payload],
                true,
            );

            borrowingOpeningFee = await wethUsdcSingularity.borrowOpeningFee();
            oracle = await wethUsdcSingularity.oracle();
            oracleData = await wethUsdcSingularity.oracleData();
            conservator = await wethUsdcSingularity.conservator();
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

            expect(oracle).to.eq(toSetAddress);
            expect(conservator).to.eq(toSetAddress);
            expect(protocolFee).to.eq(toSetValue);
            expect(liquidationBonusAmount).to.eq(toSetValue);
            expect(minLiquidatorReward).to.eq(toSetValue);
            expect(maxLiquidatorReward).to.eq(toSetMaxValue);
            expect(totalBorrowCap).to.eq(toSetValue);
            expect(collateralizationRate).to.eq(toSetValue);

            await penrose.setBigBangEthMarket(deployer.address);

            let minDebtRate = await wbtcBigBangMarket.minDebtRate();
            let maxDebtRate = await wbtcBigBangMarket.maxDebtRate();
            let debtRateAgainstEthMarket =
                await wbtcBigBangMarket.debtRateAgainstEthMarket();

            payload = wbtcBigBangMarket.interface.encodeFunctionData(
                'setBigBangConfig',
                [0, 0, 0, 0],
            );
            await penrose.executeMarketFn(
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
            await penrose.executeMarketFn(
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
                [0, 0, 0, 0, 0, 0, 0, 0],
            );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [payload],
                false,
            );
            borrowingOpeningFee = await wethUsdcSingularity.borrowOpeningFee();
            expect(borrowingOpeningFee).to.eq(0);
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
                    toSetValue,
                    toSetMaxValue,
                    toSetValue,
                    toSetMaxValue,
                    toSetValue,
                ],
            );
            await penrose.executeMarketFn(
                [wethUsdcSingularity.address],
                [payload],
                false,
            );

            borrowingOpeningFee = await wethUsdcSingularity.borrowOpeningFee();
            expect(borrowingOpeningFee).to.eq(toSetValue);
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

            await expect(wethUsdcSingularity.init(ethers.utils.toUtf8Bytes('')))
                .to.be.reverted;
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
            ).to.be.reverted;
        });

        it('actions should not work when the contract is paused', async () => {
            const {
                deployer,
                penrose,
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
                [wethUsdcSingularity.address],
                [setConservatorData],
                true,
            );

            const wethAmount = BN(1e18).mul(1);
            const usdcAmount = wethAmount
                .mul(__wethUsdcPrice.mul(2))
                .div((1e18).toString());

            await wethUsdcSingularity.updatePause(2, true, true);

            await usdc.freeMint(usdcAmount);
            await timeTravel(86500);
            await approveTokensAndSetBarApproval();
            await expect(usdcDepositAndAddCollateral(usdcAmount)).to.be
                .reverted;

            await wethUsdcSingularity.updatePause(2, false, true);

            await usdc.freeMint(usdcAmount);
            await approveTokensAndSetBarApproval();
            await usdcDepositAndAddCollateral(usdcAmount);

            await wethUsdcSingularity.updatePause(7, true, true);

            await approveTokensAndSetBarApproval(eoa1);
            await weth.connect(eoa1).freeMint(wethAmount);
            await timeTravel(86500);
            await expect(wethDepositAndAddAsset(wethAmount, eoa1)).to.be
                .reverted;

            const accrueInfoBefore = await wethUsdcSingularity.accrueInfo();
            await wethUsdcSingularity.updatePause(7, false, true);
            const accrueInfoAfter = await wethUsdcSingularity.accrueInfo();
            expect(accrueInfoAfter[1]).not.eq(accrueInfoBefore[1]);

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
                penrose,
                yieldBox,
                wethAssetId,
                usdcAssetId,
                wethUsdcOracle,
                mediumRiskMC,
                deployer,
                marketHelper,
            } = await loadFixture(register);

            const modulesData = {
                _liquidationModule: ethers.constants.AddressZero,
                _borrowModule: ethers.constants.AddressZero,
                _collateralModule: ethers.constants.AddressZero,
                _leverageModule: ethers.constants.AddressZero,
            };

            const tokensData = {
                _asset: weth.address,
                _assetId: wethAssetId,
                _collateral: usdc.address,
                _collateralId: usdcAssetId,
            };
            const data = {
                penrose_: penrose.address,
                _oracle: wethUsdcOracle.address,
                _exchangeRatePrecision: ethers.utils.parseEther('1'),
                _collateralizationRate: 0,
                _liquidationCollateralizationRate: 0,
                _leverageExecutor: ethers.constants.AddressZero,
            };

            const sglData = new ethers.utils.AbiCoder().encode(
                [
                    'tuple(address _liquidationModule, address _borrowModule, address _collateralModule, address _leverageModule)',
                    'tuple(address _asset, uint256 _assetId, address _collateral, uint256 _collateralId)',
                    'tuple(address penrose_, address _oracle, uint256 _exchangeRatePrecision, uint256 _collateralizationRate, uint256 _liquidationCollateralizationRate, address _leverageExecutor)',
                ],
                [modulesData, tokensData, data],
            );
            await (
                await penrose.registerSingularity(
                    mediumRiskMC.address,
                    sglData,
                    true,
                )
            ).wait();
            const wethUsdcSingularity = await ethers.getContractAt(
                'Singularity',
                await penrose.clonesOf(
                    mediumRiskMC.address,
                    (await penrose.clonesOfCount(mediumRiskMC.address)).sub(1),
                ),
            );

            expect(wethUsdcSingularity.address).to.not.eq(
                ethers.constants.AddressZero,
            );

            const calldata = await marketHelper.borrow(
                wethUsdcSingularity.address,
                deployer.address,
                deployer.address,
                1,
            );
            await expect(
                wethUsdcSingularity
                    .connect(deployer)
                    .execute(calldata.modules, calldata.calls, true),
            ).to.be.reverted;
        });

        it('should not allow initialization with bad arguments', async () => {
            const {
                penrose,
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
                    'uint256',
                ],
                [
                    _sglLiquidationModule.address,
                    _sglBorrowModule.address,
                    _sglCollateralModule.address,
                    _sglLeverageModule.address,
                    penrose.address,
                    ethers.constants.AddressZero,
                    0,
                    ethers.constants.AddressZero,
                    0,
                    wethUsdcOracle.address,
                    [],
                    [],
                    ethers.utils.parseEther('1'),
                    0,
                ],
            );

            await expect(
                penrose.registerSingularity(mediumRiskMC.address, data, true),
            ).to.be.reverted;
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
                marketHelper,
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

            const addCollateralCalldata = await marketHelper.addCollateral(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                false,
                0,
                usdcMintValShare,
            );
            const borrowCalldata = await marketHelper.borrow(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                wethBorrowVal,
            );
            await expect(
                wethUsdcSingularity
                    .connect(eoa1)
                    .execute(
                        [
                            addCollateralCalldata.modules[0],
                            borrowCalldata.modules[0],
                        ],
                        [
                            addCollateralCalldata.calls[0],
                            borrowCalldata.calls[0],
                        ],
                        true,
                    ),
            ).to.be.reverted;
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
                marketHelper,
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

            const addCollateralCalldata = await marketHelper.addCollateral(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                false,
                0,
                usdcMintValShare,
            );

            const borrowCalldata = await marketHelper.borrow(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                wethBorrowVal,
            );

            const data = await wethUsdcSingularity
                .connect(eoa1)
                .callStatic.execute(
                    [
                        addCollateralCalldata.modules[0],
                        borrowCalldata.modules[0],
                    ],
                    [addCollateralCalldata.calls[0], borrowCalldata.calls[0]],
                    false,
                );

            expect(data.successes[0]).to.be.true;
            expect(data.successes[1]).to.be.false; //can't borrow as there are no lenders

            expect(data.results[0]).to.eq('Market: no return data');
            expect(data.results[1]).to.eq('Market: no return data');

            await expect(
                wethUsdcSingularity
                    .connect(eoa1)
                    .execute(
                        [
                            addCollateralCalldata.modules[0],
                            borrowCalldata.modules[0],
                        ],
                        [
                            addCollateralCalldata.calls[0],
                            borrowCalldata.calls[0],
                        ],
                        false,
                    ),
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
                penrose,
                wethUsdcOracle,
                __wethUsdcPrice,
                deployLiquidationReceiverMock,
                timeTravel,
                cluster,
                marketHelper,
            } = await loadFixture(register);

            const liquidationReceiver = await deployLiquidationReceiverMock(
                await wethUsdcSingularity.asset(),
            );

            await cluster.updateContract(0, deployer.address, true);
            await cluster.updateContract(31337, deployer.address, true);

            const assetId = await wethUsdcSingularity.assetId();
            const collateralId = await wethUsdcSingularity.collateralId();
            const wethMintVal = ethers.BigNumber.from((1e18).toString()).mul(
                10,
            );
            const usdcMintVal = wethMintVal.mul(
                __wethUsdcPrice.div((1e18).toString()),
            );

            const liquidateData = new ethers.utils.AbiCoder().encode(
                ['uint256'],
                [wethMintVal],
            );
            // We get asset
            await weth.freeMint(wethMintVal);
            await timeTravel(86401);
            await weth.freeMint(wethMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            await weth.transfer(liquidationReceiver.address, wethMintVal);

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

            const borrowCalldata = await marketHelper.borrow(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                wethBorrowVal,
            );
            await wethUsdcSingularity
                .connect(eoa1)
                .execute(borrowCalldata.modules, borrowCalldata.calls, true);

            await yieldBox
                .connect(eoa1)
                .withdraw(
                    assetId,
                    eoa1.address,
                    eoa1.address,
                    wethBorrowVal,
                    0,
                );

            const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);

            let priceDrop = __wethUsdcPrice.mul(2).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();

            const penroseLiquidateBadDebtCalldata =
                await marketHelper.liquidateBadDebt(
                    wethUsdcSingularity.address,
                    eoa1.address,
                    deployer.address,
                    deployer.address,
                    liquidationReceiver.address,
                    data,
                    true,
                );
            const penroseMarketCalldata =
                wethUsdcSingularity.interface.encodeFunctionData('execute', [
                    penroseLiquidateBadDebtCalldata.modules,
                    penroseLiquidateBadDebtCalldata.calls,
                    true,
                ]);

            await expect(
                penrose.executeMarketFn(
                    [wethUsdcSingularity.address],
                    [penroseMarketCalldata],
                    true,
                ),
            ).to.be.reverted;

            priceDrop = __wethUsdcPrice.mul(200).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();

            const liquidateCalldata = await marketHelper.liquidate(
                wethUsdcSingularity.address,
                [eoa1.address],
                [wethBorrowVal],
                [0],
                [liquidationReceiver.address],
                [liquidateData],
            );
            await expect(
                wethUsdcSingularity.execute(
                    liquidateCalldata.modules,
                    liquidateCalldata.calls,
                    true,
                ),
            ).to.be.reverted;

            const liquidateBadDebtCalldata =
                await marketHelper.liquidateBadDebt(
                    wethUsdcSingularity.address,
                    eoa1.address,
                    deployer.address,
                    deployer.address,
                    liquidationReceiver.address,
                    liquidateData,
                    true,
                );
            await expect(
                wethUsdcSingularity.execute(
                    liquidateBadDebtCalldata.modules,
                    liquidateBadDebtCalldata.calls,
                    true,
                ),
            ).to.be.reverted;

            await weth.approve(
                wethUsdcSingularity.address,
                wethBorrowVal.mul(2),
            );
            await usdc.approve(
                wethUsdcSingularity.address,
                wethBorrowVal.mul(2),
            );

            await weth.toggleRestrictions();
            await usdc.toggleRestrictions();
            await weth.freeMint(wethBorrowVal.mul(2));
            await usdc.freeMint(wethBorrowVal.mul(2));
            await expect(
                penrose.executeMarketFn(
                    [wethUsdcSingularity.address],
                    [penroseMarketCalldata],
                    true,
                ),
            ).to.not.be.reverted;

            const userBorrowedAmountAfter =
                await wethUsdcSingularity.userBorrowPart(eoa1.address);
            const userCollateralShareAfter =
                await wethUsdcSingularity.userBorrowPart(eoa1.address);

            expect(userBorrowedAmountAfter.eq(0)).to.be.true;
            expect(userCollateralShareAfter.eq(0)).to.be.true;
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
                wethUsdcSingularity,
                multiSwapper,
                wethUsdcOracle,
                __wethUsdcPrice,
                deployLiquidationReceiverMock,
                timeTravel,
                marketHelper,
            } = await loadFixture(register);

            const liquidationReceiver = await deployLiquidationReceiverMock(
                await wethUsdcSingularity.asset(),
            );

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
            await timeTravel(86401);
            await weth.freeMint(wethMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            await weth.transfer(liquidationReceiver.address, wethMintVal);

            const liquidateData = new ethers.utils.AbiCoder().encode(
                ['uint256'],
                [wethMintVal],
            );

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

            const borrowCalldata = await marketHelper.borrow(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                wethBorrowVal,
            );

            await wethUsdcSingularity
                .connect(eoa1)
                .execute(borrowCalldata.modules, borrowCalldata.calls, true);
            await yieldBox
                .connect(eoa1)
                .withdraw(
                    assetId,
                    eoa1.address,
                    eoa1.address,
                    wethBorrowVal,
                    0,
                );

            // Can't liquidate
            const liquidateCalldata = await marketHelper.liquidate(
                wethUsdcSingularity.address,
                [eoa1.address],
                [wethBorrowVal],
                [0],
                [liquidationReceiver.address],
                [liquidateData],
            );
            await expect(
                wethUsdcSingularity.execute(
                    liquidateCalldata.modules,
                    liquidateCalldata.calls,
                    true,
                ),
            ).to.be.reverted;

            // Can be liquidated price drop (USDC/WETH)
            const priceDrop = __wethUsdcPrice.mul(10).div(100);
            await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));
            await wethUsdcSingularity.updateExchangeRate();

            const exchangeRate = await wethUsdcSingularity.exchangeRate();
            const collateralShareInAmount = await yieldBox.toAmount(
                await wethUsdcSingularity.collateralId(),
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
                false,
            );
            const collateralPartInAsset = ethers.utils.parseEther(
                collateralShareInAmount.div(exchangeRate).toNumber().toString(),
            );

            const maxLiquidatable =
                await wethUsdcSingularity.computeClosingFactor(
                    await wethUsdcSingularity.userBorrowPart(eoa1.address),
                    collateralPartInAsset,
                    5,
                );
            const userBorrowedAmountBefore =
                await wethUsdcSingularity.userBorrowPart(eoa1.address);

            const viewUsedCollateral =
                await marketHelper.getLiquidationCollateralAmount(
                    wethUsdcSingularity.address,
                    eoa1.address,
                    wethBorrowVal,
                    0,
                    1e18,
                    1e5,
                );

            const liquidateCalldata2 = await marketHelper.liquidate(
                wethUsdcSingularity.address,
                [eoa1.address],
                [wethBorrowVal],
                [0],
                [liquidationReceiver.address],
                [liquidateData],
            );

            await expect(
                wethUsdcSingularity.execute(
                    liquidateCalldata2.modules,
                    liquidateCalldata2.calls,
                    true,
                ),
            ).to.not.be.reverted;

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
                deployLiquidationReceiverMock,
                timeTravel,
                marketHelper,
            } = await loadFixture(register);

            const liquidationReceiver = await deployLiquidationReceiverMock(
                await wbtcUsdcSingularity.asset(),
            );

            const assetId = await wbtcUsdcSingularity.assetId();
            const collateralId = await wbtcUsdcSingularity.collateralId();
            const wbtcMintVal = ethers.BigNumber.from((1e8).toString()).mul(1);
            const usdcMintVal = wbtcMintVal
                .mul(1e10)
                .mul(__wbtcUsdcPrice.div((1e18).toString()));

            // We get asset
            await wbtc.freeMint(wbtcMintVal);
            await timeTravel(86401);
            await wbtc.freeMint(wbtcMintVal);
            await usdc.connect(eoa1).freeMint(usdcMintVal);

            await wbtc.transfer(liquidationReceiver.address, wbtcMintVal);

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
            const wbtcBorrowVal = wbtcMintVal.mul(74).div(100);

            const borrowCalldata = await marketHelper.borrow(
                wbtcUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                wbtcBorrowVal,
            );

            await wbtcUsdcSingularity
                .connect(eoa1)
                .execute(borrowCalldata.modules, borrowCalldata.calls, true);
            await yieldBox
                .connect(eoa1)
                .withdraw(
                    assetId,
                    eoa1.address,
                    eoa1.address,
                    wbtcBorrowVal,
                    0,
                );

            const liquidateData = new ethers.utils.AbiCoder().encode(
                ['uint256'],
                [wbtcBorrowVal],
            );
            // Can't liquidate
            const liquidateCalldata = await marketHelper.liquidate(
                wbtcUsdcSingularity.address,
                [eoa1.address],
                [wbtcBorrowVal],
                [0],
                [liquidationReceiver.address],
                [liquidateData],
            );
            await expect(
                wbtcUsdcSingularity.execute(
                    liquidateCalldata.modules,
                    liquidateCalldata.calls,
                    true,
                ),
            ).to.be.reverted;

            // Can be liquidated price drop (USDC/WETH)
            const priceDrop = __wbtcUsdcPrice.mul(55).div(100);
            await wbtcUsdcOracle.set(__wbtcUsdcPrice.add(priceDrop));

            const liquidateCalldata2 = await marketHelper.liquidate(
                wbtcUsdcSingularity.address,
                [eoa1.address],
                [wbtcBorrowVal],
                [0],
                [liquidationReceiver.address],
                [liquidateData],
            );

            await expect(
                wbtcUsdcSingularity.execute(
                    liquidateCalldata2.modules,
                    liquidateCalldata2.calls,
                    true,
                ),
            ).to.be.reverted;
        });

        it('should add addset, remove asset and update exchange rate in a single tx', async () => {
            const {
                weth,
                yieldBox,
                usdc,
                wethUsdcSingularity,
                deployer,
                initContracts,
                penrose,
                marketHelper,
            } = await loadFixture(register);

            await initContracts(); // To prevent `Singularity: below minimum`

            const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
            await weth.freeMint(mintVal);

            const balanceBefore = await weth.balanceOf(deployer.address);
            // Deposit assets to penrose
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
                [0, 0, 0], // Call to base module
                [addAssetFn, removeAssetFn, updateExchangeRateFn],
                true,
            );

            addAssetFn = wethUsdcSingularity.interface.encodeFunctionData(
                'addAsset',
                [deployer.address, deployer.address, true, mintValShare],
            );

            await expect(
                wethUsdcSingularity.execute(
                    [0, 0, 0], // Call to base module
                    [addAssetFn, removeAssetFn, updateExchangeRateFn],
                    true,
                ),
            ).to.be.reverted;

            // Withdraw from penrose
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
                magnetarHelper,
                marketHelper,
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
                await wethUsdcSingularity.execute([0], [addAssetFn], true)
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

            const addCollateralCalldata = await marketHelper.addCollateral(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                false,
                0,
                usdcMintValShare,
            );

            const borrowCalldata = await marketHelper.borrow(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                wethBorrowVal,
            );

            await (
                await wethUsdcSingularity
                    .connect(eoa1)
                    .execute(
                        [
                            addCollateralCalldata.modules[0],
                            borrowCalldata.modules[0],
                        ],
                        [
                            addCollateralCalldata.calls[0],
                            borrowCalldata.calls[0],
                        ],
                        true,
                    )
            ).wait();

            expect(
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

            const dataFromHelper = (
                await magnetarHelper.singularityMarketInfo(eoa1.address, [
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
            // Deposit assets to penrose
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

            // Withdraw from penrose
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

    describe('exchangeRate', () => {
        it('should reset exchange rate validation timestmap', async () => {
            const { wethUsdcSingularity, timeTravel } = await loadFixture(
                register,
            );

            const oldtimestamp = await wethUsdcSingularity.rateTimestamp();
            expect(oldtimestamp.gt(0)).to.be.true;

            await wethUsdcSingularity.updateExchangeRate();
            const midtimestamp = await wethUsdcSingularity.rateTimestamp();
            expect(oldtimestamp.lt(midtimestamp)).to.be.true;

            await timeTravel(2 * 86400);
            await wethUsdcSingularity.updateExchangeRate();
            const finaltimestamp = await wethUsdcSingularity.rateTimestamp();
            expect(finaltimestamp.gt(midtimestamp)).to.be.true;
        });

        it('should revert if rate is older than validation duration', async () => {
            const { wethUsdcSingularity, timeTravel, wethUsdcOracle } =
                await loadFixture(register);

            await wethUsdcSingularity.updateExchangeRate();
            const timestamp = await wethUsdcSingularity.rateTimestamp();
            expect(timestamp.gt(0)).to.be.true;

            await wethUsdcOracle.setSuccess(false);
            await timeTravel(2 * 86400);
            await expect(wethUsdcSingularity.updateExchangeRate()).to.be
                .reverted;
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
                magnetarHelper,
                marketHelper,
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
                await wethUsdcSingularity.execute([0], [addAssetFn], true)
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

            const addCollateralCalldata = await marketHelper.addCollateral(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                false,
                0,
                usdcMintValShare,
            );

            const borrowCalldata = await marketHelper.borrow(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                wethBorrowVal,
            );
            await (
                await wethUsdcSingularity
                    .connect(eoa1)
                    .execute(
                        [
                            addCollateralCalldata.modules[0],
                            borrowCalldata.modules[0],
                        ],
                        [
                            addCollateralCalldata.calls[0],
                            borrowCalldata.calls[0],
                        ],
                        true,
                    )
            ).wait();

            expect(
                await wethUsdcSingularity.userCollateralShare(eoa1.address),
            ).equal(await yieldBox.toShare(collateralId, usdcMintVal, false));

            const dataFromHelper = (
                await magnetarHelper.singularityMarketInfo(eoa1.address, [
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

            const permitShare = await marketHelper.computeAllowedLendShare(
                wethUsdcSingularity.address,
                1,
                await wethUsdcSingularity.assetId(),
            );
            expect(permitShare.gte(1)).to.be.true;
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
                magnetarHelper,
                marketHelper,
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

            const borrowCalldata = await marketHelper.borrow(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                wethAmount,
            );
            await wethUsdcSingularity
                .connect(eoa1)
                .execute(borrowCalldata.modules, borrowCalldata.calls, true);
            const amountFromShares =
                await magnetarHelper.getAmountForBorrowPart(
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
                penrose,
                wethAssetId,
                yieldBox,
                eoa1,
                wethUsdcSingularity,
                deployer,
                approveTokensAndSetBarApproval,
                usdcDepositAndAddCollateral,
                wethDepositAndAddAsset,
                multiSwapper,
                __wethUsdcPrice,
                timeTravel,
                magnetar,
                twTap,
                magnetarHelper,
                marketHelper,
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

            await performMarketHelperCall(
                marketHelper,
                wethUsdcSingularity,
                await marketHelper.borrow(
                    wethUsdcSingularity.address,
                    eoa1.address,
                    eoa1.address,
                    wethBorrowVal,
                ),
                eoa1,
            );

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

            const repayCallData = await marketHelper.repay(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                false,
                userBorrowPart,
            );
            await wethUsdcSingularity
                .connect(eoa1)
                .execute(repayCallData.modules, repayCallData.calls, true);

            const feesAmountInAsset =
                await magnetarHelper.getAmountForAssetFraction(
                    wethUsdcSingularity.address,
                    (
                        await wethUsdcSingularity.accrueInfo()
                    ).feesEarnedFraction,
                );

            // Confirm fees accumulation
            expect(userBorrowPart.gt(wethBorrowVal));

            // Withdraw fees from Penrose
            const markets = [wethUsdcSingularity.address];

            await expect(
                penrose.withdrawAllMarketFees(markets, twTap.address),
            ).to.emit(penrose, 'LogTwTapFeesDeposit');

            const amountHarvested = await weth.balanceOf(twTap.address);
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

            expect(symbol.toLowerCase()).to.contain('tm-usdcm');
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
                marketHelper,
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
            await wethUsdcSingularity.updateExchangeRate();
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
                penrose,
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
                        ethers.constants.AddressZero,
                        ethers.utils.toUtf8Bytes(''),
                        ethers.constants.AddressZero,
                        0,
                        0,
                        0,
                        0,
                        wethBorrowVal.div(2),
                        0,
                        0,
                    ],
                );
            await penrose.executeMarketFn(
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
            ).to.be.reverted;

            borrowCapData = wethUsdcSingularity.interface.encodeFunctionData(
                'setMarketConfig',
                [
                    ethers.constants.AddressZero,
                    '0x',
                    ethers.constants.AddressZero,
                    0,
                    0,
                    0,
                    0,
                    ethers.utils.parseEther('99999999999'),
                    0,
                    0,
                ],
            );
            await penrose.executeMarketFn(
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
                5,
            );
            if (closingFactor.eq(prevClosingFactor)) {
                expect(
                    closingFactor.eq(
                        await wethUsdcSingularity.userBorrowPart(
                            deployer.address,
                        ),
                    ),
                ).to.be.true;
            } else {
                expect(closingFactor.gt(prevClosingFactor)).to.be.true;
            }
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
                magnetarHelper,
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
            // Deposit assets to penrose
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
                await magnetarHelper.getCollateralSharesForBorrowPart(
                    wethUsdcSingularity.address,
                    borrowVal.mul(50).div(100000).add(borrowVal),
                    ethers.BigNumber.from((1e5).toString()),
                    ethers.BigNumber.from((1e18).toString()),
                );
            const userCollateralShareToRepay =
                await magnetarHelper.getCollateralSharesForBorrowPart(
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
        it('Should accumulate opening fees', async () => {
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
                penrose,
                BN,
                __wethUsdcPrice,
                magnetarHelper,
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
            // Deposit assets to penrose
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

            const payload = wethUsdcSingularity.interface.encodeFunctionData(
                'setSingularityConfig',
                [1e4, 0, 0, 0, 0, 0, 0, 0],
            );

            await (
                await penrose.executeMarketFn(
                    [wethUsdcSingularity.address],
                    [payload],
                    true,
                )
            ).wait();
            const openingFeeAfter =
                await wethUsdcSingularity.borrowOpeningFee();
            expect(openingFeeAfter.eq(1e4)).to.be.true;
            // We borrow
            await wethUsdcSingularity
                .connect(eoa1)
                .borrow(eoa1.address, eoa1.address, borrowVal);

            // Validate fees
            const userBorrowPart = await wethUsdcSingularity.userBorrowPart(
                eoa1.address,
            );
            expect(borrowVal.add(borrowVal.mul(10).div(100)).eq(userBorrowPart))
                .to.be.true;
            const minCollateralShareRepay =
                await magnetarHelper.getCollateralSharesForBorrowPart(
                    wethUsdcSingularity.address,
                    borrowVal.mul(1e4).div(1e5).add(borrowVal),
                    ethers.BigNumber.from((1e5).toString()),
                    ethers.BigNumber.from((1e18).toString()),
                );
            const userCollateralShareToRepay =
                await magnetarHelper.getCollateralSharesForBorrowPart(
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

            const feeTo = penrose.address;
            const sglBalanceOfFeeTo = await wethUsdcSingularity.balanceOf(
                feeTo,
            );
            const sglAmountOfFeeTo = await yieldBox.toAmount(
                assetId,
                sglBalanceOfFeeTo,
                false,
            );
            expect(sglAmountOfFeeTo.eq(borrowVal.mul(1e4).div(1e5))).to.be.true;

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

        it('Should accumulate fees and harvest them as asset', async () => {
            const {
                usdc,
                weth,
                penrose,
                yieldBox,
                eoa1,
                wethUsdcSingularity,
                deployer,
                approveTokensAndSetBarApproval,
                usdcDepositAndAddCollateral,
                wethDepositAndAddAsset,
                multiSwapper,
                __wethUsdcPrice,
                timeTravel,
                magnetar,
                twTap,
                magnetarHelper,
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

            const feesAmountInAsset =
                await magnetarHelper.getAmountForAssetFraction(
                    wethUsdcSingularity.address,
                    (
                        await wethUsdcSingularity.accrueInfo()
                    ).feesEarnedFraction,
                );

            // Confirm fees accumulation
            expect(userBorrowPart.gt(wethBorrowVal));
            // Withdraw fees from Penrose
            const markets = await penrose.singularityMarkets();
            const swappers = [];
            const swapData = [];
            for (let i = 0; i < markets.length; i++) {
                swappers.push(multiSwapper.address);
                swapData.push({ minAssetAmount: 1 });
            }
            await expect(
                penrose.withdrawAllMarketFees(markets, twTap.address),
            ).to.emit(penrose, 'LogTwTapFeesDeposit');

            const amountHarvested = await weth.balanceOf(twTap.address);
            // 0.31%
            const acceptableHarvestMargin = feesAmountInAsset.sub(
                feesAmountInAsset.mul(31).div(10000),
            );
            expect(amountHarvested.gte(acceptableHarvestMargin)).to.be.true;
        });
    });

    describe('borrowing', () => {
        it('should borrow and repay from different senders', async () => {
            const {
                usdc,
                weth,
                yieldBox,
                eoa1,
                wethUsdcSingularity,
                deployer,
                approveTokensAndSetBarApproval,
                usdcDepositAndAddCollateral,
                wethDepositAndAddAsset,
                __wethUsdcPrice,
                timeTravel,
                penrose,
            } = await loadFixture(register);

            const pearlmit = await (
                await ethers.getContractFactory('Pearlmit')
            ).deploy('A', '1');
            await pearlmit.deployed();

            await penrose.setPearlmit(pearlmit.address);

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
                .approveBorrow(deployer.address, ethers.constants.MaxUint256);
            await wethUsdcSingularity.borrow(
                eoa1.address,
                eoa1.address,
                wethBorrowVal,
            );
            let userBorrowPart = await wethUsdcSingularity.userBorrowPart(
                eoa1.address,
            );
            expect(userBorrowPart.gt(0)).to.be.true;

            // We jump time to accumulate fees
            const day = 86400;
            await timeTravel(180 * day);

            // Repay
            userBorrowPart = await wethUsdcSingularity.userBorrowPart(
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
            await marketHelper.repay(
                wethUsdcSingularity.address,
                eoa1.address,
                eoa1.address,
                false,
                userBorrowPart,
            );

            userBorrowPart = await wethUsdcSingularity.userBorrowPart(
                eoa1.address,
            );
            expect(userBorrowPart.eq(0)).to.be.true;
        });
        it('should allow multiple borrowers', async () => {
            const {
                usdc,
                eoa1,
                weth,
                yieldBox,
                multiSwapper,
                marketHelper,
                deployer,
                wethUsdcSingularity,
                timeTravel,
                __wethUsdcPrice,
                approveTokensAndSetBarApproval,
                wethDepositAndAddAsset,
                usdcDepositAndAddCollateral,
                eoas,
                penrose,
                twTap,
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
                await marketHelper
                    .connect(eoa)
                    .borrow(
                        wethUsdcSingularity.address,
                        eoa.address,
                        eoa.address,
                        firstBorrow,
                    );
                timeTravel(10 * 86400);
            }

            timeTravel(10 * 86400);
            await penrose.withdrawAllMarketFees(
                [wethUsdcSingularity.address],
                twTap.address,
            );
        });
    });

    describe('usdo SGL', async () => {
        it.skip('should test interest rate', async () => {
            const {
                deployer,
                penrose,
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
                marketHelper,
                timeTravel,
            } = await loadFixture(register);
            //deploy and register USDO

            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
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
                    'uint256',
                    'uint256',
                ],
                [
                    _sglLiquidationModule.address,
                    _sglBorrow.address,
                    _sglCollateral.address,
                    _sglLeverage.address,
                    penrose.address,
                    usd0.address,
                    usdoAssetId,
                    weth.address,
                    wethAssetId,
                    wethUsdcOracle.address,
                    ethers.utils.parseEther('1'),
                    0,
                    0,
                ],
            );
            await penrose.registerSingularity(mediumRiskMC.address, data, true);
            const wethUsdoSingularity = await ethers.getContractAt(
                'Singularity',
                await penrose.clonesOf(
                    mediumRiskMC.address,
                    (await penrose.clonesOfCount(mediumRiskMC.address)).sub(1),
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
            await marketHelper
                .connect(eoa1)
                .addCollateral(
                    wethUsdoSingularity.address,
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

            for (let i = 1; i < 30 * 48; i++) {
                console.log(i);
                await timeTravel(1800);
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
                marketHelper,
                deployer,
                penrose,
                eoa1,
                yieldBox,
                weth,
                wethAssetId,
                mediumRiskMC,
                wethUsdcOracle,
                usd0,
                __wethUsdcPrice,
                multiSwapper,
                cluster,
            } = await loadFixture(register);
            //deploy and register USDO
            const usdoStratregy = await penrose.emptyStrategies(usd0.address);
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

            const _sglCollateral = await (
                await ethers.getContractFactory('SGLCollateral')
            ).deploy();
            await _sglCollateral.deployed();
            const _sglBorrow = await (
                await ethers.getContractFactory('SGLBorrow')
            ).deploy();
            await _sglBorrow.deployed();

            const _sglLeverage = await (
                await ethers.getContractFactory('SGLLeverage')
            ).deploy();
            await _sglLeverage.deployed();

            const newPrice = __wethUsdcPrice.div(1000000);
            await wethUsdcOracle.set(newPrice);

            const leverageExecutor = await (
                await ethers.getContractFactory('SimpleLeverageExecutor')
            ).deploy(multiSwapper.address, cluster.address);

            const modulesData = {
                _liquidationModule: _sglLiquidationModule.address,
                _borrowModule: _sglBorrow.address,
                _collateralModule: _sglCollateral.address,
                _leverageModule: _sglLeverage.address,
            };

            const tokensData = {
                _asset: usd0.address,
                _assetId: usdoAssetId,
                _collateral: weth.address,
                _collateralId: wethAssetId,
            };
            const data = {
                penrose_: penrose.address,
                _oracle: wethUsdcOracle.address,
                _exchangeRatePrecision: ethers.utils.parseEther('1'),
                _collateralizationRate: 0,
                _liquidationCollateralizationRate: 0,
                _leverageExecutor: leverageExecutor.address,
            };

            const sglData = new ethers.utils.AbiCoder().encode(
                [
                    'tuple(address _liquidationModule, address _borrowModule, address _collateralModule, address _leverageModule)',
                    'tuple(address _asset, uint256 _assetId, address _collateral, uint256 _collateralId)',
                    'tuple(address penrose_, address _oracle, uint256 _exchangeRatePrecision, uint256 _collateralizationRate, uint256 _liquidationCollateralizationRate, address _leverageExecutor)',
                ],
                [modulesData, tokensData, data],
            );

            await penrose.registerSingularity(
                mediumRiskMC.address,
                sglData,
                true,
            );
            const wethUsdoSingularity = await ethers.getContractAt(
                'Singularity',
                await penrose.clonesOf(
                    mediumRiskMC.address,
                    (await penrose.clonesOfCount(mediumRiskMC.address)).sub(1),
                ),
            );

            //Deploy & set LiquidationQueue
            await usd0.setMinterStatus(wethUsdoSingularity.address, true);
            await usd0.setBurnerStatus(wethUsdoSingularity.address, true);

            const feeCollector = new ethers.Wallet(
                ethers.Wallet.createRandom().privateKey,
                ethers.provider,
            );

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
            await marketHelper
                .connect(eoa1)
                .addCollateral(
                    wethUsdoSingularity.address,
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

            await marketHelper
                .connect(eoa1)
                .borrow(
                    wethUsdoSingularity.address,
                    eoa1.address,
                    eoa1.address,
                    usdoBorrowVal,
                );
            await yieldBox
                .connect(eoa1)
                .withdraw(
                    usdoAssetId,
                    eoa1.address,
                    eoa1.address,
                    usdoBorrowVal,
                    0,
                );
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
            clusterAddress: string,
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
                clusterAddress,
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
                clusterAddress,
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
                clusterAddress,
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
                clusterAddress,
                erc20name,
                erc20symbol,
                erc20decimal,
                hostChainID,
            );

            const args: Parameters<TapiocaOFT__factory['deploy']> = [
                lzEndpoint,
                erc20Address,
                yieldBoxAddress,
                clusterAddress,
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
    });
});
