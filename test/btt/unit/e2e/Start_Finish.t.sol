// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

// Tapioca
import {Module} from "tap-utils/interfaces/bar/IMarket.sol";
import {BigBang} from "contracts/markets/bigBang/BigBang.sol";
import {Market} from "contracts/markets/Market.sol";

import {
    MagnetarAction,
    MagnetarModule,
    MagnetarCall,
    MagnetarWithdrawData,
    DepositRepayAndRemoveCollateralFromMarketData,
    DepositAddCollateralAndBorrowFromMarketData,
    MintFromBBAndLendOnSGLData,
    LockAndParticipateData,
    ExitPositionAndRemoveCollateralData,
    IRemoveAndRepay
} from "tap-utils/interfaces/periph/IMagnetar.sol";
import {TokenType} from "yieldbox/enums/YieldBoxTokenType.sol";


import {IOptionsLockData, IOptionsUnlockData} from "tap-utils/interfaces/tap-token/ITapiocaOptionLiquidityProvision.sol";
import {IOptionsParticipateData, IOptionsExitData} from "tap-utils/interfaces/tap-token/ITapiocaOptionBroker.sol";
import {ICommonExternalContracts, IDepositData} from "tap-utils/interfaces/common/ICommonData.sol";
import {IPearlmit} from "tap-utils/interfaces/periph/IPearlmit.sol";
import {IMintData} from "tap-utils/interfaces/oft/IUsdo.sol";
import {IStrategy} from "yieldbox/interfaces/IStrategy.sol";


// tests
import {TapiocaOptionLiquidityProvision} from "../../mocks/TapiocaOptionLiquidityProvisionMock_test.sol";
import {TapiocaOptionBroker} from "../../mocks/TapiocaOptionBrokerMock_test.sol";
import {Singularity_Unit_Shared} from "../shared/Singularity_Unit_Shared.t.sol";
import {BigBang_Unit_Shared} from "../shared/BigBang_Unit_Shared.t.sol";
import {MagnetarMock_test} from "../../mocks/MagnetarMock_test.sol";
import {Usdo_Unit_Shared} from "../shared/Usdo_Unit_Shared.t.sol";
import {TapToken} from "../../mocks/TapTokenMock_test.sol";
import {OTAP} from "../../mocks/oTAPMock_Test.sol";

import "forge-std/console.sol";

// Round 1: Performs the following: 
// - add collateral to BB
// - borrow from BB
// - leverage on BB
// - lend asset to SGL
// - add collateral to SGL
// - borrow from SGL
// - leverage on SGL
// - lock 
// - participate
// - 
// or translated to Magnetar helpers:
// - Step 1: MagnetarAction.MintModule => mintBBLendSGLLockTOLP
//         - deposit to Yb
//         - add collateral to BB
//         - borrow from BB
//         - lend asset to SGL
// - Step 2: leverage on BB
// - Step 3: MagnetarAction.CollateralModule => depositAddCollateralAndBorrowFromMarket
//         - deposit to Yb
//         - add collateral to SGL
//         - borrow from SGL
// - Step 4: leverage on SGL
// - Step 5: MagnetarAction.OptionModule => lockAndParticipate

// -------------

// Round 2: Performs the following:
// - exit from tOB
// - unlock from tOLP
// - remove asset from SGL
// - repay on BB
// - remove collateral from BB
// -
//  or translated to Magnetar helpers:
// - Step 1: MagnetarAction.OptionModule => exitPositionAndRemoveCollateral
//         - exit
//         - unlock
//         - remove asset
//         - repay BB
//         - remove collateral BB


