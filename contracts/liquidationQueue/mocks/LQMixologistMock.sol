// SPDX-License-Identifier: MIT
pragma solidity 0.8.9;

import '../ILiquidationQueue.sol';
import '../../bar/BeachBar.sol';

contract LQMixologistMock {
    BeachBar immutable beachBar;

    uint256 immutable assetId;

    uint256 constant EXCHANGE_RATE_PRECISION = 1e18;

    constructor(BeachBar _beachBar, uint256 _assetId) {
        beachBar = _beachBar;
        assetId = _assetId;
    }

    function initLq(
        ILiquidationQueue liquidationQueue,
        LiquidationQueueMeta calldata lqMeta
    ) external {
        liquidationQueue.init(lqMeta);
    }
}
