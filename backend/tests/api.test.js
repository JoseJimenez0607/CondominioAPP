/**
 * Tests básicos del API
 * Ejecutar: npm test (desde backend/)
 */

const request = require('supertest');
const { app }  = require('../src/server');

describe('Health check', () => {
  it('GET /health → 200 con status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth', () => {
  it('POST /api/auth/login sin body → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.statusCode).toBe(400);
  });

  it('POST /api/auth/login con credenciales inválidas → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.cl', password: 'wrong' });
    expect(res.statusCode).toBe(401);
  });
});

describe('Rutas protegidas', () => {
  it('GET /api/visitas sin token → 401', async () => {
    const res = await request(app).get('/api/visitas');
    expect(res.statusCode).toBe(401);
  });

  it('GET /api/tickets sin token → 401', async () => {
    const res = await request(app).get('/api/tickets');
    expect(res.statusCode).toBe(401);
  });
});
