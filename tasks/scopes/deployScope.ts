import '@nomiclabs/hardhat-ethers';
import { scope } from 'hardhat/config';
import { TAP_TASK } from 'tapioca-sdk';
import { deployPostLbp__task_1 } from 'tasks/deploy/1-1-deployPostLbp';
import { deployPostLbp__task_2 } from 'tasks/deploy/1-2-deployPostLbp';

const deployScope = scope('deploys', 'Deployment tasks');

TAP_TASK(
    deployScope
        .task(
            'postLbp1',
            'Will deploy BB and SGL market, depending on the calling chain. Will also deploy USDO and call LzPeer for each USDO deployed chain.',
            deployPostLbp__task_1,
        )
        .addFlag(
            'noLzPeer',
            'Will not call LzPeer for each USDO deployed chain.',
        ),
);

TAP_TASK(
    deployScope
        .task(
            'postLbp2',
            'Will deploy phase 2, which consist of the Origin market, and mint initial USDO.',
            deployPostLbp__task_2,
        )
        .addParam(
            'delta',
            'The delta in percentage to take into account when computing CR',
        )
        .addFlag('noTransfer', 'Will not transfer USDO to the other chain'),
);
