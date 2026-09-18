import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
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
  InputAdornment,
  Pagination,
} from '@mui/material';
import {
  Search,
  Download,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TransactionsApi } from '../services/api';

export const StockHistoryPage: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [type, setType] = useState('ALL');
  const [location, setLocation] = useState('ALL');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchTransactions = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const res = await TransactionsApi.getAll({
        type: type !== 'ALL' ? type : undefined,
        location: location !== 'ALL' ? location : undefined,
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: pageNumber,
        limit: 30,
      });

      if (res.success) {
        setTransactions(res.data);
        setTotal(res.total);
        setPage(res.page);
        setTotalPages(res.totalPages);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [type, location, dateFrom, dateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const handleExportExcel = () => {
    const exportData = transactions.map((tx, idx) => ({
      'S.No': idx + 1,
      'Transaction ID': tx.transactionId,
      'Date': new Date(tx.createdAt).toLocaleString(),
      'Product Name': tx.productName,
      'SKU': tx.sku,
      'Movement Type': tx.type,
      'Location': tx.location,
      'Quantity (PCS)': tx.quantity,
      'Godown Before': tx.beforeGodownStock,
      'Godown After': tx.afterGodownStock,
      'Shop Before': tx.beforeShopStock,
      'Shop After': tx.afterShopStock,
      'Reference ID': tx.referenceId || 'N/A',
      'User / System': tx.performedBy,
      'Notes': tx.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Ledger');
    XLSX.writeFile(wb, `Varun_Trade_Stock_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
            Stock Transaction Ledger
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Financial-grade immutable audit history of all physical stock entries, sales, transfers & adjustments
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => fetchTransactions(page)}
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
            Export Ledger (.xlsx)
          </Button>
        </Box>
      </Box>

      {/* Filters Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            {/* Search Input */}
            <Grid size={{ xs: 12, sm: 4, md: 3 }}>
              <form onSubmit={handleSearchSubmit}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search product, SKU, ref #..."
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

            {/* Movement Type Filter */}
            <Grid size={{ xs: 12, sm: 4, md: 2.5 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Movement Type</InputLabel>
                <Select value={type} label="Movement Type" onChange={(e) => setType(e.target.value)}>
                  <MenuItem value="ALL">All Types</MenuItem>
                  <MenuItem value="BILL_SALE">🛒 Billing Sale</MenuItem>
                  <MenuItem value="SALE_REVERSAL">🔄 Bill Reversal</MenuItem>
                  <MenuItem value="GODOWN_TO_SHOP">➡️ Godown → Shop</MenuItem>
                  <MenuItem value="STOCK_ADJUSTMENT">⚖️ Physical Adjustment</MenuItem>
                  <MenuItem value="OPENING_STOCK">🏁 Opening Stock</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Location Filter */}
            <Grid size={{ xs: 12, sm: 4, md: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Location</InputLabel>
                <Select value={location} label="Location" onChange={(e) => setLocation(e.target.value)}>
                  <MenuItem value="ALL">All Locations</MenuItem>
                  <MenuItem value="GODOWN">🏭 Godown</MenuItem>
                  <MenuItem value="SHOP">🏪 Shop</MenuItem>
                  <MenuItem value="BOTH">🔄 Both / Transfer</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Date From */}
            <Grid size={{ xs: 6, sm: 6, md: 2 }}>
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

            {/* Date To */}
            <Grid size={{ xs: 6, sm: 6, md: 2.5 }}>
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
          </Grid>
        </CardContent>
      </Card>

      {/* Ledger Table */}
      <Card>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                <TableCell>Date & Time</TableCell>
                <TableCell>Transaction ID</TableCell>
                <TableCell>Product Details</TableCell>
                <TableCell>Movement Type</TableCell>
                <TableCell align="right">Qty (PCS)</TableCell>
                <TableCell>Godown Balance</TableCell>
                <TableCell>Shop Balance</TableCell>
                <TableCell>Reference ID</TableCell>
                <TableCell>Performed By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                    Loading transactions...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    No stock transactions found matching filters.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => {
                  const isSale = tx.type === 'BILL_SALE';
                  const isRev = tx.type === 'SALE_REVERSAL';
                  const isTrf = tx.type === 'GODOWN_TO_SHOP';

                  return (
                    <TableRow key={tx._id} hover>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                        {new Date(tx.createdAt).toLocaleString()}
                      </TableCell>

                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem' }}>
                        {tx.transactionId}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                          {tx.productName}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b' }}>
                          SKU: {tx.sku}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          size="small"
                          label={tx.type.replace(/_/g, ' ')}
                          sx={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            backgroundColor: isSale
                              ? 'rgba(239, 68, 68, 0.1)'
                              : isRev
                              ? 'rgba(16, 185, 129, 0.1)'
                              : isTrf
                              ? 'rgba(79, 70, 229, 0.1)'
                              : 'rgba(245, 158, 11, 0.1)',
                            color: isSale
                              ? '#dc2626'
                              : isRev
                              ? '#059669'
                              : isTrf
                              ? '#4f46e5'
                              : '#b45309',
                          }}
                        />
                      </TableCell>

                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 800,
                          fontSize: '0.9rem',
                          color: isSale ? '#dc2626' : tx.quantity > 0 ? '#059669' : '#0f172a',
                        }}
                      >
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} PCS
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.85rem' }}>
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          {tx.beforeGodownStock} →{' '}
                          <strong style={{ color: '#4f46e5' }}>{tx.afterGodownStock}</strong>
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.85rem' }}>
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          {tx.beforeShopStock} →{' '}
                          <strong style={{ color: '#059669' }}>{tx.afterShopStock}</strong>
                        </Typography>
                      </TableCell>

                      <TableCell sx={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>
                        {tx.referenceId || '—'}
                      </TableCell>

                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {tx.performedBy}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => fetchTransactions(p)}
              color="primary"
            />
          </Box>
        )}
      </Card>
    </Box>
  );
};
