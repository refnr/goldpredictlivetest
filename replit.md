# Gold Predict - XAUUSD Market Analysis Platform

## Overview

Gold Predict is a real-time gold price prediction and market analysis platform focused on XAU/USD (Gold Spot vs US Dollar). The application provides live price tracking, technical analysis with indicators (RSI, MACD, SMA), price predictions using statistical models, and trading signal generation. Built as a full-stack TypeScript application with a React frontend and Express backend, it features a professional dark-themed financial dashboard interface.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming (dark financial theme with gold accents)
- **Charts**: Recharts for candlestick and trend visualization
- **Build Tool**: Vite with custom path aliases (@/, @shared/, @assets/)

### Backend Architecture
- **Framework**: Express 5 on Node.js with TypeScript
- **API Pattern**: REST API with typed route definitions in shared/routes.ts
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Validation**: Zod schemas for request/response validation with drizzle-zod integration
- **Structure**: Modular file organization (routes.ts, storage.ts, prediction.ts, livePrice.ts)

### Data Flow Pattern
1. Shared schema definitions in `/shared/schema.ts` define database tables and API types
2. Route contracts defined in `/shared/routes.ts` ensure type safety across client/server
3. Frontend uses custom hooks (use-prediction.ts) wrapping React Query mutations
4. Backend storage layer abstracts database operations with interface-based design

### Key Design Decisions
- **Monorepo Structure**: Client code in `/client`, server in `/server`, shared types in `/shared`
- **Type Sharing**: Zod schemas and TypeScript types shared between frontend and backend
- **Price Data Fallback**: Multiple price source strategy with caching and simulated fallback for demo purposes
- **Technical Analysis**: Uses yahoo-finance2 for market data and technicalindicators library for RSI/MACD/SMA calculations
- **Market Hours**: Dynamic market status indicator (client/src/lib/marketHours.ts) — Gold/forex markets open Sunday 5pm ET to Friday 5pm ET. Shown in dashboard header with live open/closed status and next change time.

### Database Schema
- **predictions**: Stores prediction history (symbol, timeframe, prices, direction, confidence)
- **signals**: Trading signals with entry/target/stop-loss prices and status tracking

## External Dependencies

### Data Sources
- **Yahoo Finance API**: Primary source for historical OHLC candle data via yahoo-finance2 package
- **Metal Price APIs**: Multiple fallback sources for live XAUUSD spot prices
- **Simulated Data**: Fallback price generation when all external sources fail

### Database
- **PostgreSQL**: Primary database via DATABASE_URL environment variable
- **Drizzle Kit**: Database migrations and schema management (`npm run db:push`)

### Third-Party Services
- **Google Fonts**: DM Sans, Space Grotesk, JetBrains Mono for typography
- **Replit Plugins**: Runtime error overlay, cartographer, and dev banner for development environment

### Key NPM Packages
- **technicalindicators**: RSI, MACD, SMA technical analysis calculations
- **simple-statistics**: Statistical analysis for prediction models
- **date-fns**: Date formatting and manipulation
- **connect-pg-simple**: PostgreSQL session store for sessions
- **passport**: Authentication middleware with OpenID Connect strategy

## Authentication System

### Overview
User authentication uses email/password with inline forms (no external OAuth or popups). Users sign up and log in directly on the page.

### Key Components
- **useAuth hook** (`client/src/hooks/use-auth.ts`): React hook for authentication state and actions (login, register, logout)
- **DashboardLayout** (`client/src/components/DashboardLayout.tsx`): Wraps all routes and enforces auth
- **AuthRequiredScreen**: Inline login/signup form with toggle between modes
- **UserProfileButton**: Header component showing user avatar with dropdown menu

### Routes
- `POST /api/auth/register`: Creates new user account (body: {email, password, firstName?, lastName?})
- `POST /api/auth/login`: Authenticates user (body: {email, password})
- `POST /api/auth/logout`: Logs out the user
- `GET /api/auth/user`: Returns current user info (or 401 if not logged in)

