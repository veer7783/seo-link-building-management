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
  Autocomplete,
  Box,
} from '@mui/material';
import type { Site } from '../../types/site';
import { SITE_CATEGORIES, COUNTRIES, SITE_LANGUAGES } from '../../constants/siteOptions';

interface SiteFormData {
  domain: string;
  domainAuthority: number;
  domainRating: number;
  monthlyTraffic: number;
  spamScore?: number;
  turnaroundTime: string;
  category: string;
  language: string;
  country: string;
  basePrice: number;
  internalCost: number;
  publisherId: string;
}

interface SiteFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: SiteFormData) => Promise<void>;
  site?: Site;
  loading?: boolean;
  isAdmin: boolean;
}

const SiteForm: React.FC<SiteFormProps> = ({
  open,
  onClose,
  onSubmit,
  site,
  loading = false,
  isAdmin,
}) => {
  const [formData, setFormData] = useState<SiteFormData>({
    domain: '',
    domainAuthority: 0,
    domainRating: 0,
    monthlyTraffic: 0,
    spamScore: undefined,
    turnaroundTime: '',
    category: '',
    language: 'English',
    country: '',
    basePrice: 0,
    internalCost: 0,
    publisherId: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [publishers, setPublishers] = useState<{ id: string; publisherName: string }[]>([]);
  const [submitError, setSubmitError] = useState<string>('');

  // Reset form when site changes
  useEffect(() => {
    if (open) {
      if (site) {
        setFormData({
          domain: site.domain,
          domainAuthority: site.domainAuthority,
          domainRating: site.domainRating,
          monthlyTraffic: site.monthlyTraffic,
          spamScore: site.spamScore,
          turnaroundTime: site.turnaroundTime,
          category: site.category,
          language: site.language,
          country: site.country,
          basePrice: site.basePrice,
          internalCost: site.internalCost,
          publisherId: site.publisherId,
        });
      } else {
        setFormData({
          domain: '',
          domainAuthority: 0,
          domainRating: 0,
          monthlyTraffic: 0,
          spamScore: undefined,
          turnaroundTime: '',
          category: '',
          language: 'English',
          country: '',
          basePrice: 0,
          internalCost: 0,
          publisherId: '',
        });
      }
      setErrors({});
      setSubmitError('');
    }
  }, [site, open]);

  const handleChange = (field: string, value: string | number) => {
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

    if (!formData.domain.trim()) {
      newErrors.domain = 'Site URL is required';
    } else if (!formData.domain.includes('.')) {
      newErrors.domain = 'Please enter a valid domain URL';
    }

    if (formData.domainRating < 0 || formData.domainRating > 100) {
      newErrors.domainRating = 'DA must be between 0 and 100';
    }

    if (formData.monthlyTraffic < 0) {
      newErrors.monthlyTraffic = 'Traffic must be a positive number';
    }

    if (formData.spamScore && (formData.spamScore < 0 || formData.spamScore > 100)) {
      newErrors.spamScore = 'Spam Score must be between 0 and 100';
    }

    if (!formData.turnaroundTime.trim()) {
      newErrors.turnaroundTime = 'Turnaround Time is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (!formData.language) {
      newErrors.language = 'Language is required';
    }

    if (!formData.country) {
      newErrors.country = 'Country is required';
    }

    if (!formData.publisherId) {
      newErrors.publisherId = 'Publisher is required';
    }

    if (formData.basePrice <= 0) {
      newErrors.basePrice = 'Base Price must be greater than 0';
    }

    if (formData.internalCost < 0) {
      newErrors.internalCost = 'Internal Cost cannot be negative';
    }

    if (formData.basePrice <= formData.internalCost) {
      newErrors.basePrice = 'Base Price must be greater than Internal Cost';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      spamScore: formData.spamScore || undefined,
    };

    try {
      await onSubmit(submitData);
    } catch (error: any) {
      console.error('Form submission error:', error);
      setSubmitError(error.response?.data?.error || 'Failed to save site. Please try again.');
    }
  };

  const handleClose = () => {
    setFormData({
      domain: '',
      domainAuthority: 0,
      domainRating: 0,
      monthlyTraffic: 0,
      spamScore: undefined,
      turnaroundTime: '',
      category: '',
      language: 'English',
      country: '',
      basePrice: 0,
      internalCost: 0,
      publisherId: '',
    });
    setErrors({});
    setSubmitError('');
    onClose();
  };

  const calculateDisplayedPrice = () => {
    if (formData.basePrice <= 0) return 0;
    return formData.basePrice * 1.25; // Base Price + 25%
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {site ? 'Edit Guest Blog Site' : 'Add New Guest Blog Site'}
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Site URL */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Site URL"
                value={formData.domain}
                onChange={(e) => handleChange('domain', e.target.value)}
                error={!!errors.domain}
                helperText={errors.domain}
                placeholder="https://example.com"
                disabled={loading}
                required
              />
            </Grid>

            {/* Publisher */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.publisherId} required>
                <InputLabel>Publisher</InputLabel>
                <Select
                  value={formData.publisherId}
                  label="Publisher"
                  onChange={(e) => handleChange('publisherId', e.target.value)}
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>Select Publisher</em>
                  </MenuItem>
                  {publishers.map((publisher) => (
                    <MenuItem key={publisher.id} value={publisher.id}>
                      {publisher.publisherName}
                    </MenuItem>
                  ))}
                </Select>
                {errors.publisherId && (
                  <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                    {errors.publisherId}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Domain Authority (DA) */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="DA (Domain Authority)"
                type="number"
                value={formData.domainAuthority}
                onChange={(e) => handleChange('domainAuthority', parseInt(e.target.value) || 0)}
                error={!!errors.domainAuthority}
                helperText={errors.domainAuthority}
                disabled={loading}
                inputProps={{ min: 0, max: 100 }}
                required
              />
            </Grid>

            {/* DR (Domain Rating) */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="DR (Domain Rating)"
                type="number"
                value={formData.domainRating}
                onChange={(e) => handleChange('domainRating', parseInt(e.target.value) || 0)}
                error={!!errors.domainRating}
                helperText={errors.domainRating}
                disabled={loading}
                inputProps={{ min: 0 }}
                required
              />
            </Grid>

            {/* Ahrefs Traffic */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Ahrefs Traffic"
                type="number"
                value={formData.monthlyTraffic}
                onChange={(e) => handleChange('monthlyTraffic', parseInt(e.target.value) || 0)}
                error={!!errors.monthlyTraffic}
                helperText={errors.monthlyTraffic}
                disabled={loading}
                inputProps={{ min: 0 }}
                required
              />
            </Grid>

            {/* Spam Score (SS) */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="SS (Spam Score)"
                type="number"
                value={formData.spamScore || ''}
                onChange={(e) => handleChange('spamScore', parseInt(e.target.value) || 0)}
                error={!!errors.spamScore}
                helperText={errors.spamScore}
                disabled={loading}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            {/* Category */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.category} required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => handleChange('category', e.target.value)}
                  disabled={loading}
                >
                  {SITE_CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
                {errors.category && (
                  <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                    {errors.category}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Country */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                fullWidth
                options={COUNTRIES}
                value={formData.country}
                onChange={(_, newValue) => handleChange('country', newValue || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Country"
                    error={!!errors.country}
                    helperText={errors.country}
                    disabled={loading}
                    required
                  />
                )}
              />
            </Grid>

            {/* Language */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.language} required>
                <InputLabel>Site Language</InputLabel>
                <Select
                  value={formData.language}
                  label="Site Language"
                  onChange={(e) => handleChange('language', e.target.value)}
                  disabled={loading}
                >
                  {SITE_LANGUAGES.map((language) => (
                    <MenuItem key={language} value={language}>
                      {language}
                    </MenuItem>
                  ))}
                </Select>
                {errors.language && (
                  <Typography variant="caption" color="error" sx={{ ml: 2, mt: 0.5 }}>
                    {errors.language}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Turnaround Time (TAT) */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="TAT (Turnaround Time)"
                value={formData.turnaroundTime}
                onChange={(e) => handleChange('turnaroundTime', e.target.value)}
                error={!!errors.turnaroundTime}
                helperText={errors.turnaroundTime}
                placeholder="e.g., 7 days, 2 weeks"
                disabled={loading}
                required
              />
            </Grid>

            {/* Base Price */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Base Price ($)"
                type="number"
                value={formData.basePrice}
                onChange={(e) => handleChange('basePrice', parseFloat(e.target.value) || 0)}
                error={!!errors.basePrice}
                helperText={errors.basePrice}
                disabled={loading}
                inputProps={{ min: 0, step: '0.01' }}
                required
              />
            </Grid>

            {/* Displayed Price (Read-only) */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Displayed Price (Base + 25%)"
                value={calculateDisplayedPrice()}
                InputProps={{
                  readOnly: true,
                }}
                disabled={loading}
                helperText="This is what clients will see"
              />
            </Grid>

            {/* Internal Cost */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Internal Cost ($)"
                type="number"
                value={formData.internalCost}
                onChange={(e) => handleChange('internalCost', parseFloat(e.target.value) || 0)}
                error={!!errors.internalCost}
                helperText={errors.internalCost}
                disabled={loading}
                inputProps={{ min: 0, step: '0.01' }}
                required
              />
            </Grid>

            {/* Price Validation Helper */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  💰 <strong>Price Validation:</strong> Base Price must be greater than Internal Cost
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  💰 <strong>Displayed Price:</strong> Base Price + 25% = ${calculateDisplayedPrice().toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {submitError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {submitError}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {site ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default SiteForm;
