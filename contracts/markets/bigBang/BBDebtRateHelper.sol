// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// Tapioca
import {IBigBangDebtRateHelper} from "tap-utils/interfaces/bar/IBigBangDebtRateHelper.sol";
import {IPenrose} from "tap-utils/interfaces/bar/IPenrose.sol";
import {IBigBang} from "tap-utils/interfaces/bar/IBigBang.sol";


/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/


contract BBDebtRateHelper is IBigBangDebtRateHelper {
    uint256 internal constant DEBT_PRECISION = 1e18;

    function getDebtRate(DebtRateCall memory data) external override view returns (uint256) {
        if (data.isMainMarket) return data.penrose.bigBangEthDebtRate(); // default 0.5%
        if (data.elastic == 0) return data.minDebtRate;

        uint256 _ethMarketTotalDebt = IBigBang(data.penrose.bigBangEthMarket()).getTotalDebt();
        uint256 _maxDebtPoint = (_ethMarketTotalDebt * data.debtRateAgainstEthMarket) / 1e18;

        if (data.elastic >= _maxDebtPoint) return data.maxDebtRate;

        uint256 debtPercentage = (data.elastic * DEBT_PRECISION) / _maxDebtPoint;
        uint256 debt = ((data.maxDebtRate - data.minDebtRate) * debtPercentage) / DEBT_PRECISION + data.minDebtRate;

        if (debt > data.maxDebtRate) return data.maxDebtRate;

        return debt;
    }
}