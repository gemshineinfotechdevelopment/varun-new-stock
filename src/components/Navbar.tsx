import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
  useMediaQuery,
  Divider,
} from '@mui/material';
import {
  Package,
  Boxes,
  ArrowRightLeft,
  BarChart3,
  Settings,
  LogOut,
  User as UserIcon,
  Menu as MenuIcon,
} from 'lucide-react';

export type NavTab =
  | 'Dashboard'
  | 'Stock Overview'
  | 'Stock Transfer'
  | 'Products'
  | 'Categories'
  | 'Stock History'
  | 'Stock Adjustments'
  | 'Reports'
  | 'Integration'
  | 'Audit Logs'
  | 'Settings';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  user: { name: string; username: string; role: string } | null;
  onLogout: () => void;
  lowStockCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onLogout,
  lowStockCount = 0,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [mobileMenuAnchor, setMobileMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Simplified core navigation items
  const mainNavItems: Array<{ id: NavTab; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'Dashboard', label: 'Dashboard', icon: <BarChart3 size={15} /> },
    {
      id: 'Stock Overview',
      label: 'Stock Overview',
      icon: <Package size={15} />,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'Products', label: 'Products', icon: <Boxes size={15} /> },
    { id: 'Stock Transfer', label: 'Godown ↔ Shop Transfer', icon: <ArrowRightLeft size={15} /> },
    { id: 'Reports', label: 'Reports', icon: <BarChart3 size={15} /> },
    { id: 'Settings', label: 'Settings', icon: <Settings size={15} /> },
  ];

  const buttonStyle = (isActive: boolean) => ({
    color: isActive ? '#ffffff' : '#94a3b8',
    backgroundColor: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
    fontWeight: isActive ? 700 : 500,
    fontSize: '0.78rem',
    px: 1.4,
    py: 0.6,
    borderRadius: '6px',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
    textTransform: 'none' as const,
    transition: 'all 0.15s ease',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      color: '#ffffff',
    },
  });

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: '#0f172a',
        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.15)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        zIndex: 1100,
      }}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 54, md: 58 },
          px: { xs: 2, md: 3 },
          maxWidth: 1400,
          mx: 'auto',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Brand Area */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.2,
            flexShrink: 0,
            cursor: 'pointer',
          }}
          onClick={() => onSelectTab('Dashboard')}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.4)',
            }}
          >
            <Package size={18} />
          </Box>
          <Box sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                color: '#ffffff',
                fontSize: { xs: '0.92rem', md: '1.02rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              Varun Trade
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#94a3b8',
                fontWeight: 700,
                fontSize: '0.62rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'block',
                whiteSpace: 'nowrap',
              }}
            >
              Godown &amp; Shop Stock
            </Typography>
          </Box>
        </Box>

        {/* Desktop Navigation */}
        {!isMobile && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.6,
              flexShrink: 0,
            }}
          >
            {mainNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <Button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  startIcon={item.icon}
                  sx={buttonStyle(isActive)}
                >
                  {item.label}
                  {item.badge && (
                    <Chip
                      size="small"
                      label={item.badge}
                      sx={{
                        ml: 0.6,
                        height: 16,
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        backgroundColor: '#d97706',
                        color: '#ffffff',
                      }}
                    />
                  )}
                </Button>
              );
            })}
          </Box>
        )}

        {/* Right Section: Mobile Toggle & User Profile */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexShrink: 0 }}>
          {user && (
            <Chip
              icon={<UserIcon size={13} color="#10b981" />}
              label={user.name || 'Admin'}
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{
                height: 28,
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#f8fafc',
                fontWeight: 600,
                fontSize: '0.75rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.15)' },
              }}
            />
          )}

          <Tooltip title="Logout">
            <IconButton
              size="small"
              onClick={onLogout}
              sx={{
                color: '#94a3b8',
                flexShrink: 0,
                '&:hover': { color: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
              }}
            >
              <LogOut size={17} />
            </IconButton>
          </Tooltip>

          {/* Mobile Menu Icon */}
          {isMobile && (
            <IconButton
              onClick={(e) => setMobileMenuAnchor(e.currentTarget)}
              sx={{ color: '#ffffff', ml: 0.5 }}
            >
              <MenuIcon size={24} />
            </IconButton>
          )}
        </Box>

        {/* Mobile Dropdown Menu */}
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={() => setMobileMenuAnchor(null)}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: '#1e293b',
                color: '#ffffff',
                minWidth: 220,
                mt: 1.5,
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
              },
            },
          }}
        >
          {mainNavItems.map((item) => (
            <MenuItem
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                setMobileMenuAnchor(null);
              }}
              sx={{
                py: 1.2,
                gap: 1.5,
                backgroundColor: activeTab === item.id ? 'rgba(79, 70, 229, 0.25)' : 'transparent',
                fontWeight: activeTab === item.id ? 700 : 500,
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                },
              }}
            >
              {item.icon}
              {item.label}
              {item.badge && (
                <Chip
                  size="small"
                  label={item.badge}
                  sx={{ ml: 'auto', height: 18, fontSize: '0.65rem', backgroundColor: '#d97706', color: '#fff' }}
                />
              )}
            </MenuItem>
          ))}
        </Menu>

        {/* User Account Menu */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={() => setUserMenuAnchor(null)}
          slotProps={{
            paper: {
              sx: {
                backgroundColor: '#1e293b',
                color: '#ffffff',
                minWidth: 200,
                mt: 1,
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              },
            },
          }}
        >
          <MenuItem
            onClick={() => {
              onSelectTab('Settings');
              setUserMenuAnchor(null);
            }}
            sx={{ gap: 1.5, py: 1 }}
          >
            <Settings size={16} color="#818cf8" /> Settings
          </MenuItem>
          <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 0.5 }} />
          <MenuItem
            onClick={() => {
              onLogout();
              setUserMenuAnchor(null);
            }}
            sx={{ gap: 1.5, py: 1, color: '#f87171' }}
          >
            <LogOut size={16} /> Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};
