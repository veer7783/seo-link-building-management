/**
 * Column Mapping Step Component
 * Second step in bulk upload process - map CSV columns to GuestBlogSite fields
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Paper,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';

import { type ColumnMapping } from '../../services/bulkUploadService';

interface GuestBlogSiteColumn {
  key: string;
  label: string;
  required: boolean;
}

interface ColumnMappingStepProps {
  availableColumns: string[];
  guestBlogSiteColumns: GuestBlogSiteColumn[];
  initialMappings: ColumnMapping[];
  onMappingComplete: (mappings: ColumnMapping[]) => void;
  loading: boolean;
}

const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({
  availableColumns,
  guestBlogSiteColumns,
  initialMappings,
  onMappingComplete,
  loading,
}) => {
  const [mappings, setMappings] = useState<ColumnMapping[]>(initialMappings);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    setMappings(initialMappings);
  }, [initialMappings]);

  const handleMappingChange = (guestBlogSiteField: string, csvColumn: string) => {
    setMappings(prev => {
      // Remove existing mapping for this field
      const filtered = prev.filter(m => m.guestBlogSiteField !== guestBlogSiteField);
      
      // Add new mapping if column is selected
      if (csvColumn) {
        // Remove any existing mapping for this CSV column
        const finalFiltered = filtered.filter(m => m.csvColumn !== csvColumn);
        return [...finalFiltered, { csvColumn, guestBlogSiteField }];
      }
      
      return filtered;
    });
  };

  const validateMappings = (): string[] => {
    const validationErrors: string[] = [];
    
    // Check required fields are mapped
    const requiredFields = guestBlogSiteColumns.filter(col => col.required);
    const mappedFields = mappings.map(m => m.guestBlogSiteField);
    
    requiredFields.forEach(field => {
      if (!mappedFields.includes(field.key)) {
        validationErrors.push(`Required field "${field.label}" must be mapped`);
      }
    });

    // Check for duplicate CSV column mappings
    const csvColumns = mappings.map(m => m.csvColumn);
    const duplicates = csvColumns.filter((col, index) => csvColumns.indexOf(col) !== index);
    
    if (duplicates.length > 0) {
      validationErrors.push(`CSV columns cannot be mapped to multiple fields: ${duplicates.join(', ')}`);
    }

    return validationErrors;
  };

  const handleNext = () => {
    const validationErrors = validateMappings();
    setErrors(validationErrors);
    
    if (validationErrors.length === 0) {
      onMappingComplete(mappings);
    }
  };

  const getMappedCsvColumn = (guestBlogSiteField: string): string => {
    const mapping = mappings.find(m => m.guestBlogSiteField === guestBlogSiteField);
    return mapping?.csvColumn || '';
  };

  const getUsedCsvColumns = (): string[] => {
    return mappings.map(m => m.csvColumn);
  };

  const getMappingStatus = (field: GuestBlogSiteColumn) => {
    const isMapped = mappings.some(m => m.guestBlogSiteField === field.key);
    
    if (field.required && !isMapped) {
      return { icon: <ErrorIcon color="error" />, color: 'error' as const };
    } else if (isMapped) {
      return { icon: <CheckIcon color="success" />, color: 'success' as const };
    }
    
    return { icon: null, color: 'default' as const };
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Map CSV Columns to Guest Blog Site Fields
      </Typography>
      
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Map your CSV file columns to the corresponding guest blog site fields. 
        Required fields must be mapped to proceed.
      </Typography>

      {errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Please fix the following errors:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Available CSV Columns:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {availableColumns.map((column) => (
            <Chip
              key={column}
              label={column}
              variant={getUsedCsvColumns().includes(column) ? 'filled' : 'outlined'}
              color={getUsedCsvColumns().includes(column) ? 'primary' : 'default'}
            />
          ))}
        </Box>
      </Paper>

      <Grid container spacing={2}>
        {guestBlogSiteColumns.map((field) => {
          const status = getMappingStatus(field);
          
          return (
            <Grid item xs={12} md={6} key={field.key}>
              <FormControl fullWidth>
                <InputLabel>
                  {field.label} {field.required && '*'}
                </InputLabel>
                <Select
                  value={getMappedCsvColumn(field.key)}
                  label={`${field.label} ${field.required ? '*' : ''}`}
                  onChange={(e) => handleMappingChange(field.key, e.target.value)}
                  startAdornment={status.icon}
                  error={status.color === 'error'}
                >
                  <MenuItem value="">
                    <em>Not mapped</em>
                  </MenuItem>
                  {availableColumns.map((column) => (
                    <MenuItem 
                      key={column} 
                      value={column}
                      disabled={getUsedCsvColumns().includes(column) && getMappedCsvColumn(field.key) !== column}
                    >
                      {column}
                      {getUsedCsvColumns().includes(column) && getMappedCsvColumn(field.key) !== column && ' (already used)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          );
        })}
      </Grid>

      {/* Mapping Summary */}
      <Paper sx={{ p: 3, mt: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="subtitle1" gutterBottom>
          Mapping Summary:
        </Typography>
        <Grid container spacing={1}>
          {mappings.map((mapping, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {guestBlogSiteColumns.find(col => col.key === mapping.guestBlogSiteField)?.label}:
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {mapping.csvColumn}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
        
        {mappings.length === 0 && (
          <Typography variant="body2" color="textSecondary" fontStyle="italic">
            No columns mapped yet
          </Typography>
        )}
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={loading || mappings.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <NextIcon />}
        >
          {loading ? 'Generating Preview...' : 'Generate Preview'}
        </Button>
      </Box>
    </Box>
  );
};

export default ColumnMappingStep;
