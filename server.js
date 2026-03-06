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
        message: 'Kittens Payment Server is running! 🐱' 
    });
});

// Crear sesión de Stripe Checkout
app.post('/create-checkout-session', async (req, res) => {
    try {
        const { amount, description } = req.body;

        if (!amount || amount < 50) {
            return res.status(400).json({ 
                error: 'Monto mínimo: $0.50 USD' 
            });
        }

        // URL base del frontend (cambiará según el entorno)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: description,
                            description: 'Premium cat content subscription',
                        },
                        unit_amount: amount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${frontendUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${frontendUrl}/premium.html`,
        });

        res.json({ sessionId: session.id });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});