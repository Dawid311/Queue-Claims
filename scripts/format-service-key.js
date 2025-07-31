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
    
    // Validate required fields
    const requiredFields = ['type', 'project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!keyObject[field]) {
        console.error(`❌ Fehlendes erforderliches Feld: ${field}`);
        process.exit(1);
      }
    }
    
    // Konvertiere zu kompakter JSON-String (ohne Whitespace)
    const compactJson = JSON.stringify(keyObject);
    
    console.log('\n🔑 Formatierter Service Account Key für Railway:\n');
    console.log('=' * 80);
    console.log('KOPIEREN SIE DIESEN KOMPLETTEN STRING FÜR GOOGLE_SERVICE_ACCOUNT_KEY:');
    console.log('=' * 80);
    console.log(compactJson);
    console.log('=' * 80);
    
    console.log('\n✅ Service Account Details:');
    console.log(`   📧 Email: ${keyObject.client_email}`);
    console.log(`   🏗️  Projekt: ${keyObject.project_id}`);
    console.log(`   🔑 Key ID: ${keyObject.private_key_id}`);
    
    console.log('\n📋 Railway Setup-Anweisungen:');
    console.log('1. Gehen Sie zu Railway → Ihr Projekt → Settings → Variables');
    console.log('2. Erstellen Sie eine neue Variable:');
    console.log('   Name: GOOGLE_SERVICE_ACCOUNT_KEY');
    console.log('   Wert: [Den obigen JSON-String einfügen]');
    console.log('3. Stellen Sie sicher, dass KEINE zusätzlichen Leerzeichen oder Zeilenumbrüche hinzugefügt werden');
    console.log('4. Speichern und Deployment neu starten');
    
    console.log('\n⚠️  WICHTIG:');
    console.log('   - Der String muss GENAU so kopiert werden');
    console.log('   - KEINE manuellen Zeilenumbrüche hinzufügen');
    console.log('   - Der String beginnt mit { und endet mit }');
    
    // Write to file for easy copying
    const outputFile = 'railway-service-key.txt';
    fs.writeFileSync(outputFile, compactJson);
    console.log(`\n💾 Auch gespeichert in: ${outputFile}`);
    
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

console.log('🛠️  Railway Service Account Key Formatter');
console.log('==========================================\n');
console.log(`📁 Verarbeite: ${filePath}`);

formatServiceAccountKey(filePath);
