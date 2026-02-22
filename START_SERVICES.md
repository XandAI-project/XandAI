# Start XandAI Services

## Current Status

PostgreSQL is now running with a fresh database using the correct password from `.env`.

The backend and frontend containers are created but not started because they depend on services being healthy.

---

## Start All Services

Run this command on your Linux machine:

```bash
cd ~/XandAI

# Start backend and frontend
docker compose up -d backend frontend

# Watch the logs
docker compose logs -f backend
```

---

## Expected Successful Logs

You should see:

```
[Nest] 1 - LOG [NestFactory] Starting Nest application...
[Nest] 1 - LOG [InstanceLoader] AppModule dependencies initialized +16ms
[Nest] 1 - LOG [InstanceLoader] TypeOrmModule dependencies initialized +0ms
[Nest] 1 - LOG [DynamicLLMService] 🚀 Dynamic LLM Service initialized with base URL: http://192.168.0.13:8080
[Nest] 1 - LOG [InstanceLoader] TypeOrmCoreModule dependencies initialized +50ms
[Nest] 1 - LOG [InstanceLoader] TypeOrmModule dependencies initialized +1ms
[Nest] 1 - LOG [RoutesResolver] AuthController {/api/v1/auth}
[Nest] 1 - LOG [RoutesResolver] ChatController {/api/v1/chat}
[Nest] 1 - LOG [RouterExplorer] Mapped {/api/v1/chat/messages, POST} route
[Nest] 1 - LOG [RouterExplorer] Mapped {/api/v1/chat/providers/models/loaded, GET} route
[Nest] 1 - LOG [NestApplication] Nest application successfully started +10ms
[Nest] 1 - LOG Listening on port 3001
```

NO password authentication errors!

---

## Verify Services

```bash
# Check all containers are running
docker compose ps

# Should show:
# xandai-postgres   running (healthy)
# xandai-backend    running (healthy)
# xandai-frontend   running (healthy)
```

---

## Access Application

Open browser:
- Frontend: http://192.168.0.13:3000
- Backend API: http://192.168.0.13:3001/api/v1/health

---

## If Backend Still Fails

If you still see password errors, the issue is with the init script line endings. Fix it on Linux:

```bash
cd ~/XandAI/backend

# Convert Windows line endings to Unix
sed -i 's/\r$//' init-db.sh

# Recreate postgres to run init script
docker compose down postgres
docker volume rm xandai_postgres_data
docker compose up -d
```

---

**The database is now fresh with correct credentials. Start the services!**
