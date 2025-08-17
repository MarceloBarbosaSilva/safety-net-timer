#!/bin/bash

echo "🚀 Gerando APK para Safety Net Timer..."

# Build do projeto
echo "📦 Fazendo build do projeto..."
npm run build

# Verificar se o build foi bem sucedido
if [ ! -d "dist" ]; then
    echo "❌ Erro: Build falhou!"
    exit 1
fi

echo "✅ Build concluído!"

# Copiar arquivos para o projeto Cordova
echo "📁 Copiando arquivos para Cordova..."
cp -r dist/* safety-net-app/www/

echo "🔧 Configurando Cordova..."
cd safety-net-app

# Verificar se Android SDK está disponível
if command -v adb &> /dev/null; then
    echo "📱 Android SDK encontrado!"
    echo "🔨 Gerando APK..."
    cordova build android --release
    
    if [ -f "platforms/android/app/build/outputs/apk/release/app-release.apk" ]; then
        echo "✅ APK gerado com sucesso!"
        echo "📱 APK localizado em: platforms/android/app/build/outputs/apk/release/app-release.apk"
        echo "📋 Para instalar no celular:"
        echo "   1. Conecte o celular via USB"
        echo "   2. Ative a depuração USB no celular"
        echo "   3. Execute: adb install platforms/android/app/build/outputs/apk/release/app-release.apk"
    else
        echo "❌ Erro ao gerar APK"
    fi
else
    echo "⚠️  Android SDK não encontrado!"
    echo "📋 Para gerar o APK, você precisa:"
    echo "   1. Instalar Android Studio"
    echo "   2. Configurar ANDROID_HOME"
    echo "   3. Ou usar PWA Builder online"
    echo ""
    echo "🌐 Alternativa: Use PWA Builder"
    echo "   Acesse: https://www.pwabuilder.com/"
    echo "   Cole a URL: http://192.168.0.47:5173/"
    echo "   Clique em 'Build My PWA'"
    echo "   Baixe o APK gerado"
fi

cd ..
echo "🎉 Processo concluído!"
