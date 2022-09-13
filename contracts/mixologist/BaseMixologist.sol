// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import './MixologistCommon.sol';
import './MixologistSetter.sol';
import './MixologistLiquidation.sol';
import './MixologistLendingBorrowing.sol';

contract BaseMixologist is MixologistCommon, ERC20 {
    using RebaseLibrary for Rebase;
    using BoringERC20 for IERC20;

    enum Module {
        Base,
        LendingBorrowing,
        Liquidation,
        Setter
    }
    MixologistSetter setterModule;
    MixologistLiquidation liquidationModule;
    MixologistLendingBorrowing lendingBorrowingModule;

    // *************** //
    // *** PROXIED *** //
    // *************** //
    function executeModule(bytes memory data)
        external
        returns (bytes memory returnData)
    {
        bool success;
        (success, returnData) = _executeModule(data);
        require(success, _getRevertMsg(returnData));
    }

    function batchExecuteModules(bytes[] memory datas, bool revertOnFail)
        external
        returns (bool[] memory successes, bytes[] memory returnDatas)
    {
        successes = new bool[](datas.length);
        returnDatas = new bytes[](datas.length);
        for (uint256 i = 0; i < datas.length; i++) {
            (bool success, bytes memory returnData) = _executeModule(datas[i]);
            require(success || !revertOnFail, _getRevertMsg(returnData));
            successes[i] = success;
            returnDatas[i] = returnData;
        }
    }

    function _executeModule(bytes memory data)
        private
        returns (bool success, bytes memory returnData)
    {
        (Module fragment, bytes memory encodedCall) = abi.decode(
            data,
            (Module, bytes)
        );

        address _module;
        success = true;

        if (fragment == Module.LendingBorrowing) {
            _module = address(lendingBorrowingModule);
        } else if (fragment == Module.Liquidation) {
            _module = address(liquidationModule);
        } else if (fragment == Module.Setter) {
            _module = address(setterModule);
        } else if (fragment == Module.Base) {
            _module = address(this);
        } else {
            revert('Mx: action-not-recognized');
        }

        (success, returnData) = _module.delegatecall(encodedCall);
    }

    // ******************* //
    // *** NON-PROXIED *** //
    // ******************* //
    /// @notice The init function that acts as a constructor
    function init(bytes calldata data) external onlyOnce {
        (
            BeachBar tapiocaBar_,
            IERC20 _asset,
            uint256 _assetId,
            IERC20 _collateral,
            uint256 _collateralId,
            IOracle _oracle,
            address[] memory _collateralSwapPath,
            address[] memory _tapSwapPath,
            MixologistLendingBorrowing _lendingBorrowingModule,
            MixologistLiquidation _liquidationModule,
            MixologistSetter _setterModule
        ) = abi.decode(
                data,
                (
                    BeachBar,
                    IERC20,
                    uint256,
                    IERC20,
                    uint256,
                    IOracle,
                    address[],
                    address[],
                    MixologistLendingBorrowing,
                    MixologistLiquidation,
                    MixologistSetter
                )
            );

        beachBar = tapiocaBar_;
        yieldBox = tapiocaBar_.yieldBox();
        owner = address(beachBar);

        lendingBorrowingModule = _lendingBorrowingModule;
        liquidationModule = _liquidationModule;
        setterModule = _setterModule;

        require(
            address(_collateral) != address(0) &&
                address(_asset) != address(0) &&
                address(_oracle) != address(0),
            'Mx: bad pair'
        );
        asset = _asset;
        collateral = _collateral;
        assetId = _assetId;
        collateralId = _collateralId;
        oracle = _oracle;
        collateralSwapPath = _collateralSwapPath;
        tapSwapPath = _tapSwapPath;

        accrueInfo.interestPerSecond = uint64(STARTING_INTEREST_PER_SECOND); // 1% APR, with 1e18 being 100%

        updateExchangeRate();
    }

    // ERC20 'variables'
    function symbol() external view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    'tm',
                    collateral.safeSymbol(),
                    '/',
                    asset.safeSymbol(),
                    '-',
                    oracle.symbol(oracleData)
                )
            );
    }

    function name() external view returns (string memory) {
        return
            string(
                abi.encodePacked(
                    'Tapioca Mixologist ',
                    collateral.safeName(),
                    '/',
                    asset.safeName(),
                    '-',
                    oracle.name(oracleData)
                )
            );
    }

    function decimals() external view returns (uint8) {
        return asset.safeDecimals();
    }

    // totalSupply for ERC20 compatibility
    // BalanceOf[user] represent a fraction
    function totalSupply() public view override returns (uint256) {
        return totalAsset.base;
    }

    /**
     * @notice Sets approval status for an `operator` to manage user account.
     * @param operator Address of Operator.
     * @param approved Status of approval.
     */
    function setApprovalForAll(address operator, bool approved) external {
        // Effects
        isApprovedForAll[msg.sender][operator] = approved;

        emit LogApprovalForAll(msg.sender, operator, approved);
    }

    /// @notice Adds assets to the lending pair.
    /// @param from Address to add asset from.
    /// @param to The address of the user to receive the assets.
    /// @param skim True if the amount should be skimmed from the deposit balance of msg.sender.
    /// False if tokens from msg.sender in `yieldBox` should be transferred.
    /// @param share The amount of shares to add.
    /// @return fraction Total fractions added.
    function addAsset(
        address from,
        address to,
        bool skim,
        uint256 share
    ) public allowed(from) returns (uint256 fraction) {
        accrue();
        fraction = _addAsset(from, to, skim, share);
    }

    /// @notice Removes an asset from msg.sender and transfers it to `to`.
    /// @param from Account to debit Assets from.
    /// @param to The user that receives the removed assets.
    /// @param fraction The amount/fraction of assets held to remove.
    /// @return share The amount of shares transferred to `to`.
    function removeAsset(
        address from,
        address to,
        uint256 fraction
    ) public allowed(from) returns (uint256 share) {
        accrue();

        share = _removeAsset(from, to, fraction);
    }

    /// @notice Withdraw the fees accumulated in `accrueInfo.feesEarnedFraction` to the balance of `feeTo`.
    function withdrawFeesEarned() public {
        accrue();
        address _feeTo = beachBar.feeTo();
        uint256 _feesEarnedFraction = accrueInfo.feesEarnedFraction;
        balanceOf[_feeTo] += _feesEarnedFraction;
        emit Transfer(address(0), _feeTo, _feesEarnedFraction);
        accrueInfo.feesEarnedFraction = 0;
        emit LogWithdrawFees(_feeTo, _feesEarnedFraction);
    }

    /// @notice Withdraw the balance of `feeTo`, swap asset into TAP and deposit it to yieldBox of `feeTo`
    function depositFeesToYieldBox(
        MultiSwapper swapper,
        SwapData calldata swapData
    ) public {
        if (accrueInfo.feesEarnedFraction > 0) {
            withdrawFeesEarned();
        }
        require(beachBar.swappers(swapper), 'Mx: Invalid swapper');
        address _feeTo = beachBar.feeTo();
        address _feeVeTap = beachBar.feeVeTap();

        uint256 feeShares = _removeAsset(
            _feeTo,
            address(this),
            balanceOf[_feeTo]
        );

        yieldBox.transfer(address(this), address(swapper), assetId, feeShares);

        (uint256 tapAmount, ) = swapper.swap(
            assetId,
            beachBar.tapAssetId(),
            swapData.minAssetAmount,
            _feeVeTap,
            tapSwapPath,
            feeShares
        );

        emit LogYieldBoxFeesDeposit(feeShares, tapAmount);
    }

    // *************** //
    // *** PRIVATE *** //
    // *************** //
    function _getRevertMsg(bytes memory _returnData)
        private
        pure
        returns (string memory)
    {
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return 'no-data';
        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string)); // All that remains is the revert string
    }

    /// @dev Concrete implementation of `addAsset`.
    function _addAsset(
        address from,
        address to,
        bool skim,
        uint256 share
    ) internal returns (uint256 fraction) {
        Rebase memory _totalAsset = totalAsset;
        uint256 totalAssetShare = _totalAsset.elastic;
        uint256 allShare = _totalAsset.elastic +
            yieldBox.toShare(assetId, totalBorrow.elastic, true);
        fraction = allShare == 0
            ? share
            : (share * _totalAsset.base) / allShare;
        if (_totalAsset.base + uint128(fraction) < 1000) {
            return 0;
        }
        totalAsset = _totalAsset.add(share, fraction);
        balanceOf[to] += fraction;
        emit Transfer(address(0), to, fraction);
        _addTokens(from, assetId, share, totalAssetShare, skim);
        emit LogAddAsset(skim ? address(yieldBox) : from, to, share, fraction);
    }

    /// @dev Concrete implementation of `removeAsset`.
    /// @param from The account to remove from. Should always be msg.sender except for `depositFeesToyieldBox()`.
    function _removeAsset(
        address from,
        address to,
        uint256 fraction
    ) internal returns (uint256 share) {
        Rebase memory _totalAsset = totalAsset;
        uint256 allShare = _totalAsset.elastic +
            yieldBox.toShare(assetId, totalBorrow.elastic, true);
        share = (fraction * allShare) / _totalAsset.base;
        balanceOf[from] -= fraction;
        emit Transfer(from, address(0), fraction);
        _totalAsset.elastic -= uint128(share);
        _totalAsset.base -= uint128(fraction);
        require(_totalAsset.base >= 1000, 'Mx: min limit');
        totalAsset = _totalAsset;
        emit LogRemoveAsset(from, to, share, fraction);
        yieldBox.transfer(address(this), to, assetId, share);
    }

    bool private initialized;
    modifier onlyOnce() {
        require(!initialized, 'Mx: initialized');
        _;
        initialized = true;
    }
}
