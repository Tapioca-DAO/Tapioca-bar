// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Tapioca
import {BaseTapiocaOmnichainEngine} from "tapioca-periph/tapiocaOmnichainEngine/BaseTapiocaOmnichainEngine.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
import {ICluster} from "tapioca-periph/interfaces/periph/ICluster.sol";
import {UsdoInitStruct} from "tapioca-periph/interfaces/oft/IUsdo.sol";
import {BaseUsdoTokenMsgType} from "./BaseUsdoTokenMsgType.sol";
import {ModuleManager} from "./modules/ModuleManager.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

/**
 * @title BaseUsdo
 * @author TapiocaDAO
 * @notice Base Usdo contract for LZ V2
 */
abstract contract BaseUsdo is ModuleManager, BaseTapiocaOmnichainEngine, BaseUsdoTokenMsgType {
    using SafeERC20 for IERC20;

    IYieldBox public immutable yieldBox;
    ICluster public cluster;

    constructor(UsdoInitStruct memory _data)
        BaseTapiocaOmnichainEngine("Tapioca Usdo", "USDO", _data.endpoint, _data.delegate, _data.extExec, _data.pearlmit)
    {
        yieldBox = IYieldBox(_data.yieldBox);
        cluster = ICluster(_data.cluster);
    }
}
