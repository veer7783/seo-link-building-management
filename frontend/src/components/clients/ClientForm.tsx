import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { Client, CreateClientData, UpdateClientData } from '../../types';

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientData | UpdateClientData) => Promise<void>;
  client?: Client;
  loading?: boolean;
  userRole?: string; // Add user role to control percentage field access
}

// Country list
const countries = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France',
  'Spain', 'Italy', 'Netherlands', 'Brazil', 'Mexico', 'India', 'Japan', 'China',
  'South Korea', 'Singapore', 'UAE', 'South Africa', 'Argentina', 'Chile',
  'Sweden', 'Norway', 'Denmark', 'Finland', 'Belgium', 'Switzerland', 'Austria',
  'Portugal', 'Ireland', 'New Zealand', 'Thailand', 'Philippines', 'Malaysia',
  'Indonesia', 'Vietnam', 'Poland', 'Czech Republic', 'Hungary', 'Romania',
  'Bulgaria', 'Croatia', 'Slovenia', 'Slovakia', 'Lithuania', 'Latvia', 'Estonia'
];

const ClientForm: React.FC<ClientFormProps> = ({
  open,
  onClose,
  onSubmit,
  client,
  loading = false,
  userRole = 'ADMIN',
}) => {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    company: client?.company || '',
    country: client?.country || '',
    percentage: client?.percentage || 10,
    status: client?.status || 'ACTIVE',
  });

  // Keep local form state in sync when dialog opens or selected client changes
  useEffect(() => {
    setFormData({
      name: client?.name || '',
      email: client?.email || '',
      phone: client?.phone || '',
      company: client?.company || '',
      country: client?.country || '',
      percentage: client?.percentage || 10,
      status: client?.status || 'ACTIVE',
    });
  }, [client, open]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    let processedValue: any = value;
    
    // Convert percentage to number
    if (field === 'percentage') {
      processedValue = value ? parseInt(value, 10) : 10;
    }
    
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    // Optional: basic phone validation when present
    if (formData.phone && !/^[- +()0-9]{7,20}$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    // Percentage validation (only for super admin)
    if (userRole === 'SUPER_ADMIN') {
      if (formData.percentage < 10) {
        newErrors.percentage = 'Percentage must be at least 10%';
      } else if (formData.percentage % 5 !== 0) {
        newErrors.percentage = 'Percentage must be in increments of 5';
      }
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
      // Align payload with backend schema (see backend/src/routes/clients.ts)
      // Prisma Client model `Client` supports: name, email, phone?, company?, country?, address?, billingEmail?, currency?, percentage?, isActive?
      const payload: any = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        company: formData.company || undefined,
        country: formData.country || undefined,
      };

      // Only include percentage if user is super admin
      if (userRole === 'SUPER_ADMIN') {
        payload.percentage = parseInt(formData.percentage.toString(), 10);
      }

      // For updates, convert UI status to boolean isActive
      if (client) {
        payload.isActive = formData.status === 'ACTIVE';
      }

      await onSubmit(payload);
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      // Handle unique email constraint violation
      if (error.response?.status === 409 && error.response?.data?.field === 'email') {
        setErrors(prev => ({
          ...prev,
          email: error.response.data.error || 'A client with this email already exists'
        }));
      } else if (error.response?.data?.errors) {
        // Handle validation errors from express-validator
        const newErrors: Record<string, string> = {};
        error.response.data.errors.forEach((err: any) => {
          newErrors[err.path || err.param] = err.msg;
        });
        setErrors(newErrors);
      }
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      company: '',
      country: '',
      percentage: 10,
      status: 'ACTIVE',
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {client ? 'Edit Client' : 'Add New Client'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                error={!!errors.phone}
                helperText={errors.phone}
                placeholder="+1-555-0123"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Company"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Country</InputLabel>
                <Select
                  value={formData.country}
                  label="Country"
                  onChange={(e) => handleChange('country', e.target.value)}
                >
                  <MenuItem value="">Select Country</MenuItem>
                  {countries.map((country) => (
                    <MenuItem key={country} value={country}>
                      {country}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {/* Percentage field - only visible to super admin */}
            {userRole === 'SUPER_ADMIN' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Client Percentage (%)"
                  type="number"
                  value={formData.percentage}
                  onChange={(e) => handleChange('percentage', e.target.value)}
                  error={!!errors.percentage}
                  helperText={errors.percentage || 'Markup percentage for guest blog sites (min 10%, increments of 5)'}
                  inputProps={{ min: 10, step: 5 }}
                />
              </Grid>
            )}
            {/* Address field removed as requested */}
            {client && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleChange('status', e.target.value)}
                  >
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {client ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ClientForm;
