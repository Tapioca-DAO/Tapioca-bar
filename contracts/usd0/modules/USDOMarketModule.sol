// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//LZ
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";

//TAPIOCA
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";
import "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";
import "tapioca-periph/contracts/interfaces/IMagnetar.sol";
import "tapioca-periph/contracts/interfaces/IMarket.sol";
import "tapioca-periph/contracts/interfaces/ISingularity.sol";
import "tapioca-periph/contracts/interfaces/IPermitBorrow.sol";
import "tapioca-periph/contracts/interfaces/IPermitAll.sol";

import "../BaseUSDOStorage.sol";

contract USDOMarketModule is BaseUSDOStorage {
    using RebaseLibrary for Rebase;
    using SafeERC20 for IERC20;

    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox
    ) BaseUSDOStorage(_lzEndpoint, _yieldBox) {}

    function removeAsset(
        address from,
        address to,
        uint16 lzDstChainId,
        ITapiocaOFT.IWithdrawParams calldata withdrawParams,
        IUSDOBase.ISendOptions calldata options,
        IUSDOBase.IRemoveParams calldata removeParams,
        IUSDOBase.IApproval[] calldata approvals,
        bytes calldata adapterParams
    ) external payable {
        bytes32 toAddress = LzLib.addressToBytes32(to);

        bytes memory lzPayload = abi.encode(
            PT_MARKET_REMOVE_ASSET,
            from,
            to,
            toAddress,
            removeParams,
            withdrawParams,
            approvals
        );

        _lzSend(
            lzDstChainId,
            lzPayload,
            payable(from),
            options.zroPaymentAddress,
            adapterParams,
            msg.value
        );

        emit SendToChain(lzDstChainId, from, toAddress, 0);
    }

    function sendAndLendOrRepay(
        address _from,
        address _to,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        IUSDOBase.ILendParams calldata lendParams,
        IUSDOBase.IApproval[] calldata approvals,
        ITapiocaOFT.IWithdrawParams calldata withdrawParams,
        bytes calldata adapterParams
    ) external payable {
        bytes32 toAddress = LzLib.addressToBytes32(_to);
        _debitFrom(
            _from,
            lzEndpoint.getChainId(),
            toAddress,
            lendParams.depositAmount
        );

        bytes memory lzPayload = abi.encode(
            PT_YB_SEND_SGL_LEND_OR_REPAY,
            _from,
            _to,
            lendParams,
            approvals,
            withdrawParams
        );

        _lzSend(
            lzDstChainId,
            lzPayload,
            payable(_from),
            zroPaymentAddress,
            adapterParams,
            msg.value
        );

        emit SendToChain(
            lzDstChainId,
            _from,
            toAddress,
            lendParams.depositAmount
        );
    }

    function remove(bytes memory _payload) public {
        (
            ,
            ,
            address to,
            ,
            IUSDOBase.IRemoveParams memory removeParams,
            ITapiocaOFT.IWithdrawParams memory withdrawParams,
            IUSDOBase.IApproval[] memory approvals
        ) = abi.decode(
                _payload,
                (
                    uint16,
                    address,
                    address,
                    bytes32,
                    IUSDOBase.IRemoveParams,
                    ITapiocaOFT.IWithdrawParams,
                    IUSDOBase.IApproval[]
                )
            );

        if (approvals.length > 0) {
            _callApproval(approvals);
        }

        approve(removeParams.market, removeParams.share);
        ISingularity(removeParams.market).removeAsset(
            to,
            to,
            removeParams.share
        );
        address ybAddress = IMarket(removeParams.market).yieldBox();
        uint256 assetId = IMarket(removeParams.market).assetId();
        if (withdrawParams.withdraw) {
            IMagnetar(removeParams.marketHelper).withdrawTo{
                value: withdrawParams.withdrawLzFeeAmount
            }(
                ybAddress,
                to,
                assetId,
                withdrawParams.withdrawLzChainId,
                LzLib.addressToBytes32(to),
                IYieldBoxBase(ybAddress).toAmount(
                    assetId,
                    removeParams.share,
                    false
                ),
                removeParams.share,
                withdrawParams.withdrawAdapterParams,
                payable(to),
                withdrawParams.withdrawLzFeeAmount
            );
        }
    }

    function lend(
        address module,
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) public {
        (
            ,
            ,
            address to,
            IUSDOBase.ILendParams memory lendParams,
            IUSDOBase.IApproval[] memory approvals,
            ITapiocaOFT.IWithdrawParams memory withdrawParams
        ) = abi.decode(
                _payload,
                (
                    uint16,
                    address,
                    address,
                    IUSDOBase.ILendParams,
                    IUSDOBase.IApproval[],
                    ITapiocaOFT.IWithdrawParams
                )
            );

        uint256 balanceBefore = balanceOf(address(this));
        bool credited = creditedPackets[_srcChainId][_srcAddress][_nonce];
        if (!credited) {
            _creditTo(_srcChainId, address(this), lendParams.depositAmount);
            creditedPackets[_srcChainId][_srcAddress][_nonce] = true;
        }
        uint256 balanceAfter = balanceOf(address(this));

        (bool success, bytes memory reason) = module.delegatecall(
            abi.encodeWithSelector(
                this.lendInternal.selector,
                to,
                lendParams,
                approvals,
                withdrawParams
            )
        );

        if (!success) {
            if (balanceAfter - balanceBefore >= lendParams.depositAmount) {
                IERC20(address(this)).safeTransfer(
                    to,
                    lendParams.depositAmount
                );
            }
            revert(_getRevertMsg(reason)); //forward revert because it's handled by the main executor
        }

        emit ReceiveFromChain(_srcChainId, to, lendParams.depositAmount);
    }

    function lendInternal(
        address to,
        IUSDOBase.ILendParams memory lendParams,
        IUSDOBase.IApproval[] memory approvals,
        ITapiocaOFT.IWithdrawParams memory withdrawParams
    ) public payable {
        if (approvals.length > 0) {
            _callApproval(approvals);
        }

        // Use market helper to deposit and add asset to market
        approve(address(lendParams.marketHelper), lendParams.depositAmount);
        if (lendParams.repay) {
            IMagnetar(lendParams.marketHelper).depositAndRepay(
                lendParams.market,
                to,
                lendParams.depositAmount,
                lendParams.repayAmount,
                true,
                true
            );

            if (lendParams.removeCollateral) {
                IMarket(lendParams.market).removeCollateral(
                    to,
                    to,
                    lendParams.removeCollateralShare
                );
            }
            if (withdrawParams.withdraw) {
                address ybAddress = IMarket(lendParams.market).yieldBox();
                uint256 assetId = IMarket(lendParams.market).collateralId();
                IMagnetar(lendParams.marketHelper).withdrawTo{
                    value: withdrawParams.withdrawLzFeeAmount
                }(
                    ybAddress,
                    to,
                    assetId,
                    withdrawParams.withdrawLzChainId,
                    LzLib.addressToBytes32(to),
                    IYieldBoxBase(ybAddress).toAmount(
                        assetId,
                        lendParams.removeCollateralShare,
                        false
                    ),
                    lendParams.removeCollateralShare,
                    withdrawParams.withdrawAdapterParams,
                    payable(to),
                    withdrawParams.withdrawLzFeeAmount
                );
            }
        } else {
            IMagnetar(lendParams.marketHelper).depositAndAddAsset(
                lendParams.market,
                to,
                lendParams.depositAmount,
                true,
                true,
                lendParams.lockData,
                lendParams.participateData
            );
        }
    }

    function _callApproval(IUSDOBase.IApproval[] memory approvals) private {
        for (uint256 i = 0; i < approvals.length; ) {
            if (approvals[i].permitBorrow) {
                try
                    IPermitBorrow(approvals[i].target).permitBorrow(
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
            } else if (approvals[i].permitAll) {
                try
                    IPermitAll(approvals[i].target).permitAll(
                        approvals[i].owner,
                        approvals[i].spender,
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
            } else {
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
            }

            unchecked {
                ++i;
            }
        }
    }
}
