// Webhook Secret Middleware für zusätzliche Sicherheit
// Überprüft ob der Request ein gültiges Webhook Secret enthält

const crypto = require('crypto');

class WebhookSecurityMiddleware {
  constructor(secret) {
    this.secret = secret;
    this.isEnabled = !!secret; // Nur aktivieren wenn Secret gesetzt ist
  }

  // Middleware für Express.js
  middleware() {
    return (req, res, next) => {
      // Webhook Security ist optional - wenn kein Secret gesetzt, überspringe
      if (!this.isEnabled) {
        console.log('🔓 Webhook Secret nicht gesetzt - Security übersprungen');
        return next();
      }

      // Prüfe verschiedene Header-Varianten
      const providedSecret = req.headers['x-webhook-secret'] || 
                           req.headers['authorization']?.replace('Bearer ', '') ||
                           req.headers['x-api-key'] ||
                           req.body?.webhook_secret ||
                           req.query?.webhook_secret;

      if (!providedSecret) {
        console.log('❌ Webhook Request ohne Secret abgelehnt');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Webhook Secret erforderlich'
        });
      }

      // Sichere String-Vergleichung um Timing-Attacken zu vermeiden
      const expectedBuffer = Buffer.from(this.secret, 'utf8');
      const providedBuffer = Buffer.from(providedSecret, 'utf8');

      if (expectedBuffer.length !== providedBuffer.length || 
          !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
        console.log('❌ Webhook Request mit ungültigem Secret abgelehnt');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized', 
          message: 'Ungültiges Webhook Secret'
        });
      }

      console.log('✅ Webhook Secret erfolgreich validiert');
      next();
    };
  }

  // GitHub-Style Signature Validation (optional)
  validateGitHubSignature(payload, signature) {
    if (!this.isEnabled || !signature) return false;
    
    const computedSignature = 'sha256=' + crypto
      .createHmac('sha256', this.secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(computedSignature, 'utf8')
    );
  }

  // JWT-Style Token Generation (optional)
  generateToken(payload = {}) {
    if (!this.isEnabled) return null;
    
    const header = { alg: 'HS256', typ: 'JWT' };
    const data = { ...payload, iat: Math.floor(Date.now() / 1000) };
    
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(data)).toString('base64url');
    
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64url');
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  // Status-Informationen
  getStatus() {
    return {
      webhookSecurityEnabled: this.isEnabled,
      secretConfigured: !!this.secret,
      supportedHeaders: [
        'x-webhook-secret',
        'authorization (Bearer token)',
        'x-api-key'
      ],
      supportedMethods: [
        'Header-basiert',
        'Query-Parameter',
        'Body-Parameter',
        'GitHub-Signature',
        'JWT-Token'
      ]
    };
  }
}

module.exports = WebhookSecurityMiddleware;
