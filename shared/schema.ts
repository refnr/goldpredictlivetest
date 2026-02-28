import { pgTable, text, serial, timestamp, doublePrecision, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const predictions = pgTable("predictions", {
  id: serial("id").primaryKey(),
  userId: text("user_id"),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  currentPrice: doublePrecision("current_price").notNull(),
  predictedPrice: doublePrecision("predicted_price").notNull(),
  direction: text("direction").notNull(),
  confidence: doublePrecision("confidence").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Track daily prediction usage per user
export const predictionUsage = pgTable("prediction_usage", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  usageDate: date("usage_date").notNull(),
  count: integer("count").notNull().default(0),
});

export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  timeframe: text("timeframe").notNull(),
  type: text("type").notNull(), // BUY, SELL, HOLD
  price: doublePrecision("price").notNull(),
  targetPrice: doublePrecision("target_price"),
  stopLoss: doublePrecision("stop_loss"),
  confidence: doublePrecision("confidence").notNull(),
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, HIT_TARGET, HIT_STOP, EXPIRED
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, createdAt: true });
export const insertSignalSchema = createInsertSchema(signals).omit({ id: true, createdAt: true });
export const insertPredictionUsageSchema = createInsertSchema(predictionUsage).omit({ id: true });

export type Prediction = typeof predictions.$inferSelect;
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type Signal = typeof signals.$inferSelect;
export type InsertSignal = z.infer<typeof insertSignalSchema>;
export type PredictionUsage = typeof predictionUsage.$inferSelect;
export type InsertPredictionUsage = z.infer<typeof insertPredictionUsageSchema>;

// API Types
export const TimeframeSchema = z.enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d", "1wk", "1mo"]);
export type Timeframe = z.infer<typeof TimeframeSchema>;

export const PredictRequestSchema = z.object({
  symbol: z.string().default("XAUUSD"),
  timeframe: TimeframeSchema.default("1h"),
});

export type PredictRequest = z.infer<typeof PredictRequestSchema>;

export const LivePriceSchema = z.object({
  symbol: z.string(),
  bid: z.number(),
  ask: z.number(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  high: z.number(),
  low: z.number(),
  timestamp: z.string(),
  source: z.string(),
});

export type LivePrice = z.infer<typeof LivePriceSchema>;

export const PredictionResponseSchema = z.object({
  symbol: z.string(),
  currentPrice: z.number(),
  predictedPrice: z.number(),
  change: z.number(),
  changePercent: z.number(),
  direction: z.enum(["UP", "DOWN", "NEUTRAL"]),
  confidence: z.number(),
  signal: z.enum(["BUY", "SELL", "HOLD"]),
  metrics: z.object({
    rmse: z.number(),
    mae: z.number(),
  }),
  analysis: z.object({
    rsi: z.number().optional(),
    macd: z.object({
      macd: z.number(),
      signal: z.number(),
      histogram: z.number()
    }).optional(),
    sma: z.number().optional(),
    ema: z.number().optional(),
    atr: z.number().optional(),
    bollingerBands: z.object({
      upper: z.number(),
      middle: z.number(),
      lower: z.number(),
    }).optional(),
    stochastic: z.object({
      k: z.number(),
      d: z.number(),
    }).optional(),
    trendStrength: z.number().optional(),
    trendDirection: z.enum(["UP", "DOWN", "NEUTRAL"]).optional(),
    indicatorConsensus: z.string().optional(),
  }),
  candles: z.array(z.object({
    time: z.string(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
  })),
  forecast: z.array(z.object({
    time: z.string(),
    price: z.number(),
  })),
});

export type PredictionResponse = z.infer<typeof PredictionResponseSchema>;

export const SignalResponseSchema = z.object({
  id: z.number(),
  symbol: z.string(),
  timeframe: z.string(),
  type: z.string(),
  price: z.number(),
  targetPrice: z.number().nullable(),
  stopLoss: z.number().nullable(),
  confidence: z.number(),
  status: z.string(),
  createdAt: z.string(),
  pnl: z.number().optional(),
});

export type SignalResponse = z.infer<typeof SignalResponseSchema>;

export const UserSettingsSchema = z.object({
  defaultTimeframe: TimeframeSchema,
  autoRefresh: z.boolean(),
  refreshInterval: z.number(),
  darkMode: z.boolean(),
  notifications: z.boolean(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export * from "./models/chat";
export * from "./models/auth";
