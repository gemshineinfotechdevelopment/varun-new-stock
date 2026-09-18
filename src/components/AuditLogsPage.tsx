import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Grid,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  InputAdornment,
  Button,
} from '@mui/material';
import { Search, RefreshCw } from 'lucide-react';
import { AuditLogsApi } from '../services/api';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await AuditLogsApi.getAll({
        module: moduleFilter !== 'ALL' ? moduleFilter : undefined,
        search: search.trim() || undefined,
        limit: 100,
      });
      if (res.success) setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [moduleFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
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
            System Audit Trail
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Security and compliance logs recording all administrative and integration operations
          </Typography>
        </Box>
        <Button size="small" onClick={fetchLogs} startIcon={<RefreshCw size={15} />}>
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 7, md: 8 }}>
              <form onSubmit={handleSearchSubmit}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search user, action, reference..."
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

            <Grid size={{ xs: 12, sm: 5, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Module</InputLabel>
                <Select
                  value={moduleFilter}
                  label="Module"
                  onChange={(e) => setModuleFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All Modules</MenuItem>
                  <MenuItem value="INVENTORY">Inventory</MenuItem>
                  <MenuItem value="TRANSFER">Transfer</MenuItem>
                  <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
                  <MenuItem value="BILLING_INTEGRATION">Billing Integration</MenuItem>
                  <MenuItem value="PRODUCT">Product Master</MenuItem>
                  <MenuItem value="CATEGORY">Category</MenuItem>
                  <MenuItem value="AUTH">Authentication</MenuItem>
                  <MenuItem value="SETTINGS">Settings</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <TableContainer component={Paper} elevation={0}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Timestamp</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Module</TableCell>
                <TableCell>Action</TableCell>
                <TableCell>Reference ID</TableCell>
                <TableCell>Changes / Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    Loading audit trail...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    No audit records found.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log._id} hover>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{log.user}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={log.module}
                        sx={{ fontSize: '0.7rem', fontWeight: 700, backgroundColor: '#f1f5f9' }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{log.action}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {log.referenceId || '—'}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: '#475569' }}>
                      {log.oldValue && <div>Old: {log.oldValue}</div>}
                      {log.newValue && <div>New: {log.newValue}</div>}
                      {!log.oldValue && !log.newValue && '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
};
