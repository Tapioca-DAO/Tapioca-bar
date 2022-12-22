import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('SGLProxy', () => {
    let loadSetup: () => Promise<{
        proxySrc: any;
        proxyDst: any;
        singularitySrc: any;
        singularityDst: any;
        lzEndpointSrc: any;
        lzEndpointDst: any;
    }>;

    let bar: any,
        mediumRiskMC: any,
        proxyDeployer: any,
        yieldBox: any,
        weth: any,
        wethAssetId: any,
        usdc: any,
        usdcAssetId: any,
        wethUsdcOracle: any,
        registerSingularity: any;

    beforeEach(async () => {
        const registerInfo = await loadFixture(register);
        bar = registerInfo.bar;
        mediumRiskMC = registerInfo.mediumRiskMC;
        proxyDeployer = registerInfo.proxyDeployer;
        yieldBox = registerInfo.yieldBox;
        weth = registerInfo.weth;
        wethAssetId = registerInfo.wethAssetId;
        usdc = registerInfo.usdc;
        usdcAssetId = registerInfo.usdcAssetId;
        wethUsdcOracle = registerInfo.wethUsdcOracle;
        registerSingularity = registerInfo.registerSingularity;

        loadSetup = async () => {
            const {
                proxySrc,
                proxyDst,
                singularitySrc,
                singularityDst,
                lzEndpointSrc,
                lzEndpointDst,
            } = await setupEnvironment(
                proxyDeployer,
                mediumRiskMC,
                yieldBox,
                bar,
                weth,
                wethAssetId,
                usdc,
                usdcAssetId,
                wethUsdcOracle,
                registerSingularity,
            );
            return {
                proxySrc,
                proxyDst,
                singularitySrc,
                singularityDst,
                lzEndpointSrc,
                lzEndpointDst,
            };
        };
    });

    it('should test with OFT singularity', async () => {
        const {
            createWethUsd0Singularity,
            proxyDeployer,
            deployer,
            mediumRiskMC,
            yieldBox,
            bar,
            weth,
            usdc,
            wethAssetId,
            wethUsdcOracle,
            eoa1,
            deployCurveStableToUsdoBidder,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const newPrice = __wethUsdcPrice.div(1000000);
        await wethUsdcOracle.set(newPrice);

        const loadSetup = async function loadSetupFn() {
            const {
                proxySrc,
                proxyDst,
                singularitySrc,
                singularityDst,
                lzEndpointSrc,
                lzEndpointDst,
                usd0Src,
                usd0Dst,
                usd0DstId,
                usd0SrcId,
            } = await setupUsd0Environment(
                proxyDeployer,
                mediumRiskMC,
                yieldBox,
                bar,
                usdc,
                weth,
                wethAssetId,
                createWethUsd0Singularity,
                deployCurveStableToUsdoBidder,
            );
            return {
                proxySrc,
                proxyDst,
                singularitySrc,
                singularityDst,
                lzEndpointSrc,
                lzEndpointDst,
                usd0Src,
                usd0Dst,
                usd0DstId,
                usd0SrcId,
            };
        };
        const {
            proxySrc,
            proxyDst,
            singularitySrc,
            singularityDst,
            lzEndpointSrc,
            lzEndpointDst,
            usd0Src,
            usd0Dst,
            usd0DstId,
            usd0SrcId,
        } = await loadFixture(loadSetup);

        //get tokens
        const wethAmount = ethers.BigNumber.from((1e18).toString()).mul(100);
        const usdoAmount = ethers.BigNumber.from((1e18).toString()).mul(20000);
        await usd0Dst.mint(deployer.address, usdoAmount);
        await weth.connect(eoa1).freeMint(wethAmount);

        //add USD0 for borrowing
        const usdoLendValue = usdoAmount.div(2);
        await usd0Dst.approve(yieldBox.address, usdoLendValue);

        let usdoLendValueShare = await yieldBox.toShare(
            await singularityDst.assetId(),
            usdoLendValue,
            false,
        );

        await yieldBox.depositAsset(
            await singularityDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            usdoLendValueShare,
        );

        // Approve singularityDst actions
        await yieldBox.setApprovalForAll(singularityDst.address, true);
        await singularityDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await singularityDst.balanceOf(deployer.address);
        let addAssetFn = singularityDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, usdoLendValueShare],
        );

        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );

        const balanceAfter = await singularityDst.balanceOf(deployer.address);
        expect(balanceAfter.gt(balanceBefore)).to.be.true;

        // --- Borrowing ---
        const wethDepositAmount = ethers.BigNumber.from((1e18).toString()).mul(
            1,
        );

        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(singularityDst.address, true);
        await singularityDst
            .connect(eoa1)
            .approve(proxyDst.address, ethers.constants.MaxUint256);

        await yieldBox
            .connect(eoa1)
            .depositAsset(
                wethAssetId,
                eoa1.address,
                eoa1.address,
                wethDepositAmount,
                0,
            );

        const _wethValShare = await yieldBox.toShare(
            wethAssetId,
            wethDepositAmount,
            false,
        );

        const addCollateralFn = singularityDst.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, _wethValShare],
        );
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [addCollateralFn],
                ethers.utils.toUtf8Bytes(''),
                { value: ethers.utils.parseEther('1') },
            );

        const userCollateralShare = await singularityDst.userCollateralShare(
            eoa1.address,
        );
        expect(userCollateralShare.gt(0)).to.be.true;

        // Needs extraGas param; oterwhise it reverts
        const adapterParam = ethers.utils.solidityPack(
            ['uint16', 'uint256'],
            [1, 2250000],
        );
        await proxySrc.setMinDstGas(await lzEndpointDst.getChainId(), 1, 1);
        await proxySrc.setUseCustomAdapterParams(true);

        const usdoBorrowVal = wethDepositAmount
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        const borrowFn = singularityDst.interface.encodeFunctionData('borrow', [
            eoa1.address,
            eoa1.address,
            usdoBorrowVal,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [borrowFn],
                adapterParam,
                { value: ethers.utils.parseEther('10') },
            );
        let borrowPart = await singularityDst.userBorrowPart(eoa1.address);
        expect(borrowPart.gt(0)).to.be.true;

        //withdrawing to destination
        const randomReceiver = new ethers.Wallet(
            ethers.Wallet.createRandom().privateKey,
            ethers.provider,
        );
        await singularityDst
            .connect(eoa1)
            .withdrawTo(
                await lzEndpointSrc.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [randomReceiver.address],
                ),
                borrowPart.div(2),
                ethers.utils.toUtf8Bytes(''),
                eoa1.address,
                {
                    value: ethers.utils.parseEther('2'),
                },
            );

        const balanceOfReceiver = await usd0Src.balanceOf(
            randomReceiver.address,
        );
        expect(balanceOfReceiver.gt(0)).to.be.true;
        expect(balanceOfReceiver.eq(borrowPart.div(2))).to.be.true;
    });

    it('should test with OFT singularity through helper', async () => {
        const {
            createWethUsd0Singularity,
            proxyDeployer,
            deployer,
            mediumRiskMC,
            yieldBox,
            bar,
            weth,
            usdc,
            wethAssetId,
            wethUsdcOracle,
            eoa1,
            singularityHelper,
            deployCurveStableToUsdoBidder,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const newPrice = __wethUsdcPrice.div(1000000);
        await wethUsdcOracle.set(newPrice);

        const loadSetup = async function loadSetupFn() {
            const {
                proxySrc,
                proxyDst,
                singularitySrc,
                singularityDst,
                lzEndpointSrc,
                lzEndpointDst,
                usd0Src,
                usd0Dst,
                usd0DstId,
                usd0SrcId,
            } = await setupUsd0Environment(
                proxyDeployer,
                mediumRiskMC,
                yieldBox,
                bar,
                usdc,
                weth,
                wethAssetId,
                createWethUsd0Singularity,
                deployCurveStableToUsdoBidder,
            );
            return {
                proxySrc,
                proxyDst,
                singularitySrc,
                singularityDst,
                lzEndpointSrc,
                lzEndpointDst,
                usd0Src,
                usd0Dst,
                usd0DstId,
                usd0SrcId,
            };
        };
        const {
            proxySrc,
            proxyDst,
            singularitySrc,
            singularityDst,
            lzEndpointSrc,
            lzEndpointDst,
            usd0Src,
            usd0Dst,
            usd0DstId,
            usd0SrcId,
        } = await loadFixture(loadSetup);

        //get tokens
        const wethAmount = ethers.BigNumber.from((1e18).toString()).mul(100);
        const usdoAmount = ethers.BigNumber.from((1e18).toString()).mul(20000);
        await usd0Dst.mint(deployer.address, usdoAmount);
        await weth.connect(eoa1).freeMint(wethAmount);

        //add USD0 for borrowing
        const usdoLendValue = usdoAmount.div(2);
        await usd0Dst.approve(yieldBox.address, usdoLendValue);

        let usdoLendValueShare = await yieldBox.toShare(
            await singularityDst.assetId(),
            usdoLendValue,
            false,
        );

        await yieldBox.depositAsset(
            await singularityDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            usdoLendValueShare,
        );

        // Approve singularityDst actions
        await yieldBox.setApprovalForAll(singularityDst.address, true);
        await singularityDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await singularityDst.balanceOf(deployer.address);
        let addAssetFn = singularityDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, usdoLendValueShare],
        );

        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );

        const balanceAfter = await singularityDst.balanceOf(deployer.address);
        expect(balanceAfter.gt(balanceBefore)).to.be.true;

        // --- Borrowing ---

        const wethDepositAmount = ethers.BigNumber.from((1e18).toString()).mul(
            1,
        );
        const usdoBorrowVal = wethDepositAmount
            .mul(74)
            .div(100)
            .mul(__wethUsdcPrice.div((1e18).toString()));

        await weth
            .connect(eoa1)
            .approve(singularityHelper.address, ethers.constants.MaxUint256);
        await singularityDst
            .connect(eoa1)
            .approve(singularityHelper.address, ethers.constants.MaxUint256);

        const randomReceiver = new ethers.Wallet(
            ethers.Wallet.createRandom().privateKey,
            ethers.provider,
        );
        const withdrawData = new ethers.utils.AbiCoder().encode(
            ['bool', 'uint256', 'bytes', 'bytes'],
            [
                true,
                await lzEndpointSrc.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [randomReceiver.address],
                ),
                ethers.utils.toUtf8Bytes(''),
            ],
        );

        await singularityHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                singularityDst.address,
                wethDepositAmount,
                usdoBorrowVal.div(2),
                true,
                ethers.utils.toUtf8Bytes(''),
                {
                    value: ethers.utils.parseEther('10'),
                },
            );

        const userCollateralShare = await singularityDst.userCollateralShare(
            eoa1.address,
        );
        expect(userCollateralShare.gt(0)).to.be.true;

        let borrowPart = await singularityDst.userBorrowPart(eoa1.address);
        expect(borrowPart.gt(0)).to.be.true;

        let usdoBalance = await usd0Dst.balanceOf(eoa1.address);
        expect(usdoBalance.gt(0)).to.be.true;

        await singularityHelper
            .connect(eoa1)
            .depositAddCollateralAndBorrow(
                singularityDst.address,
                wethDepositAmount,
                usdoBorrowVal.div(2),
                true,
                withdrawData,
                {
                    value: ethers.utils.parseEther('10'),
                },
            );

        let usdoSrcBalabce = await usd0Src.balanceOf(randomReceiver.address);
        expect(usdoSrcBalabce.gt(0)).to.be.true;
    });

    it('should add assets to singularity from a different layers', async () => {
        const { deployer, yieldBox, weth } = await loadFixture(register);

        const { proxySrc, proxyDst, singularityDst, lzEndpointDst } =
            await loadFixture(loadSetup);

        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await singularityDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal);
        await yieldBox.depositAsset(
            await singularityDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );

        // Approve singularityDst actions
        await yieldBox.setApprovalForAll(singularityDst.address, true);
        await singularityDst.approve(proxyDst.address, mintVal);

        const balanceBefore = await singularityDst.balanceOf(deployer.address);
        let addAssetFn = singularityDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await expect(
            proxySrc.executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [],
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('LayerZeroMock: not enough native for fees');
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await singularityDst.balanceOf(deployer.address);
        expect(balanceAfter.eq(mintValShare)).to.be.true;
        expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });

    it('should add assets and remove them', async () => {
        const { deployer, yieldBox, weth } = await loadFixture(register);

        const { proxySrc, proxyDst, singularityDst, lzEndpointDst } =
            await loadFixture(loadSetup);

        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        // Deposit assets to YieldBox
        let mintValShare = await yieldBox.toShare(
            await singularityDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal);
        await yieldBox.depositAsset(
            await singularityDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );

        // Approve singularityDst actions
        await yieldBox.setApprovalForAll(singularityDst.address, true);
        await singularityDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await singularityDst.balanceOf(deployer.address);
        let addAssetFn = singularityDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );

        await expect(
            proxySrc.executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [],
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('LayerZeroMock: not enough native for fees');
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await singularityDst.balanceOf(deployer.address);
        expect(balanceAfter.eq(mintValShare)).to.be.true;
        expect(balanceAfter.gt(balanceBefore)).to.be.true;

        mintValShare = await yieldBox.toShare(
            await singularityDst.assetId(),
            mintVal,
            false,
        );
        const removeAssetFn = singularityDst.interface.encodeFunctionData(
            'removeAsset',
            [deployer.address, deployer.address, mintValShare.div(2)],
        );
        // Needs extraGas param; oterwhise it reverts
        const adapterParam = ethers.utils.solidityPack(
            ['uint16', 'uint256'],
            [1, 2250000],
        );
        await proxySrc.setMinDstGas(await lzEndpointDst.getChainId(), 1, 1);
        await proxySrc.setUseCustomAdapterParams(true);

        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [removeAssetFn],
            adapterParam,
            { value: ethers.utils.parseEther('10') },
        );
        const balanceFinal = await singularityDst.balanceOf(deployer.address);
        expect(balanceFinal.eq(mintValShare.div(2))).to.be.true;
    });

    it('should add collateral, borrow and repay from a different layer', async () => {
        const {
            deployer,
            yieldBox,
            weth,
            wethAssetId,
            usdc,
            usdcAssetId,
            eoa1,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const { proxySrc, proxyDst, singularityDst, lzEndpointDst } =
            await loadFixture(loadSetup);

        // --- Lending ---
        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await singularityDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal);
        await yieldBox.depositAsset(
            await singularityDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );

        // Approve singularityDst actions
        await yieldBox.setApprovalForAll(singularityDst.address, true);
        await singularityDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await singularityDst.balanceOf(deployer.address);
        let addAssetFn = singularityDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await singularityDst.balanceOf(deployer.address);
        expect(balanceAfter.eq(mintValShare)).to.be.true;
        expect(balanceAfter.gt(balanceBefore)).to.be.true;

        // --- Borrowing ---
        const usdcMintVal = mintVal.mul(__wethUsdcPrice.div((1e18).toString()));
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        await usdc.connect(eoa1).freeMint(usdcMintVal);
        await usdc
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(singularityDst.address, true);
        await singularityDst
            .connect(eoa1)
            .approve(proxyDst.address, ethers.constants.MaxUint256);

        const usdcMintValShare = await yieldBox.toShare(
            usdcAssetId,
            usdcMintVal,
            false,
        );
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                usdcAssetId,
                eoa1.address,
                eoa1.address,
                usdcMintVal,
                0,
            );
        const addCollateralFn = singularityDst.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [addCollateralFn],
                ethers.utils.toUtf8Bytes(''),
                { value: ethers.utils.parseEther('2') },
            );

        const userCollateralShare = await singularityDst.userCollateralShare(
            eoa1.address,
        );
        const userCollateralAmount = await yieldBox.toAmount(
            usdcAssetId,
            userCollateralShare,
            false,
        );
        expect(userCollateralShare.eq(usdcMintValShare)).to.be.true;
        expect(userCollateralAmount.eq(usdcMintVal)).to.be.true;

        const adapterParam = ethers.utils.solidityPack(
            ['uint16', 'uint256'],
            [1, 2250000],
        );
        await proxySrc.setMinDstGas(await lzEndpointDst.getChainId(), 1, 1);
        await proxySrc.setUseCustomAdapterParams(true);

        const borrowFn = singularityDst.interface.encodeFunctionData('borrow', [
            eoa1.address,
            eoa1.address,
            wethBorrowVal,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [borrowFn],
                adapterParam,
                { value: ethers.utils.parseEther('10') },
            );
        let borrowPart = await singularityDst.userBorrowPart(eoa1.address);
        expect(borrowPart.gt(wethBorrowVal)).to.be.true;

        await weth.connect(eoa1).freeMint(borrowPart);
        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                wethAssetId,
                eoa1.address,
                eoa1.address,
                borrowPart,
                0,
            );
        const repayFn = singularityDst.interface.encodeFunctionData('repay', [
            eoa1.address,
            eoa1.address,
            false,
            borrowPart,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [repayFn],
                adapterParam,
                { value: ethers.utils.parseEther('10') },
            );
        borrowPart = await singularityDst.userBorrowPart(eoa1.address);
        expect(borrowPart.eq(0)).to.be.true;
    });

    it('should add collateral & borrow in a single tx through the proxy', async () => {
        const {
            deployer,
            yieldBox,
            weth,
            usdc,
            usdcAssetId,
            eoa1,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const { proxySrc, proxyDst, singularityDst, lzEndpointDst } =
            await loadFixture(loadSetup);

        // --- Lending ---
        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await singularityDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal);
        await yieldBox.depositAsset(
            await singularityDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );

        // Approve singularityDst actions
        await yieldBox.setApprovalForAll(singularityDst.address, true);
        await singularityDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await singularityDst.balanceOf(deployer.address);
        let addAssetFn = singularityDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await singularityDst.balanceOf(deployer.address);
        expect(balanceAfter.eq(mintValShare)).to.be.true;
        expect(balanceAfter.gt(balanceBefore)).to.be.true;

        // --- Borrowing ---
        const usdcMintVal = mintVal.mul(__wethUsdcPrice.div((1e18).toString()));
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        await usdc.connect(eoa1).freeMint(usdcMintVal);
        await usdc
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(singularityDst.address, true);
        await singularityDst
            .connect(eoa1)
            .approve(proxyDst.address, ethers.constants.MaxUint256);
        const usdcMintValShare = await yieldBox.toShare(
            usdcAssetId,
            usdcMintVal,
            false,
        );
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                usdcAssetId,
                eoa1.address,
                eoa1.address,
                usdcMintVal,
                0,
            );

        const addCollateralFn = singularityDst.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        const borrowFn = singularityDst.interface.encodeFunctionData('borrow', [
            eoa1.address,
            eoa1.address,
            wethBorrowVal,
        ]);

        // Needs extraGas param; oterwhise it reverts
        const adapterParam = ethers.utils.solidityPack(
            ['uint16', 'uint256'],
            [1, 2250000],
        );
        await proxySrc.setMinDstGas(await lzEndpointDst.getChainId(), 1, 1);
        await proxySrc.setUseCustomAdapterParams(true);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [addCollateralFn, borrowFn],
                adapterParam,
                { value: ethers.utils.parseEther('10') },
            );
        let userCollateralShare = await singularityDst.userCollateralShare(
            eoa1.address,
        );
        expect(userCollateralShare.eq(usdcMintValShare)).to.be.true;
        let borrowPart = await singularityDst.userBorrowPart(eoa1.address);
        expect(borrowPart.gt(wethBorrowVal)).to.be.true;
    });

    it('should deposit, borrow, liquidate and fail-withdraw', async () => {
        const {
            deployer,
            yieldBox,
            weth,
            usdc,
            usdcAssetId,
            wethUsdcOracle,
            eoa1,
            multiSwapper,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const { proxySrc, proxyDst, singularityDst, lzEndpointDst } =
            await loadFixture(loadSetup);

        // --- Lending ---
        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal.mul(10));

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await singularityDst.assetId(),
            mintVal.mul(10),
            false,
        );
        await weth.approve(yieldBox.address, mintVal.mul(10));
        await yieldBox.depositAsset(
            await singularityDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );
        const adapterParam = ethers.utils.solidityPack(
            ['uint16', 'uint256'],
            [1, 2250000],
        );
        await proxySrc.setMinDstGas(await lzEndpointDst.getChainId(), 1, 1);
        await proxySrc.setUseCustomAdapterParams(true);

        // Approve singularityDst actions
        await yieldBox.setApprovalForAll(singularityDst.address, true);
        await singularityDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await singularityDst.balanceOf(deployer.address);
        let addAssetFn = singularityDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [addAssetFn],
            adapterParam,
            { value: ethers.utils.parseEther('10') },
        );
        const balanceAfter = await singularityDst.balanceOf(deployer.address);
        expect(balanceAfter.eq(mintValShare)).to.be.true;
        expect(balanceAfter.gt(balanceBefore)).to.be.true;

        // --- Borrowing ---
        const usdcMintVal = mintVal.mul(__wethUsdcPrice.div((1e18).toString()));
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        await usdc.connect(eoa1).freeMint(usdcMintVal);
        await usdc
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(singularityDst.address, true);
        await singularityDst
            .connect(eoa1)
            .approve(proxyDst.address, ethers.constants.MaxUint256);

        const usdcMintValShare = await yieldBox.toShare(
            usdcAssetId,
            usdcMintVal,
            false,
        );
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                usdcAssetId,
                eoa1.address,
                eoa1.address,
                usdcMintVal,
                0,
            );
        const addCollateralFn = singularityDst.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [addCollateralFn],
                adapterParam,
                { value: ethers.utils.parseEther('10') },
            );

        const userCollateralShare = await singularityDst.userCollateralShare(
            eoa1.address,
        );
        const userCollateralAmount = await yieldBox.toAmount(
            usdcAssetId,
            userCollateralShare,
            false,
        );
        expect(userCollateralShare.eq(usdcMintValShare)).to.be.true;
        expect(userCollateralAmount.eq(usdcMintVal)).to.be.true;

        const borrowFn = singularityDst.interface.encodeFunctionData('borrow', [
            eoa1.address,
            eoa1.address,
            wethBorrowVal,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [borrowFn],
                adapterParam,
                { value: ethers.utils.parseEther('10') },
            );
        let borrowPart = await singularityDst.userBorrowPart(eoa1.address);
        const remaining = borrowPart.sub(wethBorrowVal);
        expect(borrowPart.gt(wethBorrowVal)).to.be.true;

        const priceDrop = __wethUsdcPrice.mul(2).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

        const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        const liquidateFn = singularityDst.interface.encodeFunctionData(
            'liquidate',
            [[eoa1.address], [wethBorrowVal], multiSwapper.address, data, data],
        );

        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [liquidateFn],
            adapterParam,
            { value: ethers.utils.parseEther('10') },
        );

        const borrowPartFinal = await singularityDst.userBorrowPart(
            eoa1.address,
        );
        expect(borrowPartFinal.lt(borrowPart)).to.be.true;
        expect(borrowPartFinal.eq(remaining)).to.be.true;

        await expect(
            yieldBox
                .connect(eoa1)
                .withdraw(
                    await singularityDst.collateralId(),
                    eoa1.address,
                    eoa1.address,
                    0,
                    wethBorrowVal,
                ),
        ).to.be.reverted;
    });

    it('should withdraw fees through the proxy', async () => {
        const {
            deployer,
            yieldBox,
            bar,
            weth,
            wethAssetId,
            usdc,
            usdcAssetId,
            eoa1,
            multiSwapper,
            singularityHelper,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const { proxySrc, proxyDst, singularityDst, lzEndpointDst } =
            await loadFixture(loadSetup);

        const adapterParam = ethers.utils.solidityPack(
            ['uint16', 'uint256'],
            [1, 2250000],
        );
        await proxySrc.setMinDstGas(await lzEndpointDst.getChainId(), 1, 1);
        await proxySrc.setUseCustomAdapterParams(true);

        // --- Lending ---
        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal.mul(10));

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await singularityDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal.mul(10));
        await yieldBox.depositAsset(
            await singularityDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare.mul(10),
        );

        // Approve singularityDst actions
        await yieldBox.setApprovalForAll(singularityDst.address, true);
        await singularityDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await singularityDst.balanceOf(deployer.address);
        let addAssetFn = singularityDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [addAssetFn],
            adapterParam,
            { value: ethers.utils.parseEther('10') },
        );
        const balanceAfter = await singularityDst.balanceOf(deployer.address);
        expect(balanceAfter.eq(mintValShare)).to.be.true;
        expect(balanceAfter.gt(balanceBefore)).to.be.true;

        // --- Borrowing ---
        const usdcMintVal = mintVal.mul(__wethUsdcPrice.div((1e18).toString()));
        const wethBorrowVal = usdcMintVal
            .mul(74)
            .div(100)
            .div(__wethUsdcPrice.div((1e18).toString()));

        await usdc.connect(eoa1).freeMint(usdcMintVal);
        await usdc
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .setApprovalForAll(singularityDst.address, true);
        await singularityDst
            .connect(eoa1)
            .approve(proxyDst.address, ethers.constants.MaxUint256);

        const usdcMintValShare = await yieldBox.toShare(
            usdcAssetId,
            usdcMintVal,
            false,
        );
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                usdcAssetId,
                eoa1.address,
                eoa1.address,
                usdcMintVal,
                0,
            );
        const addCollateralFn = singularityDst.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [addCollateralFn],
                adapterParam,
                { value: ethers.utils.parseEther('10') },
            );

        const userCollateralShare = await singularityDst.userCollateralShare(
            eoa1.address,
        );
        const userCollateralAmount = await yieldBox.toAmount(
            usdcAssetId,
            userCollateralShare,
            false,
        );
        expect(userCollateralShare.eq(usdcMintValShare)).to.be.true;
        expect(userCollateralAmount.eq(usdcMintVal)).to.be.true;

        const borrowFn = singularityDst.interface.encodeFunctionData('borrow', [
            eoa1.address,
            eoa1.address,
            wethBorrowVal,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [borrowFn],
                adapterParam,
                { value: ethers.utils.parseEther('10') },
            );
        let borrowPart = await singularityDst.userBorrowPart(eoa1.address);
        expect(borrowPart.gt(wethBorrowVal)).to.be.true;

        await weth.connect(eoa1).freeMint(borrowPart);
        await weth
            .connect(eoa1)
            .approve(yieldBox.address, ethers.constants.MaxUint256);
        await yieldBox
            .connect(eoa1)
            .depositAsset(
                wethAssetId,
                eoa1.address,
                eoa1.address,
                borrowPart,
                0,
            );
        const repayFn = singularityDst.interface.encodeFunctionData('repay', [
            eoa1.address,
            eoa1.address,
            false,
            borrowPart,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(
                    ['address'],
                    [singularityDst.address],
                ),
                [repayFn],
                adapterParam,
                { value: ethers.utils.parseEther('10') },
            );
        borrowPart = await singularityDst.userBorrowPart(eoa1.address);
        expect(borrowPart.eq(0)).to.be.true;

        // Withdraw fees from Penrose
        await expect(
            bar.withdrawAllSingularityFees(
                [
                    multiSwapper.address,
                    multiSwapper.address,
                    multiSwapper.address,
                ],
                [
                    { minAssetAmount: 1 },
                    { minAssetAmount: 1 },
                    { minAssetAmount: 1 },
                ],
            ),
        ).to.emit(singularityDst, 'LogYieldBoxFeesDeposit');

        const mixologistFeeVeTap = await bar.feeTo();
        const tapAmountHarvested = await yieldBox.toAmount(
            await bar.tapAssetId(),
            await yieldBox.balanceOf(
                mixologistFeeVeTap,
                await bar.tapAssetId(),
            ),
            false,
        );
        const feesAmountInAsset =
            await singularityHelper.getAmountForAssetFraction(
                singularityDst.address,

                (
                    await singularityDst.accrueInfo()
                ).feesEarnedFraction,
            );
        // 0.31%
        const acceptableHarvestMargin = feesAmountInAsset.sub(
            feesAmountInAsset.mul(31).div(10000),
        );
        expect(tapAmountHarvested.gte(acceptableHarvestMargin)).to.be.true;
    });

    it('should do a flashloan through the proxy', async () => {
        const { deployer, yieldBox, weth } = await loadFixture(register);

        const { proxySrc, proxyDst, singularityDst, lzEndpointDst } =
            await loadFixture(loadSetup);

        // --- Lending ---
        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal.mul(10));

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await singularityDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal.mul(10));
        await yieldBox.depositAsset(
            await singularityDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare.mul(10),
        );

        // Approve singularityDst actions
        await yieldBox.setApprovalForAll(singularityDst.address, true);
        await singularityDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await singularityDst.balanceOf(deployer.address);
        let addAssetFn = singularityDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await singularityDst.balanceOf(deployer.address);
        expect(balanceAfter.eq(mintValShare)).to.be.true;
        expect(balanceAfter.gt(balanceBefore)).to.be.true;

        const operator = await (
            await ethers.getContractFactory('FlashLoanMockSuccess')
        ).deploy();

        await weth.freeMint(mintVal.mul(90).div(100_000)); // 0.09% fee
        await weth.transfer(operator.address, mintVal.mul(90).div(100_000));

        // Needs extraGas param; oterwhise it reverts
        const adapterParam = ethers.utils.solidityPack(
            ['uint16', 'uint256'],
            [1, 2250000],
        );
        await proxySrc.setMinDstGas(await lzEndpointDst.getChainId(), 1, 1);
        await proxySrc.setUseCustomAdapterParams(true);

        const flashLoanFn = singularityDst.interface.encodeFunctionData(
            'flashLoan',
            [
                operator.address,
                operator.address,
                mintVal,
                ethers.utils.hexlify(0),
            ],
        );

        const feesEarnedBefore = (await singularityDst.accrueInfo())[2];
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [singularityDst.address]),
            [flashLoanFn],
            adapterParam,
            { value: ethers.utils.parseEther('1') },
        );
        const feesEarnedAfter = (await singularityDst.accrueInfo())[2];
        expect(feesEarnedAfter.gt(feesEarnedBefore)).to.be.true;
    });
});

