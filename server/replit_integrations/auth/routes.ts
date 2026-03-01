import type { Express } from "express";
import rateLimit from "express-rate-limit";
import { authStorage } from "./storage";
import { isAuthenticated, hashPassword, verifyPassword } from "./replitAuth";
import { registerSchema, loginSchema, updateProfileSchema } from "@shared/models/auth";
import { z } from "zod";
import { sendWelcomeEmail } from "../../services/emailService";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: "Too many accounts created. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerAuthRoutes(app: Express): void {
  app.post("/api/auth/register", registerLimiter, async (req, res) => {
    try {
            const input = registerSchema.parse(req.body);
      const normalizedEmail = input.email.toLowerCase().trim();
      
      const existingUser = await authStorage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      
      const hashedPassword = await hashPassword(input.password);
      const user = await authStorage.createUser({
        email: normalizedEmail,
        password: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
      });
      
      req.session.userId = user.id;
      
      const userName = user.firstName || undefined;
      sendWelcomeEmail(user.email, userName).catch(err => {
        console.error("Failed to send welcome email:", err);
      });
      
      res.json(authStorage.getUserResponse(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
            const input = loginSchema.parse(req.body);
      const normalizedEmail = input.email.toLowerCase().trim();
      
      const user = await authStorage.getUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ message: "No account found with this email" });
      }
      
      const isValid = await verifyPassword(input.password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Incorrect password. Please try again." });
      }
      
      req.session.userId = user.id;
      
      res.json(authStorage.getUserResponse(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await authStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(authStorage.getUserResponse(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user profile (nickname)
  app.put("/api/auth/profile", isAuthenticated, async (req, res) => {
    try {
      const input = updateProfileSchema.parse(req.body);
      const userId = req.session.userId!;
      
      const user = await authStorage.updateNickname(userId, input.nickname);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(authStorage.getUserResponse(user));
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
}
