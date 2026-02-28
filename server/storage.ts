import { db } from "./db";
import {
  predictions,
  signals,
  predictionUsage,
  type Prediction,
  type InsertPrediction,
  type Signal,
  type InsertSignal,
  type PredictionUsage,
  type UserSettings
} from "@shared/schema";
import { desc, eq, and, sql } from "drizzle-orm";

// In-memory settings (could be persisted to DB later)
let userSettings: UserSettings = {
  defaultTimeframe: "1h",
  autoRefresh: true,
  refreshInterval: 30,
  darkMode: true,
  notifications: true,
};

export interface IStorage {
  createPrediction(prediction: InsertPrediction): Promise<Prediction>;
  getRecentPredictions(limit?: number): Promise<Prediction[]>;
  createSignal(signal: InsertSignal): Promise<Signal>;
  getSignals(limit?: number): Promise<Signal[]>;
  updateSignalStatus(id: number, status: string): Promise<Signal | undefined>;
  deleteSignal(id: number): Promise<boolean>;
  getSettings(): UserSettings;
  updateSettings(updates: Partial<UserSettings>): UserSettings;
  // Prediction usage tracking
  getDailyPredictionCount(userId: string): Promise<number>;
  incrementPredictionCount(userId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createPrediction(insertPrediction: InsertPrediction): Promise<Prediction> {
    const [prediction] = await db
      .insert(predictions)
      .values(insertPrediction)
      .returning();
    return prediction;
  }

  async getRecentPredictions(limit = 10): Promise<Prediction[]> {
    return await db.select().from(predictions).orderBy(desc(predictions.createdAt)).limit(limit);
  }

  async createSignal(insertSignal: InsertSignal): Promise<Signal> {
    const [signal] = await db
      .insert(signals)
      .values(insertSignal)
      .returning();
    return signal;
  }

  async getSignals(limit = 50): Promise<Signal[]> {
    return await db.select().from(signals).orderBy(desc(signals.createdAt)).limit(limit);
  }

  async updateSignalStatus(id: number, status: string): Promise<Signal | undefined> {
    const [updated] = await db
      .update(signals)
      .set({ status })
      .where(eq(signals.id, id))
      .returning();
    return updated;
  }

  async deleteSignal(id: number): Promise<boolean> {
    const result = await db
      .delete(signals)
      .where(eq(signals.id, id))
      .returning();
    return result.length > 0;
  }

  getSettings(): UserSettings {
    return userSettings;
  }

  updateSettings(updates: Partial<UserSettings>): UserSettings {
    userSettings = { ...userSettings, ...updates };
    return userSettings;
  }

  // Get today's prediction count for a user
  async getDailyPredictionCount(userId: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const result = await db
      .select({ count: predictionUsage.count })
      .from(predictionUsage)
      .where(
        and(
          eq(predictionUsage.userId, userId),
          eq(predictionUsage.usageDate, today)
        )
      );
    
    return result[0]?.count || 0;
  }

  // Increment prediction count for today
  async incrementPredictionCount(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Try to update existing record, or insert new one
    const existing = await db
      .select()
      .from(predictionUsage)
      .where(
        and(
          eq(predictionUsage.userId, userId),
          eq(predictionUsage.usageDate, today)
        )
      );
    
    if (existing.length > 0) {
      // Update existing record
      await db
        .update(predictionUsage)
        .set({ count: sql`${predictionUsage.count} + 1` })
        .where(
          and(
            eq(predictionUsage.userId, userId),
            eq(predictionUsage.usageDate, today)
          )
        );
    } else {
      // Insert new record
      await db.insert(predictionUsage).values({
        userId,
        usageDate: today,
        count: 1,
      });
    }
  }
}

export const storage = new DatabaseStorage();
