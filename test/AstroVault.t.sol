// SPDX-License-Identifier: UNLICENSED

pragma solidity 0.8.22;

import "forge-std/Test.sol";

// external
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Tapioca
import {Pearlmit, IPearlmit} from "tap-utils/pearlmit/Pearlmit.sol";
import {ICluster} from "tap-utils/interfaces/periph/ICluster.sol";
import {Cluster} from "tap-utils/Cluster/Cluster.sol";

import {AstroVault} from "contracts/AstroVault.sol";

import {ERC20Mock} from "./mocks/ERC20Mock.sol";

contract AstroVaultTest is Test, IERC721Receiver{
    Pearlmit pearlmit;
    Cluster cluster;
    ERC20Mock asset;
    ERC20Mock rewardTokenOne;
    ERC20Mock rewardTokenTwo;

    AstroVault astroVault;

    uint256 small = 1 ether;
    uint256 big = 100 ether;

    uint256 len = 10;

    string public constant BASE_URI = "https://tapioca.xyz/";

    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function setUp() public {
        pearlmit = new Pearlmit("Pearlmit", "1", address(this), 0);
        cluster = new Cluster(1, address(this));
        asset = new ERC20Mock("Asset", "asset");

        rewardTokenOne = new ERC20Mock("R1", "R1");
        rewardTokenTwo = new ERC20Mock("R2", "R2");

        astroVault = new AstroVault(address(asset), IPearlmit(address(pearlmit)), ICluster(address(cluster)), address(this));
        astroVault.setBaseUri(BASE_URI);
    }


    function test_base_Uri() external {
        assertEq(astroVault.baseURI(), BASE_URI);
    }

    function test_tokenId() external {
        assertEq(astroVault.lastTokenId(), 0);
    }

    function test_vault_token() external {
        assertEq(address(astroVault.vaultToken()), address(asset));
    }

    function test_vault_participate_single() external {
        _singleParticipation(1 ether, astroVault.lockDurationBracket2());

        assertEq(astroVault.lastTokenId(), 1);
    }

    function test_vault_participate_multiple(uint256 amount) external {
        for(uint i; i < 10; i++) {
            amount = bound(amount, small, big);
            _singleParticipation(amount, astroVault.lockDurationBracket2());
        }

        assertEq(astroVault.lastTokenId(), 10);
    }

    function test_vault_claimable(uint256 amount) external {
        amount = bound(amount, small, big);

        astroVault.addRewardToken(IERC20(address(rewardTokenOne)));
        astroVault.addRewardToken(IERC20(address(rewardTokenTwo)));

        deal(address(rewardTokenOne), address(this), amount);
        deal(address(rewardTokenTwo), address(this), amount);

        vm.expectRevert(AstroVault.TokenNotValid.selector);
        uint256[] memory claimable = astroVault.claimable(0);

        _singleParticipation(amount, astroVault.lockDurationBracket2());

        claimable = astroVault.claimable(0);
        assertEq(claimable[0], 0);
        assertEq(claimable[1], 0);


        rewardTokenOne.transfer(address(astroVault), amount);
        claimable = astroVault.claimable(0);
        assertEq(claimable[0], amount); //full weight
        assertEq(claimable[1], 0);

        _singleParticipation(amount, astroVault.lockDurationBracket2());
        claimable = astroVault.claimable(0);
        assertEq(claimable[0], amount/2); //half weight
        assertEq(claimable[1], 0);
    }

    function test_vault_claimTokens(uint256 amount) external {
        amount = bound(amount, small, big);

        astroVault.addRewardToken(IERC20(address(rewardTokenOne)));
        astroVault.addRewardToken(IERC20(address(rewardTokenTwo)));

        deal(address(rewardTokenOne), address(this), amount);
        deal(address(rewardTokenTwo), address(this), amount);

        _singleParticipation(amount, astroVault.lockDurationBracket2());
        rewardTokenOne.transfer(address(astroVault), amount);
        _singleParticipation(amount, astroVault.lockDurationBracket2());

        uint256[] memory claimable = astroVault.claimable(0);
        assertEq(claimable[0], amount/2); //half weight
        uint256 balanceBefore = rewardTokenOne.balanceOf(address(this));
        astroVault.claimRewards(0);
        uint256 balanceAfter = rewardTokenOne.balanceOf(address(this));
        assertEq(balanceAfter, balanceBefore + claimable[0]);
        // recheck after claim
        claimable = astroVault.claimable(0);
        assertEq(claimable[0], 0); 

        // more rewards come in
        deal(address(rewardTokenOne), address(this), amount);
        rewardTokenOne.transfer(address(astroVault), amount);
        claimable = astroVault.claimable(0);
        uint256[] memory claimableSecondToken = astroVault.claimable(1);
        assertLt(claimable[0], claimableSecondToken[0]); // should be higher as there was a claim for first token already

        // claim everything
        astroVault.claimRewards(0);
        astroVault.claimRewards(1);
        claimable = astroVault.claimable(0);
        claimableSecondToken = astroVault.claimable(1);
        assertEq(claimable[0], 0);
        assertEq(claimableSecondToken[0], 0);
    }


    function _singleParticipation(uint256 amount, uint256 noOfEpochs) private {
        deal(address(asset), address(this), amount);

        pearlmit.approve(20, address(asset), 0, address(astroVault), uint200(amount), uint48(block.timestamp));
        IERC20(address(asset)).approve(address(pearlmit), amount);

        uint256 balanceBefore = asset.balanceOf(address(astroVault));
        astroVault.participate(address(this), amount, noOfEpochs); //50% discount
        uint256 balanceAfter = asset.balanceOf(address(astroVault));

        uint256 tokenId = astroVault.lastTokenId() - 1;


        AstroVault.LockDetails memory lock = astroVault.viewLockInfo(tokenId);

        assertEq(balanceAfter, balanceBefore + amount);
        assertEq(astroVault.ownerOf(tokenId), address(this));
        assertEq(lock.totalLocked, amount);
        assertEq(lock.discountRate, astroVault.viewDiscountRate(noOfEpochs));
        assertGt(lock.lockTimestamp, 0);
        assertGt(lock.expiry, lock.lockTimestamp);
        assertEq(lock.expiry, lock.lockTimestamp + (noOfEpochs * astroVault.SECONDS_PER_LOCK_UNIT()));
        assertFalse(lock.released);

        console.log(" Lock info: ");
        console.log("     - total locked: %s", lock.totalLocked);
        console.log("     - discount    : %s", lock.discountRate);
        console.log("     - released    : %s", lock.released);
    }
}