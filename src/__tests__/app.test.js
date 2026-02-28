const request = require('supertest');
const { createApp } = require('../app');
const elasticModule = require('../elastic');

// Mock elastic dependencies
jest.mock('../elastic', () => ({
    getElastic: jest.fn(),
}));

describe('App Endpoints', () => {
    let app;
    let mockClient;

    beforeAll(() => {
        process.env.API_KEY = 'test-api-key';
        app = createApp();
    });

    beforeEach(() => {
        mockClient = {
            info: jest.fn().mockResolvedValue({}),
            index: jest.fn().mockResolvedValue({}),
            indices: { create: jest.fn().mockResolvedValue({}) },
            search: jest.fn().mockResolvedValue({ hits: { total: 0, hits: [] } }),
        };

        elasticModule.getElastic.mockReturnValue({
            enabled: true,
            client: mockClient,
            index: 'test-index',
            emailLogIndex: 'emaillog-test',
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /', () => {
        it('should return health status', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.elasticsearch).toBe('connected');
        });

        it('should return unreachable if elastic ping fails', async () => {
            mockClient.info.mockRejectedValue(new Error('connection failed'));
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.body.elasticsearch).toBe('unreachable');
        });

        it('should handle disabled elasticsearch', async () => {
            elasticModule.getElastic.mockReturnValue({ enabled: false });
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.body.elasticsearch).toBe('disabled');
        });
    });

    describe('Authentication', () => {
        it('should require API key for protected routes', async () => {
            const res = await request(app).post('/logs').send({});
            expect(res.status).toBe(401);
        });

        it('should accept valid API key', async () => {
            const res = await request(app)
                .post('/logs')
                .set('x-api-key', 'test-api-key')
                .send({});
            expect(res.status).toBe(202);
        });
    });

    describe('POST /logs', () => {
        it('should index log when elastic is enabled', async () => {
            const res = await request(app)
                .post('/logs')
                .set('x-api-key', 'test-api-key')
                .send({ event: 'test-event', payload: { foo: 'bar' } });

            expect(res.status).toBe(202);
            expect(res.body.indexed).toBe(true);
            expect(mockClient.index).toHaveBeenCalled();
        });

        it('should return accepted but not indexed when elastic is disabled', async () => {
            elasticModule.getElastic.mockReturnValue({ enabled: false });
            const res = await request(app)
                .post('/logs')
                .set('x-api-key', 'test-api-key')
                .send({});

            expect(res.status).toBe(202);
            expect(res.body.indexed).toBe(false);
        });

        it('should handle elasticsearch indexing errors', async () => {
            mockClient.index.mockRejectedValue(new Error('Index failed'));
            const res = await request(app)
                .post('/logs')
                .set('x-api-key', 'test-api-key')
                .send({});

            expect(res.status).toBe(502);
            expect(res.body.status).toBe('error');
        });
    });

    describe('POST /indices/sample', () => {
        it('should return 503 if elastic is disabled', async () => {
            elasticModule.getElastic.mockReturnValue({ enabled: false });
            const res = await request(app).post('/indices/sample');
            expect(res.status).toBe(503);
        });

        it('should create sample index', async () => {
            const res = await request(app).post('/indices/sample');
            expect(res.status).toBe(201);
            expect(mockClient.indices.create).toHaveBeenCalled();
        });

        it('should handle resource already exists error gracefully', async () => {
            const existError = new Error('already exists');
            existError.meta = { body: { error: { type: 'resource_already_exists_exception' } } };
            mockClient.indices.create.mockRejectedValue(existError);

            const res = await request(app).post('/indices/sample');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('exists');
        });

        it('should return 502 for other errors', async () => {
            mockClient.indices.create.mockRejectedValue(new Error('General error'));
            const res = await request(app).post('/indices/sample');
            expect(res.status).toBe(502);
        });
    });

    describe('POST /saveEmailLog', () => {
        it('should return 503 if elastic is disabled', async () => {
            elasticModule.getElastic.mockReturnValue({ enabled: false });
            const res = await request(app).post('/saveEmailLog').set('x-api-key', 'test-api-key');
            expect(res.status).toBe(503);
        });

        it('should index email log', async () => {
            const res = await request(app)
                .post('/saveEmailLog')
                .set('x-api-key', 'test-api-key')
                .send({ subject: 'Test' });

            expect(res.status).toBe(201);
            expect(mockClient.index).toHaveBeenCalledWith(expect.objectContaining({
                index: 'emaillog-test',
            }));
        });

        it('should return 502 on indexing failure', async () => {
            mockClient.index.mockRejectedValue(new Error('Index failed'));
            const res = await request(app)
                .post('/saveEmailLog')
                .set('x-api-key', 'test-api-key')
                .send({});

            expect(res.status).toBe(502);
        });
    });

    describe('POST /logs/:type', () => {
        it('should index specific log type', async () => {
            const res = await request(app)
                .post('/logs/auth')
                .set('x-api-key', 'test-api-key')
                .send({ user: 'foo' });

            expect(res.status).toBe(201);
            expect(mockClient.index).toHaveBeenCalledWith(expect.objectContaining({
                index: 'logs-auth',
            }));
        });

        it('should handle specific log indexing failure', async () => {
            mockClient.index.mockRejectedValue(new Error('Index failed'));
            const res = await request(app)
                .post('/logs/auth')
                .set('x-api-key', 'test-api-key')
                .send({});

            expect(res.status).toBe(502);
        });
    });

    describe('GET /logs/:type', () => {
        it('should return search results', async () => {
            mockClient.search.mockResolvedValue({
                hits: { total: 1, hits: [{ _source: { message: 'hello' } }] },
            });

            const res = await request(app)
                .get('/logs/auth')
                .set('x-api-key', 'test-api-key')
                .query({ q: 'hello' });

            expect(res.status).toBe(200);
            expect(res.body.hits).toHaveLength(1);
        });

        it('should handle index not found error', async () => {
            const notFoundError = new Error('not found');
            notFoundError.meta = { body: { error: { type: 'index_not_found_exception' } } };
            mockClient.search.mockRejectedValue(notFoundError);

            const res = await request(app)
                .get('/logs/missing')
                .set('x-api-key', 'test-api-key');

            expect(res.status).toBe(404);
        });

        it('should handle general search error', async () => {
            mockClient.search.mockRejectedValue(new Error('General search error'));
            const res = await request(app)
                .get('/logs/auth')
                .set('x-api-key', 'test-api-key');

            expect(res.status).toBe(500);
        });
    });
});
