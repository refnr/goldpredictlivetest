import type { Express, Request } from "express";
import rateLimit from "express-rate-limit";
import { stripeService } from "./services/stripeService";
import { getStripePublishableKey } from "./services/stripeClient";
import { isAuthenticated, hashPassword, verifyPassword } from "./replit_integrations/auth/replitAuth";
import { authStorage } from "./replit_integrations/auth/storage";
import { sendWelcomeEmail } from "./services/emailService";

function getBaseUrl(req: Request): string {
  if (process.env.APP_URL) {
    return process.env.APP_URL;
  }
  const replitDomain = process.env.REPLIT_DOMAINS?.split(',')[0];
  if (replitDomain) {
    return `https://${replitDomain}`;
  }
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
}

export function registerSubscriptionRoutes(app: Express): void {
  // Get Stripe publishable key for frontend
  app.get("/api/stripe/publishable-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Failed to get publishable key:", error);
      res.status(500).json({ error: "Failed to get Stripe configuration" });
    }
  });

  // Get available subscription plans (products with prices)
  app.get("/api/subscription/plans", async (req, res) => {
    try {
      const rows = await stripeService.listProductsWithPrices();
      
      // Group prices by product
      const productsMap = new Map();
      for (const row of rows as any[]) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unitAmount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
            metadata: row.price_metadata,
          });
        }
      }

      res.json({ plans: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Failed to list plans:", error);
      res.status(500).json({ error: "Failed to get subscription plans" });
    }
  });

  // Get current user's subscription status
  app.get("/api/subscription/status", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await stripeService.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // TEMPORARY PREVIEW BYPASS: Grant free access to admin email for dashboard preview
      const PREVIEW_EMAIL = "furlan27.mattia@gmail.com";
      if (user.email === PREVIEW_EMAIL) {
        return res.json({
          plan: 'premium',
          status: 'active',
          expiresAt: null,
          isActive: true,
          stripeCustomerId: user.stripeCustomerId,
          stripeSubscriptionId: user.stripeSubscriptionId,
        });
      }

      let subscriptionStatus = user.subscriptionStatus || 'inactive';
      let subscriptionPlan = user.subscriptionPlan || 'free';
      let subscriptionExpiresAt = user.subscriptionExpiresAt;
      let subscriptionStartedAt: Date | null = null;

      if (user.stripeSubscriptionId) {
        try {
          const { getUncachableStripeClient } = await import('./services/stripeClient');
          const stripe = await getUncachableStripeClient();
          const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId) as any;

          const stripeStatus = sub.status;
          if (stripeStatus === 'active' || stripeStatus === 'trialing') {
            subscriptionStatus = 'active';
          } else if (stripeStatus === 'past_due') {
            subscriptionStatus = 'past_due';
          } else if (stripeStatus === 'canceled' || stripeStatus === 'unpaid' || stripeStatus === 'incomplete_expired') {
            subscriptionStatus = 'canceled';
          } else if (stripeStatus === 'incomplete') {
            subscriptionStatus = 'inactive';
          }

          if (sub.current_period_end) {
            subscriptionExpiresAt = new Date(sub.current_period_end * 1000);
          }
          if (sub.start_date) {
            subscriptionStartedAt = new Date(sub.start_date * 1000);
          } else if (sub.created) {
            subscriptionStartedAt = new Date(sub.created * 1000);
          }

          const priceId = sub.items?.data?.[0]?.price?.id;
          if (priceId) {
            const price = await stripe.prices.retrieve(priceId);
            subscriptionPlan = stripeService.getPlanFromPrice(price.metadata, price.unit_amount || 0);
          }

          await stripeService.updateUserStripeInfo(user.id, {
            subscriptionStatus,
            subscriptionPlan,
            subscriptionExpiresAt,
          });
        } catch (e) {
          console.log('Could not verify subscription with Stripe, using cached data');
        }
      }

      const hasActiveStatus = subscriptionStatus === 'active' || subscriptionStatus === 'trialing';
      const notExpired = !subscriptionExpiresAt || new Date(subscriptionExpiresAt) > new Date();
      const isActive = hasActiveStatus && notExpired;

      res.json({
        plan: isActive ? subscriptionPlan : 'free',
        status: subscriptionStatus,
        expiresAt: subscriptionExpiresAt,
        startedAt: subscriptionStartedAt,
        isActive,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
      });
    } catch (error) {
      console.error("Failed to get subscription status:", error);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // Create checkout session for subscription (legacy redirect flow)
  app.post("/api/subscription/checkout", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const user = await stripeService.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.id);
        await stripeService.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const baseUrl = getBaseUrl(req);
      const session = await stripeService.createCheckoutSession(
        customerId,
        priceId,
        userId,
        `${baseUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/pricing`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Checkout session error:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // Create subscription with embedded payment (returns client_secret for Elements)
  app.post("/api/subscription/create-subscription", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const user = await stripeService.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create or get Stripe customer
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.id);
        await stripeService.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      // Create subscription with incomplete payment
      const result = await stripeService.createSubscriptionWithPaymentIntent(
        customerId,
        priceId,
        userId
      );

      res.json(result);
    } catch (error) {
      console.error("Create subscription error:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  // Confirm subscription after payment success
  app.post("/api/subscription/confirm", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { subscriptionId } = req.body;

      if (!subscriptionId) {
        return res.status(400).json({ error: "Subscription ID is required" });
      }

      const subscription = await stripeService.confirmSubscription(subscriptionId, userId);

      const user = await stripeService.getUser(userId);
      if (user) {
        const userName = user.firstName || undefined;
        sendWelcomeEmail(user.email, userName).catch(err => {
          console.error("Failed to send welcome email:", err);
        });
      }

      res.json({ success: true, status: subscription.status });
    } catch (error) {
      console.error("Confirm subscription error:", error);
      res.status(500).json({ error: "Failed to confirm subscription" });
    }
  });

  app.post("/api/subscription/change-plan", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "Price ID is required" });
      }

      const user = await stripeService.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription to change. Please subscribe first." });
      }

      const result = await stripeService.changeSubscriptionPlan(
        user.stripeSubscriptionId,
        priceId,
        userId
      );

      res.json({ 
        success: true, 
        plan: result.plan, 
        status: result.status,
        type: result.type,
        effectiveNow: result.effectiveNow,
        newPlan: (result as any).newPlan || null,
        effectiveDate: (result as any).effectiveDate || null,
        clientSecret: (result as any).clientSecret || null,
        paymentIntentId: (result as any).paymentIntentId || null,
        subscriptionId: (result as any).subscriptionId || null,
        amount: (result as any).amount || null,
        currency: (result as any).currency || null,
        currentPlanAmount: (result as any).currentPlanAmount || null,
        newPlanAmount: (result as any).newPlanAmount || null,
        currentPlan: user.subscriptionPlan || null,
      });
    } catch (error: any) {
      console.error("Change plan error:", error);
      res.status(500).json({ error: error.message || "Failed to change plan" });
    }
  });

  app.post("/api/subscription/confirm-upgrade", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { paymentIntentId } = req.body;

      if (!paymentIntentId) {
        return res.status(400).json({ error: "Payment intent ID is required" });
      }

      const user = await stripeService.getUser(userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      const result = await stripeService.confirmUpgradeAfterPayment(
        paymentIntentId,
        userId
      );

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Confirm upgrade error:", error);
      res.status(500).json({ error: error.message || "Failed to confirm upgrade" });
    }
  });

  // Create customer portal session for managing subscription
  app.post("/api/subscription/portal", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await stripeService.getUser(userId);
      
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ error: "No active subscription found" });
      }

      const baseUrl = getBaseUrl(req);
      const session = await stripeService.createCustomerPortalSession(
        user.stripeCustomerId,
        `${baseUrl}/settings`
      );

      res.json({ url: session.url });
    } catch (error) {
      console.error("Portal session error:", error);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });

  const checkoutRegisterLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: { error: "Too many checkout attempts. Please try again later." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.post("/api/subscription/checkout-register", checkoutRegisterLimiter, async (req, res) => {
    try {
      const { email, password, firstName, lastName, priceId } = req.body;

      if (!email || !password || !priceId) {
        return res.status(400).json({ error: "Email, password, and plan are required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email) || email.length > 255) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }

      if (password.length < 6 || password.length > 128) {
        return res.status(400).json({ error: "Password must be between 6 and 128 characters" });
      }

      if (firstName && firstName.length > 100) {
        return res.status(400).json({ error: "First name is too long" });
      }
      if (lastName && lastName.length > 100) {
        return res.status(400).json({ error: "Last name is too long" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      let user = await authStorage.getUserByEmail(normalizedEmail);
      let isNewUser = false;

      if (user) {
        const isAlreadyLoggedIn = req.session.userId === user.id;
        if (isAlreadyLoggedIn) {
          // User is already logged in with this account - proceed directly
        } else {
          const isValid = await verifyPassword(password, user.password);
          if (!isValid) {
            return res.status(401).json({ error: "An account with this email already exists. Please use the correct password or log in from the login page." });
          }
        }
      } else {
        const hashedPassword = await hashPassword(password);
        user = await authStorage.createUser({
          email: normalizedEmail,
          password: hashedPassword,
          firstName: firstName?.trim() || undefined,
          lastName: lastName?.trim() || undefined,
        });
        isNewUser = true;
      }

      req.session.userId = user.id;

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripeService.createCustomer(user.email, user.id);
        await stripeService.updateUserStripeInfo(user.id, { stripeCustomerId: customer.id });
        customerId = customer.id;
      }

      const result = await stripeService.createSubscriptionWithPaymentIntent(
        customerId,
        priceId,
        user.id
      );

      res.json({
        ...result,
        userId: user.id,
        isNewUser,
      });
    } catch (error: any) {
      console.error("Checkout register error:", error);
      res.status(500).json({ error: error.message || "Failed to process checkout" });
    }
  });

  // Webhook handler for subscription events (called internally only)
  // Protected: requires valid internal sync secret to prevent unauthorized subscription modifications
  app.post("/api/subscription/sync", async (req, res) => {
    const syncSecret = req.headers['x-sync-secret'];
    const expectedSecret = process.env.SYNC_SECRET;
    
    if (!expectedSecret || syncSecret !== expectedSecret) {
      return res.status(403).json({ error: "Forbidden" });
    }
    
    try {
      const { customerId, subscriptionId, status, plan, currentPeriodEnd } = req.body;
      
      const user = await stripeService.getUserByStripeCustomerId(customerId);
      if (user) {
        await stripeService.updateUserStripeInfo(user.id, {
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: status,
          subscriptionPlan: plan,
          subscriptionExpiresAt: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Subscription sync error:", error);
      res.status(500).json({ error: "Failed to sync subscription" });
    }
  });
}
