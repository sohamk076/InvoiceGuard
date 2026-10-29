import React, { useState, useMemo, useEffect } from 'react';
import { store } from '../../services/store';
import { useAuth } from '../../services/auth';
import { validateGSTIN, determineSupplyType, calculateGstTaxes } from '../../lib/gst';
import { formatINR } from '../../lib/formatters';
import { Plus, Trash2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface ManualInvoiceEntryPageProps {
  onNavigateToInvoice: (id: string) => void;
}

interface FormLineItem {
  id: string;
  itemDescription: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  gstRate: number; // e.g. 18
}

export const ManualInvoiceEntryPage: React.FC<ManualInvoiceEntryPageProps> = ({
  onNavigateToInvoice,
}) => {
  const { user } = useAuth();
  const purchaseOrders = useMemo(() => store.getPurchaseOrders(), []);

  // Header State - Clean initial values, no automatically inserted fake vendor or GSTIN
  const [supplierName, setSupplierName] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierGstinError, setSupplierGstinError] = useState<string | null>(null);
  const [supplierGstinValidated, setSupplierGstinValidated] = useState(false);
  const [supplierStateInfo, setSupplierStateInfo] = useState<string | null>(null);

  const [buyerName, setBuyerName] = useState(user?.organizationName || '');
  const [buyerGstin, setBuyerGstin] = useState(user?.organizationGstin || '');
  const [buyerGstinError, setBuyerGstinError] = useState<string | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Date.now().toString().slice(-5)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [selectedPoNumber, setSelectedPoNumber] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (!buyerName && user.organizationName) setBuyerName(user.organizationName);
      if (!buyerGstin && user.organizationGstin) setBuyerGstin(user.organizationGstin);
    }
  }, [user, buyerName, buyerGstin]);

  // Line items state
  const [items, setItems] = useState<FormLineItem[]>([
    {
      id: 'item-1',
      itemDescription: 'Amoxicillin 500mg Capsules (Box of 10x10)',
      hsnCode: '3004',
      quantity: 50,
      unitPrice: 450,
      discountAmount: 0,
      gstRate: 12,
    },
  ]);

  // Supplier GSTIN validation handlers
  // Do NOT show red border or error message while typing
  const handleSupplierGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setSupplierGstin(val);
    setSupplierGstinError(null);
    setSupplierGstinValidated(false);
    setSupplierStateInfo(null);
  };

  // Validate on blur
  const handleSupplierGstinBlur = () => {
    const clean = supplierGstin.trim().toUpperCase();
    if (!clean) {
      setSupplierGstinError('Supplier GSTIN is required.');
      setSupplierGstinValidated(false);
      setSupplierStateInfo(null);
      return;
    }

    const result = validateGSTIN(clean);
    if (!result.isValid) {
      setSupplierGstinError(result.errors[0] || 'Invalid GSTIN format');
      setSupplierGstinValidated(false);
      setSupplierStateInfo(null);
    } else {
      setSupplierGstinError(null);
      setSupplierGstinValidated(true);
      setSupplierStateInfo(
        result.stateName ? `${result.stateCode} (${result.stateName})` : result.stateCode || null
      );
    }
  };

  // Buyer GSTIN validation handlers (optional field)
  const handleBuyerGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBuyerGstin(e.target.value.toUpperCase());
    setBuyerGstinError(null);
  };

  const handleBuyerGstinBlur = () => {
    const clean = buyerGstin.trim().toUpperCase();
    if (clean) {
      const result = validateGSTIN(clean);
      if (!result.isValid) {
        setBuyerGstinError(result.errors[0] || 'Invalid GSTIN format');
      } else {
        setBuyerGstinError(null);
      }
    } else {
      setBuyerGstinError(null);
    }
  };

  const supplyType = useMemo(
    () => determineSupplyType(supplierGstin, buyerGstin),
    [supplierGstin, buyerGstin]
  );

  // Calculations
  const calculatedLines = useMemo(() => {
    return items.map(item => {
      const taxable = Math.max(0, item.quantity * item.unitPrice - (item.discountAmount || 0));
      const taxSplit = calculateGstTaxes(taxable, item.gstRate, supplyType);

      return {
        ...item,
        taxableAmount: taxable,
        cgstAmount: taxSplit.cgstAmount,
        sgstAmount: taxSplit.sgstAmount,
        igstAmount: taxSplit.igstAmount,
        totalTax: taxSplit.totalTax,
        totalAmount: taxSplit.totalAmount,
      };
    });
  }, [items, supplyType]);

  const subtotal = calculatedLines.reduce((sum, line) => sum + line.taxableAmount, 0);
  const totalCgst = calculatedLines.reduce((sum, line) => sum + line.cgstAmount, 0);
  const totalSgst = calculatedLines.reduce((sum, line) => sum + line.sgstAmount, 0);
  const totalIgst = calculatedLines.reduce((sum, line) => sum + line.igstAmount, 0);
  const totalTax = totalCgst + totalSgst + totalIgst;
  const grandTotal = subtotal + totalTax;

  const addItemRow = () => {
    setItems(prev => [
      ...prev,
      {
        id: `item-${Date.now().toString(36)}`,
        itemDescription: '',
        hsnCode: '',
        quantity: 1,
        unitPrice: 0,
        discountAmount: 0,
        gstRate: 18,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateItem = (index: number, field: keyof FormLineItem, val: any) => {
    setItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!invoiceNumber.trim()) {
      setError('Invoice number is required.');
      return;
    }

    if (!supplierName.trim()) {
      setError('Supplier name is required.');
      return;
    }

    const cleanSupplierGstin = supplierGstin.trim().toUpperCase();
    if (!cleanSupplierGstin) {
      setSupplierGstinError('Supplier GSTIN is required.');
      setError('Supplier GSTIN is required.');
      return;
    }

    const gstinValidation = validateGSTIN(cleanSupplierGstin);
    if (!gstinValidation.isValid) {
      setSupplierGstinError(gstinValidation.errors[0] || 'Invalid GSTIN format');
      setError('Please provide a valid 15-character Indian GSTIN for the supplier.');
      return;
    }

    if (buyerGstin.trim()) {
      const buyerValidation = validateGSTIN(buyerGstin.trim().toUpperCase());
      if (!buyerValidation.isValid) {
        setBuyerGstinError(buyerValidation.errors[0] || 'Invalid GSTIN format');
        setError('Please correct the invalid Buyer GSTIN format.');
        return;
      }
    }

    if (items.some(it => !it.itemDescription.trim() || it.unitPrice <= 0)) {
      setError('Please provide valid description and unit price for all line items.');
      return;
    }

    const linkedPo = purchaseOrders.find(p => p.poNumber === selectedPoNumber);

    const payload = {
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate,
      dueDate,
      supplierGstin: cleanSupplierGstin,
      supplierName: supplierName.trim(),
      buyerGstin: buyerGstin.trim().toUpperCase(),
      buyerName: buyerName.trim(),
      purchaseOrderId: linkedPo?.id,
      purchaseOrderNumber: linkedPo?.poNumber || (selectedPoNumber ? selectedPoNumber : undefined),
      subtotal,
      totalTax,
      cgstTotal: totalCgst,
      sgstTotal: totalSgst,
      igstTotal: totalIgst,
      grandTotal,
      currency: 'INR',
      source: 'MANUAL' as const,
      status: 'PENDING_REVIEW' as const,
      items: calculatedLines.map(line => ({
        id: line.id,
        invoiceId: '',
        itemDescription: line.itemDescription,
        hsnCode: line.hsnCode,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount,
        taxableAmount: line.taxableAmount,
        gstRate: line.gstRate,
        cgstAmount: line.cgstAmount,
        sgstAmount: line.sgstAmount,
        igstAmount: line.igstAmount,
        totalAmount: line.totalAmount,
      })),
    };

    const { invoice } = store.addInvoice(payload);
    onNavigateToInvoice(invoice.id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Manual Invoice Entry
          </h1>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          Submit & Run Fraud Engine
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3.5 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Header Form */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          Invoice Header & Tax Identifiers
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={supplierName}
              onChange={e => setSupplierName(e.target.value)}
              placeholder="e.g. Apex Pharmaceuticals LLP"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:border-blue-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Supplier GSTIN <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              maxLength={15}
              value={supplierGstin}
              onChange={handleSupplierGstinChange}
              onBlur={handleSupplierGstinBlur}
              placeholder="15-character GSTIN (e.g. 27AAACA1234A1Z5)"
              className={`w-full rounded-xl border font-mono uppercase bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                supplierGstinError
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-slate-300 focus:border-blue-700'
              }`}
            />
            <div className="mt-1 text-[11px]">
              {supplierGstinError ? (
                <span className="text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {supplierGstinError}
                </span>
              ) : supplierGstinValidated && supplierStateInfo ? (
                <span className="text-emerald-700 flex items-center gap-1 font-medium">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  Format valid • State: {supplierStateInfo}
                </span>
              ) : (
                <span className="text-slate-400">15-character Indian GSTIN format</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invoice Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={e => setInvoiceNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:border-blue-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invoice Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={invoiceDate}
              onChange={e => setInvoiceDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:border-blue-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:border-blue-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient Buyer GSTIN
            </label>
            <input
              type="text"
              maxLength={15}
              value={buyerGstin}
              onChange={handleBuyerGstinChange}
              onBlur={handleBuyerGstinBlur}
              placeholder="Optional 15-character GSTIN"
              className={`w-full rounded-xl border font-mono uppercase bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                buyerGstinError
                  ? 'border-rose-400 focus:border-rose-500'
                  : 'border-slate-300 focus:border-blue-700'
              }`}
            />
            <div className="mt-1 text-[11px]">
              {buyerGstinError ? (
                <span className="text-rose-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {buyerGstinError}
                </span>
              ) : (
                <span className="text-slate-500">
                  Supply Type:{' '}
                  <span className="font-semibold text-slate-800">
                    {supplyType === 'INTRA_STATE'
                      ? 'Intra-State (CGST + SGST)'
                      : 'Inter-State (IGST)'}
                  </span>
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Recipient Name
            </label>
            <input
              type="text"
              value={buyerName}
              onChange={e => setBuyerName(e.target.value)}
              placeholder="e.g. Medical Store / Pharmacy Name"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:border-blue-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Linked Purchase Order
            </label>
            <select
              value={selectedPoNumber}
              onChange={e => setSelectedPoNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:border-blue-700"
            >
              <option value="">None (Non-PO Invoice)</option>
              {purchaseOrders.map(po => (
                <option key={po.id} value={po.poNumber}>
                  {po.poNumber}: {formatINR(po.totalAmount)} ({po.vendorGstin})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Medicinal Products & Taxable Consignments ({items.length})
          </h3>
          <button
            type="button"
            onClick={addItemRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Line Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3 min-w-[200px]">Description</th>
                <th className="py-2 px-2 w-24">HSN Code</th>
                <th className="py-2 px-2 w-20 text-right">Quantity</th>
                <th className="py-2 px-2 w-24 text-right">Unit Rate (₹)</th>
                <th className="py-2 px-2 w-20 text-right">Disc (₹)</th>
                <th className="py-2 px-2 w-24 text-right">Taxable (₹)</th>
                <th className="py-2 px-2 w-20 text-right">GST %</th>
                <th className="py-2 px-2 w-24 text-right">Tax (₹)</th>
                <th className="py-2 px-2 w-24 text-right">Line Total (₹)</th>
                <th className="py-2 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calculatedLines.map((line, idx) => (
                <tr key={line.id} className="hover:bg-slate-50/50">
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Paracetamol 650mg Tablets"
                      value={line.itemDescription}
                      onChange={e => updateItem(idx, 'itemDescription', e.target.value)}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      placeholder="3004"
                      value={line.hsnCode}
                      onChange={e => updateItem(idx, 'hsnCode', e.target.value)}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      min="1"
                      required
                      value={line.quantity}
                      onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={line.unitPrice}
                      onChange={e => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={line.discountAmount}
                      onChange={e =>
                        updateItem(idx, 'discountAmount', parseFloat(e.target.value) || 0)
                      }
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs text-right text-slate-900 focus:outline-none focus:border-blue-700"
                    />
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-medium text-slate-800">
                    {formatINR(line.taxableAmount)}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <select
                      value={line.gstRate}
                      onChange={e => updateItem(idx, 'gstRate', parseInt(e.target.value) || 0)}
                      className="rounded border border-slate-200 px-1 py-1 text-xs text-right text-slate-900 focus:outline-none focus:border-blue-700 bg-white"
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-slate-600">
                    {formatINR(line.totalTax)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-slate-900">
                    {formatINR(line.totalAmount)}
                  </td>
                  <td className="py-2 px-2 text-center">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => removeItemRow(idx)}
                      className="text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <div className="w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Taxable Value:</span>
              <span className="font-mono font-semibold text-slate-900">{formatINR(subtotal)}</span>
            </div>

            {supplyType === 'INTRA_STATE' ? (
              <>
                <div className="flex justify-between text-slate-600">
                  <span>Central GST (CGST):</span>
                  <span className="font-mono text-slate-800">{formatINR(totalCgst)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>State GST (SGST):</span>
                  <span className="font-mono text-slate-800">{formatINR(totalSgst)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-slate-600">
                <span>Integrated GST (IGST):</span>
                <span className="font-mono text-slate-800">{formatINR(totalIgst)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Total Tax (GST):</span>
              <span className="font-mono font-semibold text-slate-800">{formatINR(totalTax)}</span>
            </div>

            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
              <span>Grand Total:</span>
              <span className="font-mono text-blue-700">{formatINR(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
