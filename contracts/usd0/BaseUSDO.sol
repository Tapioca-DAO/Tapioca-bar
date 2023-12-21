// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

//LZ
import "tapioca-sdk/dist/contracts/token/oft/v2/OFTV2.sol";

//OZ
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

//TAPIOCA
import "tapioca-periph/contracts/interfaces/IYieldBoxBase.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";
import "tapioca-periph/contracts/interfaces/ICommonData.sol";

import "./BaseUSDOStorage.sol";
import "./modules/USDOGenericModule.sol";
import "./modules/USDOLeverageModule.sol";
import "./modules/USDOLeverageDestinationModule.sol";
import "./modules/USDOMarketModule.sol";
import "./modules/USDOMarketDestinationModule.sol";
import "./modules/USDOOptionsModule.sol";
import "./modules/USDOOptionsDestinationModule.sol";

//
//                 .(%%%%%%%%%%%%*       *
//             #%%%%%%%%%%%%%%%%%%%%*  ####*
//          #%%%%%%%%%%%%%%%%%%%%%#  /####
//       ,%%%%%%%%%%%%%%%%%%%%%%%   ####.  %
//                                #####
//                              #####
//   #####%#####              *####*  ####%#####*
//  (#########(              #####     ##########.
//  ##########             #####.      .##########
//                       ,####/
//                      #####
//  %%%%%%%%%%        (####.           *%%%%%%%%%#
//  .%%%%%%%%%%     *####(            .%%%%%%%%%%
//   *%%%%%%%%%%   #####             #%%%%%%%%%%
//               (####.
//      ,((((  ,####(          /(((((((((((((
//        *,  #####  ,(((((((((((((((((((((
//          (####   ((((((((((((((((((((/
//         ####*  (((((((((((((((((((
//                     ,**//*,.

