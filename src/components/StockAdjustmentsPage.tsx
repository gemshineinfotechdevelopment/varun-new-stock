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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
} from '@mui/material';
import { Plus, RefreshCw } from 'lucide-react';
import { AdjustmentsApi, InventoryApi } from '../services/api';

export const StockAdjustmentsPage: React.FC = () => {
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [location, setLocation] = useState<'GODOWN' | 'SHOP'>('SHOP');
  const [physicalQty, setPhysicalQty] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [adjRes, invRes] = await Promise.all([
        AdjustmentsApi.getAll({ limit: 50 }),
        InventoryApi.getList(),
      ]);

      if (adjRes.success) setAdjustments(adjRes.data);
      if (invRes.success) setInventoryList(invRes.data);
    } catch (err) {
      console.error('Failed to load adjustments data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedInventory = inventoryList.find((i) => i.productId === selectedProductId);
  const currentSystemQty = selectedInventory
    ? location === 'GODOWN'
      ? selectedInventory.godownStock
      : selectedInventory.shopStock
    : 0;

  const countedQtyNum = physicalQty !== '' ? parseInt(physicalQty) || 0 : currentSystemQty;
  const variance = selectedInventory ? countedQtyNum - currentSystemQty : 0;

  const handleOpenDialog = () => {
    setSelectedProductId(inventoryList[0]?.productId || '');
    setLocation('SHOP');
    setPhysicalQty('');
    setReason('');
    setError(null);
    setDialogOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (!selectedProductId) {
      setError('Please select a product');
      return;
    }
    if (physicalQty === '' || isNaN(parseInt(physicalQty)) || parseInt(physicalQty) < 0) {
      setError('Physical quantity must be a non-negative number');
      return;
    }
    if (!reason.trim()) {
      setError('A valid audit reason is required (e.g. Physical inventory count, Damaged goods)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await AdjustmentsApi.create({
        productId: selectedProductId,
        location,
        physicalQty: parseInt(physicalQty),
        reason: reason.trim(),
      });

      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to execute stock adjustment');
    } finally {
      setSubmitting(false);
    }
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
            Physical Stock Adjustments
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Reconcile physical inventory counts against system records with audit tracking (No silent edits)
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="medium"
          onClick={handleOpenDialog}
          startIcon={<Plus size={18} />}
          sx={{ backgroundColor: '#0f172a', '&:hover': { backgroundColor: '#1e293b' } }}
        >
          New Stock Adjustment
        </Button>
      </Box>

      {/* Adjustments Table */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
              Adjustment Audit Log
            </Typography>
            <Button size="small" onClick={fetchData} startIcon={<RefreshCw size={15} />}>
              Refresh
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Adjustment ID</TableCell>
                  <TableCell>Product / SKU</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell align="right">System Qty</TableCell>
                  <TableCell align="right">Physical Qty</TableCell>
                  <TableCell align="right">Variance (PCS)</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Adjusted By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                      Loading adjustments...
                    </TableCell>
                  </TableRow>
                ) : adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                      No manual stock adjustments recorded.
                    </TableCell>
                  </TableRow>
                ) : (
                  adjustments.map((adj) => (
                    <TableRow key={adj._id} hover>
                      <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {new Date(adj.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                        {adj.adjustmentNumber}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {adj.productName}
                        </Typography>
                        <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#64748b' }}>
                          {adj.sku}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={adj.location}
                          sx={{
                            fontWeight: 700,
                            backgroundColor: adj.location === 'GODOWN' ? '#e0e7ff' : '#dcfce7',
                            color: adj.location === 'GODOWN' ? '#4f46e5' : '#059669',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">{adj.systemQty} PCS</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {adj.physicalQty} PCS
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 800,
                          color: adj.adjustmentQty < 0 ? '#dc2626' : adj.adjustmentQty > 0 ? '#059669' : '#475569',
                        }}
                      >
                        {adj.adjustmentQty > 0 ? `+${adj.adjustmentQty}` : adj.adjustmentQty} PCS
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.85rem' }}>{adj.reason}</TableCell>
                      <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                        {adj.adjustedBy}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* New Adjustment Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          Physical Stock Audit & Adjustment
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Product Selector */}
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Select Product *</InputLabel>
                <Select
                  value={selectedProductId}
                  label="Select Product *"
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const sel = inventoryList.find((i) => i.productId === e.target.value);
                    if (sel) {
                      setPhysicalQty(String(location === 'GODOWN' ? sel.godownStock : sel.shopStock));
                    }
                  }}
                >
                  {inventoryList.map((item) => (
                    <MenuItem key={item.productId} value={item.productId}>
                      {item.productName} ({item.sku})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Location Selector */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Location *</InputLabel>
                <Select
                  value={location}
                  label="Location *"
                  onChange={(e) => {
                    const newLoc = e.target.value as 'GODOWN' | 'SHOP';
                    setLocation(newLoc);
                    if (selectedInventory) {
                      setPhysicalQty(String(newLoc === 'GODOWN' ? selectedInventory.godownStock : selectedInventory.shopStock));
                    }
                  }}
                >
                  <MenuItem value="SHOP">🏪 Shop Stock</MenuItem>
                  <MenuItem value="GODOWN">🏭 Main Godown Stock</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* System Qty Readonly */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Current System Quantity"
                value={`${currentSystemQty} PCS`}
                slotProps={{ input: { readOnly: true } }}
                sx={{ backgroundColor: '#f8fafc' }}
              />
            </Grid>

            {/* Counted Physical Quantity */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Physical Counted Quantity (PCS) *"
                value={physicalQty}
                onChange={(e) => setPhysicalQty(e.target.value)}
                placeholder="Enter physical count"
              />
            </Grid>

            {/* Variance Display Box */}
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: '8px',
                  backgroundColor: variance < 0 ? '#fee2e2' : variance > 0 ? '#dcfce7' : '#f1f5f9',
                  textAlign: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Stock Variance:
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    color: variance < 0 ? '#dc2626' : variance > 0 ? '#15803d' : '#0f172a',
                  }}
                >
                  {variance > 0 ? `+${variance}` : variance} PCS
                </Typography>
              </Box>
            </Grid>

            {/* Reason */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Audit Reason / Explanation *"
                placeholder="e.g. Found 3 PCS damaged during physical audit"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveAdjustment}
            disabled={submitting}
            sx={{ backgroundColor: '#0f172a', fontWeight: 700 }}
          >
            {submitting ? 'Applying Adjustment...' : 'Confirm & Apply Adjustment'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
