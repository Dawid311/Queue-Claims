# Queue Claims Server

Ein Node.js Server der HTTP-Requests mit `amount` und `wallet` empfängt, diese in einer Google-Tabelle speichert und sequenziell im 15-Sekunden-Intervall an die Token-Transfer-API weiterleitet.

## Features

- 🚀 **Express.js HTTP Server** - Empfängt POST-Requests mit amount und wallet
- 📊 **Google Sheets Integration** - Speichert alle Claims in einer Google-Tabelle
- ⏰ **Queue System** - Verarbeitet Claims sequenziell im 15-Sekunden-Intervall
- 🔄 **Status Tracking** - Verfolgt den Status jedes Claims (pending, processing, completed, failed)
- 🛡️ **Rate Limiting** - Schutz vor zu vielen Requests
- 🔍 **Health Checks** - Überwachung der System-Komponenten
- 📈 **Statistiken** - Detaillierte Queue- und Verarbeitungsstatistiken

## Installation

1. **Repository klonen:**
   ```bash
   git clone <repository-url>
   cd Queue-Claims
   ```

2. **Dependencies installieren:**
   ```bash
   npm install
   ```

3. **Environment-Variablen konfigurieren:**
   ```bash
   cp .env.example .env
   ```
   Bearbeiten Sie die `.env` Datei mit Ihren Werten.

4. **Google Service Account konfigurieren:**
   - Erstellen Sie ein Google Cloud Project
   - Aktivieren Sie die Google Sheets API
   - Erstellen Sie einen Service Account
   - Laden Sie die JSON-Credentials herunter
   - Speichern Sie diese als `credentials/service-account-key.json`

5. **Google Sheet erstellen:**
   - Erstellen Sie eine neue Google Tabelle
   - Teilen Sie diese mit der Service Account E-Mail-Adresse
   - Kopieren Sie die Sheet-ID aus der URL in die `.env` Datei

## Konfiguration

### Environment-Variablen

```bash
# Server
NODE_ENV=development
PORT=3000

# Google Sheets
GOOGLE_SHEET_ID=your_google_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./credentials/service-account-key.json

# API
TRANSFER_API_URL=https://token-transfer-claim.vercel.app/transfer
PROCESSING_INTERVAL=15000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Verwendung

### Server starten

```bash
# Development
npm run dev

# Production
npm start
```

### API Endpoints

#### 1. Claim hinzufügen
```http
POST /api/claims
Content-Type: application/json

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
  "claimId": "uuid-v4",
  "data": {
    "amount": 100.50,
    "wallet": "0x1234567890abcdef1234567890abcdef12345678",
    "status": "pending"
  }
}
```

#### 2. Claims abrufen
```http
GET /api/claims?status=pending&limit=20&offset=0
```

#### 3. Einzelnen Claim abrufen
```http
GET /api/claims/{claimId}
```

#### 4. Statistiken abrufen
```http
GET /api/claims/stats
```

#### 5. Health Checks
```http
GET /api/health
GET /api/health/queue
GET /api/health/sheets
```

## Google Sheets Setup

Das System erstellt automatisch folgende Spalten in Ihrer Google-Tabelle:

| Spalte | Beschreibung |
|--------|--------------|
| ID | Eindeutige Claim-ID (UUID) |
| Amount | Transfer-Betrag |
| Wallet | Ziel-Wallet-Adresse |
| Timestamp | Zeitpunkt der Erstellung |
| Status | aktueller Status (pending, processing, completed, failed) |
| ProcessedAt | Zeitpunkt der Verarbeitung |
| ErrorMessage | Fehlermeldung falls vorhanden |

## Queue Verarbeitung

- **Intervall:** 15 Sekunden (konfigurierbar)
- **Reihenfolge:** FIFO (First In, First Out)
- **Verarbeitung:** Jeweils ein Claim pro Intervall
- **Status-Updates:** Automatische Aktualisierung in Google Sheets
- **Fehlerbehandlung:** Failed Claims werden markiert aber nicht wiederholt

## Monitoring

### Status-Codes

- `pending` - Claim wartet in der Queue
- `processing` - Claim wird gerade verarbeitet
- `completed` - Claim erfolgreich verarbeitet
- `failed` - Claim-Verarbeitung fehlgeschlagen

### Logs

Der Server protokolliert alle wichtigen Ereignisse:
```bash
✅ Google Sheets Service initialisiert
✅ Claim Queue gestartet
🚀 Server läuft auf Port 3000
📋 5 pending Claims gefunden
🔄 Verarbeite Claim abc-123 - Amount: 100, Wallet: 0x...
✅ Claim abc-123 erfolgreich verarbeitet
```

## Fehlerbehandlung

- **Validation:** Überprüfung von amount und wallet
- **Rate Limiting:** Schutz vor Spam-Requests
- **API Timeouts:** 30 Sekunden Timeout für Transfer-API
- **Graceful Shutdown:** Sauberes Herunterfahren bei SIGTERM/SIGINT
- **Error Recovery:** Detaillierte Fehlermeldungen in Google Sheets

## Development

```bash
# Dependencies installieren
npm install

