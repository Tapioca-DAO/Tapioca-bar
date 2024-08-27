// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {TapiocaOmnichainSender} from "tap-utils/tapiocaOmnichainEngine/TapiocaOmnichainSender.sol";
import {IUsdo, UsdoInitStruct} from "tap-utils/interfaces/oft/IUsdo.sol";
import {BaseUsdo} from "../BaseUsdo.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

contract UsdoSender is BaseUsdo, TapiocaOmnichainSender {
    constructor(UsdoInitStruct memory _data) BaseUsdo(_data) {}
}
