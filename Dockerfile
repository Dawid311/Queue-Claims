FROM node:18-alpine

# Arbeitsverzeichnis setzen
WORKDIR /app

# Package files kopieren
COPY package*.json ./

# Dependencies installieren
RUN npm ci --only=production

# Source code kopieren
COPY . .

# User für bessere Sicherheit erstellen
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

# Ownership ändern
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Port exponieren
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start command
CMD ["npm", "start"]
