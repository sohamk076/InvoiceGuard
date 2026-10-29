// Fraud Engine Types and Interfaces

export type FraudSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RuleCategory =
  | 'DUPLICATE'
  | 'GSTIN'
  | 'TAX_MATH'
  | 'DATES'
  | 'AMOUNTS'
  | 'PO_MATCH';

export interface FraudFinding {
  id: string;
  ruleId: string;
  ruleName: string;
  category: RuleCategory;
  severity: FraudSeverity;
  penaltyPoints: number;
  message: string;
  evidence: Record<string, string | number | boolean | null | undefined>;
  suggestedAction: string;
}

export interface InvoiceItemPayload {
  id?: string;
  itemDescription: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxableAmount: number;
  gstRate: number; // e.g. 18 for 18%
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount: number;
}

export interface InvoicePayload {
  id?: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate?: string;
  supplierGstin: string;
  supplierName: string;
  buyerGstin: string;
  buyerName: string;
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  subtotal: number;
  totalTax: number;
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  discountTotal?: number;
  grandTotal: number;
  currency?: string;
  items: InvoiceItemPayload[];
}

export interface PurchaseOrderItemPayload {
  id?: string;
  itemDescription: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface PurchaseOrderPayload {
  id: string;
  poNumber: string;
  vendorId?: string;
  vendorGstin: string;
  orderDate: string;
  totalAmount: number;
  status: 'OPEN' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CLOSED';
  items: PurchaseOrderItemPayload[];
}

export interface VendorHistoricalStats {
  vendorId?: string;
  vendorGstin: string;
  totalInvoicesCount: number;
  averageInvoiceAmount: number;
  maxInvoiceAmount: number;
  minInvoiceAmount: number;
  priorFraudFlagsCount: number;
}

export interface HistoricalContext {
  existingInvoices: InvoicePayload[];
  vendorsStats?: Record<string, VendorHistoricalStats>;
  purchaseOrders?: PurchaseOrderPayload[];
  organizationGstin?: string;
}

export interface FraudScanResult {
  invoiceId?: string;
  overallRiskScore: number; // 0 - 100
  riskLevel: FraudSeverity;
  totalFlags: number;
  criticalFlagsCount: number;
  highFlagsCount: number;
  mediumFlagsCount: number;
  lowFlagsCount: number;
  findings: FraudFinding[];
  mathReconciliation: {
    calculatedSubtotal: number;
    statedSubtotal: number;
    calculatedTax: number;
    statedTax: number;
    calculatedGrandTotal: number;
    statedGrandTotal: number;
    discrepancy: number;
    isBalanced: boolean;
  };
  scannedAt: string;
}
