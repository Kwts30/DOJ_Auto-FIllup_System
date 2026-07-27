const request = require('supertest');
const app = require('../server');

describe('Health and Public Routes Integration', () => {
  test('GET /health returns status healthy', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'healthy');
  }, 30000);

  test('GET / login page responds with 200', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
  }, 30000);
});
