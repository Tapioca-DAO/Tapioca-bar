import '@nomiclabs/hardhat-ethers';
import { scope } from 'hardhat/config';
import { TAP_TASK } from 'tapioca-sdk';
import { deployPostLbp__task } from 'tasks/deploy/1-deployPostLbp';

const deployScope = scope('deploys', 'Deployment tasks');

TAP_TASK(
    deployScope.task(
        'postLbp',
        'Will deploy Origins, BB and SGL market, depending on the calling chain. Will also deploy USDO and call LzPeer for each USDO deployed chain.',
        deployPostLbp__task,
    ),
);
