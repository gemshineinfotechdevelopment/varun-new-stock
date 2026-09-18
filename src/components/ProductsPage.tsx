import React, { useEffect, useState, useRef } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  InputAdornment,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  FileUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ProductsApi, CategoriesApi } from '../services/api';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [syncingBilling, setSyncingBilling] = useState(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleSyncBilling = async () => {
    setSyncingBilling(true);
    setSyncToast(null);
    try {
      const res = await ProductsApi.syncFromBilling();
      setSyncToast(res.message || `Synced items from Billing database!`);
      fetchData();
      setTimeout(() => setSyncToast(null), 5000);
    } catch (err: any) {
      alert('Failed to sync from billing: ' + (err.message || 'Error'));
    } finally {
      setSyncingBilling(false);
    }
  };

  // Single Product Add/Edit Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Single Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('General');
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState('PCS');
  const [minGodownStock, setMinGodownStock] = useState('10');
  const [minShopStock, setMinShopStock] = useState('5');
  const [godownOpeningStock, setGodownOpeningStock] = useState('0');
  const [shopOpeningStock, setShopOpeningStock] = useState('0');
  const [description, setDescription] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Bulk Upload State
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkParsedData, setBulkParsedData] = useState<any[]>([]);
  const [bulkFileName, setBulkFileName] = useState('');
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [prodRes, catRes] = await Promise.all([
        ProductsApi.getAll({ search, category: selectedCategory }),
        CategoriesApi.getAll(),
      ]);

      if (prodRes.success) setProducts(prodRes.data);
      if (catRes.success) setCategories(catRes.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handleOpenAddDialog = () => {
    setIsEditing(false);
    setSelectedProductId(null);
    setName('');
    setSku('');
    setCategory(categories[0]?.name || 'General');
    setBrand('');
    setUnit('PCS');
    setMinGodownStock('10');
    setMinShopStock('5');
    setGodownOpeningStock('0');
    setShopOpeningStock('0');
    setDescription('');
    setFormError(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (prod: any) => {
    setIsEditing(true);
    setSelectedProductId(prod._id);
    setName(prod.name);
    setSku(prod.sku);
    setCategory(prod.category);
    setBrand(prod.brand || '');
    setUnit(prod.unit || 'PCS');
    setMinGodownStock(String(prod.minGodownStock ?? 10));
    setMinShopStock(String(prod.minShopStock ?? 5));
    setDescription(prod.description || '');
    setFormError(null);
    setDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!name.trim() || !sku.trim()) {
      setFormError('Product Name and SKU are mandatory');
      return;
    }

    setFormSubmitting(true);
    setFormError(null);

    try {
      if (isEditing && selectedProductId) {
        await ProductsApi.update(selectedProductId, {
          name: name.trim(),
          category,
          brand: brand.trim(),
          unit,
          minGodownStock: Number(minGodownStock),
          minShopStock: Number(minShopStock),
          description: description.trim(),
        });
      } else {
        await ProductsApi.create({
          name: name.trim(),
          sku: sku.trim().toUpperCase(),
          category,
          brand: brand.trim(),
          unit,
          minGodownStock: Number(minGodownStock),
          minShopStock: Number(minShopStock),
          godownOpeningStock: Number(godownOpeningStock),
          shopOpeningStock: Number(shopOpeningStock),
          description: description.trim(),
        });
      }

      setDialogOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save product');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete product '${name}'?`)) return;

    try {
      await ProductsApi.delete(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Cannot delete product');
    }
  };

  // --- Bulk Excel Template & Upload Handlers ---

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'SL.NO': 1,
        'Item Name': '2" Lakshmi / Kuruvi',
        'Category': 'SINGLE CRACKERS',
        'Unit': '1 Pkt',
        'MRP': 40,
        'Discount %': 90,
        'Rate': 4,
        'Godown Stock': 1000,
        'Shop Stock': 0,
      },
      {
        'SL.NO': 2,
        'Item Name': '3½" Lakshmi',
        'Category': 'SINGLE CRACKERS',
        'Unit': '1 Pkt',
        'MRP': 160,
        'Discount %': 90,
        'Rate': 16,
        'Godown Stock': 1000,
        'Shop Stock': 0,
      },
      {
        'SL.NO': 3,
        'Item Name': '4" Lakshmi',
        'Category': 'SINGLE CRACKERS',
        'Unit': '1 Pkt',
        'MRP': 200,
        'Discount %': 90,
        'Rate': 20,
        'Godown Stock': 1000,
        'Shop Stock': 0,
      },
      {
        'SL.NO': 4,
        'Item Name': 'Ground Chakkar Special (10 Pcs)',
        'Category': 'GROUND WHEELS',
        'Unit': '1 Box',
        'MRP': 150,
        'Discount %': 80,
        'Rate': 30,
        'Godown Stock': 500,
        'Shop Stock': 0,
      },
      {
        'SL.NO': 5,
        'Item Name': '10cm Electric Sparklers (10 Pcs)',
        'Category': 'SPARKLERS',
        'Unit': '1 Box',
        'MRP': 60,
        'Discount %': 85,
        'Rate': 9,
        'Godown Stock': 800,
        'Shop Stock': 0,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products_Template');
    XLSX.writeFile(wb, 'Varun_Trade_Products_Template.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setBulkError(null);
    setBulkSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rawJson.length === 0) {
          setBulkError('Uploaded Excel file is empty.');
          setBulkParsedData([]);
          return;
        }

        // Map and validate rows
        const normalized = rawJson.map((row, idx) => {
          const itemName = String(
            row['Item Name'] || row['item name'] || row['ItemName'] || row['Product Name'] || row['name'] || ''
          ).trim();
          const slNo = Number(row['SL.NO'] || row['SL NO'] || row['SL. No'] || row['slNo'] || idx + 1) || (idx + 1);
          const categoryName = String(row['Category'] || row['category'] || 'General').trim() || 'General';
          const unitName = String(row['Unit'] || row['unit'] || 'PCS').trim() || 'PCS';
          const mrp = Number(row['MRP'] || row['mrp'] || row['Price'] || 0) || 0;
          const discount = Number(row['Discount %'] || row['Discount'] || row['discount'] || 0) || 0;
          let rate = Number(row['Rate'] || row['rate'] || 0) || 0;
          if (!rate && mrp > 0) {
            rate = Math.round((mrp - (mrp * discount) / 100) * 100) / 100;
          }
          const godownStock = Number(
            row['Godown Stock'] || row['godownStock'] || row['Godown stock'] || row['Stock'] || row['stock'] || row['Qty'] || 0
          ) || 0;
          const shopStock = Number(row['Shop Stock'] || row['shopStock'] || row['Shop stock'] || 0) || 0;

          return {
            'SL.NO': slNo,
            'Item Name': itemName,
            'Category': categoryName,
            'Unit': unitName,
            'MRP': mrp,
            'Discount %': discount,
            'Rate': rate,
            'Godown Stock': godownStock,
            'Shop Stock': shopStock,
            _isValid: Boolean(itemName),
          };
        });

        setBulkParsedData(normalized);
      } catch (err: any) {
        setBulkError('Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleBulkSubmit = async () => {
    if (bulkParsedData.length === 0) {
      setBulkError('No valid rows found to upload.');
      return;
    }

    setBulkUploading(true);
    setBulkError(null);
    setBulkSuccessMsg(null);

    try {
      const validRows = bulkParsedData.filter((r) => r._isValid);
      const res = await ProductsApi.bulkUpload(validRows);

      if (res.success) {
        setBulkSuccessMsg(res.message);
        fetchData();
        setTimeout(() => {
          setBulkDialogOpen(false);
          setBulkParsedData([]);
          setBulkFileName('');
          setBulkSuccessMsg(null);
        }, 1500);
      }
    } catch (err: any) {
      setBulkError(err.message || 'Failed to upload products in bulk');
    } finally {
      setBulkUploading(false);
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
            Products Master &amp; Catalog
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Manage product catalog, MRP, discounts, rates, and initial Godown Stock in PCS
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleSyncBilling}
            disabled={syncingBilling}
            startIcon={syncingBilling ? <CircularProgress size={16} color="inherit" /> : <RefreshCw size={16} />}
            sx={{ backgroundColor: '#2563eb', '&:hover': { backgroundColor: '#1d4ed8' }, fontWeight: 700, fontSize: '0.8rem' }}
          >
            {syncingBilling ? 'Syncing...' : 'Sync from Billing'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={handleDownloadTemplate}
            startIcon={<Download size={16} />}
            sx={{ borderColor: '#cbd5e1', color: '#334155', fontWeight: 600, fontSize: '0.8rem' }}
          >
            Download Template
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setBulkDialogOpen(true);
              setBulkParsedData([]);
              setBulkFileName('');
              setBulkError(null);
              setBulkSuccessMsg(null);
            }}
            startIcon={<Upload size={16} />}
            sx={{ backgroundColor: '#059669', '&:hover': { backgroundColor: '#047857' }, fontWeight: 700, fontSize: '0.8rem' }}
          >
            Bulk Upload Excel
          </Button>

          <Button
            variant="contained"
            size="small"
            onClick={handleOpenAddDialog}
            startIcon={<Plus size={16} />}
            sx={{ backgroundColor: '#0f172a', '&:hover': { backgroundColor: '#1e293b' }, fontWeight: 700, fontSize: '0.8rem' }}
          >
            Add Single Product
          </Button>
        </Box>
      </Box>

      {syncToast && (
        <Alert severity="success" sx={{ mb: 2.5 }} onClose={() => setSyncToast(null)}>
          {syncToast}
        </Alert>
      )}

      {/* Filter Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2 }}>
          <Grid container spacing={2} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, sm: 6, md: 5 }}>
              <form onSubmit={handleSearchSubmit}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search product name, SKU, brand..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={16} color="#94a3b8" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </form>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  label="Category"
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <MenuItem value="ALL">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat._id} value={cat.name}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Button size="small" onClick={fetchData} startIcon={<RefreshCw size={14} />}>
                Refresh List
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <TableContainer component={Paper} elevation={0}>
          <Table sx={{ minWidth: 850 }}>
            <TableHead>
              <TableRow>
                <TableCell>Product Details</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="center">Unit</TableCell>
                <TableCell align="right">MRP</TableCell>
                <TableCell align="right">Discount %</TableCell>
                <TableCell align="right">Godown Stock</TableCell>
                <TableCell align="right">Shop Stock</TableCell>
                <TableCell align="right">Total Stock</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6 }}>
                    Loading products from MongoDB...
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 6, color: '#94a3b8' }}>
                    No products found in MongoDB. Click "Bulk Upload Excel" to import your stock items.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((prod) => (
                  <TableRow key={prod._id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                        {prod.name}
                      </Typography>
                      {prod.brand && (
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          Brand: {prod.brand}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#4f46e5' }}>
                      {prod.sku}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={prod.category || 'General'}
                        sx={{ backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip size="small" label={prod.unit || 'PCS'} sx={{ fontWeight: 600 }} />
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {prod.mrp ? `₹${prod.mrp}` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ color: '#64748b' }}>
                      {prod.discount ? `${prod.discount}%` : '—'}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#4f46e5' }}>
                      {prod.godownStock ?? 0} PCS
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>
                      {prod.shopStock ?? 0} PCS
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      {prod.totalStock ?? 0} PCS
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'inline-flex', gap: 1 }}>
                        <Tooltip title="Edit Product">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditDialog(prod)}
                            sx={{ color: '#4f46e5', backgroundColor: '#eef2ff' }}
                          >
                            <Edit2 size={15} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Product">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteProduct(prod._id, prod.name)}
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

      {/* Bulk Excel Upload Dialog */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <FileSpreadsheet size={24} color="#059669" />
          Bulk Upload Products (Excel / CSV)
        </DialogTitle>

        <DialogContent dividers>
          {bulkError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '8px' }}>
              {bulkError}
            </Alert>
          )}

          {bulkSuccessMsg && (
            <Alert
              severity="success"
              icon={<CheckCircle2 size={18} />}
              sx={{ mb: 2, borderRadius: '8px' }}
            >
              {bulkSuccessMsg}
            </Alert>
          )}

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ color: '#475569', mb: 1.5 }}>
              Upload an Excel sheet matching the exact column format:
            </Typography>
            <Box
              sx={{
                p: 1.5,
                backgroundColor: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '0.78rem',
                color: '#334155',
                mb: 2,
              }}
            >
              <strong>Columns:</strong> SL.NO | Item Name | Category | Unit | MRP | Discount % | Rate | Godown Stock | Shop Stock
            </Box>

            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Button
                variant="outlined"
                startIcon={<FileUp size={18} />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ borderColor: '#4f46e5', color: '#4f46e5', fontWeight: 700 }}
              >
                Choose Excel File
              </Button>
              <Typography variant="body2" sx={{ color: bulkFileName ? '#0f172a' : '#94a3b8', fontWeight: 600 }}>
                {bulkFileName || 'No file chosen yet'}
              </Typography>
            </Box>
          </Box>

          {/* Parsed Preview Table */}
          {bulkParsedData.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                  Parsed Rows Preview ({bulkParsedData.length} items detected):
                </Typography>
                <Chip
                  size="small"
                  label={`${bulkParsedData.filter((r) => r._isValid).length} Valid Rows`}
                  color="success"
                  sx={{ fontWeight: 700, fontSize: '0.75rem' }}
                />
              </Box>

              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', maxHeight: 280 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>SL.NO</TableCell>
                      <TableCell>Item Name</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">MRP</TableCell>
                      <TableCell align="right">Disc %</TableCell>
                      <TableCell align="right">Rate</TableCell>
                      <TableCell align="right">Godown Stock</TableCell>
                      <TableCell align="right">Shop Stock</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {bulkParsedData.slice(0, 15).map((row, idx) => (
                      <TableRow key={idx} hover sx={{ backgroundColor: !row._isValid ? '#fff1f2' : 'inherit' }}>
                        <TableCell>{row['SL.NO']}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>{row['Item Name'] || '(Missing Name)'}</TableCell>
                        <TableCell>{row['Category']}</TableCell>
                        <TableCell>{row['Unit']}</TableCell>
                        <TableCell align="right">{row['MRP']}</TableCell>
                        <TableCell align="right">{row['Discount %']}%</TableCell>
                        <TableCell align="right">{row['Rate']}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#4f46e5' }}>
                          {row['Godown Stock']} PCS
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>
                          {row['Shop Stock']} PCS
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {bulkParsedData.length > 15 && (
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                  Showing first 15 of {bulkParsedData.length} items. All items will be imported.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setBulkDialogOpen(false)} disabled={bulkUploading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleBulkSubmit}
            disabled={bulkUploading || bulkParsedData.length === 0}
            startIcon={bulkUploading ? <CircularProgress size={16} color="inherit" /> : <Upload size={16} />}
            sx={{ backgroundColor: '#059669', '&:hover': { backgroundColor: '#047857' }, fontWeight: 700 }}
          >
            {bulkUploading ? 'Importing Products...' : `Import ${bulkParsedData.length} Products`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Single Add / Edit Product Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isEditing ? 'Edit Product Master' : 'Add New Product with Opening Stock'}
        </DialogTitle>

        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '8px' }}>
              {formError}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                label="Product Name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. 2&quot; Lakshmi / Kuruvi"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="SKU (Unique Code) *"
                disabled={isEditing}
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. LK-2IN"
                helperText={isEditing ? 'SKU cannot be altered once created' : 'Unique identifier for billing & stock'}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={category}
                  label="Category"
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat._id} value={cat.name}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Brand / Manufacturer"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Standard / Varun"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Unit of Measure"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Default: 1 Pkt or PCS"
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Min Godown Stock Alert (PCS)"
                value={minGodownStock}
                onChange={(e) => setMinGodownStock(e.target.value)}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="Min Shop Stock Alert (PCS)"
                value={minShopStock}
                onChange={(e) => setMinShopStock(e.target.value)}
              />
            </Grid>

            {!isEditing && (
              <>
                <Grid size={{ xs: 12 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#4f46e5', mt: 1 }}>
                    Initial Opening Stock Setup
                  </Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Godown Opening Stock (PCS)"
                    value={godownOpeningStock}
                    onChange={(e) => setGodownOpeningStock(e.target.value)}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="Shop Opening Stock (PCS)"
                    value={shopOpeningStock}
                    onChange={(e) => setShopOpeningStock(e.target.value)}
                  />
                </Grid>
              </>
            )}

            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="Description / Notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={formSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProduct}
            disabled={formSubmitting}
            sx={{ backgroundColor: '#0f172a', fontWeight: 700 }}
          >
            {formSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
