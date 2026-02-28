import Stripe from 'stripe';

let cachedCredentials: { publishableKey: string; secretKey: string } | null = null;

async function getCredentials() {
  if (cachedCredentials) return cachedCredentials;

  const publishableKey = process.env.STRIPE_LIVE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

  if (!publishableKey || !secretKey) {
    throw new Error(
      'Stripe credentials not found. Set STRIPE_LIVE_PUBLISHABLE_KEY and STRIPE_LIVE_SECRET_KEY environment variables.'
    );
  }

  cachedCredentials = { publishableKey, secretKey };
  console.log('Stripe credentials loaded from environment variables');
  return cachedCredentials;
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();

  return new Stripe(secretKey, {
    apiVersion: '2025-08-27.basil' as any,
  });
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}
