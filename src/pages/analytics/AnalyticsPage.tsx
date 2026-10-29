import React, { useMemo } from 'react';
import { store } from '../../services/store';
import { formatINR } from '../../lib/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, Download, ShieldCheck, AlertTriangle } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const invoices = useMemo(() => store.getInvoices(), []);
  const vendors = useMemo(() => store.getVendors(), []);

  // Category breakdown
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {
      'Duplicate Invoices': 0,
      'GSTIN & Inter/Intra State': 0,
      'Math & Tax Discrepancies': 0,
      'Suspicious Dates & Timing': 0,
      'Amount Anomalies': 0,
      'PO 3-Way Mismatches': 0,
    };

    invoices.forEach((inv) => {
      (inv.findings || []).forEach((f) => {
        if (f.category === 'DUPLICATE') counts['Duplicate Invoices']++;
        if (f.category === 'GSTIN') counts['GSTIN & Inter/Intra State']++;
        if (f.category === 'TAX_MATH') counts['Math & Tax Discrepancies']++;
        if (f.category === 'DATES') counts['Suspicious Dates & Timing']++;
        if (f.category === 'AMOUNTS') counts['Amount Anomalies']++;
        if (f.category === 'PO_MATCH') counts['PO 3-Way Mismatches']++;
      });
    });

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [invoices]);

  // Risk Distribution Data for Pie Chart
  const riskPieData = useMemo(() => {
    const clean = invoices.filter((i) => i.riskLevel === 'LOW').length;
    const medium = invoices.filter((i) => i.riskLevel === 'MEDIUM').length;
    const high = invoices.filter((i) => i.riskLevel === 'HIGH').length;
    const critical = invoices.filter((i) => i.riskLevel === 'CRITICAL').length;

    return [
      { name: 'Clean (0-20)', value: clean, color: '#059669' },
      { name: 'Medium (21-49)', value: medium, color: '#d97706' },
      { name: 'High (50-79)', value: high, color: '#ea580c' },
      { name: 'Critical (80-100)', value: critical, color: '#e11d48' },
    ];
  }, [invoices]);

  // Vendor risk spend
  const vendorSpendData = useMemo(() => {
    return vendors.slice(0, 5).map((v) => ({
      name: v.name.length > 18 ? v.name.substring(0, 18) + '...' : v.name,
      spend: v.totalInvoicedAmount,
    }));
  }, [vendors]);

  // Aggregate Tax Totals
  const taxTotals = useMemo(() => {
    return invoices.reduce(
      (acc, inv) => {
        acc.cgst += inv.cgstTotal || 0;
        acc.sgst += inv.sgstTotal || 0;
        acc.igst += inv.igstTotal || 0;
        acc.grandTotal += inv.grandTotal;
        return acc;
      },
      { cgst: 0, sgst: 0, igst: 0, grandTotal: 0 }
    );
  }, [invoices]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Analytics & Reports
          </h1>
        </div>
      </div>

      {/* Tax Volume Aggregation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Audited Spend
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatINR(taxTotals.grandTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Across all vendor ledgers</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Central GST (CGST)
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatINR(taxTotals.cgst)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Intra-state central component</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            State GST (SGST)
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatINR(taxTotals.sgst)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Intra-state state component</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Integrated GST (IGST)
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {formatINR(taxTotals.igst)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Inter-state integrated component</div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center text-xs text-slate-500 shadow-sm">
          <BarChart3 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-slate-800 text-sm">No analytics data recorded yet</p>
          <p className="text-slate-500 mt-1 max-w-sm mx-auto">
            Once distributor invoices are processed through the fraud detection engine, rule violation breakdowns, risk proportions, and vendor spend exposure will be aggregated here.
          </p>
        </div>
      ) : (
        /* Charts Grid */
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Violations by Category */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Rule Violations by Compliance Category
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Frequency of deterministic rule triggers across all active scan runs
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <XAxis type="number" stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  fontSize={10}
                  width={140}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" name="Violations Count" fill="#1d4ed8" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Pie */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Invoice Risk Profile Proportions
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Proportion of volume evaluated as Clean, Medium Notice, High, or Critical
          </p>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {riskPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} invoice(s)`, name]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Suppliers Spend Exposure */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">
            Vendor Historical Invoiced Volume (₹)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Aggregate procurement spend across key registered enterprise suppliers
          </p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vendorSpendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(val: any) => [formatINR(Number(val)), 'Total Invoiced']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="spend" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};
