const { Client } = require('@elastic/elasticsearch');

let cachedConfig;

function buildAuth() {
  const apiKey = process.env.ELASTICSEARCH_API_KEY;
  if (apiKey) {
    return { apiKey };
  }

  const username = process.env.ELASTICSEARCH_USERNAME;
  const password = process.env.ELASTICSEARCH_PASSWORD;

  if (username && password) {
    return { username, password };
  }

  return undefined;
}

function buildTls() {
  const rejectUnauthorized = process.env.ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED;

  if (typeof rejectUnauthorized === 'string') {
    return { rejectUnauthorized: rejectUnauthorized !== 'false' };
  }

  return undefined;
}

function getElastic() {
  if (cachedConfig) {
    return cachedConfig;
  }

  const node = process.env.ELASTICSEARCH_NODE;
  const cloudId = process.env.ELASTICSEARCH_CLOUD_ID;

  if (!node && !cloudId) {
    const emailLogIndex = process.env.ELASTICSEARCH_EMAIL_LOG_INDEX || 'emaillog';

    cachedConfig = {
      enabled: false,
      reason: 'missing_configuration',
      emailLogIndex,
    };

    console.warn(
      'Elastic indexing disabled: set ELASTICSEARCH_NODE or ELASTICSEARCH_CLOUD_ID to enable.'
    );

    return cachedConfig;
  }

  const index = process.env.ELASTICSEARCH_INDEX || 'elastic-email-logs';
  const emailLogIndex = process.env.ELASTICSEARCH_EMAIL_LOG_INDEX || 'emaillog';
  const auth = buildAuth();
  const tls = buildTls();

  const clientOptions = {};

  if (node) {
    clientOptions.node = node;
  }

  if (cloudId) {
    clientOptions.cloud = { id: cloudId };
  }

  if (auth) {
    clientOptions.auth = auth;
  }

  if (tls) {
    clientOptions.tls = tls;
  }

  try {
    const client = new Client(clientOptions);

    cachedConfig = {
      enabled: true,
      client,
      index,
      emailLogIndex,
    };

    return cachedConfig;
  } catch (error) {
    console.error('Elastic indexing disabled: failed to initialize client', error);

    cachedConfig = {
      enabled: false,
      reason: 'client_initialization_failed',
      emailLogIndex,
    };

    return cachedConfig;
  }
}

module.exports = { getElastic };

