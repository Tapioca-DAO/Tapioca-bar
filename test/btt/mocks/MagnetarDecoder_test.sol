// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;


import {
    IMagnetar,
    DepositRepayAndRemoveCollateralFromMarketData,
    MintFromBBAndLendOnSGLData,
    ExitPositionAndRemoveCollateralData,
    DepositAddCollateralAndBorrowFromMarketData,
    MagnetarWithdrawData,
    MagnetarCall,
    MagnetarModule,
    MagnetarAction
} from "tap-utils/interfaces/periph/IMagnetar.sol";

contract MagnetarDecoder_test {
    error MagnetarDecoder_test_Fail();

    uint256 public repayAmount;
    uint256 public depositAmount;
    uint256 public removeAmount;

    
    function burst(MagnetarCall[] calldata calls) external payable {
        for (uint256 i; i < calls.length; i++) {
            MagnetarCall calldata _action = calls[i];
            address(this).delegatecall(_action.call);
        }
    }

    function depositRepayAndRemoveCollateralFromMarket(DepositRepayAndRemoveCollateralFromMarketData memory _data) public payable
    {
        depositAmount = _data.depositAmount;
        repayAmount = _data.repayAmount;
        removeAmount = _data.collateralAmount;
    }

    function mintBBLendSGLLockTOLP(MintFromBBAndLendOnSGLData memory _data) external payable {
        depositAmount = _data.lendAmount;
    }

    function exitPositionAndRemoveCollateral(ExitPositionAndRemoveCollateralData memory _data) external payable {
        removeAmount = _data.removeAndRepayData.removeAmount;
    }
}