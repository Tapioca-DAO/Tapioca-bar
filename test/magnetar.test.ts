import { expect } from 'chai';
import hre, { ethers, config } from 'hardhat';
import { BN, register } from './test.utils';
import Wallet from 'ethereumjs-wallet';
import { signTypedMessage } from 'eth-sig-util';
import { fromRpcSig } from 'ethereumjs-utils';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';



const MAX_DEADLINE = 9999999999999;

const name = 'My Token';
const symbol = 'MTKN';
const version = '1';

describe('Magnetar', () => {
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
    it.only('should test an array of permits', async () => {
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

        // await tokenOne.permit(
        //     deployer.address,
        //     eoa1.address,
        //     value,
        //     MAX_DEADLINE,
        //     v,
        //     r,
        //     s,
        // );
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

        await magnetar.connect(deployer).burst([2], [permitEncoded], false);

        const allowance = await tokenOne.allowance(
            deployer.address,
            eoa1.address,
        );
        expect(allowance.eq(value));

        await expect(
            magnetar.connect(deployer).burst([2], [permitEncoded], false),
        ).to.be.reverted;
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

async function getChainId(): Promise<number> {
    const chainIdHex = await hre.network.provider.send('eth_chainId', []);
    return BN(chainIdHex).toNumber();
}
