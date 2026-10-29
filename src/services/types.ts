import { FraudFinding, FraudScanResult, FraudSeverity } from '../lib/fraud-engine/types';

export interface Vendor {
  id: string;
  userId?: string;
  name: string;
  gstin: string;
  pan: string;
  drugLicenseNumber?: string;
  stateCode: string;
  city: string;
  contactEmail?: string;
  contactPhone?: string;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  totalInvoicedAmount: number;
  totalInvoicesCount: number;
  status: 'ACTIVE' | 'BLOCKED' | 'UNDER_AUDIT';
  createdAt?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchaseOrderId: string;
  itemDescription: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface PurchaseOrder {
  id: string;
  userId?: string;
  poNumber: string;
  vendorId?: string;
  vendorName?: string;
  vendorGstin: string;
  orderDate: string;
  deliveryDate?: string;
  totalAmount: number;
  status: 'OPEN' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CLOSED';
  notes?: string;
  items: PurchaseOrderItem[];
  createdAt?: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  itemDescription: string;
  hsnCode?: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  taxableAmount: number;
  gstRate: number; // percentage, e.g. 12 or 18
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  totalAmount: number;
}

export type InvoiceStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'FLAGGED_FOR_AUDIT';

export interface Invoice {
  id: string;
  userId?: string;
  invoiceNumber: string;
  invoiceDate: string;
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
  currency: string;
  status: InvoiceStatus;
  riskScore: number;
  riskLevel: FraudSeverity;
  source: 'MANUAL' | 'OCR_UPLOAD' | 'API';
  originalFileName?: string;
  items: InvoiceItem[];
  findings?: FraudFinding[];
  mathReconciliation?: FraudScanResult['mathReconciliation'];
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'auditor' | 'manager';
  organizationName?: string;
  organizationGstin?: string;
  drugLicenseNumber?: string;
  contactPhone?: string;
  address?: string;
  profileCompleted: boolean;
}

export interface AuditLog {
  id: string;
  userId?: string;
  entityType: 'INVOICE' | 'VENDOR' | 'PURCHASE_ORDER' | 'SYSTEM';
  entityId: string;
  action: string;
  performedBy: string;
  details?: Record<string, any>;
  createdAt: string;
}

export interface DashboardStats {
  totalInvoicesCount: number;
  totalInvoicedValue: number;
  cleanInvoicesCount: number;
  flaggedInvoicesCount: number;
  highCriticalRiskCount: number;
  pendingReviewCount: number;
  activeVendorsCount: number;
  activePurchaseOrdersCount: number;
  riskScoreAverage: number;
  riskDistribution: {
    clean: number;
    medium: number;
    high: number;
    critical: number;
  };
  monthlyTrends: {
    month: string;
    totalAmount: number;
    flaggedAmount: number;
    invoiceCount: number;
  }[];
  recentInvoices: Invoice[];
}
