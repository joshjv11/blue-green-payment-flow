import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { env } from './env.js';
import { checkDbConnection } from './db.js';
import { generalLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import authRoutes from './routes/auth.js';
import orgsRoutes from './routes/orgs.js';
import customersRoutes from './routes/customers.js';
import invoicesRoutes from './routes/invoices.js';
import sequencesRoutes from './routes/sequences.js';
import paymentsRoutes from './routes/payments.js';
import webhooksRoutes from './routes/webhooks.js';
import publicRoutes from './routes/public.js';
import storageRoutes from './routes/storage.js';
import aiRoutes from './routes/ai.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins, credentials: true }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(generalLimiter);

  app.use((req, res, next) => {
    if (req.path === '/webhooks/razorpay' || req.path === '/api/razorpay-webhook') {
      express.raw({ type: 'application/json', limit: '1mb' })(req, res, next);
    } else {
      express.json({ limit: '1mb' })(req, res, next);
    }
  });

  app.get('/health', async (_req, res) => {
    const dbOk = await checkDbConnection();
    res.status(dbOk ? 200 : 503).json({
      ok: dbOk,
      db: dbOk ? 'connected' : 'unavailable',
    });
  });

  app.use('/auth', authRoutes);
  app.use('/orgs', orgsRoutes);
  app.use('/customers', customersRoutes);
  app.use('/invoices', invoicesRoutes);
  app.use('/sequences', sequencesRoutes);
  app.use('/payments', paymentsRoutes);
  app.use('/webhooks', webhooksRoutes);
  app.use('/public', publicRoutes);
  app.use('/storage', storageRoutes);
  app.use('/ai', aiRoutes);

  // Legacy path aliases from auth-api
  app.use('/api', aiRoutes);
  app.use('/api', paymentsRoutes);
  app.use('/api', webhooksRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
