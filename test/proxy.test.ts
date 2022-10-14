import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('MXProxy', () => {
    it('add assets to mixologist from a different layers', async () => {
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
});

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
