import { BigNumberish } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import writeJsonFile from 'write-json-file';

export const testGmxEarnCall__task = async (
    taskArgs: { tx: string },
    hre: HardhatRuntimeEnvironment,
) => {
    const ABI = [
        {
            inputs: [
                {
                    internalType: 'contract Router',
                    name: '_router',
                    type: 'address',
                },
                {
                    internalType: 'contract RoleStore',
                    name: '_roleStore',
                    type: 'address',
                },
                {
                    internalType: 'contract DataStore',
                    name: '_dataStore',
                    type: 'address',
                },
                {
                    internalType: 'contract EventEmitter',
                    name: '_eventEmitter',
                    type: 'address',
                },
                {
                    internalType: 'contract IDepositHandler',
                    name: '_depositHandler',
                    type: 'address',
                },
                {
                    internalType: 'contract IWithdrawalHandler',
                    name: '_withdrawalHandler',
                    type: 'address',
                },
                {
                    internalType: 'contract IOrderHandler',
                    name: '_orderHandler',
                    type: 'address',
                },
            ],
            stateMutability: 'nonpayable',
            type: 'constructor',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'adjustedClaimableAmount',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'claimedAmount',
                    type: 'uint256',
                },
            ],
            name: 'CollateralAlreadyClaimed',
            type: 'error',
        },
        {
            inputs: [{ internalType: 'bytes32', name: 'key', type: 'bytes32' }],
            name: 'DisabledFeature',
            type: 'error',
        },
        {
            inputs: [
                { internalType: 'address', name: 'market', type: 'address' },
            ],
            name: 'DisabledMarket',
            type: 'error',
        },
        {
            inputs: [
                { internalType: 'address', name: 'market', type: 'address' },
                { internalType: 'address', name: 'token', type: 'address' },
            ],
            name: 'EmptyAddressInMarketTokenBalanceValidation',
            type: 'error',
        },
        { inputs: [], name: 'EmptyDeposit', type: 'error' },
        { inputs: [], name: 'EmptyHoldingAddress', type: 'error' },
        { inputs: [], name: 'EmptyMarket', type: 'error' },
        { inputs: [], name: 'EmptyOrder', type: 'error' },
        { inputs: [], name: 'EmptyReceiver', type: 'error' },
        {
            inputs: [
                { internalType: 'address', name: 'token', type: 'address' },
            ],
            name: 'EmptyTokenTranferGasLimit',
            type: 'error',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'marketsLength',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'tokensLength',
                    type: 'uint256',
                },
            ],
            name: 'InvalidClaimAffiliateRewardsInput',
            type: 'error',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'marketsLength',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'tokensLength',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'timeKeysLength',
                    type: 'uint256',
                },
            ],
            name: 'InvalidClaimCollateralInput',
            type: 'error',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'marketsLength',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'tokensLength',
                    type: 'uint256',
                },
            ],
            name: 'InvalidClaimFundingFeesInput',
            type: 'error',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'marketsLength',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'tokensLength',
                    type: 'uint256',
                },
            ],
            name: 'InvalidClaimUiFeesInput',
            type: 'error',
        },
        {
            inputs: [
                { internalType: 'address', name: 'market', type: 'address' },
                { internalType: 'address', name: 'token', type: 'address' },
                { internalType: 'uint256', name: 'balance', type: 'uint256' },
                {
                    internalType: 'uint256',
                    name: 'expectedMinBalance',
                    type: 'uint256',
                },
            ],
            name: 'InvalidMarketTokenBalance',
            type: 'error',
        },
        {
            inputs: [
                { internalType: 'address', name: 'market', type: 'address' },
                { internalType: 'address', name: 'token', type: 'address' },
                { internalType: 'uint256', name: 'balance', type: 'uint256' },
                {
                    internalType: 'uint256',
                    name: 'claimableFundingFeeAmount',
                    type: 'uint256',
                },
            ],
            name: 'InvalidMarketTokenBalanceForClaimableFunding',
            type: 'error',
        },
        {
            inputs: [
                { internalType: 'address', name: 'market', type: 'address' },
                { internalType: 'address', name: 'token', type: 'address' },
                { internalType: 'uint256', name: 'balance', type: 'uint256' },
                {
                    internalType: 'uint256',
                    name: 'collateralAmount',
                    type: 'uint256',
                },
            ],
            name: 'InvalidMarketTokenBalanceForCollateralAmount',
            type: 'error',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'uiFeeFactor',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'maxUiFeeFactor',
                    type: 'uint256',
                },
            ],
            name: 'InvalidUiFeeFactor',
            type: 'error',
        },
        {
            inputs: [
                { internalType: 'address', name: 'token', type: 'address' },
                { internalType: 'address', name: 'receiver', type: 'address' },
                { internalType: 'uint256', name: 'amount', type: 'uint256' },
            ],
            name: 'TokenTransferError',
            type: 'error',
        },
        {
            inputs: [
                { internalType: 'address', name: 'msgSender', type: 'address' },
                { internalType: 'string', name: 'role', type: 'string' },
            ],
            name: 'Unauthorized',
            type: 'error',
        },
        {
            inputs: [{ internalType: 'bytes32', name: 'key', type: 'bytes32' }],
            name: 'cancelDeposit',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [{ internalType: 'bytes32', name: 'key', type: 'bytes32' }],
            name: 'cancelOrder',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [{ internalType: 'bytes32', name: 'key', type: 'bytes32' }],
            name: 'cancelWithdrawal',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address[]',
                    name: 'markets',
                    type: 'address[]',
                },
                {
                    internalType: 'address[]',
                    name: 'tokens',
                    type: 'address[]',
                },
                { internalType: 'address', name: 'receiver', type: 'address' },
            ],
            name: 'claimAffiliateRewards',
            outputs: [
                { internalType: 'uint256[]', name: '', type: 'uint256[]' },
            ],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address[]',
                    name: 'markets',
                    type: 'address[]',
                },
                {
                    internalType: 'address[]',
                    name: 'tokens',
                    type: 'address[]',
                },
                {
                    internalType: 'uint256[]',
                    name: 'timeKeys',
                    type: 'uint256[]',
                },
                { internalType: 'address', name: 'receiver', type: 'address' },
            ],
            name: 'claimCollateral',
            outputs: [
                { internalType: 'uint256[]', name: '', type: 'uint256[]' },
            ],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address[]',
                    name: 'markets',
                    type: 'address[]',
                },
                {
                    internalType: 'address[]',
                    name: 'tokens',
                    type: 'address[]',
                },
                { internalType: 'address', name: 'receiver', type: 'address' },
            ],
            name: 'claimFundingFees',
            outputs: [
                { internalType: 'uint256[]', name: '', type: 'uint256[]' },
            ],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'address[]',
                    name: 'markets',
                    type: 'address[]',
                },
                {
                    internalType: 'address[]',
                    name: 'tokens',
                    type: 'address[]',
                },
                { internalType: 'address', name: 'receiver', type: 'address' },
            ],
            name: 'claimUiFees',
            outputs: [
                { internalType: 'uint256[]', name: '', type: 'uint256[]' },
            ],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                {
                    components: [
                        {
                            internalType: 'address',
                            name: 'receiver',
                            type: 'address',
                        },
                        {
                            internalType: 'address',
                            name: 'callbackContract',
                            type: 'address',
                        },
                        {
                            internalType: 'address',
                            name: 'uiFeeReceiver',
                            type: 'address',
                        },
                        {
                            internalType: 'address',
                            name: 'market',
                            type: 'address',
                        },
                        {
                            internalType: 'address',
                            name: 'initialLongToken',
                            type: 'address',
                        },
                        {
                            internalType: 'address',
                            name: 'initialShortToken',
                            type: 'address',
                        },
                        {
                            internalType: 'address[]',
                            name: 'longTokenSwapPath',
                            type: 'address[]',
                        },
                        {
                            internalType: 'address[]',
                            name: 'shortTokenSwapPath',
                            type: 'address[]',
                        },
                        {
                            internalType: 'uint256',
                            name: 'minMarketTokens',
                            type: 'uint256',
                        },
                        {
                            internalType: 'bool',
                            name: 'shouldUnwrapNativeToken',
                            type: 'bool',
                        },
                        {
                            internalType: 'uint256',
                            name: 'executionFee',
                            type: 'uint256',
                        },
                        {
                            internalType: 'uint256',
                            name: 'callbackGasLimit',
                            type: 'uint256',
                        },
                    ],
                    internalType: 'struct DepositUtils.CreateDepositParams',
                    name: 'params',
                    type: 'tuple',
                },
            ],
            name: 'createDeposit',
            outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                {
                    components: [
                        {
                            components: [
                                {
                                    internalType: 'address',
                                    name: 'receiver',
                                    type: 'address',
                                },
                                {
                                    internalType: 'address',
                                    name: 'callbackContract',
                                    type: 'address',
                                },
                                {
                                    internalType: 'address',
                                    name: 'uiFeeReceiver',
                                    type: 'address',
                                },
                                {
                                    internalType: 'address',
                                    name: 'market',
                                    type: 'address',
                                },
                                {
                                    internalType: 'address',
                                    name: 'initialCollateralToken',
                                    type: 'address',
                                },
                                {
                                    internalType: 'address[]',
                                    name: 'swapPath',
                                    type: 'address[]',
                                },
                            ],
                            internalType:
                                'struct BaseOrderUtils.CreateOrderParamsAddresses',
                            name: 'addresses',
                            type: 'tuple',
                        },
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'sizeDeltaUsd',
                                    type: 'uint256',
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'initialCollateralDeltaAmount',
                                    type: 'uint256',
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'triggerPrice',
                                    type: 'uint256',
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'acceptablePrice',
                                    type: 'uint256',
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'executionFee',
                                    type: 'uint256',
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'callbackGasLimit',
                                    type: 'uint256',
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'minOutputAmount',
                                    type: 'uint256',
                                },
                            ],
                            internalType:
                                'struct BaseOrderUtils.CreateOrderParamsNumbers',
                            name: 'numbers',
                            type: 'tuple',
                        },
                        {
                            internalType: 'enum Order.OrderType',
                            name: 'orderType',
                            type: 'uint8',
                        },
                        {
                            internalType: 'enum Order.DecreasePositionSwapType',
                            name: 'decreasePositionSwapType',
                            type: 'uint8',
                        },
                        { internalType: 'bool', name: 'isLong', type: 'bool' },
                        {
                            internalType: 'bool',
                            name: 'shouldUnwrapNativeToken',
                            type: 'bool',
                        },
                        {
                            internalType: 'bytes32',
                            name: 'referralCode',
                            type: 'bytes32',
                        },
                    ],
                    internalType: 'struct BaseOrderUtils.CreateOrderParams',
                    name: 'params',
                    type: 'tuple',
                },
            ],
            name: 'createOrder',
            outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                {
                    components: [
                        {
                            internalType: 'address',
                            name: 'receiver',
                            type: 'address',
                        },
                        {
                            internalType: 'address',
                            name: 'callbackContract',
                            type: 'address',
                        },
                        {
                            internalType: 'address',
                            name: 'uiFeeReceiver',
                            type: 'address',
                        },
                        {
                            internalType: 'address',
                            name: 'market',
                            type: 'address',
                        },
                        {
                            internalType: 'address[]',
                            name: 'longTokenSwapPath',
                            type: 'address[]',
                        },
                        {
                            internalType: 'address[]',
                            name: 'shortTokenSwapPath',
                            type: 'address[]',
                        },
                        {
                            internalType: 'uint256',
                            name: 'minLongTokenAmount',
                            type: 'uint256',
                        },
                        {
                            internalType: 'uint256',
                            name: 'minShortTokenAmount',
                            type: 'uint256',
                        },
                        {
                            internalType: 'bool',
                            name: 'shouldUnwrapNativeToken',
                            type: 'bool',
                        },
                        {
                            internalType: 'uint256',
                            name: 'executionFee',
                            type: 'uint256',
                        },
                        {
                            internalType: 'uint256',
                            name: 'callbackGasLimit',
                            type: 'uint256',
                        },
                    ],
                    internalType:
                        'struct WithdrawalUtils.CreateWithdrawalParams',
                    name: 'params',
                    type: 'tuple',
                },
            ],
            name: 'createWithdrawal',
            outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [],
            name: 'dataStore',
            outputs: [
                {
                    internalType: 'contract DataStore',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [],
            name: 'depositHandler',
            outputs: [
                {
                    internalType: 'contract IDepositHandler',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [],
            name: 'eventEmitter',
            outputs: [
                {
                    internalType: 'contract EventEmitter',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                { internalType: 'bytes[]', name: 'data', type: 'bytes[]' },
            ],
            name: 'multicall',
            outputs: [
                { internalType: 'bytes[]', name: 'results', type: 'bytes[]' },
            ],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [],
            name: 'orderHandler',
            outputs: [
                {
                    internalType: 'contract IOrderHandler',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [],
            name: 'roleStore',
            outputs: [
                {
                    internalType: 'contract RoleStore',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [],
            name: 'router',
            outputs: [
                { internalType: 'contract Router', name: '', type: 'address' },
            ],
            stateMutability: 'view',
            type: 'function',
        },
        {
            inputs: [
                { internalType: 'address', name: 'receiver', type: 'address' },
                { internalType: 'uint256', name: 'amount', type: 'uint256' },
            ],
            name: 'sendNativeToken',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                { internalType: 'address', name: 'token', type: 'address' },
                { internalType: 'address', name: 'receiver', type: 'address' },
                { internalType: 'uint256', name: 'amount', type: 'uint256' },
            ],
            name: 'sendTokens',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                { internalType: 'address', name: 'receiver', type: 'address' },
                { internalType: 'uint256', name: 'amount', type: 'uint256' },
            ],
            name: 'sendWnt',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                { internalType: 'address', name: 'market', type: 'address' },
                {
                    internalType: 'address',
                    name: 'callbackContract',
                    type: 'address',
                },
            ],
            name: 'setSavedCallbackContract',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                {
                    internalType: 'uint256',
                    name: 'uiFeeFactor',
                    type: 'uint256',
                },
            ],
            name: 'setUiFeeFactor',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                { internalType: 'bytes32', name: 'key', type: 'bytes32' },
                {
                    components: [
                        {
                            internalType: 'address[]',
                            name: 'primaryTokens',
                            type: 'address[]',
                        },
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'min',
                                    type: 'uint256',
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'max',
                                    type: 'uint256',
                                },
                            ],
                            internalType: 'struct Price.Props[]',
                            name: 'primaryPrices',
                            type: 'tuple[]',
                        },
                    ],
                    internalType: 'struct OracleUtils.SimulatePricesParams',
                    name: 'simulatedOracleParams',
                    type: 'tuple',
                },
            ],
            name: 'simulateExecuteDeposit',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                { internalType: 'bytes32', name: 'key', type: 'bytes32' },
                {
                    components: [
                        {
                            internalType: 'address[]',
                            name: 'primaryTokens',
                            type: 'address[]',
                        },
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'min',
                                    type: 'uint256',
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'max',
                                    type: 'uint256',
                                },
                            ],
                            internalType: 'struct Price.Props[]',
                            name: 'primaryPrices',
                            type: 'tuple[]',
                        },
                    ],
                    internalType: 'struct OracleUtils.SimulatePricesParams',
                    name: 'simulatedOracleParams',
                    type: 'tuple',
                },
            ],
            name: 'simulateExecuteOrder',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                { internalType: 'bytes32', name: 'key', type: 'bytes32' },
                {
                    components: [
                        {
                            internalType: 'address[]',
                            name: 'primaryTokens',
                            type: 'address[]',
                        },
                        {
                            components: [
                                {
                                    internalType: 'uint256',
                                    name: 'min',
                                    type: 'uint256',
                                },
                                {
                                    internalType: 'uint256',
                                    name: 'max',
                                    type: 'uint256',
                                },
                            ],
                            internalType: 'struct Price.Props[]',
                            name: 'primaryPrices',
                            type: 'tuple[]',
                        },
                    ],
                    internalType: 'struct OracleUtils.SimulatePricesParams',
                    name: 'simulatedOracleParams',
                    type: 'tuple',
                },
            ],
            name: 'simulateExecuteWithdrawal',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [
                { internalType: 'bytes32', name: 'key', type: 'bytes32' },
                {
                    internalType: 'uint256',
                    name: 'sizeDeltaUsd',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'acceptablePrice',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'triggerPrice',
                    type: 'uint256',
                },
                {
                    internalType: 'uint256',
                    name: 'minOutputAmount',
                    type: 'uint256',
                },
            ],
            name: 'updateOrder',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
        },
        {
            inputs: [],
            name: 'withdrawalHandler',
            outputs: [
                {
                    internalType: 'contract IWithdrawalHandler',
                    name: '',
                    type: 'address',
                },
            ],
            stateMutability: 'view',
            type: 'function',
        },
    ];

    console.log('retrieving tx');
    const tx = await hre.ethers.provider.getTransaction(taskArgs.tx);
    const iface = new ethers.utils.Interface(ABI);
    const decodedInput = iface.parseTransaction({
        data: tx.data,
        value: tx.value,
    });

    console.log('-------------------------------------');
    const txDetails = {
        function_name: decodedInput.name,
        from: tx.from,
        input: decodedInput.args[0],
        erc20Value: Number(decodedInput.args[1]),
    };
    console.log(
        `------------------------------------- ${txDetails.input.length}`,
    );

    const decodedCalls = decodeMulticall(hre, ABI, txDetails.input);
    // console.log(`decoded data ${decodedCalls}`);
    console.log(`decoded data ${JSON.stringify(decodedCalls)}`);
    // for(var i=0; i<decodedCalls.length; i++) {
    //     console.log('-----------');
    //     const functionData = iface.decodeFunctionData(decodedCalls[i]?.name, decodedCalls[i]?.args);
    //     console.log(`functionData ${functionData}`)
    // }
};

const decodeMulticall = (
    hre: HardhatRuntimeEnvironment,
    abi: ReadonlyArray<any>,
    calls: string[],
) => {
    const abiInterface = new hre.ethers.utils.Interface(abi);

    return calls.map((call) => {
        try {
            const func = call.slice(0, 10);
            const decodedArgs = abiInterface.decodeFunctionData(func, call);
            const functionName = abiInterface.getFunction(func).name;
            console.log(`func ${functionName}, args ${decodedArgs}`);
            return { name: functionName, args: decodedArgs };
        } catch (ex) {
            console.log(`ex ${ex}`);
            return; // you could return a type here to indicate it was not parsed
        }
    });
};
