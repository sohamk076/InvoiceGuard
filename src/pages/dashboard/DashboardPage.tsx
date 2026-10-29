import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { DashboardStats } from '../../services/types';
import { formatINR, formatDate } from '../../lib/formatters';
import { RiskScoreBadge } from '../../components/fraud/RiskScoreBadge';
import {
  FileText,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FilePlus2,
  Users,
  ShoppingCart,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface DashboardPageProps {
  onNavigateToInvoice: (invoiceId: string) => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToInvoice,
  onNavigateToTab,
}) => {
  const [stats, setStats] = useState<DashboardStats>(() => store.getDashboardStats());

  useEffect(() => {
    setStats(store.getDashboardStats());
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateToTab('upload')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <UploadCloud className="h-4 w-4" />
            Scan Invoice
          </button>
          <button
            onClick={() => onNavigateToTab('manual-entry')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-sm transition-colors"
          >
            <FilePlus2 className="h-4 w-4" />
            Manual Entry
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoices */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Invoiced</span>
            <FileText className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {formatINR(stats.totalInvoicedValue)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{stats.totalInvoicesCount}</span> invoices processed
          </div>
        </div>

        {/* High Risk / Critical Alerts */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Critical Risk Flags</span>
            <ShieldAlert className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-700">
            {stats.highCriticalRiskCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Requiring immediate compliance hold
          </div>
        </div>

        {/* Clean / Compliant */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Clean Compliant</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            {stats.cleanInvoicesCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Verified across 3-way PO & GST rules
          </div>
        </div>

        {/* Average Risk Index */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Risk Index</span>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {stats.riskScoreAverage} <span className="text-xs text-slate-400 font-normal">/ 100</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="font-semibold text-slate-700">{stats.pendingReviewCount}</span> pending auditor signoff
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Monthly Processing Value vs Flagged Exposure
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Comparison of total invoiced volume against flagged risk value (₹)
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.monthlyTrends}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(value: any) => [formatINR(Number(value)), '']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#cbd5e1',
                    borderRadius: '6px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="totalAmount" name="Total Invoiced" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="flaggedAmount" name="Risk Exposure" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Distribution Breakdown */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 pb-2 border-b border-slate-100">
              Audit Risk Distribution
            </h3>
            <p className="text-xs text-slate-500 mt-2 mb-4">
              Classification of invoices across deterministic compliance tiers
            </p>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Clean / Compliant (0-20)</span>
                  <span className="font-mono font-semibold text-emerald-700">
                    {stats.riskDistribution.clean} ({stats.totalInvoicesCount ? Math.round((stats.riskDistribution.clean / stats.totalInvoicesCount) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-600 h-full rounded-full"
                    style={{
                      width: `${stats.totalInvoicesCount ? (stats.riskDistribution.clean / stats.totalInvoicesCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Medium Notice (21-49)</span>
                  <span className="font-mono font-semibold text-amber-700">
                    {stats.riskDistribution.medium}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{
                      width: `${stats.totalInvoicesCount ? (stats.riskDistribution.medium / stats.totalInvoicesCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">High Risk (50-79)</span>
                  <span className="font-mono font-semibold text-orange-700">
                    {stats.riskDistribution.high}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-orange-500 h-full rounded-full"
                    style={{
                      width: `${stats.totalInvoicesCount ? (stats.riskDistribution.high / stats.totalInvoicesCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Critical Fraud Alert (80-100)</span>
                  <span className="font-mono font-semibold text-rose-700">
                    {stats.riskDistribution.critical}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-600 h-full rounded-full"
                    style={{
                      width: `${stats.totalInvoicesCount ? (stats.riskDistribution.critical / stats.totalInvoicesCount) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => onNavigateToTab('alerts')}
              className="w-full text-center text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center justify-center gap-1 py-1 rounded-lg hover:bg-blue-50/50 transition-colors"
            >
              Inspect Active Fraud Queue
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recent Pharmaceutical Invoices</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest distributor consignments and fraud risk assessments</p>
          </div>
          {stats.totalInvoicesCount > 0 && (
            <button
              onClick={() => onNavigateToTab('invoices')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-blue-50/50 transition-colors"
            >
              View all invoices
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-full">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice No</th>
                <th className="py-3 px-4">Distributor / Supplier</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                <th className="py-3 px-4 text-center">Risk Assessment</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                    <div className="max-w-md mx-auto space-y-3">
                      <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                      <p className="font-medium text-slate-700">No pharmaceutical invoices registered yet</p>
                      <p className="text-slate-500 text-[11px]">
                        Scan an incoming distributor invoice or create a manual entry to trigger deterministic fraud verification, 3-way matching, and GST calculations.
                      </p>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <button
                          onClick={() => onNavigateToTab('upload')}
                          className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                        >
                          Scan Invoice
                        </button>
                        <button
                          onClick={() => onNavigateToTab('manual-entry')}
                          className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 shadow-sm transition-colors"
                        >
                          Manual Entry
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                stats.recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      <div>{inv.supplierName}</div>
                      <span className="font-mono text-[11px] text-slate-400">{inv.supplierGstin}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatINR(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <RiskScoreBadge score={inv.riskScore} level={inv.riskLevel} />
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700 font-medium">
                      {inv.status.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigateToInvoice(inv.id)}
                        className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
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
      </div>
    </div>
  );
};
