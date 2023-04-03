// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

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
        uint32[] calldata actions,
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
            uint32 _action = actions[i];
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
                    IWrap(data.target).wrapNative{value: data.value}(data.to);
                } else {
                    IWrap(data.target).wrap(msg.sender, data.to, data.value);
                }
            } else if (_action == TOFT_SEND_FROM) {
                SendFromData memory data = abi.decode(
                    _actionCalldata,
                    (SendFromData)
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
                YieldBoxDeposit memory data = abi.decode(
                    _actionCalldata,
                    (YieldBoxDeposit)
                );
                IDepositAsset(data.target).depositAsset(
                    data.assetId,
                    msg.sender,
                    data.to,
                    data.amount,
                    data.share
                );
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
                ISingularityOperations(data.target).borrow(
                    msg.sender,
                    data.to,
                    data.amount
                );
            } else if (_action == SGL_WITHDRAW_TO) {
                SGLWithdrawTo memory data = abi.decode(
                    _actionCalldata,
                    (SGLWithdrawTo)
                );
                ISingularityOperations(data.target).withdrawTo(
                    msg.sender,
                    data.dstChainId,
                    data.receiver,
                    data.amount,
                    data.adapterParams,
                    data.refundAddress
                );
            }
        }

        require(msg.value == valAccumulator, "Magnetar: value mismatch");

        //TODO compute return data
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

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

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

    //TODO: check if needed; probably not
    function _multicall(
        Call[] memory calls
    ) private returns (Result[] memory returnData) {
        uint256 length = calls.length;
        returnData = new Result[](length);
        Call memory calli;
        for (uint256 i = 0; i < length; ) {
            Result memory result = returnData[i];
            calli = calls[i];
            (result.success, result.returnData) = calli.target.call(
                calli.callData
            );
            if (!result.success) {
                _getRevertMsg(result.returnData);
            }
            unchecked {
                ++i;
            }
        }
    }

    //TODO: check if needed; probably not
    function _multicallValue(
        CallWithValue[] calldata calls
    ) private returns (Result[] memory returnData) {
        uint256 valAccumulator;
        uint256 length = calls.length;
        returnData = new Result[](length);
        CallWithValue memory calli;
        for (uint256 i = 0; i < length; ) {
            Result memory result = returnData[i];
            calli = calls[i];
            uint256 val = calli.value;

            unchecked {
                valAccumulator += val;
            }

            (result.success, result.returnData) = calli.target.call{value: val}(
                calli.callData
            );
            if (!result.success) {
                _getRevertMsg(result.returnData);
            }

            unchecked {
                ++i;
            }
        }
        require(msg.value == valAccumulator, "Magnetar: value mismatch");
    }

    function _getRevertMsg(bytes memory _returnData) private pure {
        if (_returnData.length < 68) revert("Magnetar: Reason unknown");

        assembly {
            _returnData := add(_returnData, 0x04)
        }
        revert(string.concat("Magnetar:", abi.decode(_returnData, (string))));
    }
}
