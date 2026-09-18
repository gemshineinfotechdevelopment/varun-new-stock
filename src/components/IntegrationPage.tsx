import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
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
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle2,
  RotateCcw,
  Play,
  ShieldCheck,
  RefreshCw,
  Send,
} from 'lucide-react';
import { IntegrationApi, InventoryApi, SettingsApi } from '../services/api';

export const IntegrationPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  // Simulator State
  const [simBillNo, setSimBillNo] = useState('VT-1025');
  const [simBillId, setSimBillId] = useState(`bill_${Date.now()}`);
  const [simSku, setSimSku] = useState('');
  const [simQuantity, setSimQuantity] = useState('15');
  const [simIdempotencyKey, setSimIdempotencyKey] = useState(`key_${Date.now()}`);
  const [simLoading, setSimLoading] = useState(false);
  const [simResponse, setSimResponse] = useState<any | null>(null);

  const fetchIntegrationData = async () => {
    try {
      const [hRes, evRes, invRes, setRes] = await Promise.all([
        IntegrationApi.getHealth(),
        IntegrationApi.getEvents({ limit: 50 }),
        InventoryApi.getList(),
        SettingsApi.get(),
      ]);

      if (hRes.success) setHealth(hRes);
      if (evRes.success) setEvents(evRes.data);
      if (invRes.success) {
        setInventoryList(invRes.data);
        if (!simSku && invRes.data.length > 0) {
          setSimSku(invRes.data[0].sku);
        }
      }
      if (setRes.success) setSettings(setRes.data);
    } catch (err) {
      console.error('Failed to load integration data:', err);
    }
  };

  useEffect(() => {
    fetchIntegrationData();
  }, []);

  // Simulate Sale Deduction
  const handleSimulateSale = async () => {
    setSimLoading(true);
    setSimResponse(null);
    try {
      const selectedItem = inventoryList.find((i) => i.sku === simSku);
      const payload = {
        billId: simBillId,
        billNumber: simBillNo,
        items: [
          {
            sku: simSku,
            productName: selectedItem?.productName || 'Test Item',
            quantity: Number(simQuantity) || 1,
          },
        ],
        billDate: new Date().toISOString(),
      };

      const res = await IntegrationApi.simulateSale(
        payload,
        simIdempotencyKey,
        settings?.integrationApiKey
      );
      setSimResponse(res);
      fetchIntegrationData();
    } catch (err: any) {
      setSimResponse({ success: false, message: err.message, status: err.status || 'ERROR' });
    } finally {
      setSimLoading(false);
    }
  };

  // Simulate Reversal
  const handleSimulateReversal = async () => {
    setSimLoading(true);
    setSimResponse(null);
    try {
      const payload = {
        billId: simBillId,
        billNumber: simBillNo,
        reason: 'Simulated customer bill cancellation from test playground',
      };

      const res = await IntegrationApi.simulateReversal(payload, settings?.integrationApiKey);
      setSimResponse(res);
      fetchIntegrationData();
    } catch (err: any) {
      setSimResponse({ success: false, message: err.message, status: err.status || 'ERROR' });
    } finally {
      setSimLoading(false);
    }
  };

  const handleRetryEvent = async (eventId: string) => {
    try {
      const res = await IntegrationApi.retryEvent(eventId);
      alert(res.message || 'Retry completed');
      fetchIntegrationData();
    } catch (err: any) {
      alert(err.message || 'Retry failed');
    }
  };

  const handleGenerateNewSimBill = () => {
    const num = Math.floor(1000 + Math.random() * 9000);
    setSimBillNo(`VT-${num}`);
    setSimBillId(`mongo_bill_${num}`);
    setSimIdempotencyKey(`evt_key_${num}`);
    setSimResponse(null);
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
            Billing Integration Monitor & Simulator
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Backend-to-backend webhook synchronization between Varun Trade Billing and Stock Maintenance
          </Typography>
        </Box>

        <Button
          variant="outlined"
          size="small"
          onClick={fetchIntegrationData}
          startIcon={<RefreshCw size={16} />}
          sx={{ borderColor: '#cbd5e1', color: '#475569' }}
        >
          Refresh Sync
        </Button>
      </Box>

      {/* Health Metrics & API Info Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: '4px solid #059669' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                INTEGRATION STATUS
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 0.5 }}>
                <CheckCircle2 size={22} color="#059669" />
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#064e3b' }}>
                  {health?.status || 'ONLINE'}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                Listening for Billing Webhooks
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: '4px solid #4f46e5' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                TOTAL PROCESSED BILLS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b', my: 0.5 }}>
                {health?.stats?.processedEvents ?? 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6366f1' }}>
                Reversed: {health?.stats?.reversedEvents ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: '4px solid #ef4444' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                FAILED / PENDING SYNCS
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#dc2626', my: 0.5 }}>
                {health?.stats?.failedEvents ?? 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#ef4444' }}>
                All sync retries tracked
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ borderLeft: '4px solid #0f172a' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                LAST SYNC EVENT
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 1 }}>
                {health?.stats?.lastEventAt ? new Date(health.stats.lastEventAt).toLocaleTimeString() : 'Ready'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Port: 5020 | Protocol: JSON REST
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Interactive Webhook Simulator */}
      <Card sx={{ mb: 4, border: '1px solid #c7d2fe', boxShadow: '0 4px 20px rgba(79, 70, 229, 0.08)' }}>
        <Box
          sx={{
            p: 2.5,
            backgroundColor: '#f8faff',
            borderBottom: '1px solid #e0e7ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, borderRadius: '8px', backgroundColor: '#4f46e5', color: '#fff' }}>
              <Play size={18} />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e1b4b' }}>
                Interactive Billing Webhook Simulator & Idempotency Tester
              </Typography>
              <Typography variant="caption" sx={{ color: '#6366f1' }}>
                Test Finalize Bill, Idempotency Retry, and Stock Reversals directly in browser
              </Typography>
            </Box>
          </Box>

          <Button size="small" variant="outlined" onClick={handleGenerateNewSimBill}>
            Generate New Bill #
          </Button>
        </Box>

        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="Bill Number"
                value={simBillNo}
                onChange={(e) => setSimBillNo(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                label="External Bill ID"
                value={simBillId}
                onChange={(e) => setSimBillId(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                select
                label="Product SKU to Sell"
                value={simSku}
                onChange={(e) => setSimSku(e.target.value)}
              >
                {inventoryList.map((item) => (
                  <MenuItem key={item.sku} value={item.sku}>
                    {item.productName} ({item.sku}) — Shop: {item.shopStock} PCS
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Quantity Sold (PCS)"
                value={simQuantity}
                onChange={(e) => setSimQuantity(e.target.value)}
              />
            </Grid>
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2.5 }}>
            <Button
              variant="contained"
              color="primary"
              disabled={simLoading || !simSku}
              onClick={handleSimulateSale}
              startIcon={simLoading ? <CircularProgress size={16} color="inherit" /> : <Send size={16} />}
              sx={{ backgroundColor: '#0f172a', fontWeight: 700 }}
            >
              1. Finalize Bill (Deduct Shop Stock)
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              disabled={simLoading}
              onClick={handleSimulateSale}
              startIcon={<ShieldCheck size={16} />}
              sx={{ fontWeight: 700 }}
            >
              2. Test Idempotency (Retry Same Bill)
            </Button>

            <Button
              variant="outlined"
              color="error"
              disabled={simLoading}
              onClick={handleSimulateReversal}
              startIcon={<RotateCcw size={16} />}
              sx={{ fontWeight: 700 }}
            >
              3. Cancel Bill (Restore Shop Stock)
            </Button>
          </Box>

          {/* Simulation Result Box */}
          {simResponse && (
            <Box
              sx={{
                p: 2,
                borderRadius: '8px',
                backgroundColor: simResponse.success
                  ? simResponse.alreadyProcessed
                    ? '#eff6ff'
                    : '#f0fdf4'
                  : '#fef2f2',
                border: `1px solid ${
                  simResponse.success
                    ? simResponse.alreadyProcessed
                      ? '#bfdbfe'
                      : '#bbf7d0'
                    : '#fecaca'
                }`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: simResponse.success ? '#065f46' : '#991b1b',
                  mb: 0.5,
                }}
              >
                Simulation Response: {simResponse.status || (simResponse.success ? 'SUCCESS' : 'FAILED')}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                {simResponse.message}
              </Typography>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#475569' }}>
                Payload Echo: {JSON.stringify(simResponse)}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Integration Events Table */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                Billing Sync Event History
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Audit trail of all external webhook calls received from Varun Trade Billing
              </Typography>
            </Box>
          </Box>

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Bill Number</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Items Processed</TableCell>
                  <TableCell>Failure / Reversal Reason</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                      No billing sync events recorded yet. Use the simulator above to test!
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((evt) => {
                    const isProcessed = evt.status === 'PROCESSED';
                    const isReversed = evt.status === 'REVERSED';
                    const isFailed = evt.status === 'FAILED';

                    return (
                      <TableRow key={evt._id} hover>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(evt.processedAt || evt.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                          {evt.billNumber}
                        </TableCell>
                        <TableCell>
                          <Chip size="small" label={evt.eventType} sx={{ fontSize: '0.7rem', fontWeight: 700 }} />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={evt.status}
                            color={isProcessed ? 'success' : isReversed ? 'warning' : 'error'}
                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {evt.items?.length || 0} items
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            {evt.items
                              ?.map((i: any) => `${i.productName || i.sku}: ${i.quantity} PCS (Shop ${i.shopStockBefore} → ${i.shopStockAfter})`)
                              .join(', ')}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.8rem', color: '#dc2626' }}>
                          {evt.failureReason || evt.reversalReason || '—'}
                        </TableCell>
                        <TableCell align="center">
                          {isFailed && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={() => handleRetryEvent(evt._id)}
                            >
                              Retry Sync
                            </Button>
                          )}
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
    </Box>
  );
};
