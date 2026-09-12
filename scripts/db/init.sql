CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'warehouse_app') THEN
    CREATE ROLE warehouse_app WITH LOGIN PASSWORD 'warehouse_test123';
  ELSE
    ALTER ROLE warehouse_app WITH PASSWORD 'warehouse_test123';
  END IF;
  EXECUTE format('GRANT ALL ON DATABASE %I TO warehouse_app', current_database());
END
$$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS wes;
CREATE SCHEMA IF NOT EXISTS wms;
CREATE SCHEMA IF NOT EXISTS wcs;
CREATE SCHEMA IF NOT EXISTS asrs;
CREATE SCHEMA IF NOT EXISTS fleet;

GRANT ALL ON SCHEMA auth, wes, wms, wcs, asrs, fleet TO warehouse_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, wes, wms, wcs, asrs, fleet GRANT ALL ON TABLES TO warehouse_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA auth, wes, wms, wcs, asrs, fleet GRANT ALL ON SEQUENCES TO warehouse_app;

