const { google } = require('googleapis');
const path = require('path');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.SPREADSHEET_ID || process.env.GOOGLE_SHEET_ID;
    this.sheetName = 'Tokentransfer'; // Name des Arbeitsblatts
  }

  async initialize() {
    try {
      let auth;
      
      // Check if we have individual service account fields (Railway/Heroku preferred method)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_TYPE && 
          process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID && 
          process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY && 
          process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL) {
        
        console.log('🔑 Verwende Service Account aus einzelnen Environment Variablen');
        console.log(`📧 Client Email: ${process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL}`);
        console.log(`🏗️  Projekt: ${process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID}`);
        
        try {
          const credentials = {
            type: process.env.GOOGLE_SERVICE_ACCOUNT_TYPE,
            project_id: process.env.GOOGLE_SERVICE_ACCOUNT_PROJECT_ID,
            private_key_id: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID,
            private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL,
            client_id: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_ID,
            auth_uri: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
            token_uri: process.env.GOOGLE_SERVICE_ACCOUNT_TOKEN_URI || "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_CERT_URL,
            universe_domain: process.env.GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN || "googleapis.com"
          };
          
          console.log('✅ Service Account Credentials zusammengestellt');
          
          auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
          });
          
        } catch (credentialError) {
          console.error('❌ Fehler beim Zusammenstellen der Service Account Credentials:', credentialError.message);
          throw new Error(`Service Account Credential Error: ${credentialError.message}`);
        }
        
      } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        // Fallback: JSON environment variable
        console.log('🔑 Verwende Service Account aus JSON Environment Variable');
        console.log('📋 Environment Variable gefunden, Länge:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY.length);
        
        try {
          // Clean up the environment variable (remove extra whitespace and newlines)
          let cleanKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY.trim();
          
          // Check if it starts with { and ends with }
          if (!cleanKey.startsWith('{') || !cleanKey.endsWith('}')) {
            throw new Error('Service Account Key muss ein JSON-Objekt sein (beginnt mit { und endet mit })');
          }
          
          // Replace line breaks that might have been introduced by Railway
          cleanKey = cleanKey.replace(/\r?\n/g, '\\n');
          
          console.log('🔍 Versuche JSON zu parsen...');
          const credentials = JSON.parse(cleanKey);
          
          // Validate required fields
          if (!credentials.type || !credentials.project_id || !credentials.private_key || !credentials.client_email) {
            throw new Error('Service Account Key fehlen erforderliche Felder (type, project_id, private_key, client_email)');
          }
          
          console.log('✅ Service Account erfolgreich geparst für Projekt:', credentials.project_id);
          
          auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
          });
          
        } catch (parseError) {
          console.error('❌ Fehler beim Parsen der Service Account Credentials:', parseError.message);
          console.error('📄 Environment Variable Inhalt (erste 100 Zeichen):', process.env.GOOGLE_SERVICE_ACCOUNT_KEY.substring(0, 100));
          throw new Error(`Invalid GOOGLE_SERVICE_ACCOUNT_KEY format: ${parseError.message}`);
        }
      } else {
        // Use local file (for development)
        console.log('🔑 Verwende Service Account aus lokaler Datei');
        const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './credentials/service-account-key.json';
        const absoluteKeyPath = path.resolve(keyPath);
        
        auth = new google.auth.GoogleAuth({
          keyFile: absoluteKeyPath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
      }

      // Google Sheets API Client erstellen
      this.sheets = google.sheets({ version: 'v4', auth });

      // Testen ob die Verbindung funktioniert
      await this.testConnection();
      
      // Sicherstellen, dass das Sheet die richtigen Header hat
      await this.ensureHeaders();
      
      console.log('✅ Google Sheets Service erfolgreich initialisiert');
    } catch (error) {
      console.error('❌ Fehler beim Initialisieren von Google Sheets:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId
      });
      
      return {
        connected: true,
        spreadsheetTitle: response.data.properties.title,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Google Sheets Verbindungsfehler: ${error.message}`);
    }
  }

  async ensureHeaders() {
    try {
      // Prüfen ob Headers existieren
      const range = `${this.sheetName}!A1:G1`;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range
      });

      const expectedHeaders = ['ID', 'Amount', 'Wallet', 'Timestamp', 'Status', 'ProcessedAt', 'ErrorMessage'];
      
      if (!response.data.values || response.data.values.length === 0) {
        // Headers hinzufügen wenn sie nicht existieren
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: range,
          valueInputOption: 'RAW',
          resource: {
            values: [expectedHeaders]
          }
        });
        console.log('✅ Headers zu Google Sheet hinzugefügt');
      }
    } catch (error) {
      console.error('❌ Fehler beim Erstellen der Headers:', error);
      throw error;
    }
  }

  async addClaim(claim) {
    try {
      const values = [
        claim.id,
        claim.amount,
        claim.wallet,
        claim.timestamp,
        claim.status,
        claim.processedAt || '',
        claim.errorMessage || ''
      ];

      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${this.sheetName}!A:G`,
        valueInputOption: 'RAW',
        resource: {
          values: [values]
        }
      });

      console.log(`✅ Claim ${claim.id} zu Google Sheet hinzugefügt`);
      return true;
    } catch (error) {
      console.error(`❌ Fehler beim Hinzufügen von Claim ${claim.id}:`, error);
      throw error;
    }
  }

  async updateClaimStatus(claimId, status, processedAt = null, errorMessage = null) {
    try {
      // Finde die Zeile mit der Claim ID
      const range = `${this.sheetName}!A:G`;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range
      });

      if (!response.data.values) {
        throw new Error('Keine Daten im Sheet gefunden');
      }

      const rows = response.data.values;
      let rowIndex = -1;

      // Finde die Zeile mit der entsprechenden ID
      for (let i = 1; i < rows.length; i++) { // Starte bei 1 um Header zu überspringen
        if (rows[i][0] === claimId) {
          rowIndex = i + 1; // +1 weil Google Sheets 1-indexiert ist
          break;
        }
      }

      if (rowIndex === -1) {
        throw new Error(`Claim mit ID ${claimId} nicht gefunden`);
      }

      // Update die entsprechenden Spalten
      const updates = [];
      
      // Status Update (Spalte E)
      updates.push({
        range: `${this.sheetName}!E${rowIndex}`,
        values: [[status]]
      });

      // ProcessedAt Update (Spalte F)
      if (processedAt) {
        updates.push({
          range: `${this.sheetName}!F${rowIndex}`,
          values: [[processedAt]]
        });
      }

      // ErrorMessage Update (Spalte G)
      if (errorMessage) {
        updates.push({
          range: `${this.sheetName}!G${rowIndex}`,
          values: [[errorMessage]]
        });
      }

      // Batch Update durchführen
      await this.sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        resource: {
          valueInputOption: 'RAW',
          data: updates
        }
      });

      console.log(`✅ Claim ${claimId} Status zu ${status} aktualisiert`);
      return true;
    } catch (error) {
      console.error(`❌ Fehler beim Aktualisieren von Claim ${claimId}:`, error);
      throw error;
    }
  }

  async getAllClaims() {
    try {
      const range = `${this.sheetName}!A:G`;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: range
      });

      if (!response.data.values || response.data.values.length <= 1) {
        return [];
      }

      const headers = response.data.values[0];
      const rows = response.data.values.slice(1);

      return rows.map(row => ({
        id: row[0] || '',
        amount: parseFloat(row[1]) || 0,
        wallet: row[2] || '',
        timestamp: row[3] || '',
        status: row[4] || 'pending',
        processedAt: row[5] || null,
        errorMessage: row[6] || null
      }));
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Claims:', error);
      throw error;
    }
  }

  async getPendingClaims() {
    try {
      const allClaims = await this.getAllClaims();
      return allClaims.filter(claim => claim.status === 'pending');
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der pending Claims:', error);
      throw error;
    }
  }
}

module.exports = GoogleSheetsService;
