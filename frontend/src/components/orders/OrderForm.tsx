import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface OrderFormData {
  projectId: string;
  targetUrl: string;
  anchorText: string;
  anchorType: string;
  deadline: Date | null;
  notes: string;
  selectedSites: string[];
}

interface Project {
  id: string;
  name: string;
  client: {
    name: string;
  };
  budgetCap: number;
  budgetUsed: number;
}

interface Site {
  id: string;
  domain: string;
  domainRating: number;
  monthlyTraffic: number;
  category: string;
  clientPrice: number;
  turnaroundTime: number;
  publisher: {
    name: string;
  };
}

interface OrderFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: OrderFormData) => Promise<void>;
  order?: any;
  projects: Project[];
  sites: Site[];
  loading?: boolean;
}

const anchorTypes = [
  { value: 'EXACT_MATCH', label: 'Exact Match' },
  { value: 'PARTIAL_MATCH', label: 'Partial Match' },
  { value: 'BRANDED', label: 'Branded' },
  { value: 'GENERIC', label: 'Generic' },
  { value: 'NAKED_URL', label: 'Naked URL' },
];

const OrderForm: React.FC<OrderFormProps> = ({
  open,
  onClose,
  onSubmit,
  order,
  projects,
  sites,
  loading = false,
}) => {
  const [formData, setFormData] = useState<OrderFormData>({
    projectId: order?.projectId || '',
    targetUrl: order?.targetUrl || '',
    anchorText: order?.anchorText || '',
    anchorType: order?.anchorType || 'PARTIAL_MATCH',
    deadline: order?.deadline ? new Date(order.deadline) : null,
    notes: order?.notes || '',
    selectedSites: order?.orderSites?.map((os: any) => os.siteId) || [],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filteredSites, setFilteredSites] = useState<Site[]>([]);
  const [totalCost, setTotalCost] = useState(0);
  const [budgetWarning, setBudgetWarning] = useState('');

  const selectedProject = projects.find(p => p.id === formData.projectId);

  useEffect(() => {
    if (formData.projectId) {
      // Filter sites based on project requirements
      const project = projects.find(p => p.id === formData.projectId);
      if (project) {
        const filtered = sites.filter(site => 
          site.domainRating >= (project as any).minDomainRating &&
          site.monthlyTraffic >= (project as any).minMonthlyTraffic
        );
        setFilteredSites(filtered);
      }
    } else {
      setFilteredSites([]);
    }
  }, [formData.projectId, projects, sites]);

  useEffect(() => {
    const cost = formData.selectedSites.reduce((total, siteId) => {
      const site = sites.find(s => s.id === siteId);
      return total + (site?.clientPrice || 0);
    }, 0);
    setTotalCost(cost);

    // Check budget
    if (selectedProject && cost > 0) {
      const remainingBudget = selectedProject.budgetCap - selectedProject.budgetUsed;
      if (cost > remainingBudget) {
        setBudgetWarning(`Order total ($${cost.toFixed(2)}) exceeds remaining budget ($${remainingBudget.toFixed(2)})`);
      } else if (cost > remainingBudget * 0.8) {
        setBudgetWarning(`Order will use ${((cost / remainingBudget) * 100).toFixed(1)}% of remaining budget`);
      } else {
        setBudgetWarning('');
      }
    }
  }, [formData.selectedSites, sites, selectedProject]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSiteSelection = (siteId: string, selected: boolean) => {
    if (selected) {
      setFormData(prev => ({
        ...prev,
        selectedSites: [...prev.selectedSites, siteId],
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        selectedSites: prev.selectedSites.filter(id => id !== siteId),
      }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectId) {
      newErrors.projectId = 'Project is required';
    }

    if (!formData.targetUrl.trim()) {
      newErrors.targetUrl = 'Target URL is required';
    } else if (!/^https?:\/\/.+/.test(formData.targetUrl)) {
      newErrors.targetUrl = 'Target URL must start with http:// or https://';
    }

    if (!formData.anchorText.trim()) {
      newErrors.anchorText = 'Anchor text is required';
    }

    if (formData.selectedSites.length === 0) {
      newErrors.selectedSites = 'At least one site must be selected';
    }

    if (selectedProject && totalCost > (selectedProject.budgetCap - selectedProject.budgetUsed)) {
      newErrors.budget = 'Order total exceeds available budget';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      projectId: '',
      targetUrl: '',
      anchorText: '',
      anchorType: 'PARTIAL_MATCH',
      deadline: null,
      notes: '',
      selectedSites: [],
    });
    setErrors({});
    setBudgetWarning('');
    onClose();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={handleClose} maxWidth="xl" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {order ? 'Edit Order' : 'Create New Order'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Order Details
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Project</InputLabel>
                  <Select
                    value={formData.projectId}
                    label="Project"
                    onChange={(e) => handleChange('projectId', e.target.value)}
                    error={!!errors.projectId}
                  >
                    {projects.map((project) => (
                      <MenuItem key={project.id} value={project.id}>
                        {project.name} - {project.client.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Anchor Type</InputLabel>
                  <Select
                    value={formData.anchorType}
                    label="Anchor Type"
                    onChange={(e) => handleChange('anchorType', e.target.value)}
                  >
                    {anchorTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        {type.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Target URL"
                  value={formData.targetUrl}
                  onChange={(e) => handleChange('targetUrl', e.target.value)}
                  error={!!errors.targetUrl}
                  helperText={errors.targetUrl}
                  placeholder="https://example.com/page"
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Anchor Text"
                  value={formData.anchorText}
                  onChange={(e) => handleChange('anchorText', e.target.value)}
                  error={!!errors.anchorText}
                  helperText={errors.anchorText}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Deadline (Optional)"
                  value={formData.deadline}
                  onChange={(date) => handleChange('deadline', date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                {selectedProject && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Budget: ${selectedProject.budgetUsed.toFixed(2)} / ${selectedProject.budgetCap.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available: ${(selectedProject.budgetCap - selectedProject.budgetUsed).toFixed(2)}
                    </Typography>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Special instructions, content requirements, etc."
                />
              </Grid>

              {/* Site Selection */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Select Sites
                  {totalCost > 0 && (
                    <Chip
                      label={`Total: $${totalCost.toFixed(2)}`}
                      color="primary"
                      sx={{ ml: 2 }}
                    />
                  )}
                </Typography>
                {errors.selectedSites && (
                  <Typography color="error" variant="caption" display="block">
                    {errors.selectedSites}
                  </Typography>
                )}
                {budgetWarning && (
                  <Alert severity={budgetWarning.includes('exceeds') ? 'error' : 'warning'} sx={{ mb: 2 }}>
                    {budgetWarning}
                  </Alert>
                )}
                {errors.budget && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {errors.budget}
                  </Alert>
                )}
              </Grid>

              <Grid item xs={12}>
                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">Select</TableCell>
                        <TableCell>Domain</TableCell>
                        <TableCell>DR</TableCell>
                        <TableCell>Traffic</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Publisher</TableCell>
                        <TableCell>Price</TableCell>
                        <TableCell>Turnaround</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredSites.map((site) => (
                        <TableRow
                          key={site.id}
                          hover
                          selected={formData.selectedSites.includes(site.id)}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={formData.selectedSites.includes(site.id)}
                              onChange={(e) => handleSiteSelection(site.id, e.target.checked)}
                            />
                          </TableCell>
                          <TableCell>{site.domain}</TableCell>
                          <TableCell>{site.domainRating}</TableCell>
                          <TableCell>{site.monthlyTraffic.toLocaleString()}</TableCell>
                          <TableCell>{site.category}</TableCell>
                          <TableCell>{site.publisher.name}</TableCell>
                          <TableCell>${site.clientPrice}</TableCell>
                          <TableCell>{site.turnaroundTime} days</TableCell>
                        </TableRow>
                      ))}
                      {filteredSites.length === 0 && formData.projectId && (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            No sites match the project requirements
                          </TableCell>
                        </TableRow>
                      )}
                      {!formData.projectId && (
                        <TableRow>
                          <TableCell colSpan={8} align="center">
                            Please select a project first
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {order ? 'Update' : 'Create Order'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
};

export default OrderForm;
