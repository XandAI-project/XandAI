# 🐳 Docker Build Instructions

## Problema: Erro "Cannot find module 'qrcode'"

Se você está recebendo o erro:
```
error TS2307: Cannot find module 'qrcode' or its corresponding type declarations.
```

Isso acontece porque o Docker está usando cache de uma build anterior.

## ✅ Solução: Build sem Cache

### Opção 1: Build completo sem cache (Recomendado)

```bash
# No diretório raiz do projeto
docker compose build --no-cache

# Ou apenas o backend
docker compose build --no-cache backend
```

### Opção 2: Limpar cache do Docker

```bash
# Limpar apenas imagens não utilizadas
docker system prune -a

# Rebuild normal
docker compose build
```

### Opção 3: Remover imagem específica

```bash
# Listar imagens
docker images

# Remover imagem do backend
docker rmi xandai-backend

# Rebuild
docker compose build backend
```

## 📋 Comandos Úteis

### Build e Start

```bash
# Build sem cache e iniciar
docker compose up --build --force-recreate

# Apenas backend
docker compose up --build --force-recreate backend
```

### Logs

```bash
# Ver logs do backend
docker compose logs -f backend

# Ver logs de todos os serviços
docker compose logs -f
```

### Parar e Remover

```bash
# Parar containers
docker compose down

# Parar e remover volumes
docker compose down -v
```

## 🔍 Verificar Dependências

Para confirmar que as dependências estão corretas:

```bash
cd backend
cat package.json | grep -A 5 '"dependencies"'
```

Deve incluir:
```json
"qrcode": "^1.5.3",
"whatsapp-web.js": "^1.34.4"
```

E em devDependencies:
```json
"@types/qrcode": "^1.5.5"
```

## 🚀 Build Local (Desenvolvimento)

Se preferir rodar localmente sem Docker:

```bash
cd backend
npm install
npm run build
npm run start:dev
```

## ⚠️ Notas Importantes

1. **Cache do Docker**: Sempre use `--no-cache` na primeira build após mudanças no package.json
2. **package-lock.json**: Certifique-se que está commitado no git
3. **node_modules**: Não deve estar no repositório (verificar .gitignore)
4. **Dependências**: whatsapp-web.js requer puppeteer e pode ser pesado (~300MB)

## 🐛 Troubleshooting

### Erro: ENOENT package.json

```bash
# Verifique se está no diretório correto
ls -la backend/package.json

# Se não existir, você está no lugar errado
cd "caminho/correto/para/XandAI"
```

### Erro: Cannot connect to Docker daemon

```bash
# No Windows, certifique-se que Docker Desktop está rodando
# No Linux/Mac:
sudo systemctl start docker
```

### Build muito lento

O whatsapp-web.js inclui o Chromium (~300MB). Isso é normal na primeira vez.

Cache layers posteriores tornarão builds mais rápidos.

## 📚 Mais Informações

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [WhatsApp Web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [XandAI Documentation](./docs/WHATSAPP_INTEGRATION.md)
