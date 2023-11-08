// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

contract Test {
    uint256 public x = 1;

    uint256 internal constant MAX_MINT_FEE_START = 975000000000000000; // 0.975 *1e18
    uint256 internal constant MIN_MINT_FEE_START = 1000000000000000000; // 1 *1e18
    uint256 internal constant FEE_PRECISION = 1e5;

    function computeMintFeeTest(
        uint256 rate,
        uint256 minFee,
        uint256 maxFee
    ) external pure returns (uint256) {
        if (rate >= MIN_MINT_FEE_START) return minFee;
        if (rate <= MAX_MINT_FEE_START) return maxFee;

        // uint256 fee = minFee + ((rate - MAX_MINT_FEE_START) * (maxFee - minFee) / (MIN_MINT_FEE_START - MAX_MINT_FEE_START));
        uint256 fee = maxFee -
            (((rate - MAX_MINT_FEE_START) * (maxFee - minFee)) /
                (MIN_MINT_FEE_START - MAX_MINT_FEE_START));
        return fee;
    }

    function getRevert(
        bytes4 _returnData
    ) external pure returns (string memory result) {
        result = string(abi.encodePacked(_returnData));
    }

    // function getCallerRewardNewMethod(
    //     uint256 borrowed,
    //     uint256 startTVLInAsset,
    //     uint256 maxTVLInAsset,
    //     uint256 minLiquidatorReward,
    //     uint256 maxLiquidatorReward
    // ) external pure returns (uint256) {
    //     if (startTVLInAsset == 0) return 0;

    //     if (borrowed >= maxLiquidatorReward) return minLiquidatorReward;
    //     if (borrowed < startTVLInAsset) return 0;

    //     uint256 fee = minLiquidatorReward + ((borrowed - maxTVLInAsset) * (maxLiquidatorReward - minLiquidatorReward) / (MIN_MINT_FEE_START - MAX_MINT_FEE_START));

    //     return fee;
    // }

    //     if (startTVLInAsset == 0) return 0;

    //     if (borrowed < startTVLInAsset) return 0;
    //     if (borrowed >= maxTVLInAsset) return minLiquidatorReward;

    //     uint256 rewardPercentage = ((borrowed - startTVLInAsset) *
    //         FEE_PRECISION) / (maxTVLInAsset - startTVLInAsset);

    //     int256 diff = int256(minLiquidatorReward) - int256(maxLiquidatorReward);
    //     int256 reward = (diff * int256(rewardPercentage)) /
    //         int256(FEE_PRECISION) +
    //         int256(maxLiquidatorReward);

    //     if (reward < int256(minLiquidatorReward)) {
    //         reward = int256(minLiquidatorReward);
    //     }

    //     return uint256(reward);
    // }

    function getCallerReward(
        uint256 borrowed,
        uint256 startTVLInAsset,
        uint256 maxTVLInAsset,
        uint256 minLiquidatorReward,
        uint256 maxLiquidatorReward
    ) external pure returns (uint256) {
        if (startTVLInAsset == 0) return 0;

        if (borrowed < startTVLInAsset) return 0;
        if (borrowed >= maxTVLInAsset) return minLiquidatorReward;

        uint256 rewardPercentage = ((borrowed - startTVLInAsset) *
            FEE_PRECISION) / (maxTVLInAsset - startTVLInAsset);

        int256 diff = int256(minLiquidatorReward) - int256(maxLiquidatorReward);
        int256 reward = (diff * int256(rewardPercentage)) /
            int256(FEE_PRECISION) +
            int256(maxLiquidatorReward);

        if (reward < int256(minLiquidatorReward)) {
            reward = int256(minLiquidatorReward);
        }

        return uint256(reward);
    }
}
