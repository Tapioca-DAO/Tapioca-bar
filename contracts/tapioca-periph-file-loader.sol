// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

/// THIS FILE IS USED TO LOAD THE TAPIOCA PERIPH CONTRACTS
/// Comment the imports for faster compilation

import {Pearlmit} from "tapioca-periph/pearlmit/Pearlmit.sol";
import {Magnetar} from "tapioca-periph/Magnetar/Magnetar.sol";
import {MagnetarHelper} from "tapioca-periph/Magnetar/MagnetarHelper.sol";
import {MagnetarAssetModule} from "tapioca-periph/Magnetar/modules/MagnetarAssetModule.sol";
import {MagnetarCollateralModule} from "tapioca-periph/Magnetar/modules/MagnetarCollateralModule.sol";
import {MagnetarMintModule} from "tapioca-periph/Magnetar/modules/MagnetarMintModule.sol";
import {MagnetarOptionModule} from "tapioca-periph/Magnetar/modules/MagnetarOptionModule.sol";
import {MagnetarYieldBoxModule} from "tapioca-periph/Magnetar/modules/MagnetarYieldBoxModule.sol";
