import express, { Express } from 'express';
import request from 'supertest';

import { bodyParser } from './body-parser.middleware';

const applyBodyParsers = (
  app: Express,
  options: Parameters<typeof bodyParser.createBodyParsers>[0] = {},
) => {
  const parsers = bodyParser.createBodyParsers(options);
  parsers.forEach((parser) => app.use(parser));
};

describe('Body Parser Middleware', () => {
  describe('Unit Tests', () => {
    it('creates parsers with default options (JSON + URL-encoded)', () => {
      const parsers = bodyParser.createBodyParsers();
      expect(parsers).toHaveLength(2);
    });

    describe('configuration validation', () => {
      it('throws error for invalid size formats', () => {
        expect(() => bodyParser.createBodyParsers({ jsonLimit: 'invalid' })).toThrow(
          "Invalid jsonLimit: invalid. Must be in format like '10mb', '5kb', etc.",
        );
        expect(() => bodyParser.createBodyParsers({ urlencodedLimit: 'invalid' })).toThrow(
          'Invalid urlencodedLimit',
        );
        expect(() =>
          bodyParser.createBodyParsers({ enableRaw: true, rawLimit: 'invalid' }),
        ).toThrow('Invalid rawLimit');
        expect(() =>
          bodyParser.createBodyParsers({ enableText: true, textLimit: 'invalid' }),
        ).toThrow('Invalid textLimit');
      });

      it('accepts valid size formats', () => {
        expect(() =>
          bodyParser.createBodyParsers({
            jsonLimit: '5MB',
            urlencodedLimit: '2kb',
            rawLimit: '1GB',
            textLimit: '100B',
          }),
        ).not.toThrow();
      });

      it('respects inflate and strict options', () => {
        const parsersWithDefaults = bodyParser.createBodyParsers();
        expect(parsersWithDefaults).toHaveLength(2);

        const parsersWithCustomOptions = bodyParser.createBodyParsers({
          inflate: false,
          strict: false,
        });
        expect(parsersWithCustomOptions).toHaveLength(2);
      });
    });
  });

  describe('Integration Tests', () => {
    let app: Express;

    beforeEach(() => {
      app = express();
    });

    describe('JSON parsing', () => {
      it('parses JSON with default and custom limits', async () => {
        applyBodyParsers(app);
        app.post('/test', (req, res) => res.json({ received: req.body as unknown }));

        const response = await request(app).post('/test').send({ message: 'test' }).expect(200);
        expect((response.body as { received: { message: string } }).received).toEqual({
          message: 'test',
        });

        const customApp = express();
        applyBodyParsers(customApp, { jsonLimit: '1kb' });
        customApp.post('/test', (req, res) => res.json({ received: req.body as unknown }));

        await request(customApp)
          .post('/test')
          .send({ data: 'x'.repeat(500) })
          .expect(200);
        await request(customApp)
          .post('/test')
          .send({ data: 'x'.repeat(2000) })
          .expect(413);
      });
    });

    describe('URL-encoded parsing', () => {
      it('parses URL-encoded with extended option', async () => {
        applyBodyParsers(app, { extended: true });
        app.post('/test', (req, res) => res.json({ received: req.body as unknown }));

        const response = await request(app)
          .post('/test')
          .type('form')
          .send('user[name]=John&user[age]=30')
          .expect(200);

        expect(
          (response.body as { received: { user: { name: string; age: string } } }).received,
        ).toEqual({
          user: { name: 'John', age: '30' },
        });
      });

      it('respects custom URL-encoded limit', async () => {
        applyBodyParsers(app, { urlencodedLimit: '1kb' });
        app.post('/test', (req, res) => res.json({ received: req.body as unknown }));

        await request(app)
          .post('/test')
          .type('form')
          .send({ field: 'x'.repeat(500) })
          .expect(200);
        await request(app)
          .post('/test')
          .type('form')
          .send({ field: 'x'.repeat(2000) })
          .expect(413);
      });
    });

    describe('parser selection', () => {
      it('enables only specified parsers', async () => {
        const jsonOnlyApp = express();
        applyBodyParsers(jsonOnlyApp, {
          enableJson: true,
          enableUrlencoded: false,
        });
        jsonOnlyApp.post('/test', (req, res) => res.json({ received: req.body as unknown }));

        const response = await request(jsonOnlyApp)
          .post('/test')
          .set('Content-Type', 'application/json')
          .send({ message: 'test' })
          .expect(200);
        expect((response.body as { received: { message: string } }).received).toEqual({
          message: 'test',
        });
      });

      it('disables JSON parser when configured', () => {
        const parsers = bodyParser.createBodyParsers({
          enableJson: false,
          enableUrlencoded: true,
        });
        expect(parsers).toHaveLength(1);
      });

      it('enables raw parser when configured', async () => {
        applyBodyParsers(app, { enableRaw: true });
        app.post('/test', (req, res) => res.json({ isBuffer: req.body instanceof Buffer }));

        const response = await request(app)
          .post('/test')
          .set('Content-Type', 'application/octet-stream')
          .send('raw data')
          .expect(200);
        expect((response.body as { isBuffer: boolean }).isBuffer).toBe(true);
      });

      it('raw parser skips JSON, URL-encoded, and text content types', async () => {
        applyBodyParsers(app, { enableRaw: true, enableJson: true, enableUrlencoded: true });
        app.post('/test', (req, res) =>
          res.json({ isBuffer: req.body instanceof Buffer, body: req.body as unknown }),
        );

        const jsonResponse = await request(app)
          .post('/test')
          .set('Content-Type', 'application/json')
          .send(JSON.stringify({ test: 'data' }))
          .expect(200);
        expect((jsonResponse.body as { isBuffer: boolean }).isBuffer).toBe(false);

        const urlencodedResponse = await request(app)
          .post('/test')
          .set('Content-Type', 'application/x-www-form-urlencoded')
          .send('field=value')
          .expect(200);
        expect((urlencodedResponse.body as { isBuffer: boolean }).isBuffer).toBe(false);

        const textApp = express();
        applyBodyParsers(textApp, { enableRaw: true, enableText: true });
        textApp.post('/test', (req, res) =>
          res.json({ isBuffer: req.body instanceof Buffer, body: req.body as unknown }),
        );
        const textResponse = await request(textApp)
          .post('/test')
          .set('Content-Type', 'text/plain')
          .send('plain text')
          .expect(200);
        expect((textResponse.body as { isBuffer: boolean }).isBuffer).toBe(false);
      });

      it('enables text parser when configured', async () => {
        applyBodyParsers(app, { enableText: true });
        app.post('/test', (req, res) => res.json({ received: req.body as unknown }));

        const response = await request(app)
          .post('/test')
          .set('Content-Type', 'text/plain')
          .send('Hello World')
          .expect(200);
        expect((response.body as { received: string }).received).toBe('Hello World');
      });

      it('raw parser handles requests without content-type header', async () => {
        applyBodyParsers(app, { enableRaw: true });
        app.post('/test', (req, res) =>
          res.json({ hasBody: req.body !== undefined, isBuffer: req.body instanceof Buffer }),
        );

        const response = await request(app).post('/test').send(Buffer.from('raw data'));
        expect(response.status).toBe(200);
      });
    });

    describe('DoS prevention', () => {
      it('rejects payloads exceeding configured limits', async () => {
        applyBodyParsers(app, { jsonLimit: '100kb', urlencodedLimit: '100kb' });
        app.post('/test', (_req, res) => res.json({ received: true }));

        await request(app)
          .post('/test')
          .send({ data: 'x'.repeat(200000) })
          .expect(413);
        await request(app)
          .post('/test')
          .type('form')
          .send({ data: 'x'.repeat(200000) })
          .expect(413);
      });
    });
  });
});
