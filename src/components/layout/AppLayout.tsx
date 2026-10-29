import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar, NavTab } from './Sidebar';
import { ProfileSetupModal } from '../profile/ProfileSetupModal';
import { X } from 'lucide-react';

interface AppLayoutProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  alertsCount?: number;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  onSelectTab,
  alertsCount,
  children,
}) => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  return (
    <div className="h-screen h-[100dvh] bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Top Header: Fixed at top, height 56px */}
      <Navbar
        onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onOpenProfileSetup={() => setIsProfileModalOpen(true)}
        onNavigateToSettings={() => onSelectTab('settings')}
      />

      <ProfileSetupModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Main Viewport Row: Fixed Desktop Sidebar + Vertically Scrollable Main Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/* Desktop Sidebar: Fixed to viewport on desktop, fills available height, does not move on scroll */}
        <div className="hidden md:flex flex-col w-60 shrink-0 h-full">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={onSelectTab}
            alertsCount={alertsCount}
          />
        </div>

        {/* Mobile Sidebar Modal/Drawer: Overlay on mobile so it doesn't cover content permanently */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="relative z-50 bg-white w-64 h-full shadow-2xl flex flex-col">
              <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Navigation
                </span>
                <button
                  type="button"
                  onClick={() => setMobileSidebarOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <Sidebar
                  currentTab={currentTab}
                  onSelectTab={(tab) => {
                    onSelectTab(tab);
                    setMobileSidebarOpen(false);
                  }}
                  alertsCount={alertsCount}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area: Only this container scrolls vertically */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-hidden">
          <div className="p-4 md:p-6 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
