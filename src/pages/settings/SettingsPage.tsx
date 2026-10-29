import React, { useState, useEffect } from 'react';
import { store } from '../../services/store';
import { useAuth } from '../../services/auth';
import { isSupabaseConfigured, testSupabaseConnection } from '../../services/supabase';
import { validateGSTIN, INDIAN_GST_STATES } from '../../lib/gst';
import { RotateCcw, Check, Building, ShieldCheck, Database, AlertTriangle } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, updateBusinessProfile } = useAuth();
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{
    configured: boolean;
    connected: boolean;
    message: string;
    error?: string;
  } | null>(null);

  // Business profile values bound to authenticated user
  const [storeName, setStoreName] = useState(user?.organizationName || '');
  const [storeGstin, setStoreGstin] = useState(user?.organizationGstin || '');
  const [drugLicense, setDrugLicense] = useState(user?.drugLicenseNumber || '');
  const [storeAddress, setStoreAddress] = useState(user?.address || '');
  const [contactPhone, setContactPhone] = useState(user?.contactPhone || '');
  const [operatingState, setOperatingState] = useState(user?.operatingState || '');

  const [storeGstinError, setStoreGstinError] = useState<string | null>(null);
  const [storeGstinValidated, setStoreGstinValidated] = useState(false);
  const [storeGstinStateInfo, setStoreGstinStateInfo] = useState<string | null>(null);

  // Keep synced if user profile loads asynchronously
  useEffect(() => {
    if (user) {
      if (user.organizationName) setStoreName(user.organizationName);
      if (user.organizationGstin) setStoreGstin(user.organizationGstin);
      if (user.drugLicenseNumber) setDrugLicense(user.drugLicenseNumber);
      if (user.address) setStoreAddress(user.address);
      if (user.contactPhone) setContactPhone(user.contactPhone);
      if (user.operatingState) setOperatingState(user.operatingState);
    }
  }, [user]);

  const handleStoreGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStoreGstin(e.target.value.toUpperCase());
    setStoreGstinError(null);
    setStoreGstinValidated(false);
    setStoreGstinStateInfo(null);
  };

  const handleStoreGstinBlur = () => {
    const clean = storeGstin.trim().toUpperCase();
    if (!clean) {
      setStoreGstinError(null);
      setStoreGstinValidated(false);
      setStoreGstinStateInfo(null);
      return;
    }
    const res = validateGSTIN(clean);
    if (!res.isValid) {
      setStoreGstinError(res.errors[0] || 'Invalid GSTIN format');
      setStoreGstinValidated(false);
      setStoreGstinStateInfo(null);
    } else {
      setStoreGstinError(null);
      setStoreGstinValidated(true);
      const info = res.stateName ? `${res.stateCode} (${res.stateName})` : res.stateCode || null;
      setStoreGstinStateInfo(info);
      if (res.stateCode && !operatingState && res.stateName) {
        setOperatingState(`${res.stateCode} - ${res.stateName}`);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      alert('Medical store or pharmacy business name is required.');
      return;
    }

    if (storeGstin.trim()) {
      const gstinRes = validateGSTIN(storeGstin.trim().toUpperCase());
      if (!gstinRes.isValid) {
        setStoreGstinError(gstinRes.errors[0] || 'Invalid GSTIN format');
        alert(gstinRes.errors[0] || 'Invalid GSTIN format');
        return;
      }
    }

    setIsSaving(true);
    try {
      await updateBusinessProfile({
        organizationName: storeName.trim(),
        organizationGstin: storeGstin.trim().toUpperCase(),
        drugLicenseNumber: drugLicense.trim(),
        address: storeAddress.trim(),
        contactPhone: contactPhone.trim(),
        operatingState: operatingState.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save profile: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoadPharmaSeed = () => {
    if (
      confirm(
        'Load pre-configured pharmaceutical test suite (fictional distributors & medicine consignments)?'
      )
    ) {
      store.loadPharmaSeedData();
      setActionMessage('Loaded pharmaceutical test suite into ledger.');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  const handleClearAll = () => {
    if (
      confirm(
        'Are you sure you want to clear all invoices, vendors, and purchase orders? This returns the ledger to a clean state.'
      )
    ) {
      store.clearAllData();
      setActionMessage('All ledger records have been cleared.');
      setTimeout(() => setActionMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          System Settings
        </h1>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3.5 flex items-center gap-2">
          <Check className="h-4 w-4" />
          <span>Business profile saved successfully.</span>
        </div>
      )}

      {actionMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl p-3.5 flex items-center gap-2">
          <Check className="h-4 w-4" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Organization / Medical Store Business Profile */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Medical Store & Business Tax Profile
            </h3>
          </div>
          {user?.profileCompleted ? (
            <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
              Profile Configured
            </span>
          ) : (
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg">
              Profile Incomplete
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Store / Business Legal Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              placeholder="e.g. City Care Medicos & Chemists"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Recipient GSTIN (Optional)
            </label>
            <input
              type="text"
              maxLength={15}
              value={storeGstin}
              onChange={handleStoreGstinChange}
              onBlur={handleStoreGstinBlur}
              placeholder="15-character GSTIN (e.g. 27AABCM8821K1Z3)"
              className={`w-full rounded-xl border font-mono uppercase px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 ${
                storeGstinError
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/30'
                  : 'border-slate-300 focus:border-indigo-600 focus:ring-indigo-600'
              }`}
            />
            {storeGstinError && (
              <p className="mt-1 text-[11px] text-rose-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                <span>{storeGstinError}</span>
              </p>
            )}
            {!storeGstinError && storeGstinValidated && storeGstin.trim() && (
              <p className="mt-1 text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Valid GSTIN format{storeGstinStateInfo ? ` (${storeGstinStateInfo})` : ''}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Drug License Number (DL 20B/21B)
            </label>
            <input
              type="text"
              value={drugLicense}
              onChange={e => setDrugLicense(e.target.value)}
              placeholder="e.g. 20B-123456, 21B-654321"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operating State Jurisdiction
            </label>
            <input
              type="text"
              value={operatingState}
              onChange={e => setOperatingState(e.target.value)}
              placeholder="e.g. 27 - Maharashtra"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:border-indigo-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Store Physical Address
            </label>
            <input
              type="text"
              value={storeAddress}
              onChange={e => setStoreAddress(e.target.value)}
              placeholder="Shop number, market, road, city, pin code"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:border-indigo-600"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {/* Deterministic Rule Weights */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Deterministic Engine Scoring Rules
          </h3>
        </div>

        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">
                Exact Duplicate Invoice (RULE-DUP-01)
              </div>
              <div className="text-slate-500 text-[11px]">
                Matching invoice number and supplier GSTIN in historical ledger
              </div>
            </div>
            <span className="font-mono font-semibold text-slate-900">+45 pts (CRITICAL)</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">
                Invalid GSTIN or Luhn Mod 36 Failure (RULE-GST-01)
              </div>
              <div className="text-slate-500 text-[11px]">
                Checksum discrepancy, invalid state code, or malformed PAN
              </div>
            </div>
            <span className="font-mono font-semibold text-slate-900">+40 pts (CRITICAL)</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">
                Inter-State vs Intra-State GST Mismatch (RULE-GST-03/05)
              </div>
              <div className="text-slate-500 text-[11px]">
                Charging IGST for intra-state supply or CGST/SGST for inter-state
              </div>
            </div>
            <span className="font-mono font-semibold text-slate-900">+30 pts (HIGH)</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">
                Purchase Order Vendor Mismatch (RULE-PO-03)
              </div>
              <div className="text-slate-500 text-[11px]">
                Invoice supplier GSTIN differs from approved PO vendor GSTIN
              </div>
            </div>
            <span className="font-mono font-semibold text-slate-900">+40 pts (CRITICAL)</span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div>
              <div className="font-semibold text-slate-800">
                Grand Total Math Discrepancy (RULE-MATH-03)
              </div>
              <div className="text-slate-500 text-[11px]">
                Stated total differs from subtotal + tax by more than commercial tolerance (₹1.00)
              </div>
            </div>
            <span className="font-mono font-semibold text-slate-900">+35 pts (HIGH)</span>
          </div>
        </div>
      </div>

      {/* Backend & Environment Status */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Database className="h-4 w-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Backend Persistence & Maintenance
          </h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-3">
          <div>
            <div className="font-semibold text-slate-800">Supabase PostgreSQL Connection</div>
            <div className="text-slate-500 text-[11px] mt-0.5">
              {isSupabaseConfigured
                ? 'Environment variables configured in .env.'
                : 'Connect Supabase credentials in .env to sync with cloud database.'}
            </div>
            {dbTestResult && (
              <div className="mt-2 p-2.5 rounded-xl text-[11px] font-medium border border-slate-200 bg-slate-50 text-slate-800">
                {dbTestResult.message}
                {dbTestResult.error && (
                  <div className="font-mono text-[10px] mt-0.5 text-slate-600">
                    Details: {dbTestResult.error}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={isTestingDb}
              onClick={async () => {
                setIsTestingDb(true);
                const res = await testSupabaseConnection();
                setDbTestResult(res);
                setIsTestingDb(false);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {isTestingDb ? 'Testing...' : 'Test Connection'}
            </button>
            <span className="text-xs font-medium text-slate-700">
              {isSupabaseConfigured ? 'Configured' : 'Not Connected'}
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-800">Pharmaceutical Test Suite</div>
            <div className="text-[11px] text-slate-500">
              Populate ledger on-demand with fictional pharmaceutical suppliers (Apex, Medilife,
              Sanjivani) and HSN 3004 medicine consignments.
            </div>
          </div>
          <button
            type="button"
            onClick={handleLoadPharmaSeed}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Load Test Suite
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-800">Purge Ledger Records</div>
            <div className="text-[11px] text-slate-500">
              Clear all invoices, vendors, and purchase orders to return the application to a clean
              empty state.
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors shrink-0"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
};
