# Elastic Email Logger

Minimal Node.js service packaged for Docker and pinned to Node 24.11.1. It exposes two routes:

- `GET /` health check.
- `POST /logs` accepts JSON payloads and prints them to the container logs or indexes them into Elasticsearch when configured.
- `POST /saveEmailLog` stores exception-style email logs in the `emaillog` index (configurable).
- `POST /indices/sample` creates the `sample` index in Elasticsearch (idempotent).

## Local Development

```bash
npm install
npm run dev

# Run unit tests
npm run test

# Run tests with coverage report
npm run test:cov

# Run static code analysis (ESLint)
npm run lint
```

The server listens on `http://localhost:3000` by default.

Create a `.env` file to keep your local credentials (the app loads it automatically via `dotenv`):

```env
PORT=3000
ELASTICSEARCH_NODE=https://your-cluster:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=supersecret
```

## Docker

Build and run the container:

```bash
docker build -t elastic-email-logger .
docker run --rm -p 3000:3000 elastic-email-logger
```

Override the port with the `PORT` environment variable if needed.

## Code Quality & Ownership

This project enforces strict code quality and review standards.
- **CI/CD**: GitHub Actions automatically runs `npm install`, `npm run lint`, `npm run test:cov`, and `npm audit --audit-level=high` on every pull request and push to `main`.
- **Security Check**: Automated dependency scanning is running weekly via Dependabot.
- **Code Review**: Cross-team approvals are enforced via `.github/CODEOWNERS` indicating `@elastic-logger-team`. A structured `.github/PULL_REQUEST_TEMPLATE.md` is provided to standardize reviews.
- **Versioning**: Adheres to [Semantic Versioning](https://semver.org) (v1.0.0). See `CHANGELOG.md` for historical release changes.

## Elasticsearch Integration

Set the following environment variables to enable indexing:

- `ELASTICSEARCH_NODE` or `ELASTICSEARCH_CLOUD_ID`
- `ELASTICSEARCH_INDEX` (optional, defaults to `elastic-email-logs`)
- `ELASTICSEARCH_EMAIL_LOG_INDEX` (optional, defaults to `emaillog`)
- Authentication (choose one):
  - `ELASTICSEARCH_API_KEY`
  - `ELASTICSEARCH_USERNAME` and `ELASTICSEARCH_PASSWORD`
- `ELASTICSEARCH_TLS_REJECT_UNAUTHORIZED` (optional, set to `false` to skip TLS verification)

Example:

```bash
docker run --rm \
  -e ELASTICSEARCH_NODE=https://example.es.amazonaws.com \
  -e ELASTICSEARCH_API_KEY=base64EncodedKey \
  -p 3000:3000 \
  elastic-email-logger
```

If Elasticsearch is not configured, the service still accepts requests and logs them to stdout.

### Connection Check

Verify connectivity from your local environment:

```bash
npm run elastic:check
```

The script exits with code `0` on success, `1` when Elasticsearch is not configured, and `2` if the cluster is unreachable.

