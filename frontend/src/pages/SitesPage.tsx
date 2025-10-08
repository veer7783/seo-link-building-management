import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  AttachMoney as PriceIcon,
  SupervisorAccount as SuperAdminIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { siteService } from '../services/siteService';
import { clientService } from '../services/clientService';
import { Site, SitePricing } from '../types/site';
import { Client } from '../types';
import DataTable, { Column, Action } from '../components/common/DataTable';
import StatusChip from '../components/common/StatusChip';

const SitesPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [pricingDialogOpen, setPricingDialogOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | undefined>();
  const [sitePricing, setSitePricing] = useState<SitePricing[]>([]);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [selectedSiteForOverride, setSelectedSiteForOverride] = useState<{ site: Site; pricing: SitePricing } | undefined>();
  const [overridePrice, setOverridePrice] = useState<string>('');

  const queryClient = useQueryClient();

  // Get current user role from auth context (you'll need to implement this)
  const userRole = 'SUPER_ADMIN'; // This should come from your auth context

  const { data: sitesData, isLoading } = useQuery({
    queryKey: ['sites', page, rowsPerPage, search],
    queryFn: () => siteService.getSites({
      page: page + 1,
      limit: rowsPerPage,
      search: search || undefined,
    }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients({ limit: 1000 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => siteService.deleteSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
    onError: (error: any) => {
      console.error('Delete site error:', error);
    },
  });

  const setPriceOverrideMutation = useMutation({
    mutationFn: ({ clientId, siteId, overridePrice }: { clientId: string; siteId: string; overridePrice: number }) =>
      siteService.setSitePriceOverride(clientId, siteId, { overridePrice }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitePricing'] });
      setOverrideDialogOpen(false);
      setSelectedSiteForOverride(undefined);
      setOverridePrice('');
      // Refresh pricing data
      if (selectedClient) {
        handleViewPricing(selectedClient);
      }
    },
  });

  const removePriceOverrideMutation = useMutation({
    mutationFn: ({ clientId, siteId }: { clientId: string; siteId: string }) =>
      siteService.removeSitePriceOverride(clientId, siteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sitePricing'] });
      // Refresh pricing data
      if (selectedClient) {
        handleViewPricing(selectedClient);
      }
    },
  });

  const sites = sitesData?.data || [];
  const totalCount = sitesData?.pagination?.total || 0;
  const clients = clientsData?.data || [];

  const columns: Column[] = [
    { id: 'domain', label: 'Domain', minWidth: 200 },
    { id: 'publisher', label: 'Publisher', minWidth: 150 },
    { id: 'category', label: 'Category', minWidth: 120 },
    { id: 'domainRating', label: 'DR', minWidth: 80 },
    { id: 'monthlyTraffic', label: 'Traffic', minWidth: 100 },
    { id: 'basePrice', label: 'Base Price', minWidth: 100 },
    { id: 'turnaroundTime', label: 'Turnaround', minWidth: 100 },
    {
      id: 'isActive',
      label: 'Status',
      minWidth: 100,
      format: (value: boolean) => (
        <StatusChip status={value ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
  ];

  const actions: Action[] = [
    {
      icon: <ViewIcon />,
      tooltip: 'View',
      onClick: (site: Site) => {
        // Handle view site details
        console.log('View site:', site);
      },
    },
    {
      icon: <EditIcon />,
      tooltip: 'Edit',
      onClick: (site: Site) => {
        // Handle edit site
        console.log('Edit site:', site);
      },
    },
    {
      icon: <DeleteIcon />,
      tooltip: 'Delete',
      onClick: (site: Site) => {
        if (window.confirm(`Are you sure you want to delete ${site.domain}?`)) {
          deleteMutation.mutate(site.id);
        }
      },
    },
  ];

  const handleViewPricing = async (clientId: string) => {
    try {
      const pricing = await siteService.getSitePricingForClient(clientId);
      setSitePricing(pricing);
      setPricingDialogOpen(true);
    } catch (error) {
      console.error('Error fetching pricing:', error);
    }
  };

  const handleSetOverride = (site: Site, pricing: SitePricing) => {
    setSelectedSiteForOverride({ site, pricing });
    setOverridePrice(pricing.overridePrice?.toString() || '');
    setOverrideDialogOpen(true);
  };

  const handleRemoveOverride = (clientId: string, siteId: string) => {
    if (window.confirm('Are you sure you want to remove this price override?')) {
      removePriceOverrideMutation.mutate({ clientId, siteId });
    }
  };

  const handleSubmitOverride = () => {
    if (selectedSiteForOverride && selectedClient && overridePrice) {
      setPriceOverrideMutation.mutate({
        clientId: selectedClient,
        siteId: selectedSiteForOverride.site.id,
        overridePrice: parseFloat(overridePrice),
      });
    }
  };

  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  const formatTraffic = (traffic: number) => {
    if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
    if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
    return traffic.toString();
  };

  const transformedSites = sites.map(site => ({
    ...site,
    publisher: site.publisher?.publisherName || 'Unknown',
    basePrice: formatPrice(site.basePrice),
    monthlyTraffic: formatTraffic(site.monthlyTraffic),
    turnaroundTime: `${site.turnaroundTime} days`,
  }));

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">Guest Blog Posting Sites</Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<PriceIcon />}
            onClick={() => {
              if (selectedClient) {
                handleViewPricing(selectedClient);
              } else {
                alert('Please select a client first to view pricing');
              }
            }}
            disabled={!selectedClient}
          >
            View Client Pricing
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              // Handle add new site
              console.log('Add new site');
            }}
          >
            Add Site
          </Button>
        </Box>
      </Box>

      <Paper sx={{ mb: 3, p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search sites..."
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
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <InputLabel>Select Client for Pricing</InputLabel>
              <Select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                label="Select Client for Pricing"
              >
                <MenuItem value="">
                  <em>Select a client</em>
                </MenuItem>
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name} ({client.percentage}% markup)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <DataTable
        columns={columns}
        data={transformedSites}
        actions={actions}
        loading={isLoading}
        page={page}
        rowsPerPage={rowsPerPage}
        totalCount={totalCount}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />

      {/* Client Pricing Dialog */}
      <Dialog
        open={pricingDialogOpen}
        onClose={() => setPricingDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Site Pricing for {clients.find(c => c.id === selectedClient)?.name}
          <Typography variant="body2" color="text.secondary">
            Markup: {clients.find(c => c.id === selectedClient)?.percentage}%
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Site</TableCell>
                  <TableCell>Base Price</TableCell>
                  <TableCell>Client Price</TableCell>
                  <TableCell>Override</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sitePricing.map((pricing) => {
                  const site = sites.find(s => s.id === pricing.siteId);
                  return (
                    <TableRow key={pricing.siteId}>
                      <TableCell>{site?.domain || 'Unknown'}</TableCell>
                      <TableCell>{formatPrice(pricing.basePrice)}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {formatPrice(pricing.finalPrice)}
                          {pricing.isOverride && (
                            <Chip
                              size="small"
                              label="Override"
                              color="warning"
                              icon={<SuperAdminIcon />}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {pricing.isOverride ? formatPrice(pricing.overridePrice!) : 'None'}
                      </TableCell>
                      <TableCell>
                        {userRole === 'SUPER_ADMIN' && (
                          <Box display="flex" gap={1}>
                            <Tooltip title="Set Price Override">
                              <IconButton
                                size="small"
                                onClick={() => handleSetOverride(site!, pricing)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            {pricing.isOverride && (
                              <Tooltip title="Remove Override">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleRemoveOverride(selectedClient, pricing.siteId)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPricingDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Price Override Dialog */}
      <Dialog
        open={overrideDialogOpen}
        onClose={() => {
          setOverrideDialogOpen(false);
          setSelectedSiteForOverride(undefined);
          setOverridePrice('');
        }}
      >
        <DialogTitle>Set Price Override</DialogTitle>
        <DialogContent>
          {selectedSiteForOverride && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Site: {selectedSiteForOverride.site.domain}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Base Price: {formatPrice(selectedSiteForOverride.pricing.basePrice)}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Current Client Price: {formatPrice(selectedSiteForOverride.pricing.finalPrice)}
              </Typography>
              <TextField
                fullWidth
                label="Override Price"
                type="number"
                value={overridePrice}
                onChange={(e) => setOverridePrice(e.target.value)}
                sx={{ mt: 2 }}
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setOverrideDialogOpen(false);
            setSelectedSiteForOverride(undefined);
            setOverridePrice('');
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmitOverride}
            variant="contained"
            disabled={!overridePrice || setPriceOverrideMutation.isPending}
          >
            {setPriceOverrideMutation.isPending ? 'Setting...' : 'Set Override'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SitesPage;