//--------------------- helpers
async function setupUsd0Environment(
    proxyDeployer: any,
    mediumRiskMC: any,
    yieldBox: any,
    bar: any,
    usdc: any,
    collateral: any,
    collateralId: any,
    registerSingularity: any,
    registerBidder: any,
) {
    //omnichain configuration
    const chainIdSrc = 1;
    const chainIdDst = (await ethers.provider.getNetwork()).chainId;

    const LZEndpointMock = await ethers.getContractFactory('LZEndpointMock');

    const lzEndpointSrc = await LZEndpointMock.deploy(chainIdSrc);
    const lzEndpointDst = await LZEndpointMock.deploy(chainIdDst);

    const saltSrc = ethers.utils.formatBytes32String(`ProxySrc`);
    const saltDst = ethers.utils.formatBytes32String(`ProxyDst`);

    await proxyDeployer.deployWithCreate2(lzEndpointSrc.address, saltSrc);
    await proxyDeployer.deployWithCreate2(lzEndpointDst.address, saltDst);

    const proxySrc = await ethers.getContractAt(
        'SGLProxy',
        await proxyDeployer.proxies(0),
    );
    const proxyDst = await ethers.getContractAt(
        'SGLProxy',
        await proxyDeployer.proxies(1),
    );

    lzEndpointSrc.setDestLzEndpoint(proxyDst.address, lzEndpointDst.address);
    lzEndpointDst.setDestLzEndpoint(proxySrc.address, lzEndpointSrc.address);

    await proxySrc.setTrustedRemote(
        chainIdDst,
        ethers.utils.solidityPack(
            ['address', 'address'],
            [proxyDst.address, proxySrc.address],
        ),
    );

    await proxyDst.setTrustedRemote(
        chainIdSrc,
        ethers.utils.solidityPack(
            ['address', 'address'],
            [proxySrc.address, proxyDst.address],
        ),
    );

    //deploy usd0 tokens
    const usd0Src = await (
        await ethers.getContractFactory('USD0')
    ).deploy(lzEndpointSrc.address);
    await usd0Src.deployed();
    await yieldBox.registerAsset(
        1,
        usd0Src.address,
        ethers.constants.AddressZero,
        0,
    );
    const usd0SrcId = await yieldBox.ids(
        1,
        usd0Src.address,
        ethers.constants.AddressZero,
        0,
    );

    const usd0Dst = await (
        await ethers.getContractFactory('USD0')
    ).deploy(lzEndpointDst.address);
    await usd0Dst.deployed();
    await yieldBox.registerAsset(
        1,
        usd0Dst.address,
        ethers.constants.AddressZero,
        0,
    );
    const usd0DstId = await yieldBox.ids(
        1,
        usd0Dst.address,
        ethers.constants.AddressZero,
        0,
    );

    //configure trusted remotes for USD0
    await lzEndpointSrc.setDestLzEndpoint(
        usd0Dst.address,
        lzEndpointDst.address,
    );
    await lzEndpointDst.setDestLzEndpoint(
        usd0Src.address,
        lzEndpointSrc.address,
    );

    const dstPath = ethers.utils.solidityPack(
        ['address', 'address'],
        [usd0Dst.address, usd0Src.address],
    );
    const srcPath = ethers.utils.solidityPack(
        ['address', 'address'],
        [usd0Src.address, usd0Dst.address],
    );
    await usd0Src.setTrustedRemote(chainIdDst, dstPath);
    await usd0Dst.setTrustedRemote(chainIdSrc, srcPath);

    //deploy bidders
    const stableToUsdoBidderSrcInfo = await registerBidder(
        bar,
        usdc,
        usd0Src,
        false,
    );
    const stableToUsdoBidderSrc = stableToUsdoBidderSrcInfo.stableToUsdoBidder;

    const stableToUsdoBidderDstInfo = await registerBidder(
        bar,
        usdc,
        usd0Dst,
        false,
    );
    const stableToUsdoBidderDst = stableToUsdoBidderDstInfo.stableToUsdoBidder;

    //deploy singularities
    const srcSingularityDeployments = await registerSingularity(
        usd0Src,
        collateral,
        bar,
        usd0SrcId,
        collateralId,
        mediumRiskMC,
        yieldBox,
        stableToUsdoBidderSrc,
        ethers.utils.parseEther('1'),
        false,
    );
    const singularitySrc = srcSingularityDeployments.wethUsdoSingularity;

    const dstSingularityDeployments = await registerSingularity(
        usd0Dst,
        collateral,
        bar,
        usd0DstId,
        collateralId,
        mediumRiskMC,
        yieldBox,
        stableToUsdoBidderDst,
        ethers.utils.parseEther('1'),
        false,
    );
    const singularityDst = dstSingularityDeployments.wethUsdoSingularity;

    await proxySrc.updateSingularityStatus(singularitySrc.address, true);
    await proxyDst.updateSingularityStatus(singularityDst.address, true);
    await proxySrc.setEnforceSameAddress(false);
    await proxyDst.setEnforceSameAddress(false);

    const proxySrcSingularitySrcStatus = await proxySrc.singularities(
        singularitySrc.address,
    );
    const proxySrcSingularityDstStatus = await proxySrc.singularities(
        singularityDst.address,
    );
    expect(proxySrcSingularitySrcStatus).to.be.true;
    expect(proxySrcSingularityDstStatus).to.be.false;

    const proxyDstSingularitySrcStatus = await proxyDst.singularities(
        singularitySrc.address,
    );
    const proxyDstSingularityDstStatus = await proxyDst.singularities(
        singularityDst.address,
    );
    expect(proxyDstSingularitySrcStatus).to.be.false;
    expect(proxyDstSingularityDstStatus).to.be.true;
    return {
        proxySrc,
        proxyDst,
        singularitySrc,
        singularityDst,
        lzEndpointSrc,
        lzEndpointDst,
        usd0Src,
        usd0Dst,
        usd0SrcId,
        usd0DstId,
    };
}
async function setupEnvironment(
    proxyDeployer: any,
    mediumRiskMC: any,
    yieldBox: any,
    bar: any,
    weth: any,
    wethAssetId: any,
    usdc: any,
    usdcAssetId: any,
    wethUsdcOracle: any,
    registerSingularity: any,
) {
    //omnichain configuration
    const chainIdSrc = 1;
    const chainIdDst = 2;

    const LZEndpointMock = await ethers.getContractFactory('LZEndpointMock');

    const lzEndpointSrc = await LZEndpointMock.deploy(chainIdSrc);
    const lzEndpointDst = await LZEndpointMock.deploy(chainIdDst);

    const saltSrc = ethers.utils.formatBytes32String(`ProxySrc`);
    const saltDst = ethers.utils.formatBytes32String(`ProxyDst`);

    await proxyDeployer.deployWithCreate2(lzEndpointSrc.address, saltSrc);
    await proxyDeployer.deployWithCreate2(lzEndpointDst.address, saltDst);

    const proxySrc = await ethers.getContractAt(
        'SGLProxy',
        await proxyDeployer.proxies(0),
    );
    const proxyDst = await ethers.getContractAt(
        'SGLProxy',
        await proxyDeployer.proxies(1),
    );

    lzEndpointSrc.setDestLzEndpoint(proxyDst.address, lzEndpointDst.address);
    lzEndpointDst.setDestLzEndpoint(proxySrc.address, lzEndpointSrc.address);

    await proxySrc.setTrustedRemote(
        chainIdDst,
        ethers.utils.solidityPack(
            ['address', 'address'],
            [proxyDst.address, proxySrc.address],
        ),
    );

    await proxyDst.setTrustedRemote(
        chainIdSrc,
        ethers.utils.solidityPack(
            ['address', 'address'],
            [proxySrc.address, proxyDst.address],
        ),
    );

    //deploy singularities
    const srcSingularityDeployments = await registerSingularity(
        mediumRiskMC.address,
        yieldBox,
        bar,
        weth,
        wethAssetId,
        usdc,
        usdcAssetId,
        wethUsdcOracle,
        ethers.utils.parseEther('1'),
        false,
    );
    const singularitySrc = srcSingularityDeployments.singularityMarket;

    const dstSingularityDeployments = await registerSingularity(
        mediumRiskMC.address,
        yieldBox,
        bar,
        weth,
        wethAssetId,
        usdc,
        usdcAssetId,
        wethUsdcOracle,
        ethers.utils.parseEther('1'),
        false,
    );
    const singularityDst = dstSingularityDeployments.singularityMarket;

    await proxySrc.updateSingularityStatus(singularitySrc.address, true);
    await proxyDst.updateSingularityStatus(singularityDst.address, true);
    await proxySrc.setEnforceSameAddress(false);
    await proxyDst.setEnforceSameAddress(false);

    const proxySrcSingularitySrcStatus = await proxySrc.singularities(
        singularitySrc.address,
    );
    const proxySrcSingularityDstStatus = await proxySrc.singularities(
        singularityDst.address,
    );
    expect(proxySrcSingularitySrcStatus).to.be.true;
    expect(proxySrcSingularityDstStatus).to.be.false;

    const proxyDstSingularitySrcStatus = await proxyDst.singularities(
        singularitySrc.address,
    );
    const proxyDstSingularityDstStatus = await proxyDst.singularities(
        singularityDst.address,
    );
    expect(proxyDstSingularitySrcStatus).to.be.false;
    expect(proxyDstSingularityDstStatus).to.be.true;
    return {
        proxySrc,
        proxyDst,
        singularitySrc,
        singularityDst,
        lzEndpointSrc,
        lzEndpointDst,
    };
}
