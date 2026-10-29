# InvoiceGuard

InvoiceGuard is a commercial-grade Invoice Fraud Detection System designed for corporate finance and accounts payable departments. It provides deterministic, explainable risk scoring and statutory compliance validation tailored for the Indian B2B invoicing ecosystem.

---

## Technical Specifications

- **Frontend**: React 18 with TypeScript, Vite
- **Styling**: Tailwind CSS (Corporate FinTech design system)
- **Visuals & Charts**: Lucide React, Recharts
- **Database & Auth**: Supabase PostgreSQL, Supabase Auth
- **Serverless API**: Vercel Serverless Functions (`/api/*`)
- **Currency & Localization**: Indian Rupee (`₹`), Indian numbering system (Lakhs/Crores), Indian GST terminology (CGST, SGST, IGST, HSN/SAC)

---

## Deterministic Fraud Detection Rules

Every registered invoice is evaluated across 6 deterministic compliance categories producing an explainable risk score from 0 to 100:

1. **Duplicate Invoice Detection**:
   - `RULE-DUP-01`: Exact duplicate invoice number from same vendor GSTIN.
   - `RULE-DUP-02`: Near-duplicate billing (identical amounts within ±15 days).
2. **GSTIN Validity & Tax Allocation**:
   - `RULE-GST-01`: Indian GSTIN format, state code directory, embedded PAN entity validation, and Luhn Mod 36 checksum calculation.
   - `RULE-GST-03`: Illegal IGST charged on intra-state supplies (same state code).
   - `RULE-GST-04`: Asymmetric CGST and SGST allocation on intra-state supplies.
   - `RULE-GST-05`: Illegal CGST/SGST charged on inter-state supplies.
3. **Tax & Arithmetic Reconciliation**:
   - `RULE-MATH-01`: Line item quantity × unit price minus discount vs stated taxable value.
   - `RULE-MATH-02`: Applied GST rate calculation divergence.
   - `RULE-MATH-03`: Grand total overbilling discrepancy against computed sum of taxable value and taxes.
4. **Suspicious Dates & Timing**:
   - `RULE-DATE-01`: Future-dated invoices.
   - `RULE-DATE-02`: Stale / backdated invoices exceeding statutory 180-day limits.
   - `RULE-DATE-04`: Invoice date chronologically preceding associated Purchase Order date.
5. **Amount Anomaly & Spend Velocity**:
   - `RULE-AMT-01`: Uncharacteristic vendor spend spikes (>3x historical average).
   - `RULE-AMT-02`: Structuring and approval threshold evasion (e.g. ₹49,900 or ₹99,500).
   - `RULE-AMT-03`: Artificial round number estimates with complex multi-item GST.
6. **3-Way Purchase Order Matching**:
   - `RULE-PO-01`: Missing Purchase Order on high-value transactions.
   - `RULE-PO-03`: PO vendor GSTIN mismatch against billing supplier.
   - `RULE-PO-04`: Invoice grand total exceeding approved PO contract value.
   - `RULE-PO-05`: Unit price inflation exceeding contracted rates.
   - `RULE-PO-06`: Billed quantity exceeding contracted PO volume.
   - `RULE-PO-07`: Unapproved line items absent from the Purchase Order.

---

## Directory Structure

```
InvoiceGuard/
├── api/                     # Vercel Serverless Functions
│   ├── fraud/scan.ts        # Serverless fraud scanning endpoint
│   ├── invoices/index.ts    # Invoices API
│   ├── purchase-orders/     # PO management API
│   ├── stats.ts             # Health & stats API
│   └── vendors/index.ts     # Vendors API
├── public/
│   └── favicon.svg          # Shield check vector icon
├── src/
│   ├── components/
│   │   ├── fraud/           # Risk meter, findings list, 3-way match, tax tables
│   │   ├── layout/          # Navbar, Sidebar, AppLayout
│   │   └── ui/              # Button, Input, Select, Badge, Card, Modal
│   ├── lib/
│   │   ├── formatters.ts    # INR (₹) and Indian date formatting
│   │   ├── gst.ts           # Luhn Mod 36 checksum, state codes, PAN parser
│   │   └── fraud-engine/    # Deterministic rules and scoring engine
│   ├── pages/
│   │   ├── alerts/          # Fraud alerts investigation queue
│   │   ├── analytics/       # Spend and risk analytics charts
│   │   ├── auth/            # Minimalist login, registration, password recovery
│   │   ├── dashboard/       # Executive surveillance dashboard
│   │   ├── invoices/        # List, upload/OCR scanner, manual entry, details
│   │   ├── purchase-orders/ # PO registry and 3-way matching
│   │   ├── settings/        # Thresholds and organization profile
│   │   └── vendors/         # Supplier directory & GSTIN verification
│   ├── services/
│   │   ├── auth.tsx         # Authentication provider
│   │   ├── mock-seed-data.ts# Verified Indian B2B sample data
│   │   ├── store.ts         # Central repository adapter
│   │   ├── supabase.ts      # Supabase client connector
│   │   └── types.ts         # TypeScript data contracts
│   ├── App.tsx              # Application shell and tab router
│   ├── index.css            # Base stylesheet with FinTech palette
│   └── main.tsx             # Application bootstrap
├── supabase/
│   ├── migrations/          # PostgreSQL schema with RLS and indexes
│   └── seed.sql             # Indian B2B enterprise seed data
├── DEPLOYMENT.md            # Vercel & Supabase setup guide
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

---

## Quickstart

```bash
npm install
npm run dev
```

Inspect the application at `http://localhost:5173`.
To build the production bundle:
```bash
npm run build
```
