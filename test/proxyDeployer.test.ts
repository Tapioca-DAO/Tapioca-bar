import { expect } from 'chai';
import { ethers } from 'hardhat';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';

describe('Proxy Deployer', () => {
    it('Should deploy a proxy contract', async () => {
        const { lzEndpointContract, proxyDeployer, deployer } =
            await loadFixture(register);

        const saltStr = `Proxy${
            (await ethers.provider.getNetwork()).chainId
        }${await lzEndpointContract.getChainId()}`;
        const salt = ethers.utils.formatBytes32String(saltStr);

        await proxyDeployer.deployWithCreate2(lzEndpointContract.address, salt);

        const count = await proxyDeployer.proxiesCount();
        expect(count).to.eq(1);

        const proxy = await proxyDeployer.proxies(0);

        const proxyContract = await ethers.getContractAt('MXProxy', proxy);
        const proxyOwner = await proxyContract.owner();
        expect(proxyOwner.toLowerCase()).to.eq(deployer.address.toLowerCase());
        const lzEndpoint = await proxyContract.lzEndpoint();
        expect(lzEndpoint.toLowerCase()).to.eq(
            lzEndpointContract.address.toLowerCase(),
        );
    });

    it('Should try to deploy twice', async () => {
        const { lzEndpointContract, proxyDeployer, deployer } =
            await loadFixture(register);

        let saltStr = `Proxy${
            (await ethers.provider.getNetwork()).chainId
        }${await lzEndpointContract.getChainId()}`;
        let salt = ethers.utils.formatBytes32String(saltStr);

        await proxyDeployer.deployWithCreate2(lzEndpointContract.address, salt);
        let count = await proxyDeployer.proxiesCount();
        expect(count).to.eq(1);
        await expect(
            proxyDeployer.deployWithCreate2(lzEndpointContract.address, salt),
        ).to.be.reverted;

        salt = ethers.utils.formatBytes32String('newsalt');
        await proxyDeployer.deployWithCreate2(lzEndpointContract.address, salt);
        count = await proxyDeployer.proxiesCount();
        expect(count).to.eq(2);
    });
});
