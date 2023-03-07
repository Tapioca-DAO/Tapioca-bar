// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../ILiquidationQueue.sol";
import "../../interfaces/IPenrose.sol";

contract LQSingularityMock {
    IPenrose immutable penrose;

    uint256 immutable assetId;

    uint256 constant EXCHANGE_RATE_PRECISION = 1e18;

    constructor(IPenrose _penrose, uint256 _assetId) {
        penrose = _penrose;
        assetId = _assetId;
    }

    function initLq(
        ILiquidationQueue liquidationQueue,
        ILiquidationQueue.LiquidationQueueMeta calldata lqMeta
    ) external {
        liquidationQueue.init(lqMeta, address(this));
    }
}
