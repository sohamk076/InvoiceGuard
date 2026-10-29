import React, { useState, useMemo } from 'react';
import { store } from '../../services/store';
import { Invoice, InvoiceStatus } from '../../services/types';
import { formatINR, formatDate } from '../../lib/formatters';
import { RiskScoreBadge } from '../../components/fraud/RiskScoreBadge';
import { Search, Filter, Plus, UploadCloud } from 'lucide-react';
import { FraudSeverity } from '../../lib/fraud-engine/types';

interface InvoiceListPageProps {
  onNavigateToInvoice: (id: string) => void;
  onNavigateToUpload: () => void;
  onNavigateToManualEntry: () => void;
}

export const InvoiceListPage: React.FC<InvoiceListPageProps> = ({
  onNavigateToInvoice,
  onNavigateToUpload,
  onNavigateToManualEntry,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>(() => store.getInvoices());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.supplierGstin.toLowerCase().includes(searchQuery.toLowerCase());

      const matchRisk = selectedRisk === 'ALL' || inv.riskLevel === selectedRisk;
      const matchStatus = selectedStatus === 'ALL' || inv.status === selectedStatus;

      return matchSearch && matchRisk && matchStatus;
    });
  }, [invoices, searchQuery, selectedRisk, selectedStatus]);

  return (
    <div className="space-y-5">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Invoices
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onNavigateToUpload}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <UploadCloud className="h-4 w-4" />
            Upload File
          </button>
          <button
            onClick={onNavigateToManualEntry}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Manual Entry
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number, vendor, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-blue-700 focus:ring-blue-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold">Risk:</span>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:border-blue-700"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Clean (Low)</option>
              <option value="MEDIUM">Medium Flag</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Alert</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600 sm:ml-2">
            <span className="font-semibold">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs bg-white text-slate-800 focus:outline-none focus:ring-1 focus:border-blue-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Approved</option>
              <option value="FLAGGED_FOR_AUDIT">Flagged For Audit</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Invoice No</th>
                <th className="py-2.5 px-4">Vendor Name & GSTIN</th>
                <th className="py-2.5 px-4">Invoice Date</th>
                <th className="py-2.5 px-4 text-right">Taxable Subtotal (₹)</th>
                <th className="py-2.5 px-4 text-right">Tax (₹)</th>
                <th className="py-2.5 px-4 text-right">Grand Total (₹)</th>
                <th className="py-2.5 px-4 text-center">Risk Assessment</th>
                <th className="py-2.5 px-4 text-center">Audit Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-500">
                    {invoices.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-3">
                        <UploadCloud className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-800 text-sm">No invoices registered in the ledger</p>
                        <p className="text-slate-500 text-xs">
                          Upload incoming pharmaceutical distributor invoices or add one manually to initiate deterministic fraud analysis and GST verification.
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            onClick={onNavigateToUpload}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                          >
                            <UploadCloud className="h-4 w-4" />
                            Upload Invoice
                          </button>
                          <button
                            onClick={onNavigateToManualEntry}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Manual Entry
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span>No invoices found matching current search and filter criteria.</span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {inv.invoiceNumber}
                      {inv.purchaseOrderNumber && (
                        <span className="block text-[11px] text-slate-400 font-sans">
                          PO: {inv.purchaseOrderNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.supplierName}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {inv.supplierGstin}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatINR(inv.subtotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      {formatINR(inv.totalTax)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RiskScoreBadge score={inv.riskScore} level={inv.riskLevel} />
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700 font-medium text-xs">
                      {inv.status.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigateToInvoice(inv.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 hover:text-white hover:bg-blue-700 border border-blue-700 rounded transition-colors"
                      >
                        Audit Dossier
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Showing {filteredInvoices.length} of {invoices.length} total records</span>
          <span className="font-mono text-[11px]">Indian GST Act 2017 Rules Compliant</span>
        </div>
      </div>
    </div>
  );
};
