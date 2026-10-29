import React, { useState, useMemo } from 'react';
import { store } from '../../services/store';
import { Vendor } from '../../services/types';
import { formatINR, formatDate } from '../../lib/formatters';
import { validateGSTIN } from '../../lib/gst';
import { Modal } from '../../components/ui/Modal';
import { Search, Plus, Building, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export const VendorListPage: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>(() => store.getVendors());
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Vendor Form State
  const [newName, setNewName] = useState('');
  const [newGstin, setNewGstin] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDrugLicense, setNewDrugLicense] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const gstinValidation = useMemo(() => validateGSTIN(newGstin), [newGstin]);

  const filteredVendors = useMemo(() => {
    return vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.gstin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [vendors, searchQuery]);

  const handleAddVendor = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newName.trim()) {
      setFormError('Vendor name is required.');
      return;
    }
    if (!newGstin.trim()) {
      setFormError('GSTIN is required.');
      return;
    }
    if (!gstinValidation.isValid) {
      setFormError(`GSTIN failed validation: ${gstinValidation.errors.join(' ')}`);
      return;
    }

    const res = store.addVendor({
      name: newName.trim(),
      gstin: newGstin.trim().toUpperCase(),
      pan: gstinValidation.pan || '',
      stateCode: gstinValidation.stateCode || '',
      city: newCity.trim() || 'Mumbai',
      contactEmail: newEmail.trim() || undefined,
      contactPhone: newPhone.trim() || undefined,
      drugLicenseNumber: newDrugLicense.trim() || undefined,
      riskRating: 'LOW',
      status: 'ACTIVE',
    });

    if (!res.success) {
      setFormError(res.error || 'Failed to add vendor.');
      return;
    }

    setVendors(store.getVendors());
    setIsAddModalOpen(false);
    setNewName('');
    setNewGstin('');
    setNewCity('');
    setNewEmail('');
    setNewPhone('');
    setNewDrugLicense('');
  };

  const getRiskBadge = (rating: Vendor['riskRating']) => {
    switch (rating) {
      case 'LOW':
        return <span className="font-semibold text-xs text-slate-800">Low Risk</span>;
      case 'MEDIUM':
        return <span className="font-semibold text-xs text-slate-800">Medium Risk</span>;
      case 'HIGH':
      case 'CRITICAL':
        return <span className="font-semibold text-xs text-slate-900">High Risk</span>;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Vendors
          </h1>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Register Vendor
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendors by name, GSTIN, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:border-blue-700 focus:ring-blue-700"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          {filteredVendors.length} Suppliers Registered
        </span>
      </div>

      {/* Vendors Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-full">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="py-3 px-4">Vendor Entity</th>
                <th className="py-3 px-4">GSTIN & PAN</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-right">Historical Spend (₹)</th>
                <th className="py-3 px-4 text-center">Invoices</th>
                <th className="py-3 px-4 text-center">Risk Assessment</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-500">
                    {vendors.length === 0 ? (
                      <div className="max-w-md mx-auto space-y-3">
                        <Building className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-800 text-sm">No pharmaceutical suppliers registered yet</p>
                        <p className="text-slate-500 text-xs">
                          Register your wholesale pharmaceutical distributors and agencies with GSTIN and Drug License numbers.
                        </p>
                        <div className="pt-2">
                          <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Register Vendor
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span>No suppliers found matching current search.</span>
                    )}
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-slate-400" />
                        <span>{vendor.name}</span>
                      </div>
                      {vendor.drugLicenseNumber && (
                        <div className="font-mono text-[11px] text-slate-500 font-normal mt-0.5">
                          DL: {vendor.drugLicenseNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono font-medium text-slate-900">{vendor.gstin}</div>
                      <div className="font-mono text-[11px] text-slate-400">PAN: {vendor.pan}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{vendor.city}</div>
                      <span className="text-[11px] text-slate-400">State Code {vendor.stateCode}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                      {formatINR(vendor.totalInvoicedAmount)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-700">
                      {vendor.totalInvoicesCount}
                    </td>
                    <td className="py-3 px-4 text-center">{getRiskBadge(vendor.riskRating)}</td>
                    <td className="py-3 px-4 text-center text-slate-700 font-medium text-xs">
                      {vendor.status.replace(/_/g, ' ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Vendor Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Pharmaceutical Distributor"
      >
        <form onSubmit={handleAddVendor} className="space-y-4">
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Agency Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:border-blue-700"
              placeholder="e.g. Apex Pharmaceuticals LLP"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Indian GSTIN (15 Digits)</label>
            <input
              type="text"
              value={newGstin}
              onChange={(e) => setNewGstin(e.target.value.toUpperCase())}
              className={`w-full rounded-md border font-mono uppercase px-3 py-2 text-xs focus:outline-none focus:ring-1 ${
                newGstin
                  ? gstinValidation.isValid
                    ? 'border-emerald-400 focus:border-emerald-600'
                    : 'border-rose-400 focus:border-rose-600'
                  : 'border-slate-300 focus:border-blue-700'
              }`}
              placeholder="e.g. 27AABCA1234D1ZM"
            />
            {newGstin && (
              <div className="mt-1 text-[11px]">
                {gstinValidation.isValid ? (
                  <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Checksum Verified • State:{' '}
                    {gstinValidation.stateName} ({gstinValidation.stateCode})
                  </span>
                ) : (
                  <span className="text-rose-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {gstinValidation.errors[0]}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Drug License Number (Optional)</label>
              <input
                type="text"
                value={newDrugLicense}
                onChange={(e) => setNewDrugLicense(e.target.value)}
                className="w-full rounded-md border border-slate-300 font-mono uppercase px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:border-blue-700"
                placeholder="e.g. 20B/21B-MH-102938"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:border-blue-700"
                placeholder="e.g. Mumbai"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:border-blue-700"
                placeholder="accounts@distributor.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:border-blue-700"
                placeholder="+91 98200 11223"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-sm"
            >
              Save Vendor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
