import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Alert,
  Divider,
  Chip,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Save, ShieldCheck, Key, Eye, EyeOff, User } from 'lucide-react';
import { SettingsApi, AuthApi } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [companyName, setCompanyName] = useState('Varun Traders');
  const [godownName, setGodownName] = useState('Main Godown (Warehouse)');
  const [shopName, setShopName] = useState('Varun Traders Shop Counter');

  // Admin Account Settings
  const [adminName, setAdminName] = useState('Admin');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [accountSuccess, setAccountSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const [setRes, meRes] = await Promise.all([SettingsApi.get(), AuthApi.getMe()]);

      if (setRes.success && setRes.data) {
        const d = setRes.data;
        setCompanyName(d.companyName || 'Varun Traders');
        setGodownName(d.godownName || 'Main Godown (Warehouse)');
        setShopName(d.shopName || 'Varun Traders Shop Counter');
      }

      if (meRes.success && meRes.user) {
        setAdminName(meRes.user.name || 'Admin');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);

    try {
      const res = await SettingsApi.update({
        companyName,
        godownName,
        shopName,
      });

      if (res.success) {
        setSettingsSuccess(true);
      }
    } catch (err: any) {
      setSettingsError(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateAdminAccount = async () => {
    setSavingAccount(true);
    setAccountError(null);
    setAccountSuccess(false);

    if (newPassword && newPassword !== confirmPassword) {
      setAccountError('New password and confirm password do not match');
      setSavingAccount(false);
      return;
    }

    if (newPassword && !currentPassword) {
      setAccountError('Please enter your current password to set a new password');
      setSavingAccount(false);
      return;
    }

    try {
      const res = await AuthApi.updateProfile({
        name: adminName,
        currentPassword: currentPassword || undefined,
        newPassword: newPassword || undefined,
      });

      if (res.success) {
        setAccountSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // Update stored user object
        const storedUser = localStorage.getItem('varun_stock_user');
        if (storedUser) {
          try {
            const u = JSON.parse(storedUser);
            u.name = res.user.name;
            localStorage.setItem('varun_stock_user', JSON.stringify(u));
          } catch {}
        }
      }
    } catch (err: any) {
      setAccountError(err.message || 'Failed to update admin account');
    } finally {
      setSavingAccount(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          System Settings & Admin Security
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Configure stock warehouse locations, company title, and single admin credentials
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Warehouse & General Settings */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Stock Locations & Branding
                </Typography>
              </Box>

              {settingsSuccess && (
                <Alert severity="success" sx={{ mb: 2.5, borderRadius: '8px' }}>
                  Location names saved successfully!
                </Alert>
              )}

              {settingsError && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }}>
                  {settingsError}
                </Alert>
              )}

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="System / Company Title"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Main Godown Label"
                    value={godownName}
                    onChange={(e) => setGodownName(e.target.value)}
                    helperText="Primary warehouse location for bulk PCS storage"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Shop Counter Label"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    helperText="Sales counter location for daily stock dispatches"
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  disabled={savingSettings}
                  onClick={handleSaveSettings}
                  startIcon={<Save size={18} />}
                  sx={{ backgroundColor: '#0f172a', fontWeight: 700 }}
                >
                  {savingSettings ? 'Saving...' : 'Save Locations'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Single Admin Account Security */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    Admin Account & Password
                  </Typography>
                </Box>
                <Chip
                  icon={<ShieldCheck size={14} color="#10b981" />}
                  label="Single Admin User"
                  size="small"
                  sx={{ backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: '0.75rem' }}
                />
              </Box>

              {accountSuccess && (
                <Alert severity="success" sx={{ mb: 2.5, borderRadius: '8px' }}>
                  Admin credentials updated successfully!
                </Alert>
              )}

              {accountError && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }}>
                  {accountError}
                </Alert>
              )}

              <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Admin Display Name"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <User size={16} color="#94a3b8" />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Username"
                    value="admin"
                    disabled
                    helperText="Fixed system administrator username"
                  />
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <Divider sx={{ my: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                      Change Password (Optional)
                    </Typography>
                  </Divider>
                </Grid>

                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type={showPassword ? 'text' : 'password'}
                    label="Current Password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Key size={16} color="#94a3b8" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type={showPassword ? 'text' : 'password'}
                    label="New Password"
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type={showPassword ? 'text' : 'password'}
                    label="Confirm New Password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  disabled={savingAccount}
                  onClick={handleUpdateAdminAccount}
                  startIcon={<Save size={18} />}
                  sx={{ backgroundColor: '#4f46e5', fontWeight: 700, '&:hover': { backgroundColor: '#4338ca' } }}
                >
                  {savingAccount ? 'Updating...' : 'Update Admin Credentials'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
