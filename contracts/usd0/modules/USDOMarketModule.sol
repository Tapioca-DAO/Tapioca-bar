// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//LZ
import "tapioca-sdk/dist/contracts/libraries/LzLib.sol";

//TAPIOCA
import "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";
import "tapioca-periph/contracts/interfaces/ITapiocaOFT.sol";
import "tapioca-periph/contracts/interfaces/IMagnetar.sol";
import "tapioca-periph/contracts/interfaces/IMagnetarHelper.sol";
import "tapioca-periph/contracts/interfaces/IMarket.sol";
import "tapioca-periph/contracts/interfaces/ISingularity.sol";
import "tapioca-periph/contracts/interfaces/IPermitBorrow.sol";
import "tapioca-periph/contracts/interfaces/IPermitAll.sol";

import "./USDOCommon.sol";

contract USDOMarketModule is USDOCommon {
    using RebaseLibrary for Rebase;
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
        ICommonData.IApproval[] calldata approvals
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

        bytes memory lzPayload = abi.encode(
            PT_MARKET_REMOVE_ASSET,
            to,
            externalData,
            removeAndRepayData,
            approvals
        );

        _checkGasLimit(
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
        ICommonData.IWithdrawParams calldata withdrawParams,
        bytes calldata adapterParams
    ) external payable {
        // allowance is also checked on SGL
        // check it here as well because tokens are moved over layers
        if (_from != msg.sender) {
            require(
                allowance(_from, msg.sender) >= lendParams.depositAmount,
                "UDSO: sender not approved"
            );
            _spendAllowance(_from, msg.sender, lendParams.depositAmount);
        }

        bytes32 toAddress = LzLib.addressToBytes32(_to);
        (lendParams.depositAmount, ) = _removeDust(lendParams.depositAmount);
        _debitFrom(
            _from,
            lzEndpoint.getChainId(),
            toAddress,
            lendParams.depositAmount
        );

        bytes memory lzPayload = abi.encode(
            PT_YB_SEND_SGL_LEND_OR_REPAY,
            msg.sender,
            _from,
            _to,
            _ld2sd(lendParams.depositAmount),
            lendParams,
            approvals,
            withdrawParams
        );

        _checkGasLimit(
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

    function remove(bytes memory _payload) public {
        (
            ,
            address to,
            ICommonData.ICommonExternalContracts memory externalData,
            IUSDOBase.IRemoveAndRepay memory removeAndRepayData,
            ICommonData.IApproval[] memory approvals
        ) = abi.decode(
                _payload,
                (
                    uint16,
                    address,
                    ICommonData.ICommonExternalContracts,
                    IUSDOBase.IRemoveAndRepay,
                    ICommonData.IApproval[]
                )
            );

        //approvals
        if (approvals.length > 0) {
            _callApproval(approvals);
        }

        IMagnetar(externalData.magnetar).exitPositionAndRemoveCollateral(
            to,
            externalData,
            removeAndRepayData
        );
    }

    function lend(
        address module,
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) public {
        require(validModules[module], "USDO: module not valid");

        (
            ,
            ,
            ,
            address to,
            uint64 lendAmountSD,
            IUSDOBase.ILendOrRepayParams memory lendParams,
            ICommonData.IApproval[] memory approvals,
            ICommonData.IWithdrawParams memory withdrawParams
        ) = abi.decode(
                _payload,
                (
                    uint16,
                    address,
                    address,
                    address,
                    uint64,
                    IUSDOBase.ILendOrRepayParams,
                    ICommonData.IApproval[],
                    ICommonData.IWithdrawParams
                )
            );

        lendParams.depositAmount = _sd2ld(lendAmountSD);
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
            _storeFailedMessage(
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload,
                reason
            );
        }

        emit ReceiveFromChain(_srcChainId, to, lendParams.depositAmount);
    }

    function lendInternal(
        address to,
        IUSDOBase.ILendOrRepayParams memory lendParams,
        ICommonData.IApproval[] memory approvals,
        ICommonData.IWithdrawParams memory withdrawParams
    ) public payable {
        if (approvals.length > 0) {
            _callApproval(approvals);
        }

        // Use market helper to deposit and add asset to market
        approve(address(lendParams.marketHelper), lendParams.depositAmount);
        if (lendParams.repay) {
            if (lendParams.repayAmount == 0) {
                lendParams.repayAmount = IMagnetarHelper(
                    IMagnetar(lendParams.marketHelper).helper()
                ).getBorrowPartForAmount(
                        lendParams.market,
                        lendParams.depositAmount
                    );
            }
            IMagnetar(lendParams.marketHelper)
                .depositRepayAndRemoveCollateralFromMarket(
                    lendParams.market,
                    to,
                    lendParams.depositAmount,
                    lendParams.repayAmount,
                    lendParams.removeCollateralAmount,
                    true,
                    withdrawParams
                );
        } else {
            IMagnetar(lendParams.marketHelper).mintFromBBAndLendOnSGL(
                to,
                lendParams.depositAmount,
                IUSDOBase.IMintData({
                    mint: false,
                    mintAmount: 0,
                    collateralDepositData: ICommonData.IDepositData({
                        deposit: false,
                        amount: 0,
                        extractFromSender: false
                    })
                }),
                ICommonData.IDepositData({
                    deposit: true,
                    amount: lendParams.depositAmount,
                    extractFromSender: true
                }),
                lendParams.lockData,
                lendParams.participateData,
                ICommonData.ICommonExternalContracts({
                    magnetar: address(0),
                    singularity: lendParams.market,
                    bigBang: address(0)
                })
            );
        }
    }
}
