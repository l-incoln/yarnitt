// Minimal order service skeleton (DB + payment flow)
// Replace DB and paymentAdapter calls with your project's implementations.

const db = require('../db'); // adjust to your DB layer
const paymentAdapter = require('./paymentAdapter');

async function validatePayload(payload) {
  if (!payload || !payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
    const err = new Error('items is required');
    err.code = 'validation_error';
    err.details = [{ field: 'items', message: 'required' }];
    throw err;
  }
  // Add more validation as needed
}

async function createOrder(payload) {
  await validatePayload(payload);

  // Compute total (example: sum price*quantity)
  const total = payload.items.reduce((sum, it) => sum + (it.price || 0) * (it.quantity || 1), 0);

  // Insert the order with status "pending" (pseudo-code; adapt to your DB/ORM)
  const orderRecord = {
    status: 'pending',
    total,
    items: payload.items,
    metadata: payload.metadata || {},
    created_at: new Date().toISOString()
  };

  // Replace this with your DB insert and return the inserted id
  const inserted = await db.insertOrder(orderRecord); // implement insertOrder in your db layer
  const orderId = inserted.id || inserted; // adapt to your db method result

  try {
    // Charge via payment adapter (can be mocked in tests)
    const paymentResult = await paymentAdapter.charge({
      amount: total,
      paymentMethod: payload.paymentMethod,
      metadata: { orderId }
    });

    // Update order status to confirmed and save provider response
    await db.updateOrder(orderId, { status: 'confirmed', payment_provider_response: paymentResult });
    return { orderId, status: 'confirmed', total, createdAt: orderRecord.created_at };
  } catch (payErr) {
    // Update order to payment_failed and surface error
    await db.updateOrder(orderId, { status: 'payment_failed', payment_provider_response: payErr.result || null });
    const err = new Error(payErr.message || 'Payment failed');
    err.code = 'payment_failed';
    throw err;
  }
}

async function getOrderById(id) {
  return db.findOrderById(id);
}

module.exports = { createOrder, getOrderById };