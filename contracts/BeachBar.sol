// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;

import '../yieldbox/contracts/YieldBox.sol';
import '../yieldbox/contracts/interfaces/IWrappedNative.sol';
import '../yieldbox/contracts/interfaces/IStrategy.sol';
import '../yieldbox/contracts/enums/YieldBoxTokenType.sol';
import './swappers/MultiSwapper.sol';
import './mixologist/interfaces/IMixologist.sol';
import '@boringcrypto/boring-solidity/contracts/BoringOwnable.sol';
import '@boringcrypto/boring-solidity/contracts/ERC20.sol';

enum ContractType {
    lowRisk,
    mediumRisk,
    highRisk
}

struct MasterContract {
    address location;
    ContractType risk;
}

struct SwapData {
    uint256 minAssetAmount;
}

// TODO: Permissionless market deployment
///     + asset registration? (toggle to renounce ownership so users can call)
contract BeachBar is BoringOwnable {
    YieldBox public immutable yieldBox;

    IERC20 public immutable tapToken;
    uint256 public immutable tapAssetId;

    IERC20 public usdoToken;
    uint256 public usdoAssetId;

    MasterContract[] public masterContracts;

    // Used to check if a master contract is registered to be used as a Mixologist template
    mapping(address => bool) isMasterContractRegistered;

    address public feeTo; // Protocol
    address public feeVeTap; // TAP distributors

    mapping(MultiSwapper => bool) public swappers;

    constructor(YieldBox _yieldBox, IERC20 tapToken_) {
        yieldBox = _yieldBox;
        tapToken = tapToken_;
        tapAssetId = uint96(
            _yieldBox.registerAsset(
                TokenType.ERC20,
                address(tapToken_),
                IStrategy(address(0)),
                0
            )
        );
    }

    // **************//
    // *** EVENTS *** //
    // ************** //

    event ProtocolWithdrawal(address[] markets, uint256 timestamp);
    event RegisterMasterContract(address location, ContractType risk);
    event RegisterMixologist(address location, address masterContract);
    event FeeToUpdate(address newFeeTo);
    event FeeVeTapUpdate(address newFeeVeTap);
    event SwapperUpdate(address swapper, bool isRegistered);
    event UsdoTokenUpdated(address indexed usdoToken, uint256 assetId);

    // ******************//
    // *** MODIFIERS *** //
    // ***************** //

    modifier registeredMasterContract(address mc) {
        require(
            isMasterContractRegistered[mc] == true,
            'BeachBar: MC not registered'
        );
        _;
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //

    /// @notice Get all the Mixologist contract addresses
    function tapiocaMarkets() public view returns (address[] memory markets) {
        uint256 _masterContractLength = masterContracts.length;
        uint256 marketsLength = 0;

        unchecked {
            // We first compute the length of the markets array
            for (uint256 i = 0; i < _masterContractLength; ) {
                marketsLength += yieldBox.clonesOfCount(
                    masterContracts[i].location
                );

                ++i;
            }
        }

        markets = new address[](marketsLength);

        uint256 marketIndex;
        uint256 clonesOfLength;

        unchecked {
            // We populate the array
            for (uint256 i = 0; i < _masterContractLength; ) {
                address mcLocation = masterContracts[i].location;
                clonesOfLength = yieldBox.clonesOfCount(mcLocation);

                // Loop through clones of the current MC.
                for (uint256 j = 0; j < clonesOfLength; ) {
                    markets[marketIndex] = yieldBox.clonesOf(mcLocation, j);
                    ++marketIndex;
                    ++j;
                }
                ++i;
            }
        }
    }

    /// @notice Get the length of `masterContracts`
    function masterContractLength() public view returns (uint256) {
        return masterContracts.length;
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //

    /// @notice Loop through the master contracts and call `depositFeesToYieldBox()` to each one of their clones.
    /// @dev `swappers_` can have one element that'll be used for all clones. Or one swapper per MasterContract.
    /// @dev Fees are withdrawn in TAP and sent to the FeeDistributor contract
    /// @param swappers_ One or more swappers to convert the asset to TAP.
    function withdrawAllProtocolFees(
        MultiSwapper[] calldata swappers_,
        SwapData[] calldata swapData_
    ) public {
        require(address(swappers_[0]) != address(0), 'BeachBar: zero address');

        uint256 _masterContractLength = masterContracts.length;
        bool singleSwapper = swappers_.length != _masterContractLength;

        address[] memory markets = tapiocaMarkets();
        uint256 length = markets.length;

        unchecked {
            for (uint256 i = 0; i < length; ) {
                IMixologist(markets[i]).depositFeesToYieldBox(
                    singleSwapper ? swappers_[0] : swappers_[i],
                    singleSwapper ? swapData_[0] : swapData_[i]
                );
                ++i;
            }
        }

        emit ProtocolWithdrawal(markets, block.timestamp);
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //

    /// @notice Used to set the USD0 token
    /// @dev sets usdoToken and usdoAssetId
    /// @param _usdoToken the USD0 token address
    function setUsdoToken(IERC20 _usdoToken) external onlyOwner {
        usdoToken = _usdoToken;
        usdoAssetId = uint96(
            yieldBox.registerAsset(
                TokenType.ERC20,
                address(_usdoToken),
                IStrategy(address(0)),
                0
            )
        );
        emit UsdoTokenUpdated(address(_usdoToken), usdoAssetId);
    }

    /// @notice Register a master contract
    /// @param mcAddress The address of the contract
    /// @param contractType_ The risk type of the contract
    function registerMasterContract(
        address mcAddress,
        ContractType contractType_
    ) external onlyOwner {
        require(
            isMasterContractRegistered[mcAddress] == false,
            'BeachBar: MC registered'
        );

        MasterContract memory mc;
        mc.location = mcAddress;
        mc.risk = contractType_;
        masterContracts.push(mc);
        isMasterContractRegistered[mcAddress] = true;

        emit RegisterMasterContract(mcAddress, contractType_);
    }

    /// @notice Register a Mixologist
    /// @param mc The address of the master contract which must be already registered
    /// @param data The init data of the Mixologist
    /// @param useCreate2 Whether to use create2 or not
    function registerMixologist(
        address mc,
        bytes calldata data,
        bool useCreate2
    )
        external
        payable
        onlyOwner
        registeredMasterContract(mc)
        returns (address _contract)
    {
        _contract = yieldBox.deploy(mc, data, useCreate2);
        emit RegisterMixologist(_contract, mc);
    }

    /// @notice Execute an only owner function inside of a Mixologist market
    function executeMixologistFn(address[] calldata mc, bytes[] memory data)
        external
        onlyOwner
        returns (bool[] memory success, bytes[] memory result)
    {
        uint256 len = mc.length;
        success = new bool[](len);
        result = new bytes[](len);
        for (uint256 i = 0; i < len; ) {
            require(
                isMasterContractRegistered[yieldBox.masterContractOf(mc[i])],
                'BeachBar: MC not registered'
            );
            (success[i], result[i]) = mc[i].call(data[i]);
            ++i;
        }
    }

    function setFeeTo(address feeTo_) external onlyOwner {
        feeTo = feeTo_;
        emit FeeToUpdate(feeTo_);
    }

    function setFeeVeTap(address feeVeTap_) external onlyOwner {
        feeVeTap = feeVeTap_;
        emit FeeVeTapUpdate(feeVeTap_);
    }

    /// @notice Used to register and enable or disable swapper contracts used in closed liquidations.
    /// MasterContract Only Admin function.
    /// @param swapper The address of the swapper contract that conforms to `ISwapper`.
    /// @param enable True to enable the swapper. To disable use False.
    function setSwapper(MultiSwapper swapper, bool enable) external onlyOwner {
        swappers[swapper] = enable;
        emit SwapperUpdate(address(swapper), enable);
    }
}