contract BaseUSDO is BaseUSDOStorage, ERC20Permit {
    using SafeERC20 for IERC20;
    using BytesLib for bytes;
    // ************ //
    // *** VARS *** //
    // ************ //
    /// @notice returns the leverage module
    USDOLeverageModule private _leverageModule;
    /// @notice returns the leverage destination module
    USDOLeverageDestinationModule private _leverageDestinationModule;

    /// @notice returns the market module
    USDOMarketModule private _marketModule;
    /// @notice returns the market destination module
    USDOMarketDestinationModule private _marketDestinationModule;

    /// @notice returns the options module
    USDOOptionsModule private _optionsModule;
    /// @notice returns the options destination module
    USDOOptionsDestinationModule private _optionsDestinationModule;

    /// @notice returns the generic module
    USDOGenericModule private _genericModule;

    struct DestinationCall {
        Module module;
        bytes4 functionSelector;
    }
    // Define a mapping from packetType to destination module and function selector.
    mapping(uint256 => DestinationCall) private _destinationMappings;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error Failed();
    error NotAuthorized();
    error NotValid();

    constructor(
        address _lzEndpoint,
        IYieldBoxBase _yieldBox,
        ICluster _cluster,
        address _owner,
        address payable __leverageModule,
        address payable __leverageDestinationModule,
        address payable __marketModule,
        address payable __marketDestinationModule,
        address payable __optionsModule,
        address payable __optionsDestinationModule,
        address payable __genericModule
    ) BaseUSDOStorage(_lzEndpoint, _yieldBox, _cluster) ERC20Permit("USDO") {
        if (__leverageModule == address(0)) revert NotValid();
        if (__leverageDestinationModule == address(0)) revert NotValid();
        if (__marketModule == address(0)) revert NotValid();
        if (__marketDestinationModule == address(0)) revert NotValid();
        if (__optionsModule == address(0)) revert NotValid();
        if (__optionsDestinationModule == address(0)) revert NotValid();
        if (__genericModule == address(0)) revert NotValid();

        //Set modules
        _leverageModule = USDOLeverageModule(__leverageModule);
        _leverageDestinationModule = USDOLeverageDestinationModule(
            __leverageDestinationModule
        );
        _marketModule = USDOMarketModule(__marketModule);
        _marketDestinationModule = USDOMarketDestinationModule(
            __marketDestinationModule
        );
        _optionsModule = USDOOptionsModule(__optionsModule);
        _optionsDestinationModule = USDOOptionsDestinationModule(
            __optionsDestinationModule
        );
        _genericModule = USDOGenericModule(__genericModule);

        //Set modules' addresses
        _moduleAddresses[Module.Generic] = __genericModule;
        _moduleAddresses[Module.Options] = __optionsModule;
        _moduleAddresses[
            Module.OptionsDestination
        ] = __optionsDestinationModule;
        _moduleAddresses[Module.Leverage] = __leverageModule;
        _moduleAddresses[
            Module.LeverageDestination
        ] = __leverageDestinationModule;
        _moduleAddresses[Module.Market] = __marketModule;
        _moduleAddresses[Module.MarketDestination] = __marketDestinationModule;

        //Set destination mappings
        _destinationMappings[PT_YB_SEND_SGL_LEND_OR_REPAY] = DestinationCall({
            module: Module.MarketDestination,
            functionSelector: USDOMarketDestinationModule.lend.selector
        });
        _destinationMappings[PT_LEVERAGE_MARKET_UP] = DestinationCall({
            module: Module.LeverageDestination,
            functionSelector: USDOLeverageDestinationModule.leverageUp.selector
        });
        _destinationMappings[PT_MARKET_REMOVE_ASSET] = DestinationCall({
            module: Module.MarketDestination,
            functionSelector: USDOMarketDestinationModule.remove.selector
        });
        _destinationMappings[PT_TAP_EXERCISE] = DestinationCall({
            module: Module.OptionsDestination,
            functionSelector: USDOOptionsDestinationModule.exercise.selector
        });
        _destinationMappings[PT_TRIGGER_SEND_FROM] = DestinationCall({
            module: Module.Generic,
            functionSelector: USDOGenericModule.sendFromDestination.selector
        });
        _destinationMappings[PT_APPROVE] = DestinationCall({
            module: Module.Generic,
            functionSelector: USDOGenericModule.executeApproval.selector
        });

        transferOwnership(_owner);
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// @notice rescues unused ETH from the contract
    /// @param amount the amount to rescue
    /// @param to the recipient
    function rescueEth(uint256 amount, address to) external onlyOwner {
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert Failed();
    }

    /// @notice set the Conservator address
    /// @dev conservator can pause the contract
    /// @param _conservator the new address
    function setConservator(address _conservator) external onlyOwner {
        if (_conservator == address(0)) revert NotValid();
        conservator = _conservator;
    }

    /// @notice updates the pause state of the contract
    /// @dev can only be called by the conservator
    /// @param val the new value
    function updatePause(bool val) external {
        if (msg.sender != conservator) revert NotAuthorized();
        emit PausedUpdated(paused, val);
        paused = val;
    }

    /// @notice updates the cluster address
    /// @dev can only be called by the owner
    /// @param _cluster the new address
    function setCluster(ICluster _cluster) external {
        if (address(_cluster) == address(0)) revert NotAuthorized();
        cluster = _cluster;
    }

    /// @notice sets/unsets address as minter
    /// @dev can only be called by the owner
    /// @param _for role receiver
    /// @param _status true/false
    function setMinterStatus(address _for, bool _status) external onlyOwner {
        allowedMinter[_getChainId()][_for] = _status;
        emit SetMinterStatus(_for, _status);
    }

    /// @notice sets/unsets address as burner
    /// @dev can only be called by the owner
    /// @param _for role receiver
    /// @param _status true/false
    function setBurnerStatus(address _for, bool _status) external onlyOwner {
        allowedBurner[_getChainId()][_for] = _status;
        emit SetBurnerStatus(_for, _status);
    }

    // ************************ //
    // *** VIEW FUNCTIONS *** //
    // ************************ //
    /// @notice returns token's decimals
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    //----Leverage---
    /// @notice sends USDO to a specific chain and performs a leverage up operation
    /// @dev handled by USDOLeverageModule
    /// @param amount the amount to use
    /// @param leverageFor the receiver address
    /// @param lzData LZ specific data
    /// @param swapData ISwapper specific data
    /// @param externalData external contracts used for the flow
    function sendForLeverage(
        uint256 amount,
        address leverageFor,
        IUSDOBase.ILeverageLZData calldata lzData,
        IUSDOBase.ILeverageSwapData calldata swapData,
        IUSDOBase.ILeverageExternalContractsData calldata externalData
    ) external payable {
        _executeModule(
            Module.Leverage,
            abi.encodeWithSelector(
                USDOLeverageModule.sendForLeverage.selector,
                amount,
                leverageFor,
                lzData,
                swapData,
                externalData
            ),
            false
        );
    }

    //----Market---
    /// @notice sends to YieldBox over layer and lends asset to market
    /// @dev handled by USDOMarketModule
    /// @param _from sending address
    /// @param _to receiver address
    /// @param lzDstChainId LayerZero destination chain id
    /// @param zroPaymentAddress LayerZero ZRO payment address
    /// @param lendParams lend specific params
    /// @param approvals the cross chain approval operation data
    /// @param revokes the cross chain revoke operations data
    /// @param withdrawParams parameter to withdraw the SGL collateral
    /// @param adapterParams adapter params of the withdrawn collateral
    function sendAndLendOrRepay(
        address _from,
        address _to,
        uint16 lzDstChainId,
        address zroPaymentAddress,
        IUSDOBase.ILendOrRepayParams calldata lendParams,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IApproval[] calldata revokes,
        ICommonData.IWithdrawParams calldata withdrawParams,
        bytes calldata adapterParams
    ) external payable {
        _executeModule(
            Module.Market,
            abi.encodeWithSelector(
                USDOMarketModule.sendAndLendOrRepay.selector,
                _from,
                _to,
                lzDstChainId,
                zroPaymentAddress,
                lendParams,
                approvals,
                revokes,
                withdrawParams,
                adapterParams
            ),
            false
        );
    }

    /// @notice calls removeAssetAndRepay on Magnetar from the destination layer
    /// @dev handled by USDOMarketModule
    /// @param from sending address
    /// @param to receiver address
    /// @param lzDstChainId LayerZero destination chain id
    /// @param zroPaymentAddress ZRO payment address
    /// @param adapterParams LZ adapter params
    /// @param externalData external addresses needed for the operation
    /// @param removeAndRepayData removeAssetAndRepay params
    /// @param approvals the cross chain approval operation data
    /// @param revokes the cross chain revoke operations data
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
        _executeModule(
            Module.Market,
            abi.encodeWithSelector(
                USDOMarketModule.removeAsset.selector,
                from,
                to,
                lzDstChainId,
                zroPaymentAddress,
                adapterParams,
                externalData,
                removeAndRepayData,
                approvals,
                revokes
            ),
            false
        );
    }

    //----Options---
    /// @notice Exercise an oTAP position
    /// @dev handled by USDOOptionsModule
    /// @param optionsData oTap exerciseOptions data
    /// @param lzData data needed for the cross chain transer
    /// @param tapSendData needed for withdrawing Tap token
    /// @param approvals the cross chain approval operation data
    /// @param revokes the cross chain revoke operations data
    /// @param adapterParams LZ adapter params
    function exerciseOption(
        ITapiocaOptionsBrokerCrossChain.IExerciseOptionsData
            calldata optionsData,
        ITapiocaOptionsBrokerCrossChain.IExerciseLZData calldata lzData,
        ITapiocaOptionsBrokerCrossChain.IExerciseLZSendTapData
            calldata tapSendData,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IApproval[] calldata revokes,
        bytes calldata adapterParams
    ) external payable {
        _executeModule(
            Module.Options,
            abi.encodeWithSelector(
                USDOOptionsModule.exerciseOption.selector,
                optionsData,
                lzData,
                tapSendData,
                approvals,
                revokes,
                adapterParams
            ),
            false
        );
    }

    //----Generic---
    /// @notice triggers a cross-chain approval
    /// @dev handled by USDOGenericModule
    /// @param lzDstChainId LZ destination id
    /// @param lzCallParams data needed to trigger triggerApproveOrRevoke on destination
    /// @param approvals approvals array
    function triggerApproveOrRevoke(
        uint16 lzDstChainId,
        ICommonOFT.LzCallParams calldata lzCallParams,
        ICommonData.IApproval[] calldata approvals
    ) external payable {
        _executeModule(
            Module.Generic,
            abi.encodeWithSelector(
                USDOGenericModule.triggerApproveOrRevoke.selector,
                lzDstChainId,
                lzCallParams,
                approvals
            ),
            false
        );
    }

    /// @notice triggers a sendFrom to another layer from destination
    /// @dev handled by USDOGenericModule
    /// @param lzDstChainId LZ destination id
    /// @param airdropAdapterParams airdrop params
    /// @param amount amount to send back
    /// @param sendFromData data needed to trigger sendFrom on destination
    /// @param approvals the cross chain approval operation data
    /// @param revokes the cross chain revoke operations data
    function triggerSendFrom(
        uint16 lzDstChainId,
        bytes calldata airdropAdapterParams,
        uint256 amount,
        ICommonOFT.LzCallParams calldata sendFromData,
        ICommonData.IApproval[] calldata approvals,
        ICommonData.IApproval[] calldata revokes
    ) external payable {
        _executeModule(
            Module.Generic,
            abi.encodeWithSelector(
                USDOGenericModule.triggerSendFrom.selector,
                lzDstChainId,
                airdropAdapterParams,
                amount,
                sendFromData,
                approvals,
                revokes
            ),
            false
        );
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _extractModule(Module _module) private view returns (address) {
        address module = _moduleAddresses[_module];
        if (module == address(0)) revert NotAuthorized();

        return module;
    }

    function _executeModule(
        Module _module,
        bytes memory _data,
        bool _forwardRevert
    ) private returns (bool success, bytes memory returnData) {
        success = true;
        address module = _extractModule(_module);

        (success, returnData) = module.delegatecall(_data);
        if (!success && !_forwardRevert) {
            revert(_getRevertMsg(returnData));
        }
    }

    function _executeOnDestination(
        Module _module,
        bytes memory _data,
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) private {
        (bool success, bytes memory returnData) = _executeModule(
            _module,
            _data,
            true
        );
        if (!success) {
            _storeFailedMessage(
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload,
                returnData
            );
            emit CallFailedBytes(_srcChainId, _payload, returnData);
        }
    }

    function _nonblockingLzReceive(
        uint16 _srcChainId,
        bytes memory _srcAddress,
        uint64 _nonce,
        bytes memory _payload
    ) internal virtual override {
        uint256 packetType = _payload.toUint256(0);

        if (_destinationMappings[packetType].module != Module(0)) {
            DestinationCall memory callInfo = _destinationMappings[packetType];
            _executeOnDestination(
                callInfo.module,
                abi.encodeWithSelector(
                    callInfo.functionSelector,
                    callInfo.module == Module.MarketDestination
                        ? address(_marketDestinationModule)
                        : (
                            callInfo.module == Module.LeverageDestination
                                ? address(_leverageDestinationModule)
                                : (
                                    callInfo.module == Module.OptionsDestination
                                        ? address(_optionsDestinationModule)
                                        : (
                                            callInfo.module == Module.Generic
                                                ? address(_genericModule)
                                                : address(0)
                                        )
                                )
                        ),
                    _srcChainId,
                    _srcAddress,
                    _nonce,
                    _payload
                ),
                _srcChainId,
                _srcAddress,
                _nonce,
                _payload
            );
        } else {
            packetType = _payload.toUint8(0);
            if (packetType == PT_SEND) {
                _sendAck(_srcChainId, _srcAddress, _nonce, _payload);
            } else if (packetType == PT_SEND_AND_CALL) {
                _sendAndCallAck(_srcChainId, _srcAddress, _nonce, _payload);
            } else {
                revert("USDO: unknown packet type");
            }
        }
    }
}
