import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  TablePagination,
  IconButton,
  Tooltip,
  Checkbox,
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Delete as DeleteIcon,
  ShoppingCart as PlaceOrderIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guestBlogOrderService, GuestBlogOrder } from '../services/guestBlogOrderService';
import { clientService } from '../services/clientService';
import { projectService } from '../services/projectService';
import { useAuth } from '../contexts/AuthContext';
import RichTextEditor from '../components/common/RichTextEditor';
import HtmlContent from '../components/common/HtmlContent';
import { isHtmlEmpty } from '../utils/htmlSanitizer';

const OrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<GuestBlogOrder | null>(null);
  const [editData, setEditData] = useState({ contentText: '', status: '', contentDocUrl: '' });
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Get user role from auth context
  const { user, isSuperAdmin } = useAuth();
  
  // Debug logging
  console.log('OrdersPage - User:', user);
  console.log('OrdersPage - isSuperAdmin:', isSuperAdmin);
  
  // Temporary fallback for Super Admin detection
  const isSuperAdminFallback = user?.role === 'SUPER_ADMIN' || user?.email === 'superadmin@example.com';
  console.log('OrdersPage - isSuperAdminFallback:', isSuperAdminFallback);

  // Fetch clients for dropdown
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients({ limit: 1000 }),
    enabled: isSuperAdminFallback,
  });

  const clients = clientsData?.data || [];

  // Fetch projects for dropdown (filtered by client if selected)
  const { data: projectsData } = useQuery({
    queryKey: ['projects', clientFilter],
    queryFn: () => projectService.getProjects({ 
      limit: 1000,
      clientId: clientFilter || undefined 
    }),
    enabled: isSuperAdminFallback,
  });

  const projects = projectsData?.data || [];

  // Fetch orders
  const {
    data: ordersData,
    isLoading,
  } = useQuery({
    queryKey: ['guestBlogOrders', page, rowsPerPage, search, statusFilter, clientFilter, projectFilter],
    queryFn: () => guestBlogOrderService.getOrders({
      page: page + 1,
      limit: rowsPerPage,
      status: statusFilter || undefined,
      clientId: clientFilter || undefined,
      projectId: projectFilter || undefined,
      search: search || undefined,
    }),
    enabled: isSuperAdminFallback, // Only fetch if user is Super Admin
  });

  const orders = ordersData?.data || [];
  const totalCount = ordersData?.pagination?.total || 0;

  // Update order mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      guestBlogOrderService.updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestBlogOrders'] });
      setEditDialogOpen(false);
      setSelectedOrder(null);
      setSnackbar({
        open: true,
        message: 'Order updated successfully!',
        severity: 'success',
      });
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: 'Failed to update order.',
        severity: 'error',
      });
    },
  });

  // Delete order mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => guestBlogOrderService.deleteOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestBlogOrders'] });
      setSnackbar({
        open: true,
        message: 'Order deleted successfully!',
        severity: 'success',
      });
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: 'Failed to delete order.',
        severity: 'error',
      });
    },
  });

  // Place bulk orders mutation
  const placeBulkMutation = useMutation({
    mutationFn: (orderIds: string[]) => guestBlogOrderService.placeBulkOrders(orderIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['guestBlogOrders'] });
      queryClient.invalidateQueries({ queryKey: ['guestBlogPlacements'] });
      setSelectedOrders([]);
      setSnackbar({
        open: true,
        message: `Successfully placed ${data.data.length} orders!`,
        severity: 'success',
      });
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: 'Failed to place orders.',
        severity: 'error',
      });
    },
  });

  const handleEdit = (order: GuestBlogOrder) => {
    setSelectedOrder(order);
    setEditData({
      contentText: order.contentText || '',
      status: order.status,
      contentDocUrl: order.contentDocUrl || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedOrder) return;
    
    updateMutation.mutate({
      id: selectedOrder.id,
      data: editData,
    });
  };

  const handleDelete = (order: GuestBlogOrder) => {
    if (window.confirm(`Are you sure you want to delete order ${order.orderId}?`)) {
      deleteMutation.mutate(order.id);
    }
  };

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev =>
      prev.includes(orderId)
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  const handlePlaceBulkOrders = () => {
    if (selectedOrders.length === 0) {
      setSnackbar({
        open: true,
        message: 'Please select orders to place.',
        severity: 'error',
      });
      return;
    }

    if (window.confirm(`Are you sure you want to place ${selectedOrders.length} orders?`)) {
      placeBulkMutation.mutate(selectedOrders);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedOrder) return;

    setUploadingFile(true);
    try {
      const response = await guestBlogOrderService.uploadContentDocument(file);
      setEditData(prev => ({ ...prev, contentDocUrl: response.data.url }));
      setSnackbar({
        open: true,
        message: 'File uploaded successfully!',
        severity: 'success',
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to upload file.',
        severity: 'error',
      });
    } finally {
      setUploadingFile(false);
    }
  };

  const handlePageChange = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleClientFilterChange = (clientId: string) => {
    setClientFilter(clientId);
    setProjectFilter(''); // Clear project filter when client changes
  };

  if (!isSuperAdminFallback) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Access denied. Only Super Admins can view orders.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Guest Blog Orders
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={2.25}>
            <FormControl fullWidth>
              <InputLabel>Client</InputLabel>
              <Select
                value={clientFilter}
                label="Client"
                onChange={(e) => handleClientFilterChange(e.target.value)}
              >
                <MenuItem value="">All Clients</MenuItem>
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2.25}>
            <FormControl fullWidth>
              <InputLabel>Project</InputLabel>
              <Select
                value={projectFilter}
                label="Project"
                onChange={(e) => setProjectFilter(e.target.value)}
                disabled={!clientFilter}
              >
                <MenuItem value="">All Projects</MenuItem>
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.projectName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2.25}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                <MenuItem value="COMPLETED">Completed</MenuItem>
                <MenuItem value="CANCELLED">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Bulk Actions */}
      {selectedOrders.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" color="primary">
              {selectedOrders.length} order{selectedOrders.length !== 1 ? 's' : ''} selected
            </Typography>
            <Button
              variant="contained"
              startIcon={<PlaceOrderIcon />}
              onClick={handlePlaceBulkOrders}
              disabled={placeBulkMutation.isPending}
            >
              {placeBulkMutation.isPending ? 'Placing...' : `Place Orders (${selectedOrders.length})`}
            </Button>
          </Box>
        </Paper>
      )}

      {/* Orders Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedOrders.length > 0 && selectedOrders.length < orders.length}
                  checked={orders.length > 0 && selectedOrders.length === orders.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Order ID</TableCell>
              <TableCell>Site URL</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Publisher Name</TableCell>
              <TableCell>Publisher Email</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Content</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} align="center">
                  No orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {order.orderId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.guestBlogSite.site_url}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.client.name}
                    </Typography>
                    {order.client.percentage && (
                      <Typography variant="caption" color="text.secondary">
                        ({order.client.percentage}% markup)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.project.projectName}
                    </Typography>
                    {order.project.companyName && (
                      <Typography variant="caption" color="text.secondary">
                        {order.project.companyName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.guestBlogSite.publisher.publisherName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.guestBlogSite.publisher.email || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium" color="primary">
                      {guestBlogOrderService.formatPrice(order.price)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={guestBlogOrderService.getStatusLabel(order.status)}
                      color={guestBlogOrderService.getStatusColor(order.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {!isHtmlEmpty(order.contentText) && (
                        <Tooltip title="View content requirements">
                          <Chip 
                            label="Content" 
                            size="small" 
                            color="info" 
                            onClick={() => {
                              setSelectedOrder(order);
                              setEditData({
                                contentText: order.contentText || '',
                                status: order.status,
                                contentDocUrl: order.contentDocUrl || '',
                              });
                              setEditDialogOpen(true);
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        </Tooltip>
                      )}
                      {order.contentDocUrl ? (
                        <Tooltip title="Download uploaded file">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => guestBlogOrderService.downloadFile(order.contentDocUrl || '', `order-${order.orderId}-content`)}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No document
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1}>
                      <Tooltip title="View Details">
                        <IconButton size="small" onClick={() => console.log('View', order)}>
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Order">
                        <IconButton size="small" onClick={() => handleEdit(order)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Order">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDelete(order)}
                          color="error"
                        >
                          <DeleteIcon />
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

      {/* Pagination */}
      {totalCount > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
        />
      )}

      {/* Edit Order Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Order</DialogTitle>
        <DialogContent>
          {selectedOrder && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Order: {selectedOrder.orderId}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Site: {selectedOrder.guestBlogSite.site_url}
              </Typography>

              {/* Content Requirements - Rich Text Editor */}
              <Box sx={{ mb: 3 }}>
                <RichTextEditor
                  value={editData.contentText}
                  onChange={(value) => setEditData(prev => ({ ...prev, contentText: value }))}
                  label="Content Requirements"
                  placeholder="Enter content requirements, guidelines, keywords, or any specific instructions..."
                  disabled={uploadingFile}
                />
              </Box>

              {/* Content Preview */}
              {!isHtmlEmpty(editData.contentText) && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Content Preview
                  </Typography>
                  <HtmlContent 
                    content={editData.contentText} 
                    maxHeight={200}
                    sx={{ fontSize: '0.875rem' }}
                  />
                </Box>
              )}

              {/* File Upload Section */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Content Document
                </Typography>
                {editData.contentDocUrl ? (
                  <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Current file: {guestBlogOrderService.getFileName(editData.contentDocUrl)}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => guestBlogOrderService.downloadFile(editData.contentDocUrl || '', `order-${selectedOrder?.orderId}-content`)}
                    >
                      Download
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No document uploaded
                    </Typography>
                  </Box>
                )}
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={<AttachFileIcon />}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? 'Uploading...' : 'Upload New File'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.doc,.docx,.txt,.rtf"
                    onChange={handleFileUpload}
                  />
                </Button>
              </Box>

              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editData.status}
                  label="Status"
                  onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                  <MenuItem value="CANCELLED">Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleUpdate} 
            variant="contained" 
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Updating...' : 'Update Order'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default OrdersPage;
