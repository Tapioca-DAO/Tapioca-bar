import fs from 'fs';
import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { glob, runTypeChain } from 'typechain';
import writeJsonFile from 'write-json-file';
import { getDeployments } from '../scripts/getDeployment-script';
/**
 * Script used to generate typings for the tapioca-sdk
 * https://github.com/Tapioca-DAO/tapioca-sdk
 */
export const exportSDK__task = async (
    taskArgs: { mainnet?: boolean },
    hre: HardhatRuntimeEnvironment,
) => {
    const cwd = process.cwd();
    const { mainnet } = taskArgs;

    const __deployments = { prev: {} };
    try {
        __deployments.prev = JSON.parse(
            fs.readFileSync('tapioca-sdk/src/addresses.json', 'utf-8'),
        );
    } catch (e) {}

    if (mainnet) {
        const deployments = {
            ...__deployments.prev,
            [await hre.getChainId()]: await getDeployments(hre),
        };
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
            discriminateTypes: false,
        },
    });
};
