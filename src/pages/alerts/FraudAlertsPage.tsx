import React, { useState, useMemo } from 'react';
import { store } from '../../services/store';
import { Invoice } from '../../services/types';
import { formatINR, formatDate } from '../../lib/formatters';
import { RiskScoreBadge } from '../../components/fraud/RiskScoreBadge';
import { ShieldAlert, Download, Filter, Search, ArrowRight, AlertTriangle } from 'lucide-react';

interface FraudAlertsPageProps {
  onNavigateToInvoice: (id: string) => void;
}

export const FraudAlertsPage: React.FC<FraudAlertsPageProps> = ({
  onNavigateToInvoice,
}) => {
  const invoices = useMemo(() => store.getInvoices(), []);
  const [selectedSeverity, setSelectedSeverity] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Only invoices with risk flags
  const flaggedInvoices = useMemo(() => {
    return invoices.filter((i) => i.riskScore >= 20 || i.riskLevel !== 'LOW');
  }, [invoices]);

  const filteredAlerts = useMemo(() => {
    return flaggedInvoices.filter((inv) => {
      const matchSeverity =
        selectedSeverity === 'ALL' || inv.riskLevel === selectedSeverity;
      const matchSearch =
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.supplierGstin.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSeverity && matchSearch;
    });
  }, [flaggedInvoices, selectedSeverity, searchQuery]);

  const exportAlertsCSV = () => {
    const headers = ['Invoice Number', 'Vendor', 'GSTIN', 'Date', 'Grand Total (INR)', 'Risk Score', 'Risk Level', 'Status', 'Findings Count'];
    const rows = filteredAlerts.map((i) => [
      i.invoiceNumber,
      `"${i.supplierName}"`,
      i.supplierGstin,
      i.invoiceDate,
      i.grandTotal,
      i.riskScore,
      i.riskLevel,
      i.status,
      i.findings?.length || 0,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `InvoiceGuard_Fraud_Alerts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Fraud Alerts
            </h1>
            <span className="text-xs font-mono font-semibold text-slate-700">
              ({flaggedInvoices.length} flagged)
            </span>
          </div>
        </div>

        <button
          onClick={exportAlertsCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Audit Queue (CSV)
        </button>
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
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-blue-700 focus:ring-blue-700"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-600">Severity Filter:</span>
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 gap-1 shadow-sm">
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  selectedSeverity === sev
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {sev === 'ALL' ? 'All Alerts' : sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Cards List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-10 text-center text-xs text-slate-500 shadow-sm">
            {invoices.length === 0
              ? 'No invoices scanned yet. Upload distributor invoices or enter one manually to populate the fraud surveillance queue.'
              : 'No active fraud alerts matching this filter. All evaluated invoices meet compliance thresholds.'}
          </div>
        ) : (
          filteredAlerts.map((inv) => (
            <div
              key={inv.id}
              className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-slate-900">
                    {inv.invoiceNumber}
                  </span>
                  <RiskScoreBadge score={inv.riskScore} level={inv.riskLevel} />
                  <span className="text-xs text-slate-400 font-mono">
                    Dated: {formatDate(inv.invoiceDate)}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-700">
                    ({inv.findings?.length || 0} Rule Violations)
                  </span>
                </div>

                <div className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">{inv.supplierName}</span>
                  <span className="text-slate-400 ml-2 font-mono">{inv.supplierGstin}</span>
                </div>

                {/* Primary Violation Snippet */}
                {inv.findings && inv.findings.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-700 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-900">
                        {inv.findings[0].ruleName}:
                      </span>{' '}
                      <span className="text-slate-600">{inv.findings[0].message}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex md:flex-col items-center md:items-end justify-between shrink-0 gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                <div className="text-right">
                  <div className="text-xs text-slate-400">Total Billed</div>
                  <div className="text-sm font-bold font-mono text-slate-900">
                    {formatINR(inv.grandTotal)}
                  </div>
                </div>

                <button
                  onClick={() => onNavigateToInvoice(inv.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                >
                  Audit Dossier
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
