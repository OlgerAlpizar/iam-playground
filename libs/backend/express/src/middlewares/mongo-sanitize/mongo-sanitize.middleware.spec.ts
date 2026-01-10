import express, { Express } from 'express';
import request from 'supertest';

import { mongoSanitize } from './mongo-sanitize.middleware';

type BodyResponse = {
  body: Record<string, unknown>;
};

type QueryResponse = {
  query: Record<string, unknown>;
};

describe('Mongo Sanitize Middleware', () => {
  describe('Unit Tests', () => {
    it('creates middleware with default and custom options', () => {
      const defaultMiddleware = mongoSanitize.createMiddleware();
      const customMiddleware = mongoSanitize.createMiddleware({
        replaceWith: '_',
        allowDots: true,
      });

      expect(defaultMiddleware).not.toBe(customMiddleware);
    });
  });

  describe('Integration Tests', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.use(mongoSanitize.createMiddleware());
    });

    describe('body sanitization', () => {
      it('removes keys starting with $ from request body', async () => {
        app.post('/test', (req, res) => res.json({ body: req.body as unknown }));

        const response = await request(app)
          .post('/test')
          .send({ username: 'john', $where: 'malicious code', password: 'secret' })
          .expect(200);

        const data = response.body as BodyResponse;
        expect(data.body).toEqual({ username: 'john', password: 'secret' });
        expect(data.body.$where).toBeUndefined();
      });

      it('removes nested keys starting with $', async () => {
        app.post('/test', (req, res) => res.json({ body: req.body as unknown }));

        const response = await request(app)
          .post('/test')
          .send({ user: { name: 'john', $gt: 'injection' } })
          .expect(200);

        const data = response.body as BodyResponse;
        expect(data.body.user).toEqual({ name: 'john' });
      });

      it('removes keys containing dots by default', async () => {
        app.post('/test', (req, res) => res.json({ body: req.body as unknown }));

        const response = await request(app)
          .post('/test')
          .send({ 'user.name': 'john', email: 'john@example.com' })
          .expect(200);

        const data = response.body as BodyResponse;
        expect(data.body).toEqual({ email: 'john@example.com' });
      });

      it('preserves valid data without modification', async () => {
        app.post('/test', (req, res) => res.json({ body: req.body as unknown }));

        const validData = {
          username: 'john_doe',
          email: 'john@example.com',
          age: 25,
          tags: ['developer', 'nodejs'],
        };

        const response = await request(app).post('/test').send(validData).expect(200);

        expect((response.body as BodyResponse).body).toEqual(validData);
      });
    });

    describe('query sanitization', () => {
      it('sanitizes query parameters with $ operators', async () => {
        app.get('/test', (req, res) => res.json({ query: req.query }));

        const response = await request(app)
          .get('/test')
          .query({ name: 'john', $gt: '100' })
          .expect(200);

        const data = response.body as QueryResponse;
        expect(data.query.name).toBe('john');
        expect(data.query.$gt).toBeUndefined();
      });
    });

    describe('custom options', () => {
      it('allows dots when allowDots is true', async () => {
        const customApp = express();
        customApp.use(express.json());
        customApp.use(mongoSanitize.createMiddleware({ allowDots: true }));
        customApp.post('/test', (req, res) => res.json({ body: req.body as unknown }));

        const response = await request(customApp)
          .post('/test')
          .send({ 'user.name': 'john', email: 'john@example.com' })
          .expect(200);

        expect((response.body as BodyResponse).body).toEqual({
          'user.name': 'john',
          email: 'john@example.com',
        });
      });

      it('replaces prohibited characters when replaceWith is set', async () => {
        const customApp = express();
        customApp.use(express.json());
        customApp.use(mongoSanitize.createMiddleware({ replaceWith: '_' }));
        customApp.post('/test', (req, res) => res.json({ body: req.body as unknown }));

        const response = await request(customApp)
          .post('/test')
          .send({ $where: 'malicious', name: 'john' })
          .expect(200);

        const data = response.body as BodyResponse;
        expect(data.body._where).toBe('malicious');
        expect(data.body.name).toBe('john');
      });
    });

    describe('NoSQL injection prevention', () => {
      it('prevents common NoSQL injection patterns', async () => {
        app.post('/test', (req, res) => res.json({ body: req.body as unknown }));

        const neResponse = await request(app)
          .post('/test')
          .send({ username: { $ne: '' }, password: { $ne: '' } })
          .expect(200);
        expect((neResponse.body as BodyResponse).body.username).toEqual({});

        const gtResponse = await request(app)
          .post('/test')
          .send({ age: { $gt: 0 } })
          .expect(200);
        expect((gtResponse.body as BodyResponse).body.age).toEqual({});

        const regexResponse = await request(app)
          .post('/test')
          .send({ name: { $regex: '.*' } })
          .expect(200);
        expect((regexResponse.body as BodyResponse).body.name).toEqual({});
      });
    });
  });
});
