#!/bin/bash
#
# seed_mock_cars.sh
# Safely seed mock smart_cars into PostgreSQL (idempotent)
#

echo "=== Seeding Mock Cars into smartcar_db (safe mode) ==="

# Load .env if present (adjust path if needed)
if [ -f ".env" ]; then
  echo "Loading DB config from .env..."
  # Export only the relevant PG_ variables
  export $(grep -E '^(PG_USER|PG_PASSWORD|PG_DATABASE|PG_HOST|PG_PORT)=' .env | sed 's/"//g')
fi

# Defaults if not set
PG_USER=${PG_USER:-smartcar_user}
PG_PASSWORD=${PG_PASSWORD:-securepassword}
PG_DATABASE=${PG_DATABASE:-smartcar_db}
PG_HOST=${PG_HOST:-localhost}
PG_PORT=${PG_PORT:-5432}

echo "Database: ${PG_DATABASE} at ${PG_HOST}:${PG_PORT} (user: ${PG_USER})"

# Build connection string
PG_CONN="postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}"

psql "${PG_CONN}" <<'SQL'
DO $$
DECLARE
  v_owner_id INTEGER;
BEGIN
  -- 1) Find a CarOwner user to own these cars
  SELECT u.user_id
    INTO v_owner_id
  FROM users u
  JOIN user_roles r ON u.role_id = r.role_id
  WHERE r.role_name = 'CarOwner'
  ORDER BY u.user_id
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'No CarOwner user found. Please create a CarOwner user first.';
  END IF;

  RAISE NOTICE 'Using CarOwner user_id = % for mock cars.', v_owner_id;

  -- 2) Insert Toyota Camry if not exists (by VIN)
  IF NOT EXISTS (
    SELECT 1 FROM smart_cars WHERE vin = '1HGCM82633A123456'
  ) THEN
    INSERT INTO smart_cars (
      user_id,
      make,
      model,
      year,
      color,
      license_plate,
      vin,
      status,
      current_latitude,
      current_longitude
    )
    VALUES (
      v_owner_id,
      'Toyota',
      'Camry',
      2023,
      'Silver',
      'ABC123',
      '1HGCM82633A123456',
      'active',
      NULL,
      NULL
    );
    RAISE NOTICE 'Inserted Toyota Camry.';
  ELSE
    RAISE NOTICE 'Toyota Camry (VIN 1HGCM82633A123456) already exists; skipping.';
  END IF;

  -- 3) Insert Honda CR-V if not exists
  IF NOT EXISTS (
    SELECT 1 FROM smart_cars WHERE vin = '5J6RW1H58LA123457'
  ) THEN
    INSERT INTO smart_cars (
      user_id,
      make,
      model,
      year,
      color,
      license_plate,
      vin,
      status,
      current_latitude,
      current_longitude
    )
    VALUES (
      v_owner_id,
      'Honda',
      'CR-V',
      2022,
      'Blue',
      'XYZ789',
      '5J6RW1H58LA123457',
      'active',
      NULL,
      NULL
    );
    RAISE NOTICE 'Inserted Honda CR-V.';
  ELSE
    RAISE NOTICE 'Honda CR-V (VIN 5J6RW1H58LA123457) already exists; skipping.';
  END IF;

  -- 4) Insert Tesla Model 3 if not exists
  IF NOT EXISTS (
    SELECT 1 FROM smart_cars WHERE vin = '5YJ3E1EA0PF123458'
  ) THEN
    INSERT INTO smart_cars (
      user_id,
      make,
      model,
      year,
      color,
      license_plate,
      vin,
      status,
      current_latitude,
      current_longitude
    )
    VALUES (
      v_owner_id,
      'Tesla',
      'Model 3',
      2024,
      'Red',
      'EV2024',
      '5YJ3E1EA0PF123458',
      'active',
      NULL,
      NULL
    );
    RAISE NOTICE 'Inserted Tesla Model 3.';
  ELSE
    RAISE NOTICE 'Tesla Model 3 (VIN 5YJ3E1EA0PF123458) already exists; skipping.';
  END IF;

END
$$;
SQL

if [ $? -eq 0 ]; then
  echo "=== Mock car seeding COMPLETED successfully ==="
else
  echo "=== Mock car seeding FAILED (see errors above) ==="
fi
