#!/usr/bin/env node

/**
 * Integration test for forgot password rate limiting
 * Expected output: [200,200,200,200,200,429]
 * This tests that the forgot password endpoint allows 5 requests then rate limits
 */

const http = require('http');

const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || 4000;
const NUM_REQUESTS = 6;

async function makeRequest() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/api/auth/forgot-password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(res.statusCode);
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Send a test email address
    req.write(JSON.stringify({ email: 'test@example.com' }));
    req.end();
  });
}

async function runTest() {
  const results = [];
  
  console.log(`Testing rate limiting on forgot password endpoint...`);
  console.log(`Making ${NUM_REQUESTS} requests to http://${BACKEND_HOST}:${BACKEND_PORT}/api/auth/forgot-password`);
  
  for (let i = 0; i < NUM_REQUESTS; i++) {
    try {
      const statusCode = await makeRequest();
      results.push(statusCode);
      console.log(`Request ${i + 1}: ${statusCode}`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Request ${i + 1} failed:`, error.message);
      results.push('ERROR');
    }
  }
  
  console.log('\nFinal results:', results);
  
  // Check if we got the expected pattern
  const expected = [200, 200, 200, 200, 200, 429];
  const matches = JSON.stringify(results) === JSON.stringify(expected);
  
  if (matches) {
    console.log('✓ Rate limiting test PASSED');
    process.exit(0);
  } else {
    console.log(`✗ Rate limiting test FAILED`);
    console.log(`  Expected: ${JSON.stringify(expected)}`);
    console.log(`  Got:      ${JSON.stringify(results)}`);
    process.exit(1);
  }
}

runTest().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
