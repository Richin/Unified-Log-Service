require('dotenv').config();

const { getElastic } = require('../src/elastic');

async function main() {
  const elastic = getElastic();

  if (!elastic.enabled) {
    console.error('Elasticsearch is not configured. Set ELASTICSEARCH_NODE or ELASTICSEARCH_CLOUD_ID.');
    process.exit(1);
    return;
  }

  try {
    await elastic.client.ping();
    console.log(`Elasticsearch connection OK (index: ${elastic.index}).`);
    process.exit(0);
  } catch (error) {
    console.error('Failed to reach Elasticsearch:', error);
    process.exit(2);
  }
}

main();

