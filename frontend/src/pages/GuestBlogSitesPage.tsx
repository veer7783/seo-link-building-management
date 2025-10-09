import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Box,
  TextField,
  InputAdornment,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  SelectChangeEvent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  TablePagination,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Upload as UploadIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guestBlogSiteService } from '../services/guestBlogSiteService';
import { publisherService } from '../services/publisherService';
import { clientService } from '../services/clientService';
import { guestBlogOrderService } from '../services/guestBlogOrderService';
import { projectService } from '../services/projectService';
import { useAuth } from '../contexts/AuthContext';
import { formatRoundedPrice } from '../utils/priceRounding';
import {
  GuestBlogSite,
  GuestBlogSiteStatus,
  GUEST_BLOG_SITE_CATEGORIES,
  COUNTRIES,
  SITE_LANGUAGES,
} from '../types/guestBlogSite';
import GuestBlogSiteForm from '../components/guestBlogSites/GuestBlogSiteForm';
import BulkUploadModal from '../components/guestBlogSites/BulkUploadModal';
import CartItemForm from '../components/guestBlogSites/CartItemForm';

interface GuestBlogSitesPageState {
  page: number;
  rowsPerPage: number;
  search: string;
  category: string;
  country: string;
  status: GuestBlogSiteStatus | '';
  publisherId: string;
  clientId: string;
  projectId: string;
}

interface CartItem {
  id: string;
  guestBlogSiteId: string;
  guestBlogSiteUrl: string;
  clientId: string;
  clientName: string;
  projectId: string;
  projectName: string;
  adjustedPrice: number;
  contentText?: string;
  contentDocUrl?: string;
}

const GuestBlogSitesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<GuestBlogSitesPageState>({
    page: 0,
    rowsPerPage: 10,
    search: '',
    category: '',
    country: '',
    status: '',
    publisherId: '',
    clientId: '',
    projectId: '',
  });

  const [formOpen, setFormOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<GuestBlogSite | undefined>();
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info',
  });

  // Get user role from auth context
  const { user, isAdmin, isSuperAdmin } = useAuth();
  
  // Debug logging
  console.log('GuestBlogSitesPage - User:', user);
  console.log('GuestBlogSitesPage - isAdmin:', isAdmin);
  console.log('GuestBlogSitesPage - isSuperAdmin:', isSuperAdmin);
  
  // Temporary fallback for Super Admin detection
  const isSuperAdminFallback = user?.role === 'SUPER_ADMIN' || user?.email === 'superadmin@example.com';
  const isAdminFallback = isAdmin || isSuperAdminFallback;
  
  console.log('GuestBlogSitesPage - isSuperAdminFallback:', isSuperAdminFallback);
  console.log('GuestBlogSitesPage - isAdminFallback:', isAdminFallback);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartPopupOpen, setCartPopupOpen] = useState(false);
  const [selectedSiteForCart, setSelectedSiteForCart] = useState<GuestBlogSite | null>(null);
  const [orderedSites, setOrderedSites] = useState<string[]>([]);

  // Fetch guest blog sites
  const {
    data: sitesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['guestBlogSites', state.page, state.rowsPerPage, state.search, state.category, state.country, state.status, state.publisherId, state.clientId],
    queryFn: () => guestBlogSiteService.getGuestBlogSites({
      page: state.page + 1,
      limit: state.rowsPerPage,
      search: state.search || undefined,
      category: state.category || undefined,
      country: state.country || undefined,
      status: state.status || undefined,
      publisherId: state.publisherId || undefined,
      clientId: state.clientId || undefined,
    }),
    placeholderData: (previousData) => previousData,
  });

  // Fetch publishers for dropdown
  const { data: publishersData } = useQuery({
    queryKey: ['publishers'],
    queryFn: () => publisherService.getPublishers({ limit: 1000 }),
  });

  // Fetch clients for dropdown
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients({ limit: 1000 }),
  });

  // Fetch projects for selected client
  const { data: projectsData } = useQuery({
    queryKey: ['projects', state.clientId],
    queryFn: () => state.clientId ? projectService.getProjects({ clientId: state.clientId, limit: 1000 }) : Promise.resolve({ data: [], pagination: { page: 0, limit: 0, total: 0, pages: 0 } }),
    enabled: !!state.clientId,
  });

  const sites = sitesData?.data || [];
  const totalCount = sitesData?.pagination?.total || 0;
  const publishers = publishersData?.data || [];
  const clients = clientsData?.data || [];
  const projects = projectsData?.data || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: guestBlogSiteService.createGuestBlogSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestBlogSites'] });
      setFormOpen(false);
      setSnackbar({
        open: true,
        message: 'Guest blog site created successfully!',
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to create guest blog site',
        severity: 'error',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => guestBlogSiteService.updateGuestBlogSite(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestBlogSites'] });
      setFormOpen(false);
      setSelectedSite(undefined);
      setSnackbar({
        open: true,
        message: 'Guest blog site updated successfully!',
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to update guest blog site',
        severity: 'error',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: guestBlogSiteService.deleteGuestBlogSite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guestBlogSites'] });
      setSnackbar({
        open: true,
        message: 'Guest blog site deleted successfully!',
        severity: 'success',
      });
    },
    onError: (error: any) => {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to delete guest blog site',
        severity: 'error',
      });
    },
  });

  const handleAddNew = () => {
    setSelectedSite(undefined);
    setFormOpen(true);
  };

  const handleEdit = (site: GuestBlogSite) => {
    setSelectedSite(site);
    setFormOpen(true);
  };

  const handleDelete = (site: GuestBlogSite) => {
    if (window.confirm(`Are you sure you want to delete ${site.site_url}?`)) {
      deleteMutation.mutate(site.id);
    }
  };

  const handleSubmit = async (data: any) => {
    if (selectedSite) {
      updateMutation.mutate({ id: selectedSite.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedSite(undefined);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, search: event.target.value, page: 0 }));
  };

  const handleCategoryChange = (event: any) => {
    setState(prev => ({ ...prev, category: event.target.value, page: 0 }));
  };

  const handleCountryChange = (event: any) => {
    setState(prev => ({ ...prev, country: event.target.value, page: 0 }));
  };

  const handleStatusChange = (event: any) => {
    setState(prev => ({ ...prev, status: event.target.value, page: 0 }));
  };

  const handlePublisherChange = (event: any) => {
    setState(prev => ({ ...prev, publisherId: event.target.value, page: 0 }));
  };

  const handleClientChange = (event: SelectChangeEvent) => {
    const newClientId = event.target.value;
    
    // Reset cart when client changes (if cart has items from different client)
    if (cart.length > 0 && cart[0].clientId !== newClientId) {
      setCart([]);
      setSnackbar({
        open: true,
        message: 'Cart cleared due to client change. Items from different clients cannot be mixed.',
        severity: 'info',
      });
    }
    
    // Reset project if client changes
    setState(prev => ({ ...prev, clientId: newClientId, projectId: '', page: 0 }));
    
    // Fetch ordered sites for the new client
    if (newClientId) {
      fetchOrderedSites(newClientId);
    } else {
      setOrderedSites([]);
    }
  };

  const handleProjectChange = (event: SelectChangeEvent) => {
    const newProjectId = event.target.value;
    // If cart has items from a different project, clear it to keep consistency
    if (cart.length > 0 && cart[0].projectId !== newProjectId) {
      setCart([]);
      setSnackbar({
        open: true,
        message: 'Cart cleared due to project change. Items from different projects cannot be mixed.',
        severity: 'info',
      });
    }
    setState(prev => ({ ...prev, projectId: newProjectId }));
  };

  const fetchOrderedSites = async (clientId: string) => {
    try {
      const response = await guestBlogOrderService.getOrderedSites(clientId);
      setOrderedSites(response.data);
    } catch (error) {
      console.error('Error fetching ordered sites:', error);
      setOrderedSites([]);
    }
  };

  // Fetch ordered sites when client changes
  React.useEffect(() => {
    if (state.clientId) {
      fetchOrderedSites(state.clientId);
    } else {
      setOrderedSites([]);
    }
  }, [state.clientId]);

  const handlePageChange = (event: unknown, newPage: number) => {
    setState(prev => ({ ...prev, page: newPage }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({
      ...prev,
      rowsPerPage: parseInt(event.target.value, 10),
      page: 0,
    }));
  };

  // Cart functions
  const handleAddToCart = (site: GuestBlogSite) => {
    if (!state.clientId) {
      setSnackbar({
        open: true,
        message: 'Please select a client first.',
        severity: 'error',
      });
      return;
    }
    if (!state.projectId) {
      setSnackbar({
        open: true,
        message: 'Please select a project for the selected client before adding to cart.',
        severity: 'error',
      });
      return;
    }

    // Check if site is already in cart
    if (cart.some(item => item.guestBlogSiteId === site.id)) {
      setSnackbar({
        open: true,
        message: 'This site is already in your cart.',
        severity: 'error',
      });
      return;
    }

    setSelectedSiteForCart(site);
    setCartPopupOpen(true);
  };

  const addItemToCart = (contentText: string, contentDocUrl?: string) => {
    if (!selectedSiteForCart || !state.clientId || !state.projectId) return;

    const selectedClient = clients.find(c => c.id === state.clientId);
    if (!selectedClient) return;
    const selectedProject = projects.find((p: any) => p.id === state.projectId);

    // Calculate adjusted price using existing pricing logic
    const adjustedPrice = selectedSiteForCart.displayed_price;

    const cartItem: CartItem = {
      id: `${selectedSiteForCart.id}-${Date.now()}`,
      guestBlogSiteId: selectedSiteForCart.id,
      guestBlogSiteUrl: selectedSiteForCart.site_url,
      clientId: state.clientId,
      clientName: selectedClient.name,
      projectId: state.projectId,
      projectName: selectedProject?.projectName || '',
      adjustedPrice,
      contentText,
      contentDocUrl,
    };

    setCart(prev => [...prev, cartItem]);
    setCartPopupOpen(false);
    setSelectedSiteForCart(null);
    setSnackbar({
      open: true,
      message: 'Site added to cart successfully!',
      severity: 'success',
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const getTotalCartPrice = () => {
    return cart.reduce((total, item) => total + item.adjustedPrice, 0);
  };

  const handleSubmitCart = async () => {
    if (cart.length === 0) {
      setSnackbar({
        open: true,
        message: 'Cart is empty.',
        severity: 'error',
      });
      return;
    }

    try {
      console.log('Cart before mapping:', cart);
      
      const cartItems = cart.map(item => ({
        guestBlogSiteId: item.guestBlogSiteId,
        clientId: item.clientId,
        projectId: item.projectId,
        price: item.adjustedPrice,
        contentText: item.contentText,
        contentDocUrl: item.contentDocUrl,
      }));

      console.log('Mapped cart items:', cartItems);
      const response = await guestBlogOrderService.createOrders({ cartItems });
      
      // Clear cart after successful submission
      setCart([]);
      
      // Refresh ordered sites for the current client
      if (state.clientId) {
        fetchOrderedSites(state.clientId);
      }
      
      // Refresh orders list
      queryClient.invalidateQueries({ queryKey: ['guestBlogOrders'] });
      
      setSnackbar({
        open: true,
        message: `Successfully created ${response.data.length} orders!`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Error submitting cart:', error);
      setSnackbar({
        open: true,
        message: 'Failed to submit orders. Please try again.',
        severity: 'error',
      });
    }
  };

  // Persist cart in localStorage per client+project combination
  const getCartStorageKey = (clientId: string, projectId: string) => `guestBlogCart:${clientId || 'no-client'}:${projectId || 'no-project'}`;
  
  // Clear cart storage if needed
  const clearCartStorage = (key: string) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  };

  // Load cart on client/project change
  React.useEffect(() => {
    const key = getCartStorageKey(state.clientId, state.projectId);
    // Try localStorage first, then sessionStorage
    const saved = localStorage.getItem(key) || sessionStorage.getItem(key);
    if (saved) {
      try {
        const parsed: CartItem[] = JSON.parse(saved);
        setCart(parsed);
      } catch {
        setCart([]);
      }
    } else {
      setCart([]);
    }
  }, [state.clientId, state.projectId]);

  // Save cart on changes with quota handling
  React.useEffect(() => {
    const key = getCartStorageKey(state.clientId, state.projectId);
    try {
      const cartData = JSON.stringify(cart);
      
      // Check if the data is too large (over 4MB to leave some buffer)
      if (cartData.length > 4 * 1024 * 1024) {
        console.warn('Cart data is too large for localStorage, using session storage instead');
        sessionStorage.setItem(key, cartData);
        localStorage.removeItem(key); // Remove from localStorage if it exists
      } else {
        localStorage.setItem(key, cartData);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, falling back to session storage');
        try {
          // Try to save in sessionStorage instead
          sessionStorage.setItem(key, JSON.stringify(cart));
          localStorage.removeItem(key); // Remove from localStorage if it exists
        } catch (sessionError) {
          console.error('Both localStorage and sessionStorage failed, cart will not persist');
          // Show user notification about the issue
          setSnackbar({
            open: true,
            message: 'Cart data is too large to save. Try reducing content size, using fewer/smaller images, or clear the cart and add items one by one.',
            severity: 'error',
          });
        }
      } else {
        console.error('Error saving cart:', error);
      }
    }
  }, [cart, state.clientId, state.projectId]);


  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Guest Blog Posting Sites
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              placeholder="Search sites..."
              value={state.search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={state.category}
                label="Category"
                onChange={handleCategoryChange}
              >
                <MenuItem value="">All Categories</MenuItem>
                {GUEST_BLOG_SITE_CATEGORIES.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    {category.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Country</InputLabel>
              <Select
                value={state.country}
                label="Country"
                onChange={handleCountryChange}
              >
                <MenuItem value="">All Countries</MenuItem>
                {COUNTRIES.map((country) => (
                  <MenuItem key={country.value} value={country.value}>
                    {country.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={state.status}
                label="Status"
                onChange={handleStatusChange}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value={GuestBlogSiteStatus.ACTIVE}>Active</MenuItem>
                <MenuItem value={GuestBlogSiteStatus.INACTIVE}>Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Publisher</InputLabel>
              <Select
                value={state.publisherId}
                label="Publisher"
                onChange={handlePublisherChange}
              >
                <MenuItem value="">All Publishers</MenuItem>
                {publishers.map((publisher) => (
                  <MenuItem key={publisher.id} value={publisher.id}>
                    {publisher.email ? `${publisher.publisherName} (${publisher.email})` : publisher.publisherName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Client (Pricing)</InputLabel>
              <Select
                value={state.clientId}
                label="Client (Pricing)"
                onChange={handleClientChange}
              >
                <MenuItem value="">Default Pricing</MenuItem>
                {clients.map((client) => (
                  <MenuItem key={client.id} value={client.id}>
                    {client.name} ({client.percentage}%)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Project selection for chosen client */}
          <Grid item xs={12} md={2}>
            <FormControl fullWidth disabled={!state.clientId}>
              <InputLabel>Project</InputLabel>
              <Select
                value={state.projectId}
                label="Project"
                onChange={handleProjectChange}
              >
                <MenuItem value="">Select Project</MenuItem>
                {projects.map((project: any) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.projectName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <Box display="flex" gap={1} justifyContent="flex-end">
              {isAdminFallback && (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    onClick={() => setBulkUploadOpen(true)}
                    sx={{ minWidth: 'auto' }}
                  >
                    Bulk Upload
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddNew}
                    sx={{ minWidth: 'auto' }}
                  >
                    Add Site
                  </Button>
                </>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Cart Summary */}
      {isSuperAdminFallback && cart.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" color="primary">
                Cart Summary
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {cart.length} site{cart.length !== 1 ? 's' : ''} • Total: {guestBlogSiteService.formatPrice(getTotalCartPrice())}
              </Typography>
            </Box>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setCart([]);
                  const key = getCartStorageKey(state.clientId, state.projectId);
                  clearCartStorage(key);
                }}
                disabled={cart.length === 0}
              >
                Clear Cart
              </Button>
              <Button
                variant="contained"
                size="small"
                onClick={handleSubmitCart}
                disabled={cart.length === 0}
                startIcon={<CartIcon />}
              >
                Submit All ({cart.length})
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Sites Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Site URL</TableCell>
              <TableCell>Publisher</TableCell>
              <TableCell>DA</TableCell>
              <TableCell>DR</TableCell>
              <TableCell>Traffic</TableCell>
              <TableCell>SS</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Language</TableCell>
              <TableCell>TAT</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
              {isAdminFallback && <TableCell align="center">Actions</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={isAdminFallback ? 13 : 12} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : sites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdminFallback ? 13 : 12} align="center">
                  No guest blog sites found
                </TableCell>
              </TableRow>
            ) : (
              sites.map((site: GuestBlogSite) => (
                <TableRow key={site.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {site.site_url}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {site.publisher ? (
                      site.publisher.email ? 
                        `${site.publisher.publisherName} (${site.publisher.email})` : 
                        site.publisher.publisherName
                    ) : 'N/A'}
                  </TableCell>
                  <TableCell>{site.da}</TableCell>
                  <TableCell>{site.dr}</TableCell>
                  <TableCell>{guestBlogSiteService.formatTraffic(site.ahrefs_traffic)}</TableCell>
                  <TableCell>{site.ss || 'N/A'}</TableCell>
                  <TableCell>{site.categoryDisplay}</TableCell>
                  <TableCell>{site.country}</TableCell>
                  <TableCell>{site.site_language}</TableCell>
                  <TableCell>{site.tat}</TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium" color="primary">
                        {formatRoundedPrice(site.displayed_price)}
                      </Typography>
                      {site.isOverride && (
                        <Chip size="small" label="Override" color="warning" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={site.status === GuestBlogSiteStatus.ACTIVE ? 'Active' : 'Inactive'}
                      color={site.status === GuestBlogSiteStatus.ACTIVE ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  {isAdminFallback && (
                    <TableCell align="center">
                      <Box display="flex" gap={1}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => console.log('View', site)}>
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Site">
                          <IconButton size="small" onClick={() => handleEdit(site)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Site">
                          <IconButton size="small" color="error" onClick={() => handleDelete(site)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                        {isSuperAdminFallback && (
                          <Tooltip title={
                            orderedSites.includes(site.id) ? "Already ordered for this client" :
                            cart.some(item => item.guestBlogSiteId === site.id) ? "Already in cart" :
                            "Add to Cart"
                          }>
                            <span>
                              <IconButton 
                                size="small" 
                                color="primary" 
                                onClick={() => handleAddToCart(site)}
                                disabled={
                                  cart.some(item => item.guestBlogSiteId === site.id) || 
                                  orderedSites.includes(site.id)
                                }
                              >
                                <AddIcon />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {totalCount > 0 && (
        <TablePagination
          component="div"
          count={totalCount}
          page={state.page}
          onPageChange={handlePageChange}
          rowsPerPage={state.rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      )}

      {/* Guest Blog Site Form Dialog */}
      <GuestBlogSiteForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        site={selectedSite}
        loading={createMutation.isPending || updateMutation.isPending}
        isAdmin={isAdminFallback}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['guestBlogSites'] });
          setBulkUploadOpen(false);
          setSnackbar({
            open: true,
            message: 'Bulk upload completed successfully!',
            severity: 'success',
          });
        }}
      />

      {/* Cart Item Form */}
      {selectedSiteForCart && (
        <CartItemForm
          open={cartPopupOpen}
          onClose={() => {
            setCartPopupOpen(false);
            setSelectedSiteForCart(null);
          }}
          onSubmit={addItemToCart}
          siteUrl={selectedSiteForCart.site_url}
          clientName={clients.find(c => c.id === state.clientId)?.name || ''}
          adjustedPrice={selectedSiteForCart.displayed_price}
        />
      )}

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
    </Container>
  );
};

export default GuestBlogSitesPage;
