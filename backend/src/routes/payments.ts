import express from 'express';
import Payment from '../models/Payment';
import Order from '../models/Order';

const router = express.Router();

// MPesa callback (POST)
router.post('/mpesa/callback', async (req, res) => {
  // Note: adapt parsing to your MPesa provider payload
  const body = req.body;
  try {
    const providerId = body?.Body?.stkCallback?.CheckoutRequestID || body?.providerId;
    const resultCode = body?.Body?.stkCallback?.ResultCode;
    const success = resultCode === 0;

    if (!providerId) {
      // can't correlate
      return res.status(400).json({ received: false });
    }

    // idempotent update: find payment with providerId or create mapping if your system stores providerId elsewhere.
    const payment = await Payment.findOne({ providerId });
    if (!payment) {
      // optionally log unknown provider callback
      console.warn('Unknown payment callback for', providerId);
      return res.json({ received: true });
    }

    const status = success ? 'SUCCESS' : 'FAILED';
    await Payment.findByIdAndUpdate(payment._id, { status, rawResponse: body });

    if (success && payment.order) {
      await Order.findByIdAndUpdate(payment.order, { status: 'PAID' });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('mpesa callback error', err);
    res.status(500).json({ error: 'error processing callback' });
  }
});

// PayPal success/cancel placeholders
router.get('/paypal/success', async (req, res) => {
  // Validate PayPal payload here
  res.json({ ok: true });
});

router.get('/paypal/cancel', async (req, res) => {
  res.json({ ok: true });
});

export default router;
