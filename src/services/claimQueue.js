const axios = require('axios');
const { randomUUID } = require('crypto');

class ClaimQueue {
  constructor(googleSheetsService) {
    this.googleSheetsService = googleSheetsService;
    this.processingInterval = parseInt(process.env.PROCESSING_INTERVAL) || 15000; // 15 Sekunden
    this.transferApiUrl = process.env.TRANSFER_API_URL || 'https://token-transfer-claim.vercel.app/transfer';
    this.isProcessing = false;
    this.intervalId = null;
    this.stats = {
      totalProcessed: 0,
      totalSuccess: 0,
      totalErrors: 0,
      lastProcessedAt: null
    };
  }

  async start() {
    if (this.intervalId) {
      console.log('⚠️ Queue läuft bereits');
      return;
    }

    console.log(`🚀 Starte Queue Verarbeitung alle ${this.processingInterval}ms`);
    
    // Sofort einmal verarbeiten
    this.processQueue();
    
    // Dann alle X Sekunden
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, this.processingInterval);
  }

  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🛑 Queue Verarbeitung gestoppt');
    }
  }

  async addClaim(claimData) {
    try {
      const claimId = randomUUID();
      const claim = {
        id: claimId,
        ...claimData,
        timestamp: claimData.timestamp || new Date().toISOString(),
        status: 'pending'
      };

      await this.googleSheetsService.addClaim(claim);
      console.log(`✅ Claim ${claimId} zur Queue hinzugefügt`);
      
      return claimId;
    } catch (error) {
      console.error('❌ Fehler beim Hinzufügen des Claims:', error);
      throw error;
    }
  }

  async processQueue() {
    if (this.isProcessing) {
      console.log('⏳ Verarbeitung läuft bereits, überspringe...');
      return;
    }

    this.isProcessing = true;
    
    try {
      console.log('🔄 Starte Queue Verarbeitung...');
      
      // Hole alle pending Claims
      const pendingClaims = await this.googleSheetsService.getPendingClaims();
      
      if (pendingClaims.length === 0) {
        console.log('📭 Keine pending Claims gefunden');
        return;
      }

      console.log(`📋 ${pendingClaims.length} pending Claims gefunden`);

      // Verarbeite den ersten Claim in der Queue
      const claimToProcess = pendingClaims[0];
      await this.processClaim(claimToProcess);

    } catch (error) {
      console.error('❌ Fehler bei der Queue Verarbeitung:', error);
    } finally {
      this.isProcessing = false;
      this.stats.lastProcessedAt = new Date().toISOString();
    }
  }

  async processClaim(claim) {
    console.log(`🔄 Verarbeite Claim ${claim.id} - Amount: ${claim.amount}, Wallet: ${claim.wallet}`);
    
    try {
      // Setze Status auf "processing"
      await this.googleSheetsService.updateClaimStatus(claim.id, 'processing', new Date().toISOString());

      // Sende Request an Transfer API
      const response = await axios.post(this.transferApiUrl, {
        amount: claim.amount,
        walletAddress: claim.wallet  // API erwartet "walletAddress" nicht "wallet"
      }, {
        timeout: 30000, // 30 Sekunden Timeout
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Queue-Claims-Server/1.0.0'
        }
      });

      // Erfolgreiche Verarbeitung
      console.log(`✅ Claim ${claim.id} erfolgreich verarbeitet:`, response.status);
      
      await this.googleSheetsService.updateClaimStatus(
        claim.id, 
        'completed', 
        new Date().toISOString(),
        null
      );

      this.stats.totalProcessed++;
      this.stats.totalSuccess++;

    } catch (error) {
      // Fehler bei der Verarbeitung
      console.error(`❌ Fehler beim Verarbeiten von Claim ${claim.id}:`, error.message);
      
      let errorMessage = error.message;
      if (error.response) {
        errorMessage = `API Error ${error.response.status}: ${error.response.data?.message || error.message}`;
      }

      await this.googleSheetsService.updateClaimStatus(
        claim.id, 
        'failed', 
        new Date().toISOString(),
        errorMessage
      );

      this.stats.totalProcessed++;
      this.stats.totalErrors++;
    }
  }

  async getClaims(options = {}) {
    try {
      const allClaims = await this.googleSheetsService.getAllClaims();
      
      let filteredClaims = allClaims;
      
      // Filter nach Status
      if (options.status) {
        filteredClaims = filteredClaims.filter(claim => claim.status === options.status);
      }

      // Sortiere nach Timestamp (neueste zuerst)
      filteredClaims.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Pagination
      const offset = options.offset || 0;
      const limit = options.limit || 50;
      
      return filteredClaims.slice(offset, offset + limit);
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Claims:', error);
      throw error;
    }
  }

  async getClaimById(claimId) {
    try {
      const allClaims = await this.googleSheetsService.getAllClaims();
      return allClaims.find(claim => claim.id === claimId) || null;
    } catch (error) {
      console.error(`❌ Fehler beim Abrufen von Claim ${claimId}:`, error);
      throw error;
    }
  }

  async getStats() {
    try {
      const allClaims = await this.googleSheetsService.getAllClaims();
      
      const statusCounts = allClaims.reduce((acc, claim) => {
        acc[claim.status] = (acc[claim.status] || 0) + 1;
        return acc;
      }, {});

      return {
        ...this.stats,
        queueStatus: {
          isProcessing: this.isProcessing,
          intervalMs: this.processingInterval
        },
        claimCounts: {
          total: allClaims.length,
          ...statusCounts
        }
      };
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Statistiken:', error);
      throw error;
    }
  }

  async getStatus() {
    return {
      isRunning: this.intervalId !== null,
      isProcessing: this.isProcessing,
      intervalMs: this.processingInterval,
      stats: this.stats
    };
  }
}

module.exports = ClaimQueue;
