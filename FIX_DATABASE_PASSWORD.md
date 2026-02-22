# Fix PostgreSQL Authentication Error

## Problem

PostgreSQL container is using a different password than what's configured in `.env`. The database was initialized with old credentials and the persistent volume retains them.

**Error:**
```
error: password authentication failed for user "postgres"
```

---

## Quick Fix (Choose One Method)

### Method 1: Reset Password WITHOUT Deleting Data (RECOMMENDED)

Run this on your Linux machine to update the password in the existing database:

```bash
cd ~/XandAI

# Connect to postgres and reset password
docker exec -it xandai-postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'xandai_secret';"

# Restart backend to reconnect
docker compose restart backend

# Verify it works
docker compose logs -f backend
```

**Expected Output:**
```
[Nest] 1 - LOG [TypeOrmCoreModule] Database connection established
[Nest] 1 - LOG [RoutesResolver] ChatController {/api/v1/chat}
[Nest] 1 - LOG [NestApplication] Nest application successfully started
```

---

### Method 2: Fresh Database (DELETES ALL DATA)

Use this if you don't need to preserve existing data:

```bash
cd ~/XandAI

# Stop all services
docker compose down

# Remove the postgres volume (WARNING: DELETES DATA)
docker volume rm xandai_postgres_data

# Start services with fresh database
docker compose up -d

# Watch logs to verify connection
docker compose logs -f backend
```

The new database will be initialized with the correct password from `.env`.

---

## What Was Fixed in Code

### 1. Created Initialization Script

**File:** `backend/init-db.sh`

This script ensures password matches environment variable on fresh database initialization:

```bash
#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    ALTER USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';
    GRANT ALL PRIVILEGES ON DATABASE $POSTGRES_DB TO $POSTGRES_USER;
EOSQL
```

**Note:** This only runs on FIRST initialization. For existing databases, use Method 1 above.

### 2. Updated docker-compose.yml

Added volume mount for initialization script:

```yaml
postgres:
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./backend/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh:ro
```

### 3. Verified .env Configuration

**File:** `.env` (root directory)

Correct credentials:
```env
DB_USERNAME=postgres
DB_PASSWORD=xandai_secret
DB_NAME=xandai
```

---

## Why This Happened

PostgreSQL stores user credentials in the data directory (`/var/lib/postgresql/data`). When you:
1. First start postgres container → it initializes with environment variables
2. Change `.env` file → existing data volume keeps old password
3. Restart services → backend uses new password, postgres expects old password
4. Result: Authentication failure

---

## Verification Steps

After applying the fix:

```bash
# 1. Check backend logs - should show successful connection
docker compose logs backend | grep -i "typeorm\|database\|error"

# 2. Test database connection directly
docker exec -it xandai-postgres psql -U postgres -d xandai -c "SELECT version();"

# 3. Check backend health endpoint
curl http://192.168.0.13:3001/api/v1/health

# 4. Access frontend
# Navigate to: http://192.168.0.13:3000
```

---

## Prevention for Future

The `.env` file is now tracked and properly configured. The initialization script will ensure fresh databases use correct credentials.

**Best Practice:**
- Never change database passwords after initialization without updating the database
- Use `docker compose down -v` to remove volumes when resetting completely
- Keep `.env` file consistent across team members

---

## Current Credentials

**From .env file:**
- Username: `postgres`
- Password: `xandai_secret`
- Database: `xandai`

**These match docker-compose.yml defaults.**

---

## Next Steps

1. Run **Method 1** (recommended) to fix without data loss:
   ```bash
   docker exec -it xandai-postgres psql -U postgres -c "ALTER USER postgres WITH PASSWORD 'xandai_secret';"
   docker compose restart backend
   ```

2. Verify backend starts successfully:
   ```bash
   docker compose logs backend
   ```

3. Test the application at `http://192.168.0.13:3000`

---

## Summary

**Files Modified:**
- Created: `backend/init-db.sh`
- Updated: `docker-compose.yml` (added volume mount)
- Verified: `.env` (correct credentials)

**Required Action:**
Run the password reset command (Method 1) on your Linux machine to fix the authentication immediately.
