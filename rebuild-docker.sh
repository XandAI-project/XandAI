#!/bin/bash

# ===========================================
# XandAI - Docker Rebuild Script
# ===========================================
# Este script força rebuild completo sem cache
# Use quando houver mudanças em dependências

echo "🐳 XandAI - Docker Rebuild Script"
echo "=================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para imprimir com cor
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    print_error "Docker não está rodando!"
    echo "Por favor, inicie o Docker Desktop e tente novamente."
    exit 1
fi

print_status "Docker está rodando"

# Parar containers existentes
print_warning "Parando containers existentes..."
docker compose down

# Remover imagens antigas do XandAI
print_warning "Removendo imagens antigas..."
docker rmi xandai-backend xandai-frontend 2>/dev/null || true

# Build sem cache
print_status "Iniciando build sem cache..."
echo ""

if [ "$1" == "backend" ]; then
    print_status "Building apenas backend..."
    docker compose build --no-cache backend
elif [ "$1" == "frontend" ]; then
    print_status "Building apenas frontend..."
    docker compose build --no-cache frontend
else
    print_status "Building todos os serviços..."
    docker compose build --no-cache
fi

# Verificar se build foi bem-sucedido
if [ $? -eq 0 ]; then
    echo ""
    print_status "Build concluído com sucesso! 🎉"
    echo ""
    echo "Para iniciar os serviços, execute:"
    echo "  docker compose up -d"
    echo ""
    echo "Para ver logs:"
    echo "  docker compose logs -f"
else
    echo ""
    print_error "Build falhou! Verifique os erros acima."
    exit 1
fi
