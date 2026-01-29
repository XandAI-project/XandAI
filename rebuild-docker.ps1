# ===========================================
# XandAI - Docker Rebuild Script (PowerShell)
# ===========================================
# Este script força rebuild completo sem cache
# Use quando houver mudanças em dependências

Write-Host "🐳 XandAI - Docker Rebuild Script" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

function Print-Status {
    param($Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Print-Warning {
    param($Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Print-Error {
    param($Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

# Verificar se Docker está rodando
try {
    docker info | Out-Null
    Print-Status "Docker está rodando"
} catch {
    Print-Error "Docker não está rodando!"
    Write-Host "Por favor, inicie o Docker Desktop e tente novamente."
    exit 1
}

# Parar containers existentes
Print-Warning "Parando containers existentes..."
docker compose down 2>$null

# Remover imagens antigas do XandAI
Print-Warning "Removendo imagens antigas..."
docker rmi xandai-backend xandai-frontend 2>$null

# Build sem cache
Print-Status "Iniciando build sem cache..."
Write-Host ""

$service = $args[0]

if ($service -eq "backend") {
    Print-Status "Building apenas backend..."
    docker compose build --no-cache backend
} elseif ($service -eq "frontend") {
    Print-Status "Building apenas frontend..."
    docker compose build --no-cache frontend
} else {
    Print-Status "Building todos os serviços..."
    docker compose build --no-cache
}

# Verificar se build foi bem-sucedido
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Print-Status "Build concluído com sucesso! 🎉"
    Write-Host ""
    Write-Host "Para iniciar os serviços, execute:"
    Write-Host "  docker compose up -d" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Para ver logs:"
    Write-Host "  docker compose logs -f" -ForegroundColor Cyan
} else {
    Write-Host ""
    Print-Error "Build falhou! Verifique os erros acima."
    exit 1
}
