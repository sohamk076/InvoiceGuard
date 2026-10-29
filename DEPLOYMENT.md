# InvoiceGuard Deployment Guide

InvoiceGuard is engineered for zero-cost, enterprise-grade deployment using Vercel and Supabase Free tiers with no paid APIs or third-party paid hosting.

---

## 1. Supabase Database & Auth Setup (Free Tier)

1. Create a free account at [supabase.com](https://supabase.com) and create a new project.
2. Under **SQL Editor**, execute the migration script located at:
   ```
   supabase/migrations/20260101000000_init_schema.sql
   ```
3. To populate demonstration Indian B2B suppliers and sample fraud test records, execute:
   ```
   supabase/seed.sql
   ```
4. Navigate to **Project Settings > API** and copy:
   - Project URL
   - `anon` public key

---

## 2. Vercel Deployment (Free Tier)

1. Push your repository to your private or organization GitHub repository.
2. Sign in to [vercel.com](https://vercel.com) and select **Add New Project**.
3. Import your `InvoiceGuard` repository.
4. Framework Preset will automatically detect **Vite**.
5. Under **Environment Variables**, configure:
   - `VITE_SUPABASE_URL`: `https://[your-project-ref].supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `[your-supabase-anon-key]`
6. Click **Deploy**.

---

## 3. Local Development & Testing Workflow

You can test the complete system locally without deploying or pushing to GitHub:

### Option A: Standard Local Development (Frontend + Local API Server)
```bash
npm run dev
```
- **Local Application URL**: `http://localhost:5173`
- **Serverless API Endpoints**: Available immediately on `http://localhost:5173/api/...`
  - Health & Stats: `http://localhost:5173/api/stats`
  - Fraud Scan: `POST http://localhost:5173/api/fraud/scan`
  - Invoices API: `http://localhost:5173/api/invoices`
  - Vendors API: `http://localhost:5173/api/vendors`
  - Purchase Orders: `http://localhost:5173/api/purchase-orders`

### Option B: Native Vercel Serverless Development
```bash
npm run dev:vercel
# or: npx vercel dev
```
- **Vercel Dev URL**: `http://localhost:3000`

---

## 4. Connecting Live Supabase

1. Open `.env` in the project root:
   ```env
   VITE_SUPABASE_URL=https://[your-project-ref].supabase.co
   VITE_SUPABASE_ANON_KEY=[your-anon-key]
   ```
2. Run database migrations from the Supabase SQL Editor:
   - Schema: `supabase/migrations/20260101000000_init_schema.sql`
   - Seed data: `supabase/seed.sql`
3. Verify connection:
   - In the InvoiceGuard web app, navigate to **System Settings** in the sidebar.
   - Click **"Test Connection"** to verify live connection status with your Supabase database.
4. When credentials are not yet entered, the application automatically uses local enterprise storage pre-seeded with realistic Indian B2B suppliers and sample fraud cases, ensuring you can test immediately.
