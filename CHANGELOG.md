# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-27

### Added
- Express API with rate limiting
- `GET /` health check endpoint
- `POST /logs` endpoint for general logging
- `POST /logs/:type` endpoint for dynamic logging to specific indices
- `GET /logs/:type` endpoint to retrieve and search logs
- `POST /indices/sample` to create a sample index
- `POST /saveEmailLog` endpoint specialized for email logs
- Elasticsearch integration with API Key and username/password support
- Local connection check script (`scripts/check-elastic.js`)
- GitHub Actions CI/CD pipeline integrated with Jest, ESLint, and `npm audit`
- 80%+ test coverage across core functionality
- `.github/CODEOWNERS` and `.github/PULL_REQUEST_TEMPLATE.md`
- Automated dependency scanning via Dependabot
