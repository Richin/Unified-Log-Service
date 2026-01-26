const express = require('express');
const { getElastic } = require('./elastic');
const { checkAlerts } = require('./alerts');
const rateLimit = require('express-rate-limit');

function createApp() {
  const app = express();

  // Rate Limiting: 100 requests per 15 minutes
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      status: 'error',
      message: 'Too many requests, please try again later.',
    },
  });

  // Apply rate limiting to all requests
  app.use(limiter);
  app.use(express.json());

  const authenticate = (req, res, next) => {
    const apiKey = req.get('x-api-key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized: Invalid or missing API Key',
      });
    }
    next();
  };

  app.get('/', async (req, res) => {
    const elastic = getElastic();
    let elasticStatus = 'disabled';

    if (elastic.enabled) {
      console.log('Attempting to connect to Elastic with config:', { node: elastic.client.connectionPool?.cloudConnection ? 'cloud' : 'node', index: elastic.index });
      try {
        await elastic.client.info();
        elasticStatus = 'connected';
      } catch (error) {
        console.error('Elasticsearch ping failed', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        elasticStatus = 'unreachable';
      }
    }

    res.json({
      status: 'ok',
      service: 'elastic-email-logger',
      message: 'Service online',
      elasticsearch: elasticStatus,
    });
  });

  app.post('/logs', authenticate, async (req, res) => {
    const { event = 'event', payload = {} } = req.body || {};
    const timestamp = new Date().toISOString();
    const safePayload =
      payload && typeof payload === 'object' && !Array.isArray(payload)
        ? payload
        : { value: payload };

    const entry = {
      event,
      payload: safePayload,
      receivedAt: timestamp,
      source: {
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
      },
    };

    console.info(`[${timestamp}] ${event}`, safePayload);

    const elastic = getElastic();

    if (!elastic.enabled) {
      return res.status(202).json({
        status: 'accepted',
        indexed: false,
        receivedAt: timestamp,
      });
    }

    try {
      await elastic.client.index({
        index: elastic.index,
        document: entry,
      });

      // Check for alerts
      checkAlerts(elastic.index, entry);

      return res.status(202).json({
        status: 'indexed',
        indexed: true,
        index: elastic.index,
        receivedAt: timestamp,
      });
    } catch (error) {
      console.error('Failed to index payload to Elasticsearch', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      return res.status(502).json({
        status: 'error',
        message: 'Failed to persist log to Elasticsearch',
      });
    }
  });

  app.post('/indices/sample', async (req, res) => {
    const elastic = getElastic();

    if (!elastic.enabled) {
      return res.status(503).json({
        status: 'error',
        message: 'Elasticsearch is not configured',
      });
    }

    try {
      await elastic.client.indices.create({
        index: 'sampl2',
      });

      return res.status(201).json({
        status: 'created',
        index: 'sample',
      });
    } catch (error) {
      if (error.meta && error.meta.body && error.meta.body.error) {
        const type = error.meta.body.error.type;

        if (type === 'resource_already_exists_exception') {
          return res.status(200).json({
            status: 'exists',
            index: 'sample',
            message: 'Index already exists',
          });
        }
      }

      console.error('Failed to create sample index', error);

      return res.status(502).json({
        status: 'error',
        message: 'Failed to create sample index',
      });
    }
  });

  app.post('/saveEmailLog', authenticate, async (req, res) => {
    const elastic = getElastic();

    if (!elastic.enabled) {
      return res.status(503).json({
        status: 'error',
        message: 'Elasticsearch is not configured',
      });
    }

    const {
      status = 'exception',
      subject,
      recipient,
      message_body: messageBody,
      error_message: errorMessage,
      metadata = {},
    } = req.body || {};

    const entry = {
      status,
      subject: subject || null,
      recipient: recipient || null,
      message_body: messageBody || null,
      error_message: errorMessage || null,
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      logged_at: new Date().toISOString(),
    };

    try {
      await elastic.client.index({
        index: elastic.emailLogIndex,
        document: entry,
      });

      // Check for alerts
      checkAlerts(elastic.emailLogIndex, entry);

      return res.status(201).json({
        status: 'indexed',
        index: elastic.emailLogIndex,
      });
    } catch (error) {
      console.error('Failed to index email log', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      return res.status(502).json({
        status: 'error',
        message: 'Failed to persist email log',
      });
    }
  });

  app.post('/logs/:type', authenticate, async (req, res) => {
    const { type } = req.params;
    const elastic = getElastic();
    const timestamp = new Date().toISOString();

    // Sanitize type to be index-friendly (lowercase, alphanumeric, hyphens)
    const sanitizedType = type.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const indexName = `logs-${sanitizedType}`;

    if (!elastic.enabled) {
      return res.status(503).json({
        status: 'error',
        message: 'Elasticsearch is not configured',
      });
    }

    const payload = req.body || {};
    const entry = {
      ...payload,
      receivedAt: timestamp,
      source: {
        ip: req.ip,
        userAgent: req.get('user-agent') || undefined,
      },
    };

    try {
      await elastic.client.index({
        index: indexName,
        document: entry,
      });

      // Check for alerts
      checkAlerts(indexName, entry);

      return res.status(201).json({
        status: 'indexed',
        index: indexName,
        receivedAt: timestamp,
      });
    } catch (error) {
      console.error(`Failed to index to ${indexName}`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      return res.status(502).json({
        status: 'error',
        message: 'Failed to persist log',
      });
    }
  });

  app.get('/logs/:type', authenticate, async (req, res) => {
    const { type } = req.params;
    const { q = '*', limit = 10, offset = 0 } = req.query;
    const elastic = getElastic();

    // Sanitize type
    const sanitizedType = type.toLowerCase().replace(/[^a-z0-9-]/g, '');
    const indexName = `logs-${sanitizedType}`;

    if (!elastic.enabled) {
      return res.status(503).json({
        status: 'error',
        message: 'Elasticsearch is not configured',
      });
    }

    try {
      const result = await elastic.client.search({
        index: indexName,
        q: q.toString(),
        from: Number.parseInt(offset, 10),
        size: Number.parseInt(limit, 10),
        sort: [{ receivedAt: { order: 'desc' } }],
      });

      return res.json({
        status: 'ok',
        index: indexName,
        total: result.hits.total,
        hits: result.hits.hits.map((h) => h._source),
      });
    } catch (error) {
      // Check for index not found
      if (error.meta && error.meta.body && error.meta.body.error && error.meta.body.error.type === 'index_not_found_exception') {
        return res.status(404).json({
          status: 'error',
          message: `Log type '${type}' not found (index: ${indexName})`,
        });
      }

      console.error(`Failed to search ${indexName}`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      return res.status(500).json({
        status: 'error',
        message: 'Search failed',
        error: error.message
      });
    }
  });

  return app;
}

module.exports = { createApp };
