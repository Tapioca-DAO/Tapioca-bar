import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { getSingularityContract } from './utils';

//npx hardhat sameChainBorrow --network arbitrum_goerli --market 0xA67cA6C9874245c3c86F498836fA82D022A3F65d --market-helper 0x678488290Fa0240160cB159c3Dda2748d5413a5D --collateral-amount 2000000000000000000 --borrow-amount 10000000000000000000
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
    console.log('\nApproving contracts...');
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
    console.log('\nExecuting...');
    await (
        await marketHelperContract.depositAddCollateralAndBorrowFromMarket(
            singularityAddress,
            (
                await hre.ethers.getSigners()
            )[0].address,
            taskArgs.collateralAmount,
            taskArgs.borrowAmount,
            true,
            true,
            {
                withdraw: false,
                withdrawLzFeeAmount: 0,
                withdrawOnOtherChain: false,
                withdrawLzChainId: 0,
                withdrawAdapterParams: hre.ethers.utils.toUtf8Bytes(''),
            },
            {
                gasLimit: 7920027,
            },
        )
    ).wait();
    console.log('Done');
};
