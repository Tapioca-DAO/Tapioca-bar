import { BigNumberish } from 'ethers';
import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { getDeployment, getSingularityContract } from './utils';

//npx hardhat sameChainBorrow --network arbitrum_goerli --market 0x0649Cc6e4A15362cB0318B78C4a76a84027DEaB4 --market-helper 0x8509121BB695EF285C4af446B9EF0Eae0a7B58aC --collateral-amount 5000000000000000000 --borrow-amount 10000000000000000000
export const sameChainBorrow__task = async (
    taskArgs: {
        market: string;
        marketHelper: string;
        collateralAmount: BigNumberish;
        borrowAmount: BigNumberish;
    },
    hre: HardhatRuntimeEnvironment,
) => {
    const { singularityContract, singularityAddress } =
        await getSingularityContract(taskArgs, hre);

    //Assets and contracts
    const collateral = await singularityContract.collateral();
    const asset = await singularityContract.asset();

    const yieldBoxContract = await hre.ethers.getContractAt(
        'YieldBox',
        await singularityContract.yieldBox(),
    );
    const collateralContract = await hre.ethers.getContractAt(
        '@boringcrypto/boring-solidity/contracts/interfaces/IERC20.sol:IERC20',
        collateral,
    );

    const marketHelperContract = await hre.ethers.getContractAt(
        'MarketsHelper',
        taskArgs.marketHelper,
    );

    //Approvals
    console.log(`\nApproving contracts...`);
    await (
        await yieldBoxContract.setApprovalForAll(singularityAddress, true)
    ).wait();
    await (
        await collateralContract.approve(
            marketHelperContract.address,
            taskArgs.collateralAmount,
        )
    ).wait();
    await (
        await singularityContract.approve(
            marketHelperContract.address,
            hre.ethers.constants.MaxUint256,
        )
    ).wait();

    //Execute
    console.log(`\nExecuting...`);
    await (
        await marketHelperContract.depositAddCollateralAndBorrow(
            singularityAddress,
            taskArgs.collateralAmount,
            taskArgs.borrowAmount,
            true,
            false,
            hre.ethers.utils.toUtf8Bytes(''),
            {
                gasLimit: 7920027,
            },
        )
    ).wait();
    console.log('Done');
};
