// Minimal payment adapter interface
// Implement concrete provider in a separate file (stripeAdapter.js) and swap in via config.
// For CI/tests you can provide a mock adapter that resolves successfully.

async function charge({ amount, paymentMethod, metadata }) {
  // Example: if using test mode, return a resolved promise with provider id
  // In production, call Stripe/other SDK here and return the provider response object
  if (process.env.PAYMENT_PROVIDER === 'mock' || process.env.NODE_ENV === 'test') {
    return { providerChargeId: `mock_${Date.now()}`, status: 'succeeded' };
  }

  // Throw an error with useful details on failure:
  // const err = new Error('card_declined');
  // err.result = { code: 'card_declined' };
  // throw err;

  throw new Error('No payment provider configured. Implement a provider adapter.');
}

module.exports = { charge };