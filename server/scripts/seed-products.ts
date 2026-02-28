// Seed script to create subscription products and prices in Stripe
// Run this manually: npx tsx server/scripts/seed-products.ts

import { getUncachableStripeClient } from '../services/stripeClient';

async function createSubscriptionProducts() {
  const stripe = await getUncachableStripeClient();
  
  console.log('Creating Gold Predict Pro subscription products...\n');

  // Check if products already exist
  const existingProducts = await stripe.products.search({ 
    query: "metadata['app']:'goldpredict'" 
  });
  
  if (existingProducts.data.length > 0) {
    console.log('Found existing products. Archiving old ones to recreate...');
    for (const product of existingProducts.data) {
      const prices = await stripe.prices.list({ product: product.id });
      for (const price of prices.data) {
        if (price.active) {
          await stripe.prices.update(price.id, { active: false });
          console.log(`  Archived price: ${price.id}`);
        }
      }
      await stripe.products.update(product.id, { active: false });
      console.log(`  Archived product: ${product.name} (${product.id})`);
    }
    console.log('');
  }

  // Create Basic Plan
  const basicProduct = await stripe.products.create({
    name: 'Gold Predict Basic',
    description: 'Essential gold market analysis with RSI indicator and limited daily predictions',
    metadata: {
      app: 'goldpredict',
      plan: 'basic',
      features: 'live_price,basic_chart,rsi,3_predictions_daily',
    },
  });

  const basicPrice = await stripe.prices.create({
    product: basicProduct.id,
    unit_amount: 999, // $9.99
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'basic' },
  });

  console.log(`Created Basic Plan: ${basicProduct.id}`);
  console.log(`  Price: $9.99/month (${basicPrice.id})\n`);

  // Create Pro Plan
  const proProduct = await stripe.products.create({
    name: 'Gold Predict Pro',
    description: 'Advanced analysis with all technical indicators, more predictions, and trading signals',
    metadata: {
      app: 'goldpredict',
      plan: 'pro',
      features: 'live_price,advanced_chart,rsi,macd,sma,10_predictions_daily,signals,weekly_alerts',
    },
  });

  const proPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 1999, // $19.99
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'pro' },
  });

  console.log(`Created Pro Plan: ${proProduct.id}`);
  console.log(`  Price: $19.99/month (${proPrice.id})\n`);

  // Create Premium Plan
  const premiumProduct = await stripe.products.create({
    name: 'Gold Predict Premium',
    description: 'Full access with unlimited predictions, priority signals, premium AI reports, and real-time alerts',
    metadata: {
      app: 'goldpredict',
      plan: 'premium',
      features: 'live_price,premium_chart,all_indicators,unlimited_predictions,priority_signals,premium_ai,realtime_alerts',
    },
  });

  const premiumPrice = await stripe.prices.create({
    product: premiumProduct.id,
    unit_amount: 4999, // $49.99
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { plan: 'premium' },
  });

  console.log(`Created Premium Plan: ${premiumProduct.id}`);
  console.log(`  Price: $49.99/month (${premiumPrice.id})\n`);

  console.log('All products created successfully!');
  console.log('\nProducts will be synced to the database automatically via webhooks.');
}

createSubscriptionProducts().catch(console.error);
