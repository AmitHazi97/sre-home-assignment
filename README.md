# SRE Home Assignment — Full-Stack App with CDC Monitoring

A full-stack application with authentication, a TiDB database, and an end-to-end
database-change monitoring pipeline built on TiCDC and Kafka.

## Architecture

```
  Browser ──HTTP──> client (nginx)
                       │  proxies /api/* to:
                       ▼
                     api (Node.js / Express)
                       │  reads/writes (MySQL protocol)
                       ▼
                     TiDB ──┐
                            │ every insert/update/delete
                            ▼
                          TiCDC  ──publishes──> Kafka (topic: tidb-changes)
                                                   │
                                                   ▼
                                                 consumer (Node.js)
                                                   │
                                                   ▼
                                            structured console log
```

- The **client** is served by nginx, which reverse-proxies `/api/*` to the api
  (single origin → no CORS, and the real client IP reaches the api).
- The **api** handles login, issues tokens (stored in the DB, sent back as an
  `Authorization` header), and logs every login as JSON via log4js.
- **TiCDC** captures every row change in TiDB and publishes it to Kafka.
- The **consumer** reads those change events and logs them in the same structured format.

## Prerequisites

- Docker and Docker Compose v2

## Run (single command)

```bash
docker compose up -d --build
```

On startup the system automatically:
1. brings up the TiDB cluster (PD + TiKV + TiDB), TiCDC, and Kafka;
2. (`cdc-init`) waits for TiCDC and Kafka, then creates the CDC changefeed → Kafka;
3. (`api`) creates the database tables and the default user (its init function in
   `api/src/main-app-layout.js`).

Open the login page at: **http://localhost:8080**

### Default credentials

| Field | Value |
|-------|-------|
| Username | `admin` |
| Email | `admin@example.com` |
| Password | `Admin123!` |

The password is stored as a bcrypt hash, never in plaintext.

### Tear down

```bash
docker compose down -v
```

## How to verify

- **Login logging:** log in via the page (or POST to `/api/login`), then
  `docker compose logs api` — you'll see a JSON line with timestamp, user ID,
  action, and IP address.
- **Change monitoring:** `docker compose logs -f consumer`. Each login inserts a
  token row; you'll see a `DB_CHANGE` event flow TiDB → TiCDC → Kafka → consumer.

## Ports

| Service | Host port |
|---------|-----------|
| client (login page) | 8080 |
| api | 3000 |
| TiDB (MySQL protocol) | 4000 |
| Kafka (external listener) | 29092 |
| TiCDC API | 8300 |
| PD | 2379 |

## Project layout

```
.
├── docker-compose.yml        # all services, single-command startup
├── db/
│   ├── schema.sql            # table structure
│   └── seed.sql              # default user
├── api/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── main-app-layout.js  # init function (schema + seed on load)
│       ├── auth.js             # login, tokens, auth middleware
│       ├── logger.js           # log4js JSON layout
│       └── db.js               # TiDB connection pool
├── consumer/
│   ├── Dockerfile
│   ├── package.json
│   └── src/{consumer.js, logger.js}
└── client/
    ├── Dockerfile
    ├── nginx.conf            # static serving + /api reverse proxy
    └── index.html            # login screen

## Requirement mapping

- Part 1 — Node.js/Express REST API, login screen, tokens in DB + sent as HTTP header.
- Part 2 — Dockerized client + api, TiDB and Kafka in Docker, DB tables + default user created on load.
- Part 3 — log4js JSON login logging (timestamp, user ID, action, IP);
  TiCDC change capture configured in docker-compose and auto-started on load;
  Node.js Kafka consumer logging changes in the same structured format.

## Notes

- `log4js` is used for all structured logging (required).
- The CDC changefeed uses the `canal-json` protocol so the consumer can parse JSON directly.
- `cdc-init` is idempotent: it checks whether the changefeed exists before creating it.
- The api's init function retries the DB connection, so it tolerates starting before TiDB is ready.
```
