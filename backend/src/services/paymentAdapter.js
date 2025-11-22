// Minimal payment adapter interface
// Implement concrete provider in a separate file (stripeAdapter.js) and swap in via config.
// For CI/tests you can provide a mock adapter that resolves successfully.

async function charge({ amount, paymentMethod, metadata }) {
  if (process.env.PAYMENT_PROVIDER === 'mock' || process.env.NODE_ENV === 'test') {
    return { providerChargeId: `mock_${Date.now()}`, status: 'succeeded' };
  }

  // Example: throw a useful error for production until adapter is implemented
  const err = new Error('No payment provider configured. Implement a provider adapter.');
  err.code = 'payment_adapter_missing';
  throw err;
}

module.exports = { charge };