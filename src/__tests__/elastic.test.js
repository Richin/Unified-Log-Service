const { getElastic } = require('../elastic');

jest.mock('@elastic/elasticsearch', () => ({
    Client: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
    })),
}));

describe('getElastic', () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        jest.resetModules(); // clears the cache
        process.env = { ...OLD_ENV }; // make a copy
    });

    afterAll(() => {
        process.env = OLD_ENV; // restore old env
    });

    it('should return disabled if no node or cloud id is provided', () => {
        delete process.env.ELASTICSEARCH_NODE;
        delete process.env.ELASTICSEARCH_CLOUD_ID;

        // We must re-require elastic.js to reset the cachedConfig module variable
        const elasticModule = require('../elastic');
        const result = elasticModule.getElastic();

        expect(result.enabled).toBe(false);
        expect(result.reason).toBe('missing_configuration');
    });

    it('should return enabled and configure client when NODE is provided', () => {
        process.env.ELASTICSEARCH_NODE = 'http://localhost:9200';
        process.env.ELASTICSEARCH_API_KEY = 'test-api-key';
        process.env.ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED = 'false';

        const elasticModule = require('../elastic');
        const result = elasticModule.getElastic();

        expect(result.enabled).toBe(true);
        expect(result.client).toBeDefined();
        expect(result.index).toBe('elastic-email-logs');
    });

    it('should support ELASTICSEARCH_USERNAME and PASSWORD', () => {
        process.env.ELASTICSEARCH_NODE = 'http://localhost:9200';
        process.env.ELASTICSEARCH_USERNAME = 'user';
        process.env.ELASTICSEARCH_PASSWORD = 'password';

        const elasticModule = require('../elastic');
        const result = elasticModule.getElastic();

        expect(result.enabled).toBe(true);
    });

    it('should support ELASTICSEARCH_CLOUD_ID', () => {
        process.env.ELASTICSEARCH_CLOUD_ID = 'test-cloud-id';

        const elasticModule = require('../elastic');
        const result = elasticModule.getElastic();

        expect(result.enabled).toBe(true);
    });
});
