import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('MXProxy', () => {
    it('should add assets to mixologist from a different layers', async () => {
        const {
            registerMixologist,
            proxyDeployer,
            deployer,
            mediumRiskMC,
            yieldBox,
            bar,
            weth,
            wethAssetId,
            usdc,
            usdcAssetId,
            wethUsdcOracle,
            collateralSwapPath,
            tapSwapPath,
        } = await loadFixture(register);
        const loadSetup = async function loadSetupFn() {
            const {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
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
                collateralSwapPath,
                tapSwapPath,
                registerMixologist,
            );
            return {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
                lzEndpointSrc,
                lzEndpointDst,
            };
        };
        const {
            proxySrc,
            proxyDst,
            mixologistSrc,
            mixologistDst,
            lzEndpointSrc,
            lzEndpointDst,
        } = await loadFixture(loadSetup);

        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await mixologistDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal);
        await yieldBox.depositAsset(
            await mixologistDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );

        // Approve mixologistDst actions
        await yieldBox.setApprovalForAll(mixologistDst.address, true);
        await mixologistDst.approve(proxyDst.address, mintVal);

        const balanceBefore = await mixologistDst.balanceOf(deployer.address);
        let addAssetFn = mixologistDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await expect(
            proxySrc.executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [],
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('LayerZeroMock: not enough native for fees');
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [mixologistDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await mixologistDst.balanceOf(deployer.address);
        expect(balanceAfter.eq(mintValShare)).to.be.true;
        expect(balanceAfter.gt(balanceBefore)).to.be.true;
    });

    it('should add assets and remove them', async () => {
        const {
            registerMixologist,
            proxyDeployer,
            deployer,
            mediumRiskMC,
            yieldBox,
            bar,
            weth,
            wethAssetId,
            usdc,
            usdcAssetId,
            wethUsdcOracle,
            collateralSwapPath,
            tapSwapPath,
        } = await loadFixture(register);
        const loadSetup = async function loadSetupFn() {
            const {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
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
                collateralSwapPath,
                tapSwapPath,
                registerMixologist,
            );
            return {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
                lzEndpointSrc,
                lzEndpointDst,
            };
        };
        const {
            proxySrc,
            proxyDst,
            mixologistSrc,
            mixologistDst,
            lzEndpointSrc,
            lzEndpointDst,
        } = await loadFixture(loadSetup);

        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        // Deposit assets to YieldBox
        let mintValShare = await yieldBox.toShare(
            await mixologistDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal);
        await yieldBox.depositAsset(
            await mixologistDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );

        // Approve mixologistDst actions
        await yieldBox.setApprovalForAll(mixologistDst.address, true);
        await mixologistDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await mixologistDst.balanceOf(deployer.address);
        let addAssetFn = mixologistDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );

        await expect(
            proxySrc.executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [],
                ethers.utils.toUtf8Bytes(''),
            ),
        ).to.be.revertedWith('LayerZeroMock: not enough native for fees');
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [mixologistDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await mixologistDst.balanceOf(deployer.address);
        expect(balanceAfter.eq(mintValShare)).to.be.true;
        expect(balanceAfter.gt(balanceBefore)).to.be.true;

        mintValShare = await yieldBox.toShare(
            await mixologistDst.assetId(),
            mintVal,
            false,
        );
        const removeAssetFn = mixologistDst.interface.encodeFunctionData(
            'removeAsset',
            [deployer.address, deployer.address, mintValShare.div(2)],
        );
        // Needs extraGas param; oterwhise it reverts
        const adapterParam = ethers.utils.solidityPack(
            ['uint16', 'uint256'],
            [1, 2250000],
        );
        await proxySrc.setMinDstGasLookup(
            await lzEndpointDst.getChainId(),
            1,
            1,
        );
        await proxySrc.setUseCustomAdapterParams(true);

        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [mixologistDst.address]),
            [removeAssetFn],
            adapterParam,
            { value: ethers.utils.parseEther('10') },
        );
        const balanceFinal = await mixologistDst.balanceOf(deployer.address);
        expect(balanceFinal.eq(mintValShare.div(2))).to.be.true;
    });

    it('should add collateral, borrow and repay from a different layer', async () => {
        const {
            registerMixologist,
            proxyDeployer,
            deployer,
            mediumRiskMC,
            yieldBox,
            bar,
            weth,
            wethAssetId,
            usdc,
            usdcAssetId,
            wethUsdcOracle,
            collateralSwapPath,
            tapSwapPath,
            eoa1,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const loadSetup = async function loadSetupFn() {
            const {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
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
                collateralSwapPath,
                tapSwapPath,
                registerMixologist,
            );
            return {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
                lzEndpointSrc,
                lzEndpointDst,
            };
        };
        const {
            proxySrc,
            proxyDst,
            mixologistSrc,
            mixologistDst,
            lzEndpointSrc,
            lzEndpointDst,
        } = await loadFixture(loadSetup);

        // --- Lending ---
        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await mixologistDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal);
        await yieldBox.depositAsset(
            await mixologistDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );

        // Approve mixologistDst actions
        await yieldBox.setApprovalForAll(mixologistDst.address, true);
        await mixologistDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await mixologistDst.balanceOf(deployer.address);
        let addAssetFn = mixologistDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [mixologistDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await mixologistDst.balanceOf(deployer.address);
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
            .setApprovalForAll(mixologistDst.address, true);
        await mixologistDst
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
        const addCollateralFn = mixologistDst.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [addCollateralFn],
                ethers.utils.toUtf8Bytes(''),
                { value: ethers.utils.parseEther('1') },
            );

        const userCollateralShare = await mixologistDst.userCollateralShare(
            eoa1.address,
        );
        const userCollateralAmount = await yieldBox.toAmount(
            usdcAssetId,
            userCollateralShare,
            false,
        );
        expect(userCollateralShare.eq(usdcMintValShare)).to.be.true;
        expect(userCollateralAmount.eq(usdcMintVal)).to.be.true;

        const borrowFn = mixologistDst.interface.encodeFunctionData('borrow', [
            eoa1.address,
            eoa1.address,
            wethBorrowVal,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [borrowFn],
                ethers.utils.toUtf8Bytes(''),
                { value: ethers.utils.parseEther('1') },
            );
        let borrowPart = await mixologistDst.userBorrowPart(eoa1.address);
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
        const repayFn = mixologistDst.interface.encodeFunctionData('repay', [
            eoa1.address,
            eoa1.address,
            false,
            borrowPart,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [repayFn],
                ethers.utils.toUtf8Bytes(''),
                { value: ethers.utils.parseEther('1') },
            );
        borrowPart = await mixologistDst.userBorrowPart(eoa1.address);
        expect(borrowPart.eq(0)).to.be.true;
    });

    it('should add collateral & borrow in a single tx through the proxy', async () => {
        const {
            registerMixologist,
            proxyDeployer,
            deployer,
            mediumRiskMC,
            yieldBox,
            bar,
            weth,
            wethAssetId,
            usdc,
            usdcAssetId,
            wethUsdcOracle,
            collateralSwapPath,
            tapSwapPath,
            eoa1,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const loadSetup = async function loadSetupFn() {
            const {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
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
                collateralSwapPath,
                tapSwapPath,
                registerMixologist,
            );
            return {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
                lzEndpointSrc,
                lzEndpointDst,
            };
        };
        const {
            proxySrc,
            proxyDst,
            mixologistSrc,
            mixologistDst,
            lzEndpointSrc,
            lzEndpointDst,
        } = await loadFixture(loadSetup);

        // --- Lending ---
        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal);

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await mixologistDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal);
        await yieldBox.depositAsset(
            await mixologistDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );

        // Approve mixologistDst actions
        await yieldBox.setApprovalForAll(mixologistDst.address, true);
        await mixologistDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await mixologistDst.balanceOf(deployer.address);
        let addAssetFn = mixologistDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [mixologistDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await mixologistDst.balanceOf(deployer.address);
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
            .setApprovalForAll(mixologistDst.address, true);
        await mixologistDst
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

        const addCollateralFn = mixologistDst.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        const borrowFn = mixologistDst.interface.encodeFunctionData('borrow', [
            eoa1.address,
            eoa1.address,
            wethBorrowVal,
        ]);

        // Needs extraGas param; oterwhise it reverts
        const adapterParam = ethers.utils.solidityPack(
            ['uint16', 'uint256'],
            [1, 2250000],
        );
        await proxySrc.setMinDstGasLookup(
            await lzEndpointDst.getChainId(),
            1,
            1,
        );
        await proxySrc.setUseCustomAdapterParams(true);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [addCollateralFn, borrowFn],
                adapterParam,
                { value: ethers.utils.parseEther('10') },
            );
        let userCollateralShare = await mixologistDst.userCollateralShare(
            eoa1.address,
        );
        expect(userCollateralShare.eq(usdcMintValShare)).to.be.true;
        let borrowPart = await mixologistDst.userBorrowPart(eoa1.address);
        expect(borrowPart.gt(wethBorrowVal)).to.be.true;
    });

    it('should deposit, borrow, liquidate and fail-withdraw', async () => {
        const {
            registerMixologist,
            proxyDeployer,
            deployer,
            mediumRiskMC,
            yieldBox,
            bar,
            weth,
            wethAssetId,
            usdc,
            usdcAssetId,
            wethUsdcOracle,
            collateralSwapPath,
            tapSwapPath,
            eoa1,
            multiSwapper,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const loadSetup = async function loadSetupFn() {
            const {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
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
                collateralSwapPath,
                tapSwapPath,
                registerMixologist,
            );
            return {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
                lzEndpointSrc,
                lzEndpointDst,
            };
        };
        const {
            proxySrc,
            proxyDst,
            mixologistSrc,
            mixologistDst,
            lzEndpointSrc,
            lzEndpointDst,
        } = await loadFixture(loadSetup);

        // --- Lending ---
        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal.mul(10));

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await mixologistDst.assetId(),
            mintVal.mul(10),
            false,
        );
        await weth.approve(yieldBox.address, mintVal.mul(10));
        await yieldBox.depositAsset(
            await mixologistDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare,
        );

        // Approve mixologistDst actions
        await yieldBox.setApprovalForAll(mixologistDst.address, true);
        await mixologistDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await mixologistDst.balanceOf(deployer.address);
        let addAssetFn = mixologistDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [mixologistDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await mixologistDst.balanceOf(deployer.address);
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
            .setApprovalForAll(mixologistDst.address, true);
        await mixologistDst
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
        const addCollateralFn = mixologistDst.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [addCollateralFn],
                ethers.utils.toUtf8Bytes(''),
                { value: ethers.utils.parseEther('1') },
            );

        const userCollateralShare = await mixologistDst.userCollateralShare(
            eoa1.address,
        );
        const userCollateralAmount = await yieldBox.toAmount(
            usdcAssetId,
            userCollateralShare,
            false,
        );
        expect(userCollateralShare.eq(usdcMintValShare)).to.be.true;
        expect(userCollateralAmount.eq(usdcMintVal)).to.be.true;

        const borrowFn = mixologistDst.interface.encodeFunctionData('borrow', [
            eoa1.address,
            eoa1.address,
            wethBorrowVal,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [borrowFn],
                ethers.utils.toUtf8Bytes(''),
                { value: ethers.utils.parseEther('1') },
            );
        let borrowPart = await mixologistDst.userBorrowPart(eoa1.address);
        const remaining = borrowPart.sub(wethBorrowVal);
        expect(borrowPart.gt(wethBorrowVal)).to.be.true;

        const priceDrop = __wethUsdcPrice.mul(2).div(100);
        await wethUsdcOracle.set(__wethUsdcPrice.add(priceDrop));

        const data = new ethers.utils.AbiCoder().encode(['uint256'], [1]);
        const liquidateFn = mixologistDst.interface.encodeFunctionData(
            'liquidate',
            [[eoa1.address], [wethBorrowVal], multiSwapper.address, data, data],
        );

        const adapterParam = ethers.utils.solidityPack(
            ['uint16', 'uint256'],
            [1, 2250000],
        );
        await proxySrc.setMinDstGasLookup(
            await lzEndpointDst.getChainId(),
            1,
            1,
        );
        await proxySrc.setUseCustomAdapterParams(true);

        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [mixologistDst.address]),
            [liquidateFn],
            adapterParam,
            { value: ethers.utils.parseEther('1') },
        );

        const borrowPartFinal = await mixologistDst.userBorrowPart(
            eoa1.address,
        );
        expect(borrowPartFinal.lt(borrowPart)).to.be.true;
        expect(borrowPartFinal.eq(remaining)).to.be.true;

        await expect(
            yieldBox
                .connect(eoa1)
                .withdraw(
                    await mixologistDst.collateralId(),
                    eoa1.address,
                    eoa1.address,
                    0,
                    wethBorrowVal,
                ),
        ).to.be.reverted;
    });

    it('should withdraw fees through the proxy', async () => {
        const {
            registerMixologist,
            proxyDeployer,
            deployer,
            mediumRiskMC,
            yieldBox,
            bar,
            weth,
            wethAssetId,
            usdc,
            usdcAssetId,
            wethUsdcOracle,
            collateralSwapPath,
            tapSwapPath,
            eoa1,
            multiSwapper,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const loadSetup = async function loadSetupFn() {
            const {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
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
                collateralSwapPath,
                tapSwapPath,
                registerMixologist,
            );
            return {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
                lzEndpointSrc,
                lzEndpointDst,
            };
        };
        const {
            proxySrc,
            proxyDst,
            mixologistSrc,
            mixologistDst,
            lzEndpointSrc,
            lzEndpointDst,
        } = await loadFixture(loadSetup);

        // --- Lending ---
        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal.mul(10));

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await mixologistDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal.mul(10));
        await yieldBox.depositAsset(
            await mixologistDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare.mul(10),
        );

        // Approve mixologistDst actions
        await yieldBox.setApprovalForAll(mixologistDst.address, true);
        await mixologistDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await mixologistDst.balanceOf(deployer.address);
        let addAssetFn = mixologistDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [mixologistDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await mixologistDst.balanceOf(deployer.address);
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
            .setApprovalForAll(mixologistDst.address, true);
        await mixologistDst
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
        const addCollateralFn = mixologistDst.interface.encodeFunctionData(
            'addCollateral',
            [eoa1.address, eoa1.address, false, usdcMintValShare],
        );
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [addCollateralFn],
                ethers.utils.toUtf8Bytes(''),
                { value: ethers.utils.parseEther('1') },
            );

        const userCollateralShare = await mixologistDst.userCollateralShare(
            eoa1.address,
        );
        const userCollateralAmount = await yieldBox.toAmount(
            usdcAssetId,
            userCollateralShare,
            false,
        );
        expect(userCollateralShare.eq(usdcMintValShare)).to.be.true;
        expect(userCollateralAmount.eq(usdcMintVal)).to.be.true;

        const borrowFn = mixologistDst.interface.encodeFunctionData('borrow', [
            eoa1.address,
            eoa1.address,
            wethBorrowVal,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [borrowFn],
                ethers.utils.toUtf8Bytes(''),
                { value: ethers.utils.parseEther('1') },
            );
        let borrowPart = await mixologistDst.userBorrowPart(eoa1.address);
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
        const repayFn = mixologistDst.interface.encodeFunctionData('repay', [
            eoa1.address,
            eoa1.address,
            false,
            borrowPart,
        ]);
        await proxySrc
            .connect(eoa1)
            .executeOnChain(
                await lzEndpointDst.getChainId(),
                ethers.utils.solidityPack(['address'], [mixologistDst.address]),
                [repayFn],
                ethers.utils.toUtf8Bytes(''),
                { value: ethers.utils.parseEther('1') },
            );
        borrowPart = await mixologistDst.userBorrowPart(eoa1.address);
        expect(borrowPart.eq(0)).to.be.true;

        // Withdraw fees from BeachBar
        await expect(
            bar.withdrawAllProtocolFees(
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
        ).to.emit(mixologistDst, 'LogYieldBoxFeesDeposit');

        const mixologistFeeVeTap = await bar.feeVeTap();
        const tapAmountHarvested = await yieldBox.toAmount(
            await bar.tapAssetId(),
            await yieldBox.balanceOf(
                mixologistFeeVeTap,
                await bar.tapAssetId(),
            ),
            false,
        );
        const feesAmountInAsset = await mixologistDst.getAmountForAssetFraction(
            (
                await mixologistDst.accrueInfo()
            ).feesEarnedFraction,
        );
        // 0.31%
        const acceptableHarvestMargin = feesAmountInAsset.sub(
            feesAmountInAsset.mul(31).div(10000),
        );
        expect(tapAmountHarvested.gte(acceptableHarvestMargin)).to.be.true;
    });

    it('should do a flashloan through the proxy', async () => {
        const {
            registerMixologist,
            proxyDeployer,
            deployer,
            mediumRiskMC,
            yieldBox,
            bar,
            weth,
            wethAssetId,
            usdc,
            usdcAssetId,
            wethUsdcOracle,
            collateralSwapPath,
            tapSwapPath,
            eoa1,
            multiSwapper,
            __wethUsdcPrice,
        } = await loadFixture(register);

        const loadSetup = async function loadSetupFn() {
            const {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
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
                collateralSwapPath,
                tapSwapPath,
                registerMixologist,
            );
            return {
                proxySrc,
                proxyDst,
                mixologistSrc,
                mixologistDst,
                lzEndpointSrc,
                lzEndpointDst,
            };
        };
        const {
            proxySrc,
            proxyDst,
            mixologistSrc,
            mixologistDst,
            lzEndpointSrc,
            lzEndpointDst,
        } = await loadFixture(loadSetup);

        // --- Lending ---
        // Get assets
        const mintVal = ethers.BigNumber.from((1e18).toString()).mul(10);
        weth.freeMint(mintVal.mul(10));

        // Deposit assets to YieldBox
        const mintValShare = await yieldBox.toShare(
            await mixologistDst.assetId(),
            mintVal,
            false,
        );
        await weth.approve(yieldBox.address, mintVal.mul(10));
        await yieldBox.depositAsset(
            await mixologistDst.assetId(),
            deployer.address,
            deployer.address,
            0,
            mintValShare.mul(10),
        );

        // Approve mixologistDst actions
        await yieldBox.setApprovalForAll(mixologistDst.address, true);
        await mixologistDst.approve(
            proxyDst.address,
            ethers.constants.MaxUint256,
        );

        const balanceBefore = await mixologistDst.balanceOf(deployer.address);
        let addAssetFn = mixologistDst.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, mintValShare],
        );
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [mixologistDst.address]),
            [addAssetFn],
            ethers.utils.toUtf8Bytes(''),
            { value: ethers.utils.parseEther('1') },
        );
        const balanceAfter = await mixologistDst.balanceOf(deployer.address);
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
        await proxySrc.setMinDstGasLookup(
            await lzEndpointDst.getChainId(),
            1,
            1,
        );
        await proxySrc.setUseCustomAdapterParams(true);

        const flashLoanFn = mixologistDst.interface.encodeFunctionData(
            'flashLoan',
            [
                operator.address,
                operator.address,
                mintVal,
                ethers.utils.hexlify(0),
            ],
        );

        const feesEarnedBefore = (await mixologistDst.accrueInfo())[2];
        await proxySrc.executeOnChain(
            await lzEndpointDst.getChainId(),
            ethers.utils.solidityPack(['address'], [mixologistDst.address]),
            [flashLoanFn],
            adapterParam,
            { value: ethers.utils.parseEther('1') },
        );
        const feesEarnedAfter = (await mixologistDst.accrueInfo())[2];
        expect(feesEarnedAfter.gt(feesEarnedBefore)).to.be.true;
    });
});

