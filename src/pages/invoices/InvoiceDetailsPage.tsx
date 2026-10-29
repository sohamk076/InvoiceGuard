import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { Invoice, InvoiceStatus, PurchaseOrder } from '../../services/types';
import { formatINR, formatDate, formatDateTime } from '../../lib/formatters';
import { RiskScoreMeter } from '../../components/fraud/RiskScoreMeter';
import { FindingsList } from '../../components/fraud/FindingsList';
import { TaxReconciliationTable } from '../../components/fraud/TaxReconciliationTable';
import { ThreeWayMatchTable } from '../../components/fraud/ThreeWayMatchTable';
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  Building,
  Calendar,
  FileCheck,
  History,
} from 'lucide-react';

interface InvoiceDetailsPageProps {
  invoiceId: string;
  onBack: () => void;
}

export const InvoiceDetailsPage: React.FC<InvoiceDetailsPageProps> = ({
  invoiceId,
  onBack,
}) => {
  const [invoice, setInvoice] = useState<Invoice | undefined>(() =>
    store.getInvoiceById(invoiceId)
  );
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | undefined>(undefined);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    const inv = store.getInvoiceById(invoiceId);
    setInvoice(inv);
    if (inv?.purchaseOrderId || inv?.purchaseOrderNumber) {
      const po = store.getPurchaseOrderById(inv.purchaseOrderId || inv.purchaseOrderNumber || '');
      setPurchaseOrder(po);
    }
  }, [invoiceId]);

  if (!invoice) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
        <h3 className="text-sm font-semibold text-slate-800">Invoice not found</h3>
        <p className="text-xs text-slate-500 mt-1">
          The requested invoice dossier could not be located in the ledger.
        </p>
        <button
          onClick={onBack}
          className="mt-4 px-3 py-1.5 bg-blue-700 text-white text-xs font-semibold rounded-md"
        >
          Return to invoice list
        </button>
      </div>
    );
  }

  const handleUpdateStatus = (newStatus: InvoiceStatus) => {
    store.updateInvoiceStatus(invoice.id, newStatus);
    setInvoice(store.getInvoiceById(invoice.id));
    setActionSuccess(`Invoice status successfully updated to ${newStatus.replace(/_/g, ' ')}.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const exportDossierJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(invoice, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `InvoiceGuard_Audit_${invoice.invoiceNumber}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const auditLogs = store.getAuditLogs().filter((l) => l.entityId === invoice.id);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Navigation & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900">
                {invoice.invoiceNumber}
              </h1>
              <span className="text-xs font-semibold text-slate-700 font-mono">
                {invoice.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Source: {invoice.source}
              {invoice.originalFileName ? ` • File: ${invoice.originalFileName}` : ''} • Registered:{' '}
              {formatDateTime(invoice.createdAt)}
            </p>
          </div>
        </div>

        {/* Auditor Status Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleUpdateStatus('APPROVED')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Approve Invoice
          </button>
          <button
            onClick={() => handleUpdateStatus('FLAGGED_FOR_AUDIT')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Flag for Audit
          </button>
          <button
            onClick={() => handleUpdateStatus('REJECTED')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <XCircle className="h-3.5 w-3.5" />
            Reject Invoice
          </button>
          <button
            onClick={exportDossierJSON}
            title="Export Audit Dossier"
            className="p-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 shadow-sm">
          {actionSuccess}
        </div>
      )}

      {/* Invoice Parties & Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Supplier Profile */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Building className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Supplier (Vendor)
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900">{invoice.supplierName}</div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">GSTIN:</span>
              <span className="font-mono font-medium text-slate-800">{invoice.supplierGstin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">State Code:</span>
              <span className="font-mono text-slate-800">
                {invoice.supplierGstin.substring(0, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* Recipient Profile */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Building className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recipient (Buyer)
            </span>
          </div>
          <div className="text-sm font-bold text-slate-900">{invoice.buyerName}</div>
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">GSTIN:</span>
              <span className="font-mono font-medium text-slate-800">{invoice.buyerGstin}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">State Code:</span>
              <span className="font-mono text-slate-800">
                {invoice.buyerGstin.substring(0, 2)}
              </span>
            </div>
          </div>
        </div>

        {/* Financial Header */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Calendar className="h-4 w-4 text-slate-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Financial Schedule
              </span>
            </div>
            <div className="flex justify-between text-xs py-0.5">
              <span className="text-slate-400">Invoice Date:</span>
              <span className="font-medium text-slate-800">{formatDate(invoice.invoiceDate)}</span>
            </div>
            <div className="flex justify-between text-xs py-0.5">
              <span className="text-slate-400">Due Date:</span>
              <span className="font-medium text-slate-800">{formatDate(invoice.dueDate)}</span>
            </div>
            {invoice.purchaseOrderNumber && (
              <div className="flex justify-between text-xs py-0.5">
                <span className="text-slate-400">PO Number:</span>
                <span className="font-mono font-semibold text-blue-700">
                  {invoice.purchaseOrderNumber}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-between items-baseline">
            <span className="text-xs font-semibold text-slate-700">Grand Total:</span>
            <span className="text-lg font-bold font-mono text-slate-900">
              {formatINR(invoice.grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Fraud Assessment Engine Gauge & Breakdown */}
      <RiskScoreMeter
        score={invoice.riskScore}
        level={invoice.riskLevel}
        criticalCount={invoice.findings?.filter((f) => f.severity === 'CRITICAL').length || 0}
        highCount={invoice.findings?.filter((f) => f.severity === 'HIGH').length || 0}
        mediumCount={invoice.findings?.filter((f) => f.severity === 'MEDIUM').length || 0}
        lowCount={invoice.findings?.filter((f) => f.severity === 'LOW').length || 0}
      />

      {/* Explainable Audit Findings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Explainable Audit Findings & Mathematical Proof
          </h3>
          <span className="text-xs text-slate-500">
            {invoice.findings?.length || 0} compliance rule triggers detected
          </span>
        </div>
        <FindingsList findings={invoice.findings || []} />
      </div>

      {/* Arithmetic & GST Reconciliation Table */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">
          Statutory Tax & Arithmetic Audit
        </h3>
        <TaxReconciliationTable
          reconciliation={invoice.mathReconciliation}
          cgstTotal={invoice.cgstTotal}
          sgstTotal={invoice.sgstTotal}
          igstTotal={invoice.igstTotal}
        />
      </div>

      {/* 3-Way Purchase Order Matching */}
      {invoice.purchaseOrderNumber && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              3-Way PO Reconciliation (#{invoice.purchaseOrderNumber})
            </h3>
            {purchaseOrder && (
              <span className="text-xs text-slate-500 font-mono">
                Approved PO Value: {formatINR(purchaseOrder.totalAmount)}
              </span>
            )}
          </div>
          <ThreeWayMatchTable
            invoiceItems={invoice.items || []}
            purchaseOrder={purchaseOrder}
          />
        </div>
      )}

      {/* Invoice Line Items Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm space-y-2">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-900">Billed Line Items Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-full">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-600 font-medium">
              <tr>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">HSN Code</th>
                <th className="py-2.5 px-4 text-right">Quantity</th>
                <th className="py-2.5 px-4 text-right">Unit Price (₹)</th>
                <th className="py-2.5 px-4 text-right">Taxable (₹)</th>
                <th className="py-2.5 px-4 text-right">GST Rate</th>
                <th className="py-2.5 px-4 text-right">Tax Amount (₹)</th>
                <th className="py-2.5 px-4 text-right">Line Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.items || []).map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{item.itemDescription}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-500">{item.hsnCode || '-'}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{item.quantity}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatINR(item.unitPrice)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{formatINR(item.taxableAmount)}</td>
                  <td className="py-2.5 px-4 text-right font-mono">{item.gstRate}%</td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    {formatINR(
                      (item.cgstAmount || 0) + (item.sgstAmount || 0) + (item.igstAmount || 0)
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-900">
                    {formatINR(item.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Trail Timeline */}
      {auditLogs.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <History className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
              Audit Trail & Decision History
            </h3>
          </div>
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between text-xs py-1.5 border-b border-slate-50 last:border-0"
              >
                <div>
                  <span className="font-semibold text-slate-800">{log.action.replace(/_/g, ' ')}</span>
                  <span className="text-slate-400 ml-2">by {log.performedBy}</span>
                  {log.details && (
                    <span className="text-slate-500 block text-[11px] font-mono mt-0.5">
                      {JSON.stringify(log.details)}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
