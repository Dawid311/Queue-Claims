const { google } = require('googleapis');
const path = require('path');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
    this.sheetName = 'Claims'; // Name des Arbeitsblatts
  }

  async initialize() {
    try {
      let auth;
      
      // Check if we have service account key as environment variable (for Railway/Heroku)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
        console.log('🔑 Verwende Service Account aus Environment Variable');
        try {
          const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
          auth = new google.auth.GoogleAuth({
            credentials: credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
          });
        } catch (parseError) {
          console.error('❌ Fehler beim Parsen der Service Account Credentials:', parseError.message);
          throw new Error('Invalid GOOGLE_SERVICE_ACCOUNT_KEY format. Must be valid JSON.');
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
