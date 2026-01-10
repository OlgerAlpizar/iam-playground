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
  requestId,
  timeout,
} from '@authentication/backend-express/middlewares';
import { winstonLogger } from '@authentication/backend-utils';
import express, { Application, Request, RequestHandler, Response } from 'express';

import { appConfig } from './config';

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

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      environment: appConfig.environment,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use(notFound.createMiddleware());

  app.use(errorHandler.createMiddleware({ logger: winstonLogger }));

  return app;
};

export const app = createApp();
