import { HardhatRuntimeEnvironment } from 'hardhat/types';
import _ from 'lodash';

import { TContract } from '@tapioca-sdk/shared';
import { Cluster } from '@tapioca-sdk/typechain/tapioca-periphery';
import ClusterArtifact from '@tapioca-sdk/artifacts/tapioca-periphery/Cluster.json';

export const fillCluster__task = async (
    data: { chains: [] },
    hre: HardhatRuntimeEnvironment,
) => {
    const chainInfo = hre.SDK.utils.getChainBy('chainId', hre.SDK.eChainId);
    if (!chainInfo) {
        throw new Error('Chain not found');
    }

    const tag = await hre.SDK.hardhatUtils.askForTag(hre, 'local');

    let clusterDeployment = hre.SDK.db
        .loadGlobalDeployment(tag, 'tapioca-periphery', chainInfo.chainId)
        .find((e) => e.name == 'Cluster');
    if (!clusterDeployment) {
        clusterDeployment = hre.SDK.db
            .loadLocalDeployment(tag, chainInfo.chainId)
            .find((e) => e.name == 'Cluster');
    }
    if (!clusterDeployment) {
        throw new Error('[-] Cluster not found');
    }

    const signer = (await hre.ethers.getSigners())[0];
    const clusterContract = new hre.ethers.Contract(
        clusterDeployment?.address,
        ClusterArtifact.abi,
        signer,
    ).connect(signer) as Cluster;

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

    let allContracts = loadAllContracts(hre, tag, hre.SDK.eChainId, filter);

    console.log('Whitelist all contracts from current chain');
    await (
        await clusterContract.batchUpdateContracts(
            0,
            allContracts.map((a) => a.address),
            true,
        )
    ).wait(3);
    const supportedChains = hre.SDK.utils.getSupportedChains();
    for (let i = 0; i < data.chains.length; i++) {
        console.log(`Whitelist all contracts from chain no ${data.chains[i]}`);
        allContracts = loadAllContracts(hre, tag, data.chains[i], filter);
        await (
            await clusterContract.batchUpdateContracts(
                supportedChains.filter((a) => a.chainId == data.chains[i])[0]
                    .lzChainId,
                allContracts.map((a) => a.address),
                true,
            )
        ).wait(3);
    }

    console.log('Done');
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
            hre.SDK.config.TAPIOCA_PROJECTS_NAME.YieldBox,
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
