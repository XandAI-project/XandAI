#!/bin/bash
set -e

# PostgreSQL Initialization Script
# This script ensures the database password matches the environment variable
# Note: Scripts in /docker-entrypoint-initdb.d/ only run on FIRST initialization
# For existing databases, use the manual password reset method

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Ensure user exists with correct password
    ALTER USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';
    
    -- Grant all privileges
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
    
    -- Log success
    SELECT 'PostgreSQL password synchronized with environment' AS status;
EOSQL

echo "PostgreSQL initialization complete"
