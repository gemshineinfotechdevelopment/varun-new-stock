import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  MenuItem,
  Select,
  FormControl,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  ArrowRightLeft,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  RefreshCw,
  Warehouse,
  Store,
} from 'lucide-react';
import { TransfersApi, InventoryApi, SettingsApi } from '../services/api';

interface TransferRow {
  productId: string;
  transferQuantity: number;
  availableGodown: number;
  availableShop: number;
  productName: string;
  sku: string;
}

export const StockTransferPage: React.FC = () => {
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Transfer Direction: Godown -> Shop OR Shop -> Godown
  const [direction, setDirection] = useState<'GODOWN_TO_SHOP' | 'SHOP_TO_GODOWN'>('GODOWN_TO_SHOP');

  // New Transfer Form State
  const [transferRows, setTransferRows] = useState<TransferRow[]>([
    { productId: '', transferQuantity: 1, availableGodown: 0, availableShop: 0, productName: '', sku: '' },
  ]);
  const [remarks, setRemarks] = useState('');

  // Transfer Slip Modal
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [settings, setSettings] = useState<any>(null);

  const fetchInitialData = async () => {
    try {
      const [invRes, trfRes, setRes] = await Promise.all([
        InventoryApi.getList(),
        TransfersApi.getAll({ limit: 50 }),
        SettingsApi.get(),
      ]);

      if (invRes.success) setInventoryList(invRes.data);
      if (trfRes.success) setTransfers(trfRes.data);
      if (setRes.success) setSettings(setRes.data);
    } catch (err) {
      console.error('Failed to load transfer data:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleProductChange = (index: number, productId: string) => {
    const item = inventoryList.find((p) => p.productId === productId);
    if (!item) return;

    const newRows = [...transferRows];
    const sourceQty = direction === 'GODOWN_TO_SHOP' ? item.godownStock : item.shopStock;
    newRows[index] = {
      productId,
      productName: item.productName,
      sku: item.sku,
      availableGodown: item.godownStock,
      availableShop: item.shopStock,
      transferQuantity: Math.min(1, sourceQty),
    };
    setTransferRows(newRows);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const newRows = [...transferRows];
    newRows[index].transferQuantity = quantity;
    setTransferRows(newRows);
  };

  const handleAddRow = () => {
    setTransferRows([
      ...transferRows,
      { productId: '', transferQuantity: 1, availableGodown: 0, availableShop: 0, productName: '', sku: '' },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (transferRows.length === 1) return;
    setTransferRows(transferRows.filter((_, i) => i !== index));
  };

  const totalTransferQty = transferRows.reduce(
    (acc, row) => acc + (Number(row.transferQuantity) || 0),
    0
  );

  const handleExecuteTransfer = async () => {
    setError(null);
    setSuccessMsg(null);

    const validItems = transferRows.filter((r) => r.productId && r.transferQuantity > 0);
    if (validItems.length === 0) {
      setError('Please select at least one product with a transfer quantity greater than 0');
      return;
    }

    // Validate insufficient source stock
    for (const item of validItems) {
      const sourceAvailable = direction === 'GODOWN_TO_SHOP' ? item.availableGodown : item.availableShop;
      if (item.transferQuantity > sourceAvailable) {
        const srcName = direction === 'GODOWN_TO_SHOP' ? 'Godown' : 'Shop';
        setError(
          `Cannot transfer ${item.transferQuantity} PCS of '${item.productName}'. Only ${sourceAvailable} PCS available in ${srcName}.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await TransfersApi.create({
        direction,
        items: validItems.map((r) => ({
          productId: r.productId,
          transferQuantity: Number(r.transferQuantity),
        })),
        remarks,
      });

      if (res.success) {
        const fromText = direction === 'GODOWN_TO_SHOP' ? 'Godown' : 'Shop';
        const toText = direction === 'GODOWN_TO_SHOP' ? 'Shop' : 'Godown';
        setSuccessMsg(
          `✅ Transfer slip ${res.data.transferNumber} created! ${res.data.totalQuantity} PCS transferred from ${fromText} to ${toText}.`
        );
        setTransferRows([
          { productId: '', transferQuantity: 1, availableGodown: 0, availableShop: 0, productName: '', sku: '' },
        ]);
        setRemarks('');
        fetchInitialData();
        setSelectedTransfer(res.data);
      } else {
        setError(res.message || 'Transfer failed');
      }
    } catch (err: any) {
      setError(err.message || 'Server error occurred during stock transfer');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const isShopToGodown = direction === 'SHOP_TO_GODOWN';

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
            Physical Stock Transfer
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Move physical products in PCS between Godown and Shop with atomic validation
          </Typography>
        </Box>

        {/* Transfer Direction Toggle */}
        <ToggleButtonGroup
          value={direction}
          exclusive
          onChange={(_, val) => val && setDirection(val)}
          size="small"
          sx={{
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            '& .Mui-selected': {
              backgroundColor: isShopToGodown ? '#059669 !important' : '#4f46e5 !important',
              color: '#ffffff !important',
              fontWeight: 700,
            },
          }}
        >
          <ToggleButton value="GODOWN_TO_SHOP" sx={{ px: 2, py: 0.8, textTransform: 'none' }}>
            <Warehouse size={16} style={{ marginRight: 6 }} />
            Godown → Shop
          </ToggleButton>
          <ToggleButton value="SHOP_TO_GODOWN" sx={{ px: 2, py: 0.8, textTransform: 'none' }}>
            <Store size={16} style={{ marginRight: 6 }} />
            Shop → Godown
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3, borderRadius: '8px' }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}

      {/* Transfer Form Card */}
      <Card
        sx={{
          mb: 4,
          border: isShopToGodown ? '1px solid #a7f3d0' : '1px solid #c7d2fe',
          boxShadow: isShopToGodown ? '0 4px 20px rgba(5, 150, 105, 0.06)' : '0 4px 20px rgba(79, 70, 229, 0.06)',
        }}
      >
        <Box
          sx={{
            p: 2.5,
            backgroundColor: isShopToGodown ? '#f0fdf4' : '#f8faff',
            borderBottom: isShopToGodown ? '1px solid #bbf7d0' : '1px solid #e0e7ff',
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
                backgroundColor: isShopToGodown ? '#059669' : '#4f46e5',
                color: '#ffffff',
              }}
            >
              <ArrowRightLeft size={20} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: isShopToGodown ? '#064e3b' : '#1e1b4b' }}>
                {isShopToGodown ? 'Shop → Godown Return Slip' : 'Godown → Shop Transfer Slip'}
              </Typography>
              <Typography variant="caption" sx={{ color: isShopToGodown ? '#059669' : '#6366f1', fontWeight: 600 }}>
                From: {isShopToGodown ? 'Shop Counter' : 'Main Godown (Warehouse)'} ➔ To:{' '}
                {isShopToGodown ? 'Main Godown' : 'Shop Counter'}
              </Typography>
            </Box>
          </Box>

          <Chip
            label={`Total Transfer Qty: ${totalTransferQty} PCS`}
            sx={{
              backgroundColor: isShopToGodown ? '#059669' : '#4f46e5',
              color: '#ffffff',
              fontWeight: 700,
            }}
          />
        </Box>

        <CardContent sx={{ p: 3 }}>
          <TableContainer component={Paper} elevation={0} sx={{ mb: 2.5, border: '1px solid #e2e8f0' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '40%' }}>Product Selection</TableCell>
                  <TableCell align="center">
                    {isShopToGodown ? 'Shop Available (Source)' : 'Godown Available (Source)'}
                  </TableCell>
                  <TableCell align="center">
                    {isShopToGodown ? 'Godown Current (Target)' : 'Shop Current (Target)'}
                  </TableCell>
                  <TableCell align="center" sx={{ width: '20%' }}>
                    Transfer Quantity (PCS)
                  </TableCell>
                  <TableCell align="center" sx={{ width: '10%' }}>
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transferRows.map((row, idx) => {
                  const sourceAvailable = isShopToGodown ? row.availableShop : row.availableGodown;
                  const targetAvailable = isShopToGodown ? row.availableGodown : row.availableShop;
                  const hasInsufficient = row.transferQuantity > sourceAvailable;
                  return (
                    <TableRow key={idx}>
                      {/* Product Selector */}
                      <TableCell>
                        <FormControl fullWidth size="small">
                          <Select
                            value={row.productId}
                            displayEmpty
                            onChange={(e) => handleProductChange(idx, e.target.value)}
                          >
                            <MenuItem value="" disabled>
                              <em>-- Select Product to Transfer --</em>
                            </MenuItem>
                            {inventoryList.map((item) => {
                              const srcStock = isShopToGodown ? item.shopStock : item.godownStock;
                              return (
                                <MenuItem
                                  key={item.productId}
                                  value={item.productId}
                                  disabled={srcStock <= 0}
                                >
                                  {item.productName} ({item.sku}) — Available: {srcStock} PCS
                                </MenuItem>
                              );
                            })}
                          </Select>
                        </FormControl>
                      </TableCell>

                      {/* Source Available */}
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={`${sourceAvailable} PCS`}
                          sx={{
                            fontWeight: 700,
                            backgroundColor: sourceAvailable > 0 ? (isShopToGodown ? '#dcfce7' : '#e0e7ff') : '#fee2e2',
                            color: sourceAvailable > 0 ? (isShopToGodown ? '#15803d' : '#3730a3') : '#dc2626',
                          }}
                        />
                      </TableCell>

                      {/* Target Current */}
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={`${targetAvailable} PCS`}
                          sx={{
                            fontWeight: 700,
                            backgroundColor: isShopToGodown ? '#e0e7ff' : '#dcfce7',
                            color: isShopToGodown ? '#3730a3' : '#15803d',
                          }}
                        />
                      </TableCell>

                      {/* Transfer Qty Input */}
                      <TableCell align="center">
                        <TextField
                          type="number"
                          size="small"
                          fullWidth
                          value={row.transferQuantity || ''}
                          onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 0)}
                          error={hasInsufficient}
                          helperText={hasInsufficient ? `Exceeds ${isShopToGodown ? 'Shop' : 'Godown'}` : ''}
                        />
                      </TableCell>

                      {/* Remove Row */}
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveRow(idx)}
                          disabled={transferRows.length === 1}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: 2,
              mb: 3,
            }}
          >
            <Button
              variant="outlined"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={handleAddRow}
              sx={{
                borderColor: isShopToGodown ? '#059669' : '#4f46e5',
                color: isShopToGodown ? '#059669' : '#4f46e5',
                alignSelf: { xs: 'flex-start', sm: 'center' },
              }}
            >
              Add Another Product Row
            </Button>

            <Box sx={{ width: { xs: '100%', sm: '50%' } }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Optional transfer remarks / driver notes / batch details..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </Box>
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              disabled={submitting || totalTransferQty <= 0}
              onClick={handleExecuteTransfer}
              startIcon={<CheckCircle2 size={18} />}
              sx={{
                backgroundColor: isShopToGodown ? '#059669' : '#4f46e5',
                px: 4,
                py: 1.2,
                fontWeight: 700,
                '&:hover': { backgroundColor: isShopToGodown ? '#047857' : '#4338ca' },
              }}
            >
              {submitting
                ? 'Transferring Stock...'
                : `Confirm & Transfer ${totalTransferQty} PCS (${isShopToGodown ? 'Shop → Godown' : 'Godown → Shop'})`}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Transfer History Table */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Transfer History Slips
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Historical Godown ↔ Shop dispatch and return records
              </Typography>
            </Box>
            <Button size="small" onClick={fetchInitialData} startIcon={<RefreshCw size={15} />}>
              Refresh
            </Button>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Transfer No</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Direction</TableCell>
                  <TableCell>Items Summary</TableCell>
                  <TableCell align="right">Total Quantity</TableCell>
                  <TableCell>Transferred By</TableCell>
                  <TableCell>Remarks</TableCell>
                  <TableCell align="center">Print Slip</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transfers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                      No transfers recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transfers.map((trf) => {
                    const isTrfShopToGodown = trf.fromLocation === 'SHOP';
                    return (
                      <TableRow key={trf._id || trf.transferNumber} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a' }}>
                          {trf.transferNumber}
                        </TableCell>
                        <TableCell sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                          {new Date(trf.transferDate || trf.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={isTrfShopToGodown ? 'Shop → Godown' : 'Godown → Shop'}
                            sx={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: isTrfShopToGodown ? '#dcfce7' : '#e0e7ff',
                              color: isTrfShopToGodown ? '#15803d' : '#4f46e5',
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem' }}>
                          {trf.items && trf.items.length > 0
                            ? trf.items.map((i: any) => `${i.productName} (${i.transferQuantity} PCS)`).join(', ')
                            : 'N/A'}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: isTrfShopToGodown ? '#059669' : '#4f46e5' }}>
                          {trf.totalQuantity} PCS
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: '#475569' }}>
                          {trf.transferredBy || 'Admin'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.85rem', color: '#64748b' }}>
                          {trf.remarks || '—'}
                        </TableCell>
                        <TableCell align="center">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setSelectedTransfer(trf)}
                            startIcon={<Printer size={14} />}
                            sx={{ fontSize: '0.75rem', py: 0.3 }}
                          >
                            Slip
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Printable Transfer Slip Modal */}
      <Dialog
        open={Boolean(selectedTransfer)}
        onClose={() => setSelectedTransfer(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Stock Transfer Dispatch Note</span>
          <Button
            size="small"
            variant="contained"
            onClick={handlePrintSlip}
            startIcon={<Printer size={16} />}
            sx={{ backgroundColor: '#0f172a' }}
          >
            Print Note
          </Button>
        </DialogTitle>

        <DialogContent dividers>
          {selectedTransfer && (
            <Box id="printable-transfer-slip" sx={{ p: 2, color: '#0f172a' }}>
              {/* Slip Header */}
              <Box sx={{ textAlign: 'center', borderBottom: '2px solid #0f172a', pb: 2, mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 900, textTransform: 'uppercase' }}>
                  {settings?.companyName || 'Varun Trade'}
                </Typography>
                <Typography variant="subtitle2" sx={{ color: '#475569' }}>
                  Internal Physical Stock Transfer Dispatch Note
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Generated on: {new Date(selectedTransfer.transferDate || selectedTransfer.createdAt).toLocaleString()}
                </Typography>
              </Box>

              {/* Meta Info Box */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  p: 2,
                  mb: 3,
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <Box>
                  <Typography variant="body2">
                    <strong>Transfer Slip No:</strong> {selectedTransfer.transferNumber}
                  </Typography>
                  <Typography variant="body2">
                    <strong>From Location:</strong>{' '}
                    {selectedTransfer.fromLocation === 'SHOP'
                      ? settings?.shopName || 'Shop Counter'
                      : settings?.godownName || 'Main Godown (Warehouse)'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>To Location:</strong>{' '}
                    {selectedTransfer.toLocation === 'GODOWN'
                      ? settings?.godownName || 'Main Godown (Warehouse)'
                      : settings?.shopName || 'Shop Counter'}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2">
                    <strong>Transferred By:</strong> {selectedTransfer.transferredBy || 'Admin'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Status:</strong> COMPLETED
                  </Typography>
                  {selectedTransfer.remarks && (
                    <Typography variant="body2">
                      <strong>Remarks:</strong> {selectedTransfer.remarks}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Items Table */}
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #cbd5e1', mb: 3 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Product Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>SKU</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        Transferred Qty (PCS)
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedTransfer.items &&
                      selectedTransfer.items.map((item: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>{item.productName}</TableCell>
                          <TableCell sx={{ fontFamily: 'monospace' }}>{item.sku}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800 }}>
                            {item.transferQuantity} PCS
                          </TableCell>
                        </TableRow>
                      ))}
                    <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                      <TableCell colSpan={3} sx={{ fontWeight: 900, textAlign: 'right' }}>
                        TOTAL PIECES TRANSFERRED:
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 900, fontSize: '1.05rem', color: '#0f172a' }}>
                        {selectedTransfer.totalQuantity} PCS
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Signatures */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 6, pt: 3, borderTop: '1px dashed #cbd5e1' }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ mb: 4 }}>
                    __________________________
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    Dispatched By (Sender)
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ mb: 4 }}>
                    __________________________
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>
                    Received By (Receiver)
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setSelectedTransfer(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
