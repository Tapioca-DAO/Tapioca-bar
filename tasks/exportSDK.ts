import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { register } from '../test/test.utils';
import { loadJsonFile } from 'load-json-file';
import { getDeployments } from '../scripts/getDeployments';

const getStagingAddresses = async (hre: HardhatRuntimeEnvironment) => {
    if (!hre.network.tags['testnet']) {
        throw 'Not a testnet';
    }
    const all = await register(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered_objects: any = {};

    Object.keys(all)
        .map((e) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const obj = all[e as keyof typeof all] as any;
            if (obj?.address) {
                return { name: e, address: obj.address };
            }
        })
        .forEach((e) => {
            if (e) {
                filtered_objects[e.name] = e.address;
            }
        });

    console.log('=======STAGING ADDRESSES========');
    console.log(filtered_objects);
    console.log('================================');

    return filtered_objects;
};

/**
 * Script used to generate typings for the tapioca-sdk
 * https://github.com/Tapioca-DAO/tapioca-sdk
 */
export const exportSDK__task = async (
    taskArgs: { staging?: boolean; mainnet?: boolean },
    hre: HardhatRuntimeEnvironment,
) => {
    const cwd = process.cwd();
    const { mainnet, staging } = taskArgs;

    const __deployments = { prev: {} };
    try {
        __deployments.prev = await loadJsonFile(
            'tapioca-sdk/src/addresses.json',
        );
    } catch (e) {}

    if (staging) {
        const deployments = {
            ...__deployments.prev,
            [await hre.getChainId()]: await getStagingAddresses(hre),
        };
        await writeJsonFile('tapioca-sdk/src/addresses.json', deployments);
    } else {
        if (mainnet) {
            const deployments = {
                ...__deployments.prev,
                [await hre.getChainId()]: await getDeployments(hre),
            };
            await writeJsonFile('tapioca-sdk/src/addresses.json', deployments);
        }
    }

    // We are looking at
    // BeachBar, Mixologist, MixologistHelper;
    const allFiles = glob(cwd, [
        `${hre.config.paths.artifacts}/**/!(*.dbg).json`,
    ]).filter((e) =>
        [
            'YieldBox',
            'BeachBar',
            'Mixologist',
            'MixologistHelper',
            'ERC20',
            'ERC20Mock',
        ].some((v) => e.split('/').slice(-1)[0] === v.concat('.json')),
    );

    await runTypeChain({
        cwd,
        filesToProcess: allFiles,
        allFiles,
        outDir: 'tapioca-sdk/src/typechain',
        target: 'ethers-v5',
        flags: {
            alwaysGenerateOverloads: true,
            environment: 'hardhat',
        },
    });
};
