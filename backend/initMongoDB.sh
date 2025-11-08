#!/bin/bash

# initMongoDB.sh
# Initializes the MongoDB database for the Smart Car Platform.
# This script requires the 'mongosh' command-line tool to be installed and accessible.

# --- Configuration (Must match server.js/Node.js files) ---

# Host and Port (Default MongoDB local host/port)
MONGO_HOST=${MONGO_HOST:-localhost}
MONGO_PORT=${MONGO_PORT:-27017}

# Database Name
MONGO_DB_NAME=${MONGO_DB_NAME:-smartcar}

# Authentication Credentials
MONGO_USER=${MONGO_USER:-tester}
MONGO_PASS=${MONGO_PASS:-tester}
MONGO_AUTH_DB=${MONGO_AUTH_DB:-admin}

# Collection Name for Alerts
ALERTS_COLLECTION=alerts

# --- Connection URL ---
MONGO_URI="mongodb://${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB_NAME}"

echo "--- MongoDB Initialization Started ---"
echo "Target URI: ${MONGO_URI}"
echo "Authenticating as user: ${MONGO_USER} on auth DB: ${MONGO_AUTH_DB}"

# Check if mongosh is available
if ! command -v mongosh &> /dev/null
then
    echo "ERROR: 'mongosh' command not found."
    echo "Please ensure the MongoDB Shell is installed and in your PATH."
    exit 1
fi

# --- Step 1: Create User (if not exists) ---
echo ""
echo "Step 1: Ensuring user '${MONGO_USER}' exists..."

mongosh "mongodb://${MONGO_HOST}:${MONGO_PORT}/admin" --quiet --eval "
  try {
    db.createUser({
      user: '${MONGO_USER}',
      pwd: '${MONGO_PASS}',
      roles: [
        { role: 'readWriteAnyDatabase', db: 'admin' },
        { role: 'dbAdminAnyDatabase', db: 'admin' },
        { role: 'userAdminAnyDatabase', db: 'admin' }
      ]
    });
    print('✓ User created successfully');
  } catch (err) {
    if (err.code === 51003) {
      print('✓ User already exists');
    } else {
      print('✗ Error: ' + err.message);
      quit(1);
    }
  }
" 2>&1

if [ $? -ne 0 ]; then
    echo "Failed to create/verify user"
    exit 1
fi

# --- Step 2: Initialize Database and Indexes ---
echo ""
echo "Step 2: Initializing database and creating indexes..."

# Execute initialization commands using mongosh, including authentication flags
mongosh "${MONGO_URI}" \
    --username "${MONGO_USER}" \
    --password "${MONGO_PASS}" \
    --authenticationDatabase "${MONGO_AUTH_DB}" \
    --eval "
    // Switch to the target database
    use('${MONGO_DB_NAME}');

    // 1. Create Indexes for Query Performance on the alerts collection

    print('Ensuring indexes exist for Alerts collection...');

    // Index 1: on car_id for fast filtering
    db.${ALERTS_COLLECTION}.createIndex({ 'car_id': 1 }, { background: true });
    print('  ✓ Index on car_id created/verified');

    // Index 2: on createdAt (for fast sorting by newest data)
    db.${ALERTS_COLLECTION}.createIndex({ 'createdAt': -1 }, { background: true });
    print('  ✓ Index on createdAt created/verified');

    // Index 3: on status (for filtering by Active/Resolved)
    db.${ALERTS_COLLECTION}.createIndex({ 'status': 1 }, { background: true });
    print('  ✓ Index on status created/verified');

    // Index 4: Ensure alert_id is unique
    db.${ALERTS_COLLECTION}.createIndex({ 'alert_id': 1 }, { unique: true, background: true });
    print('  ✓ Unique Index on alert_id created/verified');

    print('');
    print('MongoDB initialization finished successfully!');
"

if [ $? -eq 0 ]; then
    echo ""
    echo "--- MongoDB Initialization SUCCESSFUL ---"
    echo ""
    echo "Database: ${MONGO_DB_NAME}"
    echo "User: ${MONGO_USER}"
    echo "Collections and indexes are ready!"
else
    echo ""
    echo "--- MongoDB Initialization FAILED ---"
    exit 1
fi