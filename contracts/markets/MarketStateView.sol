// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// External
import {Rebase} from "@boringcrypto/boring-solidity/contracts/libraries/BoringRebase.sol";

// Tapioca
import {Market} from "./Market.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

abstract contract MarketStateView is Market {
    function _pauseOptions(PauseType _pauseProp) external view returns (bool) {
        return pauseOptions[_pauseProp];
    }

    function _conservator() external view returns (address) {
        return conservator;
    }

    function _penrose() external view returns (address) {
        return address(penrose);
    }

    function _pearlmit() external view returns (address) {
        return address(pearlmit);
    }

    function _collateral() external view returns (address) {
        return address(collateral);
    }

    function _collateralId() external view returns (uint256) {
        return collateralId;
    }

    function _asset() external view returns (address) {
        return address(asset);
    }

    function _assetId() external view returns (uint256) {
        return assetId;
    }

    function _oracle() external view returns (address) {
        return address(oracle);
    }

    function _oracleData() external view returns (bytes memory) {
        return oracleData;
    }

    function _exchangeRate() external view returns (uint256) {
        return exchangeRate;
    }

    function _rateValidDuration() external view returns (uint256) {
        return rateValidDuration;
    }

    function _rateTimestamp() external view returns (uint256) {
        return rateTimestamp;
    }

    function _totalBorrow() external view returns (Rebase memory) {
        return totalBorrow;
    }

    function _totalCollateralShare() external view returns (uint256) {
        return totalCollateralShare;
    }

    function _totalBorrowCap() external view returns (uint256) {
        return totalBorrowCap;
    }

    function _userBorrowPart(address _user) external view returns (uint256) {
        return userBorrowPart[_user];
    }

    function _userCollateralShare(address _user) external view returns (uint256) {
        return userCollateralShare[_user];
    }

    function _protocolFee() external view returns (uint256) {
        return protocolFee;
    }

    function _minLiquidatorReward() external view returns (uint256) {
        return minLiquidatorReward;
    }

    function _maxLiquidatorReward() external view returns (uint256) {
        return maxLiquidatorReward;
    }

    function _liquidationBonusAmount() external view returns (uint256) {
        return liquidationBonusAmount;
    }

    function _collateralizationRate() external view returns (uint256) {
        return collateralizationRate;
    }

    function _liquidationCollateralizationRate() external view returns (uint256) {
        return liquidationCollateralizationRate;
    }

    function _liquidationMultiplier() external view returns (uint256) {
        return liquidationMultiplier;
    }

    function _leverageExecutor() external view returns (address) {
        return address(leverageExecutor);
    }

    function _maxLiquidationSlippage() external view returns (uint256) {
        return maxLiquidationSlippage;
    }

    function _yieldBox() external view returns (address) {
        return address(yieldBox);
    }
}
