// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/

abstract contract BaseUsdoTokenMsgType {
    uint16 internal constant MSG_MARKET_REMOVE_ASSET = 900; // Use for remove asset from a market available on another chain
    uint16 internal constant MSG_YB_SEND_SGL_LEND_OR_REPAY = 901; // Use to YB deposit, lend/repay on a market available on another chain
    uint16 internal constant MSG_TAP_EXERCISE = 902; // Use for exercise options on tOB available on another chain
    uint16 internal constant MSG_DEPOSIT_LEND_AND_SEND_FOR_LOCK = 903; // Use for `magnetar.mintFromBBAndSendForLending` step 2 call
    uint16 internal constant MSG_XCHAIN_LEND_XCHAIN_LOCK = 904; // Use for `magnetar.mintFromBBAndSendForLending` step 2 call
}
