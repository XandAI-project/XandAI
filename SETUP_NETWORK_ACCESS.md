# 🚀 Quick Setup: Network Access (Non-Localhost)

## TL;DR - 3 Steps

### 1️⃣ Find Your IP
```bash
# Windows
ipconfig | findstr IPv4

# Linux/Mac
ifconfig | grep inet
```

Example result: `192.168.0.5`

### 2️⃣ Edit Files

**Backend** (`backend/env.local`):
```env
NODE_ENV=development
PORT=3001
SERVER_IP=192.168.0.5  # ← Your IP here
CORS_ORIGIN=*
JWT_SECRET=xandai-secret
DB_PATH=data/xandai.sqlite
OLLAMA_BASE_URL=http://localhost:11434
```

**Frontend** (`env.local`):
```env
REACT_APP_API_URL=http://192.168.0.5:3001  # ← Your IP here
```

### 3️⃣ Restart Everything

```bash
# Backend (in backend directory)
npm run start:dev

# Frontend (in root directory)
npm start
```

## ✅ Test

- Same computer: `http://192.168.0.5:3000` ✅
- Mobile (same WiFi): `http://192.168.0.5:3000` ✅
- Other computers: `http://192.168.0.5:3000` ✅

## 🐛 Not Working?

1. **CORS Error**: Restart backend, check logs for "CORS: Enabled for all origins"
2. **Connection Refused**: Check firewall (Windows Firewall, ufw)
3. **Still localhost**: Clear browser cache, restart frontend

## 📚 Full Documentation

See: [`docs/NETWORK_ACCESS_SETUP.md`](./docs/NETWORK_ACCESS_SETUP.md)

---

**Replace `192.168.0.5` with YOUR actual IP address!**
