// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.22;

// external
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

// Tapioca
import {IPearlmit, PearlmitHandler} from "tap-utils/pearlmit/PearlmitHandler.sol";
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {ERC721Permit} from "tap-utils/utils/ERC721Permit.sol";
import {EpochManager} from "contracts/EpochManager.sol";

/*

████████╗ █████╗ ██████╗ ██╗ ██████╗  ██████╗ █████╗ 
╚══██╔══╝██╔══██╗██╔══██╗██║██╔═══██╗██╔════╝██╔══██╗
   ██║   ███████║██████╔╝██║██║   ██║██║     ███████║
   ██║   ██╔══██║██╔═══╝ ██║██║   ██║██║     ██╔══██║
   ██║   ██║  ██║██║     ██║╚██████╔╝╚██████╗██║  ██║
   ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝
   
*/
contract AstroVault is EpochManager, ReentrancyGuard, PearlmitHandler, Pausable, ERC721Permit, ERC721Enumerable {
    using SafeERC20 for IERC20;

    // ************ //
    // *** VARS *** //
    // ************ //
    string public baseURI;
    uint256 public lastTokenId;

    IERC20 public immutable vaultToken;

    /// ===== PARTICIPANTS ======
    struct LockDetails {
        uint256 totalLocked;
        uint256 lockTimestamp;
        uint256 expiry;
        uint256 discountRate;
        bool released;

        uint256 rewardsWeight;
    }

    mapping(uint256 => LockDetails) public userLockData;

    /// ===== REWARDS ======
    uint256 public totalRewardsWeight;
    mapping(uint256 => mapping(IERC20 => uint256)) public claimedRewards;
    mapping(IERC20 => bool) public isRewardToken;
    IERC20[] public rewardTokens;
    uint256 public maxNoOfRewards = 100;

    bool public rescueMode;
    uint256 public emergencySweepCooldown = 2 days;
    uint256 public lastEmergencySweep;

    /// ===== CONSTANTS ======
    /*
    * @notice time unit for locking tokens (1 week)
    */
    uint256 public constant SECONDS_PER_LOCK_UNIT = 604_800;

    /*
    * @notice discount rates for different lock durations
    */
    uint256 public constant DISCOUNT_RATE_BRACKET_1 = 25000;
    uint256 public constant DISCOUNT_RATE_BRACKET_2 = 50000;
    uint256 public constant DISCOUNT_RATE_BRACKET_3 = 75000;
    uint256 public constant DISCOUNT_RATE_BRACKET_4 = 100000;
    uint256 public constant DISCOUNT_PRECISION_FACTOR = 1e5;

    // ************** //
    // *** ERRORS *** //
    // ************** //
    error InvalidLockDuration();
    error InvalidDuration();
    error InsufficientAmount();
    error InvalidAction();
    error UnauthorizedAction();
    error AmountLocked();
    error TokenLimitReached();
    error EmergencySweepCooldownNotReached();
    error RescueModeActive();
    error TokenNotValid();
    error NotApproved(uint256 tokenId, address spender);

    // ************** //
    // *** EVENTS *** //
    // ************** //
    /// ===== METHODS ======
    event Participate(address indexed _user, uint256 _amount, uint256 _noOfLockUnits);
    event Exit(address indexed _user, uint256 _totalLocked);
    /// ===== REWARDS ======
    event LogMaxRewardsLength(uint256 _oldLength, uint256 _newLength, uint256 _currentLength);
    event AddRewardToken(address indexed _token);
    event ClaimReward(
        address indexed rewardTokenAddress,
        address indexed to,
        uint256 indexed twTapTokenId,
        uint256 amount,
        uint256 rewardTokenIndex
    );
    /// ===== GENERIC ======
    event ClusterUpdated(address newClusterAddress);
    event ActivateEmergencySweep();
    event RescueMode(bool _rescueMode);


    constructor(address _vaultToken, IPearlmit _pearlmit, ICluster _cluster, address _owner)
        ERC721("Time Weighted TAP", "twTAP")
        ERC721Permit("Time Weighted TAP")
        PearlmitHandler(_pearlmit)
        EpochManager(_cluster, _owner)
    {
        if (_vaultToken == address(0)) revert TokenNotValid();

        vaultToken = IERC20(_vaultToken);
    }

    // ********************** //
    // *** VIEW FUNCTIONS *** //
    // ********************** //
    /// ===== USER ======
    /*
    * @notice returns the discount rate for a given number of lock units
    * @dev reverts if the duration is invalid
    * @params _noOfLockUnits the number of lock units (weeks)
    * @returns the applicable discount rate
    */
    function viewDiscountRate(uint256 _noOfLockUnits) public view returns (uint256) {
        if (_noOfLockUnits == lockDurationBracket1) return DISCOUNT_RATE_BRACKET_1;
        if (_noOfLockUnits == lockDurationBracket2) return DISCOUNT_RATE_BRACKET_2;
        if (_noOfLockUnits == lockDurationBracket3) return DISCOUNT_RATE_BRACKET_3;
        if (_noOfLockUnits == lockDurationBracket4) return DISCOUNT_RATE_BRACKET_4;

        revert InvalidDuration();
    }

    /*
    * @notice returns lock details for a specific token ID
    * @params _tokenId the ID of the token
    */
    function viewLockInfo(uint256 _tokenId) public view returns (LockDetails memory) {
        return userLockData[_tokenId];
    }

    function claimable(uint256 _tokenId) public view returns (uint256[] memory _rewards) {
        if (!_exists(_tokenId)) revert TokenNotValid();
        uint256 len = rewardTokens.length;
        _rewards = new uint256[](len);

        LockDetails memory _lockInfo = userLockData[_tokenId];

        if(_lockInfo.released) return _rewards;

        for(uint256 i; i < len; i++) {
            IERC20 rewardToken = rewardTokens[i];

            uint256 totalDistributed = rewardToken.balanceOf(address(this));
            uint256 totalClaimable = (_lockInfo.rewardsWeight * totalDistributed) / totalRewardsWeight;
            _rewards[i] = totalClaimable <  claimedRewards[_tokenId][rewardToken] ? 0: totalClaimable - claimedRewards[_tokenId][rewardToken];
        }
    }


    /// ===== ERC721 ======
    function _baseURI() internal view virtual override returns (string memory) {
        return baseURI;
    }

    function tokenURI(uint256 id) public view override returns (string memory) {
        if (!_exists(id)) revert TokenNotValid();
        return string(abi.encodePacked(baseURI, Strings.toString(id)));
    }

    // ************************ //
    // *** PUBLIC FUNCTIONS *** //
    // ************************ //
    /*
    * @notice allows users to lock tokens for a discount
    * @dev tokens are locked for a duration based on lock units and a discount rate is applied
    * @params _user the address of the user
    * @params _amount the amount of tokens to lock
    * @params _noOfLockUnits the number of lock units 
    */
    function participate(address _user, uint256 _amount, uint256 _noOfLockUnits)
        external
        override
        whenNotPaused
        nonReentrant
    {
        if (rescueMode) revert RescueModeActive();
        if (_amount == 0) revert InsufficientAmount();
        if (
            _noOfLockUnits != lockDurationBracket1 && _noOfLockUnits != lockDurationBracket2
                && _noOfLockUnits != lockDurationBracket3 && _noOfLockUnits != lockDurationBracket4
        ) revert InvalidLockDuration();

        {
            bool isErr = pearlmit.transferFromERC20(msg.sender, address(this), address(vaultToken), _amount);
            if (isErr) revert NotAuthorized();
        }
        LockDetails memory _lock = LockDetails({
            totalLocked:  _amount,
            lockTimestamp: block.timestamp,
            expiry: block.timestamp + (_noOfLockUnits * SECONDS_PER_LOCK_UNIT),
            discountRate: viewDiscountRate(_noOfLockUnits),
            released: false,
            rewardsWeight: 0
        });
        _lock.rewardsWeight = _lock.totalLocked * ((_lock.expiry - _lock.lockTimestamp) / SECONDS_PER_LOCK_UNIT);
        totalRewardsWeight += _lock.rewardsWeight;

        userLockData[lastTokenId] = _lock;

        totalForCurrentEpoch += _amount;

        _safeMint(_user, lastTokenId);
        lastTokenId++;

        emit Participate(_user, _amount, _noOfLockUnits);
    }

    /*
    * @notice allows users to exit their position and retrieve locked tokens
    * @dev tokens can only be retrieved after expiry or in rescue mode
    * @params _tokenId the ID of the locked position
    * @returns the total amount of locked tokens returned to the user
    */
    function exitPosition(uint256 _tokenId) external whenNotPaused nonReentrant returns (uint256) {
        address _user = ownerOf(_tokenId);

        LockDetails memory __oldLock = userLockData[_tokenId];
        // position was already released
        if (__oldLock.released) return 0;
        // check expiry if not in `rescueMode`
        if (!rescueMode) {
            if (__oldLock.expiry > block.timestamp) revert AmountLocked();
        }

        userLockData[_tokenId].released = true;

        vaultToken.safeTransfer(_user, __oldLock.totalLocked);

        emit Exit(_user, __oldLock.totalLocked);
        return __oldLock.totalLocked;
    }

    function distributeReward(address _token, uint256 _amount) external nonReentrant {
        if (!isRewardToken[IERC20(_token)]) revert TokenNotValid();
        if (_amount == 0) return;

        //todo: maybe recompute weights here?!

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
    }

    /**
     * @notice claims all rewards distributed since token mint or last claim.
     * @dev Should be safe to claim even after position exit.
     *
     * @param _tokenId tokenId whose rewards to claim
     *
     * @return amounts_ Claimed amount of each reward token.
     */
    function claimRewards(uint256 _tokenId) external nonReentrant whenNotPaused returns (uint256[] memory amounts_) {
        amounts_ = _claimRewardsForToken(_tokenId);
    }

    /**
     * @notice batch claims all rewards distributed since token mint or last claim.
     * @dev Should be safe to claim even after position exit.
     *
     * @param _tokenIds tokenIds whose rewards to claim
     *
     * @return amounts_ Claimed amountsof each reward token, for each tokenId
     */
    function batchClaimRewards(uint256[] calldata _tokenIds)
        external
        nonReentrant
        whenNotPaused
        returns (uint256[][] memory amounts_)
    {
        amounts_ = new uint256[][](_tokenIds.length);
        uint256 len = _tokenIds.length;
        for (uint256 i; i < len; i++) {
            amounts_[i] = _claimRewardsForToken(_tokenIds[i]);
        }
    }

    // *********************** //
    // *** OWNER FUNCTIONS *** //
    // *********************** //
    /// ===== ERC721 ======
    /**
     * @notice Set the base URI
     * @dev callable by owner
     */
    function setBaseUri(string memory __baseURI) external onlyOwner {
        baseURI = __baseURI;
    }

    /// ===== REWARDS ======
    /**
     * @notice sets the maximum number of reward tokens.
     * @dev callable by owner
     * @param _length the new maximum number of reward tokens.
     */
    function setMaxNoOfRewardTokens(uint256 _length) external onlyOwner {
        if (rewardTokens.length > _length) revert InsufficientAmount();
        emit LogMaxRewardsLength(maxNoOfRewards, _length, rewardTokens.length);
        maxNoOfRewards = _length;
    }

    /**
     * @notice add a reward token to the list of reward tokens.
     * @dev callable by owner
     * @param _token The address of the reward token.
     */
    function addRewardToken(IERC20 _token) external onlyOwner {
        if (rewardTokens.length + 1 > maxNoOfRewards) {
            revert TokenLimitReached();
        }
        rewardTokens.push(_token);
        isRewardToken[_token] = true;

        emit AddRewardToken(address(_token));
    }
    /// ===== GENERIC ======
    /**
     * @notice activate the emergency sweep cooldown
     */

    function activateEmergencySweep() external onlyOwner {
        lastEmergencySweep = block.timestamp;
        emit ActivateEmergencySweep();
    }
    /**
     * @notice emergency sweep of all tokens in case of a critical issue.
     * strategy is to sweep tokens, then recreate positions with them on a new contract.
     *
     */

    function emergencySweep() external onlyOwner {
        if (lastEmergencySweep == 0 || block.timestamp < lastEmergencySweep + emergencySweepCooldown) {
            revert EmergencySweepCooldownNotReached();
        }

        // 1. Transfer the locks
        vaultToken.transfer(owner(), vaultToken.balanceOf(address(this)));

        // 2. Transfer the rewards
        uint256 len = rewardTokens.length;
        for (uint256 i = 0; i < len; ++i) {
            IERC20 token = rewardTokens[i];
            if (token != IERC20(address(0x0))) {
                token.safeTransfer(owner(), token.balanceOf(address(this)));
            }
        }

        lastEmergencySweep = 0;
    }

    function updateCluster(ICluster _newCluster) external onlyOwner {
        if (address(_newCluster) == address(0)) revert InvalidAction();
        cluster = _newCluster;
        emit ClusterUpdated(address(_newCluster));
    }
    /**
     * @notice Un/Pauses this contract.
     */
    function setPause(bool _pauseState) external {
        if (!cluster.hasRole(msg.sender, keccak256("PAUSABLE")) && msg.sender != owner()) revert NotAuthorized();
        if (_pauseState) {
            _pause();
        } else {
            _unpause();
        }
    }

    /**
     * @notice Set the rescue mode.
     */
    function setRescueMode(bool _rescueMode) external onlyOwner {
        emit RescueMode(_rescueMode);
        rescueMode = _rescueMode;
    }

    // ************************* //
    // *** PRIVATE FUNCTIONS *** //
    // ************************* //
    function _claimRewardsForToken(uint256 _tokenId) private returns (uint256[] memory amounts_) {
        address _user = _ownerOf(_tokenId);
        if (_user != msg.sender && !isERC721Approved(_user, msg.sender, address(this), _tokenId)) {
            revert NotApproved(_tokenId, msg.sender);
        }

        amounts_ = claimable(_tokenId);
        uint256 len = amounts_.length;
        for (uint256 i; i < len; i++) {
            uint256 amount = amounts_[i];
            if (amount > 0) {
                IERC20 _rewardToken = rewardTokens[i];
                claimedRewards[_tokenId][_rewardToken] += amount;
                _rewardToken.safeTransfer(_user, amount);
                emit ClaimReward(address(_rewardToken), _user, _tokenId, amount, i);
            }
        }
    }

    // ************************ //
    // *** ERC721 FUNCTIONS *** //
    // ************************ //
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, ERC721)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function _afterTokenTransfer(address from, address to, uint256 firstTokenId, uint256 batchSize)
        internal
        virtual
        override(ERC721, ERC721Permit)
    {
        super._afterTokenTransfer(from, to, firstTokenId, batchSize);
    }
}
