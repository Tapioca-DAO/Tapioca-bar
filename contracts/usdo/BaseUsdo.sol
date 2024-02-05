// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Tapioca
import {BaseTapiocaOmnichainEngine} from "tapioca-periph/tapiocaOmnichainEngine/BaseTapiocaOmnichainEngine.sol";
import {IUsdo, UsdoInitStruct} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {ModuleManager} from "contracts/usdo/modules/ModuleManager.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {BaseUsdoTokenMsgType} from "./BaseUsdoTokenMsgType.sol";
import {UsdoExtExec} from "./extensions/UsdoExtExec.sol";
import {UsdoHelper} from "./extensions/UsdoHelper.sol";

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

    UsdoExtExec public immutable usdoExtExec;
    UsdoHelper public immutable usdoHelper;
    IYieldBox public immutable yieldBox;
    ICluster public cluster;

    constructor(UsdoInitStruct memory _data)
        BaseTapiocaOmnichainEngine("Tapioca Usdo", "USDO", _data.endpoint, _data.delegate, _data.extExec)
    {
        yieldBox = IYieldBox(_data.yieldBox);
        cluster = ICluster(_data.cluster);

        usdoExtExec = new UsdoExtExec();
        usdoHelper = new UsdoHelper();
    }
}
