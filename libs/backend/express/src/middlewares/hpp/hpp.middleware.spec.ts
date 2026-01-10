import type { Request } from 'express';
import express, { Express } from 'express';
import request from 'supertest';

import { hpp } from './hpp.middleware';

type HppRequest = Request & {
  queryPolluted?: Record<string, string[]>;
  bodyPolluted?: Record<string, string[]>;
};

type QueryResponse = {
  query: Record<string, string | string[]>;
  queryPolluted?: Record<string, string[]>;
};

type BodyResponse = {
  body: Record<string, unknown>;
  bodyPolluted?: Record<string, string[]>;
};

describe('HPP Middleware', () => {
  describe('Unit Tests', () => {
    it('creates middleware with default and custom options', () => {
      const defaultMiddleware = hpp.createMiddleware();
      const customMiddleware = hpp.createMiddleware({
        whitelist: ['tags', 'categories'],
        checkBody: true,
        checkQuery: true,
      });

      expect(defaultMiddleware).not.toBe(customMiddleware);
    });
  });

  describe('Integration Tests', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
      app.use(hpp.createMiddleware());
      app.get('/test', (req: HppRequest, res) => {
        res.json({ query: req.query, queryPolluted: req.queryPolluted });
      });
    });

    describe('query parameter pollution prevention', () => {
      it('selects last value and stores polluted values', async () => {
        const response = await request(app).get('/test?name=first&name=second').expect(200);
        const body = response.body as QueryResponse;

        expect(body.query['name']).toBe('second');
        expect(body.queryPolluted?.['name']).toEqual(['first', 'second']);
      });

      it('handles mixed single and duplicate params', async () => {
        const response = await request(app)
          .get('/test?filter=a&filter=b&filter=c&sort=desc')
          .expect(200);
        const body = response.body as QueryResponse;

        expect(body.query['filter']).toBe('c');
        expect(body.query['sort']).toBe('desc');
        expect(body.queryPolluted?.['filter']).toEqual(['a', 'b', 'c']);
      });

      it('does not modify single query params', async () => {
        const response = await request(app).get('/test?name=john&age=30&city=nyc').expect(200);
        const body = response.body as QueryResponse;

        expect(body.query).toEqual({ name: 'john', age: '30', city: 'nyc' });
      });
    });

    describe('whitelist', () => {
      it('allows duplicate params for whitelisted fields', async () => {
        const customApp = express();
        customApp.use(hpp.createMiddleware({ whitelist: ['tags', 'categories'] }));
        customApp.get('/test', (req, res) => res.json({ query: req.query }));

        const response = await request(customApp)
          .get('/test?tags=tag1&tags=tag2&categories=cat1&categories=cat2')
          .expect(200);
        const body = response.body as QueryResponse;

        expect(body.query['tags']).toEqual(['tag1', 'tag2']);
        expect(body.query['categories']).toEqual(['cat1', 'cat2']);
      });

      it('filters non-whitelisted params while preserving whitelisted', async () => {
        const customApp = express();
        customApp.use(hpp.createMiddleware({ whitelist: ['tags'] }));
        customApp.get('/test', (req: HppRequest, res) => {
          res.json({ query: req.query, queryPolluted: req.queryPolluted });
        });

        const response = await request(customApp)
          .get('/test?tags=tag1&tags=tag2&name=first&name=second')
          .expect(200);
        const body = response.body as QueryResponse;

        expect(body.query['tags']).toEqual(['tag1', 'tag2']);
        expect(body.query['name']).toBe('second');
        expect(body.queryPolluted?.['name']).toEqual(['first', 'second']);
      });
    });

    describe('body protection', () => {
      it('protects request body from HPP attacks', async () => {
        const customApp = express();
        customApp.use(express.urlencoded({ extended: true }));
        customApp.use(hpp.createMiddleware({ checkBody: true }));
        customApp.post('/test', (req: HppRequest, res) => {
          res.json({ body: req.body as Record<string, unknown>, bodyPolluted: req.bodyPolluted });
        });

        const response = await request(customApp)
          .post('/test')
          .type('form')
          .send('name=first')
          .send('name=second')
          .expect(200);
        const body = response.body as BodyResponse;

        expect(body.body['name']).toBe('second');
      });
    });

    describe('security scenarios', () => {
      it('prevents privilege escalation via duplicate admin params', async () => {
        const customApp = express();
        customApp.use(hpp.createMiddleware());
        customApp.get('/test', (req: HppRequest, res) => {
          res.json({ query: req.query, queryPolluted: req.queryPolluted });
        });

        const response = await request(customApp).get('/test?admin=false&admin=true').expect(200);
        const body = response.body as QueryResponse;

        expect(body.query['admin']).toBe('true');
        expect(body.queryPolluted?.['admin']).toEqual(['false', 'true']);
      });

      it('handles URL encoded and special character values', async () => {
        const customApp = express();
        customApp.use(hpp.createMiddleware());
        customApp.get('/test', (req, res) => res.json({ query: req.query }));

        const encoded = await request(customApp)
          .get('/test?search=hello%20world&search=test%20query')
          .expect(200);
        expect((encoded.body as QueryResponse).query['search']).toBe('test query');

        const special = await request(customApp)
          .get('/test?filter=<script>&filter=safe')
          .expect(200);
        expect((special.body as QueryResponse).query['filter']).toBe('safe');
      });
    });
  });
});
