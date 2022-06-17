import { expect } from 'chai';
import { register } from './test.utils';

describe('BeachBar test', () => {
    it('Should display Tapioca markets', async () => {
        const { bar } = await register();

        const markets = await bar.tapiocaMarkets();

        expect(markets.length).equal(1);
    });
});
