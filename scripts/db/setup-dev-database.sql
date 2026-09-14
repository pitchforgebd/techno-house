-- Techno House — local development database bootstrap (P10-T01).
--
-- Creates the application role and development database. Idempotent: safe to
-- re-run. Never run against production; production provisioning is Phase 18.
--
-- Usage (from the repo root, as a superuser):
--   psql -h 127.0.0.1 -U postgres -v db_password='<password>' \
--        -f scripts/db/setup-dev-database.sql
--
-- The password is passed in so it is never committed. Store the resulting
-- connection string in .env.local (gitignored), not here.

\set ON_ERROR_STOP on

-- Application role. CREATEDB is granted for local development only: Prisma
-- creates and drops a shadow database during `migrate dev` (P10-T04).
-- Production roles must not have CREATEDB or SUPERUSER.
-- psql does not interpolate :variables inside dollar-quoted blocks, so the
-- statements are built with format() and run through \gexec.
SELECT format(
  'CREATE ROLE techno_house WITH LOGIN CREATEDB PASSWORD %L',
  :'db_password'
)
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'techno_house')\gexec

SELECT format(
  'ALTER ROLE techno_house WITH LOGIN CREATEDB PASSWORD %L',
  :'db_password'
)\gexec

-- Development database, owned by the application role.
SELECT 'CREATE DATABASE techno_house_dev OWNER techno_house'
WHERE NOT EXISTS (
  SELECT FROM pg_database WHERE datname = 'techno_house_dev'
)\gexec

\connect techno_house_dev

-- The app role owns its schema; PUBLIC keeps no implicit CREATE rights.
ALTER SCHEMA public OWNER TO techno_house;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

SELECT current_database() AS database,
       (SELECT rolname FROM pg_roles WHERE rolname = 'techno_house') AS role;
