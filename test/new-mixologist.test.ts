import { ethers } from 'hardhat';
import { expect } from 'chai';
import { register } from './test.utils';

//TODO: remove
describe.only('new mixologist test', () => {
    const modules = {
        LendingBorrowing: 0,
        Liquidation: 1,
        Setter: 2,
    };
    // it.only('test decode', async () => {
    //     const { deployer } = await register();

    //     const newMixologist = await (
    //         await ethers.getContractFactory('BaseMixologist')
    //     ).deploy();
    //     await newMixologist.deployed();

    //     // let moduleName = 'LendingBorrowing';
    //     let addAssetFn = newMixologist.interface.encodeFunctionData(
    //         'addAsset',
    //         [deployer.address, deployer.address, false, 0],
    //     );

    //     // let packed = ethers.utils.solidityKeccak256(['string'], [moduleName]);
    //     const data = new ethers.utils.AbiCoder().encode(
    //         ['uint256', 'bytes'],
    //         [modules.LendingBorrowing, addAssetFn],
    //     );

    //     console.log(`sending a new data ${data}`);
    //     await newMixologist.test(data);
    // });
});
