// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

/// THIS FILE IS USED TO LOAD THE TAPIOCA PERIPH CONTRACTS
/// Comment the imports for faster compilation

import {Pearlmit} from "tap-utils/pearlmit/Pearlmit.sol";
import {MagnetarHelper} from "tap-utils/Magnetar/MagnetarHelper.sol";
import {
    IMagnetarCollateralModule,
    IMagnetarMintModule,
    IMagnetarOptionModule,
    IMagnetarYieldBoxModule
} from "tap-utils/interfaces/periph/IMagnetar.sol";
import {IYieldBox} from "tapioca-periph/interfaces/yieldbox/IYieldBox.sol";
