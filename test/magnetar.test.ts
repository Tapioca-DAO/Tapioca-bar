import { expect } from 'chai';
import hre, { ethers, config } from 'hardhat';
import { BN, register } from './test.utils';
import { signTypedMessage } from 'eth-sig-util';
import { fromRpcSig } from 'ethereumjs-utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { YieldBox } from '../typechain';

const MAX_DEADLINE = 9999999999999;

const symbol = 'MTKN';
const version = '1';

describe('Magnetar', () => {
    async function getYieldBoxPermitSignature(
        permitType: 'asset' | 'all',
        wallet: SignerWithAddress,
        token: YieldBox,
        spender: string,
        assetId: number,
        deadline = MAX_DEADLINE,
        permitConfig?: {
            nonce?: any;
            name?: string;
            chainId?: number;
            version?: string;
        },
    ) {
        const [nonce, name, version, chainId] = await Promise.all([
            permitConfig?.nonce ?? token.nonces(wallet.address),
            'YieldBox',
            permitConfig?.version ?? '1',
            permitConfig?.chainId ?? wallet.getChainId(),
        ]);

        const typesInfo = [
            {
                name: 'owner',
                type: 'address',
            },
            {
                name: 'spender',
                type: 'address',
            },
            {
                name: 'assetId',
                type: 'uint256',
            },
            {
                name: 'nonce',
                type: 'uint256',
            },
            {
                name: 'deadline',
                type: 'uint256',
            },
        ];

        return ethers.utils.splitSignature(
            await wallet._signTypedData(
                {
                    name,
                    version,
                    chainId,
                    verifyingContract: token.address,
                },
                permitType === 'asset'
                    ? {
                          Permit: typesInfo,
                      }
                    : {
                          PermitAll: typesInfo.filter(
                              (x) =>
                                  permitType !== 'all' ||
                                  (permitType === 'all' &&
                                      x.name !== 'assetId'),
                          ),
                      },

                {
                    ...(permitType === 'all' ? {} : { assetId }),
                    owner: wallet.address,
                    spender,
                    assetId,
                    nonce,
                    deadline,
                },
            ),
        );
    }

    const buildData = (
        chainId: number,
        verifyingContract: string,
        name: string,
        owner: string,
        spender: string,
        value: number,
        nonce: number,
        deadline = MAX_DEADLINE,
    ) => ({
        primaryType: 'Permit',
        types: { EIP712Domain, Permit },
        domain: { name, version, chainId, verifyingContract },
        message: { owner, spender, value, nonce, deadline },
    });

    it('should test an array of permits', async () => {
        const { deployer, eoa1 } = await loadFixture(register);

        const magnetar = await (
            await ethers.getContractFactory('Magnetar')
        ).deploy();
        await magnetar.deployed();

        const name = 'Token One';

        const tokenOne = await (
            await ethers.getContractFactory('ERC20MockWithPermit')
        ).deploy(name, symbol, 0, 18, deployer.address);
        await tokenOne.deployed();

        const tokenTwo = await (
            await ethers.getContractFactory('ERC20MockWithPermit')
        ).deploy('TestTokenTwo', 'TWO', 0, 18, deployer.address);
        await tokenTwo.deployed();

        const chainId = await getChainId();
        const value = BN(42).toNumber();
        const nonce = 0;

        const accounts: any = config.networks.hardhat.accounts;
        const index = 0; // first wallet, increment for next wallets
        const deployerWallet = ethers.Wallet.fromMnemonic(
            accounts.mnemonic,
            accounts.path + `/${index}`,
        );
        const data = buildData(
            chainId,
            tokenOne.address,
            await tokenOne.name(),
            deployer.address,
            eoa1.address,
            value,
            nonce,
        );
        const privateKey = Buffer.from(
            deployerWallet.privateKey.substring(2, 66),
            'hex',
        );
        const signature = signTypedMessage(privateKey, { data });
        const { v, r, s } = fromRpcSig(signature);

        const permitEncodedFnData = tokenOne.interface.encodeFunctionData(
            'permit',
            [deployer.address, eoa1.address, value, MAX_DEADLINE, v, r, s],
        );

        await magnetar.connect(deployer).burst([
            {
                id: 2,
                target: tokenOne.address,
                value: 0,
                allowFailure: false,
                call: permitEncodedFnData,
            },
        ]);

        const allowance = await tokenOne.allowance(
            deployer.address,
            eoa1.address,
        );
        expect(allowance.eq(value)).to.be.true;

        await expect(
            magnetar.connect(deployer).burst([
                {
                    id: 2,
                    target: tokenOne.address,
                    value: 0,
                    allowFailure: false,
                    call: permitEncodedFnData,
                },
            ]),
        ).to.be.reverted;
    });

    it('should execute YB deposit asset', async () => {
        const { deployer, eoa1, yieldBox, createTokenEmptyStrategy } =
            await loadFixture(register);

        const magnetar = await (
            await ethers.getContractFactory('Magnetar')
        ).deploy();
        await magnetar.deployed();

        const name = 'Token One';

        const tokenOne = await (
            await ethers.getContractFactory('ERC20MockWithPermit')
        ).deploy(name, symbol, 0, 18, deployer.address);
        await tokenOne.deployed();

        const tokenOneStrategy = await createTokenEmptyStrategy(
            yieldBox.address,
            tokenOne.address,
        );

        await yieldBox.registerAsset(
            1,
            tokenOne.address,
            tokenOneStrategy.address,
            0,
        );
        const tokenOneAssetId = await yieldBox.ids(
            1,
            tokenOne.address,
            tokenOneStrategy.address,
            0,
        );

        const chainId = await getChainId();

        const mintVal = 1;
        tokenOne.freeMint(mintVal);

        const mintValShare = await yieldBox.toShare(
            tokenOneAssetId,
            mintVal,
            false,
        );

        const accounts: any = config.networks.hardhat.accounts;
        const deployerWallet = ethers.Wallet.fromMnemonic(
            accounts.mnemonic,
            accounts.path + '/0',
        );

        const privateKey = Buffer.from(
            deployerWallet.privateKey.substring(2, 66),
            'hex',
        );
        const nonce = 0;
        const data = buildData(
            chainId,
            tokenOne.address,
            await tokenOne.name(),
            deployer.address,
            yieldBox.address,
            mintVal,
            nonce,
        );

        const signature = signTypedMessage(privateKey, { data });
        const { v, r, s } = fromRpcSig(signature);

        const permitEncoded = tokenOne.interface.encodeFunctionData('permit', [
            deployer.address,
            yieldBox.address,
            mintVal,
            MAX_DEADLINE,
            v,
            r,
            s,
        ]);

        const permitAllSigData = await getYieldBoxPermitSignature(
            'all',
            deployer,
            yieldBox,
            magnetar.address,
            tokenOneAssetId.toNumber(),
        );
        const permitAllEncoded = yieldBox.interface.encodeFunctionData(
            'permitAll',
            [
                deployer.address,
                magnetar.address,
                MAX_DEADLINE,
                permitAllSigData.v,
                permitAllSigData.r,
                permitAllSigData.s,
            ],
        );

        const depositAssetEncoded = yieldBox.interface.encodeFunctionData(
            'depositAsset',
            [
                tokenOneAssetId,
                deployer.address,
                deployer.address,
                0,
                mintValShare,
            ],
        );

        const calls = [
            {
                id: 2,
                target: tokenOne.address,
                value: 0,
                allowFailure: false,
                call: permitEncoded,
            },
            {
                id: 1,
                target: yieldBox.address,
                value: 0,
                allowFailure: false,
                call: permitAllEncoded,
            },
            {
                id: 3,
                target: yieldBox.address,
                value: 0,
                allowFailure: false,
                call: depositAssetEncoded,
            },
        ];

        const magnetarStaticCallData = await magnetar
            .connect(deployer)
            .callStatic.burst(calls);

        await magnetar.connect(deployer).burst(calls);

        const ybBalance = await yieldBox.balanceOf(
            deployer.address,
            tokenOneAssetId,
        );
        expect(ybBalance.gt(0)).to.be.true;

        //test return data
        const depositReturnedData = ethers.utils.defaultAbiCoder.decode(
            ['uint256', 'uint256'],
            magnetarStaticCallData[2].returnData,
        );
        expect(depositReturnedData[0]).to.eq(1);
    });

    it('should lend', async () => {
        const {
            deployer,
            eoa1,
            yieldBox,
            createTokenEmptyStrategy,
            deployCurveStableToUsdoBidder,
            usd0,
            bar,
            __wethUsdcPrice,
            wethUsdcOracle,
            weth,
            wethAssetId,
            mediumRiskMC,
            usdc,
        } = await loadFixture(register);

        const magnetar = await (
            await ethers.getContractFactory('Magnetar')
        ).deploy();
        await magnetar.deployed();

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
        const _sglLendingBorrowingModule = await (
            await ethers.getContractFactory('SGLLendingBorrowing')
        ).deploy();
        await _sglLendingBorrowingModule.deployed();

        const collateralSwapPath = [usd0.address, weth.address];

        const newPrice = __wethUsdcPrice.div(1000000);
        await wethUsdcOracle.set(newPrice);

        const sglData = new ethers.utils.AbiCoder().encode(
            [
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
                _sglLendingBorrowingModule.address,
                bar.address,
                usd0.address,
                usdoAssetId,
                weth.address,
                wethAssetId,
                wethUsdcOracle.address,
                ethers.utils.parseEther('1'),
            ],
        );
        await bar.registerSingularity(mediumRiskMC.address, sglData, true);
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

        const liquidationQueue = await (
            await ethers.getContractFactory('LiquidationQueue')
        ).deploy();
        await liquidationQueue.deployed();

        const feeCollector = new ethers.Wallet(
            ethers.Wallet.createRandom().privateKey,
            ethers.provider,
        );

        const { stableToUsdoBidder } = await deployCurveStableToUsdoBidder(
            bar,
            usdc,
            usd0,
        );

        const LQ_META = {
            activationTime: 600, // 10min
            minBidAmount: ethers.BigNumber.from((1e18).toString()).mul(200), // 200 USDC
            closeToMinBidAmount: ethers.BigNumber.from((1e18).toString()).mul(
                202,
            ),
            defaultBidAmount: ethers.BigNumber.from((1e18).toString()).mul(400), // 400 USDC
            feeCollector: feeCollector.address,
            bidExecutionSwapper: ethers.constants.AddressZero,
            usdoSwapper: stableToUsdoBidder.address,
        };
        await liquidationQueue.init(LQ_META, wethUsdoSingularity.address);

        const payload = wethUsdoSingularity.interface.encodeFunctionData(
            'setLiquidationQueue',
            [liquidationQueue.address],
        );

        await (
            await bar.executeMarketFn(
                [wethUsdoSingularity.address],
                [payload],
                true,
            )
        ).wait();

        const usdoAmount = ethers.BigNumber.from((1e6).toString());
        const usdoShare = await yieldBox.toShare(
            usdoAssetId,
            usdoAmount,
            false,
        );
        await usd0.mint(deployer.address, usdoAmount);

        const chainId = await getChainId();

        const accounts: any = config.networks.hardhat.accounts;
        const deployerWallet = ethers.Wallet.fromMnemonic(
            accounts.mnemonic,
            accounts.path + '/0',
        );

        const privateKey = Buffer.from(
            deployerWallet.privateKey.substring(2, 66),
            'hex',
        );
        const nonce = 0;
        const data = buildData(
            chainId,
            usd0.address,
            await usd0.name(),
            deployer.address,
            yieldBox.address,
            usdoAmount.toNumber(),
            nonce,
        );

        const signature = signTypedMessage(privateKey, { data });
        const { v, r, s } = fromRpcSig(signature);

        const permitEncoded = usd0.interface.encodeFunctionData('permit', [
            deployer.address,
            yieldBox.address,
            usdoAmount,
            MAX_DEADLINE,
            v,
            r,
            s,
        ]);

        let permitAllSigData = await getYieldBoxPermitSignature(
            'all',
            deployer,
            yieldBox,
            magnetar.address,
            usdoAssetId.toNumber(),
        );
        const permitAllEncoded = yieldBox.interface.encodeFunctionData(
            'permitAll',
            [
                deployer.address,
                magnetar.address,
                MAX_DEADLINE,
                permitAllSigData.v,
                permitAllSigData.r,
                permitAllSigData.s,
            ],
        );

        permitAllSigData = await getYieldBoxPermitSignature(
            'all',
            deployer,
            yieldBox,
            wethUsdoSingularity.address,
            usdoAssetId.toNumber(),
            MAX_DEADLINE,
            { nonce: 1 },
        );
        const permitAllSGLEncoded = yieldBox.interface.encodeFunctionData(
            'permitAll',
            [
                deployer.address,
                wethUsdoSingularity.address,
                MAX_DEADLINE,
                permitAllSigData.v,
                permitAllSigData.r,
                permitAllSigData.s,
            ],
        );
        const depositAssetEncoded = yieldBox.interface.encodeFunctionData(
            'depositAsset',
            [usdoAssetId, deployer.address, deployer.address, 0, usdoShare],
        );

        const sglLendEncoded = wethUsdoSingularity.interface.encodeFunctionData(
            'addAsset',
            [deployer.address, deployer.address, false, usdoShare],
        );

        const calls = [
            {
                id: 2,
                target: usd0.address,
                value: 0,
                allowFailure: false,
                call: permitEncoded,
            },
            {
                id: 1,
                target: yieldBox.address,
                value: 0,
                allowFailure: false,
                call: permitAllEncoded,
            },
            {
                id: 1,
                target: yieldBox.address,
                value: 0,
                allowFailure: false,
                call: permitAllSGLEncoded,
            },
            {
                id: 3,
                target: yieldBox.address,
                value: 0,
                allowFailure: false,
                call: depositAssetEncoded,
            },
            {
                id: 8,
                target: wethUsdoSingularity.address,
                value: 0,
                allowFailure: false,
                call: sglLendEncoded,
            },
        ];

        await magnetar.connect(deployer).burst(calls);

        const ybBalance = await yieldBox.balanceOf(
            deployer.address,
            usdoAssetId,
        );
        expect(ybBalance.eq(0)).to.be.true;

        const sglBalance = await wethUsdoSingularity.balanceOf(
            deployer.address,
        );
        expect(sglBalance.gt(0)).to.be.true;
    });
});

const EIP712Domain = [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' },
];

const Permit = [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
];

const PermitAll = [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
];

async function getChainId(): Promise<number> {
    const chainIdHex = await hre.network.provider.send('eth_chainId', []);
    return BN(chainIdHex).toNumber();
}
