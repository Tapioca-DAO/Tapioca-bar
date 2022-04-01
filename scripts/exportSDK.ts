import hre from 'hardhat';
import { glob, runTypeChain } from 'typechain';
import { test_staging } from '../test/test.utils';
import writeJsonFile = require('write-json-file');

const getStagingAddresses = async () => {
    const all = await test_staging();
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
async function main() {
    const cwd = process.cwd();
    const deployments = await getStagingAddresses();

    // We are looking at
    // BeachBar, Mixologist, MixologistHelper;
    const allFiles = glob(cwd, [
        `${hre.config.paths.artifacts}/contracts/**/!(*.dbg).json`,
    ])
        .filter((e) => !e.includes('interfaces'))
        .filter((e) =>
            ['beachbar', 'mixologist'].some((v) =>
                e.split('/').slice(-1)[0].toLowerCase().includes(v),
            ),
        );

    await writeJsonFile('tapioca-sdk/src/addresses.json', deployments);
    await runTypeChain({
        cwd,
        filesToProcess: allFiles,
        allFiles,
        outDir: 'tapioca-sdk/src/typechain',
        target: 'ethers-v5',
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
