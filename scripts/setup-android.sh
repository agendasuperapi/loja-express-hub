#!/bin/bash

# Script para configurar o projeto Android com Capacitor
# Execute: bash scripts/setup-android.sh

echo "🚀 Configurando projeto Android com Capacitor..."

# Verificar se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale o Node.js primeiro."
    exit 1
fi

# Verificar se o npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não está instalado. Por favor, instale o npm primeiro."
    exit 1
fi

# Instalar dependências do projeto
echo "📦 Instalando dependências do projeto..."
npm install

# Instalar Capacitor
echo "📱 Instalando Capacitor..."
npm install @capacitor/core @capacitor/cli @capacitor/android

# Verificar se capacitor.config.ts existe
if [ ! -f "capacitor.config.ts" ]; then
    echo "⚙️  Inicializando Capacitor..."
    npx cap init
else
    echo "✅ capacitor.config.ts já existe"
fi

# Adicionar plataforma Android
echo "🤖 Adicionando plataforma Android..."
npx cap add android

# Sincronizar
echo "🔄 Sincronizando com Android..."
npx cap sync

# Verificar se o build web existe
if [ ! -d "dist" ]; then
    echo "🏗️  Fazendo build web primeiro..."
    npm run build
fi

echo "✅ Configuração concluída!"
echo ""
echo "📝 Próximos passos:"
echo "1. Configure a assinatura do APK (veja DEPLOY_SETUP.md)"
echo "2. Adicione os secrets no GitHub"
echo "3. Ative o build Android no workflow (.github/workflows/deploy.yml)"
echo ""
echo "Para testar localmente:"
echo "  npx cap open android"

