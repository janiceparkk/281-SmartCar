#!/bin/bash

# addMockAlertData.sh
# Seed realistic alert documents into MongoDB "alerts" collection
# for a single year (default: 2025).

set -euo pipefail

# ----------------------------
# 1) Configuration
# ----------------------------

# Mongo connection (can be overridden via environment variables)
MONGO_HOST=${MONGO_HOST:-localhost}
MONGO_PORT=${MONGO_PORT:-27017}
MONGO_DB_NAME=${MONGO_DB_NAME:-smartcar}

# Auth (if your Mongo runs without auth, these are ignored by the server)
MONGO_USER=${MONGO_USER:-tester}
MONGO_PASS=${MONGO_PASS:-tester}
MONGO_AUTH_DB=${MONGO_AUTH_DB:-admin}

# Collection
ALERTS_COLLECTION=${ALERTS_COLLECTION:-alerts}

# Year for which we want realistic data
YEAR=${YEAR:-2025}

MONGO_URI="mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}"

echo "--- Seeding realistic alerts for year ${YEAR} ---"
echo "Mongo URI: ${MONGO_URI}"
echo "User: ${MONGO_USER} (auth DB: ${MONGO_AUTH_DB})"
echo

# ----------------------------
# 2) Check for mongosh
# ----------------------------

if ! command -v mongosh >/dev/null 2>&1; then
  echo "ERROR: 'mongosh' command not found. Install MongoDB Shell and retry."
  exit 1
fi

# ----------------------------
# 3) Run seeding logic in mongosh
# ----------------------------

mongosh "${MONGO_URI}" \
  --username "${MONGO_USER}" \
  --password "${MONGO_PASS}" \
  --authenticationDatabase "${MONGO_AUTH_DB}" <<EOF

// Use the target DB
use("${MONGO_DB_NAME}");

print("Seeding alerts into collection: ${ALERTS_COLLECTION}");

// Some realistic values
const year = ${YEAR};

// Existing car IDs from your smart_cars table
const carIds = [1, 2, 3];

const alertTypes = [
  "Engine / Powertrain",
  "Battery or Charging System",
  "Brake System",
  "Sensor Malfunction",
  "Connectivity / Network Issue",
  "Device Offline / No Heartbeat",
  "Unknown / Other"
];

const soundClasses = [
  "EmergencyVehicleSiren",
  "CollisionImpact",
  "GlassBreak",
  "EngineKnock",
  "TireScreech",
  "HumanScream",
  "DogBark",
  "AmbientNoise"
];

const statuses = [
  "Active",
  "Acknowledged",
  "Resolved",
  "False Positive"
];

// Helpers
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(arr) {
  return arr[randomInt(0, arr.length - 1)];
}

// For each month Jan–Dec
for (let month = 0; month < 12; month++) {
  const alertsThisMonth = randomInt(5, 15);
  print("Month " + (month + 1) + ": creating " + alertsThisMonth + " alerts...");

  for (let i = 0; i < alertsThisMonth; i++) {
    const day = randomInt(1, 28); // safe for all months
    const hour = randomInt(0, 23);
    const minute = randomInt(0, 59);
    const second = randomInt(0, 59);

    const createdAt = new Date(year, month, day, hour, minute, second);

    const alertType   = randomChoice(alertTypes);
    const soundClass  = randomChoice(soundClasses);
    const status      = randomChoice(statuses);
    const carId       = randomChoice(carIds);
    const confidence  = 0.70 + Math.random() * 0.29; // 0.70–0.99

    // Deterministic ID so reruns only update, not duplicate
    const alertId =
      "Y" + year +
      "-M" + String(month + 1).padStart(2, "0") +
      "-IDX" + String(i + 1).padStart(3, "0");

    let resolvedAt = null;
    if (status === "Resolved" || status === "False Positive" || status === "Acknowledged") {
      const hoursToResolve = randomInt(1, 48);
      resolvedAt = new Date(createdAt.getTime() + hoursToResolve * 3600 * 1000);
    }

    db.${ALERTS_COLLECTION}.updateOne(
      { alert_id: alertId },  // match key (so reruns only update)
      {
        \$set: {
          alert_id: alertId,
          car_id: carId,
          alert_type: alertType,
          sound_classification: soundClass,
          confidence_score: confidence,
          status: status,

          // main chart timestamp
          createdAt: createdAt,
          resolved_at: resolvedAt,

          // optional extra fields your UI already uses
          audio_context: {
            duration: randomInt(2, 20), // seconds
            decibel_level: 60 + randomInt(0, 25),
            frequency_range: "300-3000Hz",
            timestamp: createdAt
          },
          location: {
            latitude: 37.3 + Math.random() * 0.2,
            longitude: -121.9 + Math.random() * 0.2,
            accuracy: randomInt(3, 20)
          }
        }
      },
      { upsert: true }
    );
  }
}

print("✔ Finished seeding one year of realistic alerts.");

EOF

# ----------------------------
# 4) Check mongosh exit code correctly
# ----------------------------

MONGOSH_EXIT=$?

if [[ $MONGOSH_EXIT -eq 0 ]]; then
  echo
  echo "--- Alert seeding completed successfully ---"
else
  echo
  echo "--- Alert seeding FAILED with exit code ${MONGOSH_EXIT} ---"
fi

exit $MONGOSH_EXIT