### Security
- Passwords hashed with bcrypt (10 salt rounds)
- Sessions stored in PostgreSQL with express-session + connect-pg-simple
- SESSION_SECRET environment variable required (no fallback)
- Cookies use sameSite: "lax" for CSRF protection

### User Flow
1. Unauthenticated users see inline login form with Gold Predict branding
2. Users can toggle between "Sign In" and "Create Account" modes
3. User enters email and password, clicks Confirm
4. On success, dashboard is displayed (no page redirect)
5. User profile button shows email and sign out option

### Welcome Email
When users register, they receive an automated welcome email containing:
- Getting started guide with dashboard overview
- Technical indicators explanation (RSI, MACD, SMA)
- AI predictions and trading signals features
- Pro tips for using the platform
- Important disclaimer about financial advice

Email is sent via SMTP using nodemailer (server/services/emailService.ts). Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM env vars. If SMTP is not configured, emails are silently skipped (app still works). For Gmail: use smtp.gmail.com with an App Password.

### Database Schema
- **users**: Stores user information (id, email, password, firstName, lastName, profileImageUrl, stripeCustomerId, stripeSubscriptionId, subscriptionPlan, subscriptionStatus, subscriptionExpiresAt, createdAt, updatedAt)
- **sessions**: Stores session data for authenticated users
- **predictionUsage**: Tracks daily prediction count per user (userId, usageDate, count) - resets daily at UTC midnight

## Subscription System

### Overview
Monetization via Stripe subscription with 3 tiers. Users must have an active paid subscription to access premium features.

### Subscription Tiers
- **Basic** ($9.99/month): RSI indicator, 3 predictions per day
- **Pro** ($19.99/month): RSI/MACD/SMA indicators, 10 predictions per day, trading signals, weekly alerts
- **Premium** ($49.99/month): All indicators, unlimited predictions, priority signals, premium AI reports, real-time email alerts

### User Flow (Public-First Architecture with Combined Checkout+Registration)
1. **Landing Page** (`/`): Pricing page shown first - no auth required
2. **Select Plan**: User clicks "Get Started" on a plan
3. **Checkout Page** (`/checkout?plan=...`): Combined account creation + payment form
   - Email/password fields for account creation (or login for existing users)
   - Optional first/last name fields for new users
   - Card input form with Stripe Elements (no external redirects)
   - Account is created and subscription linked in one step
   - Welcome email sent after successful payment confirmation
4. **Success**: Payment confirmation shown on same page, then redirect to dashboard
5. **Dashboard** (`/dashboard`): Protected - requires auth + active subscription
6. **Login** (`/login`): Separate login page for returning users
7. **Upgrade Plan** (`/upgrade`): Dedicated page for logged-in users to change plans
   - Recognizes logged-in user's email and current plan
   - Shows available plans with current plan highlighted
   - Allows one-click plan upgrade/downgrade via Stripe subscription update
   - Prorated billing handled automatically

### Prediction vs Signal Limits
- **Analyses** (Dashboard + Market Analysis pages): Subject to daily limits per plan (Basic: 3/day, Pro: 10/day, Premium: unlimited)
- **Trading Signals** (Live Signals page): Unlimited for Pro and Premium plans; not available for Basic plan
- Signal generation does NOT count against the daily analysis limit

### Key Components
- **LandingPricing** (`client/src/pages/LandingPricing.tsx`): Public landing page with plan comparison
- **Checkout** (`client/src/pages/Checkout.tsx`): Combined registration + payment form with Stripe Elements
- **Login** (`client/src/pages/Login.tsx`): Auth page for returning subscribers
- **UpgradePlan** (`client/src/pages/UpgradePlan.tsx`): Plan change page for existing subscribers
- **useSubscription hook** (`client/src/hooks/use-subscription.ts`): React hook for subscription status and feature gating
- **useCheckoutRegister hook**: Combined registration + Stripe subscription creation mutation
- **SubscriptionSuccess Page** (`client/src/pages/SubscriptionSuccess.tsx`): Post-checkout confirmation
- **SubscriptionRequiredScreen**: Shown when authenticated user has no active subscription

