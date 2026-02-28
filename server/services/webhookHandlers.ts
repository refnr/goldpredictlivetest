import { getUncachableStripeClient } from './stripeClient';
import { stripeService } from './stripeService';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured. Set it from your Stripe Dashboard webhook signing secret.');
    }

    const stripe = await getUncachableStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    await WebhookHandlers.handleStripeEvent(event);
  }

  static async handleStripeEvent(event: any): Promise<void> {
    const eventType = event.type;
    const data = event.data?.object;

    console.log(`Processing Stripe event: ${eventType}`);

    switch (eventType) {
      // Subscription created or updated
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await WebhookHandlers.handleSubscriptionUpdate(data);
        break;

      // Subscription renewed successfully (invoice paid)
      case 'invoice.payment_succeeded':
        if (data.subscription) {
          await WebhookHandlers.handleSubscriptionRenewal(data);
        }
        break;

      // Payment failed (subscription may be at risk)
      case 'invoice.payment_failed':
        if (data.subscription) {
          await WebhookHandlers.handlePaymentFailed(data);
        }
        break;

      // Subscription canceled or expired
      case 'customer.subscription.deleted':
        await WebhookHandlers.handleSubscriptionCanceled(data);
        break;

      default:
        // Log other events for debugging
        console.log(`Unhandled event type: ${eventType}`);
    }
  }

  // Handle subscription create/update events
  static async handleSubscriptionUpdate(subscription: any): Promise<void> {
    try {
      const customerId = subscription.customer;
      const user = await stripeService.getUserByStripeCustomerId(customerId);

      if (!user) {
        // Try to find user from subscription metadata
        const userId = subscription.metadata?.userId;
        if (userId) {
          await WebhookHandlers.updateUserSubscription(userId, subscription);
        }
        return;
      }

      await WebhookHandlers.updateUserSubscription(user.id, subscription);
    } catch (error) {
      console.error('Error handling subscription update:', error);
    }
  }

  // Handle successful subscription renewal
  static async handleSubscriptionRenewal(invoice: any): Promise<void> {
    try {
      const customerId = invoice.customer;
      const user = await stripeService.getUserByStripeCustomerId(customerId);

      if (!user) {
        console.log('No user found for customer:', customerId);
        return;
      }

      const stripe = await getUncachableStripeClient();
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription) as any;

      const pendingDowngradePriceId = subscription.metadata?.pendingDowngradePriceId;
      if (pendingDowngradePriceId) {
        const currentItemId = subscription.items.data[0]?.id;
        if (currentItemId) {
          await stripe.subscriptions.update(subscription.id, {
            items: [{
              id: currentItemId,
              price: pendingDowngradePriceId,
            }],
            proration_behavior: 'none',
            metadata: {
              ...subscription.metadata,
              pendingDowngradePriceId: '',
              pendingDowngradePlan: '',
              downgradeEffectiveDate: '',
            },
          });
          console.log(`Downgrade applied for user ${user.id} to price ${pendingDowngradePriceId}`);

          const newPrice = await stripe.prices.retrieve(pendingDowngradePriceId);
          const newPlan = stripeService.getPlanFromPrice(newPrice.metadata, newPrice.unit_amount || 0);

          await stripeService.updateUserStripeInfo(user.id, {
            stripeSubscriptionId: subscription.id,
            subscriptionPlan: newPlan,
            subscriptionStatus: 'active',
            subscriptionExpiresAt: new Date(subscription.current_period_end * 1000),
          });
          return;
        }
      }

      const priceId = subscription.items.data[0]?.price.id;
      const price = await stripe.prices.retrieve(priceId);
      const plan = stripeService.getPlanFromPrice(price.metadata, price.unit_amount || 0);

      await stripeService.updateUserStripeInfo(user.id, {
        stripeSubscriptionId: subscription.id,
        subscriptionPlan: plan,
        subscriptionStatus: 'active',
        subscriptionExpiresAt: new Date(subscription.current_period_end * 1000),
      });

      console.log(`Subscription renewed for user ${user.id}, new expiry: ${new Date(subscription.current_period_end * 1000)}`);
    } catch (error) {
      console.error('Error handling subscription renewal:', error);
    }
  }

  // Handle failed payment
  static async handlePaymentFailed(invoice: any): Promise<void> {
    try {
      const customerId = invoice.customer;
      const user = await stripeService.getUserByStripeCustomerId(customerId);

      if (!user) {
        return;
      }

      // Mark subscription as past_due (Stripe will retry payment)
      await stripeService.updateUserStripeInfo(user.id, {
        subscriptionStatus: 'past_due',
      });

      console.log(`Payment failed for user ${user.id}, subscription marked as past_due`);
      
      // TODO: Send email notification about failed payment
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  }

  // Handle subscription cancellation
  static async handleSubscriptionCanceled(subscription: any): Promise<void> {
    try {
      const customerId = subscription.customer;
      const user = await stripeService.getUserByStripeCustomerId(customerId);

      if (!user) {
        return;
      }

      await stripeService.updateUserStripeInfo(user.id, {
        subscriptionStatus: 'canceled',
        subscriptionExpiresAt: subscription.ended_at 
          ? new Date(subscription.ended_at * 1000) 
          : new Date(),
      });

      console.log(`Subscription canceled for user ${user.id}`);
    } catch (error) {
      console.error('Error handling subscription cancellation:', error);
    }
  }

  // Helper to update user subscription from subscription object
  static async updateUserSubscription(userId: string, subscription: any): Promise<void> {
    const stripe = await getUncachableStripeClient();
    
    // Get plan from price
    const priceId = subscription.items?.data?.[0]?.price?.id;
    let plan = 'basic';
    
    if (priceId) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        plan = stripeService.getPlanFromPrice(price.metadata, price.unit_amount || 0);
      } catch (e) {
        console.log('Could not retrieve price, using default plan');
      }
    }

    // Map Stripe status to our status
    // active/trialing = full access, past_due = grace period, canceled/unpaid/incomplete_expired = no access
    let status = 'inactive';
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      status = 'active';
    } else if (subscription.status === 'past_due') {
      status = 'past_due';
    } else if (subscription.status === 'canceled' || subscription.status === 'unpaid' || subscription.status === 'incomplete_expired') {
      status = 'canceled';
    }

    // If subscription is past_due and user currently has active status,
    // this may be a pending upgrade awaiting payment. Update status/expiry
    // but preserve the current plan to prevent premature access to upgraded features.
    const updateData: any = {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: status,
      subscriptionExpiresAt: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000) 
        : null,
    };

    if (subscription.status === 'past_due' || subscription.status === 'incomplete') {
      const user = await stripeService.getUser(userId);
      if (user && user.subscriptionPlan) {
        console.log(`Subscription ${subscription.id} is ${subscription.status} - keeping existing plan ${user.subscriptionPlan} until payment succeeds`);
      } else {
        updateData.subscriptionPlan = plan;
      }
    } else {
      updateData.subscriptionPlan = plan;
    }

    await stripeService.updateUserStripeInfo(userId, updateData);

    console.log(`Updated subscription for user ${userId}: plan=${updateData.subscriptionPlan || '(kept)'}, status=${status}`);
  }
}
