# 🔧 Fix: Docker Build Error - "Cannot find module 'qrcode'"

## ❌ Problema

Ao fazer build do Docker, você recebe o erro:

```
error TS2307: Cannot find module 'qrcode' or its corresponding type declarations.
```

## 🎯 Causa

O Docker está usando **cache de uma build anterior** que não tinha as dependências `qrcode` e `whatsapp-web.js`.

## ✅ Solução Rápida

### Windows (PowerShell)

```powershell
# Opção 1: Usar script helper
.\rebuild-docker.ps1

# Opção 2: Comando direto
docker compose build --no-cache backend
```

### Linux/Mac (Bash)

```bash
# Opção 1: Usar script helper
chmod +x rebuild-docker.sh
./rebuild-docker.sh

# Opção 2: Comando direto
docker compose build --no-cache backend
```

## 📋 Passo a Passo Detalhado

### 1. Parar containers existentes

```bash
docker compose down
```

### 2. Remover imagem antiga (opcional mas recomendado)

```bash
docker rmi xandai-backend
```

### 3. Build sem cache

```bash
docker compose build --no-cache backend
```

### 4. Iniciar serviços

```bash
docker compose up -d
```

### 5. Verificar logs

```bash
docker compose logs -f backend
```

## 🔍 Verificação

Para confirmar que as dependências estão corretas no `package.json`:

```bash
cat backend/package.json | grep -E "(qrcode|whatsapp-web)"
```

Deve mostrar:

```json
"qrcode": "^1.5.3",
"qrcode-terminal": "^0.12.0",
"whatsapp-web.js": "^1.34.4"
```

E em devDependencies:

```json
"@types/qrcode": "^1.5.5"
```

## 🚀 Alternativa: Build Local

Se preferir não usar Docker durante desenvolvimento:

```bash
# Backend
cd backend
npm install
npm run build
npm run start:dev

# Frontend (outro terminal)
cd ..
npm install
npm start
```

## ⚡ Scripts Helper Criados

### `rebuild-docker.ps1` (Windows)

```powershell
# Build tudo
.\rebuild-docker.ps1

# Apenas backend
.\rebuild-docker.ps1 backend

# Apenas frontend
.\rebuild-docker.ps1 frontend
```

### `rebuild-docker.sh` (Linux/Mac)

```bash
# Build tudo
./rebuild-docker.sh

# Apenas backend
./rebuild-docker.sh backend

# Apenas frontend
./rebuild-docker.sh frontend
```

## 📝 O que foi Adicionado

### Novas Dependências (backend/package.json)

```json
{
  "dependencies": {
    "qrcode": "^1.5.3",
    "whatsapp-web.js": "^1.34.4"
  },
  "devDependencies": {
    "@types/qrcode": "^1.5.5"
  }
}
```

### Novos Arquivos

1. `backend/.dockerignore` - Otimiza build do Docker
2. `BUILD_INSTRUCTIONS.md` - Instruções detalhadas
3. `rebuild-docker.sh` - Script helper Linux/Mac
4. `rebuild-docker.ps1` - Script helper Windows
5. `DOCKER_BUILD_FIX.md` - Este arquivo

## 🐛 Troubleshooting

### Erro: "docker: command not found"

**Solução**: Instale o Docker Desktop
- Windows/Mac: https://www.docker.com/products/docker-desktop
- Linux: `sudo apt install docker.io docker-compose`

### Erro: "Cannot connect to Docker daemon"

**Solução**: Inicie o Docker Desktop

### Build muito lento (primeira vez)

**Normal**: O `whatsapp-web.js` inclui Chromium (~300MB). Builds subsequentes usarão cache e serão mais rápidos.

### Erro persiste após rebuild

```bash
# Limpar tudo e recomeçar
docker compose down -v
docker system prune -a
docker compose build --no-cache
docker compose up -d
```

## 📚 Documentação Relacionada

- [WhatsApp Integration](./docs/WHATSAPP_INTEGRATION.md)
- [Quick Start](./WHATSAPP_QUICKSTART.md)
- [Build Instructions](./BUILD_INSTRUCTIONS.md)

## ✅ Checklist

- [ ] Docker Desktop está rodando
- [ ] `backend/package.json` tem `qrcode` e `whatsapp-web.js`
- [ ] `package-lock.json` está atualizado
- [ ] Build executado com `--no-cache`
- [ ] Containers iniciados com sucesso
- [ ] Logs não mostram erros

## 🎉 Resultado Esperado

Após o build bem-sucedido:

```
✓ Backend compilado sem erros
✓ Container backend iniciado
✓ API disponível em http://localhost:3001
✓ Frontend disponível em http://localhost:3000
✓ WhatsApp integration pronta para uso
```

---

**Última atualização**: Janeiro 2026
**Versão**: 1.0.0
