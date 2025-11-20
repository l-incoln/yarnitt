// Minimal Express route skeleton for Next Big Step
// Hook this into your existing backend server/router.

const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');

router.post('/api/v1/next', async (req, res) => {
  try {
    const payload = req.body;
    const result = await orderService.createOrder(payload);
    res.status(200).json(result);
  } catch (err) {
    if (err && err.code === 'payment_failed') {
      return res.status(402).json({ error: 'payment_failed', message: err.message, details: err.details || null });
    }
    if (err && err.code === 'validation_error') {
      return res.status(400).json({ error: 'validation_error', message: err.message, details: err.details || null });
    }
    console.error('createOrder error', err);
    res.status(500).json({ error: 'server_error', message: 'Internal server error' });
  }
});

router.get('/api/v1/next/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const order = await orderService.getOrderById(id);
    if (!order) return res.status(404).json({ error: 'not_found', message: 'Order not found' });
    res.status(200).json(order);
  } catch (err) {
    console.error('getOrderById error', err);
    res.status(500).json({ error: 'server_error', message: 'Internal server error' });
  }
});

module.exports = router;