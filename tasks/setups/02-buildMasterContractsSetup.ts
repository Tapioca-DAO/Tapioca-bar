import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TDeploymentVMContract } from 'tapioca-sdk/dist/ethers/hardhat/DeployerVM';
import { Multicall3 } from 'tapioca-sdk/dist/typechain/utils/MultiCall';
import { Penrose } from '../../typechain';
import { getAfterDepContract } from '../utils';

export const buildMasterContractsSetup = async (
    hre: HardhatRuntimeEnvironment,
    deps: TDeploymentVMContract[],
): Promise<Multicall3.Call3Struct[]> => {
    const calls: Multicall3.Call3Struct[] = [];

    const penrose = await getAfterDepContract<Penrose>(hre, deps, 'Penrose');
    const mediumRiskMC = await getAfterDepContract<Penrose>(
        hre,
        deps,
        'MediumRiskMC',
    );
    const bigBangMediumRiskMC = await getAfterDepContract<Penrose>(
        hre,
        deps,
        'BigBangMediumRiskMC',
    );

    /**
     * Add calls
     */
    console.log('[+] +Setting: Register MediumRiskMC in Singularity');
    await (
        await penrose.registerSingularityMasterContract(mediumRiskMC.address, 1)
    ).wait();

    console.log('[+] +Setting: Register BigBangMediumRiskMC in Singularity');
    await (
        await penrose.registerSingularityMasterContract(
            bigBangMediumRiskMC.address,
            1,
        )
    ).wait();

    return calls;
};