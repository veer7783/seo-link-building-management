/**
 * File Upload Step Component
 * First step in bulk upload process
 */

import React, { useCallback, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Grid,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';

interface Client {
  id: string;
  name: string;
  percentage?: number;
}

interface FileUploadStepProps {
  onFileUpload: (file: File, clientId?: string) => void;
  clients: Client[];
  selectedClient: string;
  onClientChange: (clientId: string) => void;
  loading: boolean;
}

const FileUploadStep: React.FC<FileUploadStepProps> = ({
  onFileUpload,
  clients,
  selectedClient,
  onClientChange,
  loading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  }, []);

  const handleFileSelection = (file: File) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!allowedTypes.includes(file.type)) {
      alert('Please select a CSV or Excel file (.csv, .xls, .xlsx)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileUpload(selectedFile, selectedClient || undefined);
    }
  };

  const handleDownloadCSVTemplate = () => {
    // Create CSV content with demo data matching the exact CSV template format
    const csvContent = `Site URL,Domain Authority (DA),Domain Rating (DR),Ahrefs Traffic,Spam Score (SS),Turnaround Time (TAT),Category,Status,Base Price,Country,Publisher,Site Language
https://techcrunch.com,95,94,15000000,2,2-3 days,TECHNOLOGY_GADGETS,ACTIVE,500,US,TechCrunch Editor,en
https://forbes.com/business,92,93,12000000,1,3-5 days,BUSINESS_ENTREPRENEURSHIP,ACTIVE,450,US,Forbes Business Team,en
https://entrepreneur.com,88,87,8500000,3,1-2 days,BUSINESS_ENTREPRENEURSHIP,ACTIVE,400,US,Entrepreneur Magazine,en
https://mashable.com,85,86,7200000,2,2-4 days,TECHNOLOGY_GADGETS,ACTIVE,350,US,Mashable Tech,en
https://businessinsider.com,90,89,9800000,1,3-4 days,BUSINESS_ENTREPRENEURSHIP,ACTIVE,425,US,Business Insider,en
https://healthline.com,82,83,6500000,1,5-7 days,HEALTH_FITNESS,ACTIVE,300,US,Healthline Editorial,en
https://investopedia.com,88,87,3800000,1,3-5 days,FINANCE_INVESTMENT,ACTIVE,375,US,Investopedia Finance,en
https://cnn.com/travel,87,88,8900000,2,3-5 days,TRAVEL_TOURISM,ACTIVE,400,US,CNN Travel,en
https://foodnetwork.com,81,80,3600000,1,4-6 days,FOOD_NUTRITION,ACTIVE,250,US,Food Network,en
https://vogue.com,89,88,4200000,1,7-10 days,FASHION_BEAUTY,ACTIVE,450,US,Vogue Fashion,en`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'guest-blog-sites-demo-template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadExcelTemplate = async () => {
    try {
      // For Excel template, we'll use the backend API endpoint
      const token = localStorage.getItem('token');
      const baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/guest-sites/bulk-upload/template`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'guest-blog-sites-demo-template.xlsx');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
      // Fallback to CSV download
      handleDownloadCSVTemplate();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Upload CSV or Excel File
      </Typography>
      
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Upload a CSV or Excel file containing guest blog sites data. 
        The file should include columns for site URL, DA, DR, traffic, and other required fields.
      </Typography>

      <Grid container spacing={3}>
        {/* Template Download Section */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, mb: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DownloadIcon />
              Download Demo Templates
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
              Get started quickly with our pre-filled demo templates containing realistic guest blog site data.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<FileIcon />}
                onClick={handleDownloadCSVTemplate}
                sx={{ 
                  backgroundColor: 'white', 
                  color: 'primary.main',
                  '&:hover': { backgroundColor: 'grey.100' }
                }}
              >
                Download CSV Template
              </Button>
             
            </Box>
          </Paper>
        </Grid>

        {/* Client Selection */}
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Client (Optional)</InputLabel>
            <Select
              value={selectedClient}
              label="Client (Optional)"
              onChange={(e) => onClientChange(e.target.value)}
            >
              <MenuItem value="">
                <em>No Client (Default 25% markup)</em>
              </MenuItem>
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>
                  {client.name} {client.percentage ? `(${client.percentage}%)` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* File Upload Area */}
        <Grid item xs={12}>
          <Paper
            sx={{
              p: 4,
              textAlign: 'center',
              border: dragActive ? '2px dashed #1976d2' : '2px dashed #ccc',
              backgroundColor: dragActive ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.04)',
              },
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept=".csv,.xls,.xlsx"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />

            {selectedFile ? (
              <Box>
                <FileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {selectedFile.name}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  {formatFileSize(selectedFile.size)}
                </Typography>
                <Button
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  sx={{ mt: 1 }}
                >
                  Remove File
                </Button>
              </Box>
            ) : (
              <Box>
                <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Drop your file here or click to browse
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Supported formats: CSV, Excel (.csv, .xls, .xlsx)
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Maximum file size: 10MB
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Upload Button */}
        {selectedFile && (
          <Grid item xs={12}>
            <Box textAlign="center">
              <Button
                variant="contained"
                size="large"
                onClick={handleUpload}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
              >
                {loading ? 'Processing...' : 'Process File'}
              </Button>
            </Box>
          </Grid>
        )}

        {/* Instructions */}
        <Grid item xs={12}>
          <Alert severity="info">
            <Typography variant="subtitle2" gutterBottom>
              File Requirements & Tips:
            </Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li><strong>Download the demo template above</strong> to see the correct format with sample data</li>
              <li>First row should contain column headers</li>
              <li><strong>Required columns:</strong> All fields except Publisher (which is optional)</li>
              <li><strong>Column order:</strong> Site URL, Publisher, DA, DR, Traffic, SS, Category, Country, Language, TAT, Base Price, Status</li>
              <li>Replace the demo data with your own guest blog sites</li>
              <li>Use exact column names from template for auto-mapping</li>
              <li>Use valid categories: TECHNOLOGY_GADGETS, BUSINESS_ENTREPRENEURSHIP, etc.</li>
            </ul>
          </Alert>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FileUploadStep;
