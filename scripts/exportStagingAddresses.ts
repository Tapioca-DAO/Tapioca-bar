import fs from 'fs';
import hre from 'hardhat';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import writeJsonFile from 'write-json-file';
import { register } from '../test/test.utils';

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

export const exportStagingAddresses = async () => {
    const __deployments = { prev: {} };
    try {
        __deployments.prev = JSON.parse(
            fs.readFileSync('tapioca-sdk/src/addresses.json', 'utf-8'),
        );
    } catch (e) {}

    const deployments = {
        ...__deployments.prev,
        [await hre.getChainId()]: await getStagingAddresses(hre),
    };
    await writeJsonFile('tapioca-sdk/src/addresses.json', deployments);
};

exportStagingAddresses()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
