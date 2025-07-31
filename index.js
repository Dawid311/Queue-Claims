const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const ClaimQueue = require('./src/services/claimQueue');
const GoogleSheetsService = require('./src/services/googleSheetsService');
const claimRoutes = require('./src/routes/claims');
const healthRoutes = require('./src/routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Zu viele Requests von dieser IP, versuchen Sie es später erneut.'
});
app.use(limiter);

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize services
const googleSheetsService = new GoogleSheetsService();
const claimQueue = new ClaimQueue(googleSheetsService);

// Make services available to routes
app.use((req, res, next) => {
  req.claimQueue = claimQueue;
  req.googleSheetsService = googleSheetsService;
  next();
});

// Routes
app.use('/api/claims', claimRoutes);
app.use('/api/health', healthRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Queue Claims Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Interner Serverfehler',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Etwas ist schief gelaufen'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint nicht gefunden',
    path: req.originalUrl
  });
});

// Start server
async function startServer() {
  try {
    // Initialize Google Sheets service
    await googleSheetsService.initialize();
    console.log('✅ Google Sheets Service initialisiert');

    // Start the claim processing queue
    await claimQueue.start();
    console.log('✅ Claim Queue gestartet');

    // Start HTTP server
    app.listen(PORT, () => {
      console.log(`🚀 Server läuft auf Port ${PORT}`);
      console.log(`📊 Queue verarbeitet Claims alle ${process.env.PROCESSING_INTERVAL || 15000}ms`);
    });
  } catch (error) {
    console.error('❌ Fehler beim Starten des Servers:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM empfangen, fahre Server herunter...');
  await claimQueue.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT empfangen, fahre Server herunter...');
  await claimQueue.stop();
  process.exit(0);
});

startServer();
