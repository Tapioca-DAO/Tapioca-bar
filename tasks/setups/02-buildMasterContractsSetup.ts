import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TDeploymentVMContract } from '@tapioca-sdk//ethers/hardhat/DeployerVM';
import { Multicall3 } from '@tapioca-sdk//typechain/utils/MultiCall';
import { Penrose } from '../../typechain';
import { getAfterDepContract } from '../utils';

export const buildMasterContractsSetup = async (
    hre: HardhatRuntimeEnvironment,
    deps: TDeploymentVMContract[],
): Promise<Multicall3.Call3Struct[]> => {
    const calls: Multicall3.Call3Struct[] = [];

    const penrose = await getAfterDepContract<Penrose>(hre, deps, 'Penrose');
    const mediumRiskMC = await getAfterDepContract(
        hre,
        deps,
        'MediumRiskMC',
        'Singularity',
    );
    const bigBangMediumRiskMC = await getAfterDepContract(
        hre,
        deps,
        'BigBangMediumRiskMC',
        'BigBang',
    );

    /**
     * Add calls
     */
    console.log('[+] +Setting: Register MediumRiskMC in Singularity');
    await (
        await penrose.registerSingularityMasterContract(mediumRiskMC.address, 1)
    ).wait(3);

    console.log('[+] +Setting: Register BigBangMediumRiskMC in Singularity');
    await (
        await penrose.registerBigBangMasterContract(
            bigBangMediumRiskMC.address,
            1,
        )
    ).wait(3);

    return calls;
};
