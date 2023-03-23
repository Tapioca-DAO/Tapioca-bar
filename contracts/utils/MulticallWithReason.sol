// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >0.8.0;

//Based on BaseBoringBatchable
contract MulticallWithReason {
    struct Call3 {
        address target;
        bool allowFailure;
        bytes callData;
    }

    struct Call3Value {
        address target;
        bool allowFailure;
        uint256 value;
        bytes callData;
    }

    struct Result {
        bool success;
        bytes returnData;
    }

    /// @dev Helper function to extract a useful revert message from a failed call.
    /// If the returned data is malformed or not correctly abi encoded then this call can fail itself.
    function _getRevertMsg(bytes memory _returnData) internal pure {
        // If the _res length is less than 68, then
        // the transaction failed with custom error or silently (without a revert message)
        if (_returnData.length < 68) revert("Reason unknown");

        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        revert(abi.decode(_returnData, (string))); // All that remains is the revert string
    }

    /// @notice Aggregate calls, ensuring each returns success
    /// @param calls An array of Call3 structs
    /// @return returnData An array of Result structs
    function multicall(
        Call3[] calldata calls
    ) public payable returns (Result[] memory returnData) {
        uint256 length = calls.length;
        returnData = new Result[](length);

        Call3 calldata calli;

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

    /// @notice Aggregate calls, ensuring each returns success
    /// @param calls An array of Call3 structs
    /// @return returnData An array of Result structs
    function multicallValue(
        Call3Value[] calldata calls
    ) public payable returns (Result[] memory returnData) {
        uint256 valAccumulator;
        uint256 length = calls.length;
        returnData = new Result[](length);

        Call3Value calldata calli;

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

        // Finally, make sure the msg.value = SUM(call[0...i].value)
        require(
            msg.value == valAccumulator,
            "MulticallWithReason: value mismatch"
        );
    }

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
}
