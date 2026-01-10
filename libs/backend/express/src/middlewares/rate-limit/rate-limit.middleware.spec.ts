import type { Request, Response } from 'express';
import express from 'express';
import request from 'supertest';

import { rateLimit } from './rate-limit.middleware';

type ErrorResponse = {
  error?: string;
  retryAfter?: number;
};

jest.mock('@authentication/backend-utils', () => ({
  environment: {
    isProduction: jest.fn(() => false),
    isDevelopment: jest.fn(() => true),
  },
}));

import { environment } from '@authentication/backend-utils';
const mockEnvironment = environment as jest.Mocked<typeof environment>;

describe('Rate Limit Middleware', () => {
  describe('Unit Tests', () => {
    it('creates API and Auth limiter middleware with options', () => {
      const apiLimiter = rateLimit.createApiLimiterMiddleware({ max: 5, windowMs: 60000 });
      const authLimiter = rateLimit.createAuthLimiterMiddleware({
        max: 3,
        skipSuccessfulRequests: true,
      });

      expect(apiLimiter).not.toBe(authLimiter);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      mockEnvironment.isProduction.mockReturnValue(false);
      mockEnvironment.isDevelopment.mockReturnValue(true);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('API limiter', () => {
      it('rate limits after max requests', async () => {
        const app = express();
        app.use(rateLimit.createApiLimiterMiddleware({ max: 2 }));
        app.get('/test', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app).get('/test').expect(200);
        await request(app).get('/test').expect(200);
        const response = await request(app).get('/test');

        expect(response.status).toBe(429);
        expect((response.body as ErrorResponse).error).toBeDefined();
        expect((response.body as ErrorResponse).retryAfter).toBeDefined();
      });

      it('uses custom message and header options', async () => {
        const app = express();
        app.use(
          rateLimit.createApiLimiterMiddleware({
            max: 1,
            message: 'Custom message',
            standardHeaders: true,
            legacyHeaders: true,
          }),
        );
        app.get('/test', (_req: Request, res: Response) => res.json({ success: true }));

        const first = await request(app).get('/test').expect(200);
        expect(first.headers['ratelimit-limit']).toBeDefined();
        expect(first.headers['x-ratelimit-limit']).toBeDefined();

        const limited = await request(app).get('/test');
        expect(limited.status).toBe(429);
        expect((limited.body as ErrorResponse).error).toBe('Custom message');
      });

      it('rate limits authenticated users by user ID', async () => {
        const app = express();
        app.use((req: Request, _res, next) => {
          const userId = (req.query.userId as string) || 'anonymous';
          (req as Request & { user?: { id: string } }).user = { id: userId };
          next();
        });
        app.use(rateLimit.createApiLimiterMiddleware({ max: 1 }));
        app.get('/test', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app).get('/test?userId=user1').expect(200);
        await request(app).get('/test?userId=user1').expect(429);
        await request(app).get('/test?userId=user2').expect(200);
      });
    });

    describe('Auth limiter', () => {
      it('rate limits by email or username', async () => {
        const app = express();
        app.use(express.json());
        app.use(rateLimit.createAuthLimiterMiddleware({ max: 2, skipSuccessfulRequests: false }));
        app.post('/login', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app).post('/login').send({ email: 'user@test.com' }).expect(200);
        await request(app).post('/login').send({ email: 'user@test.com' }).expect(200);
        await request(app).post('/login').send({ email: 'user@test.com' }).expect(429);

        await request(app).post('/login').send({ email: 'other@test.com' }).expect(200);
      });

      it('skips successful requests by default', async () => {
        const app = express();
        app.use(express.json());
        app.use(rateLimit.createAuthLimiterMiddleware({ max: 2 }));
        app.post('/login', (_req: Request, res: Response) => res.status(200).json({ ok: true }));

        await request(app).post('/login').send({ email: 'test@test.com' }).expect(200);
        await request(app).post('/login').send({ email: 'test@test.com' }).expect(200);
        await request(app).post('/login').send({ email: 'test@test.com' }).expect(200);
      });

      it('counts failed requests when skipSuccessfulRequests is true', async () => {
        const app = express();
        app.use(express.json());
        app.use(rateLimit.createAuthLimiterMiddleware({ max: 2 }));
        app.post('/login', (_req: Request, res: Response) =>
          res.status(401).json({ error: 'Invalid' }),
        );

        await request(app).post('/login').send({ email: 'test@test.com' }).expect(401);
        await request(app).post('/login').send({ email: 'test@test.com' }).expect(401);
        await request(app).post('/login').send({ email: 'test@test.com' }).expect(429);
      });

      it('prefers email over username, falls back to device fingerprint', async () => {
        const app = express();
        app.use(express.json());
        app.use(rateLimit.createAuthLimiterMiddleware({ max: 2, skipSuccessfulRequests: false }));
        app.post('/login', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app).post('/login').send({ email: 'e@t.com', username: 'u' }).expect(200);
        await request(app).post('/login').send({ email: 'e@t.com', username: 'u' }).expect(200);
        await request(app).post('/login').send({ email: 'e@t.com', username: 'u' }).expect(429);
        await request(app).post('/login').send({ email: 'other@t.com' }).expect(200);

        await request(app).post('/login').send({ username: 'only' }).expect(200);
        await request(app).post('/login').send({ username: 'only' }).expect(200);
        await request(app).post('/login').send({ username: 'only' }).expect(429);
      });

      it('uses username when email is undefined', async () => {
        const app = express();
        app.use(express.json());
        app.use(rateLimit.createAuthLimiterMiddleware({ max: 2, skipSuccessfulRequests: false }));
        app.post('/login', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app)
          .post('/login')
          .send({ email: undefined, username: 'testuser' })
          .expect(200);
        await request(app)
          .post('/login')
          .send({ email: undefined, username: 'testuser' })
          .expect(200);
        await request(app)
          .post('/login')
          .send({ email: undefined, username: 'testuser' })
          .expect(429);
      });

      it('handles edge cases: null email, empty strings', async () => {
        const app = express();
        app.use(express.json());
        app.use(rateLimit.createAuthLimiterMiddleware({ max: 2, skipSuccessfulRequests: false }));
        app.post('/login', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app).post('/login').send({ email: null, username: 'test' }).expect(200);
        await request(app).post('/login').send({ email: null, username: 'test' }).expect(200);
        await request(app).post('/login').send({ email: null, username: 'test' }).expect(429);
      });

      it('falls back to device fingerprint when no email/username provided', async () => {
        const app = express();
        app.use(express.json());
        app.use(rateLimit.createAuthLimiterMiddleware({ max: 2, skipSuccessfulRequests: false }));
        app.post('/login', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app).post('/login').send({}).expect(200);
        await request(app).post('/login').send({}).expect(200);
        await request(app).post('/login').send({}).expect(429);
      });

      it('falls back to device fingerprint when body is empty', async () => {
        const app = express();
        app.use(express.json());
        app.use(rateLimit.createAuthLimiterMiddleware({ max: 2, skipSuccessfulRequests: false }));
        app.post('/login', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app).post('/login').expect(200);
        await request(app).post('/login').expect(200);
        await request(app).post('/login').expect(429);
      });
    });

    describe('environment behavior', () => {
      it('respects production/development mode', async () => {
        mockEnvironment.isProduction.mockReturnValue(true);
        mockEnvironment.isDevelopment.mockReturnValue(false);

        const app = express();
        app.use(rateLimit.createApiLimiterMiddleware());
        app.get('/test', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app).get('/test').expect(200);
      });

      it('uses lower max limit in production for API limiter', async () => {
        mockEnvironment.isProduction.mockReturnValue(true);
        mockEnvironment.isDevelopment.mockReturnValue(false);

        const app = express();
        app.use(rateLimit.createApiLimiterMiddleware({ max: 2 }));
        app.get('/test', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app).get('/test').expect(200);
        await request(app).get('/test').expect(200);
        await request(app).get('/test').expect(429);
      });

      it('uses lower max limit in production for Auth limiter', async () => {
        mockEnvironment.isProduction.mockReturnValue(true);
        mockEnvironment.isDevelopment.mockReturnValue(false);

        const app = express();
        app.use(express.json());
        app.use(rateLimit.createAuthLimiterMiddleware({ max: 2, skipSuccessfulRequests: false }));
        app.post('/login', (_req: Request, res: Response) => res.json({ success: true }));

        await request(app).post('/login').send({ email: 'prod@test.com' }).expect(200);
        await request(app).post('/login').send({ email: 'prod@test.com' }).expect(200);
        await request(app).post('/login').send({ email: 'prod@test.com' }).expect(429);
      });
    });

    describe('API limiter defaults', () => {
      it('uses default options when none provided', async () => {
        const app = express();
        app.use(rateLimit.createApiLimiterMiddleware());
        app.get('/test', (_req: Request, res: Response) => res.json({ success: true }));

        const response = await request(app).get('/test').expect(200);
        expect(response.headers['ratelimit-limit']).toBeDefined();
      });
    });

    describe('Auth limiter defaults', () => {
      it('uses default options when none provided', async () => {
        const app = express();
        app.use(express.json());
        app.use(rateLimit.createAuthLimiterMiddleware());
        app.post('/login', (_req: Request, res: Response) => res.json({ success: true }));

        const response = await request(app).post('/login').send({ email: 'default@test.com' });
        expect(response.status).toBe(200);
        expect(response.headers['ratelimit-limit']).toBeDefined();
      });
    });
  });
});
