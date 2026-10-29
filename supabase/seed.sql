-- ============================================================================
-- InvoiceGuard: Development Seed Data for Pharmaceutical Wholesale & Medical Stores
-- Use for optional development testing only. Not automatically inserted for new users.
-- ============================================================================

-- NOTE: In production, user_id is the UUID of the authenticated user from auth.users.
-- For local standalone development testing, placeholder UUID '00000000-0000-0000-0000-000000000001' is used.

DO $$
DECLARE
    dev_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- 1. SEED PHARMACEUTICAL VENDORS
    INSERT INTO public.vendors (id, user_id, name, gstin, pan, drug_license_number, state_code, city, contact_email, risk_rating, total_invoiced_amount, total_invoices_count, status)
    VALUES
    ('a1111111-1111-1111-1111-111111111111', dev_user_id, 'Apex Pharmaceuticals & Distribution', '27AAACA1234A1Z5', 'AAACA1234A', 'MH-MZ1-19842', '27', 'Mumbai', 'orders@apexpharma.in', 'LOW', 485000.00, 6, 'ACTIVE'),
    ('a2222222-2222-2222-2222-222222222222', dev_user_id, 'Medilife Healthcare Logistics', '29AABCM5678B1Z2', 'AABCM5678B', 'KA-BNG-44021', '29', 'Bengaluru', 'supply@medilifeagencies.in', 'LOW', 320000.00, 4, 'ACTIVE'),
    ('a3333333-3333-3333-3333-333333333333', dev_user_id, 'Sanjivani Generic Agencies', '24AABCS9012C1Z9', 'AABCS9012C', 'GJ-AHM-88120', '24', 'Ahmedabad', 'billing@sanjivanigenerics.in', 'MEDIUM', 185000.00, 3, 'ACTIVE'),
    ('a4444444-4444-4444-4444-444444444444', dev_user_id, 'Cipla Medpro Distributors', '27AAACC3456D1Z6', 'AAACC3456D', 'MH-PUN-32104', '27', 'Pune', 'distributors@ciplamedpro.in', 'LOW', 640000.00, 8, 'ACTIVE'),
    ('a5555555-5555-5555-5555-555555555555', dev_user_id, 'Bharat Generic Drug Wholesale', '07AAACB7890E1Z3', 'AAACB7890E', 'DL-DEL-10943', '07', 'New Delhi', 'dispatch@bharatgeneric.in', 'HIGH', 194000.00, 2, 'UNDER_AUDIT')
    ON CONFLICT DO NOTHING;

    -- 2. SEED PURCHASE ORDERS
    INSERT INTO public.purchase_orders (id, user_id, po_number, vendor_id, vendor_name, vendor_gstin, order_date, delivery_date, total_amount, status, notes)
    VALUES
    ('b1111111-1111-1111-1111-111111111111', dev_user_id, 'PO-PHARMA-0081', 'a1111111-1111-1111-1111-111111111111', 'Apex Pharmaceuticals & Distribution', '27AAACA1234A1Z5', '2026-09-10', '2026-09-25', 132160.00, 'OPEN', 'Bulk antibiotic and antipyretic tablets'),
    ('b2222222-2222-2222-2222-222222222222', dev_user_id, 'PO-PHARMA-0094', 'a2222222-2222-2222-2222-222222222222', 'Medilife Healthcare Logistics', '29AABCM5678B1Z2', '2026-09-18', '2026-10-05', 84000.00, 'FULFILLED', 'Critical care injectable ampoules'),
    ('b3333333-3333-3333-3333-333333333333', dev_user_id, 'PO-PHARMA-0105', 'a4444444-4444-4444-4444-444444444444', 'Cipla Medpro Distributors', '27AAACC3456D1Z6', '2026-10-01', '2026-10-15', 190400.00, 'OPEN', 'Quarterly respiratory inhalers and bronchodilators')
    ON CONFLICT DO NOTHING;

    -- 3. SEED PURCHASE ORDER ITEMS (HSN 3004 - Medicaments)
    INSERT INTO public.purchase_order_items (purchase_order_id, item_description, hsn_code, quantity, unit_price, total_amount)
    VALUES
    ('b1111111-1111-1111-1111-111111111111', 'Amoxicillin and Potassium Clavulanate 625mg Strips', '3004', 1000.00, 118.00, 118000.00),
    ('b2222222-2222-2222-2222-222222222222', 'Ceftriaxone 1g Injection Vials IP', '3004', 500.00, 150.00, 75000.00),
    ('b3333333-3333-3333-3333-333333333333', 'Budesonide 0.5mg Respules Pack of 5', '3004', 800.00, 212.50, 170000.00)
    ON CONFLICT DO NOTHING;

    -- 4. SEED SAMPLE INVOICES
    -- Invoice 1: Clean Compliant Invoice (Apex Pharmaceuticals)
    INSERT INTO public.invoices (id, user_id, invoice_number, invoice_date, due_date, supplier_gstin, supplier_name, buyer_gstin, buyer_name, purchase_order_id, purchase_order_number, subtotal, total_tax, cgst_total, sgst_total, igst_total, grand_total, status, risk_score, risk_level, source)
    VALUES
    ('c1111111-1111-1111-1111-111111111111', dev_user_id, 'INV-APX-8041', '2026-09-15', '2026-10-15', '27AAACA1234A1Z5', 'Apex Pharmaceuticals & Distribution', '27AABCM8821K1Z3', 'Verified Medical Store & Pharmacy', 'b1111111-1111-1111-1111-111111111111', 'PO-PHARMA-0081', 118000.00, 14160.00, 7080.00, 7080.00, 0.00, 132160.00, 'APPROVED', 0, 'LOW', 'MANUAL')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.invoice_items (invoice_id, item_description, hsn_code, quantity, unit_price, taxable_amount, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount)
    VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Amoxicillin and Potassium Clavulanate 625mg Strips', '3004', 1000.00, 118.00, 118000.00, 12.00, 7080.00, 7080.00, 0.00, 132160.00)
    ON CONFLICT DO NOTHING;

    -- Invoice 2: High Risk Duplicate Attempt (Apex Pharmaceuticals duplicate invoice attempt)
    INSERT INTO public.invoices (id, user_id, invoice_number, invoice_date, due_date, supplier_gstin, supplier_name, buyer_gstin, buyer_name, purchase_order_id, purchase_order_number, subtotal, total_tax, cgst_total, sgst_total, igst_total, grand_total, status, risk_score, risk_level, source)
    VALUES
    ('c2222222-2222-2222-2222-222222222222', dev_user_id, 'INV-APX-8041', '2026-09-28', '2026-10-28', '27AAACA1234A1Z5', 'Apex Pharmaceuticals & Distribution', '27AABCM8821K1Z3', 'Verified Medical Store & Pharmacy', 'b1111111-1111-1111-1111-111111111111', 'PO-PHARMA-0081', 118000.00, 14160.00, 7080.00, 7080.00, 0.00, 132160.00, 'FLAGGED_FOR_AUDIT', 70, 'HIGH', 'OCR_UPLOAD')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.invoice_items (invoice_id, item_description, hsn_code, quantity, unit_price, taxable_amount, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount)
    VALUES
    ('c2222222-2222-2222-2222-222222222222', 'Amoxicillin and Potassium Clavulanate 625mg Strips', '3004', 1000.00, 118.00, 118000.00, 12.00, 7080.00, 7080.00, 0.00, 132160.00)
    ON CONFLICT DO NOTHING;

    -- Invoice 3: Inter-State GST Mismatch & Price Padding (Bharat Generic Drug Wholesale)
    INSERT INTO public.invoices (id, user_id, invoice_number, invoice_date, due_date, supplier_gstin, supplier_name, buyer_gstin, buyer_name, subtotal, total_tax, cgst_total, sgst_total, igst_total, grand_total, status, risk_score, risk_level, source)
    VALUES
    ('c3333333-3333-3333-3333-333333333333', dev_user_id, 'INV-BGD-309', '2026-10-12', '2026-11-12', '07AAACB7890E1Z3', 'Bharat Generic Drug Wholesale', '07AABCM8821K1Z9', 'Verified Medical Store Delhi Depot', 150000.00, 18000.00, 0.00, 0.00, 18000.00, 174000.00, 'FLAGGED_FOR_AUDIT', 65, 'HIGH', 'MANUAL')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.invoice_items (invoice_id, item_description, hsn_code, quantity, unit_price, taxable_amount, gst_rate, cgst_amount, sgst_amount, igst_amount, total_amount)
    VALUES
    ('c3333333-3333-3333-3333-333333333333', 'Paracetamol 650mg Tablets IP Strips', '3004', 5000.00, 30.00, 150000.00, 12.00, 0.00, 0.00, 18000.00, 168000.00)
    ON CONFLICT DO NOTHING;
END $$;
