import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';

import { TContract } from '../../gitsub_tapioca-sdk/src/shared';
import { Cluster } from '../../gitsub_tapioca-sdk/src/typechain/tapioca-periphery';

export const fillCluster__task = async (
    data: { chains: [] },
    hre: HardhatRuntimeEnvironment,
) => {
    const chainInfo = hre.SDK.utils.getChainBy(
        'chainId',
        await hre.getChainId(),
    );
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');

    let clusterDeployment = hre.SDK.db
        .loadGlobalDeployment(tag, 'Cluster', chainInfo.chainId)
        .find((e) => e.name == 'Cluster');
    if (!clusterDeployment) {
        clusterDeployment = hre.SDK.db
            .loadGlobalDeployment(tag, 'Cluster', chainInfo.chainId)
            .find((e) => e.name == 'Cluster');
    }
    if (!clusterDeployment) {
        throw new Error('[-] Cluster not found');
    }
    const clusterContract = (await hre.ethers.getContractAt(
        'Cluster',
        clusterDeployment?.address,
    )) as Cluster;

    //whitelist ontracts for the current chain; TapiocaOFTs and USDO are set during setLzRemote task
    const fixedNames = [
        'MockSwapper',
        'YieldBox',
        'USDO',
        'TapOFT',
        'TapiocaOptionLiquidityProvision',
        'OTAP',
        'TwTAP',
        'TapiocaOptionBroker',
        'Magnetar',
        'MagnetarHelper',
    ];
    const startsWith = ['BigBang', 'Tapioca Singularity', 'TapiocaOFT'];
    const filter = (a: TContract) => {
        if (a.name == 'Cluster') return false;

        if (fixedNames.indexOf(a.name) > -1) return true;

        for (let i = 0; i < startsWith.length; i++) {
            if (a.name.startsWith(startsWith[i])) return true;
        }
    };

    let allContracts = loadAllContracts(
        hre,
        tag,
        await hre.getChainId(),
        filter,
    );

    await (
        await clusterContract.batchUpdateContracts(
            0,
            allContracts.map((a) => a.address),
            true,
        )
    ).wait(3);

    for (let i = 0; i < data.chains.length; i++) {
        allContracts = loadAllContracts(hre, tag, data.chains[i], filter);
        await (
            await clusterContract.batchUpdateContracts(
                data.chains[i],
                allContracts.map((a) => a.address),
                true,
            )
        ).wait(3);
    }
};

const loadAllContracts = (
    hre: HardhatRuntimeEnvironment,
    tag: any,
    chain: any,
    filter: any,
) => {
    const contracts = loadContractsFromProject(
        hre,
        tag,
        chain,
        hre.SDK.config.TAPIOCA_PROJECTS_NAME.TapiocaBar,
        filter,
    );
    contracts.push(
        ...loadContractsFromProject(
            hre,
            tag,
            chain,
            hre.SDK.config.TAPIOCA_PROJECTS_NAME.TapiocaZ,
            filter,
        ),
    );
    contracts.push(
        ...loadContractsFromProject(
            hre,
            tag,
            chain,
            hre.SDK.config.TAPIOCA_PROJECTS_NAME.TapToken,
            filter,
        ),
    );
    contracts.push(
        ...loadContractsFromProject(
            hre,
            tag,
            chain,
            hre.SDK.config.TAPIOCA_PROJECTS_NAME.TapiocaPeriphery,
            filter,
        ),
    );
    contracts.push(
        ...loadContractsFromProject(
            hre,
            tag,
            chain,
            hre.SDK.config.TAPIOCA_PROJECTS_NAME.Generic,
            filter,
        ),
    );
    return contracts;
};

const loadContractsFromProject = (
    hre: HardhatRuntimeEnvironment,
    tag: any,
    chain: any,
    projectName: any,
    filter: any,
) => {
    return hre.SDK.db
        .loadGlobalDeployment(tag, projectName, chain)
        .filter(filter);
};
