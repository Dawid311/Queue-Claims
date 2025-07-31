#!/usr/bin/env node

/**
 * Test-Script für den Queue Claims Server
 */

const axios = require('axios');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Teste Queue Claims Server API...\n');

  try {
    // 1. Health Check
    console.log('1. Health Check...');
    const healthResponse = await axios.get(`${SERVER_URL}/api/health`);
    console.log('✅ Server ist gesund:', healthResponse.data.status);
    console.log();

    // 2. Claim hinzufügen
    console.log('2. Claim hinzufügen...');
    const claimData = {
      amount: 100.50,
      wallet: '0x1234567890abcdef1234567890abcdef12345678'
    };
    
    const addResponse = await axios.post(`${SERVER_URL}/api/claims`, claimData);
    console.log('✅ Claim hinzugefügt:', addResponse.data);
    const claimId = addResponse.data.claimId;
    console.log();

    // 3. Einzelnen Claim abrufen
    console.log('3. Claim abrufen...');
    const getResponse = await axios.get(`${SERVER_URL}/api/claims/${claimId}`);
    console.log('✅ Claim Details:', getResponse.data);
    console.log();

    // 4. Alle Claims abrufen
    console.log('4. Alle Claims abrufen...');
    const allClaimsResponse = await axios.get(`${SERVER_URL}/api/claims`);
    console.log('✅ Anzahl Claims:', allClaimsResponse.data.data.length);
    console.log();

    // 5. Statistiken abrufen
    console.log('5. Statistiken abrufen...');
    const statsResponse = await axios.get(`${SERVER_URL}/api/claims/stats`);
    console.log('✅ Statistiken:', statsResponse.data.data);
    console.log();

    // 6. Queue Status prüfen
    console.log('6. Queue Status prüfen...');
    const queueHealthResponse = await axios.get(`${SERVER_URL}/api/health/queue`);
    console.log('✅ Queue Status:', queueHealthResponse.data.queue);
    console.log();

    console.log('🎉 Alle Tests erfolgreich!');

  } catch (error) {
    console.error('❌ Test fehlgeschlagen:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Mehrere Test-Claims hinzufügen
async function addMultipleClaims() {
  console.log('🧪 Füge mehrere Test-Claims hinzu...\n');

  const testClaims = [
    { amount: 50.25, wallet: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    { amount: 75.00, wallet: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' },
    { amount: 125.75, wallet: '0xcccccccccccccccccccccccccccccccccccccccc' },
    { amount: 200.00, wallet: '0xdddddddddddddddddddddddddddddddddddddddd' },
    { amount: 10.50, wallet: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' }
  ];

  try {
    for (let i = 0; i < testClaims.length; i++) {
      const claim = testClaims[i];
      console.log(`Füge Claim ${i + 1}/${testClaims.length} hinzu...`);
      
      const response = await axios.post(`${SERVER_URL}/api/claims`, claim);
      console.log(`✅ Claim ${response.data.claimId} hinzugefügt`);
      
      // Kurz warten zwischen den Requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n🎉 Alle Test-Claims hinzugefügt!');
    console.log('⏰ Warten Sie 15 Sekunden und überprüfen Sie die Google-Tabelle...');

  } catch (error) {
    console.error('❌ Fehler beim Hinzufügen der Claims:', error.response?.data || error.message);
  }
}

// Command line arguments verarbeiten
const command = process.argv[2];

switch (command) {
  case 'test':
    testAPI();
    break;
  case 'add-multiple':
    addMultipleClaims();
    break;
  default:
    console.log(`
Verwendung: node test-api.js <command>

Commands:
  test           - Führt grundlegende API-Tests durch
  add-multiple   - Fügt mehrere Test-Claims hinzu

Beispiele:
  node test-api.js test
  node test-api.js add-multiple
  SERVER_URL=http://localhost:3001 node test-api.js test
    `);
}
