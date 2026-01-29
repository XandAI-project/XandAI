# 🌐 Network Access Setup - Using Server IP Instead of Localhost

## 📋 Problem

When accessing XandAI from other devices on your network (e.g., mobile, other computers), you get CORS errors:

```
Access to fetch at 'http://localhost:3001/...' from origin 'http://192.168.0.5:3000' 
has been blocked by CORS policy
```

## 🎯 Solution

Configure both frontend and backend to use your server's network IP address instead of `localhost`.

## 🔍 Step 1: Find Your Server IP

### Windows
```powershell
ipconfig | findstr IPv4
```

Output example:
```
IPv4 Address. . . . . . . . . . . : 192.168.0.5
```

### Linux/Mac
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

or

```bash
ip addr show | grep "inet " | grep -v 127.0.0.1
```

Output example:
```
inet 192.168.0.5/24
```

**Your IP**: `192.168.0.5` (example - yours will be different)

## ⚙️ Step 2: Configure Backend

### Edit `backend/env.local`

```env
# Environment
NODE_ENV=development
PORT=3001

# Server IP - Replace with YOUR actual IP from Step 1
SERVER_IP=192.168.0.5

# CORS Configuration
# * = allow all origins (development only)
CORS_ORIGIN=*

# JWT Configuration
JWT_SECRET=xandai-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# Database
DB_PATH=data/xandai.sqlite
DB_LOGGING=false

# AI Services
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_DEFAULT_MODEL=llama3.2
```

**Key Changes:**
- `SERVER_IP` - Your network IP
- `CORS_ORIGIN=*` - Allows all origins in development

## ⚙️ Step 3: Configure Frontend

### Edit `env.local` (root directory)

```env
# API URL - Use your server IP from Step 1
REACT_APP_API_URL=http://192.168.0.5:3001

# Server IP
REACT_APP_SERVER_IP=192.168.0.5
```

**Important**: Replace `192.168.0.5` with **YOUR** actual server IP!

## 🚀 Step 4: Restart Services

### Backend
```bash
cd backend
npm run start:dev
```

You should see:
```
🚀 Aplicação iniciada na porta 3001
🔒 CORS: Enabled for all origins (dev mode)
```

### Frontend
```bash
# Stop current server (Ctrl+C)
npm start
```

The frontend will now use the API URL from `env.local`.

## ✅ Step 5: Test Access

### From Same Computer
- Open: `http://192.168.0.5:3000` (your IP)
- Should work ✅

### From Mobile Device (same WiFi)
- Open: `http://192.168.0.5:3000`
- Should work ✅

### From Another Computer (same network)
- Open: `http://192.168.0.5:3000`
- Should work ✅

## 🔒 CORS Configuration Explained

### Development (`NODE_ENV=development`)
```typescript
app.enableCors({
  origin: true, // Accepts ANY origin
  credentials: true,
});
```

✅ **Allows**: All devices on network
⚠️ **Security**: OK for development only

### Production (`NODE_ENV=production`)
```typescript
app.enableCors({
  origin: 'https://your-domain.com', // Specific origin only
  credentials: true,
});
```

✅ **Allows**: Only specified domain
🔒 **Security**: Secure for production

## 📱 Accessing from Mobile

1. Ensure mobile is on **same WiFi** as server
2. Open browser on mobile
3. Navigate to: `http://YOUR_SERVER_IP:3000`
4. Example: `http://192.168.0.5:3000`

## 🐛 Troubleshooting

### 1. Still Getting CORS Error

**Check**: Backend logs show correct CORS setting
```
🔒 CORS: Enabled for all origins (dev mode)
```

**Fix**: 
- Restart backend
- Clear browser cache (Ctrl+Shift+Delete)
- Try incognito/private mode

### 2. Can't Connect from Mobile

**Check**: Firewall settings

**Windows Firewall**:
```powershell
# Allow ports 3000 and 3001
New-NetFirewallRule -DisplayName "XandAI Frontend" -Direction Inbound -Port 3000 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "XandAI Backend" -Direction Inbound -Port 3001 -Protocol TCP -Action Allow
```

**Linux (ufw)**:
```bash
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp
```

### 3. Wrong IP Address

**Symptoms**: Connection refused, timeout

**Fix**: Verify your IP hasn't changed
```bash
# Check current IP
ipconfig  # Windows
ifconfig  # Linux/Mac
```

Update `env.local` files if IP changed.

### 4. API Calls Still Use localhost

**Symptoms**: Network tab shows `http://localhost:3001`

**Fix**: 
1. Check `env.local` exists in root directory
2. Restart frontend: `npm start`
3. Clear browser cache
4. Check browser console: Should show API URL

```javascript
📡 WhatsApp Service API URL: http://192.168.0.5:3001
```

## 📋 Quick Reference

### Environment Files Structure

```
XandAI/
├── env.local              ← Frontend config
│   └── REACT_APP_API_URL=http://192.168.0.5:3001
└── backend/
    └── env.local          ← Backend config
        ├── SERVER_IP=192.168.0.5
        └── CORS_ORIGIN=*
```

### URL Access Patterns

| Access Type | URL | Works? |
|------------|-----|--------|
| Same computer (localhost) | `http://localhost:3000` | ✅ Yes |
| Same computer (IP) | `http://192.168.0.5:3000` | ✅ Yes |
| Mobile (same WiFi) | `http://192.168.0.5:3000` | ✅ Yes |
| Mobile (different WiFi) | `http://192.168.0.5:3000` | ❌ No |
| Internet (without port forward) | - | ❌ No |

## 🔐 Security Notes

### Development (Current Setup)
- ✅ CORS: Open to all origins
- ✅ Network: Local network only
- ⚠️ **DO NOT** expose to internet

### Production Recommendations
- 🔒 CORS: Restrict to specific domain
- 🔒 HTTPS: Use SSL certificates
- 🔒 Firewall: Block direct port access
- 🔒 Reverse Proxy: Use nginx/Apache

## 📚 Additional Resources

- [NestJS CORS](https://docs.nestjs.com/security/cors)
- [React Environment Variables](https://create-react-app.dev/docs/adding-custom-environment-variables/)
- [Network Troubleshooting](./TROUBLESHOOTING.md)

## 🎓 Understanding the Flow

```
Mobile Device (192.168.0.10)
    ↓ HTTP Request
    ↓ http://192.168.0.5:3000
    ↓
Frontend Server (192.168.0.5:3000)
    ↓ API Call
    ↓ http://192.168.0.5:3001/api/...
    ↓
Backend Server (192.168.0.5:3001)
    ├─ Check CORS ✓ (origin: true)
    ├─ Authenticate ✓ (JWT)
    └─ Process & Respond
```

---

**Last Updated**: January 2026
**Status**: ✅ Working
