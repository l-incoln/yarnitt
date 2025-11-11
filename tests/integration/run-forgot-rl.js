#!/usr/bin/env node
/**
 * Lightweight integration test runner for the "forgot-password" Redis rate limiter.
 *
 * Behavior:
 * - Waits up to ~60s for backend readiness by polling GET http://localhost:4000/
 * - Sends 6 POST requests to /api/auth/forgot-password with the same email JSON body.
 * - Exits 0 only if first five responses are 2xx and the sixth is 429. Otherwise exits 1.
 *
 * No external deps required; uses Node's http/https modules.
 */

const { URL } = require('url');
const http = require('http');
const https = require('https');

function request(url, opts = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? https : http;
    const headers = Object.assign({}, opts.headers || {});
    const requestOptions = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + (u.search || ''),
      method: opts.method || 'GET',
      headers,
      timeout: opts.timeout || 30000,
    };

    const req = lib.request(requestOptions, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body: text, headers: res.headers });
      });
    });

    req.on('error', (err) => reject(err));
    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function waitForBackend(url, timeoutMs = 60000) {
  const start = Date.now();
  console.log(`Waiting for backend at ${url} (timeout ${Math.round(timeoutMs / 1000)}s)`);
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await request(url, { method: 'GET' });
      if (r.status >= 200 && r.status < 300) {
        console.log(`Backend ready (status ${r.status})`);
        return true;
      }
      // Accept 404 as "server up but no root handler"
      if (r.status === 404) {
        console.log('Backend responded 404 (treating as ready)');
        return true;
      }
    } catch (err) {
      // ignore and retry
    }
    await new Promise((res) => setTimeout(res, 2000));
    process.stdout.write('.');
  }
  console.error('\nTimed out waiting for backend');
  return false;
}

async function runTest() {
  const base = 'http://localhost:4000';
  const healthUrl = `${base}/`;
  const ready = await waitForBackend(healthUrl, 60000);
  if (!ready) {
    console.error('Backend did not become ready, aborting test.');
    process.exit(1);
  }

  const target = `${base}/api/auth/forgot-password`;
  const bodyObj = { email: 'ci-test@example.com' };
  const bodyText = JSON.stringify(bodyObj);
  const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyText) };

  console.log(`\nSending 6 POST requests to ${target}`);
  const statuses = [];
  for (let i = 1; i <= 6; i++) {
    try {
      const res = await request(target, { method: 'POST', headers }, bodyText);
      statuses.push(res.status);
      console.log(`Request ${i}: status=${res.status}`);
      // small delay to avoid spamming
      await new Promise((r) => setTimeout(r, 250));
    } catch (err) {
      console.error(`Request ${i} failed: ${err.message || err}`);
      statuses.push(null);
    }
  }

  console.log('\nResults:', statuses);
  const firstFiveOk = statuses.slice(0, 5).every((s) => s >= 200 && s < 300);
  const sixthIs429 = statuses[5] === 429;

  if (firstFiveOk && sixthIs429) {
    console.log('SUCCESS: First five requests allowed, sixth blocked (429).');
    process.exit(0);
  } else {
    console.error('FAIL: Expected first five 2xx and sixth 429.');
    // print detailed diagnosis
    statuses.forEach((s, idx) => {
      console.error(`  Request ${idx + 1}: ${s === null ? 'error' : s}`);
    });
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});