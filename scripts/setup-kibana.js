require('dotenv').config();
const axios = require('axios');

const KIBANA_URL = process.env.KIBANA_URL || 'http://localhost:5601';
const USERNAME = process.env.ELASTICSEARCH_USERNAME || 'elastic';
const PASSWORD = process.env.ELASTICSEARCH_PASSWORD;

if (!USERNAME || !PASSWORD) {
    console.error('❌ Error: ELASTICSEARCH_USERNAME or ELASTICSEARCH_PASSWORD is not set.');
    process.exit(1);
}

const auth = {
    username: USERNAME,
    password: PASSWORD,
};

async function createDataView(title, timeFieldName) {
    try {
        const response = await axios.post(
            `${KIBANA_URL}/api/data_views/data_view`,
            {
                data_view: {
                    title: title,
                    name: title,
                    timeFieldName: timeFieldName,
                },
            },
            {
                auth,
                headers: {
                    'kbn-xsrf': 'true',
                },
            }
        );
        console.log(`✅ Data View created: ${title}`);
    } catch (error) {
        if (
            (error.response && error.response.status === 409) ||
            (error.response && error.response.status === 400 && error.response.data.message && error.response.data.message.includes('Duplicate'))
        ) {
            console.log(`⚠️ Data View already exists: ${title}`);
        } else {
            console.error(`❌ Failed to create Data View ${title}:`, error.message);
            if (error.response) {
                console.error('Response:', JSON.stringify(error.response.data));
            }
        }
    }
}

async function setup() {
    console.log('Waiting for Kibana...');

    // Create Data Views
    await createDataView('logs-*', 'receivedAt');
    await createDataView('emaillog', 'logged_at');

    console.log('Setup complete!');
}

setup();
