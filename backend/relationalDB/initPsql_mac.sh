#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# Config (override via env if you want)
###############################################################################
PG_BREW_FORMULA="${PG_BREW_FORMULA:-postgresql@14}"   # change to postgresql@16 if needed
DB_USER="${DB_USER:-smartcar_user}"
DB_PASSWORD="${DB_PASSWORD:-securepassword}"
DB_NAME="${DB_NAME:-smartcar_db}"
SQL_FILE="${SQL_FILE:-./schema.sql}"

# On Homebrew Postgres the admin user is usually your macOS user:
ADMIN_USER="${ADMIN_USER:-$(whoami)}"

PSQL_ADMIN=(psql -h 127.0.0.1 -U "${ADMIN_USER}" -v ON_ERROR_STOP=1)
PSQL_APP=(psql -h 127.0.0.1 -U "${DB_USER}" -v ON_ERROR_STOP=1 -d "${DB_NAME}")

###############################################################################
# 1) Ensure PostgreSQL via Homebrew
###############################################################################
echo "--- 1) Ensure PostgreSQL (${PG_BREW_FORMULA}) via Homebrew ---"
if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required. Install from https://brew.sh and re-run." >&2
  exit 1
fi

if ! brew list --versions "${PG_BREW_FORMULA}" >/dev/null 2>&1; then
  echo "Installing ${PG_BREW_FORMULA}..."
  brew install "${PG_BREW_FORMULA}"
fi

echo "Starting ${PG_BREW_FORMULA} service..."
brew services start "${PG_BREW_FORMULA}" || true
sleep 3

###############################################################################
# 2) Create/Update Role & Database
###############################################################################
echo "--- 2) Create/Update role & database ---"

# Create role if missing
if ! "${PSQL_ADMIN[@]}" -d postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
  "${PSQL_ADMIN[@]}" -d postgres -c "CREATE ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';"
fi

# Ensure password & login
"${PSQL_ADMIN[@]}" -d postgres -c "ALTER ROLE ${DB_USER} WITH LOGIN PASSWORD '${DB_PASSWORD}';"

# Create DB if missing with owner
if ! "${PSQL_ADMIN[@]}" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  "${PSQL_ADMIN[@]}" -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
fi

# Make sure DB is owned by app user even if it existed
"${PSQL_ADMIN[@]}" -d postgres -c "ALTER DATABASE ${DB_NAME} OWNER TO ${DB_USER};" || true

###############################################################################
# 3) Reassign ownership of all existing public objects to app user
###############################################################################
echo "--- 3) Reassign ownership of public.* objects to ${DB_USER} ---"
"${PSQL_ADMIN[@]}" -d "${DB_NAME}" <<SQL
-- Make the schema itself owned by the app user
ALTER SCHEMA public OWNER TO ${DB_USER};

DO \$\$
DECLARE r RECORD;
BEGIN
  -- Tables
  FOR r IN
    SELECT format('ALTER TABLE %I.%I OWNER TO ${DB_USER};', schemaname, tablename) AS stmt
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE r.stmt;
  END LOOP;

  -- Sequences
  FOR r IN
    SELECT format('ALTER SEQUENCE %I.%I OWNER TO ${DB_USER};', sequence_schema, sequence_name) AS stmt
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE r.stmt;
  END LOOP;

  -- Views
  FOR r IN
    SELECT format('ALTER VIEW %I.%I OWNER TO ${DB_USER};', schemaname, viewname) AS stmt
    FROM pg_views
    WHERE schemaname = 'public'
  LOOP
    EXECUTE r.stmt;
  END LOOP;

  -- Materialized Views
  FOR r IN
    SELECT format('ALTER MATERIALIZED VIEW %I.%I OWNER TO ${DB_USER};', schemaname, matviewname) AS stmt
    FROM pg_matviews
    WHERE schemaname = 'public'
  LOOP
    EXECUTE r.stmt;
  END LOOP;

  -- Types (ONLY enums & domains; skip table row-types)
  FOR r IN
    SELECT format('ALTER TYPE %I.%I OWNER TO ${DB_USER};', n.nspname, t.typname) AS stmt
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typtype IN ('e','d')   -- enum, domain
  LOOP
    EXECUTE r.stmt;
  END LOOP;

  -- Functions (best-effort; ignore ones we can't alter)
  FOR r IN
    SELECT format('ALTER FUNCTION %I.%I(%s) OWNER TO ${DB_USER};',
                  n.nspname, p.proname,
                  pg_catalog.pg_get_function_identity_arguments(p.oid))
    AS stmt
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    BEGIN
      EXECUTE r.stmt;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
  END LOOP;
END
\$\$;
SQL

###############################################################################
# 4) Apply schema as app role
###############################################################################
echo "--- 4) Apply schema (${SQL_FILE}) as ${DB_USER} ---"
if [[ ! -f "${SQL_FILE}" ]]; then
  echo "❌ Schema file not found: ${SQL_FILE}" >&2
  exit 1
fi

"${PSQL_APP[@]}" <<SQL
SET ROLE ${DB_USER};
SET search_path TO public;
\i ${SQL_FILE}
SQL

echo "✅ PostgreSQL setup complete: DB=${DB_NAME}, ROLE=${DB_USER}"
