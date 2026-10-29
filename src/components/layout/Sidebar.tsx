import React from 'react';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  FilePlus2,
  Users,
  ShoppingCart,
  ShieldAlert,
  BarChart3,
  Sliders,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'invoices'
  | 'upload'
  | 'manual-entry'
  | 'vendors'
  | 'purchase-orders'
  | 'alerts'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  alertsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  alertsCount = 0,
}) => {
  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices' as NavTab, label: 'Invoices', icon: FileText },
    { id: 'upload' as NavTab, label: 'Upload & Scan', icon: UploadCloud },
    { id: 'manual-entry' as NavTab, label: 'Manual Entry', icon: FilePlus2 },
    { id: 'vendors' as NavTab, label: 'Vendors', icon: Users },
    { id: 'purchase-orders' as NavTab, label: 'Purchase Orders', icon: ShoppingCart },
    {
      id: 'alerts' as NavTab,
      label: 'Fraud Alerts',
      icon: ShieldAlert,
      badge: alertsCount > 0 ? alertsCount : undefined,
    },
    { id: 'analytics' as NavTab, label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'settings' as NavTab, label: 'System Settings', icon: Sliders },
  ];

  return (
    <aside className="w-60 h-full bg-white border-r border-slate-200 flex flex-col shrink-0 select-none">
      <nav className="p-3 space-y-1 flex-1 overflow-y-auto min-h-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-700' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="text-[11px] font-mono font-semibold text-slate-600">
                  ({item.badge})
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
