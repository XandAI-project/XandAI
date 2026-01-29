# 🔥 EXECUTE NO SERVIDOR (192.168.0.5)

## ⚠️ IMPORTANTE
Estes comandos devem ser executados **NO SERVIDOR REMOTO** onde a aplicação está rodando!

## 1️⃣ Verificar arquivos .env

```bash
# Entre no diretório do projeto
cd /caminho/para/XandAI

# Verifique o backend/.env
cat backend/.env | grep CORS
# Deve mostrar: CORS_ORIGIN=*

# Verifique o .env do frontend
cat .env
# Deve mostrar: REACT_APP_API_URL=http://192.168.0.5:3001
```

## 2️⃣ Reiniciar Backend (OBRIGATÓRIO)

```bash
# Parar o backend (Ctrl+C ou kill)
# Se rodando com Docker:
docker compose restart backend

# Se rodando com npm:
cd backend
npm run start:dev
```

## 3️⃣ Reiniciar Frontend (OBRIGATÓRIO)

```bash
# Parar o frontend (Ctrl+C ou kill)
# Se rodando com Docker:
docker compose restart frontend

# Se rodando com npm:
cd /caminho/para/XandAI
npm start
```

## 4️⃣ Verificar Logs

### Backend deve mostrar:
```
🚀 Aplicação iniciada na porta 3001
🔒 CORS: Enabled for all origins (dev mode)
```

### Frontend (browser console) deve mostrar:
```
🔐 Auth Service API URL: http://192.168.0.5:3001/api/v1
```

## 5️⃣ Testar Login

Acesse: `http://192.168.0.5:3000/login`

O CORS deve funcionar agora! ✅

---

## Se Docker não pegar as mudanças:

```bash
docker compose down
docker compose up --build
```