contract Start_Finish is Usdo_Unit_Shared, BigBang_Unit_Shared, Singularity_Unit_Shared, IERC721Receiver {
    TapiocaOptionBroker tOB;
    TapiocaOptionLiquidityProvision tOLP;
    OTAP otap;
    TapToken tap;

    uint256 tRandomSglId;
    

    // ************* //
    // *** SETUP *** //
    // ************* //
    function setUp() public override(Usdo_Unit_Shared, BigBang_Unit_Shared, Singularity_Unit_Shared) {
        super.setUp();

        otap = new OTAP(IPearlmit(address(pearlmit)), address(this));
        vm.label(address(otap), "OTAP mock");

        tOLP = new TapiocaOptionLiquidityProvision(address(yieldBox), 86400, IPearlmit(address(pearlmit)), address(penrose), address(this));
        vm.label(address(tOLP), "tOLP mock");

        tap = new TapToken("Name", "Symbol");
        vm.label(address(tap), "TAP mock");

        tOB = new TapiocaOptionBroker(address(tOLP), address(otap), payable(address(tap)), address(this), 86400, IPearlmit(address(pearlmit)), address(this));
        vm.label(address(tOB), "tOB mock");

        cluster.setRoleForContract(address(yieldBox), keccak256("MAGNETAR_YIELDBOX_CALLEE"), true);
        cluster.setRoleForContract(address(randomSgl), keccak256("MAGNETAR_MARKET_CALLEE"), true);
        cluster.setRoleForContract(address(magnetar), keccak256("MAGNETAR_CALLEE"), true);
        cluster.setRoleForContract(address(tOLP), keccak256("MAGNETAR_TAP_CALLEE"), true);
        cluster.setRoleForContract(address(tOB), keccak256("MAGNETAR_TAP_CALLEE"), true);


        tRandomSglId = yieldBox.registerAsset(
            TokenType.ERC20,
            address(randomSgl),
            IStrategy(address(_createEmptyStrategy(address(yieldBox), address(randomSgl)))),
            0
        );

        tOLP.registerSingularity(IERC20(address(randomSgl)), tRandomSglId, 0);
    }

    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
    

    function _approveForCollateral(address txExecutor) internal override(BigBang_Unit_Shared, Singularity_Unit_Shared) resetPrank(txExecutor) {
        _approveViaERC20(mainBB._collateral(), txExecutor, address(yieldBox), type(uint256).max);
        _approveViaERC20(mainBB._collateral(), txExecutor, address(pearlmit), type(uint256).max);
        _approveYieldBoxForAll(yieldBox, txExecutor, address(mainBB));
        _approveYieldBoxForAll(yieldBox, txExecutor, address(pearlmit));
        _approveViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            IPearlmit(address(pearlmit)),
            txExecutor,
            address(mainBB),
            type(uint200).max,
            uint48(block.timestamp),
            mainBB._collateralId()
        );

        _approveViaERC20(secondaryBB._collateral(), txExecutor, address(yieldBox), type(uint256).max);
        _approveViaERC20(secondaryBB._collateral(), txExecutor, address(pearlmit), type(uint256).max);
        _approveYieldBoxForAll(yieldBox, txExecutor, address(secondaryBB));
        _approveYieldBoxForAll(yieldBox, txExecutor, address(pearlmit));
        _approveViaPearlmit(
            TOKEN_TYPE_ERC1155,
            address(yieldBox),
            IPearlmit(address(pearlmit)),
            txExecutor,
            address(secondaryBB),
            type(uint200).max,
            uint48(block.timestamp),
            secondaryBB._collateralId()
        );
    }

    function test_StartToFinish(uint256 bbCollateralAmount, uint256 sglCollateralAmount, uint256 bbBorrowAmount, uint256 sglBorrowAmount) 
        external 
        whenOracleRateIsEth
        whenAssetOracleRateIsBelowMin
        givenBorrowCapIsNotReachedYet
    {   
        // bound amounts
        {
            bbCollateralAmount = bound(bbCollateralAmount, MEDIUM_AMOUNT, LARGE_AMOUNT);
            sglCollateralAmount = bbCollateralAmount;
            bbBorrowAmount = _boundBorrowAmount(bbBorrowAmount, bbCollateralAmount/2);
            sglBorrowAmount = bbBorrowAmount;
        }

        MagnetarCall[] memory calls;
        Module[] memory marketModules;
        bytes[] memory marketCalls;

        // ------------ Round 1
        // Step 1: MagnetarAction.MintModule => mintBBLendSGLLockTOLP
        
        // approvals
        {
            _approveViaPearlmit(TOKEN_TYPE_ERC20, mainBB._collateral(), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 0);
            _approveViaERC20(mainBB._collateral(), address(this), address(pearlmit), type(uint256).max);
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, mainBB._collateralId());
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(mainBB), type(uint200).max, block.timestamp, mainBB._collateralId());
            _approveYieldBoxForAll({yieldBox: yieldBox, from: address(this), operator: address(pearlmit)});

            _approveViaPearlmit(TOKEN_TYPE_ERC20, mainBB._asset(), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 0);
            _approveViaERC20(mainBB._asset(), address(this), address(pearlmit), type(uint256).max);
            _approveViaPearlmit(TOKEN_TYPE_ERC20, address(randomSgl), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 0);
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(randomSgl), type(uint200).max, block.timestamp, mainBB._assetId());
        }

        _startToFinish_mintBBLendSGLLockTOLP(bbBorrowAmount, bbCollateralAmount);

        uint256 lockAmount = (randomSgl.balanceOf(address(this))) / 10;

        // Step 2: leverage on BB
        _startToFinish_LeverageUpOnBB(bbBorrowAmount);

        // Step 3: MagnetarAction.CollateralModule => depositAddCollateralAndBorrowFromMarket

        // approvals
        {
            _approveViaPearlmit(TOKEN_TYPE_ERC20, randomSgl._collateral(), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 0);
            _approveViaERC20(randomSgl._collateral(), address(this), address(pearlmit), type(uint256).max);
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, randomSgl._collateralId());
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(randomSgl), type(uint200).max, block.timestamp, randomSgl._collateralId());
            _approveYieldBoxForAll({yieldBox: yieldBox, from: address(this), operator: address(pearlmit)});
        }
        

        // add more asset to SGL to allow leverage
        {
            uint256 addAssetAmount = bbBorrowAmount * 10;
            deal(address(randomSgl._asset()), address(this), addAssetAmount);

            _approveYieldBoxForAll({yieldBox: yieldBox, from: address(this), operator: address(pearlmit)});
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(randomSgl), type(uint200).max, block.timestamp, randomSgl._assetId());
            _approveViaPearlmit(TOKEN_TYPE_ERC20, randomSgl._asset(), IPearlmit(address(pearlmit)), address(this), address(yieldBox), type(uint200).max, block.timestamp, 0);

            yieldBox.depositAsset(randomSgl._assetId(), address(this), address(this), addAssetAmount, 0);

            uint256 lendShare = yieldBox.toShare(randomSgl._assetId(), addAssetAmount, false);
            randomSgl.addAsset(address(this), address(this), false, lendShare);
        }

        _startToFinish_depositAddCollateralAndBorrowFromMarket(sglBorrowAmount, sglCollateralAmount);

        // Step 4: leverage on SGL
        _startToFinish_LeverageUpOnSGL(sglBorrowAmount);

        // Step 5: MagnetarAction.OptionModule => lockAndParticipate
        {
            _approveViaPearlmit(TOKEN_TYPE_ERC20, address(randomSgl), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 0);
            _approveViaERC20(address(randomSgl), address(this), address(pearlmit), type(uint256).max);
            _approveViaPearlmit(TOKEN_TYPE_ERC721, address(tOLP), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 1);
        }

        _startToFinish_lockAndParticipate(lockAmount);


        // ------------ Round 2
        // Step 1: MagnetarAction.OptionModule => exitPositionAndRemoveCollateral

        {
            _approveViaPearlmit(TOKEN_TYPE_ERC20, address(mainBB), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 0);
            _approveYieldBoxForAll({yieldBox: yieldBox, from: address(this), operator: address(mainBB)});
            _approveViaPearlmit(TOKEN_TYPE_ERC721, address(otap), IPearlmit(address(pearlmit)), address(this), address(magnetar), type(uint200).max, block.timestamp, 1);
            otap.setApprovalForAll(address(magnetar), true);
            otap.setApprovalForAll(address(pearlmit), true);
            _approveViaPearlmit(TOKEN_TYPE_ERC1155, address(yieldBox), IPearlmit(address(pearlmit)), address(this), address(mainBB), type(uint200).max, block.timestamp, mainBB._assetId());
        }
        _finishToStart_exitPositionAndRemoveCollateral(bbBorrowAmount, bbBorrowAmount/2, bbCollateralAmount/2);
    }

    // Step 1: MagnetarAction.MintModule => mintBBLendSGLLockTOLP
    function _startToFinish_mintBBLendSGLLockTOLP(uint256 bbBorrowAmount, uint256 bbCollateralAmount) private {

        {
            deal(address(mainBB._collateral()), address(this), bbCollateralAmount);
        }

        MagnetarCall[] memory calls = new MagnetarCall[](1);
        MintFromBBAndLendOnSGLData memory _mintAndLendParams = MintFromBBAndLendOnSGLData({
            user: address(this),
            lendAmount: bbBorrowAmount,
            mintData: IMintData({
                mint: true,
                mintAmount: bbBorrowAmount,
                collateralDepositData: IDepositData({deposit: true, amount: bbCollateralAmount})
            }),
            depositData: IDepositData({deposit: false, amount: 0}),
            lockData: IOptionsLockData({lock: false, target: address(0), tAsset:address(0), lockDuration: 0, amount: 0, fraction: 0, minDiscountOut: 0}),
            participateData: IOptionsParticipateData({
                participate: false,
                target: address(0),
                tOLPTokenId: 0
            }),
            externalContracts: ICommonExternalContracts({
                magnetar: address(magnetar),
                singularity: address(randomSgl),
                bigBang: address(mainBB),
                marketHelper: address(marketHelper)
            })
        });
        bytes memory _mintAndLendParamsData =
            abi.encodeWithSelector(MagnetarMock_test.mintBBLendSGLLockTOLP.selector, _mintAndLendParams);
        calls[0] = MagnetarCall({
            id: uint8(MagnetarAction.MintModule),
            target: address(magnetar),
            value: 0,
            call: _mintAndLendParamsData
        });
        magnetar.burst{value: 0}(calls);


        uint256 collateralToShare = yieldBox.toShare(mainBB._collateralId(), bbCollateralAmount, false);
        uint256 depositedBBCollateral = mainBB._userCollateralShare(address(this));
        uint256 borrowedBBAsset = mainBB._userBorrowPart(address(this));
        uint256 lentSglAsset = randomSgl.balanceOf(address(this));

        assertEq(depositedBBCollateral, collateralToShare);
        assertApproxEqRel(
            borrowedBBAsset, bbBorrowAmount, 0.00001e18
        );
        assertGt(lentSglAsset, 0);
    }

    // Step 2: leverage on BB
    function _startToFinish_LeverageUpOnBB(uint256 amount) private {
        uint256 borrowedBBAssetBefore = mainBB._userBorrowPart(address(this));
        uint256 marketBalanceCollateralBefore = yieldBox.balanceOf(address(mainBB), mainBB._collateralId());
        uint256 userCollateralShareBefore = mainBB._userCollateralShare(address(this));
        (Module[] memory modules, bytes[] memory calls) =
            _getLeverageUpData(amount, 0, address(this));
        mainBB.execute(modules, calls, true);
        uint256 borrowedBBAssetAfter = mainBB._userBorrowPart(address(this));
        uint256 marketBalanceCollateralAfter = yieldBox.balanceOf(address(mainBB), mainBB._collateralId());
        uint256 userCollateralShareAfter = mainBB._userCollateralShare(address(this));

        assertGt(marketBalanceCollateralAfter, marketBalanceCollateralBefore);
        assertGt(userCollateralShareAfter, userCollateralShareBefore);
        assertGt(borrowedBBAssetAfter, borrowedBBAssetBefore);
        assertApproxEqRel(
            borrowedBBAssetAfter, borrowedBBAssetBefore * 2, 0.00001e18
        );
    }

    // Step 3: MagnetarAction.CollateralModule => depositAddCollateralAndBorrowFromMarket
    function _startToFinish_depositAddCollateralAndBorrowFromMarket(uint256 sglBorrowAmount, uint256 sglCollateralAmount) private {
        {
            deal(address(randomSgl._collateral()), address(this), sglCollateralAmount);
        }

        MagnetarCall[] memory calls = new MagnetarCall[](1);

        DepositAddCollateralAndBorrowFromMarketData memory _depositAddCollateralAndBorrowParams = DepositAddCollateralAndBorrowFromMarketData({
            market: address(randomSgl),
            marketHelper: address( marketHelper),
            user: address(this),
            collateralAmount: sglCollateralAmount,
            borrowAmount: sglBorrowAmount,
            deposit: true,
            withdrawParams: MagnetarWithdrawData({
                yieldBox: address(0),
                assetId: 0,
                receiver: address(this),
                amount: 0,
                withdraw: false,
                unwrap: false,
                extractFromSender: false
            })
        });
        bytes memory _depositAddCollateralAndBorrowParamsData =
            abi.encodeWithSelector(MagnetarMock_test.depositAddCollateralAndBorrowFromMarket.selector, _depositAddCollateralAndBorrowParams);
        
        calls[0] = MagnetarCall({
            id: uint8(MagnetarAction.CollateralModule),
            target: address(magnetar),
            value: 0,
            call: _depositAddCollateralAndBorrowParamsData
        });

        magnetar.burst{value: 0}(calls);            

        uint256 collateralToShare = yieldBox.toShare(randomSgl._collateralId(), sglCollateralAmount, false);
        uint256 depositedSglCollateral = randomSgl._userCollateralShare(address(this));
        uint256 borrowedSglAsset = randomSgl._userBorrowPart(address(this));

        assertEq(depositedSglCollateral, collateralToShare);
        assertApproxEqRel(
            borrowedSglAsset, sglBorrowAmount, 0.00001e18
        );

    }

    function _startToFinish_LeverageUpOnSGL(uint256 amount) private {
        uint256 borrowedSGLAssetBefore = randomSgl._userBorrowPart(address(this));
        uint256 marketBalanceCollateralBefore = yieldBox.balanceOf(address(randomSgl), randomSgl._collateralId());
        uint256 userCollateralShareBefore = randomSgl._userCollateralShare(address(this));
        (Module[] memory modules, bytes[] memory calls) =
            _getLeverageUpData(amount, 0, address(this));
        randomSgl.execute(modules, calls, true);
        uint256 borrowedSGLAssetAfter = randomSgl._userBorrowPart(address(this));
        uint256 marketBalanceCollateralAfter = yieldBox.balanceOf(address(randomSgl), mainBB._collateralId());
        uint256 userCollateralShareAfter = randomSgl._userCollateralShare(address(this));

        assertGt(marketBalanceCollateralAfter, marketBalanceCollateralBefore, "A");
        assertGt(userCollateralShareAfter, userCollateralShareBefore, "B");
        assertGt(borrowedSGLAssetAfter, borrowedSGLAssetBefore, "C");
        assertApproxEqRel(
            borrowedSGLAssetAfter, borrowedSGLAssetBefore * 2, 0.00001e18, "D"
        );
    }

    function _startToFinish_lockAndParticipate(uint256 lockAmount) private {
        MagnetarCall[] memory calls = new MagnetarCall[](1);

        LockAndParticipateData memory _lockAndParticipateParams = LockAndParticipateData({
            user: address(this),
            tSglToken: address(randomSgl),
            yieldBox: address(yieldBox),
            magnetar: address(magnetar),
            lockData: IOptionsLockData({lock: true, target: address(tOLP), tAsset:address(0), lockDuration: 86400, amount: uint128(lockAmount), fraction: lockAmount, minDiscountOut: 0}),
            participateData: IOptionsParticipateData({
                participate: true,
                target: address(tOB),
                tOLPTokenId: 0

            }),
            value: 0
        });

        bytes memory _lockAndParticipateParamsData =
            abi.encodeWithSelector(MagnetarMock_test.lockAndParticipate.selector, _lockAndParticipateParams);

        calls[0] = MagnetarCall({
            id: uint8(MagnetarAction.OptionModule),
            target: address(magnetar),
            value: 0,
            call: _lockAndParticipateParamsData
        });

        magnetar.burst{value: 0}(calls);

        address ownerOfOTap = otap.ownerOf(1);
        assertEq(ownerOfOTap, address(this));
    }

    function _finishToStart_exitPositionAndRemoveCollateral(uint256 removeAssetAmount, uint256 repayBBAssetAmount, uint256 removeBBCollateralAmount) private {
        MagnetarCall[] memory calls = new MagnetarCall[](1);
        ExitPositionAndRemoveCollateralData memory _exitPositionAndRemoveCollateralParams = ExitPositionAndRemoveCollateralData({
            user: address(this),
            externalData: ICommonExternalContracts({
                magnetar: address(magnetar),
                singularity: address(randomSgl),
                bigBang: address(mainBB),
                marketHelper: address(marketHelper)
            }),
            removeAndRepayData: IRemoveAndRepay({
                removeAssetFromSGL: true,
                removeAmount: removeAssetAmount,
                repayAssetOnBB: true,
                repayAmount: repayBBAssetAmount,
                removeCollateralFromBB: true,
                collateralAmount: removeBBCollateralAmount,
                exitData: IOptionsExitData({exit: true, target: address(tOB), oTAPTokenID: 1}),
                unlockData: IOptionsUnlockData({unlock: true, target: address(tOLP), tokenId: 1}),
                assetWithdrawData: MagnetarWithdrawData({
                    yieldBox: address(0),
                    assetId: 0,
                    receiver: address(this),
                    amount: 0,
                    withdraw: false,
                    unwrap: false,
                    extractFromSender: false
                }),
                collateralWithdrawData: MagnetarWithdrawData({
                    yieldBox: address(0),
                    assetId: 0,
                    receiver: address(this),
                    amount: 0,
                    withdraw: false,
                    unwrap: false,
                    extractFromSender: false
                })
            })
        });

        bytes memory _exitPositionAndRemoveCollateralParamsData =
            abi.encodeWithSelector(MagnetarMock_test.exitPositionAndRemoveCollateral.selector, _exitPositionAndRemoveCollateralParams);

        calls[0] = MagnetarCall({
            id: uint8(MagnetarAction.OptionModule),
            target: address(magnetar),
            value: 0,
            call: _exitPositionAndRemoveCollateralParamsData
        });

        uint256 borrowAmountBefore = mainBB._userBorrowPart(address(this));
        uint256 collateralShareBefore = mainBB._userCollateralShare(address(this));

        magnetar.burst{value: 0}(calls);

        uint256 borrowAmountAfter = mainBB._userBorrowPart(address(this));
        uint256 collateralShareAfter = mainBB._userCollateralShare(address(this));

        assertGt(borrowAmountBefore, borrowAmountAfter);
        assertGt(collateralShareBefore, collateralShareAfter);
    }
}