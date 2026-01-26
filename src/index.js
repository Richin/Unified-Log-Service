require('dotenv').config();
const { createApp } = require('./app');

const DEFAULT_PORT = 3000;

function normalizePort(value) {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed)) {
    return DEFAULT_PORT;
  }

  return parsed;
}

const port = normalizePort(process.env.PORT || DEFAULT_PORT);
const app = createApp();

app.listen(port, () => {
  console.log(`Elastic Email Logger listening on port ${port}`);
});

