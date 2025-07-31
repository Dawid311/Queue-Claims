const express = require('express');
const router = express.Router();

// GET /api/health - Health check
router.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.version
  });
});

// GET /api/health/queue - Queue health check
router.get('/queue', async (req, res) => {
  try {
    const queueStatus = await req.claimQueue.getStatus();
    
    res.json({
      status: 'healthy',
      queue: queueStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/health/sheets - Google Sheets connection check
router.get('/sheets', async (req, res) => {
  try {
    const sheetsStatus = await req.googleSheetsService.testConnection();
    
    res.json({
      status: 'healthy',
      sheets: sheetsStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
