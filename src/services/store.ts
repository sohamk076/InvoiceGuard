import {
  PHARMA_SEED_INVOICES,
  PHARMA_SEED_PURCHASE_ORDERS,
  PHARMA_SEED_VENDORS,
} from './mock-seed-data';
import { AuditLog, DashboardStats, Invoice, InvoiceStatus, PurchaseOrder, Vendor } from './types';
import { runFraudScan } from '../lib/fraud-engine/engine';
import { HistoricalContext, InvoicePayload, VendorHistoricalStats } from '../lib/fraud-engine/types';
import { validateGSTIN } from '../lib/gst';
import { supabase, isSupabaseConfigured } from './supabase';

class DataStore {
  private currentUserId: string | null = null;
  private organizationGstin?: string;
  private vendors: Vendor[] = [];
  private purchaseOrders: PurchaseOrder[] = [];
  private invoices: Invoice[] = [];
  private auditLogs: AuditLog[] = [];
  private isInitialized = false;

  constructor() {
    // Start with empty state for clean unauthenticated/new user experience
  }

  public setUserId(userId: string | null) {
    if (this.currentUserId === userId && this.isInitialized) return;
    this.currentUserId = userId;
    this.loadUserData();
  }

  public setOrganizationGstin(gstin?: string) {
    this.organizationGstin = gstin;
  }

  private getStorageKey(entity: string): string {
    const userPrefix = this.currentUserId || 'anonymous';
    return `invoiceguard_${userPrefix}_${entity}`;
  }

