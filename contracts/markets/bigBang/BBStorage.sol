// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.18;

import "@boringcrypto/boring-solidity/contracts/BoringOwnable.sol";
import "@boringcrypto/boring-solidity/contracts/ERC20.sol";

import "tapioca-periph/contracts/interfaces/IBigBang.sol";
import "tapioca-periph/contracts/interfaces/ISendFrom.sol";
import "tapioca-periph/contracts/interfaces/ISwapper.sol";
import {IUSDOBase} from "tapioca-periph/contracts/interfaces/IUSDO.sol";

import "../Market.sol";

// solhint-disable max-line-length

/*

__/\\\\\\\\\\\\\\\_____/\\\\\\\\\_____/\\\\\\\\\\\\\____/\\\\\\\\\\\_______/\\\\\_____________/\\\\\\\\\_____/\\\\\\\\\____        
 _\///////\\\/////____/\\\\\\\\\\\\\__\/\\\/////////\\\_\/////\\\///______/\\\///\\\________/\\\////////____/\\\\\\\\\\\\\__       
  _______\/\\\________/\\\/////////\\\_\/\\\_______\/\\\_____\/\\\_______/\\\/__\///\\\____/\\\/____________/\\\/////////\\\_      
   _______\/\\\_______\/\\\_______\/\\\_\/\\\\\\\\\\\\\/______\/\\\______/\\\______\//\\\__/\\\_____________\/\\\_______\/\\\_     
    _______\/\\\_______\/\\\\\\\\\\\\\\\_\/\\\/////////________\/\\\_____\/\\\_______\/\\\_\/\\\_____________\/\\\\\\\\\\\\\\\_    
     _______\/\\\_______\/\\\/////////\\\_\/\\\_________________\/\\\_____\//\\\______/\\\__\//\\\____________\/\\\/////////\\\_   
      _______\/\\\_______\/\\\_______\/\\\_\/\\\_________________\/\\\______\///\\\__/\\\_____\///\\\__________\/\\\_______\/\\\_  
       _______\/\\\_______\/\\\_______\/\\\_\/\\\______________/\\\\\\\\\\\____\///\\\\\/________\////\\\\\\\\\_\/\\\_______\/\\\_ 
        _______\///________\///________\///__\///______________\///////////_______\/////_____________\/////////__\///________\///__

*/

contract BBStorage is BoringOwnable, Market {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //

    mapping(address user => uint256 fee) public openingFees;

    IBigBang.AccrueInfo public accrueInfo;

    bool public isMainMarket;
    uint256 public maxDebtRate;
    uint256 public minDebtRate;
    uint256 public debtRateAgainstEthMarket;
    uint256 public debtStartPoint;

    uint256 internal constant DEBT_PRECISION = 1e18;

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// @notice event emitted when accrue is called
    event LogAccrue(uint256 indexed accruedAmount, uint64 indexed rate);
    /// @notice event emitted when collateral is added
    event LogAddCollateral(
        address indexed from,
        address indexed to,
        uint256 indexed share
    );
    /// @notice event emitted when collateral is removed
    event LogRemoveCollateral(
        address indexed from,
        address indexed to,
        uint256 indexed share
    );
    /// @notice event emitted when borrow is performed
    event LogBorrow(
        address indexed from,
        address indexed to,
        uint256 indexed amount,
        uint256 feeAmount,
        uint256 part
    );
    /// @notice event emitted when a repay operation is performed
    event LogRepay(
        address indexed from,
        address indexed to,
        uint256 indexed amount,
        uint256 part
    );
    /// @notice event emitted when the minimum debt rate is updated
    event MinDebtRateUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the maximum debt rate is updated
    event MaxDebtRateUpdated(uint256 indexed oldVal, uint256 indexed newVal);
    /// @notice event emitted when the debt rate against the main market is updated
    event DebtRateAgainstEthUpdated(
        uint256 indexed oldVal,
        uint256 indexed newVal
    );

    constructor() MarketERC20("Tapioca BigBang") {}

    function _accrue() internal virtual override {}

    function _accrueView()
        internal
        view
        virtual
        override
        returns (Rebase memory)
    {}
}
