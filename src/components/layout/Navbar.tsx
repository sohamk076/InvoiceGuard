import React from 'react';
import { useAuth } from '../../services/auth';
import { ShieldCheck, LogOut, Building, Menu } from 'lucide-react';
import { isSupabaseConfigured } from '../../services/supabase';

interface NavbarProps {
  onToggleSidebar?: () => void;
  onOpenProfileSetup?: () => void;
  onNavigateToSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenProfileSetup,
  onNavigateToSettings,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shrink-0 z-30">
      <div className="flex items-center gap-2 md:gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation menu"
            className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-blue-700 flex items-center justify-center text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900">
            InvoiceGuard
          </span>
        </div>

        <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 text-xs">
          <Building className="h-3.5 w-3.5 text-slate-400" />
          {user?.organizationName ? (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">{user.organizationName}</span>
              {user.organizationGstin && (
                <span className="font-mono text-[11px] text-slate-500">
                  GSTIN: {user.organizationGstin}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 italic">Business profile incomplete</span>
              {onOpenProfileSetup && (
                <button
                  type="button"
                  onClick={onOpenProfileSetup}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-blue-700 hover:text-white hover:bg-blue-700 border border-blue-700 transition-colors"
                >
                  Set up profile
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {isSupabaseConfigured && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cloud Synced</span>
          </div>
        )}

        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="hidden md:block text-right">
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {user.fullName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
