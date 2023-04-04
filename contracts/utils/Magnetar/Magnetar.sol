// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

import "./MagnetarData.sol";

/*

__/\\\\\\\\\\\\\\\_____/\\\\\\\\\_____/\\\\\\\\\\\\\____/\\\\\\\\\\\_______/\\\\\_____________/\\\\\\\\\_____/\\\\\\\\\____        
 _\///////\\\/////____/\\\\\\\\\\\\\__\/\\\/////////\\\_\/////\\\///______/\\\///\\\________/\\\////////____/\\\\\\\\\\\\\__       
  _______\/\\\________/\\\/////////\\\_\/\\\_______\/\\\_____\/\\\_______/\\\/__\///\\\____/\\\/____________/\\\/////////\\\_      
   _______\/\\\_______\/\\\_______\/\\\_\/\\\\\\\\\\\\\/______\/\\\______/\\\______\//\\\__/\\\_____________\/\\\_______\/\\\_     
    _______\/\\\_______\/\\\\\\\\\\\\\\\_\/\\\/////////________\/\\\_____\/\\\_______\/\\\_\/\\\_____________\/\\\\\\\\\\\\\\\_    
     _______\/\\\_______\/\\\/////////\\\_\/\\\_________________\/\\\_____\//\\\______/\\\__\//\\\____________\/\\\/////////\\\_   
      _______\/\\\_______\/\\\_______\/\\\_\/\\\_________________\/\\\______\///\\\__/\\\_____\///\\\__________\/\\\_______\/\\\_  
       _______\/\\\_______\/\\\_______\/\\\_\/\\\______________/\\\\\\\\\\\____\///\\\\\/________\////\\\\\\\\\_\/\\\_______\/\\\_ 
        _______\///________\///________\///__\///______________\///////////_______\/////_____________\/////////__\///________\///__

*/

