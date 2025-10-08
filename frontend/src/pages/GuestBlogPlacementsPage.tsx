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
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  Edit as EditIcon,
  Search as SearchIcon,
  Delete as DeleteIcon,
  Link as LinkIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guestBlogPlacementService, GuestBlogPlacement } from '../services/guestBlogPlacementService';
import { clientService } from '../services/clientService';
import { projectService } from '../services/projectService';
import { useAuth } from '../contexts/AuthContext';
import HtmlContent from '../components/common/HtmlContent';
import { isHtmlEmpty } from '../utils/htmlSanitizer';

const GuestBlogPlacementsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPlacement, setSelectedPlacement] = useState<GuestBlogPlacement | null>(null);
  const [editData, setEditData] = useState({ status: '', liveUrl: '', notes: '' });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // Get user role from auth context
  const { user } = useAuth();
  
  // Temporary fallback for Super Admin detection
  const isSuperAdminFallback = user?.role === 'SUPER_ADMIN' || user?.email === 'superadmin@example.com';

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

  // Fetch placements
  const {
    data: placementsData,
    isLoading,
  } = useQuery({
    queryKey: ['guestBlogPlacements', page, rowsPerPage, search, statusFilter, clientFilter, projectFilter],
    queryFn: () => guestBlogPlacementService.getPlacements({
      page: page + 1,
      limit: rowsPerPage,
      status: statusFilter || undefined,
      clientId: clientFilter || undefined,
      projectId: projectFilter || undefined,
      search: search || undefined,
    }),
    enabled: isSuperAdminFallback,
  });

  const placements = placementsData?.data || [];
  const totalCount = placementsData?.pagination?.total || 0;

  // Update placement mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      guestBlogPlacementService.updatePlacement(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestBlogPlacements'] });
      setEditDialogOpen(false);
      setSelectedPlacement(null);
      setSnackbar({
        open: true,
        message: 'Placement updated successfully!',
        severity: 'success',
      });
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: 'Failed to update placement.',
        severity: 'error',
      });
    },
  });

  // Delete placement mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => guestBlogPlacementService.deletePlacement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestBlogPlacements'] });
      setSnackbar({
        open: true,
        message: 'Placement deleted successfully!',
        severity: 'success',
      });
    },
    onError: () => {
      setSnackbar({
        open: true,
        message: 'Failed to delete placement.',
        severity: 'error',
      });
    },
  });

  const handleEdit = (placement: GuestBlogPlacement) => {
    setSelectedPlacement(placement);
    setEditData({
      status: placement.status,
      liveUrl: placement.liveUrl || '',
      notes: placement.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedPlacement) return;
    
    updateMutation.mutate({
      id: selectedPlacement.id,
      data: editData,
    });
  };

  const handleDelete = (placement: GuestBlogPlacement) => {
    if (window.confirm(`Are you sure you want to delete placement ${placement.placementId}?`)) {
      deleteMutation.mutate(placement.id);
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
          Access denied. Only Super Admins can view placements.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Guest Blog Placements
      </Typography>

      {/* Status Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={statusFilter}
          onChange={(e, newValue) => setStatusFilter(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              minWidth: 120,
            },
          }}
        >
          <Tab
            label="All"
            value=""
            sx={{ color: '#6B7280' }}
          />
          {guestBlogPlacementService.getAvailableStatuses().map((status) => (
            <Tab
              key={status.value}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: status.color,
                    }}
                  />
                  {status.label}
                </Box>
              }
              value={status.value}
              sx={{ color: status.color }}
            />
          ))}
        </Tabs>
      </Paper>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search placements..."
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
          <Grid item xs={12} md={3}>
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
          <Grid item xs={12} md={3}>
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
        </Grid>
      </Paper>

      {/* Placements Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Placement ID</TableCell>
              <TableCell>Order ID</TableCell>
              <TableCell>Site URL</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Project</TableCell>
              <TableCell>Publisher Name</TableCell>
              <TableCell>Publisher Email</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Content</TableCell>
              <TableCell>Live URL</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : placements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  No placements found
                </TableCell>
              </TableRow>
            ) : (
              placements.map((placement) => (
                <TableRow key={placement.id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {placement.placementId}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {placement.originalOrderNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {placement.guestBlogSite.site_url}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {placement.client.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {placement.project.projectName}
                    </Typography>
                    {placement.project.companyName && (
                      <Typography variant="caption" color="text.secondary">
                        {placement.project.companyName}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {placement.guestBlogSite.publisher.publisherName}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {placement.guestBlogSite.publisher.email || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium" color="primary">
                      {guestBlogPlacementService.formatPrice(placement.price)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 2,
                        backgroundColor: `${guestBlogPlacementService.getStatusHexColor(placement.status)}15`,
                        border: `1px solid ${guestBlogPlacementService.getStatusHexColor(placement.status)}30`,
                      }}
                    >
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: guestBlogPlacementService.getStatusHexColor(placement.status),
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: guestBlogPlacementService.getStatusHexColor(placement.status),
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        {guestBlogPlacementService.getStatusLabel(placement.status)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      {!isHtmlEmpty(placement.contentText) && (
                        <Tooltip title="View content requirements">
                          <Chip 
                            label="Content" 
                            size="small" 
                            color="info" 
                            onClick={() => {
                              setSelectedPlacement(placement);
                              setEditData({
                                status: placement.status,
                                liveUrl: placement.liveUrl || '',
                                notes: placement.notes || '',
                              });
                              setEditDialogOpen(true);
                            }}
                            sx={{ cursor: 'pointer' }}
                          />
                        </Tooltip>
                      )}
                      {placement.contentDocUrl ? (
                        <Tooltip title="Download uploaded file">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => guestBlogPlacementService.downloadFile(placement.contentDocUrl || '', `placement-${placement.placementId}-content`)}
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
                    {placement.liveUrl ? (
                      <Button
                        size="small"
                        startIcon={<LinkIcon />}
                        href={placement.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </Button>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Not available
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {new Date(placement.createdAt).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" gap={1}>
                      <Tooltip title="Edit Placement">
                        <IconButton size="small" onClick={() => handleEdit(placement)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Placement">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDelete(placement)}
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

      {/* Edit Placement Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Placement</DialogTitle>
        <DialogContent>
          {selectedPlacement && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Placement: {selectedPlacement.placementId}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Site: {selectedPlacement.guestBlogSite.site_url}
              </Typography>

              {/* Content Requirements Section */}
              {!isHtmlEmpty(selectedPlacement.contentText) && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Content Requirements
                  </Typography>
                  <HtmlContent 
                    content={selectedPlacement.contentText} 
                    maxHeight={300}
                    sx={{ fontSize: '0.875rem' }}
                  />
                </Box>
              )}

              {/* Content Document Section */}
              <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Content Document
                </Typography>
                {selectedPlacement.contentDocUrl ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      File: {guestBlogPlacementService.getFileName(selectedPlacement.contentDocUrl)}
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={() => guestBlogPlacementService.downloadFile(selectedPlacement.contentDocUrl || '', `placement-${selectedPlacement.placementId}-content`)}
                    >
                      Download
                    </Button>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    No document uploaded
                  </Typography>
                )}
              </Box>

              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={editData.status}
                  label="Status"
                  onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}
                >
                  {guestBlogPlacementService.getAvailableStatuses().map((status) => (
                    <MenuItem key={status.value} value={status.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: status.color,
                          }}
                        />
                        {status.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="Live URL"
                value={editData.liveUrl}
                onChange={(e) => setEditData(prev => ({ ...prev, liveUrl: e.target.value }))}
                sx={{ mb: 3 }}
                placeholder="https://example.com/article"
              />

              <TextField
                fullWidth
                multiline
                rows={4}
                label="Notes"
                value={editData.notes}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this placement..."
              />
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
            {updateMutation.isPending ? 'Updating...' : 'Update Placement'}
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

export default GuestBlogPlacementsPage;
