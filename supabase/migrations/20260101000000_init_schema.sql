-- ============================================================================
-- InvoiceGuard: Supabase PostgreSQL Schema Initialization
-- Pharmaceutical Distributors & Medical Stores Fraud Detection System
-- User-Specific Security & Strict Row Level Security (RLS)
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends Supabase Auth users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    medical_store_name TEXT,
    drug_license_number TEXT,
    organization_gstin TEXT,
    store_address TEXT,
    contact_phone TEXT,
    operating_state TEXT,
    profile_completed BOOLEAN DEFAULT false,
    role TEXT DEFAULT 'auditor' CHECK (role IN ('admin', 'auditor', 'manager', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PHARMACEUTICAL VENDORS / DISTRIBUTORS (Scoped to User)
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gstin TEXT NOT NULL,
    pan TEXT NOT NULL,
    drug_license_number TEXT,
    state_code TEXT NOT NULL,
    city TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    risk_rating TEXT DEFAULT 'LOW' CHECK (risk_rating IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    total_invoiced_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_invoices_count INT DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BLOCKED', 'UNDER_AUDIT')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_vendor_gstin UNIQUE (user_id, gstin)
);

-- 3. PURCHASE ORDERS (Scoped to User)
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    po_number TEXT NOT NULL,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    vendor_name TEXT,
    vendor_gstin TEXT NOT NULL,
    order_date DATE NOT NULL,
    delivery_date DATE,
    total_amount NUMERIC(15, 2) NOT NULL,
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CLOSED')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_po_number UNIQUE (user_id, po_number)
);

-- 4. PURCHASE ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    hsn_code TEXT DEFAULT '3004',
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL
);

-- 5. INVOICES (Scoped to User)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    supplier_gstin TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    buyer_gstin TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
    purchase_order_number TEXT,
    subtotal NUMERIC(15, 2) NOT NULL,
    total_tax NUMERIC(15, 2) NOT NULL,
    cgst_total NUMERIC(15, 2) DEFAULT 0.00,
    sgst_total NUMERIC(15, 2) DEFAULT 0.00,
    igst_total NUMERIC(15, 2) DEFAULT 0.00,
    discount_total NUMERIC(15, 2) DEFAULT 0.00,
    grand_total NUMERIC(15, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'PENDING_REVIEW' CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FLAGGED_FOR_AUDIT')),
    risk_score INT DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    source TEXT DEFAULT 'MANUAL' CHECK (source IN ('MANUAL', 'OCR_UPLOAD', 'API')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INVOICE ITEMS
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    hsn_code TEXT DEFAULT '3004',
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    discount_amount NUMERIC(15, 2) DEFAULT 0.00,
    taxable_amount NUMERIC(15, 2) NOT NULL,
    gst_rate NUMERIC(5, 2) NOT NULL,
    cgst_amount NUMERIC(15, 2) DEFAULT 0.00,
    sgst_amount NUMERIC(15, 2) DEFAULT 0.00,
    igst_amount NUMERIC(15, 2) DEFAULT 0.00,
    total_amount NUMERIC(15, 2) NOT NULL
);

-- 7. FRAUD SCANS (Scoped to User)
CREATE TABLE IF NOT EXISTS public.fraud_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    overall_risk_score INT NOT NULL,
    risk_level TEXT NOT NULL,
    total_flags INT NOT NULL DEFAULT 0,
    critical_flags INT NOT NULL DEFAULT 0,
    high_flags INT NOT NULL DEFAULT 0,
    medium_flags INT NOT NULL DEFAULT 0,
    low_flags INT NOT NULL DEFAULT 0,
    math_reconciliation JSONB,
    scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FRAUD FINDINGS
CREATE TABLE IF NOT EXISTS public.fraud_findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID REFERENCES public.fraud_scans(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL,
    rule_name TEXT NOT NULL,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    penalty_points INT NOT NULL,
    message TEXT NOT NULL,
    evidence JSONB,
    suggested_action TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. AUDIT LOGS (Scoped to User)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    performed_by TEXT DEFAULT 'Auditor',
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier_gstin ON public.invoices(supplier_gstin);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_risk_score ON public.invoices(risk_score);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_vendors_user_id ON public.vendors(user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_gstin ON public.vendors(gstin);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_user_id ON public.purchase_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_scans_user_id ON public.fraud_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_findings_invoice_id ON public.fraud_findings(invoice_id);

-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- USER-SPECIFIC ROW LEVEL SECURITY POLICIES (Users access only their own data)

-- Profiles: Users can select and update only their own profile

-- Profiles: users can only access their own profile.
DROP POLICY IF EXISTS "Users access own profile"
ON public.profiles;

CREATE POLICY "Users read own profile"
ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users insert own profile as auditor"
ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
    auth.uid() = id
    AND role = 'auditor'
);

CREATE POLICY "Users update own profile"
ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Prevent users from changing their own role.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    IF auth.uid() IS NOT NULL
       AND NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Profile role changes are not allowed';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_role_escalation
ON public.profiles;

CREATE TRIGGER prevent_profile_role_escalation
BEFORE UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_escalation();


-- Vendors: Scoped to user_id
CREATE POLICY "Users read own vendors" ON public.vendors
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own vendors" ON public.vendors
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own vendors" ON public.vendors
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own vendors" ON public.vendors
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Purchase Orders: Scoped to user_id
CREATE POLICY "Users read own purchase orders" ON public.purchase_orders
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own purchase orders" ON public.purchase_orders
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own purchase orders" ON public.purchase_orders
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own purchase orders" ON public.purchase_orders
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Purchase Order Items: Linked to user's PO
CREATE POLICY "Users access own purchase order items" ON public.purchase_order_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.purchase_orders
            WHERE purchase_orders.id = purchase_order_items.purchase_order_id
            AND purchase_orders.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.purchase_orders
            WHERE purchase_orders.id = purchase_order_items.purchase_order_id
            AND purchase_orders.user_id = auth.uid()
        )
    );

-- Invoices: Scoped to user_id
CREATE POLICY "Users read own invoices" ON public.invoices
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users insert own invoices" ON public.invoices
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own invoices" ON public.invoices
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own invoices" ON public.invoices
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Invoice Items: Linked to user's invoice
CREATE POLICY "Users access own invoice items" ON public.invoice_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

-- Fraud Scans: Scoped to user_id
CREATE POLICY "Users read own fraud scans" ON public.fraud_scans
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Fraud Findings: Linked to user's invoice
CREATE POLICY "Users read own fraud findings" ON public.fraud_findings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE invoices.id = fraud_findings.invoice_id
            AND invoices.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.invoices
            WHERE invoices.id = fraud_findings.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

-- Audit Logs: Scoped to user_id
CREATE POLICY "Users access own audit logs" ON public.audit_logs
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
