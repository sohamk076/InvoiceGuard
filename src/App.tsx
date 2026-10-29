import React, { useState } from 'react';
import { useAuth } from './services/auth';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { AppLayout } from './components/layout/AppLayout';
import { NavTab } from './components/layout/Sidebar';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { InvoiceListPage } from './pages/invoices/InvoiceListPage';
import { InvoiceUploadPage } from './pages/invoices/InvoiceUploadPage';
import { ManualInvoiceEntryPage } from './pages/invoices/ManualInvoiceEntryPage';
import { InvoiceDetailsPage } from './pages/invoices/InvoiceDetailsPage';
import { VendorListPage } from './pages/vendors/VendorListPage';
import { PurchaseOrdersPage } from './pages/purchase-orders/PurchaseOrdersPage';
import { FraudAlertsPage } from './pages/alerts/FraudAlertsPage';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import { store } from './services/store';

type AuthView = 'login' | 'register' | 'forgot_password';

export const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  React.useEffect(() => {
    store.setUserId(user ? user.id : null);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-blue-700 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  // Not logged in -> Show minimal strict authentication
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'forgot_password') {
      return <ForgotPasswordPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return (
      <LoginPage
        onNavigateToRegister={() => setAuthView('register')}
        onNavigateToForgotPassword={() => setAuthView('forgot_password')}
      />
    );
  }

  const flaggedCount = store.getInvoices().filter((i) => i.riskScore >= 20).length;

  const handleSelectTab = (tab: NavTab) => {
    setSelectedInvoiceId(null);
    setCurrentTab(tab);
  };

  const handleNavigateToInvoice = (id: string) => {
    setSelectedInvoiceId(id);
  };

  return (
    <AppLayout
      currentTab={currentTab}
      onSelectTab={handleSelectTab}
      alertsCount={flaggedCount}
    >
      {selectedInvoiceId ? (
        <InvoiceDetailsPage
          invoiceId={selectedInvoiceId}
          onBack={() => setSelectedInvoiceId(null)}
        />
      ) : (
        <>
          {currentTab === 'dashboard' && (
            <DashboardPage
              onNavigateToInvoice={handleNavigateToInvoice}
              onNavigateToTab={handleSelectTab}
            />
          )}
          {currentTab === 'invoices' && (
            <InvoiceListPage
              onNavigateToInvoice={handleNavigateToInvoice}
              onNavigateToUpload={() => setCurrentTab('upload')}
              onNavigateToManualEntry={() => setCurrentTab('manual-entry')}
            />
          )}
          {currentTab === 'upload' && (
            <InvoiceUploadPage onNavigateToInvoice={handleNavigateToInvoice} />
          )}
          {currentTab === 'manual-entry' && (
            <ManualInvoiceEntryPage onNavigateToInvoice={handleNavigateToInvoice} />
          )}
          {currentTab === 'vendors' && <VendorListPage />}
          {currentTab === 'purchase-orders' && <PurchaseOrdersPage />}
          {currentTab === 'alerts' && (
            <FraudAlertsPage onNavigateToInvoice={handleNavigateToInvoice} />
          )}
          {currentTab === 'analytics' && <AnalyticsPage />}
          {currentTab === 'settings' && <SettingsPage />}
        </>
      )}
    </AppLayout>
  );
};
