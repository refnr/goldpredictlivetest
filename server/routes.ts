import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { analyzeMarket } from "./prediction";
import { fetchLiveXAUUSD } from "./livePrice";

import { registerChatRoutes } from "./replit_integrations/chat";
import { setupAuth, registerAuthRoutes, isAuthenticated, authStorage } from "./replit_integrations/auth";
import { registerSubscriptionRoutes } from "./subscriptionRoutes";

// Prediction limits per subscription plan
const PLAN_PREDICTION_LIMITS: Record<string, number> = {
  free: 0,
  basic: 3,
  pro: 10,
  premium: Infinity,
};

// Developer email with permanent free access
const DEV_EMAIL = "furlan27.mattia@gmail.com";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication (MUST be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  // Register AI Chat routes
  registerChatRoutes(app);

  // Register Subscription routes
  registerSubscriptionRoutes(app);

  // Live price endpoint
  app.get(api.livePrice.get.path, async (req, res) => {
    try {
      const price = await fetchLiveXAUUSD();
      res.json(price);
    } catch (err) {
      console.error("Live price error:", err);
      res.status(500).json({ message: "Failed to fetch live price" });
    }
  });

  // Prediction endpoint with limit enforcement
  app.post(api.prediction.analyze.path, async (req, res) => {
    try {
      const input = api.prediction.analyze.input.parse(req.body);
      
      // Check if user is authenticated - REQUIRED for predictions
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          message: 'Authentication required to make predictions. Please log in.',
          code: 'AUTH_REQUIRED',
        });
      }
      
      const user = await authStorage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ 
          message: 'User not found. Please log in again.',
          code: 'USER_NOT_FOUND',
        });
      }
      
      let limit = 0;
      
      // Developer email bypass - unlimited predictions
      if (user.email === DEV_EMAIL) {
        limit = Infinity;
      } else {
        const plan = (user as any).subscriptionPlan || 'free';
        limit = PLAN_PREDICTION_LIMITS[plan] || 0;
      }
      
      // Get today's usage
      const usedToday = await storage.getDailyPredictionCount(userId);
      
      // Check if limit exceeded
      if (usedToday >= limit) {
        return res.status(429).json({ 
          message: `Daily prediction limit reached (${limit} per day). Upgrade your plan for more predictions.`,
          code: 'LIMIT_EXCEEDED',
          limit,
          used: usedToday,
        });
      }
      
      const result = await analyzeMarket(input);
      
      // Store prediction with user ID and increment counter
      await storage.createPrediction({
        userId: userId,
        symbol: result.symbol,
        timeframe: input.timeframe,
        currentPrice: result.currentPrice,
        predictedPrice: result.predictedPrice,
        direction: result.direction,
        confidence: result.confidence
      });
      
      // Increment user's daily counter
      await storage.incrementPredictionCount(userId);

      // Include usage info in response
      res.json({
        ...result,
        usage: {
          used: usedToday + 1,
          limit: limit === Infinity ? 'unlimited' : limit,
          remaining: limit === Infinity ? 'unlimited' : Math.max(0, limit - usedToday - 1),
        },
      });
    } catch (err) {
      console.error("Prediction Error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: (err as Error).message || "Internal Analysis Error" });
    }
  });

  // Signals endpoints (all require authentication)
  app.get(api.signals.list.path, isAuthenticated, async (req, res) => {
    try {
      const signals = await storage.getSignals(50);
      const livePrice = await fetchLiveXAUUSD();
      
      const signalsWithPnL = signals.map(s => ({
        ...s,
        createdAt: s.createdAt?.toISOString() || new Date().toISOString(),
        pnl: s.type === 'BUY' 
          ? livePrice.price - s.price 
          : s.type === 'SELL' 
            ? s.price - livePrice.price 
            : 0
      }));
      
      res.json(signalsWithPnL);
    } catch (err) {
      console.error("Signals list error:", err);
      res.status(500).json({ message: "Failed to fetch signals" });
    }
  });

  app.post(api.signals.generate.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.signals.generate.input.parse(req.body);
      const userId = (req.session as any)?.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required', code: 'AUTH_REQUIRED' });
      }

      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found', code: 'USER_NOT_FOUND' });
      }

      const plan = (user as any).subscriptionPlan || 'free';
      const isDev = user.email === DEV_EMAIL;

      const PLANS_WITH_SIGNALS = ['pro', 'premium'];
      if (!isDev && !PLANS_WITH_SIGNALS.includes(plan)) {
        return res.status(403).json({
          message: 'Trading signals are not available on your plan. Upgrade to Pro or Premium for access.',
          code: 'FEATURE_RESTRICTED',
        });
      }

      const prediction = await analyzeMarket({ symbol: 'XAUUSD', timeframe: input.timeframe });
      
      const targetMultiplier = prediction.direction === 'UP' ? 1.005 : 0.995;
      const stopMultiplier = prediction.direction === 'UP' ? 0.997 : 1.003;
      
      const signal = await storage.createSignal({
        symbol: 'XAUUSD',
        timeframe: input.timeframe,
        type: prediction.signal,
        price: prediction.currentPrice,
        targetPrice: prediction.currentPrice * targetMultiplier,
        stopLoss: prediction.currentPrice * stopMultiplier,
        confidence: prediction.confidence,
        status: 'ACTIVE'
      });
      
      res.json({
        ...signal,
        createdAt: signal.createdAt?.toISOString() || new Date().toISOString(),
      });
    } catch (err) {
      console.error("Signal generation error:", err);
      res.status(500).json({ message: "Failed to generate signal" });
    }
  });

  app.delete('/api/signals/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid signal ID" });
      }
      const deleted = await storage.deleteSignal(id);
      if (!deleted) {
        return res.status(404).json({ message: "Signal not found" });
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Signal delete error:", err);
      res.status(500).json({ message: "Failed to delete signal" });
    }
  });

  // Prediction usage endpoint - get user's daily prediction count
  app.get('/api/predictions/usage', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      // Developer email bypass
      let limit = 0;
      if (user.email === DEV_EMAIL) {
        limit = Infinity;
      } else {
        const plan = (user as any).subscriptionPlan || 'free';
        limit = PLAN_PREDICTION_LIMITS[plan] || 0;
      }
      
      const usedToday = await storage.getDailyPredictionCount(userId);
      
      res.json({
        used: usedToday,
        limit: limit === Infinity ? 'unlimited' : limit,
        remaining: limit === Infinity ? 'unlimited' : Math.max(0, limit - usedToday),
        plan: (user as any).subscriptionPlan || 'free',
      });
    } catch (err) {
      console.error("Usage check error:", err);
      res.status(500).json({ message: "Failed to get usage" });
    }
  });

  // Settings endpoints
  app.get(api.settings.get.path, (req, res) => {
    res.json(storage.getSettings());
  });

  app.put(api.settings.update.path, isAuthenticated, (req, res) => {
    try {
      const input = api.settings.update.input.parse(req.body);
      const updated = storage.updateSettings(input);
      res.json(updated);
    } catch (err) {
      console.error("Settings update error:", err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  return httpServer;
}
