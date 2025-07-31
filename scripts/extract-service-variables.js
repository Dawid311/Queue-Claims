#!/usr/bin/env node

/**
 * Utility zur Extraktion einzelner Google Service Account Felder für Railway
 */

const fs = require('fs');
const path = require('path');

function extractServiceAccountFields(filePath) {
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
    
    console.log('\n🔧 Google Service Account Felder für Railway:\n');
    console.log('=' * 80);
    console.log('KOPIEREN SIE DIESE VARIABLEN EINZELN IN RAILWAY:');
    console.log('=' * 80);
    
    console.log('\n📋 Environment Variablen:');
    console.log(`\nGOOGLE_SERVICE_ACCOUNT_TYPE\n${keyObject.type}`);
    console.log(`\nGOOGLE_SERVICE_ACCOUNT_PROJECT_ID\n${keyObject.project_id}`);
    console.log(`\nGOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID\n${keyObject.private_key_id}`);
    console.log(`\nGOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY\n${keyObject.private_key}`);
    console.log(`\nGOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL\n${keyObject.client_email}`);
    console.log(`\nGOOGLE_SERVICE_ACCOUNT_CLIENT_ID\n${keyObject.client_id}`);
    
    // Optional fields with defaults
    if (keyObject.auth_uri) {
      console.log(`\nGOOGLE_SERVICE_ACCOUNT_AUTH_URI\n${keyObject.auth_uri}`);
    }
    if (keyObject.token_uri) {
      console.log(`\nGOOGLE_SERVICE_ACCOUNT_TOKEN_URI\n${keyObject.token_uri}`);
    }
    if (keyObject.auth_provider_x509_cert_url) {
      console.log(`\nGOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_CERT_URL\n${keyObject.auth_provider_x509_cert_url}`);
    }
    if (keyObject.client_x509_cert_url) {
      console.log(`\nGOOGLE_SERVICE_ACCOUNT_CLIENT_CERT_URL\n${keyObject.client_x509_cert_url}`);
    }
    if (keyObject.universe_domain) {
      console.log(`\nGOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN\n${keyObject.universe_domain}`);
    }
    
    console.log('\n=' * 80);
    
    console.log('\n✅ Service Account Details:');
    console.log(`   📧 Email: ${keyObject.client_email}`);
    console.log(`   🏗️  Projekt: ${keyObject.project_id}`);
    console.log(`   🔑 Key ID: ${keyObject.private_key_id}`);
    
    console.log('\n📋 Railway Setup-Anweisungen:');
    console.log('1. Gehen Sie zu Railway → Ihr Projekt → Settings → Variables');
    console.log('2. Erstellen Sie für JEDE Variable oben einen separaten Eintrag:');
    console.log('   - Klicken Sie "Add Variable"');
    console.log('   - Geben Sie den Namen ein (z.B. GOOGLE_SERVICE_ACCOUNT_TYPE)');
    console.log('   - Kopieren Sie den entsprechenden Wert');
    console.log('   - Wiederholen Sie das für alle Variablen');
    console.log('3. Speichern und Deployment neu starten');
    
    console.log('\n⚠️  WICHTIG:');
    console.log('   - Kopieren Sie jeden Wert GENAU (inklusive \\n in private_key)');
    console.log('   - Alle ERFORDERLICHEN Felder müssen gesetzt werden');
    console.log('   - Optionale Felder können weggelassen werden (haben Defaults)');
    
    // Write to file for easy copying
    const outputFile = 'railway-service-account-variables.txt';
    let output = 'Railway Environment Variables:\n\n';
    
    output += `GOOGLE_SERVICE_ACCOUNT_TYPE=${keyObject.type}\n`;
    output += `GOOGLE_SERVICE_ACCOUNT_PROJECT_ID=${keyObject.project_id}\n`;
    output += `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_ID=${keyObject.private_key_id}\n`;
    output += `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=${keyObject.private_key}\n`;
    output += `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL=${keyObject.client_email}\n`;
    output += `GOOGLE_SERVICE_ACCOUNT_CLIENT_ID=${keyObject.client_id}\n`;
    
    if (keyObject.auth_uri) output += `GOOGLE_SERVICE_ACCOUNT_AUTH_URI=${keyObject.auth_uri}\n`;
    if (keyObject.token_uri) output += `GOOGLE_SERVICE_ACCOUNT_TOKEN_URI=${keyObject.token_uri}\n`;
    if (keyObject.auth_provider_x509_cert_url) output += `GOOGLE_SERVICE_ACCOUNT_AUTH_PROVIDER_CERT_URL=${keyObject.auth_provider_x509_cert_url}\n`;
    if (keyObject.client_x509_cert_url) output += `GOOGLE_SERVICE_ACCOUNT_CLIENT_CERT_URL=${keyObject.client_x509_cert_url}\n`;
    if (keyObject.universe_domain) output += `GOOGLE_SERVICE_ACCOUNT_UNIVERSE_DOMAIN=${keyObject.universe_domain}\n`;
    
    fs.writeFileSync(outputFile, output);
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

console.log('🛠️  Railway Service Account Variables Extractor');
console.log('===============================================\n');
console.log(`📁 Verarbeite: ${filePath}`);

extractServiceAccountFields(filePath);
