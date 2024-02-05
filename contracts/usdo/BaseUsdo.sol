// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Tapioca
import {BaseTapiocaOmnichainEngine} from "tapioca-periph/tapiocaOmnichainEngine/BaseTapiocaOmnichainEngine.sol";
import {BaseUsdoTokenMsgType} from "contracts/usdo/BaseUsdoTokenMsgType.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {ModuleManager} from "contracts/usdo/modules/ModuleManager.sol";
import {UsdoExtExec} from "contracts/usdo/extensions/UsdoExtExec.sol";
import {UsdoHelper} from "contracts/usdo/extensions/UsdoHelper.sol";
import {IUsdo, UsdoInitStruct} from "tapioca-periph/interfaces/oft/IUsdo.sol";

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

/**
 * @title BaseUsdo
 * @author TapiocaDAO
 * @notice Base Usdo contract for LZ V2
 */
abstract contract BaseUsdo is ModuleManager, BaseTapiocaOmnichainEngine, BaseUsdoTokenMsgType {
    using SafeERC20 for IERC20;

    // LZ packets
    uint16 internal constant PT_YB_APPROVE_ASSET = 600; // Use for YieldBox 'setApprovalForAsset(true)' operation
    uint16 internal constant PT_YB_APPROVE_ALL = 601; // Use for YieldBox 'setApprovalForAll(true)' operation
    uint16 internal constant PT_MARKET_PERMIT = 602; // Use for market.permitLend() operation

    uint16 internal constant PT_MARKET_REMOVE_ASSET = 900; // Use for remove asset from a market available on another chain
    uint16 internal constant PT_YB_SEND_SGL_LEND_OR_REPAY = 901; // Use to YB deposit, lend/repay on a market available on another chain
    uint16 internal constant PT_LEVERAGE_MARKET_UP = 902; // Use for leverage buy on a market available on another chain
    uint16 internal constant PT_TAP_EXERCISE = 903; // Use for exercise options on tOB available on another chain

    UsdoExtExec public immutable usdoExtExec;
    UsdoHelper public immutable usdoHelper;
    IYieldBox public immutable yieldBox;
    ICluster public cluster;

    /**
     * @notice addresses allowed to mint USDO
     * @dev chainId>address>status
     */
    mapping(uint256 => mapping(address => bool)) public allowedMinter;
    /**
     * @notice addresses allowed to burn USDO
     * @dev chainId>address>status
     */
    mapping(uint256 => mapping(address => bool)) public allowedBurner;

    event SetMinterStatus(address indexed _for, bool _status);
    event SetBurnerStatus(address indexed _for, bool _status);

    constructor(UsdoInitStruct memory _data)
        BaseTapiocaOmnichainEngine("Tapioca Usdo", "USDO", _data.endpoint, _data.delegate, _data.extExec)
    {
        yieldBox = IYieldBox(_data.yieldBox);
        cluster = ICluster(_data.cluster);

        usdoExtExec = new UsdoExtExec();
        usdoHelper = new UsdoHelper();
    }
}
