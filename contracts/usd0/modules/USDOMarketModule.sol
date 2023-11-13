// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//LZ
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";

//TAPIOCA
// import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";

import "./USDOCommon.sol";

contract USDOMarketModule is USDOCommon {
    // using RebaseLibrary for Rebase;
    using SafeERC20 for IERC20;

    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox,
        ICluster _cluster
    ) BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster) {}

    function removeAsset(
        address from,
        address to,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        bytes calldata adapterParams,
        ICommonData.ICommonExternalContracts calldata externalData,
        IUSDOBase.IRemoveAndRepay calldata removeAndRepayData,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IApproval[] calldata revokes
    ) external payable {
        //allowance is also checked on SGl
        if (from != msg.sender) {
            if (removeAndRepayData.removeAssetFromSGL) {
                require(
                    allowance(from, msg.sender) >=
                        removeAndRepayData.removeAmount,
                    "UDSO: sender not approved"
                );
                _spendAllowance(
                    from,
                    msg.sender,
                    removeAndRepayData.removeAmount
                );
            }

            if (removeAndRepayData.removeCollateralFromBB) {
                require(
                    allowance(from, msg.sender) >=
                        removeAndRepayData.collateralAmount,
                    "UDSO: sender not approved"
                );
                _spendAllowance(
                    from,
                    msg.sender,
                    removeAndRepayData.collateralAmount
                );
            }
        }

        (, , uint256 airdropAmount, ) = LzLib.decodeAdapterParams(
            adapterParams
        );
        bytes memory lzPayload = abi.encode(
            PT_MARKET_REMOVE_ASSET,
            to,
            externalData,
            removeAndRepayData,
            approvals,
            revokes,
            airdropAmount
        );

        _checkAdapterParams(
            lzDstChainId,
            PT_MARKET_REMOVE_ASSET,
            adapterParams,
            NO_EXTRA_GAS
        );

        _lzSend(
            lzDstChainId,
            lzPayload,
            payable(from),
            zroPaymentAddress,
            adapterParams,
            msg.value
        );

        emit SendToChain(lzDstChainId, from, LzLib.addressToBytes32(to), 0);
    }

    function sendAndLendOrRepay(
        address _from,
        address _to,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        IUSDOBase.ILendOrRepayParams memory lendParams,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IApproval[] calldata revokes,
        ICommonData.IWithdrawParams calldata withdrawParams,
        bytes calldata adapterParams
    ) external payable {
        // allowance is also checked on SGL
        // check it here as well because tokens are moved over layers
        if (_from != msg.sender) {
            require(
                allowance(_from, msg.sender) >= lendParams.depositAmount,
                "UDSO: not approved"
            );
            _spendAllowance(_from, msg.sender, lendParams.depositAmount);
        }

        bytes32 toAddress = LzLib.addressToBytes32(_to);
        (lendParams.depositAmount, ) = _removeDust(lendParams.depositAmount);
        lendParams.depositAmount = _debitFrom(
            _from,
            lzEndpoint.getChainId(),
            toAddress,
            lendParams.depositAmount
        );
        require(lendParams.depositAmount > 0, "TOFT_AMOUNT");

        (, , uint256 airdropAmount, ) = LzLib.decodeAdapterParams(
            adapterParams
        );
        bytes memory lzPayload = abi.encode(
            PT_YB_SEND_SGL_LEND_OR_REPAY,
            _to,
            _ld2sd(lendParams.depositAmount),
            lendParams,
            approvals,
            revokes,
            withdrawParams,
            airdropAmount
        );

        _checkAdapterParams(
            lzDstChainId,
            PT_YB_SEND_SGL_LEND_OR_REPAY,
            adapterParams,
            NO_EXTRA_GAS
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
}
