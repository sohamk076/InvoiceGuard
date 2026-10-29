import React from 'react';
import { InvoiceItem, PurchaseOrder } from '../../services/types';
import { formatINR } from '../../lib/formatters';

interface ThreeWayMatchTableProps {
  invoiceItems: InvoiceItem[];
  purchaseOrder?: PurchaseOrder;
}

export const ThreeWayMatchTable: React.FC<ThreeWayMatchTableProps> = ({
  invoiceItems,
  purchaseOrder,
}) => {
  if (!purchaseOrder) {
    return (
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-6 text-center text-xs text-slate-500 shadow-sm">
        No approved Purchase Order linked to this invoice. 3-way reconciliation cannot be performed.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200/90 rounded-2xl bg-white shadow-sm overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
          <tr>
            <th className="py-2.5 px-3">Item Description</th>
            <th className="py-2.5 px-3 text-right">PO Qty</th>
            <th className="py-2.5 px-3 text-right">Billed Qty</th>
            <th className="py-2.5 px-3 text-right">PO Rate</th>
            <th className="py-2.5 px-3 text-right">Billed Rate</th>
            <th className="py-2.5 px-3 text-right">PO Amount</th>
            <th className="py-2.5 px-3 text-right">Billed Amount</th>
            <th className="py-2.5 px-3 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoiceItems.map((invItem) => {
            const poItem = purchaseOrder.items.find(
              (p) =>
                p.itemDescription.toLowerCase().trim() === invItem.itemDescription.toLowerCase().trim() ||
                (p.hsnCode && invItem.hsnCode && p.hsnCode === invItem.hsnCode)
            );

            const isPriceInflated = poItem ? invItem.unitPrice > poItem.unitPrice + 0.05 : false;
            const isQtyOverbilled = poItem ? invItem.quantity > poItem.quantity : false;
            const isMissingFromPO = !poItem;

            let statusText = 'Matched';
            if (isMissingFromPO) {
              statusText = 'Uncontracted Item';
            } else if (isPriceInflated || isQtyOverbilled) {
              statusText =
                isPriceInflated && isQtyOverbilled
                  ? 'Price & Quantity Discrepancy'
                  : isPriceInflated
                  ? 'Price Inflation'
                  : 'Quantity Overbilled';
            }

            return (
              <tr key={invItem.id} className="hover:bg-slate-50/50">
                <td className="py-2.5 px-3 font-medium text-slate-900">
                  {invItem.itemDescription}
                  {invItem.hsnCode && (
                    <span className="block text-[11px] text-slate-500 font-mono">
                      HSN: {invItem.hsnCode}
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                  {poItem ? poItem.quantity : '-'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                  {invItem.quantity}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                  {poItem ? formatINR(poItem.unitPrice) : '-'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-900">
                  {formatINR(invItem.unitPrice)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                  {poItem ? formatINR(poItem.totalAmount) : '-'}
                </td>
                <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                  {formatINR(invItem.totalAmount)}
                </td>
                <td className="py-2.5 px-3 text-center font-medium text-slate-800">
                  {statusText}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