  public async loadUserData() {
    if (!this.currentUserId) {
      this.vendors = [];
      this.purchaseOrders = [];
      this.invoices = [];
      this.auditLogs = [];
      this.isInitialized = true;
      return;
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const [vendorsRes, poRes, invoicesRes, logsRes] = await Promise.all([
          supabase.from('vendors').select('*').eq('user_id', this.currentUserId),
          supabase.from('purchase_orders').select('*, items:purchase_order_items(*)').eq('user_id', this.currentUserId),
          supabase.from('invoices').select('*, items:invoice_items(*), findings:fraud_findings(*)').eq('user_id', this.currentUserId),
          supabase.from('audit_logs').select('*').eq('user_id', this.currentUserId).order('created_at', { ascending: false }).limit(100),
        ]);

        if (!vendorsRes.error && vendorsRes.data) {
          this.vendors = vendorsRes.data.map((v: any) => ({
            id: v.id,
            userId: v.user_id,
            name: v.name,
            gstin: v.gstin,
            pan: v.pan,
            drugLicenseNumber: v.drug_license_number,
            stateCode: v.state_code,
            city: v.city,
            contactEmail: v.contact_email,
            contactPhone: v.contact_phone,
            riskRating: v.risk_rating,
            totalInvoicedAmount: Number(v.total_invoiced_amount || 0),
            totalInvoicesCount: Number(v.total_invoices_count || 0),
            status: v.status,
            createdAt: v.created_at,
          }));
        }

        if (!poRes.error && poRes.data) {
          this.purchaseOrders = poRes.data.map((p: any) => ({
            id: p.id,
            userId: p.user_id,
            poNumber: p.po_number,
            vendorId: p.vendor_id,
            vendorName: p.vendor_name,
            vendorGstin: p.vendor_gstin,
            orderDate: p.order_date,
            deliveryDate: p.delivery_date,
            totalAmount: Number(p.total_amount || 0),
            status: p.status,
            notes: p.notes,
            items: (p.items || []).map((it: any) => ({
              id: it.id,
              purchaseOrderId: it.purchase_order_id,
              itemDescription: it.item_description,
              hsnCode: it.hsn_code,
              quantity: Number(it.quantity || 0),
              unitPrice: Number(it.unit_price || 0),
              totalAmount: Number(it.total_amount || 0),
            })),
            createdAt: p.created_at,
          }));
        }

        if (!invoicesRes.error && invoicesRes.data) {
          this.invoices = invoicesRes.data.map((i: any) => ({
            id: i.id,
            userId: i.user_id,
            invoiceNumber: i.invoice_number,
            invoiceDate: i.invoice_date,
            dueDate: i.due_date,
            supplierGstin: i.supplier_gstin,
            supplierName: i.supplier_name,
            buyerGstin: i.buyer_gstin,
            buyerName: i.buyer_name,
            purchaseOrderId: i.purchase_order_id,
            purchaseOrderNumber: i.purchase_order_number,
            subtotal: Number(i.subtotal || 0),
            totalTax: Number(i.total_tax || 0),
            cgstTotal: Number(i.cgst_total || 0),
            sgstTotal: Number(i.sgst_total || 0),
            igstTotal: Number(i.igst_total || 0),
            discountTotal: Number(i.discount_total || 0),
            grandTotal: Number(i.grand_total || 0),
            currency: i.currency || 'INR',
            status: i.status,
            riskScore: Number(i.risk_score || 0),
            riskLevel: i.risk_level,
            source: i.source,
            originalFileName: i.original_file_name,
            items: (i.items || []).map((it: any) => ({
              id: it.id,
              invoiceId: it.invoice_id,
              itemDescription: it.item_description,
              hsnCode: it.hsn_code,
              quantity: Number(it.quantity || 0),
              unitPrice: Number(it.unit_price || 0),
              discountAmount: Number(it.discount_amount || 0),
              taxableAmount: Number(it.taxable_amount || 0),
              gstRate: Number(it.gst_rate || 0),
              cgstAmount: Number(it.cgst_amount || 0),
              sgstAmount: Number(it.sgst_amount || 0),
              igstAmount: Number(it.igst_amount || 0),
              totalAmount: Number(it.total_amount || 0),
            })),
            findings: (i.findings || []).map((f: any) => ({
              id: f.id,
              ruleId: f.rule_id,
              ruleName: f.rule_name,
              category: f.category,
              severity: f.severity,
              penaltyPoints: Number(f.penalty_points || 0),
              message: f.message,
              evidence: f.evidence || {},
              suggestedAction: f.suggested_action || '',
            })),
            createdAt: i.created_at,
          }));
        }

        if (!logsRes.error && logsRes.data) {
          this.auditLogs = logsRes.data.map((l: any) => ({
            id: l.id,
            userId: l.user_id,
            entityType: l.entity_type,
            entityId: l.entity_id,
            action: l.action,
            performedBy: l.performed_by,
            details: l.details,
            createdAt: l.created_at,
          }));
        }

        this.isInitialized = true;
        return;
      } catch {
        // Fall through to local user partition
      }
    }

    // Local user partition: Load only saved records for this specific user. New users start EMPTY!
    try {
      const storedVendors = localStorage.getItem(this.getStorageKey('vendors'));
      this.vendors = storedVendors ? JSON.parse(storedVendors) : [];

      const storedPOs = localStorage.getItem(this.getStorageKey('purchase_orders'));
      this.purchaseOrders = storedPOs ? JSON.parse(storedPOs) : [];

      const storedInvoices = localStorage.getItem(this.getStorageKey('invoices'));
      this.invoices = storedInvoices ? JSON.parse(storedInvoices) : [];

      const storedLogs = localStorage.getItem(this.getStorageKey('audit_logs'));
      this.auditLogs = storedLogs ? JSON.parse(storedLogs) : [];
    } catch {
      this.vendors = [];
      this.purchaseOrders = [];
      this.invoices = [];
      this.auditLogs = [];
    }

