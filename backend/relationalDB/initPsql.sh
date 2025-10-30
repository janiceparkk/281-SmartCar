#!/bin/bash
#
# Script to install PostgreSQL server, create the 'smartcar_user' role,
# set the password, and initialize the 'smartcar_db' database.
#
# NOTE: This script assumes 'schema.sql' is in the same directory.
#

# --- 1. System Setup and Server Installation ---

echo "--- 1. Installing and starting PostgreSQL Server ---"

# Install the server and client tools (if not already installed)
sudo apt update
sudo apt install -y postgresql postgresql-client-16

# Start the PostgreSQL service
if sudo systemctl start postgresql; then
    echo "PostgreSQL server started successfully."
else
    echo "Error: Failed to start postgresql service. Check installation logs."
    exit 1
fi

# Give the server a moment to start
sleep 3

# --- 2. Database User and Database Creation ---

echo "--- 2. Creating User and Database ---"

DB_USER="smartcar_user"
DB_PASSWORD="securepassword"
DB_NAME="smartcar_db"
SQL_FILE="./schema.sql"

# Check if the user already exists to avoid errors
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'")

if [ "$USER_EXISTS" != "1" ]; then
    echo "Creating user '$DB_USER'..."
    # Execute commands as the 'postgres' superuser
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH ENCRYPTED PASSWORD '$DB_PASSWORD';"
    echo "User created."
else
    echo "User '$DB_USER' already exists. Skipping creation."
fi

# Check if the database already exists
DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" != "1" ]; then
    echo "Creating database '$DB_NAME' and setting owner..."
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    echo "Database created."
else
    echo "Database '$DB_NAME' already exists. Skipping creation."
fi

# --- 3. Execute Schema Script ---

echo "--- 3. Applying schema.sql ---"

if [ -f "$SQL_FILE" ]; then
    echo "Executing $SQL_FILE to create tables..."
    # Use sudo to run as postgres user, specifying the target database and user
    if sudo -u postgres psql -d "$DB_NAME" -f "$SQL_FILE"; then
        echo "PostgreSQL setup complete. Schema applied successfully."
        echo "You can now run your Node.js or Python application."
    else
        echo "Error: Failed to execute $SQL_FILE. Check for SQL errors."
        exit 1
    fi
else
    echo "Error: Schema file '$SQL_FILE' not found in the current directory."
    exit 1
fi


echo "--- 4. Verifying Data Insertion ---"

# Check user roles
echo "user_roles table:"
sudo -u postgres psql -d "$DB_NAME" -c "SELECT * FROM user_roles;"

# Check users
echo "users table:"
sudo -u postgres psql -d "$DB_NAME" -c "SELECT user_id, role_id, user_type, email, name FROM users;"

# Count records
echo "Record counts:"
sudo -u postgres psql -d "$DB_NAME" -c "SELECT COUNT(*) as user_roles_count FROM user_roles; SELECT COUNT(*) as users_count FROM users;"

# List all tables
# echo "All tables in database:"
# sudo -u postgres psql -d "$DB_NAME" -c "\dt"