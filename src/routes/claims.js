const express = require('express');
const WebhookSecurityMiddleware = require('../middleware/webhookSecurity');
const router = express.Router();

// Webhook Security Middleware initialisieren
const webhookSecurity = new WebhookSecurityMiddleware(process.env.WEBHOOK_SECRET);

// POST /api/claims - Neuen Claim zur Queue hinzufügen (mit Webhook Security)
router.post('/', webhookSecurity.middleware(), async (req, res) => {
  try {
    const { amount, wallet } = req.body;

    // Validierung
    if (!amount || !wallet) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount und Wallet sind erforderlich',
        required: ['amount', 'wallet']
      });
    }

    // Weitere Validierung
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount muss eine positive Zahl sein'
      });
    }

    if (typeof wallet !== 'string' || wallet.trim().length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Wallet muss ein gültiger String sein'
      });
    }

    // Claim zur Queue hinzufügen
    const claimId = await req.claimQueue.addClaim({
      amount: parseFloat(amount),
      wallet: wallet.trim(),
      timestamp: new Date().toISOString(),
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Claim erfolgreich zur Queue hinzugefügt',
      claimId: claimId,
      data: {
        amount: parseFloat(amount),
        wallet: wallet.trim(),
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Fehler beim Hinzufügen des Claims:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Fehler beim Verarbeiten des Claims'
    });
  }
});

// GET /api/claims - Alle Claims abrufen
router.get('/', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    const claims = await req.claimQueue.getClaims({
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: claims,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Claims:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Fehler beim Abrufen der Claims'
    });
  }
});

// GET /api/claims/:id - Einzelnen Claim abrufen
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const claim = await req.claimQueue.getClaimById(id);
    
    if (!claim) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Claim nicht gefunden'
      });
    }

    res.json({
      success: true,
      data: claim
    });

  } catch (error) {
    console.error('Fehler beim Abrufen des Claims:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Fehler beim Abrufen des Claims'
    });
  }
});

// GET /api/claims/security - Security-Status anzeigen
router.get('/security', async (req, res) => {
  try {
    const securityStatus = webhookSecurity.getStatus();
    
    res.json({
      success: true,
      data: securityStatus
    });

  } catch (error) {
    console.error('Fehler beim Abrufen des Security-Status:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Fehler beim Abrufen des Security-Status'
    });
  }
});

// GET /api/claims/stats - Queue-Statistiken
router.get('/stats', async (req, res) => {
  try {
    const stats = await req.claimQueue.getStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Fehler beim Abrufen der Statistiken:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Fehler beim Abrufen der Statistiken'
    });
  }
});

module.exports = router;
