import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Package,
  Warehouse,
  Store,
  ArrowRightLeft,
  AlertTriangle,
  History,
  RefreshCw,
} from 'lucide-react';
import { InventoryApi } from '../services/api';
import { type NavTab } from './Navbar';

interface DashboardPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await InventoryApi.getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const totalStock = stats?.totalStock || 0;
  const godownStock = stats?.totalGodownStock || 0;
  const shopStock = stats?.totalShopStock || 0;
  const godownPercent = totalStock > 0 ? Math.round((godownStock / totalStock) * 100) : 50;
  const shopPercent = totalStock > 0 ? Math.round((shopStock / totalStock) * 100) : 50;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header Banner */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Stock Dashboard
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Real-time physical stock metrics partitioned between Godown and Shop (in PCS)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={fetchStats}
            startIcon={<RefreshCw size={16} />}
            sx={{ borderColor: '#cbd5e1', color: '#475569' }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            size="small"
            onClick={() => onNavigate('Stock Overview')}
            startIcon={<Package size={16} />}
            sx={{ backgroundColor: '#0f172a' }}
          >
            Stock Overview
          </Button>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={() => onNavigate('Stock Transfer')}
            startIcon={<ArrowRightLeft size={16} />}
            sx={{ backgroundColor: '#4f46e5', '&:hover': { backgroundColor: '#4338ca' } }}
          >
            Godown ↔ Shop Transfer
          </Button>
        </Box>
      </Box>

      {/* KPI Cards Grid */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Total Godown Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
              borderLeft: '4px solid #4f46e5',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                  GODOWN STOCK
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    color: '#4f46e5',
                  }}
                >
                  <Warehouse size={20} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b' }}>
                {loading ? '...' : `${godownStock.toLocaleString()} PCS`}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6366f1', fontWeight: 600 }}>
                Main Warehouse Bulk Storage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Shop Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f6fdf9 100%)',
              borderLeft: '4px solid #059669',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                  SHOP STOCK
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(5, 150, 105, 0.1)',
                    color: '#059669',
                  }}
                >
                  <Store size={20} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b' }}>
                {loading ? '...' : `${shopStock.toLocaleString()} PCS`}
              </Typography>
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                Available for Counter Billing
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Total Combined Stock */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderLeft: '4px solid #0f172a',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                  TOTAL STOCK
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(15, 23, 42, 0.08)',
                    color: '#0f172a',
                  }}
                >
                  <Package size={20} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {loading ? '...' : `${totalStock.toLocaleString()} PCS`}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                Across {stats?.totalProducts || 0} Registered Products
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Low Stock Alerts */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)',
              borderLeft: '4px solid #d97706',
              cursor: 'pointer',
              '&:hover': { transform: 'translateY(-2px)' },
            }}
            onClick={() => onNavigate('Stock Overview')}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="subtitle2" sx={{ color: '#d97706', fontWeight: 700 }}>
                  LOW STOCK ALERTS
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(217, 119, 6, 0.1)',
                    color: '#d97706',
                  }}
                >
                  <AlertTriangle size={20} />
                </Box>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#b45309' }}>
                {loading ? '...' : `${stats?.lowStockTotalCount || 0} ITEMS`}
              </Typography>
              <Typography variant="caption" sx={{ color: '#d97706', fontWeight: 600 }}>
                Shop: {stats?.lowShopStockCount || 0} | Godown: {stats?.lowGodownStockCount || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Stock Ratio & Daily Movement Overview */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Inventory Distribution Bar */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Location Stock Distribution
                </Typography>
                <Chip
                  size="small"
                  label={`Total: ${totalStock.toLocaleString()} PCS`}
                  sx={{ backgroundColor: '#f1f5f9', fontWeight: 600 }}
                />
              </Box>

              {/* Visual Progress Bar */}
              <Box sx={{ mb: 3 }}>
                <Box
                  sx={{
                    display: 'flex',
                    height: 28,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#e2e8f0',
                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
                  }}
                >
                  <Box
                    sx={{
                      width: `${godownPercent}%`,
                      backgroundColor: '#4f46e5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      transition: 'width 0.5s ease',
                    }}
                  >
                    {godownPercent > 10 ? `Godown (${godownPercent}%)` : ''}
                  </Box>
                  <Box
                    sx={{
                      width: `${shopPercent}%`,
                      backgroundColor: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      transition: 'width 0.5s ease',
                    }}
                  >
                    {shopPercent > 10 ? `Shop (${shopPercent}%)` : ''}
                  </Box>
                </Box>
              </Box>

              {/* Legends & Details */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#f8faff', border: '1px solid #e0e7ff' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#4f46e5' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#312e81' }}>
                        Main Godown
                      </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e1b4b' }}>
                      {godownStock.toLocaleString()} PCS
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6366f1' }}>
                      {godownPercent}% of total inventory
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={{ xs: 6 }}>
                  <Box sx={{ p: 2, borderRadius: '10px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#059669' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#064e3b' }}>
                        Shop Counter
                      </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#064e3b' }}>
                      {shopStock.toLocaleString()} PCS
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#059669' }}>
                      {shopPercent}% of total inventory
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Today's Activity & 2-Way Transfer Overview */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b', mb: 2 }}>
                Today's Stock Movements
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* Godown to Shop Transfers */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    backgroundColor: '#eef2ff',
                    border: '1px solid #e0e7ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: '8px',
                        backgroundColor: '#4f46e5',
                        color: '#ffffff',
                      }}
                    >
                      <ArrowRightLeft size={18} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#3730a3' }}>
                        Godown ↔ Shop Transfers
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#4338ca' }}>
                        {stats?.todayTransfersCount || 0} Transfers completed today
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#4f46e5' }}>
                    {stats?.todayTransfersQuantity || 0} PCS
                  </Typography>
                </Box>

                {/* Quick 2-Way Transfer Action */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: '10px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: '8px',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                      }}
                    >
                      <Package size={18} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        2-Way Transfer Ready
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Move stock between Godown and Shop in seconds
                      </Typography>
                    </Box>
                  </Box>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => onNavigate('Stock Transfer')}
                    sx={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      backgroundColor: '#4f46e5',
                      '&:hover': { backgroundColor: '#4338ca' },
                    }}
                  >
                    Transfer Now →
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Ledger Transactions */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Recent Stock Ledger Transactions
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Immutable audit trail of latest physical stock movements
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={() => onNavigate('Stock History')}
              endIcon={<History size={16} />}
              sx={{ color: '#4f46e5', fontWeight: 600 }}
            >
              View Full Ledger
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date / Time</TableCell>
                  <TableCell>Transaction ID</TableCell>
                  <TableCell>Product / SKU</TableCell>
                  <TableCell>Movement Type</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Godown Stock</TableCell>
                  <TableCell>Shop Stock</TableCell>
                  <TableCell>Reference</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats?.recentTransactions && stats.recentTransactions.length > 0 ? (
                  stats.recentTransactions.map((tx: any) => {
                    const isPositive = tx.quantity > 0;
                    const isSale = tx.type === 'BILL_SALE';
                    const isTransfer = tx.type === 'GODOWN_TO_SHOP';
                    return (
                      <TableRow key={tx._id || tx.transactionId}>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(tx.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {tx.transactionId}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                            {tx.productName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {tx.sku}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={tx.type.replace(/_/g, ' ')}
                            sx={{
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              backgroundColor: isSale
                                ? 'rgba(239, 68, 68, 0.1)'
                                : isTransfer
                                ? 'rgba(79, 70, 229, 0.1)'
                                : 'rgba(5, 150, 105, 0.1)',
                              color: isSale ? '#dc2626' : isTransfer ? '#4f46e5' : '#059669',
                            }}
                          />
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            color: isSale ? '#dc2626' : isPositive ? '#059669' : '#1e293b',
                          }}
                        >
                          {isSale ? `${tx.quantity} PCS` : isPositive ? `+${tx.quantity} PCS` : `${tx.quantity} PCS`}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {tx.beforeGodownStock} → <strong>{tx.afterGodownStock}</strong>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {tx.beforeShopStock} → <strong>{tx.afterShopStock}</strong>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                          {tx.referenceId || 'N/A'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                      No stock transactions recorded yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
