# 🔄 Restart Everything - Fix Environment Variables

## Problem
Environment variables not loading? Services using wrong URLs?

## Solution: Complete Restart

### Windows (PowerShell)

```powershell
# 1. Stop everything (Ctrl+C on both terminals)

# 2. Backend
cd backend
Remove-Item -Recurse -Force .cache, node_modules/.cache 2>$null
$env:NODE_ENV="development"
npm run start:dev

# 3. Frontend (NEW TERMINAL)
cd ..
Remove-Item -Recurse -Force .cache, node_modules/.cache 2>$null
npm start
```

### Linux/Mac (Bash)

```bash
# 1. Stop everything (Ctrl+C on both terminals)

# 2. Backend
cd backend
rm -rf .cache node_modules/.cache
export NODE_ENV=development
npm run start:dev

# 3. Frontend (NEW TERMINAL)
cd ..
rm -rf .cache node_modules/.cache
npm start
```

## Verify Environment Variables Loaded

### Backend Console Should Show:
```
🚀 Aplicação iniciada na porta 3001
🔒 CORS: Enabled for all origins (dev mode)
```

### Browser Console Should Show:
```
🔐 Auth Service API URL: http://192.168.0.5:3001/api/v1
💬 Chat API Repository URL: http://192.168.0.5:3001/api/v1
📜 Chat History Service API URL: http://192.168.0.5:3001/api/v1
📡 WhatsApp Service API URL: http://192.168.0.5:3001/api/v1
```

## If Still Not Working

### Check .env files exist:
```bash
ls -la .env
ls -la backend/.env
```

### Check .env content:
```bash
cat .env
cat backend/.env
```

### Nuclear Option - Complete Clean Restart:
```bash
# Stop ALL node processes
# Windows:
taskkill /F /IM node.exe

# Linux/Mac:
killall node

# Clean and reinstall
rm -rf node_modules backend/node_modules
npm install
cd backend && npm install && cd ..

# Restart
cd backend && npm run start:dev &
npm start
```

## Quick Check Script

### check-env.js
```javascript
console.log('=== Environment Check ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('========================');
```

Run: `node check-env.js`
