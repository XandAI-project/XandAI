# 🚀 Deploy no Servidor (192.168.0.5)

## ✅ Configuração Docker Completa

Todas as variáveis de ambiente estão configuradas no arquivo `.env.docker`.

### Backend:
- `CORS_ORIGIN=*` → Aceita requisições de qualquer origem
- `NODE_ENV=development` → Modo desenvolvimento com CORS aberto
- Porta: `3001`

### Frontend:
- `REACT_APP_API_URL=http://192.168.0.5:3001` → Aponta para o backend no servidor
- Porta: `3000`

---

## 🔄 Deploy/Atualização no Servidor

### Execute estes comandos NO SERVIDOR (192.168.0.5):

```bash
# 1. Entre no diretório do projeto
cd /caminho/para/XandAI

# 2. Pull das últimas mudanças
git pull origin main

# 3. Configure o IP do servidor (se necessário)
# Edite .env.docker e altere SERVER_IP para o IP correto
nano .env.docker

# 4. Rebuild e restart dos containers
docker compose --env-file .env.docker down
docker compose --env-file .env.docker build --no-cache
docker compose --env-file .env.docker up -d

# 5. Verifique os logs
docker compose logs -f
```

---

## ✅ Verificação

### Logs do Backend devem mostrar:
```
🚀 Aplicação iniciada na porta 3001
🔒 CORS: Enabled for all origins (dev mode)
```

### Teste no navegador (de qualquer máquina):
1. Acesse: `http://192.168.0.5:3000`
2. Tente fazer login
3. **NÃO deve ter erro de CORS**
4. Console do navegador deve mostrar:
   ```
   🔐 Auth Service API URL: http://192.168.0.5:3001/api/v1
   ```

---

## 🔥 Comandos Úteis

### Ver logs em tempo real:
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Reiniciar apenas um serviço:
```bash
docker compose restart backend
docker compose restart frontend
```

### Ver status dos containers:
```bash
docker compose ps
```

### Limpar tudo e reconstruir (quando algo está muito errado):
```bash
docker compose down -v
docker system prune -f
docker compose build --no-cache
docker compose up -d
```

---

## 🌐 Acesso de Outras Máquinas

Qualquer dispositivo na mesma rede pode acessar:
- Frontend: `http://192.168.0.5:3000`
- Backend API: `http://192.168.0.5:3001/api/v1`

O CORS está configurado para aceitar todas as origens em modo desenvolvimento! ✅