//--------------------- helpers
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
    collateralSwapPath: any,
    tapSwapPath: any,
    registerMixologist: any,
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
        'MXProxy',
        await proxyDeployer.proxies(0),
    );
    const proxyDst = await ethers.getContractAt(
        'MXProxy',
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

    //deploy mixologists
    const srcMixologistDeployments = await registerMixologist(
        mediumRiskMC.address,
        yieldBox,
        bar,
        weth,
        wethAssetId,
        usdc,
        usdcAssetId,
        wethUsdcOracle,
        collateralSwapPath,
        tapSwapPath,
    );
    const mixologistSrc = srcMixologistDeployments.wethUsdcMixologist;

    const dstMixologistDeployments = await registerMixologist(
        mediumRiskMC.address,
        yieldBox,
        bar,
        weth,
        wethAssetId,
        usdc,
        usdcAssetId,
        wethUsdcOracle,
        collateralSwapPath,
        tapSwapPath,
    );
    const mixologistDst = dstMixologistDeployments.wethUsdcMixologist;

    await proxySrc.updateMixologistStatus(mixologistSrc.address, true);
    await proxyDst.updateMixologistStatus(mixologistDst.address, true);
    await proxySrc.setEnforceSameAddress(false);
    await proxyDst.setEnforceSameAddress(false);

    const proxySrcMixologistSrcStatus = await proxySrc.mixologists(
        mixologistSrc.address,
    );
    const proxySrcMixologistDstStatus = await proxySrc.mixologists(
        mixologistDst.address,
    );
    expect(proxySrcMixologistSrcStatus).to.be.true;
    expect(proxySrcMixologistDstStatus).to.be.false;

    const proxyDstMixologistSrcStatus = await proxyDst.mixologists(
        mixologistSrc.address,
    );
    const proxyDstMixologistDstStatus = await proxyDst.mixologists(
        mixologistDst.address,
    );
    expect(proxyDstMixologistSrcStatus).to.be.false;
    expect(proxyDstMixologistDstStatus).to.be.true;
    return {
        proxySrc,
        proxyDst,
        mixologistSrc,
        mixologistDst,
        lzEndpointSrc,
        lzEndpointDst,
    };
}
