import { Contract } from 'ethers';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import inquirer from 'inquirer';
import { typechain } from 'tapioca-sdk';
import { Multicall3 } from 'tapioca-sdk/dist/typechain/utils/MultiCall';
import { constants } from '../../deploy/utils';
import { buildYieldBox } from '../deployBuilds/00-buildYieldBox';
import { buildPenrose } from '../deployBuilds/01-buildPenrose';
import { buildMasterContracts } from '../deployBuilds/02-buildMasterContracts';
import { buildMarketHelpers } from '../deployBuilds/03-buildMarketHelpers';
import { buildMultiSwapper } from '../deployBuilds/04-buildMultiSwapper';
import { buildUSD0 } from '../deployBuilds/06-buildUSDO';
import { buildStableToUSD0Bidder } from '../deployBuilds/07-buildStableToUSD0Bidder';
import { buildSingularityModules } from '../deployBuilds/08-buildSingularityModules';
import { buildMarketProxy } from '../deployBuilds/09-buildMarketProxy';
import { buildPenroseSetup } from '../setups/01-buildPenroseSetup';
import { buildMasterContractsSetup } from '../setups/02-buildMasterContractsSetup';
import { loadVM, deployMultisigMock, transferOwnership } from '../utils';

// hh deployFullStack --network goerli
export const deployFullStack__task = async (
    {},
    hre: HardhatRuntimeEnvironment,
) => {
    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');
    const signer = (await hre.ethers.getSigners())[0];
    const VM = await loadVM(hre, tag);

    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    let tapToken = hre.SDK.db
        .loadGlobalDeployment(tag, 'tap-token', chainInfo.chainId)
        .find((e) => e.name === 'TapOFT');

    let weth = hre.SDK.db
        .loadGlobalDeployment(tag, 'tap-token', chainInfo.chainId)
        .find((e) => e.name.startsWith('WETHMock'));

    if (!weth) {
        //try to take it again from local deployment
        weth = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name.startsWith('WETHMock'));
    }
    if (!tapToken) {
        //try to take it again from local deployment
        tapToken = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name.startsWith('TapOFT'));
    }

    if (!tapToken || !weth) {
        throw new Error(`[-] Token not found: ${tapToken}, ${weth}`);
    }

    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    await deploy('PenroseMock', {
        from: deployer,
        log: true,
        args: [
            hre.ethers.constants.AddressZero,
            hre.ethers.constants.AddressZero,
            hre.ethers.constants.AddressZero,
            hre.ethers.constants.AddressZero,
        ],
    });
    const penroseMock = await deployments.get('PenroseMock');

    // Owner deployment
    const multisig = await deployMultisigMock(hre, 1, [
        hre.SDK.config.MULTICALL_ADDRESSES[chainInfo?.chainId],
    ]);
    console.log(`[+] Multisig deployed on ${multisig}`);

    // 00 - Deploy YieldBox
    const [ybURI, yieldBox] = await buildYieldBox(hre, weth.address);
    VM.add(ybURI).add(yieldBox);

    // 01 - Penrose
    const penrose = await buildPenrose(
        hre,
        tapToken.address,
        weth.address,
        signer.address,
    );
    VM.add(penrose);

    // 02 - Master contracts
    const [sgl, bb] = await buildMasterContracts(hre);
    VM.add(sgl).add(bb);

    // 03 - MarketHelper
    const marketHelper = await buildMarketHelpers(hre);
    VM.add(marketHelper);

    // 04 - MultiSwapper
    const multiSwapper = await buildMultiSwapper(
        hre,
        constants[chainInfo.chainId].uniV2Factory,
        constants[chainInfo.chainId].uniV2PairHash,
    );
    VM.add(multiSwapper);

    // 05 - SingularityModules
    const [liq, lendBorrow] = await buildSingularityModules(hre);
    VM.add(liq).add(lendBorrow);

    // 06 USDO
    const usdo = await buildUSD0(hre, chainInfo.address, signer.address);
    VM.add(usdo);

    // 07 - CurveSwapper-buildStableToUSD0Bidder
    const [curveSwapper, curveStableToUsd0] = await buildStableToUSD0Bidder(
        hre,
        constants[chainInfo.chainId].crvStablePool,
        penroseMock.address,
    );
    VM.add(curveSwapper).add(curveStableToUsd0);

    // 08 MarketsProxy
    const marketProxy = await buildMarketProxy(
        hre,
        chainInfo.address,
        signer.address,
    );
    VM.add(marketProxy);

    // Add and execute
    await VM.execute(3);
    VM.save();
    const { wantToVerify } = await inquirer.prompt({
        type: 'confirm',
        name: 'wantToVerify',
        message: 'Do you want to verify the contracts?',
    });
    if (wantToVerify) {
        await VM.verify();
    }

    // After deployment setup
    const vmList = VM.list();
    const multiCall = typechain.Multicall.Multicall3__factory.connect(
        hre.SDK.config.MULTICALL_ADDRESSES[chainInfo?.chainId],
        signer,
    );
    const calls: Multicall3.Call3Struct[] = [
        ...(await buildPenroseSetup(hre, vmList, signer.address)),
        ...(await buildMasterContractsSetup(hre, vmList)),
    ];

    // Execute
    console.log('[+] After deployment setup calls number: ', calls.length);
    if (calls.length > 0) {
        try {
            const tx = await (await multiCall.aggregate3(calls)).wait(1);
            console.log(
                '[+] After deployment setup multicall Tx: ',
                tx.transactionHash,
            );
        } catch (e) {
            // If one fail, try them one by one
            for (const call of calls) {
                await (
                    await signer.sendTransaction({
                        data: call.callData,
                        to: call.target,
                    })
                ).wait();
            }
        }
    }

    //Transfer ownership
    console.log('[+] Transferring ownership');
    await transferOwnership(
        hre,
        [usdo, marketProxy],
        tag,
        chainInfo.chainId,
        multisig,
    );

    console.log('[+] Stack deployed! 🎉');
};
