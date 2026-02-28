# Elastic Email Logger - API Documentation

Base URL: `http://localhost:3001`

## 1. Health Check
Checks if the service is online and connected to Elasticsearch.

-   **Endpoint**: `GET /`
-   **Response**:
    ```json
    {
      "status": "ok",
      "service": "elastic-email-logger",
      "message": "Service online",
      "elasticsearch": "connected"
    }
    ```

## 2. Dynamic Logs (Recommended)
Save any type of log to a specific index.

-   **Endpoint**: `POST /logs/:type`
    -   **:type**: The category of the log (e.g., `payment`, `auth`, `error`). This determines the Elasticsearch index name (`logs-{type}`).
    -   *Note: Special characters in `:type` are removed.*
-   **Body**: Any JSON object.
-   **Example Request**:
    ```bash
    curl -X POST http://localhost:3000/logs/payment \
      -H "x-api-key: YOUR_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "transaction_id": "tx_123",
        "amount": 50,
        "currency": "USD"
      }'
    ```
-   **Response**:
    ```json
    {
      "status": "indexed",
      "index": "logs-payment",
      "receivedAt": "2026-01-26T12:00:00.000Z"
    }
    ```

## 3. Search Logs
Retrieve logs programmatically.

-   **Endpoint**: `GET /logs/:type`
    -   `q`: Search query (default: `*`).
    -   `limit`: Number of results (default: 10).
    -   `offset`: Pagination offset.
-   **Headers**: `x-api-key: YOUR_KEY`
-   **Example**:
    ```bash
    curl -X GET "http://localhost:3000/logs/payment?q=currency:USD&limit=5" \
      -H "x-api-key: YOUR_KEY"
    ```
-   **Response**:
    ```json
    {
      "status": "ok",
      "index": "logs-payment",
      "total": 12,
      "hits": [...]
    }
    ```

## 4. General Logs (Legacy)
Save a generic event log.

-   **Endpoint**: `POST /logs`
-   **Body**:
    ```bash
    curl -X POST http://localhost:3000/logs \
      -H "x-api-key: YOUR_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "event": "user_login",
        "payload": {
          "userId": 123
        }
      }'
    ```
-   **Response**:
    ```json
    {
      "status": "indexed",
      "indexed": true,
      "index": "e",
      "receivedAt": "..."
    }
    ```

## 4. Email Logs
Specialized endpoint for logging email service events.

-   **Endpoint**: `POST /saveEmailLog`
-   **Body**:
    ```bash
    curl -X POST http://localhost:3000/saveEmailLog \
      -H "x-api-key: YOUR_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "status": "sent",
        "subject": "Welcome",
        "recipient": "user@example.com",
        "message_body": "Hello...",
        "error_message": null,
        "metadata": { "campaign": "onboarding" }
      }'
    ```
-   **Response**:
    ```json
    {
      "status": "indexed",
      "index": "emaillog"
    }
    ```
