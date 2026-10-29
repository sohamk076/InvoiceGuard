import React, { useState, useMemo } from 'react';
import { store } from '../../services/store';
import { PurchaseOrder } from '../../services/types';
import { formatINR, formatDate } from '../../lib/formatters';
import { Modal } from '../../components/ui/Modal';
import { Search, Plus, ShoppingCart, Trash2, ArrowRight } from 'lucide-react';

export const PurchaseOrdersPage: React.FC = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() =>
    store.getPurchaseOrders()
  );
  const vendors = useMemo(() => store.getVendors(), []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New PO State
  const [poNumber, setPoNumber] = useState(`PO-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    {
      id: 'poi-1',
      itemDescription: '',
      hsnCode: '',
      quantity: 1,
      unitPrice: 0,
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(
      (po) =>
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendorGstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (po.vendorName && po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [purchaseOrders, searchQuery]);

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `poi-${Date.now().toString(36)}`,
        itemDescription: '',
        hsnCode: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const calculatedTotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0), 0);
  }, [items]);

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!poNumber.trim()) {
      setFormError('Purchase Order number is required.');
      return;
    }
    const vendor = vendors.find((v) => v.id === selectedVendorId);
    if (!vendor) {
      setFormError('Please select a registered supplier.');
      return;
    }
    if (items.some((it) => !it.itemDescription.trim() || it.unitPrice <= 0)) {
      setFormError('All line items require description and unit price.');
      return;
    }

    const res = store.addPurchaseOrder({
      poNumber: poNumber.trim().toUpperCase(),
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorGstin: vendor.gstin,
      orderDate,
      totalAmount: calculatedTotal,
      status: 'OPEN',
      notes: notes.trim() || undefined,
      items: items.map((it) => ({
        id: it.id,
        purchaseOrderId: '',
        itemDescription: it.itemDescription.trim(),
        hsnCode: it.hsnCode.trim() || undefined,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalAmount: it.quantity * it.unitPrice,
      })),
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to create PO.');
      return;
    }

    setPurchaseOrders(store.getPurchaseOrders());
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Purchase Orders
          </h1>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Purchase Order
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search POs by number, vendor, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-blue-700 focus:ring-blue-700"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filteredPOs.length} Active Orders
        </span>
      </div>

      {/* PO Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-2.5 px-4">PO Number</th>
                <th className="py-2.5 px-4">Vendor Entity & GSTIN</th>
                <th className="py-2.5 px-4">Order Date</th>
                <th className="py-2.5 px-4 text-center">Items</th>
                <th className="py-2.5 px-4 text-right">Approved Value (₹)</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPOs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-500">
                    {purchaseOrders.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-3">
                        <ShoppingCart className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-800 text-sm">No purchase orders created yet</p>
                        <p className="text-slate-500 text-xs">
                          Create purchase orders for pharmaceutical suppliers to enable automated 3-way matching and detect uncontracted price inflation or overbilling.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Create Purchase Order
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span>No purchase orders found matching current search.</span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4 text-slate-400" />
                        <span>{po.poNumber}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {po.vendorName || 'Registered Vendor'}
                      </div>
                      <span className="font-mono text-[11px] text-slate-400">{po.vendorGstin}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(po.orderDate)}</td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {po.items.length} line item(s)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {formatINR(po.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-700 font-medium text-xs">
                      {po.status}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create PO Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Issue New Purchase Order"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreatePO} className="space-y-4">
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">PO Number</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:ring-1 focus:border-blue-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contracted Supplier</label>
              <select
                value={selectedVendorId}
                onChange={(e) => setSelectedVendorId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:border-blue-700"
              >
                <option value="">Select registered supplier...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Order Date</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:border-blue-700"
              />
            </div>
          </div>

          {/* Line items in PO */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase">Authorized Items</span>
              <button
                type="button"
                onClick={addItemRow}
                className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Add Item
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((it, idx) => (
                <div key={it.id} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={it.itemDescription}
                    onChange={(e) => updateItem(idx, 'itemDescription', e.target.value)}
                    className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:border-blue-700"
                  />
                  <input
                    type="text"
                    placeholder="HSN"
                    value={it.hsnCode}
                    onChange={(e) => updateItem(idx, 'hsnCode', e.target.value)}
                    className="w-20 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:border-blue-700"
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={it.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-16 rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:border-blue-700"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Rate"
                    value={it.unitPrice}
                    onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-24 rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-right font-mono focus:outline-none focus:ring-1 focus:border-blue-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeItemRow(idx)}
                    disabled={items.length <= 1}
                    className="text-slate-400 hover:text-rose-600 disabled:opacity-25"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end text-xs font-semibold text-slate-800">
              Total PO Value: <span className="font-mono text-blue-700 ml-2">{formatINR(calculatedTotal)}</span>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
            >
              Save Purchase Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
