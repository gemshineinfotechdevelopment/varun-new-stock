import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Drawer,
  Divider,
  InputAdornment,
  Grid,
  Alert,
} from '@mui/material';
import {
  Search,
  Download,
  AlertTriangle,
  RefreshCw,
  Eye,
  X,
  Package,
  ArrowUpDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { InventoryApi, CategoriesApi } from '../services/api';
import { type NavTab } from './Navbar';

interface StockOverviewPageProps {
  onNavigate?: (tab: NavTab) => void;
}

export const StockOverviewPage: React.FC<StockOverviewPageProps> = () => {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [lowStockFilter, setLowStockFilter] = useState<'all' | 'any' | 'shop' | 'godown'>('all');
  const [sortBy, setSortBy] = useState('totalStock');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Selected Product Detail Drawer
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [productDetail, setProductDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, catRes] = await Promise.all([
        InventoryApi.getList({
          category: selectedCategory,
          search,
          filterLowStock: lowStockFilter !== 'all' ? lowStockFilter : undefined,
          sortBy,
          sortOrder,
        }),
        CategoriesApi.getAll(),
      ]);

      if (invRes.success) setItems(invRes.data);
      if (catRes.success) setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to fetch inventory list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory, lowStockFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const openProductDrawer = async (productId: string) => {
    setSelectedProductId(productId);
    setDetailLoading(true);
    try {
      const res = await InventoryApi.getProductStockDetail(productId);
      if (res.success) {
        setProductDetail(res.data);
      }
    } catch (err) {
      console.error('Failed to load product detail:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeProductDrawer = () => {
    setSelectedProductId(null);
    setProductDetail(null);
  };

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = items.map((item, idx) => ({
      'S.No': idx + 1,
      'Product Name': item.productName,
      'SKU': item.sku,
      'Category': item.category,
      'Godown Stock (PCS)': item.godownStock,
      'Shop Stock (PCS)': item.shopStock,
      'Total Stock (PCS)': item.totalStock,
      'Min Godown Alert': item.minGodownStock,
      'Min Shop Alert': item.minShopStock,
      'Status': item.status,
      'Last Movement': item.lastMovementAt ? new Date(item.lastMovementAt).toLocaleDateString() : 'N/A',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Overview');
    XLSX.writeFile(wb, `Varun_Trade_Stock_Overview_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
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
            Stock Overview
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Product-wise physical stock in PCS partitioned by Godown and Shop
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={fetchData}
            startIcon={<RefreshCw size={16} />}
            sx={{ borderColor: '#cbd5e1', color: '#475569' }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={handleExportExcel}
            startIcon={<Download size={16} />}
            sx={{ backgroundColor: '#059669', '&:hover': { backgroundColor: '#047857' } }}
          >
            Export Excel (.xlsx)
          </Button>
        </Box>
      </Box>

      {/* Filters Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            {/* Search Input */}
            <Grid size={{ xs: 12, sm: 4, md: 4 }}>
              <form onSubmit={handleSearchSubmit}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search by Product Name or SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={18} color="#94a3b8" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </form>
            </Grid>

            {/* Category Filter */}
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value="ALL">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat._id} value={cat.name}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Low Stock Filter */}
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Stock Status</InputLabel>
                <Select
                  value={lowStockFilter}
                  label="Stock Status"
                  onChange={(e) => setLowStockFilter(e.target.value as any)}
                >
                  <MenuItem value="all">All Items</MenuItem>
                  <MenuItem value="any">⚠️ Any Low Stock (Godown or Shop)</MenuItem>
                  <MenuItem value="shop">🏪 Shop Low Stock Only</MenuItem>
                  <MenuItem value="godown">🏭 Godown Low Stock Only</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sort By */}
            <Grid size={{ xs: 12, sm: 12, md: 2 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    label="Sort By"
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <MenuItem value="totalStock">Total PCS</MenuItem>
                    <MenuItem value="shopStock">Shop PCS</MenuItem>
                    <MenuItem value="godownStock">Godown PCS</MenuItem>
                    <MenuItem value="productName">Product Name</MenuItem>
                    <MenuItem value="sku">SKU</MenuItem>
                  </Select>
                </FormControl>
                <Tooltip title={sortOrder === 'desc' ? 'Sort Descending' : 'Sort Ascending'}>
                  <IconButton
                    size="small"
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    sx={{ border: '1px solid #e2e8f0', p: '7px' }}
                  >
                    <ArrowUpDown size={16} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Main Stock Table */}
      <Card>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 750 }}>
            <TableHead>
              <TableRow>
                <TableCell>Product / SKU</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right" sx={{ color: '#4f46e5' }}>
                  Godown Stock
                </TableCell>
                <TableCell align="right" sx={{ color: '#059669' }}>
                  Shop Stock
                </TableCell>
                <TableCell align="right" sx={{ color: '#0f172a' }}>
                  Total Stock
                </TableCell>
                <TableCell align="center">Min Levels (G / S)</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                    Loading stock records...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    No products found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => {
                  const isShopLow = item.shopStock <= item.minShopStock;
                  const isGodownLow = item.godownStock <= item.minGodownStock;
                  const isOutOfStock = item.godownStock === 0 && item.shopStock === 0;

                  return (
                    <TableRow
                      key={item._id}
                      hover
                      sx={{
                        backgroundColor: isOutOfStock
                          ? 'rgba(239, 68, 68, 0.04)'
                          : isShopLow || isGodownLow
                          ? 'rgba(245, 158, 11, 0.03)'
                          : 'inherit',
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box
                            sx={{
                              width: 34,
                              height: 34,
                              borderRadius: '8px',
                              backgroundColor: '#f1f5f9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#475569',
                            }}
                          >
                            <Package size={18} />
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                              {item.productName}
                            </Typography>
                            <Typography
                              variant="caption"
                              sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#64748b' }}
                            >
                              SKU: {item.sku}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={item.category}
                          sx={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem' }}
                        />
                      </TableCell>

                      {/* Godown Stock */}
                      <TableCell align="right">
                        <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 800,
                              color: isGodownLow ? '#d97706' : '#4f46e5',
                            }}
                          >
                            {item.godownStock.toLocaleString()} PCS
                          </Typography>
                          {isGodownLow && (
                            <Typography variant="caption" sx={{ color: '#d97706', fontSize: '0.65rem' }}>
                              Below min ({item.minGodownStock})
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Shop Stock */}
                      <TableCell align="right">
                        <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 800,
                              color: isShopLow ? '#dc2626' : '#059669',
                            }}
                          >
                            {item.shopStock.toLocaleString()} PCS
                          </Typography>
                          {isShopLow && (
                            <Typography variant="caption" sx={{ color: '#dc2626', fontSize: '0.65rem' }}>
                              Below min ({item.minShopStock})
                            </Typography>
                          )}
                        </Box>
                      </TableCell>

                      {/* Total Stock */}
                      <TableCell align="right">
                        <Typography variant="body1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          {item.totalStock.toLocaleString()} PCS
                        </Typography>
                      </TableCell>

                      {/* Min Thresholds */}
                      <TableCell align="center">
                        <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                          {item.minGodownStock} / {item.minShopStock} PCS
                        </Typography>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell align="center">
                        {isOutOfStock ? (
                          <Chip
                            size="small"
                            label="Out of Stock"
                            sx={{ backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 700 }}
                          />
                        ) : isShopLow || isGodownLow ? (
                          <Chip
                            size="small"
                            icon={<AlertTriangle size={13} />}
                            label={isShopLow && isGodownLow ? 'Low Both' : isShopLow ? 'Low Shop' : 'Low Godown'}
                            sx={{ backgroundColor: '#fef3c7', color: '#b45309', fontWeight: 700 }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label="Optimal"
                            sx={{ backgroundColor: '#dcfce7', color: '#15803d', fontWeight: 700 }}
                          />
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell align="center">
                        <Tooltip title="View Stock Timeline Ledger">
                          <IconButton
                            size="small"
                            onClick={() => openProductDrawer(item.productId)}
                            sx={{ color: '#4f46e5', backgroundColor: '#eef2ff' }}
                          >
                            <Eye size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Product Detail Timeline Drawer */}
      <Drawer
        anchor="right"
        open={Boolean(selectedProductId)}
        onClose={closeProductDrawer}
        slotProps={{
          paper: {
            sx: { width: { xs: '100%', sm: 520 }, p: 3 },
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
            Product Stock Ledger
          </Typography>
          <IconButton size="small" onClick={closeProductDrawer}>
            <X size={20} />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2.5 }} />

        {detailLoading ? (
          <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'center', py: 4 }}>
            Loading ledger history...
          </Typography>
        ) : productDetail ? (
          <Box>
            {/* Product Meta Card */}
            <Card sx={{ mb: 3, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1e293b', mb: 0.5 }}>
                  {productDetail.product?.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Chip
                    size="small"
                    label={`SKU: ${productDetail.product?.sku}`}
                    sx={{ fontFamily: 'monospace', fontWeight: 700 }}
                  />
                  <Chip size="small" label={productDetail.product?.category} />
                </Box>

                {/* Stock Summary Row */}
                <Grid container spacing={1.5}>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ p: 1.5, borderRadius: '8px', backgroundColor: '#eef2ff', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#4f46e5', fontWeight: 700 }}>
                        GODOWN
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#312e81' }}>
                        {productDetail.inventory?.godownStock} PCS
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ p: 1.5, borderRadius: '8px', backgroundColor: '#ecfdf5', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>
                        SHOP
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#064e3b' }}>
                        {productDetail.inventory?.shopStock} PCS
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 4 }}>
                    <Box sx={{ p: 1.5, borderRadius: '8px', backgroundColor: '#f1f5f9', textAlign: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#334155', fontWeight: 700 }}>
                        TOTAL
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {productDetail.inventory?.totalStock} PCS
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Timeline Header */}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1e293b', mb: 1.5 }}>
              Chronological Movement History
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {productDetail.transactions && productDetail.transactions.length > 0 ? (
                productDetail.transactions.map((tx: any) => {
                  const isSale = tx.type === 'BILL_SALE';
                  const isRev = tx.type === 'SALE_REVERSAL';
                  const isTrf = tx.type === 'GODOWN_TO_SHOP';

                  return (
                    <Box
                      key={tx._id}
                      sx={{
                        p: 1.8,
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: isSale
                          ? '#fff5f5'
                          : isRev
                          ? '#f0fdf4'
                          : isTrf
                          ? '#f8faff'
                          : '#ffffff',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Chip
                          size="small"
                          label={tx.type.replace(/_/g, ' ')}
                          sx={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: isSale
                              ? '#fee2e2'
                              : isRev
                              ? '#dcfce7'
                              : isTrf
                              ? '#e0e7ff'
                              : '#f1f5f9',
                            color: isSale
                              ? '#dc2626'
                              : isRev
                              ? '#15803d'
                              : isTrf
                              ? '#4f46e5'
                              : '#334155',
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {new Date(tx.createdAt).toLocaleString()}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                          Ref: {tx.referenceId || 'N/A'}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 800,
                            color: isSale ? '#dc2626' : tx.quantity > 0 ? '#059669' : '#0f172a',
                          }}
                        >
                          {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} PCS
                        </Typography>
                      </Box>

                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        Godown: {tx.beforeGodownStock} → {tx.afterGodownStock} | Shop: {tx.beforeShopStock} →{' '}
                        {tx.afterShopStock}
                      </Typography>
                      {tx.notes && (
                        <Typography variant="caption" sx={{ color: '#475569', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                          {tx.notes}
                        </Typography>
                      )}
                    </Box>
                  );
                })
              ) : (
                <Alert severity="info">No transactions recorded for this product yet.</Alert>
              )}
            </Box>
          </Box>
        ) : null}
      </Drawer>
    </Box>
  );
};
