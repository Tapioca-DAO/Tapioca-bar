import '@nomiclabs/hardhat-ethers';
import { scope } from 'hardhat/config';
import { TAP_TASK } from 'tapioca-sdk';
import { deployPostLbp__task_2 } from 'tasks/deploy/1-2-deployPostLbp';
import { deployPostLbp__task } from 'tasks/deploy/1-deployPostLbp';
import { postLbp3__deployMintOriginUSDO__task } from 'tasks/deploy/2-postLbp3__deployMintOriginUSDO';

const deployScope = scope('deploys', 'Deployment tasks');

TAP_TASK(
    deployScope.task(
        'postLbp',
        'Will deploy Origins, BB and SGL market, depending on the calling chain. Will also deploy USDO and call LzPeer for each USDO deployed chain.',
        deployPostLbp__task,
    ),
);

TAP_TASK(
    deployScope.task(
        'postLbp2',
        'Will deploy phase 2, which consist of the Origin market',
        deployPostLbp__task_2,
    ),
);

TAP_TASK(
    deployScope.task(
        'postLbp3',
        'Will deploy phase 3, which consist of minting USDO off the Origin market',
        postLbp3__deployMintOriginUSDO__task,
    ),
);
