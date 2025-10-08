import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { publisherService } from '../../services/publisherService';
import {
  GuestBlogSite,
  CreateGuestBlogSiteRequest,
  UpdateGuestBlogSiteRequest,
  GuestBlogSiteCategory,
  GuestBlogSiteStatus,
  GUEST_BLOG_SITE_CATEGORIES,
  COUNTRIES,
  SITE_LANGUAGES,
} from '../../types/guestBlogSite';

// Client-side URL normalization function
const normalizeUrl = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return input;
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return trimmed;
  }

  // Check if URL already has a protocol
  const hasProtocol = /^https?:\/\//i.test(trimmed);
  
  if (hasProtocol) {
    // User explicitly provided protocol, preserve it
    return trimmed;
  } else {
    // No protocol provided, default to https://
    return `https://${trimmed}`;
  }
};

interface GuestBlogSiteFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGuestBlogSiteRequest | UpdateGuestBlogSiteRequest) => void;
  site?: GuestBlogSite;
  loading?: boolean;
  isAdmin: boolean;
}

const GuestBlogSiteForm: React.FC<GuestBlogSiteFormProps> = ({
  open,
  onClose,
  onSubmit,
  site,
  loading = false,
  isAdmin,
}) => {
  const [formData, setFormData] = useState({
    site_url: '',
    da: 0,
    dr: 0,
    ahrefs_traffic: 0,
    ss: 0,
    tat: '',
    category: '' as GuestBlogSiteCategory | '',
    status: GuestBlogSiteStatus.ACTIVE,
    base_price: 0,
    country: '',
    publisher_id: '',
    site_language: 'en',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch publishers for dropdown
  const { data: publishersData } = useQuery({
    queryKey: ['publishers'],
    queryFn: () => publisherService.getPublishers({ limit: 1000 }),
  });

  const publishers = publishersData?.data || [];

  useEffect(() => {
    if (site) {
      setFormData({
        site_url: site.site_url,
        da: site.da,
        dr: site.dr,
        ahrefs_traffic: site.ahrefs_traffic,
        ss: site.ss || 0,
        tat: site.tat,
        category: site.category,
        status: site.status,
        base_price: site.base_price,
        country: site.country,
        publisher_id: site.publisher_id,
        site_language: site.site_language,
      });
    } else {
      setFormData({
        site_url: '',
        da: 0,
        dr: 0,
        ahrefs_traffic: 0,
        ss: 0,
        tat: '',
        category: '',
        status: GuestBlogSiteStatus.ACTIVE,
        base_price: 0,
        country: '',
        publisher_id: '',
        site_language: 'en',
      });
    }
    setErrors({});
  }, [site, open]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.site_url.trim()) {
      newErrors.site_url = 'Site URL is required';
    } else {
      // Validate URL format after normalization
      try {
        const normalizedUrl = normalizeUrl(formData.site_url);
        new URL(normalizedUrl); // This will throw if invalid
      } catch {
        newErrors.site_url = 'Please enter a valid domain or URL';
      }
    }

    if (formData.da < 0 || formData.da > 100) {
      newErrors.da = 'Domain Authority must be between 0 and 100';
    }

    if (formData.dr < 0 || formData.dr > 100) {
      newErrors.dr = 'Domain Rating must be between 0 and 100';
    }

    if (formData.ahrefs_traffic < 0) {
      newErrors.ahrefs_traffic = 'Ahrefs Traffic must be positive';
    }

    if (formData.ss && (formData.ss < 0 || formData.ss > 100)) {
      newErrors.ss = 'Spam Score must be between 0 and 100';
    }

    if (!formData.tat.trim()) {
      newErrors.tat = 'Turnaround Time is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.base_price <= 0) {
      newErrors.base_price = 'Base Price must be greater than 0';
    }

    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }

    if (!formData.publisher_id) {
      newErrors.publisher_id = 'Publisher is required';
    }

    if (!formData.site_language.trim()) {
      newErrors.site_language = 'Site Language is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      da: Number(formData.da),
      dr: Number(formData.dr),
      ahrefs_traffic: Number(formData.ahrefs_traffic),
      ss: formData.ss ? Number(formData.ss) : undefined,
      base_price: Number(formData.base_price),
      category: formData.category as GuestBlogSiteCategory,
    };

    onSubmit(submitData);
  };

  const calculateDisplayedPrice = (basePrice: number): number => {
    return basePrice + (basePrice * 0.25); // Default 25% markup
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {site ? 'Edit Guest Blog Site' : 'Add New Guest Blog Site'}
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Site URL */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Site URL"
                value={formData.site_url}
                onChange={(e) => handleChange('site_url', e.target.value)}
                onBlur={(e) => {
                  // Auto-normalize URL on blur
                  const normalizedUrl = normalizeUrl(e.target.value);
                  if (normalizedUrl !== e.target.value) {
                    handleChange('site_url', normalizedUrl);
                  }
                }}
                error={!!errors.site_url}
                helperText={errors.site_url || "Enter domain (e.g., example.com) or full URL. Will auto-add https:// if needed."}
                required
                placeholder="Enter domain or full URL (e.g., example.com or https://example.com)"
              />
            </Grid>

            {/* DA and DR */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Domain Authority (DA)"
                type="number"
                value={formData.da}
                onChange={(e) => handleChange('da', e.target.value)}
                error={!!errors.da}
                helperText={errors.da}
                inputProps={{ min: 0, max: 100 }}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Domain Rating (DR)"
                type="number"
                value={formData.dr}
                onChange={(e) => handleChange('dr', e.target.value)}
                error={!!errors.dr}
                helperText={errors.dr}
                inputProps={{ min: 0, max: 100 }}
                required
              />
            </Grid>

            {/* Ahrefs Traffic and Spam Score */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Ahrefs Traffic"
                type="number"
                value={formData.ahrefs_traffic}
                onChange={(e) => handleChange('ahrefs_traffic', e.target.value)}
                error={!!errors.ahrefs_traffic}
                helperText={errors.ahrefs_traffic}
                inputProps={{ min: 0 }}
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Spam Score (SS)"
                type="number"
                value={formData.ss}
                onChange={(e) => handleChange('ss', e.target.value)}
                error={!!errors.ss}
                helperText={errors.ss}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            {/* TAT */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Turnaround Time (TAT)"
                value={formData.tat}
                onChange={(e) => handleChange('tat', e.target.value)}
                error={!!errors.tat}
                helperText={errors.tat || 'e.g., "3-5 days", "1 week"'}
                required
              />
            </Grid>

            {/* Category */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.category}>
                <InputLabel>Category *</InputLabel>
                <Select
                  value={formData.category}
                  label="Category *"
                  onChange={(e) => handleChange('category', e.target.value)}
                >
                  {GUEST_BLOG_SITE_CATEGORIES.map((category) => (
                    <MenuItem key={category.value} value={category.value}>
                      {category.label}
                    </MenuItem>
                  ))}
                </Select>
                {errors.category && (
                  <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                    {errors.category}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Status */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  label="Status"
                  onChange={(e) => handleChange('status', e.target.value)}
                >
                  <MenuItem value={GuestBlogSiteStatus.ACTIVE}>Active</MenuItem>
                  <MenuItem value={GuestBlogSiteStatus.INACTIVE}>Inactive</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Country */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={COUNTRIES}
                getOptionLabel={(option) => option.label}
                value={COUNTRIES.find(c => c.value === formData.country) || null}
                onChange={(_, newValue) => handleChange('country', newValue?.value || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Country *"
                    error={!!errors.country}
                    helperText={errors.country}
                    required
                  />
                )}
              />
            </Grid>

            {/* Site Language */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={SITE_LANGUAGES}
                getOptionLabel={(option) => option.label}
                value={SITE_LANGUAGES.find(l => l.value === formData.site_language) || null}
                onChange={(_, newValue) => handleChange('site_language', newValue?.value || 'en')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Site Language *"
                    error={!!errors.site_language}
                    helperText={errors.site_language}
                    required
                  />
                )}
              />
            </Grid>

            {/* Publisher */}
            <Grid item xs={12}>
              <FormControl fullWidth error={!!errors.publisher_id}>
                <InputLabel>Publisher *</InputLabel>
                <Select
                  value={formData.publisher_id}
                  label="Publisher *"
                  onChange={(e) => handleChange('publisher_id', e.target.value)}
                >
                  {publishers.map((publisher) => (
                    <MenuItem key={publisher.id} value={publisher.id}>
                      {publisher.publisherName}
                    </MenuItem>
                  ))}
                </Select>
                {errors.publisher_id && (
                  <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                    {errors.publisher_id}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Price (Internal Base Price) */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Price ($)"
                type="number"
                value={formData.base_price}
                onChange={(e) => handleChange('base_price', e.target.value)}
                error={!!errors.base_price}
                helperText={errors.base_price || 'Enter the base price (25% markup will be applied for display)'}
                inputProps={{ min: 0, step: 0.01 }}
                required
              />
            </Grid>

            {/* Displayed Price Preview */}
            <Grid item xs={12} md={6}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Displayed Price (Base + 25%):
                </Typography>
                <Typography variant="h6" color="primary">
                  ${calculateDisplayedPrice(Number(formData.base_price) || 0).toFixed(2)}
                </Typography>
              </Box>
            </Grid>

            {/* Info Alert */}
            <Grid item xs={12}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Pricing Logic:</strong> The base price is stored internally. 
                  The displayed price will be calculated as Base Price + 25% markup by default, 
                  or using client-specific percentage if configured.
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !isAdmin}
          >
            {loading ? 'Saving...' : site ? 'Update Site' : 'Create Site'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default GuestBlogSiteForm;
