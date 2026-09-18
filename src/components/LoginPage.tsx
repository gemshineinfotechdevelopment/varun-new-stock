import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Lock, User, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AuthApi } from '../services/api';
import varunLogo from '../assets/varun-logo.png';

interface LoginPageProps {
  onLoginSuccess: (user: { name: string; username: string; role: string }, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter username and password');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await AuthApi.login({ username, password });
      if (res && res.token) {
        localStorage.setItem('varun_stock_token', res.token);
        localStorage.setItem('varun_stock_user', JSON.stringify(res.user));
        onLoginSuccess(res.user, res.token);
      } else {
        setError('Login failed. Check credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Server error. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (userRole: 'admin' | 'staff') => {
    if (userRole === 'admin') {
      setUsername('admin');
      setPassword('password123');
    } else {
      setUsername('staff');
      setPassword('staff123');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        p: 2,
      }}
    >
      <Card
        sx={{
          maxWidth: 440,
          width: '100%',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            py: 4,
            px: 3,
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <Box
            component="img"
            src={varunLogo}
            alt="Varun Traders"
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              objectFit: 'cover',
              boxShadow: '0 8px 25px rgba(251, 191, 36, 0.35)',
              border: '3px solid rgba(251, 191, 36, 0.8)',
              mb: 1.5,
              display: 'inline-block',
            }}
          />
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5, color: '#ffffff' }}>
            Varun Traders
          </Typography>
          <Typography variant="body2" sx={{ color: '#fbbf24', fontSize: '0.82rem', fontWeight: 600 }}>
            Stock Maintenance & Godown System (PCS)
          </Typography>
        </Box>

        <CardContent sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', mb: 0.8, display: 'block' }}>
                Username
              </Typography>
              <TextField
                fullWidth
                size="medium"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. admin"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <User size={18} color="#94a3b8" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#475569', mb: 0.8, display: 'block' }}>
                Password
              </Typography>
              <TextField
                fullWidth
                size="medium"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock size={18} color="#94a3b8" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                py: 1.3,
                fontSize: '0.95rem',
                fontWeight: 700,
                backgroundColor: '#0f172a',
                '&:hover': { backgroundColor: '#1e293b' },
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Secure Login'}
            </Button>
          </form>

          {/* Quick Demo Credentials */}
          <Box sx={{ mt: 3.5, pt: 2.5, borderTop: '1px solid #e2e8f0', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 1, fontWeight: 500 }}>
              Quick Demo Fill:
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
              <Chip
                label="Admin: admin / password123"
                size="small"
                onClick={() => handleFillDemo('admin')}
                icon={<ShieldCheck size={14} />}
                clickable
                sx={{ backgroundColor: '#f1f5f9', fontWeight: 600, fontSize: '0.75rem' }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