### Backend Services
- **stripeClient.ts**: Stripe API client using environment variables (STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY) - configured manually instead of Replit connector
- **stripeService.ts**: Customer/checkout/portal session management
- **webhookHandlers.ts**: Processes Stripe webhooks via stripe-replit-sync
- **subscriptionRoutes.ts**: API routes for subscription management

### API Routes
- `GET /api/stripe/publishable-key`: Get Stripe publishable key for frontend
- `GET /api/subscription/plans`: List available subscription products with prices
- `GET /api/subscription/status`: Get current user's subscription status (requires auth)
- `POST /api/subscription/checkout-register`: Combined registration + Stripe subscription creation (no auth required, rate-limited)
- `POST /api/subscription/create-subscription`: Create subscription for logged-in user (requires auth)
- `POST /api/subscription/confirm`: Confirm subscription after payment + send welcome email (requires auth)
- `POST /api/subscription/checkout`: Create Stripe checkout session (requires auth, legacy)
- `POST /api/subscription/change-plan`: Change subscription plan for logged-in user (requires auth, prorated)
- `POST /api/subscription/portal`: Create Stripe customer portal session (requires auth)
- `POST /api/stripe/webhook`: Stripe webhook endpoint (raw body, registered before express.json)

### Feature Gating
The PLAN_FEATURES constant in use-subscription.ts defines what each plan includes:
- `predictions`: Daily prediction limit
- `indicators`: Available technical indicators
- `signals`: Access to trading signals
- `analysis`: Access to AI market analysis
- `alerts`: Real-time email alerts

### Prediction Limit Enforcement
- Authentication is required for all predictions (401 returned if not logged in)
- Daily limits enforced per subscription plan:
  - Free: 0 predictions (must subscribe)
  - Basic: 3 predictions per day
  - Pro: 10 predictions per day
  - Premium: Unlimited predictions
- Developer email (furlan27.mattia@gmail.com) has unlimited predictions bypass
- Usage tracked in predictionUsage table, resets at UTC midnight
- API endpoint: `GET /api/predictions/usage` returns current usage and limits
- Frontend displays remaining predictions badge and disables analyze button when limit reached

### Stripe Integration (LIVE MODE)
- **Mode**: Live mode (real payments) — switched from test mode on 2026-02-25
- **No stripe-replit-sync**: Direct Stripe API calls for products, prices, and subscriptions
- **Credentials**: Uses `STRIPE_LIVE_PUBLISHABLE_KEY` and `STRIPE_LIVE_SECRET_KEY` env vars (falls back to `STRIPE_PUBLISHABLE_KEY`/`STRIPE_SECRET_KEY`)
- **Webhook**: Manual setup in Stripe Dashboard; signing secret stored in `STRIPE_WEBHOOK_SECRET`
- User subscription info stored in the users table
- Seed script: `npx tsx server/scripts/seed-products.ts` to create products in Stripe
- Live product IDs: prod_U2jOZofwctqxng (Basic), prod_U2jO0OTs76Gtmn (Pro), prod_U2jOhcfSamyOLN (Premium)
- Webhook endpoint: `/api/stripe/webhook`
- Customer Portal: Enabled with subscription cancellation (at period end), payment method updates, invoice history
- No money-back guarantee — users are responsible for their own investment decisions

### Subscription Access Rules
- Dashboard access requires active subscription with confirmed payment
- `active` or `trialing` status = full access
- `past_due` = NO access (payment must succeed first)
- `canceled`, `inactive`, `incomplete` = NO access
- Subscription status verified in real-time against Stripe API on each status check
- Auto-renewal enabled by default; users cancel via Stripe Customer Portal
- Upgrades: prorated charge for remaining days, immediate plan change after payment
- Downgrades: scheduled for end of current billing period, no immediate change

### User Flow
1. User views pricing page with 3 plan options
2. User clicks Subscribe on desired plan
3. Combined checkout: account creation + Stripe Elements payment form
4. After successful payment, subscription confirmed and dashboard access granted
5. Webhook keeps subscription status synced with Stripe
6. User can manage/cancel subscription via Customer Portal from Settings page