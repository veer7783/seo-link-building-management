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
  Alert,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { Publisher } from '../../services/publisherService';

interface PublisherFormData {
  publisherName: string;
  email: string;
  whatsapp: string;
  modeOfCommunication: 'EMAIL' | 'WHATSAPP';
  isActive: boolean;
}

interface PublisherFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    publisherName: string;
    email?: string;
    whatsapp?: string;
    modeOfCommunication: 'EMAIL' | 'WHATSAPP';
    isActive?: boolean;
  }) => Promise<void>;
  publisher?: Publisher;
  loading?: boolean;
}

const PublisherForm: React.FC<PublisherFormProps> = ({
  open,
  onClose,
  onSubmit,
  publisher,
  loading = false,
}) => {
  const [formData, setFormData] = useState<PublisherFormData>({
    publisherName: publisher?.publisherName || '',
    email: publisher?.email || '',
    whatsapp: publisher?.whatsapp || '',
    modeOfCommunication: publisher?.modeOfCommunication || 'EMAIL',
    isActive: publisher?.isActive ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');

  // Reset form when publisher changes
  useEffect(() => {
    if (open) {
      setFormData({
        publisherName: publisher?.publisherName || '',
        email: publisher?.email || '',
        whatsapp: publisher?.whatsapp || '',
        modeOfCommunication: publisher?.modeOfCommunication || 'EMAIL',
        isActive: publisher?.isActive ?? true,
      });
      setErrors({});
      setSubmitError('');
    }
  }, [publisher, open]);

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    if (submitError) {
      setSubmitError('');
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Publisher Name validation
    if (!formData.publisherName.trim()) {
      newErrors.publisherName = 'Publisher name is required';
    }

    // Email validation (optional but must be valid if provided)
    if (formData.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // WhatsApp validation (optional but must be numeric if provided)
    if (formData.whatsapp.trim()) {
      const whatsappRegex = /^[+]?[1-9][\d]{0,15}$/;
      if (!whatsappRegex.test(formData.whatsapp.replace(/[\s\-()]/g, ''))) {
        newErrors.whatsapp = 'Please enter a valid WhatsApp number (numbers only, optional country code)';
      }
    }

    // Mode of Communication validation
    if (!formData.modeOfCommunication) {
      newErrors.modeOfCommunication = 'Mode of communication is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Explicitly include all fields, even if empty
    const submitData: any = {
      publisherName: formData.publisherName.trim(),
      modeOfCommunication: formData.modeOfCommunication,
      isActive: formData.isActive,
    };

    // Always include email and whatsapp, even if empty
    submitData.email = formData.email.trim() || '';
    submitData.whatsapp = formData.whatsapp.trim() || '';

    console.log('🔍 Publisher Form - Submit Data:', submitData);
    console.log('🔍 Publisher Form - Original Form Data:', formData);
    console.log('🔍 Publisher Form - JSON stringify:', JSON.stringify(submitData));

    try {
      await onSubmit(submitData);
      handleClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      setSubmitError(error.response?.data?.error || 'Failed to save publisher. Please try again.');
    }
  };

  const handleClose = () => {
    setFormData({
      publisherName: '',
      email: '',
      whatsapp: '',
      modeOfCommunication: 'EMAIL',
      isActive: true,
    });
    setErrors({});
    setSubmitError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {publisher ? 'Edit Publisher' : 'Add New Publisher'}
        </DialogTitle>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Publisher Information
              </Typography>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Publisher Name"
                value={formData.publisherName}
                onChange={(e) => handleChange('publisherName', e.target.value)}
                error={!!errors.publisherName}
                helperText={errors.publisherName}
                required
                disabled={loading}
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
                helperText={errors.email || 'Optional - Enter a valid email address'}
                placeholder="publisher@example.com"
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="WhatsApp"
                value={formData.whatsapp}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                error={!!errors.whatsapp}
                helperText={errors.whatsapp || 'Optional - Enter numbers only (e.g., +1234567890)'}
                placeholder="+1234567890"
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.modeOfCommunication} required>
                <InputLabel>Mode of Communication</InputLabel>
                <Select
                  value={formData.modeOfCommunication}
                  label="Mode of Communication"
                  onChange={(e) => handleChange('modeOfCommunication', e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="EMAIL">Email</MenuItem>
                  <MenuItem value="WHATSAPP">WhatsApp</MenuItem>
                </Select>
                {errors.modeOfCommunication && (
                  <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                    {errors.modeOfCommunication}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleChange('isActive', e.target.checked)}
                    disabled={loading}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    Status: {formData.isActive ? 'Active' : 'Inactive'}
                  </Typography>
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {publisher ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PublisherForm;
