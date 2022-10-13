import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('MXProxy', () => {
    it.only('text mixologists from different layers', async () => {
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

        //omnichain configuration
        const chainIdSrc = 1;
        const chainIdDst = 2;

        const LZEndpointMock = await ethers.getContractFactory(
            'LZEndpointMock',
        );

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

        lzEndpointSrc.setDestLzEndpoint(
            proxyDst.address,
            lzEndpointDst.address,
        );
        lzEndpointDst.setDestLzEndpoint(
            proxySrc.address,
            lzEndpointSrc.address,
        );

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
    });
});
