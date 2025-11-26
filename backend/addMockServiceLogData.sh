#!/bin/bash
set -euo pipefail

# -------------------------
# CONFIG
# -------------------------
PG_USER="${PG_USER:-smartcar_user}"
PG_PASSWORD="${PG_PASSWORD:-securepassword}"
PG_DATABASE="${PG_DATABASE:-smartcar_db}"
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"

echo "=== Seeding Mock Service Requests + Logs (safe mode) ==="
echo "Database: $PG_DATABASE at $PG_HOST:$PG_PORT"
echo ""

export PGPASSWORD="$PG_PASSWORD"

psql -U "$PG_USER" -h "$PG_HOST" -p "$PG_PORT" -d "$PG_DATABASE" <<'EOF'

DO $$
DECLARE
  num_requests INT := 25;
  i INT;

  v_car_id INT;
  v_issue_id INT;

  status_list TEXT[] := ARRAY['In Progress', 'Resolved'];
  chosen_status TEXT;

  created TIMESTAMPTZ;
  resolved TIMESTAMPTZ;

  new_request_id INT;

  num_logs INT;
  log_i INT;

  log_time TIMESTAMPTZ;

  desc_list TEXT[] := ARRAY[
    'Inspection started',
    'Diagnosis underway',
    'Awaiting parts delivery',
    'Repair in progress',
    'Software calibration ongoing',
    'Quality assurance review',
    'Issue resolved successfully'
  ];
BEGIN
  -- If service_requests already contains data, skip inserting
  IF EXISTS (SELECT 1 FROM service_requests) THEN
    RAISE NOTICE 'service_requests already has data; skipping mock seed.';
    RETURN;
  END IF;

  -- Check dependencies
  IF NOT EXISTS (SELECT 1 FROM smart_cars) THEN
    RAISE EXCEPTION 'No entries in smart_cars. Seed cars first.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM issue_types) THEN
    RAISE EXCEPTION 'No entries in issue_types. Seed issue types first.';
  END IF;


  FOR i IN 1..num_requests LOOP

    -- Pick random car
    SELECT sc.car_id INTO v_car_id
    FROM smart_cars sc
    ORDER BY random()
    LIMIT 1;

    -- Pick random issue type
    SELECT it.issue_id INTO v_issue_id
    FROM issue_types it
    ORDER BY random()
    LIMIT 1;

    -- Random status
    chosen_status := status_list[1 + (random() * (array_length(status_list, 1)-1))::INT];

    -- Created sometime in last 60 days
    created := NOW() - (random() * INTERVAL '60 days');

    IF chosen_status = 'Resolved' THEN
      resolved := created + (random() * INTERVAL '48 hours');
    ELSE
      resolved := NULL;
    END IF;

    -- Insert request
    INSERT INTO service_requests (car_id, issue_id, status, created_at, resolved_at)
    VALUES (v_car_id, v_issue_id, chosen_status, created, resolved)
    RETURNING request_id INTO new_request_id;

    -- Insert 1–4 logs
    num_logs := 1 + (random() * 3)::INT;

    FOR log_i IN 1..num_logs LOOP
      log_time := created + (log_i * INTERVAL '90 minutes');

      INSERT INTO service_logs (request_id, timestamp, description)
      VALUES (
        new_request_id,
        log_time,
        desc_list[1 + ((random() * array_length(desc_list, 1))::INT)]
      );
    END LOOP;

  END LOOP;

  RAISE NOTICE 'Mock service requests + logs inserted successfully.';
END
$$;

EOF

echo ""
echo "=== DONE: Seed script finished ==="

