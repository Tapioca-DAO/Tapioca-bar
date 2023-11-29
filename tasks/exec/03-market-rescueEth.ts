import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';
import { Penrose } from '../../typechain';

export const marketRescueEth__task = async (
    taskArgs: { market: string; amount: bigint; to: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const { contract: penrose } =
        await hre.SDK.hardhatUtils.getLocalContract<Penrose>(
            hre,
            'Penrose',
            tag,
        );

    const abi = `[
       {
        "inputs": [
            {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
            },
            {
            "internalType": "address",
            "name": "to",
            "type": "address"
            }
        ],
        "name": "rescueEth",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
        },  
    ]`;
    const iface = new hre.ethers.utils.Interface(abi);
    const callData = iface.encodeFunctionData('rescueEth', [
        taskArgs.amount,
        taskArgs.to,
    ]);
    await (
        await penrose.executeMarketFn([taskArgs.market], [callData], true)
    ).wait(3);
};
