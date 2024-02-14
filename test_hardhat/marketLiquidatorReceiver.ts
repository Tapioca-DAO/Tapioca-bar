import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import _ from 'lodash';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { MockSwapper__factory } from '@tapioca-sdk/typechain/tapioca-mocks';

describe.skip('MarketLiquidatorReceiver test', () => {
    it('should perform a swap', async () => {
        const { usdc, weth, deployer, multiSwapper, wethUsdcOracle, eoa1 } =
            await loadFixture(register);

        const factory = await ethers.getContractFactory(
            'MarketLiquidatorReceiver',
        );
        const liquidator = await factory.deploy();
        await liquidator.deployed();

        const MockSwapper = new MockSwapper__factory(deployer);
        const swapper = await MockSwapper.deploy(ethers.constants.AddressZero);

        await liquidator.assignSwapper(usdc.address, swapper.address);

        await wethUsdcOracle.set(ethers.utils.parseEther('1'));
        await liquidator.assignOracle(
            usdc.address,
            wethUsdcOracle.address,
            ethers.utils.toUtf8Bytes(''),
            ethers.utils.parseEther('1'),
        );

        await weth.freeMint(ethers.utils.parseEther('10'));
        await usdc.freeMint(ethers.utils.parseEther('10'));

        await weth.transfer(swapper.address, ethers.utils.parseEther('10'));
        await usdc.transfer(liquidator.address, ethers.utils.parseEther('10'));

        await expect(
            liquidator
                .connect(eoa1)
                .onCollateralReceiver(
                    deployer.address,
                    usdc.address,
                    weth.address,
                    ethers.utils.parseEther('10'),
                    defaultAbiCoder.encode(['uint256'], [50]),
                ),
        ).to.be.reverted;
        await liquidator.increaseAllowance(
            eoa1.address,
            usdc.address,
            ethers.utils.parseEther('5'),
        );
        await expect(
            liquidator
                .connect(eoa1)
                .onCollateralReceiver(
                    deployer.address,
                    usdc.address,
                    weth.address,
                    ethers.utils.parseEther('10'),
                    defaultAbiCoder.encode(['uint256'], [50]),
                ),
        ).to.be.reverted;
        await liquidator.increaseAllowance(
            eoa1.address,
            usdc.address,
            ethers.utils.parseEther('5'),
        );

        let eoa1Balance = await weth.balanceOf(eoa1.address);
        expect(eoa1Balance.eq(0)).to.be.true;
        await expect(
            liquidator
                .connect(eoa1)
                .onCollateralReceiver(
                    deployer.address,
                    usdc.address,
                    weth.address,
                    ethers.utils.parseEther('10'),
                    defaultAbiCoder.encode(
                        ['uint256'],
                        [ethers.utils.parseEther('10')],
                    ),
                ),
        ).to.not.be.reverted;
        eoa1Balance = await weth.balanceOf(eoa1.address);
        expect(eoa1Balance.eq(ethers.utils.parseEther('10'))).to.be.true;
    });
});
