#!/usr/bin/env node

/**
 * Utility zur Formatierung der Google Service Account Key für Railway
 */

const fs = require('fs');
const path = require('path');

function formatServiceAccountKey(filePath) {
  try {
    // Lese die JSON-Datei
    const keyPath = path.resolve(filePath);
    
    if (!fs.existsSync(keyPath)) {
      console.error(`❌ Datei nicht gefunden: ${keyPath}`);
      process.exit(1);
    }

    const keyContent = fs.readFileSync(keyPath, 'utf8');
    
    // Parse JSON um sicherzustellen, dass es valid ist
    const keyObject = JSON.parse(keyContent);
    
    // Konvertiere zu kompakter JSON-String (ohne Whitespace)
    const compactJson = JSON.stringify(keyObject);
    
    console.log('\n🔑 Formatierter Service Account Key für Railway:\n');
    console.log('Kopieren Sie diesen Wert GENAU für GOOGLE_SERVICE_ACCOUNT_KEY:');
    console.log('=' * 60);
    console.log(compactJson);
    console.log('=' * 60);
    
    console.log('\n✅ Stellen Sie sicher, dass Sie:');
    console.log('1. Den KOMPLETTEN String kopieren');
    console.log('2. KEINE zusätzlichen Leerzeichen oder Zeilenumbrüche hinzufügen');
    console.log('3. In Railway als GOOGLE_SERVICE_ACCOUNT_KEY Variable einfügen');
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('❌ Invalid JSON in service account key file:', error.message);
    } else {
      console.error('❌ Fehler beim Verarbeiten der Datei:', error.message);
    }
    process.exit(1);
  }
}

// Command line usage
const filePath = process.argv[2] || './credentials/service-account-key.json';

console.log('🛠️  Railway Service Account Key Formatter\n');
console.log(`Verarbeite: ${filePath}`);

formatServiceAccountKey(filePath);
