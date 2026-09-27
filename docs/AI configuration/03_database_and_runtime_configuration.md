# Dynamic Database Configuration & Connectivity Guide

The **WES Dynamic Database Configuration Subsystem** enables AI agents and database administrators to inspect the active PostgreSQL connection pool, test target credentials before switching, and dynamically redirect the running microservice to another database host **with zero application restarts**.

---

## 1. Architecture & Safe Switching Flow

```
 +-------------------------------------------------------------------------------+
 |                              AI AGENT / SRE OPERATOR                          |
 +-------------------------------------------------------------------------------+
         |                                                       ^
         | 1. POST /test (Pre-flight test candidate database)    | 2. Response: SUCCESS
         v                                                       |
 +-------------------------------------------------------------------------------+
 |                         WES DATABASE CONFIG MANAGER                           |
 |                                                                               |
 |   +-----------------------------------------------------------------------+   |
 |   | 3. PUT /config/database                                               |   |
 |   |    - Establishes temporary candidate connection                       |   |
 |   |    - Executes `SELECT 1` validation query                             |   |
 |   |    - Instantiates new HikariCP connection pool                        |   |
 |   |    - Atomically swaps DataSource reference in Spring ApplicationCtx   |   |
 |   |    - Gracefully drains and closes old Hikari pool                     |   |
 |   +-----------------------------------------------------------------------+   |
 +-------------------------------------------------------------------------------+
         |                                                       |
         v (Old Pool Drained)                                    v (Active Queries)
 +-------------------------------+                       +-------------------------------+
 | PRIMARY DB (e.g. Host 10.0.1) |                       | REPLICA / FAILOVER (10.0.2)   |
 +-------------------------------+                       +-------------------------------+
```

---

## 2. API Endpoints Reference

Base Path: `http://localhost:8086/api/v1/wes/config/database`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Returns the current active database connection parameters and Hikari pool statistics. |
| `POST` | `/test` | Pre-flight test connection. Validates host, port, credentials, and schema without altering the active pool. |
| `PUT` | `/` | Atomically switches the live DataSource to the new database parameters. |

---

## 3. Step 1: Inspect Current Database State

```bash
curl -X GET http://localhost:8086/api/v1/wes/config/database \
  -H "Accept: application/json"
```

#### Response:
```json
{
  "host": "localhost",
  "port": 5432,
  "databaseName": "warehouse_db",
  "username": "postgres",
  "driverClassName": "org.postgresql.Driver",
  "activeConnections": 4,
  "idleConnections": 6,
  "maximumPoolSize": 20,
  "minimumIdle": 5,
  "status": "ONLINE"
}
```

---

## 4. Step 2: Pre-flight Test Target Connection (`/test`)

Before initiating a switch, AI agents **MUST ALWAYS** run the pre-flight test:

```bash
curl -X POST http://localhost:8086/api/v1/wes/config/database/test \
  -H "Content-Type: application/json" \
  -d '{
    "host": "192.168.1.120",
    "port": 5432,
    "databaseName": "warehouse_db_dr",
    "username": "wes_app_user",
    "password": "ProductionSecurePassword9912!"
  }'
```

#### Successful Test Response:
```json
{
  "success": true,
  "responseTimeMs": 14,
  "databaseProductName": "PostgreSQL",
  "databaseProductVersion": "16.1",
  "message": "Connection established successfully. Database is online and responsive."
}
```

#### Failed Test Response (e.g. Bad Password):
```json
{
  "success": false,
  "responseTimeMs": 120,
  "databaseProductName": null,
  "databaseProductVersion": null,
  "message": "Connection failed: FATAL: password authentication failed for user 'wes_app_user'"
}
```

---

## 5. Step 3: Switch Active Database Connection (`PUT /`)

Only once `/test` returns `success: true`, execute the atomic swap:

```bash
curl -X PUT http://localhost:8086/api/v1/wes/config/database \
  -H "Content-Type: application/json" \
  -d '{
    "host": "192.168.1.120",
    "port": 5432,
    "databaseName": "warehouse_db_dr",
    "username": "wes_app_user",
    "password": "ProductionSecurePassword9912!",
    "maximumPoolSize": 25,
    "connectionTimeoutMs": 10000
  }'
```

#### Response:
```json
{
  "success": true,
  "previousHost": "localhost",
  "currentHost": "192.168.1.120",
  "databaseName": "warehouse_db_dr",
  "message": "DataSource atomically switched. Old pool drained without terminating active transactions."
}
```

---

## 6. Diagnostic & Rollback Runbook

### Emergency Rollback Procedure
If after a database switch, application queries begin throwing exceptions (e.g. schema missing migration scripts):

1. Immediately issue a `PUT` command pointing back to the previous host:
   ```bash
   curl -X PUT http://localhost:8086/api/v1/wes/config/database \
     -H "Content-Type: application/json" \
     -d '{
       "host": "localhost",
       "port": 5432,
       "databaseName": "warehouse_db",
       "username": "postgres",
       "password": "postgres_root_password"
     }'
   ```
2. Verify pool health via `GET /api/v1/wes/config/database`.

### Common Failure Modes

| Error Message | Underlying Issue | Resolution |
| :--- | :--- | :--- |
| `FATAL: remaining connection slots are reserved for non-replication superuser connections` | Target PostgreSQL instance has exceeded `max_connections`. | Increase `max_connections` in `postgresql.conf` or decrease `maximumPoolSize` in the switch request. |
| `org.postgresql.util.PSQLException: Connection to 192.168.1.120:5432 refused` | PostgreSQL is not listening on external interfaces, or firewall blocked port 5432. | Check `listen_addresses = '*'` in `postgresql.conf` and `pg_hba.conf` whitelist. |
| `relation "wes.integration_channel" does not exist` | The target database has not been initialized with Flyway migrations. | Run `mvn flyway:migrate` or start the microservice in migration mode before switching live traffic. |
