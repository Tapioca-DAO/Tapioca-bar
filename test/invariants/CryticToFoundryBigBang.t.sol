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
import {IBigBang} from "tapioca-periph/interfaces/bar/IBigBang.sol";

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
        _setUpBigBang();

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

/*     function test_liquidationCoverage() public {
        this.depositAsset(6118171668427308954168779944868519429957979943594762626456534848346,13723016264086663255320547410345143147227422538002146208221044496490322302,56033672603491885829478221381683690641552746168650514363405444279741398,251021867000000);
        this.addCollateral(194217746983629705204562464402686770946845550394160150372783116911141001,115135754831534972277010449995714387994217638980300780882241825441138507957,true,62470739779638642193228576037466598142928976863858815560103254062873998254,2287453710000);
        this.borrow(6170586545746978343666413280123708490732934572047903414987036203495,10000);

        actor = actors[USER2];
        actor.proxy(address(yieldbox), abi.encodeWithSelector(IYieldBox.withdraw.selector, assetIds[address(usdo)], address(actor), address(actor), 1000, 0));
        this.transferUSDO(100);

        this.set(1944889399411567290);
        this.liquidate(0, 10, 0);
    } */

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

    function test_executeBigBangIssue() public {//@audit-issue 2 & 3 uni v2 assembly & wrong way yot decode bytes to string
        this.depositAsset(2268021130264443167303607517844621310469132178889605857591245260,27613639982160961353128719600715822685242272582930523027502435792,9779978268036204693789253611256107583272329748,118677569);
        this.addCollateral(13740104378055513299907187212435070232705033720967918055,229838935903650384054216314565283887334980373563572373228010658234763,true,8598620256948709077867025854290669016553033098645554485550,112888585);
        this.set(65);
        console.log("3 -----------------------------------------------");
        this.borrow(43884631173,103760112);
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

    function test_BORROWING_INVARIANT_E() public {// PASS: breaks invariant BORROWING_INVARIANT_E
        this.depositAsset(84027550495474829978967527970889097317445874881,1590568045798011523397932283681399078770600397943965740041,38932883677169898583585090110958012,112895457);
        this.addCollateral(110044444127432929055138182635735580347754944931,2105074998667199894907467084299265081540672403117395099628204,true,722003098614135832271952176790986063828038680,112888585);
        this.set(65);
        echidna_borrowing_invariants();
        this.borrow(0,102333874);
        echidna_borrowing_invariants();
    }

    function test_BIGBANG_INVARIANTS() public {//@audit-issue breaks invariant BIGBANG_INVARIANT_A
        this.depositAsset(92727770941788933556213652558492865580158521820037560334356099819764267044816, 115792089237316195423570985008687907853269984665640564039457584007909973853055, 14368400162203276715780525413820116666340671660487503168117855836382892609965, 5000000000000000);
        echidna_BIGBANG_INVARIANTS();
    }

    
    function test_temp_0_test_borrow_123() public {
        _setUpBlockAndActor(57893, USER3);
        this.set(1571982590000);
        _setUpActor(USER2);
        this.depositAsset(79985, 2457304616710921090178534440043750219888775566315000000000000000, 115792089237316195423570985008687907853269984665640564039457584007913129639926, 49);
        this.depositAsset(107937193204523055274057490393139541929833159468330755088941301132812121056674, 491460923342184218035706888008750043977755113263, 33647910580578482908347110514536502241469169920698614243678967967424090254426, 520181198976);
        _setUpBlockAndActor(71670, USER2);
        this.addCollateral(1, 69987132856896199803236552831158049513847091431270389020517364379489269659628, true, 105196697320511772507181268140966456277305675910125523214776383218573884578197, 1722477838);
        _setUpBlockAndActor(71723, USER1);
        this.borrow(256, 92);
        
        _setUpBlockAndActor(71735, USER1);
        this.set(300000000000000000);
        _setUpBlockAndActor(95561, USER2);
        this.assert_LENDING_INVARIANT_F(12);
        _setUpBlockAndActor(139720, USER2);
        this.set(554285563);
        _setUpBlockAndActor(184602, USER1);
        this.borrow(51607454310344774911696305747202345860972399783615179574934700147424724474233, 47600);
    }
		
    ///////////////////////////////////////////////////////////////////////////////////////////////
    //                               BROKEN INVARIANTS: SECOND REVISION                          //
    ///////////////////////////////////////////////////////////////////////////////////////////////

    function test_INVARIANT_addCollateral() public {
        _setUpBlockAndActor(23759, USER2);
        this.depositAsset(75067023218584978660784246712224542201279153338170012821738688448343051351379, 115792089237316195423570985008687907853269984665640564039457584007913129444028, 3652614694, 286656519680000);
        
        console.log("1------------------------");
        _setUpBlockAndActor(39675, USER2);
        this.set(13);

        console.log("2------------------------");
        _setUpBlockAndActor(45124, USER3);
        this.addCollateral(50597082, 1543430, true, 11, 100000000);

        console.log("3------------------------");
        this.borrow(6614734692278407310933401687400938200392682668866093542221752890290279657511, 2514000705);

        console.log("4------------------------");
        console.log("BBrate: ", bigBang._exchangeRate());
        _setUpBlockAndActor(98784, USER1);
        this.set(353073666);
        console.log("exchangeRateBefore: ", marketVars.exchangeRateBefore);
        console.log("exchangeRateAfter: ", marketVars.exchangeRateAfter);

        console.log("5------------------------");
        console.log("BBrate: ", bigBang._exchangeRate());
        _setUpBlockAndActor(127715, USER1);
        this.borrow(24330210156633430341863977237441074729131895356543521511302897264929753151109, 0);
        console.log("exchangeRateBefore: ", marketVars.exchangeRateBefore);
        console.log("exchangeRateAfter: ", marketVars.exchangeRateAfter);

        console.log("6------------------------");
        console.log("BBrate: ", bigBang._exchangeRate());
        _setUpBlockAndActor(149930, USER2);
        this.set(189);
        console.log("exchangeRateBefore: ", marketVars.exchangeRateBefore);
        console.log("exchangeRateAfter: ", marketVars.exchangeRateAfter);

        console.log("7------------------------");
        console.log("BBrate: ", bigBang._exchangeRate());
        _setUpBlockAndActor(199588, USER3);
        this.addCollateral(20437108585662599355983899680038899964253291396579415854686205062149370412608, 67385417444270754022155613515820175001418827360684120523798185994304278754624, true, 100946053350603016977178184532101374305568087210516528628434320194215058466519, 100000);
        console.log("exchangeRateBefore: ", marketVars.exchangeRateBefore);
        console.log("exchangeRateAfter: ", marketVars.exchangeRateAfter);
    }

    function test_echidna_borrowing_invariants() public {
        echidna_borrowing_invariants();
    }

    function test_echidna_common_invariants() public {
        echidna_common_invariants();
    }

    function test_echidna_BIGBANG_INVARIANTS() public {
        echidna_BIGBANG_INVARIANTS();
    }

    function test_echidna_leverageCoverage() public {
        this.buyCollateral(0, 0, 0);
    }

    function test_totalSupplyInvariantCheck() public {
        this.depositAsset(3,128793180560187718900126177335835995259196866084559495000988,628629813546935530047777883322877,108875544);
        this.addCollateral(10698457979064906814275067566991586579917543745,8551211297628925156886499982755869617330554975744517383952772421,true,487782318380180306770510361571721386444178726564,71361998);
        this.set(1);
        this.borrow(0,1);
        (uint64 debtRate,) = bigBang.accrueInfo();
        console.log("Debt rate", debtRate);
        _delay(1000000000000000);
        this.borrow(0,1);
        (debtRate,) = bigBang.accrueInfo();
        console.log("Debt rate", debtRate);
        assert_BIGBANG_INVARIANT_F();
    }

    function test_echidna_BIGBANG_INVARIANTS2() public {
        this.depositAsset(283950262471877866666845008047659005594753815736052280782844622236168617,31473864922422349055163629278306494246517987265720547229908811407026931,26951718241602657621855159858230600594314404807998222490907037578,100915106);
        this.addCollateral(356483634319629982006324661070029855542641116208348986690962,211698902238831407660985968316695162430160465860258076634196729036,true,577881159858621061009009755069340168340468176840319513076465,75003272);
        this.set(1);
        this.borrow(0,386013);
        _delay(16354);
        this.assert_LENDING_INVARIANT_F(0);//@audit-issue bigbang total supply is not getting updated
        console.log("bigBanb: ", usdo.totalSupply());
        console.log("bigBanb: ", bigBang._totalBorrow().elastic);
        console.log("bigBanb: ", bigBang.openInterestDebt());
        assert_BIGBANG_INVARIANT_F();
    }

    function test_borrowFailedAssertion1() public {//@audit-issue fails
        this.depositAsset(153509609105767628767812861116691697061377007508406388863054328461728950684,185374433155787667954301205947375067596781741427420189091031732952810984,113031149066055039053181809158453371670767372190132853880168341061,107729629);
        this.addCollateral(51207187491510966041753036501933256140492138050012794731132600626,25892888469447780866544757273387900545061090702665388378292125347111, true, 23384335119838807296783423937207850023598032083885375977278,74550236);
        this.set(1);
        this.borrow(0,36969);
        _delay(175342);
        this.borrow(187820722226647875382298166412400863680656,0);
        this.borrow(809058086427,1);
    }
    error ExchangeRateNotValid();
    function forcedRevert() public {
        revert("forced revert message");
    }

    function test_buyCollateralCoverage2() public {
        (bool success, bytes memory returnData) = address(this).call(abi.encodeWithSelector(this.forcedRevert.selector));

        string memory aux = abi.decode(_getRevertMsg(returnData), (string));

        console.log("aux: ", aux);
    }

    function _getRevertMsg(bytes memory _returnData) internal returns (bytes memory) {
        console.log("returnData: ", _returnData.length);

        if (_returnData.length > 1000) return abi.encode("Market: reason too long");
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return abi.encode("Market: no return data");


        // solhint-disable-next-line no-inline-assembly
        assembly {
            // Slice the sighash.
            _returnData := add(_returnData, 0x04)
        }
        return _returnData; // All that remains is the revert string
    }

    struct Rebase {
        uint128 elastic;
        uint128 base;
    }

    function test_ElasticInvariant(uint128 _elastic, uint128 _base, uint256 part) public {
        vm.assume(_elastic >= _base);
        vm.assume(part <= _base);
        Rebase memory _totalBorrow = Rebase(_elastic, _base);

        (_totalBorrow,) = sub(_totalBorrow, part, true);
        assertLe(_totalBorrow.base, _totalBorrow.elastic, "NotEnough");
    }

    function sub(
        Rebase memory total,
        uint256 base,
        bool roundUp
    ) internal pure returns (Rebase memory, uint256 elastic) {
        elastic = toElastic(total, base, roundUp);
        total.elastic -= uint128(elastic);
        total.base -= uint128(base);
        return (total, elastic);
    }

    function toElastic(
        Rebase memory total,
        uint256 base,
        bool roundUp
    ) internal pure returns (uint256 elastic) {
        if (total.base == 0) {
            elastic = base;
        } else {
            elastic = (base * total.elastic) / total.base;
            if (roundUp && (elastic * total.base) / total.elastic < base) {
                elastic++;
            }
        }
    }

    function test_repayAssertion() public {
        this.depositAsset(215805102445565808107808247818328603730239073085917632851303440839579314,13013036289037759488496655178268428056914978162820081855912412693146703,83942420367555004954079051443938379174523481049133576172601879998,105466109);
        this.addCollateral(3101268420345745728043115727299507180680590637862746078916616606020,343904809310754588953876923135405297773305575942278634620707160171675, true, 21237637429649436613309731798731765121082268577123245495175609, 73746990);
        this.set(1);
        this.borrow(0,43233);
        _delay(146899);
        this.repay(1441530356440027319313390469408857713245910073298862346972, false,1);
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

    function _setUpActor(address _user) internal {
        actor = actors[_user];
    }
}

