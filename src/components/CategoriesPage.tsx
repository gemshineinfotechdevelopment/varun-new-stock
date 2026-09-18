import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
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
  Tooltip,
} from '@mui/material';
import { Plus, Edit2, Trash2, Layers } from 'lucide-react';
import { CategoriesApi } from '../services/api';

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await CategoriesApi.getAll();
      if (res.success) setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedCategoryId(null);
    setName('');
    setDescription('');
    setError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cat: any) => {
    setIsEditing(true);
    setSelectedCategoryId(cat._id);
    setName(cat.name);
    setDescription(cat.description || '');
    setError(null);
    setDialogOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!name.trim()) {
      setError('Category Name is required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && selectedCategoryId) {
        await CategoriesApi.update(selectedCategoryId, { name: name.trim(), description: description.trim() });
      } else {
        await CategoriesApi.create({ name: name.trim(), description: description.trim() });
      }
      setDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Delete category '${name}'?`)) return;
    try {
      await CategoriesApi.delete(id);
      fetchCategories();
    } catch (err: any) {
      alert(err.message || 'Cannot delete category');
    }
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
            Product Categories
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Manage category classifications and department taxonomies
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="medium"
          onClick={handleOpenAdd}
          startIcon={<Plus size={18} />}
          sx={{ backgroundColor: '#0f172a', '&:hover': { backgroundColor: '#1e293b' } }}
        >
          Add Category
        </Button>
      </Box>

      {/* Table */}
      <Card>
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Category Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="center">Products Count</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    Loading categories...
                  </TableCell>
                </TableRow>
              ) : categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    No categories registered.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((cat) => (
                  <TableRow key={cat._id} hover>
                    <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Layers size={18} color="#4f46e5" />
                        {cat.name}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#64748b' }}>{cat.description || '—'}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        label={`${cat.productCount || 0} Products`}
                        sx={{ backgroundColor: '#f1f5f9', fontWeight: 700, color: '#334155' }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'inline-flex', gap: 1 }}>
                        <Tooltip title="Edit Category">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(cat)}
                            sx={{ color: '#4f46e5', backgroundColor: '#eef2ff' }}
                          >
                            <Edit2 size={15} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Category">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteCategory(cat._id, cat.name)}
                            sx={{ backgroundColor: '#fee2e2' }}
                          >
                            <Trash2 size={15} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isEditing ? 'Edit Category' : 'Add New Category'}
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            size="small"
            label="Category Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Hardware & Fittings"
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveCategory}
            disabled={submitting}
            sx={{ backgroundColor: '#0f172a', fontWeight: 700 }}
          >
            {submitting ? 'Saving...' : 'Save Category'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
