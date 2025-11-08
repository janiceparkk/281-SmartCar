#!/bin/bash
#
# macOS version of PostgreSQL initialization script
#

echo "--- 1. Installing and starting PostgreSQL Server (macOS) ---"

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found. Installing Homebrew first..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install PostgreSQL
if ! brew list postgresql@14 &> /dev/null; then
    echo "Installing PostgreSQL..."
    brew install postgresql@14
fi

# Start PostgreSQL service
brew services start postgresql@14
sleep 3

echo "--- 2. Creating User and Database ---"

DB_USER="smartcar_user"
DB_PASSWORD="securepassword"
DB_NAME="smartcar_db"
SQL_FILE="./schema.sql"

# Create user
createuser -s $DB_USER 2>/dev/null || echo "User $DB_USER may already exist"

# Set password
psql postgres -c "ALTER USER $DB_USER PASSWORD '$DB_PASSWORD';"

# Create database
createdb $DB_NAME -O $DB_USER 2>/dev/null || echo "Database $DB_NAME may already exist"

echo "--- 3. Applying schema ---"

if [ -f "$SQL_FILE" ]; then
    psql -d "$DB_NAME" -U "$DB_USER" -f "$SQL_FILE"
    echo "PostgreSQL setup complete!"
else
    echo "Error: Schema file not found"
    exit 1
fi

