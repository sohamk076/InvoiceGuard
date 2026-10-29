import React from 'react';
import { formatINR } from '../../lib/formatters';

interface TaxReconciliationTableProps {
  reconciliation?: {
    calculatedSubtotal: number;
    statedSubtotal: number;
    calculatedTax: number;
    statedTax: number;
    calculatedGrandTotal: number;
    statedGrandTotal: number;
    discrepancy: number;
    isBalanced: boolean;
  };
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
}

export const TaxReconciliationTable: React.FC<TaxReconciliationTableProps> = ({
  reconciliation,
  cgstTotal = 0,
  sgstTotal = 0,
  igstTotal = 0,
}) => {
  if (!reconciliation) return null;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-800">
          Arithmetic & Tax Schedule Reconciliation
        </span>
        {reconciliation.isBalanced ? (
          <span className="text-xs font-semibold text-slate-800">
            Balanced
          </span>
        ) : (
          <span className="text-xs font-semibold text-slate-900">
            Discrepancy: {formatINR(reconciliation.discrepancy)}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-600">
            <tr>
              <th className="py-2 px-4 font-medium">Reconciliation Line</th>
              <th className="py-2 px-4 text-right font-medium">Stated in Header</th>
              <th className="py-2 px-4 text-right font-medium">Calculated from Items</th>
              <th className="py-2 px-4 text-right font-medium">Variance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-2 px-4 font-medium text-slate-900">Taxable Subtotal</td>
              <td className="py-2 px-4 text-right font-mono">{formatINR(reconciliation.statedSubtotal)}</td>
              <td className="py-2 px-4 text-right font-mono">{formatINR(reconciliation.calculatedSubtotal)}</td>
              <td className="py-2 px-4 text-right font-mono text-slate-700">
                {formatINR(Math.abs(reconciliation.statedSubtotal - reconciliation.calculatedSubtotal))}
              </td>
            </tr>
            <tr>
              <td className="py-2 px-4 font-medium text-slate-900">Total Tax (CGST+SGST+IGST)</td>
              <td className="py-2 px-4 text-right font-mono">{formatINR(reconciliation.statedTax)}</td>
              <td className="py-2 px-4 text-right font-mono">{formatINR(reconciliation.calculatedTax)}</td>
              <td className="py-2 px-4 text-right font-mono text-slate-700">
                {formatINR(Math.abs(reconciliation.statedTax - reconciliation.calculatedTax))}
              </td>
            </tr>
            <tr className="bg-slate-50/60 font-semibold text-slate-900">
              <td className="py-2.5 px-4">Grand Total Payable</td>
              <td className="py-2.5 px-4 text-right font-mono">
                {formatINR(reconciliation.statedGrandTotal)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono">
                {formatINR(reconciliation.calculatedGrandTotal)}
              </td>
              <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                {formatINR(reconciliation.discrepancy)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 grid grid-cols-3 text-[11px] text-slate-600">
        <div>
          <span className="text-slate-400">Billed CGST:</span>{' '}
          <span className="font-mono font-medium text-slate-800">{formatINR(cgstTotal)}</span>
        </div>
        <div>
          <span className="text-slate-400">Billed SGST:</span>{' '}
          <span className="font-mono font-medium text-slate-800">{formatINR(sgstTotal)}</span>
        </div>
        <div>
          <span className="text-slate-400">Billed IGST:</span>{' '}
          <span className="font-mono font-medium text-slate-800">{formatINR(igstTotal)}</span>
        </div>
      </div>
    </div>
  );
};
