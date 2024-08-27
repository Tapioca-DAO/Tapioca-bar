// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {IERC20} from "@boringcrypto/boring-solidity/contracts/libraries/BoringERC20.sol";

// Tapioca
import {ILeverageExecutor} from "tap-utils/interfaces/bar/ILeverageExecutor.sol";
import {ITapiocaOracle} from "tap-utils/interfaces/periph/ITapiocaOracle.sol";

abstract contract Types {
    struct SingularityInitData {
        // penrose address
        address penrose;
        // borrow asset
        IERC20 asset;
        // borrow asset YieldBox id
        uint256 assetId;
        // collateral token
        IERC20 collateral;
        // collateral token YieldBox id
        uint256 collateralId;
        // default market's oracle for collateral <> asset
        ITapiocaOracle oracle;
        // leverage executor
        ILeverageExecutor leverageExecutor;
    }

    // asset is by default USDO
    struct BigBangInitData {
        // penrose address
        address penrose;
        // collateral token
        address collateral;
        // collateral token YieldBox id
        uint256 collateralId;
        // default market's oracle for collateral <> asset
        ITapiocaOracle oracle;
        // leverage executor
        ILeverageExecutor leverageExecutor;
        // debt rate against main BB market
        uint256 debtRateAgainstEth;
        // debt rate min for non main BB market
        uint256 debtRateMin;
        // debt rate max for non main BB market
        uint256 debtRateMax;
    }

    struct SSwapData {
        uint256 minAmountOut;
        SZeroXSwapData data;
    }

    struct SZeroXSwapData {
        address sellToken;
        address buyToken;
        address payable swapTarget;
        bytes swapCallData;
    }
}
