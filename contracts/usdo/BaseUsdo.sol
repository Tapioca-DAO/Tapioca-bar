// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Tapioca
import {BaseTapiocaOmnichainEngine} from "tap-utils/tapiocaOmnichainEngine/BaseTapiocaOmnichainEngine.sol";
import {IYieldBox} from "tap-utils/interfaces/yieldbox/IYieldBox.sol";
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {UsdoInitStruct} from "tap-utils/interfaces/oft/IUsdo.sol";
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

    constructor(UsdoInitStruct memory _data)
        BaseTapiocaOmnichainEngine(
            "USDO Stablecoin",
            "USDO",
            _data.endpoint,
            _data.delegate,
            _data.extExec,
            _data.pearlmit,
            ICluster(_data.cluster)
        )
    {
        yieldBox = IYieldBox(_data.yieldBox);
    }
}
