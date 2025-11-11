#!/usr/bin/env node

/**
 * CI Integration Test: Redis-backed forgot-password rate limiter
 * 
 * This script tests that the /api/auth/forgot-password endpoint
 * correctly rate-limits requests (5 allowed, 6th blocked with 429).
 * 
 * Exit codes:
 * - 0: Test passed (first 5 requests returned 2xx, 6th returned 429)
 * - 1: Test failed or backend not ready
 */

const http = require('http');

// Fetch wrapper: try built-in fetch first, fallback to node-fetch if available
let fetchImpl;
if (typeof globalThis.fetch === 'function') {
  fetchImpl = globalThis.fetch;
  console.log('[INFO] Using built-in fetch');
} else {
  try {
    fetchImpl = require('node-fetch');
    console.log('[INFO] Using node-fetch');
  } catch (err) {
    console.error('[ERROR] No fetch implementation available (tried built-in and node-fetch)');
    process.exit(1);
  }
}

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const READINESS_TIMEOUT_MS = 60000; // 60 seconds
const READINESS_POLL_INTERVAL_MS = 2000; // 2 seconds

/**
 * Wait for backend to be ready by polling the root endpoint
 */
async function waitForBackend() {
  console.log(`[INFO] Waiting for backend at ${BACKEND_URL} (timeout: ${READINESS_TIMEOUT_MS}ms)...`);
  const startTime = Date.now();
  
  while (Date.now() - startTime < READINESS_TIMEOUT_MS) {
    try {
      const response = await fetchImpl(`${BACKEND_URL}/`, { 
        method: 'GET',
        headers: { 'Accept': '*/*' }
      });
      
      // Accept 200, 404, or any response that indicates the server is up
      if (response.status === 200 || response.status === 404 || response.status === 301) {
        console.log(`[INFO] Backend is ready! (status: ${response.status})`);
        return true;
      }
      
      console.log(`[INFO] Backend returned status ${response.status}, waiting...`);
    } catch (err) {
      // Connection errors are expected while the backend is starting
      if (Date.now() - startTime < READINESS_TIMEOUT_MS) {
        // console.log('[INFO] Backend not ready yet, retrying...');
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, READINESS_POLL_INTERVAL_MS));
  }
  
  console.error('[ERROR] Backend did not become ready within timeout');
  return false;
}

/**
 * Send a POST request to the forgot-password endpoint
 */
async function sendForgotPasswordRequest(requestNumber) {
  const endpoint = `${BACKEND_URL}/api/auth/forgot-password`;
  const body = JSON.stringify({ email: 'ci-test@example.com' });
  
  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: body
    });
    
    console.log(`[INFO] Request ${requestNumber}: status ${response.status}`);
    return response.status;
  } catch (err) {
    console.error(`[ERROR] Request ${requestNumber} failed:`, err.message);
    throw err;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('=== Redis-backed forgot-password rate limiter test ===\n');
  
  // Wait for backend to be ready
  const ready = await waitForBackend();
  if (!ready) {
    process.exit(1);
  }
  
  console.log('\n[INFO] Starting rate limiter test: sending 6 requests...\n');
  
  const statuses = [];
  
  // Send 6 requests sequentially
  for (let i = 1; i <= 6; i++) {
    try {
      const status = await sendForgotPasswordRequest(i);
      statuses.push(status);
      
      // Small delay between requests
      if (i < 6) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error(`[ERROR] Failed to send request ${i}`);
      process.exit(1);
    }
  }
  
  console.log('\n=== Test Results ===');
  console.log('Status codes:', statuses);
  
  // Validate results
  let success = true;
  
  // First 5 requests should return 2xx
  for (let i = 0; i < 5; i++) {
    if (statuses[i] < 200 || statuses[i] >= 300) {
      console.error(`[FAIL] Request ${i + 1} expected 2xx, got ${statuses[i]}`);
      success = false;
    }
  }
  
  // 6th request should return 429 (Too Many Requests)
  if (statuses[5] !== 429) {
    console.error(`[FAIL] Request 6 expected 429, got ${statuses[5]}`);
    success = false;
  }
  
  if (success) {
    console.log('\n✓ TEST PASSED: Rate limiter works correctly');
    console.log('  - Requests 1-5: returned 2xx (allowed)');
    console.log('  - Request 6: returned 429 (rate limited)');
    process.exit(0);
  } else {
    console.error('\n✗ TEST FAILED: Rate limiter did not behave as expected');
    process.exit(1);
  }
}

// Run the test
runTest().catch(err => {
  console.error('[ERROR] Unhandled error:', err);
  process.exit(1);
});
