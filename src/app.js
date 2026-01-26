const express = require('express');
const { getElastic } = require('./elastic');

function createApp() {
  const app = express();

  app.use(express.json());

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

  app.post('/logs', async (req, res) => {
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

  app.post('/saveEmailLog', async (req, res) => {
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

  return app;
}

module.exports = { createApp };
