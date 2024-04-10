import '@nomiclabs/hardhat-ethers';
import { scope } from 'hardhat/config';
import { getBigBangMarkets__task } from 'tasks/view/getBigBangMarkets';
import { getBigBangTotals__task } from 'tasks/view/getBigBangTotals';
import {
    getLocalDeployments__task,
    getSDKDeployments__task,
} from 'tasks/view/getDeployments';
import { getParticipantBigBangInfo__task } from 'tasks/view/getParticipantBigBangInfo';
import { getParticipantSingularityInfo__task } from 'tasks/view/getParticipantSingularityInfo';
import { getSingularityMarkets__task } from 'tasks/view/getSingularityMarkets';
import { getSingularityTotals__task } from 'tasks/view/getSingularityTotals';

const getScope = scope('get', 'getters task');

getScope.task(
    'singularityMarkets',
    'Display the list of deployed Singularity markets for the current chain ID.',
    getSingularityMarkets__task,
);
getScope.task(
    'bigBangMarkets',
    'Display the list of deployed BigBang markets for the current chain ID.',
    getBigBangMarkets__task,
);

getScope.task(
    'getLocalDeployments',
    'Print a list of locally deployed contracts.',
    getLocalDeployments__task,
);

getScope.task(
    'getSDKDeployments',
    'Print a list of SDK deployed contract.',
    getSDKDeployments__task,
);

getScope
    .task(
        'getParticipantSingularityInfo',
        'Returns lend & borrow details for a specific address',
        getParticipantSingularityInfo__task,
    )
    .addParam('singularity', 'Singularity address')
    .addParam('participant', 'User address');

getScope
    .task(
        'getParticipantBigBangInfo',
        'Returns lend & borrow details for a specific address',
        getParticipantBigBangInfo__task,
    )
    .addParam('singularity', 'Singularity address')
    .addParam('participant', 'User address');

getScope
    .task(
        'getSingularityTotals',
        'Returns Singularity totals info',
        getSingularityTotals__task,
    )
    .addParam('singularity', 'Singularity address');
getScope
    .task(
        'getBigBangTotals',
        'Returns BigBang totals info',
        getBigBangTotals__task,
    )
    .addParam('bigBang', 'BigBang address');
