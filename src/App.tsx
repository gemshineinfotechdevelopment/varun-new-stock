import { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from './theme/theme';
import { Navbar, type NavTab } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { DashboardPage } from './components/DashboardPage';
import { StockOverviewPage } from './components/StockOverviewPage';
import { StockTransferPage } from './components/StockTransferPage';
import { ProductsPage } from './components/ProductsPage';
import { CategoriesPage } from './components/CategoriesPage';
import { StockHistoryPage } from './components/StockHistoryPage';
import { StockAdjustmentsPage } from './components/StockAdjustmentsPage';
import { ReportsPage } from './components/ReportsPage';
import { IntegrationPage } from './components/IntegrationPage';
import { AuditLogsPage } from './components/AuditLogsPage';
import { SettingsPage } from './components/SettingsPage';
import { InventoryApi, SettingsApi } from './services/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('varun_stock_token'));
  });

  const [currentUser, setCurrentUser] = useState<{ name: string; username: string; role: string } | null>(() => {
    const saved = localStorage.getItem('varun_stock_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<NavTab>('Dashboard');
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  useEffect(() => {
    const updateTitle = async () => {
      document.title = 'Varun Traders — Stock Maintenance & Godown System';
      try {
        const res = await SettingsApi.get();
        if (res.success && res.data?.companyName) {
          document.title = `${res.data.companyName} — Stock System`;
        }
      } catch {}
    };
    updateTitle();

    if (isAuthenticated) {
      InventoryApi.getDashboardStats()
        .then((res) => {
          if (res.success && res.data?.lowStockTotalCount) {
            setLowStockCount(res.data.lowStockTotalCount);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, activeTab]);

  const handleLoginSuccess = (user: { name: string; username: string; role: string }, _token: string) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setActiveTab('Dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('varun_stock_token');
    localStorage.removeItem('varun_stock_user');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        }}
      >
        <Navbar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          user={currentUser}
          onLogout={handleLogout}
          lowStockCount={lowStockCount}
        />

        <Box component="main" sx={{ flexGrow: 1, width: '100%', py: 1 }}>
          {activeTab === 'Dashboard' && <DashboardPage onNavigate={setActiveTab} />}
          {activeTab === 'Stock Overview' && <StockOverviewPage />}
          {activeTab === 'Stock Transfer' && <StockTransferPage />}
          {activeTab === 'Products' && <ProductsPage />}
          {activeTab === 'Categories' && <CategoriesPage />}
          {activeTab === 'Stock History' && <StockHistoryPage />}
          {activeTab === 'Stock Adjustments' && <StockAdjustmentsPage />}
          {activeTab === 'Reports' && <ReportsPage />}
          {activeTab === 'Integration' && <IntegrationPage />}
          {activeTab === 'Audit Logs' && <AuditLogsPage />}
          {activeTab === 'Settings' && <SettingsPage />}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
