// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Libraries
import "forge-std/Test.sol";
import "forge-std/console.sol";

// Test Contracts
import {BigBangInvariantsWrapper} from "./invariants/wrappers/BigBangInvariantsWrapper.t.sol";
import {SingularityInvariantsWrapper} from "./invariants/wrappers/SingularityInvariantsWrapper.t.sol";
import {Setup} from "./Setup.t.sol";

// Interfaces
import {IYieldBox} from "yieldbox/interfaces/IYieldBox.sol";

/// @title CryticToFoundry
/// @notice Foundry wrapper for fuzzer failed call sequences
/// @dev Regression testing for failed call sequences
contract CryticToFoundry is SingularityInvariantsWrapper, BigBangInvariantsWrapper, Setup {
    modifier setup() override {
        _;
    }

    /// @dev Foundry compatibility faster setup debugging
    function setUp() public {
        // Deploy protocol contracts and protocol actors
        //_setUpBigBang();

        _setUpSingularity();

        // Deploy actors
        _setUpActors();

        // Initialize handler contracts
        _setUpHandlers();

        actor = actors[USER1];
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                            COVERAGE                                       //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function test_coverage() public {
        this.borrow(0, 0);
    }

    function test_liquidationCoverage() public {
        this.depositAsset(6118171668427308954168779944868519429957979943594762626456534848346,13723016264086663255320547410345143147227422538002146208221044496490322302,56033672603491885829478221381683690641552746168650514363405444279741398,251021867000000);
        this.addCollateral(194217746983629705204562464402686770946845550394160150372783116911141001,115135754831534972277010449995714387994217638980300780882241825441138507957,true,62470739779638642193228576037466598142928976863858815560103254062873998254,2287453710000);
        this.borrow(6170586545746978343666413280123708490732934572047903414987036203495,10000);

        actor = actors[USER2];
        actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.withdraw.selector, assetIds[address(usdo)], address(actor), address(actor), 1000, 0));
        this.transferUSDO(100);

        this.set(1944889399411567290);
        this.liquidate(0, 10, 0);
    }

    function test_invariant() public {
        this.depositAsset(5283448775820902413204519880272882622267065402209855343709849217463487,1575348852894522809563753657731906125278221396194809603758526491955964937,119001015743916938339319679054573033741833096463133269453846077464444,165197516);
        this.addCollateral(20240067579096632268952443691080493090142565719157383735328907338888,20731643349348121870544742272564944860148893518011240874183961048538945980,true,1424914110006473128378977359740449387920007352077637661029200373,163131056);
        this.set(8166204);
        this.borrow(29879538768424196436973453901927149332772009808434438947390704064,563);
        _delay(1);
        this.addCollateral(1037504223025604,27686249014286763395985555,false,2857553221488029674288387,230033152451802133734221);
        echidna_common_invariants();
    }

    function test_invariant3() public {
        _setUpBlockAndActor(3, USER2);
        this.depositAsset(82688603460542453282184850413132388020200563645788512192351353399934885065788, 115792089237316195423570985008687907853269984665640564039457584007913129639927, 73857469274338396147323412103808270906093303354968753915211905167010260338549, 300000000000000000);
        _setUpBlockAndActor(54851, USER2);
        this.addCollateral(115792089237316195423570985008687907853269984665640564039457584007913129639431, 100830665958053693744742793386619920864917085235688571748536745260255152047611, false, 491460923342184218035706888008750043977755113263, 502);
        assert_COMMON_INVARIANT_C();
    }

    function test_invariant2() public {
        assert_COMMON_INVARIANT_F();
    }

    function test_assertion1() public {
        this.borrow(0, 0);
    }

    function test_repayAssertion() public {
        this.depositAsset(2268021130264443167303607517844621310469132178889605857591245260,27613639982160961353128719600715822685242272582930523027502435792,9779978268036204693789253611256107583272329748,118677569);
        this.addCollateral(13740104378055513299907187212435070232705033720967918055,229838935903650384054216314565283887334980373563572373228010658234763,true,8598620256948709077867025854290669016553033098645554485550,112888585);
        this.set(65);
        console.log("3 -----------------------------------------------");
        this.borrow(43884631173,103760112);
        console.log("2 -----------------------------------------------");
        this.repay(0,false,100);
    }

    function test_assertion2() public {
        this.depositAsset(872937509508747805179551374451049818836806794041761343683932344846049928,1992567519456641372353395695695817905688852739887376102183954918023467008,647800004261283060370195336807666608861448216583282429169467240514104,599637214807);
        this.addCollateral(1004715563599698768851528323353439755888544030889028802621746714975098611,4785340763551780068647040076702334105054932138926,true,171614996531865021657812132956237641301092682509404346974433308804215629191,156705203);
        this.depositAsset(104942118220738283846222596620001111305284661342720077949086125812060393739,5769667517190074923882730957456739990005499550746563371330377739692918993,71866862775973597773572112491058182140337446924029046090155085628159617,9222496745321456);
        this.addAsset(64,true,6448127457200523);
        this.set(78);

        this.borrow(1651294133940092146496849186072275090956675095750149100223487301045028,61441715);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                      BROKEN INVARIANTS                                    //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function test_BORROWING_INVARIANT_E() public {//@audit-issue breaks invariant BORROWING_INVARIANT_E
        this.depositAsset(84027550495474829978967527970889097317445874881,1590568045798011523397932283681399078770600397943965740041,38932883677169898583585090110958012,112895457);
        this.addCollateral(110044444127432929055138182635735580347754944931,2105074998667199894907467084299265081540672403117395099628204,true,722003098614135832271952176790986063828038680,112888585);
        this.set(65);
        echidna_borrowing_invariants();
        this.borrow(0,102333874);
        echidna_borrowing_invariants();
    }

    function test_LENDING_INVARIANT_F() public {//@audit-issue breaks invariant LENDING_INVARIANT_F
        this.addCollateral(0,249967167224412689345948710965838539747203804318257341338,true,0,0);
    }

    function test_LENDING_INVARIANT_C2() public {//@audit-issue breaks invariant LENDING_INVARIANT_C2
        this.removeCollateral(0,0,0);
    }

    function test_SINGULARITY_INVARIANTS1() public {
        _setUpBlockAndActor(10483, USER1);
        this.depositAsset(93233437676153043780619095587883485304683921607809593242097127426835041472294, 40912076364029671817417446916375301006926381437720857482693271626673711978789, 115792089196482756578492131941064060604702231768235835301579706380861786892000, 353073666);
        this.addAsset(59790970058468620102435961557330553305472509152739786495245951948983907383242, true, 4319);
        _setUpBlockAndActor(14990, USER1);
        this.addAsset(33540519, true, 991);
        echidna_SINGULARITY_INVARIANTS();
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                                           HELPERS                                         //
    ///////////////////////////////////////////////////////////////////////////////////////////////


    function _setUpBlockAndActor(uint256 _block, address _user) internal {
        vm.roll(_block);
        actor = actors[_user];
    }

    function _delay(uint256 _seconds) internal {
        vm.warp(block.timestamp + _seconds);
    }

    function _setUpActorAndDelay(address _user, uint256 _seconds) internal {
        actor = actors[_user];
        vm.warp(block.timestamp + _seconds);
    }

    function _setUpTimestampAndActor(uint256 _timestamp, address _user) internal {
        vm.warp(_timestamp);
        actor = actors[_user];
    }
}

