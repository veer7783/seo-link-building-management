import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { Add, Search, Edit, Delete, Visibility } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService, ClientFilters } from '../services/clientService';
import { Client } from '../types';
import DataTable, { Column, Action } from '../components/common/DataTable';
import StatusChip from '../components/common/StatusChip';
import ClientForm from '../components/clients/ClientForm';

const ClientsPage: React.FC = () => {
  const [filters, setFilters] = useState<ClientFilters>({
    page: 0,
    limit: 25,
    search: '',
    status: undefined,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | undefined>();

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', filters],
    queryFn: () => clientService.getClients(filters),
  });

  const createMutation = useMutation({
    mutationFn: clientService.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      clientService.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setFormOpen(false);
      setSelectedClient(undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: clientService.deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDeleteDialogOpen(false);
      setClientToDelete(undefined);
    },
    onError: (error: any) => {
      console.error('Delete client error:', error);
      // Keep dialog open to show error message
    },
  });

  const columns: Column[] = [
    { id: 'name', label: 'Name', minWidth: 150 },
    { id: 'email', label: 'Email', minWidth: 200 },
    { id: 'phone', label: 'Phone', minWidth: 160 },
    { id: 'company', label: 'Company', minWidth: 150 },
    { id: 'country', label: 'Country', minWidth: 120 },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      format: (value: string) => <StatusChip status={value} /> as any,
    },
    {
      id: 'createdAt',
      label: 'Created',
      minWidth: 120,
      format: (value: string) =>
        new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
  ];

  const actions: Action[] = [
    {
      icon: <Visibility />,
      tooltip: 'View Details',
      onClick: (client: Client) => {
        // Navigate to client details page
        console.log('View client:', client);
      },
    },
    {
      icon: <Edit />,
      tooltip: 'Edit Client',
      onClick: (client: Client) => {
        setSelectedClient(client);
        setFormOpen(true);
      },
    },
    {
      icon: <Delete />,
      tooltip: 'Delete Client',
      onClick: (client: Client) => {
        setClientToDelete(client);
        setDeleteDialogOpen(true);
      },
    },
  ];

  const handleFilterChange = (field: keyof ClientFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: field !== 'page' ? 0 : value, // Reset page when other filters change
    }));
  };

  const handleFormSubmit = async (formData: any) => {
    if (selectedClient) {
      await updateMutation.mutateAsync({
        id: selectedClient.id,
        data: formData,
      });
    } else {
      await createMutation.mutateAsync(formData);
    }
  };

  const handleDelete = async () => {
    if (clientToDelete) {
      try {
        await deleteMutation.mutateAsync(clientToDelete.id);
      } catch (error) {
        // Error is handled by the mutation's onError callback
        console.error('Delete failed:', error);
      }
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setSelectedClient(undefined);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">Clients</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setFormOpen(true)}
        >
          Add Client
        </Button>
      </Box>

      {/* Filters */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            placeholder="Search clients..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || ''}
              label="Status"
              onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="ACTIVE">Active</MenuItem>
              <MenuItem value="INACTIVE">Inactive</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load clients. Please try again.
        </Alert>
      )}

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        page={filters.page || 0}
        rowsPerPage={filters.limit || 25}
        totalCount={data?.pagination?.total || 0}
        onPageChange={(page) => handleFilterChange('page', page)}
        onRowsPerPageChange={(limit) => handleFilterChange('limit', limit)}
        actions={actions}
        emptyMessage="No clients found"
      />

      {/* Client Form Dialog */}
      <ClientForm
        open={formOpen}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        client={selectedClient}
        loading={createMutation.isPending || updateMutation.isPending}
        userRole="SUPER_ADMIN" // This should come from your auth context
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => {
        setDeleteDialogOpen(false);
        deleteMutation.reset(); // Reset error state
      }}>
        <DialogTitle>Delete Client</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{clientToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteMutation.error?.response?.data?.error || 'Failed to delete client. Please try again.'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            deleteMutation.reset(); // Reset error state
          }}>Cancel</Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientsPage;
