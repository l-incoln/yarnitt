import request from 'supertest';
// If your app exports createServer(), adjust the import path below to point to it.
import { createServer } from '../src/server';
let app: any;

beforeAll(async () => { app = await createServer(); });
afterAll(async () => { if (app && app.close) await app.close(); });

describe('Health & basic smoke tests', () => {
 test('GET /health returns 200/204 and ok', async () => {
 const res = await request(app).get('/health');
 expect([200,204]).toContain(res.status);
 });
 test('GET / returns 200 or redirect', async () => {
 const res = await request(app).get('/');
 expect([200,301,302]).toContain(res.status);
 });
});
