/**
 * Bulk Upload Modal for Guest Blog Sites
 * Multi-step process: File Upload -> Column Mapping -> Preview -> Save
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

import { bulkUploadService, type ColumnMapping, type PreviewRow } from '../../services/bulkUploadService';
import { clientService } from '../../services/clientService';
import FileUploadStep from './FileUploadStep';
import ColumnMappingStep from './ColumnMappingStep';
import PreviewTableStep from './PreviewTableStep';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const steps = ['Upload File', 'Map Columns', 'Preview & Validate', 'Save'];

const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parseData, setParseData] = useState<any>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Get clients for dropdown
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients({ limit: 1000 }),
  });

  const clients = clientsData?.data || [];

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setFile(null);
    setParseData(null);
    setColumnMappings([]);
    setPreviewData([]);
    setSelectedClient('');
    setSelectedRows([]);
    setError('');
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onClose();
  }, [handleReset, onClose]);


  const handleFileUpload = async (uploadedFile: File, clientId?: string) => {
    try {
      setLoading(true);
      setError('');
      setFile(uploadedFile);
      setSelectedClient(clientId || '');

      const data = await bulkUploadService.parseFile(uploadedFile, clientId);
      setParseData(data);
      setColumnMappings(data.autoMappings);
      setActiveStep(1);
    } catch (error: any) {
      setError('Failed to parse file: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMappingComplete = async (mappings: ColumnMapping[]) => {
    try {
      setLoading(true);
      setError('');
      setColumnMappings(mappings);

      if (!file) {
        throw new Error('No file selected');
      }

      const preview = await bulkUploadService.generatePreview(
        file,
        mappings,
        selectedClient || undefined
      );

      setPreviewData(preview.previewData);
      // Select all valid rows by default
      const validRowIndexes = preview.previewData
        .filter(row => row.isValid)
        .map(row => row.rowIndex);
      setSelectedRows(validRowIndexes);
      setActiveStep(2);
    } catch (error: any) {
      setError('Failed to generate preview: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewComplete = (selectedRowIndexes: number[]) => {
    setSelectedRows(selectedRowIndexes);
    setActiveStep(3);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');

      const result = await bulkUploadService.savePreviewData(previewData, selectedRows);

      if (result.errors.length > 0) {
        setError(`Saved ${result.saved} rows. Errors: ${result.errors.join(', ')}`);
      } else {
        onSuccess();
        handleClose();
      }
    } catch (error: any) {
      setError('Failed to save data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(0, prev - 1));
    setError('');
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <FileUploadStep
            onFileUpload={handleFileUpload}
            clients={clients}
            selectedClient={selectedClient}
            onClientChange={setSelectedClient}
            loading={loading}
          />
        );
      case 1:
        return (
          <ColumnMappingStep
            availableColumns={parseData?.availableColumns || []}
            guestBlogSiteColumns={parseData?.guestBlogSiteColumns || []}
            initialMappings={columnMappings}
            onMappingComplete={handleMappingComplete}
            loading={loading}
          />
        );
      case 2:
        return (
          <PreviewTableStep
            previewData={previewData}
            selectedRows={selectedRows}
            onSelectionChange={setSelectedRows}
            onComplete={handlePreviewComplete}
            loading={loading}
          />
        );
      case 3:
        return (
          <Box textAlign="center" py={3}>
            <Typography variant="h6" gutterBottom>
              Ready to Save
            </Typography>
            <Typography variant="body1" color="textSecondary" gutterBottom>
              {selectedRows.length} rows selected for import
            </Typography>
            <Alert severity="info" sx={{ mt: 2 }}>
              Click "Save" to import the selected guest blog sites to your database.
              This action cannot be undone.
            </Alert>
          </Box>
        );
      default:
        return null;
    }
  };

  const getActionButtons = () => {
    switch (activeStep) {
      case 0:
        return (
          <>
            <Button onClick={handleClose}>Cancel</Button>
          </>
        );
      case 1:
        return (
          <>
            <Button onClick={handleBack}>Back</Button>
            <Button onClick={handleClose}>Cancel</Button>
          </>
        );
      case 2:
        return (
          <>
            <Button onClick={handleBack}>Back</Button>
            <Button onClick={handleClose}>Cancel</Button>
          </>
        );
      case 3:
        return (
          <>
            <Button onClick={handleBack}>Back</Button>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={loading || selectedRows.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
            >
              {loading ? 'Saving...' : `Save ${selectedRows.length} Sites`}
            </Button>
          </>
        );
      default:
        return (
          <Button onClick={handleClose}>Close</Button>
        );
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        Bulk Upload Guest Blog Sites
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        {getActionButtons()}
      </DialogActions>
    </Dialog>
  );
};

export default BulkUploadModal;
