import { runTypeChain, glob } from 'typechain';
import hre from 'hardhat';

/**
 * Script used to generate typings for the tapioca-sdk
 * https://github.com/Tapioca-DAO/tapioca-sdk
 */
async function main() {
    const cwd = process.cwd();

    // We are looking at
    // BeachBar, Mixologist, MixologistHelper;
    const allFiles = glob(cwd, [`${hre.config.paths.artifacts}/contracts/**/!(*.dbg).json`])
        .filter((e) => !e.includes('interfaces'))
        .filter((e) => ['beachbar', 'mixologist'].some((v) => e.split('/').slice(-1)[0].toLowerCase().includes(v)));

    await runTypeChain({
        cwd,
        filesToProcess: allFiles,
        allFiles,
        outDir: 'sdk',
        target: 'ethers-v5',
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
