#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
ALTER USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
SELECT 'PostgreSQL password synchronized' AS status;
EOSQL

echo "PostgreSQL initialization complete"