    this.isInitialized = true;
  }

  private persistLocal() {
    try {
      localStorage.setItem(this.getStorageKey('vendors'), JSON.stringify(this.vendors));
      localStorage.setItem(this.getStorageKey('purchase_orders'), JSON.stringify(this.purchaseOrders));
      localStorage.setItem(this.getStorageKey('invoices'), JSON.stringify(this.invoices));
      localStorage.setItem(this.getStorageKey('audit_logs'), JSON.stringify(this.auditLogs));
    } catch {
      // Storage fallback
    }
  }

  // --- VENDORS ---
  public getVendors(): Vendor[] {
    return [...this.vendors];
  }

  public getVendorById(id: string): Vendor | undefined {
    return this.vendors.find((v) => v.id === id || v.gstin === id);
  }

  public addVendor(vendorData: Omit<Vendor, 'id' | 'totalInvoicedAmount' | 'totalInvoicesCount' | 'createdAt'>): {
    success: boolean;
    vendor?: Vendor;
    error?: string;
  } {
    const gstin = vendorData.gstin.trim().toUpperCase();
    const existing = this.vendors.find((v) => v.gstin === gstin);
    if (existing) {
      return { success: false, error: `Vendor with GSTIN ${gstin} already exists (${existing.name}).` };
    }

    const gstinCheck = validateGSTIN(gstin);
    const newVendor: Vendor = {
      ...vendorData,
      id: `v-${Date.now().toString(36)}`,
      userId: this.currentUserId || undefined,
      gstin,
      pan: gstinCheck.pan || vendorData.pan,
      stateCode: gstinCheck.stateCode || vendorData.stateCode,
      totalInvoicedAmount: 0,
      totalInvoicesCount: 0,
      riskRating: gstinCheck.isValid ? 'LOW' : 'HIGH',
      createdAt: new Date().toISOString(),
    };

    this.vendors.unshift(newVendor);
    this.logAudit('VENDOR', newVendor.id, 'VENDOR_CREATED', { name: newVendor.name, gstin });
    this.persistLocal();

    // Sync to Supabase if connected
    if (isSupabaseConfigured && supabase && this.currentUserId) {
      supabase.from('vendors').insert({
        id: newVendor.id,
        user_id: this.currentUserId,
        name: newVendor.name,
        gstin: newVendor.gstin,
        pan: newVendor.pan,
        drug_license_number: newVendor.drugLicenseNumber,
        state_code: newVendor.stateCode,
        city: newVendor.city,
        contact_email: newVendor.contactEmail,
        contact_phone: newVendor.contactPhone,
        risk_rating: newVendor.riskRating,
        status: newVendor.status,
      }).then();
    }

    return { success: true, vendor: newVendor };
  }

  // --- PURCHASE ORDERS ---
  public getPurchaseOrders(): PurchaseOrder[] {
    return [...this.purchaseOrders];
  }

  public getPurchaseOrderById(idOrNumber: string): PurchaseOrder | undefined {
    const needle = idOrNumber.trim().toLowerCase();
    return this.purchaseOrders.find(
      (po) => po.id.toLowerCase() === needle || po.poNumber.toLowerCase() === needle
    );
  }

  public addPurchaseOrder(poData: Omit<PurchaseOrder, 'id' | 'createdAt'>): {
    success: boolean;
    purchaseOrder?: PurchaseOrder;
    error?: string;
  } {
    const existing = this.purchaseOrders.find(
      (p) => p.poNumber.trim().toLowerCase() === poData.poNumber.trim().toLowerCase()
    );
    if (existing) {
      return { success: false, error: `Purchase Order "${poData.poNumber}" already exists.` };
    }

    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now().toString(36)}`,
      userId: this.currentUserId || undefined,
      createdAt: new Date().toISOString(),
    };

    this.purchaseOrders.unshift(newPO);
    this.logAudit('PURCHASE_ORDER', newPO.id, 'PURCHASE_ORDER_CREATED', { poNumber: newPO.poNumber });
    this.persistLocal();

    // Sync to Supabase if connected
    if (isSupabaseConfigured && supabase && this.currentUserId) {
      supabase.from('purchase_orders').insert({
        id: newPO.id,
        user_id: this.currentUserId,
        po_number: newPO.poNumber,
        vendor_id: newPO.vendorId,
        vendor_name: newPO.vendorName,
        vendor_gstin: newPO.vendorGstin,
        order_date: newPO.orderDate,
        delivery_date: newPO.deliveryDate,
        total_amount: newPO.totalAmount,
        status: newPO.status,
        notes: newPO.notes,
      }).then();
    }

    return { success: true, purchaseOrder: newPO };
  }

  // --- INVOICES & FRAUD ENGINE SCANNING ---
  public getInvoices(): Invoice[] {
    return [...this.invoices];
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find((i) => i.id === id);
  }

  public scanInvoicePayload(invoicePayload: InvoicePayload) {
    const vendorStats: Record<string, VendorHistoricalStats> = {};
    for (const v of this.vendors) {
      const vendorInvoices = this.invoices.filter(
        (i) => i.supplierGstin.toUpperCase() === v.gstin.toUpperCase()
      );
      const totalAmount = vendorInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
      vendorStats[v.gstin.toUpperCase()] = {
        vendorGstin: v.gstin,
        totalInvoicesCount: vendorInvoices.length,
        averageInvoiceAmount: vendorInvoices.length > 0 ? totalAmount / vendorInvoices.length : 0,
        maxInvoiceAmount: Math.max(...vendorInvoices.map((i) => i.grandTotal), 0),
        minInvoiceAmount: Math.min(...vendorInvoices.map((i) => i.grandTotal), 0),
        priorFraudFlagsCount: vendorInvoices.filter((i) => i.riskScore > 25).length,
      };
    }

    const recipientGstin = this.organizationGstin || invoicePayload.buyerGstin || '';
    const context: HistoricalContext = {
      existingInvoices: this.invoices,
      vendorsStats: vendorStats,
      purchaseOrders: this.purchaseOrders,
      organizationGstin: recipientGstin,
    };

    // Calculate score deterministically on the engine - never trust client input
    return runFraudScan(invoicePayload, context);
  }

  public addInvoice(
    invoiceData: Omit<Invoice, 'id' | 'riskScore' | 'riskLevel' | 'findings' | 'mathReconciliation' | 'createdAt'>
  ): { invoice: Invoice; scanResult: ReturnType<typeof runFraudScan> } {
    const payload: InvoicePayload = {
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: invoiceData.invoiceDate,
      dueDate: invoiceData.dueDate,
      supplierGstin: invoiceData.supplierGstin,
      supplierName: invoiceData.supplierName,
      buyerGstin: invoiceData.buyerGstin,
      buyerName: invoiceData.buyerName,
      purchaseOrderId: invoiceData.purchaseOrderId,
      purchaseOrderNumber: invoiceData.purchaseOrderNumber,
      subtotal: invoiceData.subtotal,
      totalTax: invoiceData.totalTax,
      cgstTotal: invoiceData.cgstTotal,
      sgstTotal: invoiceData.sgstTotal,
      igstTotal: invoiceData.igstTotal,
      discountTotal: invoiceData.discountTotal,
      grandTotal: invoiceData.grandTotal,
      currency: invoiceData.currency || 'INR',
      items: invoiceData.items.map((it) => ({
        id: it.id,
        itemDescription: it.itemDescription,
        hsnCode: it.hsnCode || '3004',
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        discountAmount: it.discountAmount,
        taxableAmount: it.taxableAmount,
        gstRate: it.gstRate,
        cgstAmount: it.cgstAmount,
        sgstAmount: it.sgstAmount,
        igstAmount: it.igstAmount,
        totalAmount: it.totalAmount,
      })),
    };

    // Server-enforced fraud calculation
    const scanResult = this.scanInvoicePayload(payload);

    const initialStatus: InvoiceStatus =
      scanResult.riskLevel === 'CRITICAL' || scanResult.riskLevel === 'HIGH'
        ? 'FLAGGED_FOR_AUDIT'
        : 'PENDING_REVIEW';

    const newInvoice: Invoice = {
      ...invoiceData,
      id: `inv-${Date.now().toString(36)}`,
      userId: this.currentUserId || undefined,
      status: initialStatus,
      riskScore: scanResult.overallRiskScore,
      riskLevel: scanResult.riskLevel,
      findings: scanResult.findings,
      mathReconciliation: scanResult.mathReconciliation,
      createdAt: new Date().toISOString(),
    };

    this.invoices.unshift(newInvoice);

    // Update vendor aggregate metrics
    const vendorIndex = this.vendors.findIndex(
      (v) => v.gstin.toUpperCase() === newInvoice.supplierGstin.toUpperCase()
    );
    if (vendorIndex !== -1) {
      this.vendors[vendorIndex].totalInvoicesCount += 1;
      this.vendors[vendorIndex].totalInvoicedAmount += newInvoice.grandTotal;
      if (scanResult.riskLevel === 'CRITICAL') {
        this.vendors[vendorIndex].riskRating = 'CRITICAL';
      } else if (scanResult.riskLevel === 'HIGH' && this.vendors[vendorIndex].riskRating !== 'CRITICAL') {
        this.vendors[vendorIndex].riskRating = 'HIGH';
      }
    }

    this.logAudit('INVOICE', newInvoice.id, 'INVOICE_PROCESSED', {
      invoiceNumber: newInvoice.invoiceNumber,
      riskScore: newInvoice.riskScore,
      riskLevel: newInvoice.riskLevel,
      flagsCount: scanResult.totalFlags,
    });

    this.persistLocal();

    // Sync to Supabase if connected
    if (isSupabaseConfigured && supabase && this.currentUserId) {
      supabase.from('invoices').insert({
        id: newInvoice.id,
        user_id: this.currentUserId,
        invoice_number: newInvoice.invoiceNumber,
        invoice_date: newInvoice.invoiceDate,
        due_date: newInvoice.dueDate,
        supplier_gstin: newInvoice.supplierGstin,
        supplier_name: newInvoice.supplierName,
        buyer_gstin: newInvoice.buyerGstin,
        buyer_name: newInvoice.buyerName,
        purchase_order_id: newInvoice.purchaseOrderId,
        purchase_order_number: newInvoice.purchaseOrderNumber,
        subtotal: newInvoice.subtotal,
        total_tax: newInvoice.totalTax,
        cgst_total: newInvoice.cgstTotal,
        sgst_total: newInvoice.sgstTotal,
        igst_total: newInvoice.igstTotal,
        grand_total: newInvoice.grandTotal,
        status: newInvoice.status,
        risk_score: newInvoice.riskScore,
        risk_level: newInvoice.riskLevel,
        source: newInvoice.source,
        original_file_name: newInvoice.originalFileName,
      }).then();
    }

    return { invoice: newInvoice, scanResult };
  }

  public updateInvoiceStatus(invoiceId: string, newStatus: InvoiceStatus, comment?: string): boolean {
    const idx = this.invoices.findIndex((i) => i.id === invoiceId);
    if (idx === -1) return false;

    const oldStatus = this.invoices[idx].status;
    this.invoices[idx].status = newStatus;

    this.logAudit('INVOICE', invoiceId, 'STATUS_UPDATED', {
      from: oldStatus,
      to: newStatus,
      comment: comment || 'Status updated by auditor',
    });

    this.persistLocal();

    if (isSupabaseConfigured && supabase && this.currentUserId) {
      supabase.from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId)
        .eq('user_id', this.currentUserId)
        .then();
    }

    return true;
  }

  // --- DASHBOARD ANALYTICS ---
  public getDashboardStats(): DashboardStats {
    const totalInvoicesCount = this.invoices.length;
    const totalInvoicedValue = this.invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);

    const cleanInvoices = this.invoices.filter((i) => i.riskLevel === 'LOW');
    const mediumInvoices = this.invoices.filter((i) => i.riskLevel === 'MEDIUM');
    const highInvoices = this.invoices.filter((i) => i.riskLevel === 'HIGH');
    const criticalInvoices = this.invoices.filter((i) => i.riskLevel === 'CRITICAL');

    const flaggedInvoicesCount = mediumInvoices.length + highInvoices.length + criticalInvoices.length;
    const highCriticalRiskCount = highInvoices.length + criticalInvoices.length;
    const pendingReviewCount = this.invoices.filter(
      (i) => i.status === 'PENDING_REVIEW' || i.status === 'FLAGGED_FOR_AUDIT'
    ).length;

    const riskScoreAverage =
      totalInvoicesCount > 0
        ? Math.round(this.invoices.reduce((sum, i) => sum + i.riskScore, 0) / totalInvoicesCount)
        : 0;

    const monthMap: Record<string, { totalAmount: number; flaggedAmount: number; count: number }> = {};
    for (const inv of this.invoices) {
      const monthKey = inv.invoiceDate ? inv.invoiceDate.substring(0, 7) : '2026-10';
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = { totalAmount: 0, flaggedAmount: 0, count: 0 };
      }
      monthMap[monthKey].totalAmount += inv.grandTotal;
      monthMap[monthKey].count += 1;
      if (inv.riskScore >= 25) {
        monthMap[monthKey].flaggedAmount += inv.grandTotal;
      }
    }

    const monthlyTrends = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        totalAmount: Math.round(data.totalAmount),
        flaggedAmount: Math.round(data.flaggedAmount),
        invoiceCount: data.count,
      }));

    return {
      totalInvoicesCount,
      totalInvoicedValue,
      cleanInvoicesCount: cleanInvoices.length,
      flaggedInvoicesCount,
      highCriticalRiskCount,
      pendingReviewCount,
      activeVendorsCount: this.vendors.filter((v) => v.status === 'ACTIVE').length,
      activePurchaseOrdersCount: this.purchaseOrders.filter((p) => p.status === 'OPEN').length,
      riskScoreAverage,
      riskDistribution: {
        clean: cleanInvoices.length,
        medium: mediumInvoices.length,
        high: highInvoices.length,
        critical: criticalInvoices.length,
      },
      monthlyTrends,
      recentInvoices: this.invoices.slice(0, 6),
    };
  }

  // --- AUDIT LOGS ---
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  public logAudit(
    entityType: AuditLog['entityType'],
    entityId: string,
    action: string,
    details?: Record<string, any>
  ) {
    const log: AuditLog = {
      id: `log-${Date.now().toString(36)}`,
      userId: this.currentUserId || undefined,
      entityType,
      entityId,
      action,
      performedBy: 'Auditor',
      details,
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 200) {
      this.auditLogs = this.auditLogs.slice(0, 200);
    }
  }

  // Optional development-only helper to load sample pharmaceutical data on explicit user request
  public loadPharmaSeedData() {
    this.vendors = [...PHARMA_SEED_VENDORS].map((v) => ({ ...v, userId: this.currentUserId || undefined }));
    this.purchaseOrders = [...PHARMA_SEED_PURCHASE_ORDERS].map((p) => ({ ...p, userId: this.currentUserId || undefined }));
    this.invoices = [...PHARMA_SEED_INVOICES].map((i) => ({ ...i, userId: this.currentUserId || undefined }));
    this.auditLogs = [];
    this.persistLocal();
  }

  // Reset user's records to empty
  public clearAllData() {
    this.vendors = [];
    this.purchaseOrders = [];
    this.invoices = [];
    this.auditLogs = [];
    this.persistLocal();
  }
}

export const store = new DataStore();
