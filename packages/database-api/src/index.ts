/**
 * Cartae Database API - Serveur Express principal
 *
 * API REST pour persistence PostgreSQL + pgvector
 *
 * Endpoints:
 * - POST /api/parse - Parse et stocke CartaeItem
 * - GET /api/search - Recherche full-text
 * - POST /api/semantic - Recherche vectorielle
 * - POST /api/hybrid - Recherche hybride
 *
 * @module index
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Routes
import { parseRouter } from './api/routes/parse';
import { searchRouter } from './api/routes/search';
import { semanticRouter } from './api/routes/semantic';
import { hybridRouter } from './api/routes/hybrid';
import { vaultRouter } from './api/routes/vault';
import connectionsRouter from './api/routes/connections';
import summariesRouter from './api/routes/summaries';

// Middlewares
import { errorHandler, notFoundHandler } from './api/middlewares/errorHandler';

// DB
import { testConnection } from './db/client';

// Vault & Secrets Management
import { getSecretsManager } from './vault/SecretsManager';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Crée et configure l'application Express
 */
async function createApp(): Promise<Application> {
  const app = express();

  // ========== Middlewares de sécurité ==========

  // Helmet - Sécurise les headers HTTP avec configuration renforcée
  app.use(
    helmet({
      // Content Security Policy - Bloque XSS et injections de script
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // unsafe-inline nécessaire pour certains frameworks
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      // HTTP Strict Transport Security - Force HTTPS (production uniquement)
      hsts: {
        maxAge: 31536000, // 1 an en secondes
        includeSubDomains: true,
        preload: true,
      },
      // X-Frame-Options - Empêche clickjacking
      frameguard: {
        action: 'deny',
      },
      // X-Content-Type-Options - Empêche MIME sniffing
      noSniff: true,
      // X-XSS-Protection - Protection XSS (legacy browsers)
      xssFilter: true,
      // Referrer-Policy - Contrôle les informations de referrer
      referrerPolicy: {
        policy: 'strict-origin-when-cross-origin',
      },
      // X-DNS-Prefetch-Control - Désactive DNS prefetching
      dnsPrefetchControl: {
        allow: false,
      },
      // X-Download-Options - Force download pour IE
      ieNoOpen: true,
      // X-Powered-By - Cache la techno utilisée (déjà fait par défaut)
      hidePoweredBy: true,
    })
  );

  // CORS - Configure les origines autorisées
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    })
  );

  // Rate limiting - Limite les requêtes par IP
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 100 req/min
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', limiter);

  // ========== Middlewares parsing ==========

  // JSON body parser (limite 10MB pour embeddings)
  app.use(express.json({ limit: '10mb' }));

  // URL-encoded parser
  app.use(express.urlencoded({ extended: true }));

  // Compression gzip/deflate des responses
  app.use(compression());

  // ========== Health check ==========

  app.get('/health', async (req, res) => {
    try {
      await testConnection();
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // ========== API Routes ==========

  app.use('/api/parse', parseRouter);
  app.use('/api/search', searchRouter);
  app.use('/api/semantic', semanticRouter);
  app.use('/api/hybrid', hybridRouter);
  app.use('/api/vault', vaultRouter);
  app.use('/api/connections', connectionsRouter);
  app.use('/api/summaries', summariesRouter);

  // ========== Error handlers (doivent être après les routes) ==========

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Démarre le serveur Express
 */
async function startServer() {
  try {
    // Initialise SecretsManager (Vault + fallback .env)
    console.log('🔐 Initializing SecretsManager...');
    const secretsManager = getSecretsManager({
      useVault: process.env.VAULT_ENABLED === 'true',
    });

    await secretsManager.initialize();

    // Log source des secrets (Vault ou .env)
    const source = secretsManager.getSource();
    console.log(`📋 Secrets source: ${source.toUpperCase()}`);

    // Récupérer secrets critiques depuis SecretsManager
    // (au lieu de process.env.* directement)
    if (source === 'vault') {
      console.log('🔐 Loading secrets from Vault...');

      // Optionnel: Précharger secrets critiques pour vérifier qu'ils existent
      try {
        await secretsManager.getSecret('POSTGRES_PASSWORD');
        await secretsManager.getSecret('JWT_SECRET');
        console.log('✅ Critical secrets loaded successfully');
      } catch (error) {
        console.warn('⚠️  Some secrets missing in Vault, will fallback to .env');
      }
    }

    // Test connexion PostgreSQL
    console.log('🔌 Testing PostgreSQL connection...');
    await testConnection();

    // Crée l'app Express
    const app = await createApp();

    // Démarre le serveur
    app.listen(PORT, () => {
      console.log('');
      console.log('🚀 Cartae Database API started');
      console.log(`📍 Environment: ${NODE_ENV}`);
      console.log(`🌐 Server: http://localhost:${PORT}`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log(`   POST   /api/parse          - Parse and store CartaeItem`);
      console.log(`   POST   /api/parse/batch    - Batch parse items`);
      console.log(`   GET    /api/search         - Full-text search`);
      console.log(`   GET    /api/search/stats   - Database statistics`);
      console.log(`   POST   /api/semantic       - Vector similarity search`);
      console.log(`   POST   /api/semantic/batch - Batch vector search`);
      console.log(`   POST   /api/hybrid         - Hybrid search (text + vector)`);
      console.log(`   POST   /api/hybrid/auto    - Auto-weighted hybrid search`);
      console.log(`   POST   /api/vault/secrets  - Store secret in Vault`);
      console.log(`   GET    /api/vault/secrets/:path - Retrieve secret from Vault`);
      console.log(`   DELETE /api/vault/secrets/:path - Delete secret from Vault`);
      console.log(`   GET    /api/vault/health   - Vault health check`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Lance le serveur si exécuté directement (pas import)
if (require.main === module) {
  startServer();
}

export { createApp, startServer };
