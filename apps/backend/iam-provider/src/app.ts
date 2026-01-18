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
  requestId,
  timeout,
} from '@authentication/backend-express/middlewares';
import { winstonLogger } from '@authentication/backend-utils';
import express, { Application, Request, RequestHandler, Response } from 'express';

import { authRoutes } from './auth/routes/auth.routes';
import { oauthRoutes } from './auth/routes/oauth.routes';
import { userRoutes } from './auth/routes/user.routes';
import { appConfig } from './config/app.config';
import { DomainErrors } from './config/domain-errors.config';
import { configurePassportStrategies } from './config/passport.config';

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

  app.use(
    passportMiddleware.createMiddleware({ configureStrategies: configurePassportStrategies }),
  );

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      environment: appConfig.environment,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/oauth', oauthRoutes);
  app.use('/api/v1/users', userRoutes);

  app.use(notFound.createMiddleware());

  app.use(errorHandler.createMiddleware({ logger: winstonLogger, domainErrorMap: DomainErrors }));

  return app;
};

export const app = createApp();