//TODO: decide if we should add whitelisted contracts or 'target' is always passed from outside
contract Magnetar is Ownable, MagnetarData {
    using BoringERC20 for IERC20;

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Batch multiple calls together
    /// @param actions The list of actions to perform
    /// @param callDatas The list of actions' data
    function burst(
        uint16[] calldata actions,
        bytes[] calldata callDatas
    ) external payable returns (Result[] memory returnData) {
        require(
            actions.length == callDatas.length,
            "Magnetar: array length mismatch"
        );
        require(actions.length > 0, "Magnetar: no objects around");

        uint256 valAccumulator;

        uint256 length = actions.length;
        returnData = new Result[](length);

        for (uint256 i = 0; i < length; i++) {
            uint16 _action = actions[i];
            bytes memory _actionCalldata = callDatas[i];

            if (_action == PERMIT_ALL) {
                _permit(_actionCalldata, true);
            } else if (_action == PERMIT) {
                _permit(_actionCalldata, false);
            } else if (_action == TOFT_WRAP) {
                WrapData memory data = abi.decode(_actionCalldata, (WrapData));
                if (data.isNative) {
                    unchecked {
                        valAccumulator += data.value;
                    }
                    ITOFTOperations(data.target).wrapNative{value: data.value}(
                        data.to
                    );
                } else {
                    ITOFTOperations(data.target).wrap(
                        msg.sender,
                        data.to,
                        data.value
                    );
                }
            } else if (_action == TOFT_SEND_FROM) {
                TOFTSendFromData memory data = abi.decode(
                    _actionCalldata,
                    (TOFTSendFromData)
                );
                unchecked {
                    valAccumulator += data.value;
                }
                ISendFrom(data.target).sendFrom{value: data.value}(
                    msg.sender,
                    data.dstChainId,
                    data.to,
                    data.amount,
                    data.callParams
                );
            } else if (_action == YB_DEPOSIT_ASSET) {
                YieldBoxDepositData memory data = abi.decode(
                    _actionCalldata,
                    (YieldBoxDepositData)
                );
                (uint256 amountOut, uint256 shareOut) = IDepositAsset(
                    data.target
                ).depositAsset(
                        data.assetId,
                        msg.sender,
                        data.to,
                        data.amount,
                        data.share
                    );
                returnData[i] = Result({
                    success: true,
                    returnData: abi.encode(amountOut, shareOut)
                });
            } else if (_action == SGL_ADD_COLLATERAL) {
                SGLAddCollateralData memory data = abi.decode(
                    _actionCalldata,
                    (SGLAddCollateralData)
                );
                ISingularityOperations(data.target).addCollateral(
                    msg.sender,
                    data.to,
                    data.skim,
                    data.share
                );
            } else if (_action == SGL_BORROW) {
                SGLBorrowData memory data = abi.decode(
                    _actionCalldata,
                    (SGLBorrowData)
                );
                (uint256 part, uint256 share) = ISingularityOperations(
                    data.target
                ).borrow(msg.sender, data.to, data.amount);
                returnData[i] = Result({
                    success: true,
                    returnData: abi.encode(part, share)
                });
            } else if (_action == SGL_WITHDRAW_TO) {
                SGLWithdrawToData memory data = abi.decode(
                    _actionCalldata,
                    (SGLWithdrawToData)
                );
                ISingularityOperations(data.target).withdrawTo(
                    msg.sender,
                    data.dstChainId,
                    data.receiver,
                    data.amount,
                    data.adapterParams,
                    data.refundAddress
                );
            } else if (_action == SGL_LEND) {
                SGLLendData memory data = abi.decode(
                    _actionCalldata,
                    (SGLLendData)
                );
                uint256 fraction = ISingularityOperations(data.target).addAsset(
                    msg.sender,
                    data.to,
                    data.skim,
                    data.share
                );
                returnData[i] = Result({
                    success: true,
                    returnData: abi.encode(fraction)
                });
            } else if (_action == SGL_REPAY) {
                SGLRepayData memory data = abi.decode(
                    _actionCalldata,
                    (SGLRepayData)
                );
                uint256 amount = ISingularityOperations(data.target).repay(
                    msg.sender,
                    data.to,
                    data.skim,
                    data.part
                );
                returnData[i] = Result({
                    success: true,
                    returnData: abi.encode(amount)
                });
            } else if (_action == TOFT_SEND_APPROVAL) {
                SendApprovalData memory data = abi.decode(
                    _actionCalldata,
                    (SendApprovalData)
                );

                ITOFTOperations(data.target).sendApproval{value: data.value}(
                    data.lzDstChainId,
                    data.approval,
                    data.sendOptions
                );
            } else if (_action == TOFT_SEND_AND_BORROW) {
                TOFTSendAndBorrowData memory data = abi.decode(
                    _actionCalldata,
                    (TOFTSendAndBorrowData)
                );

                ITOFTOperations(data.target).sendToYBAndBorrow{
                    value: data.value
                }(
                    msg.sender,
                    data.to,
                    data.amount,
                    data.borrowAmount,
                    data.marketHelper,
                    data.market,
                    data.lzDstChainId,
                    data.withdrawLzFeeAmount,
                    data.sendOptions
                );
            } else if (_action == TOFT_SEND_AND_LEND) {
                TOFTSendAndLendData memory data = abi.decode(
                    _actionCalldata,
                    (TOFTSendAndLendData)
                );

                ITOFTOperations(data.target).sendToYBAndLend{value: data.value}(
                    msg.sender,
                    data.to,
                    data.amount,
                    data.marketHelper,
                    data.market,
                    data.lzDstChainId,
                    data.sendOptions
                );
            } else if (_action == TOFT_SEND_YB) {
                TOFTSendToYBData memory data = abi.decode(
                    _actionCalldata,
                    (TOFTSendToYBData)
                );

                ITOFTOperations(data.target).sendToYB{value: data.value}(
                    msg.sender,
                    data.to,
                    data.amount,
                    data.assetId,
                    data.lzDstChainId,
                    data.sendOptions
                );
            } else if (_action == TOFT_RETRIEVE_YB) {
                TOFTRetrieveYBData memory data = abi.decode(
                    _actionCalldata,
                    (TOFTRetrieveYBData)
                );

                ITOFTOperations(data.target).retrieveFromYB{value: data.value}(
                    msg.sender,
                    data.amount,
                    data.assetId,
                    data.lzDstChainId,
                    data.zroPaymentAddress,
                    data.airdropAdapterParam,
                    data.strategyWithdrawal
                );
            } else {
                revert("Magnetar: action not valid");
            }
        }

        require(msg.value == valAccumulator, "Magnetar: value mismatch");
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// @notice Returns the block hash for the given block number
    /// @param blockNumber The block number
    function getBlockHash(
        uint256 blockNumber
    ) public view returns (bytes32 blockHash) {
        blockHash = blockhash(blockNumber);
    }

    /// @notice Returns the block number
    function getBlockNumber() public view returns (uint256 blockNumber) {
        blockNumber = block.number;
    }

    /// @notice Returns the block coinbase
    function getCurrentBlockCoinbase() public view returns (address coinbase) {
        coinbase = block.coinbase;
    }

    /// @notice Returns the block difficulty
    function getCurrentBlockDifficulty()
        public
        view
        returns (uint256 difficulty)
    {
        difficulty = block.prevrandao;
    }

    /// @notice Returns the block gas limit
    function getCurrentBlockGasLimit() public view returns (uint256 gaslimit) {
        gaslimit = block.gaslimit;
    }

    /// @notice Returns the block timestamp
    function getCurrentBlockTimestamp()
        public
        view
        returns (uint256 timestamp)
    {
        timestamp = block.timestamp;
    }

    /// @notice Returns the (ETH) balance of a given address
    function getEthBalance(address addr) public view returns (uint256 balance) {
        balance = addr.balance;
    }

    /// @notice Returns the block hash of the last block
    function getLastBlockHash() public view returns (bytes32 blockHash) {
        unchecked {
            blockHash = blockhash(block.number - 1);
        }
    }

    /// @notice Gets the base fee of the given block
    /// @notice Can revert if the BASEFEE opcode is not implemented by the given chain
    function getBasefee() public view returns (uint256 basefee) {
        basefee = block.basefee;
    }

    /// @notice Returns the chain id
    function getChainId() public view returns (uint256 chainid) {
        chainid = block.chainid;
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _permit(bytes memory actionCalldata, bool permitAll) private {
        PermitData memory permitData = abi.decode(actionCalldata, (PermitData));

        if (!permitAll) {
            IPermit(permitData.target).permit(
                msg.sender,
                permitData.spender,
                permitData.value,
                permitData.deadline,
                permitData.v,
                permitData.r,
                permitData.s
            );
        } else {
            IPermitAll(permitData.target).permitAll(
                msg.sender,
                permitData.spender,
                permitData.deadline,
                permitData.v,
                permitData.r,
                permitData.s
            );
        }
    }
}
