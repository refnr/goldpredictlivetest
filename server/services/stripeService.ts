// Stripe service for subscription management
import { getUncachableStripeClient } from './stripeClient';
import { db } from '../db';
import { users } from '@shared/models/auth';
import { eq } from 'drizzle-orm';

export class StripeService {
  // Create customer in Stripe
  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.customers.create({
      email,
      metadata: { userId },
    });
  }

  // Create checkout session for subscription (for redirect flow - deprecated)
  async createCheckoutSession(
    customerId: string,
    priceId: string,
    userId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    const stripe = await getUncachableStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });
  }

  // Create subscription with incomplete payment for embedded Elements
  async createSubscriptionWithPaymentIntent(
    customerId: string,
    priceId: string,
    userId: string
  ) {
    const stripe = await getUncachableStripeClient();
    
    // Cancel stale incomplete subscriptions (older than 60 seconds) to avoid conflicts
    const existingSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: 'incomplete',
    });
    const staleThreshold = Math.floor(Date.now() / 1000) - 60;
    for (const sub of existingSubs.data) {
      if (sub.created < staleThreshold) {
        try {
          await stripe.subscriptions.cancel(sub.id);
        } catch (e) {
          console.warn('Could not cancel stale incomplete subscription:', sub.id);
        }
      }
    }

    // Create the subscription with payment_behavior: 'default_incomplete'
    // This returns a client_secret that can be used with Stripe Elements
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId },
    });

    // Try to get client_secret from expanded invoice.payment_intent (works in older API versions)
    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;

    if (paymentIntent?.client_secret) {
      return {
        subscriptionId: subscription.id,
        clientSecret: paymentIntent.client_secret,
        status: subscription.status,
      };
    }

    // In newer Stripe API versions (basil+), payment_intent is not on the invoice object.
    // Get the invoice ID to match against payment intents deterministically.
    const invoiceId = typeof invoice === 'string' ? invoice : invoice?.id;
    const subCreatedAt = (subscription as any).created || Math.floor(Date.now() / 1000);
    
    const paymentIntents = await stripe.paymentIntents.list({
      customer: customerId,
      created: { gte: subCreatedAt - 10 },
      limit: 10,
    });
    
    // First try: match PI to the subscription's invoice for deterministic linkage
    if (invoiceId) {
      const invoiceLinkedPi = paymentIntents.data.find(
        pi => (pi as any).invoice === invoiceId
      );
      if (invoiceLinkedPi?.client_secret) {
        return {
          subscriptionId: subscription.id,
          clientSecret: invoiceLinkedPi.client_secret,
          status: subscription.status,
        };
      }
    }

    // Fallback: find the most recently created PI needing payment
    const pendingPi = paymentIntents.data.find(
      pi => pi.status === 'requires_payment_method' || pi.status === 'requires_confirmation'
    );
    
    if (pendingPi?.client_secret) {
      return {
        subscriptionId: subscription.id,
        clientSecret: pendingPi.client_secret,
        status: subscription.status,
      };
    }

    throw new Error('Failed to create payment intent');
  }

  // Confirm subscription after successful payment
  async confirmSubscription(subscriptionId: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Verify the subscription belongs to the authenticated user
    const user = await this.getUser(userId);
    if (!user || subscription.customer !== user.stripeCustomerId) {
      if (subscription.metadata?.userId !== userId) {
        throw new Error('Subscription does not belong to this user');
      }
    }
    
    // Get price info to determine plan
    const priceId = subscription.items.data[0]?.price.id;
    const price = await stripe.prices.retrieve(priceId);
    const plan = this.getPlanFromPrice(price.metadata, price.unit_amount || 0);
    
    // Map Stripe subscription status to our status
    // After successful payment, status should be 'active'
    // Also accept 'trialing' as active
    const sub = subscription as any;
    let status = 'inactive';
    if (sub.status === 'active' || sub.status === 'trialing') {
      status = 'active';
    } else if (sub.status === 'past_due') {
      status = 'past_due';
    } else if (sub.status === 'incomplete') {
      // Payment was just confirmed, Stripe may still show incomplete briefly
      // Check if the latest invoice is paid
      const invoice = sub.latest_invoice;
      if (typeof invoice === 'string') {
        const invoiceObj = await stripe.invoices.retrieve(invoice);
        if (invoiceObj.status === 'paid') {
          status = 'active';
        }
      } else if (invoice?.status === 'paid') {
        status = 'active';
      }
    }

    await this.updateUserStripeInfo(userId, {
      stripeCustomerId: subscription.customer as string,
      stripeSubscriptionId: subscriptionId,
      subscriptionPlan: plan,
      subscriptionStatus: status,
      subscriptionExpiresAt: sub.current_period_end 
        ? new Date(sub.current_period_end * 1000) 
        : null,
    });

    return subscription;
  }

  async changeSubscriptionPlan(subscriptionId: string, newPriceId: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    let subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice'],
    });
    
    if (subscription.metadata?.userId !== userId) {
      const user = await this.getUser(userId);
      if (!user || subscription.customer !== user.stripeCustomerId) {
        throw new Error('Subscription does not belong to this user');
      }
    }

    const sub = subscription as any;
    if (sub.schedule) {
      try {
        await stripe.subscriptionSchedules.release(sub.schedule as string);
        subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ['latest_invoice'],
        });
      } catch (e) {
        console.log('Could not release existing schedule, continuing:', (e as Error).message);
      }
    }

    const currentItemId = subscription.items.data[0]?.id;
    if (!currentItemId) {
      throw new Error('No subscription item found');
    }

    const currentPrice = subscription.items.data[0]?.price;
    const newPrice = await stripe.prices.retrieve(newPriceId);
    const currentAmount = currentPrice?.unit_amount || 0;
    const newAmount = newPrice.unit_amount || 0;
    const newPlan = this.getPlanFromPrice(newPrice.metadata as any, newAmount);

    // Use the user's DB plan to determine upgrade/downgrade direction.
    // This handles cases where Stripe items were already updated by a previous
    // incomplete upgrade attempt (items changed but payment not yet made).
    const user = await this.getUser(userId);
    const PLAN_ORDER: Record<string, number> = { basic: 0, pro: 1, premium: 2 };
    const userDbPlan = user?.subscriptionPlan || 'basic';
    const isUpgrade = (PLAN_ORDER[newPlan] ?? 0) > (PLAN_ORDER[userDbPlan] ?? 0);

    if (isUpgrade) {
      const PLAN_PRICE_MAP: Record<string, number> = { basic: 999, pro: 1999, premium: 4999 };
      const currentPlanAmount = PLAN_PRICE_MAP[userDbPlan] || currentAmount;

      const sub = subscription as any;
      const periodStart = sub.current_period_start || 0;
      const periodEnd = sub.current_period_end || 0;
      const now = Math.floor(Date.now() / 1000);
      const totalSeconds = periodEnd - periodStart;
      const remainingSeconds = Math.max(0, periodEnd - now);
      const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 1;

      let chargeAmount = Math.max(50, Math.round((newAmount - currentPlanAmount) * ratio));
      console.log(`Upgrade charge calc: new=${newAmount} old=${currentPlanAmount} ratio=${ratio.toFixed(3)} charge=${chargeAmount}`);

      const customerId = user?.stripeCustomerId;
      if (!customerId) {
        throw new Error('No Stripe customer found for this user');
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: chargeAmount,
        currency: newPrice.currency || 'usd',
        customer: customerId,
        metadata: {
          type: 'upgrade',
          userId,
          subscriptionId,
          newPriceId,
          newPlan,
          oldPlan: userDbPlan,
        },
        automatic_payment_methods: { enabled: true },
      });

      console.log(`Created upgrade PI: ${paymentIntent.id} amount=${chargeAmount} clientSecret=${paymentIntent.client_secret ? 'yes' : 'no'}`);

      return { 
        plan: newPlan, 
        status: 'requires_payment', 
        type: 'upgrade' as const, 
        effectiveNow: false,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        subscriptionId,
        amount: chargeAmount,
        currency: newPrice.currency || 'usd',
        currentPlanAmount,
        newPlanAmount: newAmount,
      };
    } else {
      const sub = subscription as any;
      const periodEnd = sub.current_period_end;

      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        metadata: {
          ...subscription.metadata,
          pendingDowngradePriceId: newPriceId,
          pendingDowngradePlan: newPlan,
          downgradeEffectiveDate: periodEnd ? new Date(periodEnd * 1000).toISOString() : '',
        },
      });

      const currentPlan = this.getPlanFromPrice(currentPrice?.metadata as any || {}, currentAmount);

      return { 
        plan: currentPlan, 
        status: 'active', 
        type: 'downgrade' as const, 
        effectiveNow: false,
        newPlan: newPlan,
        effectiveDate: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
      };
    }
  }

  async confirmUpgradeAfterPayment(paymentIntentId: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== 'succeeded') {
      throw new Error(`Payment has not been completed. Status: ${pi.status}`);
    }

    if (pi.metadata?.userId !== userId) {
      throw new Error('Payment does not belong to this user');
    }

    if (pi.metadata?.type !== 'upgrade') {
      throw new Error('This payment is not for an upgrade');
    }

    const { subscriptionId, newPriceId, newPlan } = pi.metadata;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const currentItemId = subscription.items.data[0]?.id;
    if (!currentItemId) {
      throw new Error('No subscription item found');
    }

    await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: currentItemId, price: newPriceId }],
      proration_behavior: 'none',
    });

    await this.updateUserStripeInfo(userId, {
      subscriptionPlan: newPlan,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000)
        : null,
    });

    console.log(`Upgrade confirmed for user ${userId}: plan=${newPlan}, PI=${paymentIntentId}`);

    return { plan: newPlan, status: 'active' };
  }

  // Create customer portal session for managing subscription
  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  // Get user by ID
  async getUser(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  // Update user's Stripe info
  async updateUserStripeInfo(userId: string, stripeInfo: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionPlan?: string;
    subscriptionStatus?: string;
    subscriptionExpiresAt?: Date | null;
  }) {
    const [user] = await db
      .update(users)
      .set({ ...stripeInfo, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Get user by Stripe customer ID
  async getUserByStripeCustomerId(stripeCustomerId: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async listProducts() {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 100 });
    return products.data.filter((p: any) => p.metadata?.app === 'goldpredict');
  }

  async listProductsWithPrices() {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 100 });
    const goldProducts = products.data.filter((p: any) => p.metadata?.app === 'goldpredict');

    const seenPlans = new Map<string, any>();
    const sorted = goldProducts.sort((a: any, b: any) => (b.created || 0) - (a.created || 0));
    for (const p of sorted) {
      const planKey = (p.metadata as any)?.plan;
      if (planKey && !seenPlans.has(planKey)) {
        seenPlans.set(planKey, p);
      }
    }

    const rows: any[] = [];
    for (const product of seenPlans.values()) {
      const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
      for (const price of prices.data) {
        rows.push({
          product_id: product.id,
          product_name: product.name,
          product_description: product.description,
          product_active: product.active,
          product_metadata: product.metadata,
          price_id: price.id,
          unit_amount: price.unit_amount,
          currency: price.currency,
          recurring: price.recurring,
          price_active: price.active,
          price_metadata: price.metadata,
        });
      }
    }
    rows.sort((a, b) => (a.unit_amount || 0) - (b.unit_amount || 0));
    return rows;
  }

  async getSubscription(subscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.subscriptions.retrieve(subscriptionId);
  }

  async getPrice(priceId: string) {
    const stripe = await getUncachableStripeClient();
    return await stripe.prices.retrieve(priceId);
  }

  // Map price to plan name based on metadata or amount
  getPlanFromPrice(priceMetadata: any, unitAmount: number): string {
    if (priceMetadata?.plan) {
      return priceMetadata.plan;
    }
    // Fallback based on price amount (in cents)
    if (unitAmount <= 999) return 'basic';
    if (unitAmount <= 1999) return 'pro';
    return 'premium';
  }
}

export const stripeService = new StripeService();
