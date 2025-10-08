import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { DataEntryService } from '../../services/dataEntryService';

interface BulkImportProps {
  open: boolean;
  onClose: () => void;
  type: 'sites' | 'clients' | 'publishers';
  onSuccess: () => void;
}

interface ImportResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

const BulkImport: React.FC<BulkImportProps> = ({
  open,
  onClose,
  type,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const steps = ['Upload File', 'Preview Data', 'Import Results'];

  const getRequiredColumns = () => {
    switch (type) {
      case 'sites':
        return ['domain', 'domainRating', 'monthlyTraffic', 'category', 'clientPrice', 'internalCost', 'publisherId'];
      case 'clients':
        return ['name', 'email'];
      case 'publishers':
        return ['name', 'email'];
      default:
        return [];
    }
  };

  const getSampleData = () => {
    switch (type) {
      case 'sites':
        return `domain,domainRating,monthlyTraffic,category,language,country,turnaroundTime,clientPrice,internalCost,publisherId
example.com,45,25000,Technology,en,US,7,350.00,200.00,publisher-id-1
techblog.net,52,45000,Technology,en,US,10,450.00,280.00,publisher-id-2`;
      case 'clients':
        return `name,email,phone,address,billingEmail,currency
TechCorp Inc,billing@techcorp.com,+1-555-0123,"123 Tech St, CA",accounting@techcorp.com,USD
Digital Agency,contact@agency.com,+1-555-0456,"456 Marketing Ave, NY",finance@agency.com,USD`;
      case 'publishers':
        return `name,email,phone,website,paymentMethod,paymentEmail
Tech Blog Network,editor@techblog.com,+1-555-0789,https://techblog.com,PayPal,payments@techblog.com
Marketing Hub,content@mhub.com,+1-555-0321,https://marketinghub.com,Bank Transfer,`;
      default:
        return '';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      parseCSV(uploadedFile);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1, 6).map(line => { // Preview first 5 rows
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      }).filter(row => Object.values(row).some(val => val)); // Remove empty rows

      setPreview(data);
      setActiveStep(1);
    };
    reader.readAsText(file);
  };

  const validateData = () => {
    const requiredColumns = getRequiredColumns();
    const headers = preview.length > 0 ? Object.keys(preview[0]) : [];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    return {
      isValid: missingColumns.length === 0,
      missingColumns,
      headers,
    };
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      let result;
      switch (type) {
        case 'sites':
          result = await DataEntryService.importSitesFromCSV(file);
          break;
        default:
          throw new Error(`Import not implemented for ${type}`);
      }

      setResult({
        success: true,
        message: `Successfully imported ${result.imported} ${type}`,
        data: result,
      });
      setActiveStep(2);
      onSuccess();
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.message || 'Import failed',
        errors: error.response?.data?.errors || [error.message],
      });
      setActiveStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setFile(null);
    setPreview([]);
    setResult(null);
    onClose();
  };

  const downloadSample = () => {
    const sampleData = getSampleData();
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_${type}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validation = validateData();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Bulk Import {type.charAt(0).toUpperCase() + type.slice(1)}
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Step 1: Upload File */}
        {activeStep === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Upload a CSV file with your {type} data. Make sure to include all required columns.
            </Alert>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <Button
                variant="outlined"
                onClick={downloadSample}
                size="small"
              >
                Download Sample CSV
              </Button>
            </Box>

            <Paper
              sx={{
                p: 4,
                textAlign: 'center',
                border: '2px dashed #ccc',
                cursor: 'pointer',
                '&:hover': { borderColor: 'primary.main' },
              }}
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {file ? file.name : 'Click to upload CSV file'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Supported format: CSV files only
              </Typography>
            </Paper>

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Required columns:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {getRequiredColumns().map((col) => (
                  <Chip key={col} label={col} size="small" variant="outlined" />
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* Step 2: Preview Data */}
        {activeStep === 1 && (
          <Box>
            {!validation.isValid && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Missing required columns: {validation.missingColumns.join(', ')}
              </Alert>
            )}

            <Typography variant="h6" gutterBottom>
              Data Preview (first 5 rows)
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {validation.headers.map((header) => (
                      <TableCell key={header}>
                        {header}
                        {getRequiredColumns().includes(header) && (
                          <Chip label="Required" size="small" color="primary" sx={{ ml: 1 }} />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((row, index) => (
                    <TableRow key={index}>
                      {validation.headers.map((header) => (
                        <TableCell key={header}>
                          {row[header]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Step 3: Import Results */}
        {activeStep === 2 && result && (
          <Box>
            <Alert 
              severity={result.success ? 'success' : 'error'} 
              icon={result.success ? <SuccessIcon /> : <ErrorIcon />}
              sx={{ mb: 2 }}
            >
              {result.message}
            </Alert>

            {result.success && result.data && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Import Summary
                </Typography>
                <Typography>• Imported: {result.data.imported} records</Typography>
                <Typography>• Skipped: {result.data.skipped || 0} records</Typography>
                <Typography>• Errors: {result.data.errors || 0} records</Typography>
              </Box>
            )}

            {!result.success && result.errors && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Errors:
                </Typography>
                {result.errors.map((error, index) => (
                  <Typography key={index} color="error" variant="body2">
                    • {error}
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>
          {activeStep === 2 ? 'Close' : 'Cancel'}
        </Button>
        
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={handleImport}
            disabled={!validation.isValid || loading}
          >
            Import Data
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default BulkImport;
