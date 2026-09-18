import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import {
  Download,
  Printer,
  ArrowRightLeft,
  AlertTriangle,
  History,
  Package,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ReportsApi, CategoriesApi } from '../services/api';

export const ReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [data, setData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [movementType, setMovementType] = useState('ALL');

  useEffect(() => {
    CategoriesApi.getAll().then((res) => {
      if (res.success) setCategories(res.data);
    });
  }, []);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === 0) {
        const res = await ReportsApi.getSummary(selectedCategory);
        if (res.success) setData(res.data);
      } else if (activeTab === 1) {
        const res = await ReportsApi.getMovements({
          dateFrom,
          dateTo,
          type: movementType,
        });
        if (res.success) setData(res.data);
      } else if (activeTab === 2) {
        const res = await ReportsApi.getTransfers({ dateFrom, dateTo });
        if (res.success) setData(res.data);
      } else if (activeTab === 3) {
        const res = await ReportsApi.getLowStock();
        if (res.success) setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [activeTab, selectedCategory, dateFrom, dateTo, movementType]);

  const handleExportExcel = () => {
    let sheetName = 'Stock Report';
    let formattedData: any[] = [];

    if (activeTab === 0) {
      sheetName = 'Stock Summary';
      formattedData = data.map((d, i) => ({
        '#': i + 1,
        'Product Name': d.productName,
        'SKU': d.sku,
        'Category': d.category,
        'Godown Stock (PCS)': d.godownStock,
        'Shop Stock (PCS)': d.shopStock,
        'Total Stock (PCS)': d.totalStock,
        'Min Godown': d.minGodownStock,
        'Min Shop': d.minShopStock,
        'Status': d.status,
      }));
    } else if (activeTab === 1) {
      sheetName = 'Stock Movements';
      formattedData = data.map((d, i) => ({
        '#': i + 1,
        'Date': new Date(d.createdAt).toLocaleString(),
        'Product': d.productName,
        'SKU': d.sku,
        'Type': d.type,
        'Quantity': d.quantity,
        'Godown Before/After': `${d.beforeGodownStock} -> ${d.afterGodownStock}`,
        'Shop Before/After': `${d.beforeShopStock} -> ${d.afterShopStock}`,
        'Reference': d.referenceId,
      }));
    } else if (activeTab === 2) {
      sheetName = 'Transfers';
      formattedData = data.map((d, i) => ({
        '#': i + 1,
        'Transfer No': d.transferNumber,
        'Date': new Date(d.transferDate || d.createdAt).toLocaleDateString(),
        'Total Qty (PCS)': d.totalQuantity,
        'Items Count': d.items?.length,
        'Transferred By': d.transferredBy,
        'Remarks': d.remarks,
      }));
    } else if (activeTab === 3) {
      sheetName = 'Low Stock Alert';
      formattedData = data.map((d, i) => ({
        '#': i + 1,
        'Product Name': d.productName,
        'SKU': d.sku,
        'Godown Stock': d.godownStock,
        'Min Godown Alert': d.minGodownStock,
        'Shop Stock': d.shopStock,
        'Min Shop Alert': d.minShopStock,
        'Shop Deficit': d.deficitShop,
        'Godown Deficit': d.deficitGodown,
      }));
    }

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `Varun_Trade_${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Stock Reports & Intelligence
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Comprehensive reporting for stock valuation, transfer dispatches, movements, and low stock
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handlePrint}
            startIcon={<Printer size={16} />}
            sx={{ borderColor: '#cbd5e1', color: '#475569' }}
          >
            Print
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

      {/* Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            borderBottom: '1px solid #e2e8f0',
            '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minHeight: 48 },
          }}
        >
          <Tab icon={<Package size={16} />} iconPosition="start" label="Stock Summary" />
          <Tab icon={<History size={16} />} iconPosition="start" label="Stock Movement Ledger" />
          <Tab icon={<ArrowRightLeft size={16} />} iconPosition="start" label="Godown ↔ Shop Transfers" />
          <Tab icon={<AlertTriangle size={16} />} iconPosition="start" label="Low Stock Alerts" />
        </Tabs>

        {/* Tab Filter Row */}
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            {activeTab === 0 && (
              <Grid size={{ xs: 12, sm: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={selectedCategory}
                    label="Category"
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <MenuItem value="ALL">All Categories</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={c._id} value={c.name}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}

            {activeTab === 1 && (
              <Grid size={{ xs: 12, sm: 3 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Movement Type</InputLabel>
                  <Select
                    value={movementType}
                    label="Movement Type"
                    onChange={(e) => setMovementType(e.target.value)}
                  >
                    <MenuItem value="ALL">All Types</MenuItem>
                    <MenuItem value="GODOWN_TO_SHOP">Godown → Shop Transfer</MenuItem>
                    <MenuItem value="SHOP_TO_GODOWN">Shop → Godown Transfer</MenuItem>
                    <MenuItem value="STOCK_ADJUSTMENT">Stock Adjustment</MenuItem>
                    <MenuItem value="OPENING_STOCK">Opening Stock</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {(activeTab === 1 || activeTab === 2) && (
              <>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Date From"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="date"
                    label="Date To"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </CardContent>
      </Card>

      {/* Report Table */}
      <Card>
        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              {activeTab === 0 && (
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Product Name</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Godown (PCS)</TableCell>
                  <TableCell align="right">Shop (PCS)</TableCell>
                  <TableCell align="right">Total (PCS)</TableCell>
                  <TableCell align="center">Min Levels (G/S)</TableCell>
                  <TableCell align="center">Status</TableCell>
                </TableRow>
              )}
              {activeTab === 1 && (
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Product / SKU</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell>Godown Stock</TableCell>
                  <TableCell>Shop Stock</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell>User</TableCell>
                </TableRow>
              )}
              {activeTab === 2 && (
                <TableRow>
                  <TableCell>Transfer No</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Items Summary</TableCell>
                  <TableCell align="right">Quantity (PCS)</TableCell>
                  <TableCell>Transferred By</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              )}
              {activeTab === 3 && (
                <TableRow>
                  <TableCell>Product Name</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell align="right">Godown Stock</TableCell>
                  <TableCell align="right">Min Godown Alert</TableCell>
                  <TableCell align="right">Shop Stock</TableCell>
                  <TableCell align="right">Min Shop Alert</TableCell>
                  <TableCell align="center">Deficit / Action</TableCell>
                </TableRow>
              )}
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    Generating report...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    No records found for selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row, idx) => {
                  if (activeTab === 0) {
                    return (
                      <TableRow key={row.productId || idx} hover>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{row.productName}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{row.sku}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#4f46e5' }}>
                          {row.godownStock} PCS
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>
                          {row.shopStock} PCS
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {row.totalStock} PCS
                        </TableCell>
                        <TableCell align="center">{row.minGodownStock} / {row.minShopStock}</TableCell>
                        <TableCell align="center">
                          <Chip
                            size="small"
                            label={row.status}
                            color={row.status === 'IN_STOCK' ? 'success' : row.status === 'LOW_STOCK' ? 'warning' : 'error'}
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  }
                  if (activeTab === 1) {
                    return (
                      <TableRow key={row._id || idx} hover>
                        <TableCell sx={{ fontSize: '0.8rem' }}>{new Date(row.createdAt).toLocaleString()}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{row.productName} ({row.sku})</TableCell>
                        <TableCell>
                          <Chip size="small" label={row.type} sx={{ fontSize: '0.7rem', fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>
                          {row.quantity > 0 ? `+${row.quantity}` : row.quantity} PCS
                        </TableCell>
                        <TableCell>{row.beforeGodownStock} → {row.afterGodownStock}</TableCell>
                        <TableCell>{row.beforeShopStock} → {row.afterShopStock}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{row.referenceId || '—'}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>{row.performedBy}</TableCell>
                      </TableRow>
                    );
                  }
                  if (activeTab === 2) {
                    return (
                      <TableRow key={row._id || idx} hover>
                        <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace', color: '#4f46e5' }}>
                          {row.transferNumber}
                        </TableCell>
                        <TableCell>{new Date(row.transferDate || row.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>{row.items?.length} items ({row.items?.map((i: any) => i.productName).join(', ')})</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: '#4f46e5' }}>
                          {row.totalQuantity} PCS
                        </TableCell>
                        <TableCell>{row.transferredBy}</TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>{row.remarks || '—'}</TableCell>
                      </TableRow>
                    );
                  }
                  if (activeTab === 3) {
                    return (
                      <TableRow key={row._id || idx} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{row.productName}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{row.sku}</TableCell>
                        <TableCell align="right" sx={{ color: row.isGodownLow ? '#dc2626' : 'inherit', fontWeight: 700 }}>
                          {row.godownStock} PCS
                        </TableCell>
                        <TableCell align="right">{row.minGodownStock} PCS</TableCell>
                        <TableCell align="right" sx={{ color: row.isShopLow ? '#dc2626' : 'inherit', fontWeight: 700 }}>
                          {row.shopStock} PCS
                        </TableCell>
                        <TableCell align="right">{row.minShopStock} PCS</TableCell>
                        <TableCell align="center">
                          {row.isShopLow && (
                            <Chip
                              size="small"
                              label={`Transfer ${row.deficitShop} PCS to Shop`}
                              sx={{ backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '0.7rem' }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return null;
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};
