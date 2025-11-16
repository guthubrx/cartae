/**
 * Notification API Server
 * Express server pour les notifications email
 */

import express, { type Express } from 'express';
import cors from 'cors';
import notificationRoutes from './routes/notifications.js';

const app: Express = express();
const PORT = process.env.NOTIFICATION_API_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'notification-api',
    timestamp: new Date().toISOString(),
    email_provider: process.env.EMAIL_PROVIDER || 'console',
  });
});

// Routes
app.use('/api', notificationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('📧 Cartae Notification API');
  console.log('='.repeat(60));
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📬 Email Provider: ${process.env.EMAIL_PROVIDER || 'console'}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📋 API Base: http://localhost:${PORT}/api`);
  console.log('='.repeat(60) + '\n');
});

export default app;
