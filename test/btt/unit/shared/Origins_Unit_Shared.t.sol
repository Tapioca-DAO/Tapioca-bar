// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// dependencies
import {ITapiocaOracle} from "tapioca-periph/interfaces/periph/ITapiocaOracle.sol";
import {IPenrose} from "tapioca-periph/interfaces/bar/IPenrose.sol";
import {MarketHelper} from "contracts/markets/MarketHelper.sol";
import {Origins} from "contracts/markets/Origins/Origins.sol";

import {Markets_Unit_Shared} from "./Markets_Unit_Shared.t.sol";

abstract contract Origins_Unit_Shared is Markets_Unit_Shared {
    function setUp() public virtual override {
        super.setUp();
    }

    function _registerDefaultOrigins() internal returns (address) {
        Origins org = new Origins(
            address(this),
            address(yieldBox),
            IERC20(address(usdo)),
            usdoId,
            IERC20(address(mainToken)),
            mainTokenId,
            ITapiocaOracle(address(oracle)),
            1e18,
            90000,
            IPenrose(address(penrose))
        );
        penrose.addOriginsMarket(address(org));
        return address(org);
    }
}
