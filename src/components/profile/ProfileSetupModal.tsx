import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../services/auth';
import { validateGSTIN } from '../../lib/gst';
import { Building, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, updateBusinessProfile } = useAuth();
  const [storeName, setStoreName] = useState('');
  const [gstin, setGstin] = useState('');
  const [gstinError, setGstinError] = useState<string | null>(null);
  const [gstinValidated, setGstinValidated] = useState(false);
  const [gstinStateInfo, setGstinStateInfo] = useState<string | null>(null);
  const [drugLicense, setDrugLicense] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setStoreName(user.organizationName || '');
      setGstin(user.organizationGstin || '');
      setDrugLicense(user.drugLicenseNumber || '');
      setPhone(user.contactPhone || '');
      setAddress(user.address || '');
    }
  }, [user, isOpen]);

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGstin(e.target.value.toUpperCase());
    setGstinError(null);
    setGstinValidated(false);
    setGstinStateInfo(null);
  };

  const handleGstinBlur = () => {
    const clean = gstin.trim().toUpperCase();
    if (!clean) {
      setGstinError(null);
      setGstinValidated(false);
      setGstinStateInfo(null);
      return;
    }
    const res = validateGSTIN(clean);
    if (!res.isValid) {
      setGstinError(res.errors[0] || 'Invalid GSTIN format');
      setGstinValidated(false);
      setGstinStateInfo(null);
    } else {
      setGstinError(null);
      setGstinValidated(true);
      setGstinStateInfo(res.stateName ? `${res.stateCode} (${res.stateName})` : res.stateCode || null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = storeName.trim();
    if (!cleanName) {
      setError('Please enter your medical store or business legal name.');
      return;
    }

    if (gstin.trim()) {
      const res = validateGSTIN(gstin.trim().toUpperCase());
      if (!res.isValid) {
        setGstinError(res.errors[0] || 'Invalid GSTIN format');
        setError(`Invalid GSTIN format: ${res.errors[0]}`);
        return;
      }
    }

    setSaving(true);
    const result = await updateBusinessProfile({
      organizationName: cleanName,
      organizationGstin: gstin.trim().toUpperCase() || undefined,
      drugLicenseNumber: drugLicense.trim().toUpperCase() || undefined,
      contactPhone: phone.trim() || undefined,
      address: address.trim() || undefined,
    });
    setSaving(false);

    if (result.success) {
      onSuccess?.();
      onClose();
    } else {
      setError(result.error || 'Failed to save business profile.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Business & Medical Store Profile"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Store / Business Legal Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Khullar Medicos, Apollo Pharmacy, etc."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:border-blue-700 focus:ring-blue-700"
              required
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            This name will appear as the recipient/buyer entity across your compliance audit reports.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Registered GSTIN (Optional)
          </label>
          <input
            type="text"
            maxLength={15}
            value={gstin}
            onChange={handleGstinChange}
            onBlur={handleGstinBlur}
            placeholder="e.g. 27AAACT2727Q1ZW (15 digits)"
            className={`w-full px-3.5 py-2 border font-mono uppercase text-xs rounded-xl focus:outline-none focus:ring-1 ${
              gstinError
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                : 'border-slate-300 focus:border-blue-700 focus:ring-blue-700'
            }`}
          />
          <div className="mt-1 text-[11px]">
            {gstinError ? (
              <span className="text-rose-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {gstinError}
              </span>
            ) : gstinValidated && gstinStateInfo ? (
              <span className="text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Format valid • State: {gstinStateInfo}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Drug License Number (Optional)
            </label>
            <input
              type="text"
              value={drugLicense}
              onChange={(e) => setDrugLicense(e.target.value.toUpperCase())}
              placeholder="e.g. 20B/21B-DL-00123"
              className="w-full px-3.5 py-2 border border-slate-300 font-mono text-xs rounded-xl focus:outline-none focus:ring-1 focus:border-blue-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact Phone (Optional)
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98111 22334"
              className="w-full px-3.5 py-2 border border-slate-300 text-xs rounded-xl focus:outline-none focus:ring-1 focus:border-blue-700"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Operating Address / City (Optional)
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. Shop 12, Market Complex, Delhi"
            className="w-full px-3.5 py-2 border border-slate-300 text-xs rounded-xl focus:outline-none focus:ring-1 focus:border-blue-700"
          />
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Business Profile'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
