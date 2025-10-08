import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Business as ClientIcon,
  Public as PublisherIcon,
  Language as SiteIcon,
  Assignment as ProjectIcon,
  ShoppingCart as OrderIcon,
  Article as ContentIcon,
  Assessment as ReportIcon,
} from '@mui/icons-material';

// Import the forms we created
import ClientForm from '../components/clients/ClientForm';
import PublisherForm from '../components/publishers/PublisherForm';
import SiteForm from '../components/sites/SiteForm';
import ProjectForm from '../components/projects/ProjectForm';
import OrderForm from '../components/orders/OrderForm';

interface DataEntryStats {
  clients: number;
  publishers: number;
  sites: number;
  projects: number;
  orders: number;
  activeOrders: number;
}

const DataEntryPage: React.FC = () => {
  const [stats, setStats] = useState<DataEntryStats>({
    clients: 0,
    publishers: 0,
    sites: 0,
    projects: 0,
    orders: 0,
    activeOrders: 0,
  });

  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data for dropdowns
  const [clients, setClients] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [sites, setSites] = useState([]);
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    loadStats();
    loadDropdownData();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      // Load statistics from API
      const response = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [clientsRes, publishersRes, sitesRes, projectsRes] = await Promise.all([
        fetch('/api/clients', { headers }),
        fetch('/api/publishers', { headers }),
        fetch('/api/sites', { headers }),
        fetch('/api/projects', { headers }),
      ]);

      if (clientsRes.ok) setClients((await clientsRes.json()).data || []);
      if (publishersRes.ok) setPublishers((await publishersRes.json()).data || []);
      if (sitesRes.ok) setSites((await sitesRes.json()).data || []);
      if (projectsRes.ok) setProjects((await projectsRes.json()).data || []);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
    }
  };

  const handleFormSubmit = async (endpoint: string, data: any) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setSelectedForm(null);
        loadStats();
        loadDropdownData();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create record');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const dataEntryOptions = [
    {
      id: 'client',
      title: 'Add Client',
      description: 'Create a new client account',
      icon: <ClientIcon />,
      color: '#1976d2',
      count: stats.clients,
    },
    {
      id: 'publisher',
      title: 'Add Publisher',
      description: 'Register a new publisher',
      icon: <PublisherIcon />,
      color: '#388e3c',
      count: stats.publishers,
    },
    {
      id: 'site',
      title: 'Add Site',
      description: 'Add a new publication site',
      icon: <SiteIcon />,
      color: '#f57c00',
      count: stats.sites,
    },
    {
      id: 'project',
      title: 'Create Project',
      description: 'Start a new link building project',
      icon: <ProjectIcon />,
      color: '#7b1fa2',
      count: stats.projects,
    },
    {
      id: 'order',
      title: 'Place Order',
      description: 'Create a new guest post order',
      icon: <OrderIcon />,
      color: '#d32f2f',
      count: stats.orders,
    },
  ];

  const quickActions = [
    { id: 'client', label: 'New Client', icon: <ClientIcon /> },
    { id: 'publisher', label: 'New Publisher', icon: <PublisherIcon /> },
    { id: 'site', label: 'New Site', icon: <SiteIcon /> },
    { id: 'project', label: 'New Project', icon: <ProjectIcon /> },
    { id: 'order', label: 'New Order', icon: <OrderIcon /> },
  ];

  const renderForm = () => {
    switch (selectedForm) {
      case 'client':
        return (
          <ClientForm
            open={true}
            onClose={() => setSelectedForm(null)}
            onSubmit={(data) => handleFormSubmit('clients', data)}
            loading={loading}
          />
        );
      case 'publisher':
        return (
          <PublisherForm
            open={true}
            onClose={() => setSelectedForm(null)}
            onSubmit={(data) => handleFormSubmit('publishers', data)}
            loading={loading}
          />
        );
      case 'site':
        return (
          <SiteForm
            open={true}
            onClose={() => setSelectedForm(null)}
            onSubmit={(data) => handleFormSubmit('sites', data)}
            loading={loading}
            isAdmin={true}
          />
        );
      case 'project':
        return (
          <ProjectForm
            open={true}
            onClose={() => setSelectedForm(null)}
            onSubmit={(data) => handleFormSubmit('projects', data)}
            clients={clients}
            loading={loading}
          />
        );
      case 'order':
        return (
          <OrderForm
            open={true}
            onClose={() => setSelectedForm(null)}
            onSubmit={(data) => handleFormSubmit('orders', data)}
            projects={projects}
            sites={sites}
            loading={loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Data Entry Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Add new data to your link management system
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary">
                {stats.clients}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clients
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {stats.publishers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Publishers
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">
                {stats.sites}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sites
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="secondary.main">
                {stats.projects}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Projects
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">
                {stats.orders}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Orders
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Entry Cards */}
      <Grid container spacing={3}>
        {dataEntryOptions.map((option) => (
          <Grid item xs={12} sm={6} md={4} key={option.id}>
            <Card 
              sx={{ 
                height: '100%',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box 
                    sx={{ 
                      p: 1, 
                      borderRadius: 1, 
                      backgroundColor: `${option.color}20`,
                      color: option.color,
                      mr: 2,
                    }}
                  >
                    {option.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {option.title}
                    </Typography>
                    <Chip 
                      label={`${option.count} total`} 
                      size="small" 
                      variant="outlined"
                    />
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {option.description}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => setSelectedForm(option.id)}
                  sx={{ backgroundColor: option.color }}
                >
                  Add New
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Quick Add FAB */}
      <Fab
        color="primary"
        aria-label="quick add"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setQuickAddOpen(true)}
      >
        <AddIcon />
      </Fab>

      {/* Quick Add Dialog */}
      <Dialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)}>
        <DialogTitle>Quick Add</DialogTitle>
        <DialogContent>
          <List>
            {quickActions.map((action) => (
              <ListItem
                key={action.id}
                button
                onClick={() => {
                  setSelectedForm(action.id);
                  setQuickAddOpen(false);
                }}
              >
                <ListItemIcon>{action.icon}</ListItemIcon>
                <ListItemText primary={action.label} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Render Selected Form */}
      {renderForm()}
    </Container>
  );
};

export default DataEntryPage;
