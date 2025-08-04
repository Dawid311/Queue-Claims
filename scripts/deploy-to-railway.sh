#!/bin/bash

# Railway Deployment Script für Queue Claims Server
# Automatisiert das Setup der Environment Variablen

echo "🚀 Railway Deployment Setup für Queue Claims Server"
echo "=================================================="

# Prüfe ob Railway CLI installiert ist
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI ist nicht installiert!"
    echo "💡 Installiere mit: npm install -g @railway/cli"
    exit 1
fi

# Prüfe ob Service Account Datei existiert
if [ ! -f "./credentials/service-account-key.json" ]; then
    echo "❌ Service Account Datei nicht gefunden!"
    echo "💡 Stelle sicher, dass ./credentials/service-account-key.json existiert"
    exit 1
fi

echo "✅ Railway CLI gefunden"
echo "✅ Service Account Datei gefunden"

# Login prüfen
echo "🔐 Prüfe Railway Login..."
if ! railway whoami &> /dev/null; then
    echo "❌ Nicht bei Railway eingeloggt!"
    echo "💡 Führe 'railway login' aus"
    exit 1
fi

echo "✅ Bei Railway eingeloggt"

# Service Account Variablen extrahieren
echo "📋 Extrahiere Service Account Variablen..."
node scripts/extract-service-variables.js ./credentials/service-account-key.json > temp_vars.txt

if [ $? -ne 0 ]; then
    echo "❌ Fehler beim Extrahieren der Variablen!"
    exit 1
fi

echo "✅ Variablen extrahiert"

# Basis Environment Variablen setzen
echo "⚙️  Setze Environment Variablen..."

railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set SPREADSHEET_ID="DEINE_SPREADSHEET_ID_HIER"
railway variables set WEBHOOK_SECRET="$(openssl rand -hex 32)"  # Generiere sicheres Webhook Secret

# Google Service Account Variablen aus extrahierter Datei setzen
while IFS= read -r line; do
    if [[ $line == railway* ]]; then
        # Führe Railway Kommando aus
        eval $line
        echo "  ✓ $line"
    fi
done < temp_vars.txt

# Aufräumen
rm temp_vars.txt

echo ""
echo "🎉 Environment Variablen erfolgreich gesetzt!"
echo ""
echo "📝 Nächste Schritte:"
echo "1. Gehe zu deinem Railway Dashboard"
echo "2. Prüfe die Environment Variablen"
echo "3. Setze SPREADSHEET_ID auf deine echte Spreadsheet ID"
echo "4. Deploye mit: railway up"
echo ""
echo "🔗 Railway Dashboard: https://railway.app/dashboard"
echo ""
echo "⚠️  WICHTIG: Vergiss nicht SPREADSHEET_ID zu setzen!"
echo "   railway variables set SPREADSHEET_ID=\"1ABcd2EFgh3IJkl4MNop5QRst6UVwx7YZab8CDef9GHi\""
