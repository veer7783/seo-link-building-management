import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
} from '@mui/material';
import { CreateProjectData, UpdateProjectData, Project } from '../../types';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface ProjectFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProjectData | UpdateProjectData) => Promise<void>;
  project?: Project;
  clients: Client[];
  loading?: boolean;
}

const ProjectForm: React.FC<ProjectFormProps> = ({
  open,
  onClose,
  onSubmit,
  project,
  clients,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    projectName: project?.projectName || '',
    websiteUrl: project?.websiteUrl || '',
    companyName: project?.companyName || '',
    clientId: project?.clientId || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Keep local form state in sync when dialog opens or selected project changes
  useEffect(() => {
    setFormData({
      projectName: project?.projectName || '',
      websiteUrl: project?.websiteUrl || '',
      companyName: project?.companyName || '',
      clientId: project?.clientId || '',
    });
  }, [project, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.projectName.trim()) {
      newErrors.projectName = 'Project name is required';
    }

    if (!formData.clientId) {
      newErrors.clientId = 'Client is required';
    }

    // Validate URL if provided
    if (formData.websiteUrl && formData.websiteUrl.trim()) {
      try {
        new URL(formData.websiteUrl);
      } catch {
        newErrors.websiteUrl = 'Please enter a valid URL (e.g., https://example.com)';
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
      const payload: CreateProjectData | UpdateProjectData = {
        projectName: formData.projectName,
        websiteUrl: formData.websiteUrl || undefined,
        companyName: formData.companyName || undefined,
        clientId: formData.clientId,
      };

      await onSubmit(payload);
      onClose();
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      // Handle validation errors from backend
      if (error.response?.data?.errors) {
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
      projectName: '',
      websiteUrl: '',
      companyName: '',
      clientId: '',
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {project ? 'Edit Project' : 'Add New Project'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Project Name"
                  value={formData.projectName}
                  onChange={(e) => handleChange('projectName', e.target.value)}
                  error={!!errors.projectName}
                  helperText={errors.projectName}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth error={!!errors.clientId} required>
                  <InputLabel>Client</InputLabel>
                  <Select
                    value={formData.clientId}
                    label="Client"
                    onChange={(e) => handleChange('clientId', e.target.value)}
                  >
                    <MenuItem value="">Select Client</MenuItem>
                    {clients.map((client) => (
                      <MenuItem key={client.id} value={client.id}>
                        {client.name} ({client.email})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.clientId && (
                    <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5, ml: 1.75 }}>
                      {errors.clientId}
                    </Box>
                  )}
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Website URL"
                  value={formData.websiteUrl}
                  onChange={(e) => handleChange('websiteUrl', e.target.value)}
                  error={!!errors.websiteUrl}
                  helperText={errors.websiteUrl || 'Optional - Enter full URL (e.g., https://example.com)'}
                  placeholder="https://example.com"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={formData.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  error={!!errors.companyName}
                  helperText={errors.companyName || 'Optional - Company name for this project'}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={loading}
          >
            {loading ? 'Saving...' : (project ? 'Update' : 'Create')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ProjectForm;
