import './hardhat.tasks';
import conf from './hardhat.export';

import { merge } from 'lodash';

merge(conf, {
    networks: {
        hardhat: {
            forking: {
                url: `https://arb-mainnet.alchemyapi.io/v2/${process.env.ARBITRUM_ALCHEMY_KEY}`,
                blockNumber: 62653925 
            }
        }
    }
});

export default conf;
