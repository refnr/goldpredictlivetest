# Gold Predict - Local Setup Guide (Windows)

This guide explains how to run Gold Predict on your Windows computer.

---

## Prerequisites

You need to install these programs first (all free):

### 1. Node.js (v20 or higher)
- Go to: https://nodejs.org
- Download the **LTS** version (green button)
- Run the installer, click Next through everything (keep defaults)
- To verify: open CMD and type `node --version` (should show v20 or higher)

### 2. PostgreSQL (v15 or higher)
- Go to: https://www.postgresql.org/download/windows/
- Download the installer
- During installation:
  - Set a password for the postgres user (remember this!)
  - Keep the default port 5432
  - Click Next through everything else
- To verify: open CMD and type `psql --version`

### 3. Git (optional, for downloading)
- Go to: https://git-scm.com/download/win
- Download and install with defaults

---

## Step-by-Step Setup

### Step 1: Download the project

Copy the entire project folder to your computer (for example to `C:\GoldPredict`).

### Step 2: Create the database

Open CMD and run:
```
psql -U postgres
```
Enter your PostgreSQL password, then type:
```sql
CREATE DATABASE goldpredict;
\q
```

### Step 3: Configure environment variables

In the project folder, create a file called `.env` with this content:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/goldpredict
SESSION_SECRET=any-long-random-string-here-make-it-at-least-32-characters
STRIPE_LIVE_PUBLISHABLE_KEY=pk_live_your_key_here
STRIPE_LIVE_SECRET_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=
OPENAI_API_KEY=no
APP_URL=http://localhost:5000
LOCALHOST_MODE=true
NODE_ENV=production
PORT=5000
```

Replace:
- `YOUR_PASSWORD` with your PostgreSQL password
- The Stripe keys with your real live keys
- `STRIPE_WEBHOOK_SECRET` can stay empty for localhost (only needed once hosted publicly)
- `OPENAI_API_KEY` set to `no` to use the local analysis engine (or put your real key if you have one)
- `APP_URL` is your app's address — keep as `http://localhost:5000` for local use
- `LOCALHOST_MODE=true` is required for login to work on localhost (enables HTTP cookies)

### Step 4: Run the launcher

Open CMD, navigate to the project folder, and run:
```
python launch.py
```

Or if you prefer to do it manually:
```
npm install
npm run build
npm run db:push
npm start
```

### Step 5: Open the app

Open your browser and go to: http://localhost:5000

---

## Troubleshooting

**"node is not recognized"** - Node.js is not installed or not in PATH. Reinstall Node.js.

**"psql is not recognized"** - PostgreSQL is not in PATH. Add `C:\Program Files\PostgreSQL\15\bin` to your system PATH.

**Database connection error** - Check that PostgreSQL is running and your password in .env is correct.

**Port 5000 already in use** - Change `PORT=5000` to `PORT=3000` in .env and access http://localhost:3000

---

## Hosting Guide (Free + Paid Options)

### Option 1: Free Hosting with Render.com

1. Create a free account at https://render.com
2. Connect your GitHub account
3. Push your project to a GitHub repository (private is fine)
4. On Render dashboard, click "New" > "Web Service"
5. Select your repository
6. Configure:
   - **Build Command**: `npm install && npm run build && npx drizzle-kit push`
   - **Start Command**: `npm start`
   - **Environment**: Node
   - **Node Version**: 20 (set in Environment settings)
7. Add these environment variables:
   - `DATABASE_URL` = (your Render PostgreSQL internal URL)
   - `SESSION_SECRET` = (a long random string)
   - `STRIPE_LIVE_PUBLISHABLE_KEY` = (your pk_live_ key)
   - `STRIPE_LIVE_SECRET_KEY` = (your sk_live_ key)
   - `STRIPE_WEBHOOK_SECRET` = (from Stripe webhook setup, see below)
   - `APP_URL` = `https://goldpredict.onrender.com` (your actual Render URL)
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render uses port 10000)
   - `OPENAI_API_KEY` = `no` (or your real key)
   - `SMTP_HOST` = `smtp.gmail.com` (optional, for welcome emails)
   - `SMTP_PORT` = `587`
   - `SMTP_USER` = (your Gmail address)
   - `SMTP_PASS` = (your Gmail App Password)
   - `SMTP_FROM` = (your Gmail address)
   - Do NOT set `LOCALHOST_MODE` on production hosting
8. For the database: Click "New" > "PostgreSQL" to create a free database
9. Copy the **Internal Database URL** and add it as `DATABASE_URL` in your web service
10. Deploy!

Your app will be available at: `https://goldpredict.onrender.com` (or similar)

**Free tier limitations**: App sleeps after 15 minutes of no traffic. First visit after sleep takes ~30 seconds. Free PostgreSQL database expires after 90 days (you'd need to recreate it or upgrade).

### Option 2: Custom Domain (goldpredict.com etc.)

1. Buy a domain from Porkbun (https://porkbun.com) - typically 8-15 EUR/year
   - Search for your desired name (goldpredict.com, goldpredict.lol, etc.)
   - Complete purchase

2. Connect domain to your hosting:
   - In Render dashboard, go to your web service > Settings > Custom Domains
   - Click "Add Custom Domain" and enter your domain (e.g., goldpredict.lol)
   - Render will give you DNS records to add

3. Configure DNS at Porkbun:
   - Log into Porkbun > Domain Management > DNS Records
   - Add a CNAME record:
     - Type: CNAME
     - Host: @ (or leave blank for root domain)
     - Answer: your-app.onrender.com (the URL Render gave you)
   - If using www subdomain, add another CNAME:
     - Type: CNAME
     - Host: www
     - Answer: your-app.onrender.com

4. Wait 5-30 minutes for DNS to propagate
5. Render automatically provides free SSL (https://)

### Option 3: Paid Hosting (Better Performance)

If the free tier is too slow, Render's paid plan starts at $7/month and keeps your app always running. Railway.app is another good option at ~$5/month.

### Setting Up the Stripe Webhook (After Hosting)

Once your app is live at its final URL:

1. Go to https://dashboard.stripe.com > Developers > Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://YOUR-DOMAIN.com/api/stripe/webhook`
4. Select events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Click "Add endpoint"
6. Copy the signing secret (whsec_...)
7. Add it as STRIPE_WEBHOOK_SECRET in your hosting environment variables
