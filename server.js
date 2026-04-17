import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Pawly Payment Server is running! 🐾'
  });
});

// Crear PaymentIntent para cobrar un producto
// El frontend envía: { productId, productName, amount, currency }
// amount debe venir en centavos (ej: $10 MXN = 1000)
app.post('/create-payment-intent', async (req, res) => {
  try {
    const { productId, productName, amount, currency = 'mxn' } = req.body;

    // Monto mínimo de Stripe: 10 MXN = 1000 centavos
    if (!amount || amount < 1000) {
      return res.status(400).json({
        error: 'Monto mínimo: $10.00 MXN'
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      metadata: {
        productId: String(productId),
        productName,
        store: 'Pawly'
      },
      description: `Pawly – ${productName}`,
    });

    res.json({ clientSecret: paymentIntent.client_secret });

  } catch (error) {
    console.error('Error creando PaymentIntent:', error);
    res.status(500).json({ error: error.message });
  }
});

// (Opcional) Crear sesión Checkout de Stripe
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { productId, productName, amount, currency = 'mxn' } = req.body;

    if (!amount || amount < 1000) {
      return res.status(400).json({
        error: 'Monto mínimo: $10.00 MXN'
      });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: productName,
              description: 'Pawly Pet Shop',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/index.html?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${frontendUrl}/index.html?payment=cancelled`,
      metadata: {
        productId: String(productId),
        store: 'Pawly'
      },
    });

    res.json({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('Error creando Checkout Session:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
  console.log(`🐾 Pawly server running on port ${PORT}`);
});