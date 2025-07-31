# Setup-Anleitung für Queue Claims Server

## Übersicht

Dieser Server empfängt HTTP-Requests mit `amount` und `wallet`, speichert diese in Google Sheets und verarbeitet sie sequenziell im 15-Sekunden-Intervall an die Transfer-API.

## Schritt-für-Schritt Setup

### 1. Google Cloud Setup

#### 1.1 Google Cloud Project erstellen
1. Besuchen Sie [Google Cloud Console](https://console.cloud.google.com/)
2. Erstellen Sie ein neues Projekt oder wählen Sie ein bestehendes aus
3. Notieren Sie sich die **Project ID**

#### 1.2 Google Sheets API aktivieren
1. Gehen Sie zu **APIs & Services** → **Library**
2. Suchen Sie nach "Google Sheets API"
3. Klicken Sie auf **Enable**

#### 1.3 Service Account erstellen
1. Gehen Sie zu **APIs & Services** → **Credentials**
2. Klicken Sie auf **Create Credentials** → **Service Account**
3. Geben Sie einen Namen ein (z.B. "queue-claims-service")
4. Klicken Sie auf **Create and Continue**
5. Überspringen Sie die Rollen-Zuweisung (optional)
6. Klicken Sie auf **Done**

#### 1.4 Service Account Key herunterladen
1. Klicken Sie auf den erstellten Service Account
2. Gehen Sie zum **Keys** Tab
3. Klicken Sie auf **Add Key** → **Create new key**
4. Wählen Sie **JSON** Format
5. Der Key wird automatisch heruntergeladen
6. Speichern Sie die Datei als `credentials/service-account-key.json`

### 2. Google Sheets Setup

#### 2.1 Neue Google Tabelle erstellen
1. Gehen Sie zu [Google Sheets](https://sheets.google.com/)
2. Erstellen Sie eine neue Tabelle
3. Benennen Sie das erste Arbeitsblatt "Claims"
4. Kopieren Sie die **Sheet ID** aus der URL (zwischen `/d/` und `/edit`)

#### 2.2 Tabelle mit Service Account teilen
1. Öffnen Sie Ihre Google Tabelle
2. Klicken Sie auf **Share** (Teilen)
3. Fügen Sie die Service Account E-Mail hinzu (aus der JSON-Datei: `client_email`)
4. Geben Sie **Editor** Berechtigung
5. Klicken Sie auf **Send**

### 3. Server Konfiguration

#### 3.1 Environment-Datei erstellen
```bash
cp .env.example .env
```

#### 3.2 .env Datei bearbeiten
```bash
# Server
NODE_ENV=development
PORT=3000

# Google Sheets - IHRE WERTE HIER EINTRAGEN
GOOGLE_SHEET_ID=1abcdef123456789_YOUR_SHEET_ID_HERE
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials/service-account-key.json

# API
TRANSFER_API_URL=https://token-transfer-claim.vercel.app/transfer
PROCESSING_INTERVAL=15000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

#### 3.3 Service Account Key platzieren
```bash
# Stellen Sie sicher, dass der heruntergeladene Key hier liegt:
credentials/service-account-key.json
```

### 4. Server starten

#### 4.1 Dependencies installiert (bereits erledigt)
```bash
npm install
```

#### 4.2 Server starten
```bash
# Development Mode (mit Auto-Reload)
npm run dev

# Production Mode
npm start
```

#### 4.3 Erfolgsmeldungen prüfen
Sie sollten folgende Meldungen sehen:
```
✅ Google Sheets Service initialisiert
✅ Claim Queue gestartet
🚀 Server läuft auf Port 3000
📊 Queue verarbeitet Claims alle 15000ms
```

### 5. API testen

#### 5.1 Health Check
```bash
curl http://localhost:3000/api/health
```

#### 5.2 Claim hinzufügen
```bash
curl -X POST http://localhost:3000/api/claims \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 100.50,
    "wallet": "0x1234567890abcdef1234567890abcdef12345678"
  }'
```

#### 5.3 Test-Script verwenden
```bash
# Grundlegende API-Tests
node test-api.js test

# Mehrere Test-Claims hinzufügen
node test-api.js add-multiple
```

### 6. Monitoring

#### 6.1 Google Sheets überprüfen
- Öffnen Sie Ihre Google Tabelle
- Claims sollten automatisch in folgenden Spalten erscheinen:
  - ID, Amount, Wallet, Timestamp, Status, ProcessedAt, ErrorMessage

#### 6.2 Server Logs überwachen
```bash
# Live Logs anzeigen
tail -f logs/server.log

# Oder bei npm run dev direkt in der Konsole
```

#### 6.3 Status-Endpoints
```bash
# Queue Status
curl http://localhost:3000/api/health/queue

# Google Sheets Status
curl http://localhost:3000/api/health/sheets

# Statistiken
curl http://localhost:3000/api/claims/stats
```

## Troubleshooting

### Problem: "Google Sheets Verbindungsfehler"
**Lösung:**
1. Service Account Key korrekt platziert?
2. Sheet ID in .env korrekt?
3. Service Account mit Sheet geteilt?
4. Google Sheets API aktiviert?

### Problem: "Claims werden nicht verarbeitet"
**Lösung:**
1. Transfer-API erreichbar? `curl https://token-transfer-claim.vercel.app/transfer`
2. Pending Claims in Google Sheet vorhanden?
3. Server Logs auf Fehler prüfen

### Problem: "Rate Limit exceeded"
**Lösung:**
1. RATE_LIMIT_MAX_REQUESTS in .env erhöhen
2. Oder RATE_LIMIT_WINDOW_MS verringern

## Production Deployment

### Mit PM2
```bash
npm install -g pm2
pm2 start index.js --name "queue-claims"
pm2 startup
pm2 save
```

### Mit Docker
```bash
# Dockerfile erstellen (siehe Beispiel unten)
docker build -t queue-claims .
docker run -d -p 3000:3000 --env-file .env queue-claims
```

### Systemd Service
```bash
# /etc/systemd/system/queue-claims.service erstellen
sudo systemctl enable queue-claims
sudo systemctl start queue-claims
```

## API Dokumentation

### POST /api/claims
Fügt einen neuen Claim zur Queue hinzu.

**Request:**
```json
{
  "amount": 100.50,
  "wallet": "0x1234567890abcdef1234567890abcdef12345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Claim erfolgreich zur Queue hinzugefügt",
  "claimId": "550e8400-e29b-41d4-a716-446655440000",
  "data": {
    "amount": 100.50,
    "wallet": "0x1234567890abcdef1234567890abcdef12345678",
    "status": "pending"
  }
}
```

### GET /api/claims
Ruft alle Claims ab (mit Pagination).

**Query Parameter:**
- `status`: Filter nach Status (pending, processing, completed, failed)
- `limit`: Anzahl Einträge (default: 50)
- `offset`: Offset für Pagination (default: 0)

### GET /api/claims/{id}
Ruft einen einzelnen Claim ab.

### GET /api/claims/stats
Zeigt Queue-Statistiken an.

### GET /api/health
Server Health Check.

### GET /api/health/queue
Queue Health Check.

### GET /api/health/sheets
Google Sheets Connection Check.

## Sicherheitshinweise

1. **Credentials schützen:** Niemals service-account-key.json in Git committen
2. **Rate Limiting:** Angemessene Limits setzen
3. **HTTPS verwenden:** In Production immer HTTPS
4. **Firewall:** Nur notwendige Ports öffnen
5. **Monitoring:** Logs regelmäßig überwachen

## Support

Bei Problemen:
1. Server-Logs prüfen
2. Google Sheets manuell kontrollieren
3. Health-Check Endpoints testen
4. Test-Script ausführen
