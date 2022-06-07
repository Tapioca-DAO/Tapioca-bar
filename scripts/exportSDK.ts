import hre from 'hardhat';
import { glob, runTypeChain } from 'typechain';
import { register } from '../test/test.utils';
import writeJsonFile = require('write-json-file');

const getStagingAddresses = async () => {
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

    console.log(filtered_objects);
    return filtered_objects;
};

/**
 * Script used to generate typings for the tapioca-sdk
 * https://github.com/Tapioca-DAO/tapioca-sdk
 */
export async function exportSDK(deploy: boolean) {
    const cwd = process.cwd();

    if (deploy) {
        const deployments = await getStagingAddresses();
        await writeJsonFile('tapioca-sdk/src/addresses.json', deployments);
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
}
