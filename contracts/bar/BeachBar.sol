// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.9;

import './YieldBox.sol';
import './interfaces/IWrappedNative.sol';
import './interfaces/IStrategy.sol';
import './enums/YieldBoxTokenType.sol';
import '../swappers/MultiSwapper.sol';
import '../mixologist/Mixologist.sol';
import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';

enum ContractType {
    lowRisk,
    mediumRisk,
    highRisk
}

struct MasterContract {
    address location;
    ContractType risk;
}

contract BeachBar is BoringOwnable, YieldBox {
    IERC20 public immutable tapToken;
    uint256 public immutable tapAssetId;

    MasterContract[] masterContracts;

    // Used to check if a master contract is registered to be used as a Mixologist template
    mapping(address => bool) isMasterContractRegistered;

    address public feeTo; // Protocol
    address public feeVeTap; // TAP distributors

    mapping(MultiSwapper => bool) public swappers;

    constructor(
        IWrappedNative wrappedNative_,
        YieldBoxURIBuilder uriBuilder_,
        IERC20 tapToken_
    ) YieldBox(wrappedNative_, uriBuilder_) {
        tapToken = tapToken_;
        tapAssetId = uint96(registerAsset(TokenType.ERC20, address(tapToken_), IStrategy(address(0)), 0));
    }

    // ******************//
    // *** MODIFIERS *** //
    // ***************** //

    modifier registeredMasterContract(MasterContract mc) {
        require(isMasterContractRegistered[mc] == true, 'BeachBar: MC not registered');
        _;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Uses `assetId` to call `YieldBox.deposit()`
    function deposit(
        uint256 assetId,
        address from,
        address to,
        uint256 amount,
        uint256 share
    ) public returns (uint256 amountOut, uint256 shareOut) {
        Asset storage asset = assets[assetId];
        return deposit(asset.tokenType, asset.contractAddress, asset.strategy, asset.tokenId, from, to, amount, share);
    }

    /// @notice Uses `assetId` to call `YieldBox.depositETH()`
    function depositETH(
        uint256 assetId,
        address to,
        uint256 amount
    ) public payable returns (uint256 amountOut, uint256 shareOut) {
        Asset storage asset = assets[assetId];
        return depositETH(asset.strategy, to, amount);
    }

    /// @notice Loop through the master contracts and call `depositFeesToBeachBar()` to each one of their clones.
    /// @dev `swappers_` can have one element that'll be used for all clones. Or one swapper per MasterContract.
    /// @param swappers_ One or more swappers to convert the asset to TAP.
    function withdrawAllProtocolFees(MultiSwapper[] swappers_) public {
        require(address(swappers_[0]) != address(0), 'BeachBar: zero address');

        uint256 masterContractLength = masterContracts.length;
        bool singleSwapper = swappers_.length != masterContractLength;

        address[] memory clonesOf_;
        // Loop through master contracts.
        for (uint256 i = 0; i < masterContractLength; ) {
            clonesOf_ = clonesOf[address(masterContracts[i])];
            // Loop through clones of the current MC.
            for (uint256 j = 0; j < clonesOf_.length; ) {
                Mixologist(clonesOf_[j]).depositFeesToBeachBar(singleSwapper ? swappers_[0] : swappers_[i]);
                ++j;
            }
            ++i;
        }
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //

    /// @notice Register a master contract
    /// @param mcAddress The address of the contract
    /// @param contractType_ The risk type of the contract
    function registerMasterContract(address mcAddress, ContractType contractType_) external onlyOwner {
        MasterContract memory mc;
        mc.location = mcAddress;
        mc.risk = contractType_;
        masterContracts.push(mc);
        isMasterContractRegistered[mcAddress] = true;
    }

    /// @notice Register a Mixologist
    /// @param mc The address of the master contract which must be already registered
    /// @param data The init data of the Mixologist
    /// @param useCreate2 Whether to use create2 or not
    function registerMixologist(
        address mc,
        bytes calldata data,
        bool useCreate2
    ) external payable onlyOwner registeredMasterContract(mc) {
        deploy(mc, data, useCreate2);
    }

    function setFeeTo(address feeTo_) external onlyOwner {
        feeTo = feeTo_;
    }

    function setFeeVeTap(address feeVeTap_) external onlyOwner {
        feeVeTap = feeVeTap_;
    }

    /// @notice Used to register and enable or disable swapper contracts used in closed liquidations.
    /// MasterContract Only Admin function.
    /// @param swapper The address of the swapper contract that conforms to `ISwapper`.
    /// @param enable True to enable the swapper. To disable use False.
    function setSwapper(MultiSwapper swapper, bool enable) public onlyOwner {
        swappers[swapper] = enable;
    }

    // ************************** //
    // *** OVERRIDE FUNCTIONS *** //
    // ************************** //

    /// @inheritdoc AssetRegister
    function registerAsset(
        TokenType tokenType,
        address contractAddress,
        IStrategy strategy,
        uint256 tokenId
    ) public override onlyOwner returns (uint256 assetId) {
        assetId = super.registerAsset(tokenType, contractAddress, strategy, tokenId);
    }
}
