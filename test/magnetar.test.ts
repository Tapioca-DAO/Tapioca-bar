import { expect } from 'chai';
import hre, { ethers, config } from 'hardhat';
import { BN, register } from './test.utils';
import Wallet from 'ethereumjs-wallet';
import { signTypedMessage } from 'eth-sig-util';
import { fromRpcSig } from 'ethereumjs-utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { YieldBox } from '../typechain';

const MAX_DEADLINE = 9999999999999;

const name = 'My Token';
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

    const buildPermitAllData = (
        chainId: number,
        verifyingContract: string,
        owner: string,
        spender: string,
        nonce: number,
        deadline = MAX_DEADLINE,
    ) => ({
        primaryType: 'PermitAll',
        types: { EIP712Domain, PermitAll },
        domain: { name, version, chainId, verifyingContract },
        message: { owner, spender, nonce, deadline },
    });
    it('should test an array of permits', async () => {
        const { deployer, eoa1 } = await loadFixture(register);

        const magnetar = await (
            await ethers.getContractFactory('Magnetar')
        ).deploy();
        await magnetar.deployed();

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

        const permitEncoded = ethers.utils.defaultAbiCoder.encode(
            [
                'address',
                'address',
                'uint256',
                'uint256',
                'uint8',
                'bytes32',
                'bytes32',
                'bool',
            ],
            [
                tokenOne.address,
                eoa1.address,
                value,
                MAX_DEADLINE,
                v,
                r,
                s,
                false,
            ],
        );

        await magnetar.connect(deployer).burst([2], [permitEncoded]);

        const allowance = await tokenOne.allowance(
            deployer.address,
            eoa1.address,
        );
        expect(allowance.eq(value)).to.be.true;

        await expect(magnetar.connect(deployer).burst([2], [permitEncoded])).to
            .be.reverted;
    });

    it.only('should execute YB deposit asset', async () => {
        const { deployer, eoa1, yieldBox, createTokenEmptyStrategy } =
            await loadFixture(register);

        const magnetar = await (
            await ethers.getContractFactory('Magnetar')
        ).deploy();
        await magnetar.deployed();

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
            deployer.address,
            yieldBox.address,
            mintVal,
            nonce,
        );

        const signature = signTypedMessage(privateKey, { data });
        const { v, r, s } = fromRpcSig(signature);

        const permitEncoded = ethers.utils.defaultAbiCoder.encode(
            [
                'address',
                'address',
                'uint256',
                'uint256',
                'uint8',
                'bytes32',
                'bytes32',
                'bool',
            ],
            [
                tokenOne.address,
                yieldBox.address,
                mintVal,
                MAX_DEADLINE,
                v,
                r,
                s,
                false,
            ],
        );

        const permitAllSigData = await getYieldBoxPermitSignature(
            'all',
            deployer,
            yieldBox,
            magnetar.address,
            tokenOneAssetId.toNumber(),
        );
        const permitAllEncoded = ethers.utils.defaultAbiCoder.encode(
            [
                'address',
                'address',
                'uint256',
                'uint256',
                'uint8',
                'bytes32',
                'bytes32',
                'bool',
            ],
            [
                yieldBox.address,
                magnetar.address,
                mintVal,
                MAX_DEADLINE,
                permitAllSigData.v,
                permitAllSigData.r,
                permitAllSigData.s,
                false,
            ],
        );

        const depositAssetEncoded = ethers.utils.defaultAbiCoder.encode(
            ['address', 'address', 'uint256', 'uint256', 'uint256'],
            [
                yieldBox.address,
                deployer.address,
                0,
                mintValShare,
                tokenOneAssetId,
            ],
        );
        const magnetarStaticCallData = await magnetar
            .connect(deployer)
            .callStatic.burst(
                [2, 1, 7],
                [permitEncoded, permitAllEncoded, depositAssetEncoded],
            );

        await magnetar
            .connect(deployer)
            .burst(
                [2, 1, 7],
                [permitEncoded, permitAllEncoded, depositAssetEncoded],
            );

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
