import React, { useState, useEffect } from 'react';
import {
  ExtractedInvoice,
  ExtractedLineItem,
  FieldConfidence,
} from '../../lib/ocr/invoice-parser';
import { InvoicePayload } from '../../lib/fraud-engine/types';
import { validateGSTIN, safeRound, safeAdd, safeSub } from '../../lib/gst';
import { formatINR } from '../../lib/formatters';
import {
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  FileCheck,
  Building2,
  Receipt,
  Layers,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';

interface InvoiceReviewModalProps {
  isOpen: boolean;
  fileName: string;
  extractedData: ExtractedInvoice;
  userStoreName?: string;
  userStoreGstin?: string;
  onConfirm: (confirmed: InvoicePayload) => void;
  onCancel: () => void;
}

export const InvoiceReviewModal: React.FC<InvoiceReviewModalProps> = ({
  isOpen,
  fileName,
  extractedData,
  userStoreName,
  userStoreGstin,
  onConfirm,
  onCancel,
}) => {
  // Invoice Header
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [purchaseOrderNumber, setPurchaseOrderNumber] = useState('');

  // Supplier Details
  const [supplierName, setSupplierName] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');
  const [supplierDrugLicense, setSupplierDrugLicense] = useState('');

  // Buyer Details
  const [buyerName, setBuyerName] = useState('');
  const [buyerGstin, setBuyerGstin] = useState('');
  const [buyerDrugLicense, setBuyerDrugLicense] = useState('');

  // Items
  const [items, setItems] = useState<ExtractedLineItem[]>([]);

  // Stated totals from invoice document
  const [statedSubtotal, setStatedSubtotal] = useState(0);
  const [statedTotalTax, setStatedTotalTax] = useState(0);
  const [statedGrandTotal, setStatedGrandTotal] = useState(0);

  // Confidence indicators tracker
  const [confidenceMap, setConfidenceMap] = useState<Record<string, FieldConfidence>>({});

  // Sync state when extractedData changes
  useEffect(() => {
    if (!extractedData) return;

    setInvoiceNumber(extractedData.invoiceNumber.value);
    setInvoiceDate(extractedData.invoiceDate.value);
    setDueDate(extractedData.dueDate?.value || '');
    setPurchaseOrderNumber(extractedData.purchaseOrderNumber?.value || '');

    setSupplierName(extractedData.supplierName.value);
    setSupplierGstin(extractedData.supplierGstin.value);
    setSupplierDrugLicense(extractedData.supplierDrugLicense?.value || '');

    // If buyer is unspecified, prioritize user's confirmed store profile
    setBuyerName(extractedData.buyerName.value || userStoreName || '');
    setBuyerGstin(extractedData.buyerGstin.value || userStoreGstin || '');
    setBuyerDrugLicense(extractedData.buyerDrugLicense?.value || '');

    setStatedSubtotal(extractedData.subtotal.value || 0);
    setStatedTotalTax(extractedData.totalTax.value || 0);
    setStatedGrandTotal(extractedData.grandTotal.value || 0);

    setItems(
      (extractedData.items || []).map(item => ({
        ...item,
      }))
    );

    setConfidenceMap({
      supplierName: extractedData.supplierName.confidence,
      supplierGstin: extractedData.supplierGstin.confidence,
      buyerName: extractedData.buyerName.confidence,
      buyerGstin: extractedData.buyerGstin.confidence,
      invoiceNumber: extractedData.invoiceNumber.confidence,
      invoiceDate: extractedData.invoiceDate.confidence,
      grandTotal: extractedData.grandTotal.confidence,
    });
  }, [extractedData, userStoreName, userStoreGstin]);

  if (!isOpen) return null;

  // Real-time calculations
  const computedSubtotal = safeRound(
    items.reduce((sum, item) => sum + (Number(item.taxableAmount) || 0), 0)
  );
  const computedTotalTax = safeRound(
    items.reduce((sum, item) => {
      const lineTax = (Number(item.taxableAmount) || 0) * ((Number(item.gstRate) || 0) / 100);
      return sum + lineTax;
    }, 0)
  );
  const computedGrandTotal = safeRound(safeAdd(computedSubtotal, computedTotalTax));
  const discrepancy = safeRound(Math.abs(safeSub(statedGrandTotal, computedGrandTotal)));
  const isBalanced = discrepancy <= 1.0;

  // GSTIN live validation
  const supplierGstinValidation = supplierGstin ? validateGSTIN(supplierGstin) : null;
  const buyerGstinValidation = buyerGstin ? validateGSTIN(buyerGstin) : null;

  // Line items handlers
  const handleItemChange = (
    index: number,
    field: keyof ExtractedLineItem,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any
  ) => {
    setItems(prev => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      if (field === 'quantity' || field === 'unitPrice' || field === 'discountAmount') {
        const qty = Number(field === 'quantity' ? value : item.quantity) || 0;
        const price = Number(field === 'unitPrice' ? value : item.unitPrice) || 0;
        const discount = Number(field === 'discountAmount' ? value : item.discountAmount) || 0;
        const taxable = safeRound(qty * price - discount);
        const gstRate = Number(item.gstRate) || 0;
        const lineTax = safeRound(taxable * (gstRate / 100));
        item.taxableAmount = taxable;
        item.cgstAmount = safeRound(lineTax / 2);
        item.sgstAmount = safeRound(lineTax / 2);
        item.totalAmount = safeRound(taxable + lineTax);
      } else if (field === 'gstRate') {
        const gstRate = Number(value) || 0;
        const taxable = Number(item.taxableAmount) || 0;
        const lineTax = safeRound(taxable * (gstRate / 100));
        item.cgstAmount = safeRound(lineTax / 2);
        item.sgstAmount = safeRound(lineTax / 2);
        item.totalAmount = safeRound(taxable + lineTax);
      }

      copy[index] = item;
      return copy;
    });
  };

  const handleAddItem = () => {
    const newItem: ExtractedLineItem = {
      id: `item-${Date.now()}`,
      itemDescription: 'New Pharmaceutical Line Item',
      quantity: 1,
      unitPrice: 100.0,
      taxableAmount: 100.0,
      gstRate: 12,
      cgstAmount: 6.0,
      sgstAmount: 6.0,
      totalAmount: 112.0,
      confidence: 'high',
    };
    setItems(prev => [...prev, newItem]);
  };

  const handleDeleteItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Sync computed values to stated totals button
  const handleAutoReconcileTotals = () => {
    setStatedSubtotal(computedSubtotal);
    setStatedTotalTax(computedTotalTax);
    setStatedGrandTotal(computedGrandTotal);
  };

  const handleUseMyStoreProfile = () => {
    if (userStoreName) setBuyerName(userStoreName);
    if (userStoreGstin) setBuyerGstin(userStoreGstin);
  };

  const handleConfirm = () => {
    if (!invoiceNumber.trim()) {
      alert('Invoice number is required.');
      return;
    }
    if (!supplierName.trim()) {
      alert('Supplier name is required.');
      return;
    }

    const payload: InvoicePayload = {
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: invoiceDate || new Date().toISOString().slice(0, 10),
      dueDate: dueDate || undefined,
      supplierGstin: supplierGstin.trim().toUpperCase(),
      supplierName: supplierName.trim(),
      buyerGstin: buyerGstin.trim().toUpperCase(),
      buyerName: buyerName.trim(),
      purchaseOrderNumber: purchaseOrderNumber.trim() || undefined,
      subtotal: statedSubtotal || computedSubtotal,
      totalTax: statedTotalTax || computedTotalTax,
      cgstTotal: safeRound((statedTotalTax || computedTotalTax) / 2),
      sgstTotal: safeRound((statedTotalTax || computedTotalTax) / 2),
      igstTotal: 0,
      grandTotal: statedGrandTotal || computedGrandTotal,
      currency: 'INR',
      items: items.map(item => ({
        id: item.id,
        itemDescription: item.itemDescription,
        hsnCode: item.hsnCode,
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        taxableAmount: Number(item.taxableAmount) || 0,
        gstRate: Number(item.gstRate) || 0,
        cgstAmount: Number(item.cgstAmount) || 0,
        sgstAmount: Number(item.sgstAmount) || 0,
        igstAmount: Number(item.igstAmount) || 0,
        totalAmount: Number(item.totalAmount) || 0,
      })),
    };

    onConfirm(payload);
  };

  const renderConfidenceBadge = (confidence?: FieldConfidence) => {
    if (confidence === 'high') {
      return (
        <span className="inline-flex items-center text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
          OCR High Confidence
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
        Review Recommended
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-5xl my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">
                Interactive Invoice Review & Correction
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Document: <span className="font-semibold text-slate-700">{fileName}</span>. Review
              extracted fields against the invoice before running deterministic fraud analysis.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
          {/* Top Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-800 leading-relaxed">
              Verify that the extracted Supplier, Buyer, and Grand Total reflect your invoice.
              Any fields needing clarification can be edited directly below. Saved data will be
              analyzed by the 6-module deterministic fraud engine.
            </div>
          </div>

          {/* Section 1: Parties (Supplier & Buyer) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Supplier Card */}
            <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Supplier / Distributor
                  </span>
                </div>
                {renderConfidenceBadge(confidenceMap.supplierName)}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supplier Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={supplierName}
                  onChange={e => setSupplierName(e.target.value)}
                  placeholder="e.g. Shivam Pharma"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Supplier GSTIN <span className="text-rose-500">*</span>
                  </label>
                  {renderConfidenceBadge(confidenceMap.supplierGstin)}
                </div>
                <input
                  type="text"
                  value={supplierGstin}
                  onChange={e => setSupplierGstin(e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN (e.g. 07AAACS1429B1Z2)"
                  maxLength={15}
                  className="w-full px-3.5 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {supplierGstin && (
                  <div className="mt-1 text-[11px]">
                    {supplierGstinValidation?.isValid ? (
                      <span className="text-emerald-700 flex items-center gap-1 font-medium">
                        <CheckCircle className="w-3 h-3" /> Format valid • State: {supplierGstinValidation.stateName}
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {supplierGstinValidation?.errors[0] || 'Invalid GSTIN structure'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Drug License Number (Optional)
                </label>
                <input
                  type="text"
                  value={supplierDrugLicense}
                  onChange={e => setSupplierDrugLicense(e.target.value)}
                  placeholder="e.g. 20B-123456, 21B-654321"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Buyer Card */}
            <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Buyer / Billed Store
                  </span>
                </div>
                {userStoreName && (
                  <button
                    type="button"
                    onClick={handleUseMyStoreProfile}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold underline"
                  >
                    Use My Store Profile
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Buyer Medical Store Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={buyerName}
                  onChange={e => setBuyerName(e.target.value)}
                  placeholder="e.g. M/S Khullar Medicos"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Buyer GSTIN
                  </label>
                  {renderConfidenceBadge(confidenceMap.buyerGstin)}
                </div>
                <input
                  type="text"
                  value={buyerGstin}
                  onChange={e => setBuyerGstin(e.target.value.toUpperCase())}
                  placeholder="15-character GSTIN (e.g. 06AABCK9918M1ZQ)"
                  maxLength={15}
                  className="w-full px-3.5 py-2 text-xs font-mono uppercase border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {buyerGstin && (
                  <div className="mt-1 text-[11px]">
                    {buyerGstinValidation?.isValid ? (
                      <span className="text-emerald-700 flex items-center gap-1 font-medium">
                        <CheckCircle className="w-3 h-3" /> Format valid • State: {buyerGstinValidation.stateName}
                      </span>
                    ) : (
                      <span className="text-amber-700 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {buyerGstinValidation?.errors[0] || 'Invalid GSTIN structure'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Drug License Number (Optional)
                </label>
                <input
                  type="text"
                  value={buyerDrugLicense}
                  onChange={e => setBuyerDrugLicense(e.target.value)}
                  placeholder="e.g. 20B-998877"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Header Metadata */}
          <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-sm">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block mb-3 border-b border-slate-100 pb-2">
              Invoice Header & References
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. SP/2026/0892"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Invoice Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={e => setInvoiceDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PO Reference Number
                </label>
                <input
                  type="text"
                  value={purchaseOrderNumber}
                  onChange={e => setPurchaseOrderNumber(e.target.value)}
                  placeholder="e.g. PO-PH-2026-001"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Line Items Table */}
          <div className="border border-slate-200/90 rounded-2xl p-5 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Line Items & Medicinal Products ({items.length})
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 min-w-[200px]">Description</th>
                    <th className="py-2.5 px-2 w-20">HSN</th>
                    <th className="py-2.5 px-2 w-16 text-right">Qty</th>
                    <th className="py-2.5 px-2 w-24 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-2 w-20 text-right">Disc (₹)</th>
                    <th className="py-2.5 px-2 w-24 text-right">Taxable (₹)</th>
                    <th className="py-2.5 px-2 w-20 text-right">GST %</th>
                    <th className="py-2.5 px-2 w-24 text-right">Total (₹)</th>
                    <th className="py-2.5 px-2 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.itemDescription}
                          onChange={e => handleItemChange(idx, 'itemDescription', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="text"
                          value={item.hsnCode || ''}
                          onChange={e => handleItemChange(idx, 'hsnCode', e.target.value)}
                          placeholder="3004"
                          className="w-full px-1.5 py-1 text-xs border border-slate-200 rounded-lg focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs text-right border border-slate-200 rounded-lg focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs text-right border border-slate-200 rounded-lg focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={item.discountAmount || 0}
                          onChange={e => handleItemChange(idx, 'discountAmount', e.target.value)}
                          className="w-full px-1.5 py-1 text-xs text-right border border-slate-200 rounded-lg focus:border-indigo-500"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-slate-800">
                        {formatINR(item.taxableAmount)}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <select
                          value={item.gstRate}
                          onChange={e => handleItemChange(idx, 'gstRate', Number(e.target.value))}
                          className="w-full px-1 py-1 text-xs text-right border border-slate-200 rounded-lg focus:border-indigo-500 bg-white"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900">
                        {formatINR(item.totalAmount)}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          disabled={items.length === 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Real-Time Arithmetic Reconciliation & Discrepancy Box */}
          <div className="border border-slate-200/90 rounded-2xl p-5 bg-slate-50 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Real-Time Arithmetic Reconciliation & Verification
              </span>
              {!isBalanced && (
                <button
                  type="button"
                  onClick={handleAutoReconcileTotals}
                  className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold underline"
                >
                  Sync Stated Totals to Line Item Sum
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Computed from items */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-sm">
                <span className="font-semibold text-slate-500 block uppercase text-[10px] tracking-wider">
                  Computed From Line Items
                </span>
                <div className="flex justify-between text-slate-700">
                  <span>Line Items Subtotal:</span>
                  <span className="font-semibold">{formatINR(computedSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Computed Tax (GST):</span>
                  <span className="font-semibold">{formatINR(computedTotalTax)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-slate-900">
                  <span>Calculated Grand Total:</span>
                  <span>{formatINR(computedGrandTotal)}</span>
                </div>
              </div>

              {/* Stated on document */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-sm">
                <span className="font-semibold text-slate-500 block uppercase text-[10px] tracking-wider">
                  Stated On Physical/Digital Invoice
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Stated Subtotal:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={statedSubtotal}
                    onChange={e => setStatedSubtotal(Number(e.target.value) || 0)}
                    className="w-28 px-2 py-1 text-xs text-right border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-700">Stated Total Tax:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={statedTotalTax}
                    onChange={e => setStatedTotalTax(Number(e.target.value) || 0)}
                    className="w-28 px-2 py-1 text-xs text-right border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-100 font-bold">
                  <span className="text-slate-900">Stated Grand Total:</span>
                  <input
                    type="number"
                    step="0.01"
                    value={statedGrandTotal}
                    onChange={e => setStatedGrandTotal(Number(e.target.value) || 0)}
                    className="w-28 px-2 py-1 text-xs text-right border border-slate-300 rounded-lg font-bold text-slate-900 bg-amber-50/50"
                  />
                </div>
              </div>

              {/* Status & Discrepancy Card */}
              <div
                className={`p-4 rounded-xl border text-xs flex flex-col justify-between shadow-sm ${
                  isBalanced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold mb-1">
                    {isBalanced ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        <span>Arithmetic Balanced</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Arithmetic Discrepancy Detected</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {isBalanced
                      ? 'The stated grand total matches the computed sum of line items and GST tax within commercial tolerance (≤ ₹1.00).'
                      : `Difference of ${formatINR(
                          discrepancy
                        )} between stated grand total (${formatINR(
                          statedGrandTotal
                        )}) and computed sum (${formatINR(computedGrandTotal)}).`}
                  </p>
                </div>

                {!isBalanced && (
                  <div className="text-[10px] text-amber-800 bg-amber-100/60 p-2 rounded-lg mt-2">
                    Tip: You can edit line items above, click &quot;Sync Stated Totals&quot;, or proceed to let
                    the fraud engine flag this discrepancy.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
          >
            Cancel & Discard
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow transition-colors"
            >
              <span>Confirm & Run Fraud Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
