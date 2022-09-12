// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IMixologistSetter {
    function setCollateralSwapPath(address[] calldata _collateralSwapPath)
        external;
}