# Development Server mit Auto-Reload
npm run dev

# Tests ausführen
npm test
```

## Deployment

### Railway (Empfohlen)

Railway ist perfekt für dieses Projekt, da es persistente Server unterstützt.

#### 1. Railway Setup
1. Gehen Sie zu [railway.app](https://railway.app) und melden Sie sich an
2. Klicken Sie auf "New Project" → "Deploy from GitHub repo"
3. Wählen Sie Ihr `Queue-Claims` Repository
4. Railway erkennt automatisch die Node.js-Anwendung

#### 2. Environment-Variablen setzen
In Railway → Ihr Projekt → Settings → Variables:

```bash
NODE_ENV=production
GOOGLE_SHEET_ID=your_actual_sheet_id_here
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
TRANSFER_API_URL=https://token-transfer-claim.vercel.app/transfer
PROCESSING_INTERVAL=15000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**Wichtig:** Für `GOOGLE_SERVICE_ACCOUNT_KEY` kopieren Sie den kompletten Inhalt Ihrer `service-account-key.json` als eine Zeile.

#### 3. Domain konfigurieren
- Railway generiert automatisch eine URL (z.B. `your-app.railway.app`)
- Optional: Custom Domain in Settings → Domains

### Alternative Deployment-Optionen

#### Render.com
- Ähnlich wie Railway
- Kostenloser Tier verfügbar
- Automatische SSL-Zertifikate

#### DigitalOcean App Platform
- $5/Monat für Basic Droplet
- Vollständige Container-Unterstützung

#### Heroku
- Kostenloser Tier verfügbar (mit Einschränkungen)
- Ähnliche Konfiguration wie Railway

#### VPS (Ubuntu/Debian)
```bash
# Mit PM2
npm install -g pm2
pm2 start index.js --name "queue-claims"
pm2 startup
pm2 save
```

### Docker Deployment
```bash
# Local build und run
docker build -t queue-claims .
docker run -d -p 3000:3000 --env-file .env queue-claims

# Mit Docker Compose
docker-compose up -d
```

## Sicherheit

- **Rate Limiting:** Begrenzt Requests pro IP
- **Input Validation:** Validierung aller Eingaben
- **CORS:** Konfigurierbare CORS-Richtlinien
- **Helmet:** Security Headers
- **Environment Variables:** Sensible Daten in .env

## Troubleshooting

### Häufige Probleme

1. **Google Sheets Verbindung fehlgeschlagen:**
   - Service Account Credentials überprüfen
   - Sheet-Berechtigung für Service Account prüfen
   - Sheet-ID in .env korrekt setzen

2. **Transfer API Fehler:**
   - API-URL überprüfen
   - Netzwerk-Verbindung testen
   - API-Rate-Limits beachten

3. **Queue verarbeitet nicht:**
   - Server-Logs prüfen
   - Health-Check Endpoints verwenden
   - Processing-Interval konfigurieren

## Support

Bei Problemen oder Fragen:
1. Server-Logs überprüfen
2. Health-Check-Endpoints testen
3. Google Sheets manuell prüfen
4. Network-Connectivity zu Transfer-API testen