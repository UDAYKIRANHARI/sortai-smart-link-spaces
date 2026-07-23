import express from 'express';
import Stripe from 'stripe';
import { getDb } from '../services/db';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Create Checkout Session
router.post('/create-checkout-session', express.json(), async (req, res) => {
  try {
    const { userId, planId, email } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const db = getDb();
    const userDoc = await db.collection('users').doc(userId).get();
    
    const userData = userDoc.exists ? userDoc.data() : {};
    let customerId = userData?.stripeCustomerId;

    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || userData?.email || 'user@sortai.dev', // Ensure you have email stored or pass it
        metadata: { firebaseUID: userId }
      });
      customerId = customer.id;
      await db.collection('users').doc(userId).set({ stripeCustomerId: customerId }, { merge: true });
    }

    // Determine price ID based on plan (Monthly, Yearly, Lifetime)
    let priceId = '';
    let mode: 'payment' | 'subscription' = 'subscription';
    
    if (planId === 'monthly') {
      priceId = 'price_1TwIjN7Yr7cQWrDuiusX1QVn';
      mode = 'subscription';
    } else if (planId === 'yearly') {
      priceId = 'price_1TwIp07Yr7cQWrDuVhS0f64F';
      mode = 'subscription';
    } else if (planId === 'lifetime') {
      priceId = 'price_1TwItw7Yr7cQWrDudElfhEzh';
      mode = 'payment';
    } else {
      return res.status(400).json({ error: 'Invalid planId' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: mode,
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pricing`,
      metadata: {
        firebaseUID: userId,
        planId: planId
      }
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Webhook for Stripe
// Note: This route needs to use express.raw({type: 'application/json'}) in index.ts
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      event = req.body;
      console.warn("⚠️ No STRIPE_WEBHOOK_SECRET set, assuming local dev and trusting payload.");
      if (typeof event === 'string') event = JSON.parse(event);
    }
  } catch (err: any) {
    console.error(`Webhook signature verification failed:`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  const db = getDb();
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const firebaseUID = session.metadata?.firebaseUID;
    
    if (firebaseUID) {
      console.log(`✅ Payment successful for user: ${firebaseUID}. Upgrading to PRO.`);
      await db.collection('users').doc(firebaseUID).set({
        tier: 'pro',
        billingCycleEnd: session.mode === 'payment' ? 'lifetime' : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // approx 1 month for now
      }, { merge: true });
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.status(200).send();
});

export default router;
