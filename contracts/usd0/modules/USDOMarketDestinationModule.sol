// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

// External
import {RebaseLibrary, Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Tapioca
import {IMagnetarHelper} from "tapioca-periph/interfaces/periph/IMagnetarHelper.sol";
import {ICommonData} from "tapioca-periph/interfaces/common/ICommonData.sol";
import {IMagnetar} from "tapioca-periph/interfaces/periph/IMagnetar.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {IUSDOBase} from "tapioca-periph/interfaces/bar/IUSDO.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {BaseUSDOStorage} from "../BaseUSDOStorage.sol";
import {LzLib} from "contracts/tmp/LzLib.sol";
import {USDOCommon} from "./USDOCommon.sol";

contract USDOMarketDestinationModule is USDOCommon {
    using RebaseLibrary for Rebase;
    using SafeERC20 for IERC20;

    constructor(address _lzEndpoint, IYieldBox _yieldBox, ICluster _cluster)
        BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster)
    {}

    /// @notice destination call for USDOMarketModule.sendAndLendOrRepay
    /// @param module USDO MarketDestination module address
    /// @param _srcChainId LayerZero source chain id
    /// @param _srcAddress LayerZero sender
    /// @param _nonce LayerZero current nonce
    /// @param _payload received payload
    function lend(address module, uint16 _srcChainId, bytes memory _srcAddress, uint64 _nonce, bytes memory _payload)
        public
    {
        if (msg.sender != address(this)) revert SenderNotAuthorized();
        if (_moduleAddresses[Module.MarketDestination] != module) {
            revert NotValid();
        }

        (
            ,
            address to,
            uint64 lendAmountSD,
            IUSDOBase.ILendOrRepayParams memory lendParams,
            ICommonData.IApproval[] memory approvals,
            ICommonData.IApproval[] memory revokes,
            ICommonData.IWithdrawParams memory withdrawParams,
            uint256 airdropAmount
        ) = abi.decode(
            _payload,
            (
                uint16,
                address,
                uint64,
                IUSDOBase.ILendOrRepayParams,
                ICommonData.IApproval[],
                ICommonData.IApproval[],
                ICommonData.IWithdrawParams,
                uint256
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
                this.lendInternal.selector, to, lendParams, approvals, revokes, withdrawParams, airdropAmount
            )
        );

        if (!success) {
            if (balanceAfter - balanceBefore >= lendParams.depositAmount) {
                IERC20(address(this)).safeTransfer(to, lendParams.depositAmount);
            }
            _storeFailedMessage(_srcChainId, _srcAddress, _nonce, _payload, reason);
            emit CallFailedBytes(_srcChainId, _payload, reason);
        }

        emit ReceiveFromChain(_srcChainId, to, lendParams.depositAmount);
    }

    function lendInternal(
        address to,
        IUSDOBase.ILendOrRepayParams memory lendParams,
        ICommonData.IApproval[] memory approvals,
        ICommonData.IApproval[] memory revokes,
        ICommonData.IWithdrawParams memory withdrawParams,
        uint256 airdropAmount
    ) public payable {
        if (msg.sender != address(this)) revert SenderNotAuthorized();

        if (approvals.length > 0) {
            _callApproval(approvals, PT_YB_SEND_SGL_LEND_OR_REPAY);
        }

        // Use market helper to deposit and add asset to market
        approve(address(lendParams.marketHelper), lendParams.depositAmount);
        if (lendParams.repay) {
            if (lendParams.repayAmount == 0) {
                lendParams.repayAmount = IMagnetarHelper(IMagnetar(lendParams.marketHelper).helper())
                    .getBorrowPartForAmount(lendParams.market, lendParams.depositAmount);
            }
            IMagnetar(lendParams.marketHelper).depositRepayAndRemoveCollateralFromMarket{value: airdropAmount}(
                lendParams.market,
                to,
                lendParams.depositAmount,
                lendParams.repayAmount,
                lendParams.removeCollateralAmount,
                true,
                withdrawParams
            );
        } else {
            IMagnetar(lendParams.marketHelper).mintFromBBAndLendOnSGL{value: airdropAmount}(
                to,
                lendParams.depositAmount,
                IUSDOBase.IMintData({
                    mint: false,
                    mintAmount: 0,
                    collateralDepositData: ICommonData.IDepositData({deposit: false, amount: 0, extractFromSender: false})
                }),
                ICommonData.IDepositData({deposit: true, amount: lendParams.depositAmount, extractFromSender: true}),
                lendParams.lockData,
                lendParams.participateData,
                ICommonData.ICommonExternalContracts({
                    magnetar: address(0),
                    singularity: lendParams.market,
                    bigBang: address(0)
                })
            );
        }

        if (revokes.length > 0) {
            _callApproval(revokes, PT_YB_SEND_SGL_LEND_OR_REPAY);
        }
    }

    /// @notice destination call for USDOMarketModule.removeAsset
    /// @param _payload received payload
    function remove(address, uint16, bytes memory, uint64, bytes memory _payload) public {
        if (msg.sender != address(this)) revert SenderNotAuthorized();
        (
            ,
            address to,
            ICommonData.ICommonExternalContracts memory externalData,
            IUSDOBase.IRemoveAndRepay memory removeAndRepayData,
            ICommonData.IApproval[] memory approvals,
            ICommonData.IApproval[] memory revokes,
            uint256 airdropAmount
        ) = abi.decode(
            _payload,
            (
                uint16,
                address,
                ICommonData.ICommonExternalContracts,
                IUSDOBase.IRemoveAndRepay,
                ICommonData.IApproval[],
                ICommonData.IApproval[],
                uint256
            )
        );

        //approvals
        if (approvals.length > 0) {
            _callApproval(approvals, PT_MARKET_REMOVE_ASSET);
        }

        IMagnetar(externalData.magnetar).exitPositionAndRemoveCollateral{value: airdropAmount}(
            to, externalData, removeAndRepayData
        );

        //revokes
        if (revokes.length > 0) {
            _callApproval(revokes, PT_MARKET_REMOVE_ASSET);
        }
    }
}
