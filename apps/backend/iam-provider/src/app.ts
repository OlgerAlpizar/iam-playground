import {
  bodyParser,
  compression,
  cors,
  errorHandler,
  helmet,
  hpp,
  mongoSanitize,
  morganLogger,
  notFound,
  passportMiddleware,
  rateLimit,
  requestId,
  timeout,
} from '@authentication/backend-express/middlewares';
import { winstonLogger } from '@authentication/backend-utils';
import express, { Application, Request, RequestHandler, Response } from 'express';

import { authRoutes } from './auth/routes/auth.routes';
import { oauthRoutes } from './auth/routes/oauth.routes';
import { passkeyRoutes } from './auth/routes/passkey.routes';
import { userRoutes } from './auth/routes/user.routes';
import { appConfig } from './config/app.config';
import { DomainErrors } from './config/domain-errors.config';
import { mongooseConfig } from './config/mongoose.config';
import { configurePassportStrategies } from './config/passport.config';
import { healthCheck } from './config/redis.config';

const createApp = (): Application => {
  const app = express();

  app.use(requestId.createMiddleware());

  app.use(helmet.createMiddleware());

  app.use(cors.createMiddleware({ whiteListUrls: appConfig.whiteListUrls }));

  app.use(timeout.createMiddleware({ timeoutMs: 30000 }));

  app.use(morganLogger.createMiddleware());

  app.use(compression.createMiddleware());

  bodyParser.createBodyParsers().forEach((parser: RequestHandler) => app.use(parser));

  app.use(hpp.createMiddleware());

  app.use(mongoSanitize.createMiddleware());

  // Global API rate limiting
  app.use(rateLimit.createApiLimiterMiddleware());

  app.use(
    passportMiddleware.createMiddleware({ configureStrategies: configurePassportStrategies }),
  );

  app.get('/health', (_req: Request, res: Response) => {
    const dbHealth = mongooseConfig.healthCheck();
    const redisHealthy = healthCheck();

    res.status(200).json({
      status: 'ok',
      environment: appConfig.environment,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: dbHealth.status,
        redis: redisHealthy ? 'healthy' : 'unavailable',
      },
    });
  });

  // API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/oauth', oauthRoutes);
  app.use('/api/v1/passkeys', passkeyRoutes);
  app.use('/api/v1/users', userRoutes);

  app.use(notFound.createMiddleware());

  app.use(errorHandler.createMiddleware({ logger: winstonLogger, domainErrorMap: DomainErrors }));

  return app;
};

export const app = createApp();
