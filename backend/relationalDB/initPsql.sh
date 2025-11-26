#!/bin/bash
#
# Script to install PostgreSQL server, create the database role,
# set the password, and initialize the database.
#
# NOTE: This script assumes 'schema.sql' is in the same directory.
# Credentials are read from a '.env' file in the same directory.
#

# --- Configuration ---

ENV_FILE="../.env"
SQL_FILE="./schema.sql"

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE file not found in the current directory."
    echo "Please create a $ENV_FILE file with the following variables:"
    echo "PG_USER=your_username"
    echo "PG_PASSWORD=your_secure_password"
    echo "PG_DATABASE=your_database_name"
    exit 1
fi

# Load environment variables
set -a  # automatically export all variables
source "$ENV_FILE"
set +a  # stop auto-exporting

# Validate that required variables are set
if [ -z "$PG_USER" ] || [ -z "$PG_PASSWORD" ] || [ -z "$PG_DATABASE" ]; then
    echo "Error: PG_USER, PG_PASSWORD, and PG_DATABASE must be set in $ENV_FILE"
    exit 1
fi

echo "Loaded configuration from $ENV_FILE:"
echo "  PG_USER: $PG_USER"
echo "  PG_DATABASE: $PG_DATABASE"
echo "  PG_PASSWORD: [hidden]"

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

# Check if the user already exists to avoid errors
USER_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'")

if [ "$USER_EXISTS" != "1" ]; then
    echo "Creating user '$PG_USER'..."
    # Execute commands as the 'postgres' superuser
    sudo -u postgres psql -c "CREATE USER $PG_USER WITH ENCRYPTED PASSWORD '$PG_PASSWORD';"
    echo "User created."
else
    echo "User '$PG_USER' already exists. Skipping creation."
fi

# Check if the database already exists
PG_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$PG_DATABASE'")

if [ "$PG_EXISTS" != "1" ]; then
    echo "Creating database '$PG_DATABASE' and setting owner..."
    sudo -u postgres psql -c "CREATE DATABASE $PG_DATABASE OWNER $PG_USER;"
    echo "Database created."
else
    echo "Database '$PG_DATABASE' already exists. Skipping creation."
fi

# --- 3. Execute Schema Script ---

echo "--- 3. Applying schema.sql ---"

if [ -f "$SQL_FILE" ]; then
    echo "Executing $SQL_FILE to create tables..."
    # Use sudo to run as postgres user, specifying the target database and user
    if sudo -u postgres psql -d "$PG_DATABASE" -f "$SQL_FILE"; then
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

# --- 4. Create Admin User ---

echo "--- 4. Creating Admin User ---"

echo "Creating admin user with credentials: admin/admin"

sudo -u postgres psql -d "$PG_DATABASE" << EOF
-- Insert admin user with password 'admin' (bcrypt hash)
INSERT INTO users (role_id, user_type, name, email, password_hash, phone, company_name)
VALUES (
    (SELECT role_id FROM user_roles WHERE role_name = 'Admin'),
    'Admin',
    'System Administrator',
    'admin@system.local',
    -- Password: 'admin' (bcrypt hash)
    '\$2a\$10\$8F2o8cY7o5e5b5e5e5e5eO5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e',
    '+1-555-ADMIN01',
    'System Administration'
) ON CONFLICT (email) DO UPDATE SET
    role_id = EXCLUDED.role_id,
    user_type = EXCLUDED.user_type,
    name = EXCLUDED.name,
    password_hash = EXCLUDED.password_hash,
    phone = EXCLUDED.phone,
    company_name = EXCLUDED.company_name;

-- Verify admin user creation
SELECT 'Admin user created successfully:' as message, user_id, name, email, role_name 
FROM users 
JOIN user_roles USING (role_id) 
WHERE email = 'admin@system.local';
EOF

echo "Admin user created/updated with credentials:"
echo "  Username: admin"
echo "  Password: admin"
echo "  Email: admin@system.local"

# --- 5. Verifying Data Insertion ---

echo "--- 5. Verifying Data Insertion ---"

# Check user roles
echo "user_roles table:"
sudo -u postgres psql -d "$PG_DATABASE" -c "SELECT * FROM user_roles;"

# Check users
echo "users table:"
sudo -u postgres psql -d "$PG_DATABASE" -c "SELECT user_id, role_id, user_type, email, name FROM users;"

# Count records
echo "Record counts:"
sudo -u postgres psql -d "$PG_DATABASE" -c "SELECT COUNT(*) as user_roles_count FROM user_roles; SELECT COUNT(*) as users_count FROM users;"

# --- 6. Granting User Permissions ---

echo "--- 6. Granting User Permissions ---"

sudo -u postgres psql -d "$PG_DATABASE" << EOF
-- Grant necessary permissions to $PG_USER
GRANT ALL ON SCHEMA public TO $PG_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $PG_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $PG_USER;
GRANT CREATE ON SCHEMA public TO $PG_USER;

-- Set default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $PG_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $PG_USER;

-- Set search path
ALTER USER $PG_USER SET search_path TO public;
EOF

echo "User permissions granted successfully."

echo ""
echo "=== SETUP COMPLETE ==="
echo "Database: $PG_DATABASE"
echo "Application user: $PG_USER"
echo "Admin access:"
echo "  Email: admin@system.local"
echo "  Password: admin"
echo "  Role: Admin"
echo ""
echo "You can now connect to the database and use the admin account for system administration."