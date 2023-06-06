// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//LZ
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";

//TAPIOCA
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";
import "tapioca-periph/contracts/interfaces/IMagnetar.sol";
import "tapioca-periph/contracts/interfaces/IMarket.sol";

import "../BaseUSDOStorage.sol";

contract USDOMarketModule is BaseUSDOStorage {
    using RebaseLibrary for Rebase;
    using SafeERC20 for IERC20;

    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox
    ) BaseUSDOStorage(_lzEndpoint, _yieldBox) {}

    function sendAndLendOrRepay(
        address _from,
        address _to,
        uint16 lzDstChainId,
        IUSDOBase.ILendParams calldata lendParams,
        IUSDOBase.ISendOptions calldata options,
        IUSDOBase.IApproval[] calldata approvals
    ) external payable {
        bytes32 toAddress = LzLib.addressToBytes32(_to);
        _debitFrom(
            _from,
            lzEndpoint.getChainId(),
            toAddress,
            lendParams.amount
        );

        bytes memory lzPayload = abi.encode(
            PT_YB_SEND_SGL_LEND_OR_REPAY,
            _from,
            _to,
            toAddress,
            lendParams,
            approvals
        );

        bytes memory adapterParam = LzLib.buildDefaultAdapterParams(
            options.extraGasLimit
        );

        _lzSend(
            lzDstChainId,
            lzPayload,
            payable(_from),
            options.zroPaymentAddress,
            adapterParam,
            msg.value
        );

        emit SendToChain(lzDstChainId, _from, toAddress, lendParams.amount);
    }

    function lend(uint16 _srcChainId, bytes memory _payload) public {
        (
            ,
            ,
            address to,
            ,
            IUSDOBase.ILendParams memory lendParams,
            IUSDOBase.IApproval[] memory approvals
        ) = abi.decode(
                _payload,
                (
                    uint16,
                    address,
                    address,
                    bytes32,
                    IUSDOBase.ILendParams,
                    IUSDOBase.IApproval[]
                )
            );

        if (approvals.length > 0) {
            _callApproval(approvals);
        }

        _creditTo(_srcChainId, address(this), lendParams.amount);

        // Use market helper to deposit and add asset to market
        approve(address(lendParams.marketHelper), lendParams.amount);
        if (lendParams.repay) {
            uint256 toRepayPart = _getRepayPart(
                lendParams.market,
                lendParams.amount
            );
            IMagnetar(lendParams.marketHelper).depositAndRepay(
                lendParams.market,
                to,
                lendParams.amount,
                toRepayPart,
                true,
                true
            );
        } else {
            IMagnetar(lendParams.marketHelper).depositAndAddAsset(
                lendParams.market,
                to,
                lendParams.amount,
                true,
                true
            );
        }
    }

    function _getRepayPart(
        address market,
        uint256 amount
    ) private view returns (uint256) {
        (uint128 totalBorrowElastic, uint128 totalBorrowBase) = IMarket(market)
            .totalBorrow();
        Rebase memory _totalBorrowed = Rebase(
            totalBorrowElastic,
            totalBorrowBase
        );

        return _totalBorrowed.toBase(amount, false);
    }

    function _callApproval(IUSDOBase.IApproval[] memory approvals) private {
        for (uint256 i = 0; i < approvals.length; ) {
            try
                IERC20Permit(approvals[i].target).permit(
                    approvals[i].owner,
                    approvals[i].spender,
                    approvals[i].value,
                    approvals[i].deadline,
                    approvals[i].v,
                    approvals[i].r,
                    approvals[i].s
                )
            {} catch Error(string memory reason) {
                if (!approvals[i].allowFailure) {
                    revert(reason);
                }
            }

            unchecked {
                ++i;
            }
        }
    }
}
