import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { TContract, TProjectDeployment } from 'tapioca-sdk/dist/api/exportSDK';
import { DeployFunction } from 'hardhat-deploy/types';
import fs from 'fs';

export const verify = async (
    hre: HardhatRuntimeEnvironment,
    artifact: string,
    args: any[],
) => {
    const { deployments } = hre;

    const deployed = await deployments.get(artifact);
    console.log(`    - verifying ${artifact}`);
    try {
        await hre.run('verify', {
            address: deployed.address,
            constructorArgsParams: args,
        });
    } catch (err: any) {
        console.log(`Error: ${err.message}\n`);
    }
    console.log(`    verified`);
};

export const createObjectAndAppendDataToFile = async (
    data: any,
    chainId: string,
    region: string,
) => {
    const projectDeployment: TProjectDeployment = {
        [chainId]: {
            [region]: [],
        },
    };

    for (const item of Object.keys(data) as Array<keyof typeof data>) {
        projectDeployment[Number(chainId) as 10][region].push({
            key: item,
            value: data[item],
        });
    }
    appendToFile(projectDeployment);
};

export const createObjectAndAppendToFile = async (
    contracts: any,
    chainId: string,
    region: string,
) => {
    const projectDeployment: TProjectDeployment = {
        [chainId]: {
            [region]: [],
        },
    };

    for (const contract of Object.keys(contracts) as Array<
        keyof typeof contracts
    >) {
        (projectDeployment[Number(chainId) as 10][region] as TContract[]).push({
            name: contract,
            address: contracts[contract].address,
        });
    }
    appendToFile(projectDeployment);
};

export const appendToFile = async (data: any) => {
    const toSave = JSON.stringify(data, null, 2);
    fs.appendFileSync('./deployments.json', toSave);
};
