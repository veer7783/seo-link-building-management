/**
 * Preview Table Step Component
 * Third step in bulk upload process - preview and validate data
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Button,
  Alert,
  Chip,
  Grid,
  TablePagination,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import { BulkUploadPreview, PreviewRow } from '../../services/bulkUploadService';
import { formatRoundedPrice } from '../../utils/priceRounding';
import {
  CheckCircle as ValidIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  ArrowForward as NextIcon,
} from '@mui/icons-material';

interface PreviewTableStepProps {
  previewData: PreviewRow[];
  selectedRows: number[];
  onSelectionChange: (selectedRows: number[]) => void;
  onComplete: (selectedRows: number[]) => void;
  loading: boolean;
}

const PreviewTableStep: React.FC<PreviewTableStepProps> = ({
  previewData,
  selectedRows,
  onSelectionChange,
  onComplete,
  loading,
}) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  const validRows = previewData.filter(row => row.isValid);
  const invalidRows = previewData.filter(row => !row.isValid);

  useEffect(() => {
    // Reset page when data changes
    setPage(0);
  }, [previewData]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allValidRowIndexes = validRows.map(row => row.rowIndex);
      onSelectionChange(allValidRowIndexes);
    } else {
      onSelectionChange([]);
    }
  };

  const handleRowSelect = (rowIndex: number, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedRows, rowIndex]);
    } else {
      onSelectionChange(selectedRows.filter(id => id !== rowIndex));
    }
  };

  const toggleErrorExpansion = (rowIndex: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(rowIndex)) {
      newExpanded.delete(rowIndex);
    } else {
      newExpanded.add(rowIndex);
    }
    setExpandedErrors(newExpanded);
  };

  const handleNext = () => {
    onComplete(selectedRows);
  };

  const formatPrice = (price: number) => {
    return formatRoundedPrice(price);
  };

  const getStatusChip = (status: string) => {
    const color = status === 'ACTIVE' ? 'success' : 'default';
    return <Chip label={status} color={color} size="small" />;
  };

  const paginatedData = previewData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const isAllValidSelected = validRows.length > 0 && 
    validRows.every(row => selectedRows.includes(row.rowIndex));

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Preview & Validate Data
      </Typography>
      
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        Review the parsed data below. Select the rows you want to import and click "Continue" to proceed.
      </Typography>

      {/* Summary Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Alert severity="info" sx={{ flex: 1 }}>
          <Typography variant="subtitle2">
            Total Rows: {previewData.length}
          </Typography>
        </Alert>
        <Alert severity="success" sx={{ flex: 1 }}>
          <Typography variant="subtitle2">
            Valid Rows: {validRows.length}
          </Typography>
        </Alert>
        <Alert severity="error" sx={{ flex: 1 }}>
          <Typography variant="subtitle2">
            Invalid Rows: {invalidRows.length}
          </Typography>
        </Alert>
        <Alert severity="warning" sx={{ flex: 1 }}>
          <Typography variant="subtitle2">
            Selected: {selectedRows.length}
          </Typography>
        </Alert>
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedRows.length > 0 && !isAllValidSelected}
                  checked={isAllValidSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Site URL</TableCell>
              <TableCell align="center">DA</TableCell>
              <TableCell align="center">DR</TableCell>
              <TableCell align="center">Traffic</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Country</TableCell>
              <TableCell>Publisher Email</TableCell>
              <TableCell align="right">Base Price</TableCell>
              <TableCell align="right">Display Price</TableCell>
              <TableCell>Site Status</TableCell>
              <TableCell>Errors</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedData.map((row) => (
              <React.Fragment key={row.rowIndex}>
                <TableRow
                  sx={{
                    backgroundColor: row.isValid ? 'transparent' : 'error.light',
                    opacity: row.isValid ? 1 : 0.7,
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedRows.includes(row.rowIndex)}
                      onChange={(e) => handleRowSelect(row.rowIndex, e.target.checked)}
                      disabled={!row.isValid}
                    />
                  </TableCell>
                  <TableCell>
                    {row.isValid ? (
                      <ValidIcon color="success" />
                    ) : (
                      <Tooltip title="Click to see errors">
                        <IconButton
                          size="small"
                          onClick={() => toggleErrorExpansion(row.rowIndex)}
                        >
                          <ErrorIcon color="error" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.site_url}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{row.da}</TableCell>
                  <TableCell align="center">{row.dr}</TableCell>
                  <TableCell align="center">{row.ahrefs_traffic?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip label={row.category} size="small" />
                  </TableCell>
                  <TableCell>{row.country}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {row.publisher}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatPrice(row.base_price)}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {formatPrice(row.displayed_price)}
                    </Typography>
                  </TableCell>
                  <TableCell>{getStatusChip(row.status)}</TableCell>
                  <TableCell>
                    {row.errors.length > 0 && (
                      <Chip 
                        label={`${row.errors.length} error${row.errors.length > 1 ? 's' : ''}`}
                        color="error"
                        size="small"
                        onClick={() => toggleErrorExpansion(row.rowIndex)}
                      />
                    )}
                  </TableCell>
                </TableRow>
                
                {/* Error Details Row */}
                {row.errors.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={13} sx={{ py: 0 }}>
                      <Collapse in={expandedErrors.has(row.rowIndex)}>
                        <Box sx={{ p: 2, backgroundColor: 'error.light' }}>
                          <Typography variant="subtitle2" gutterBottom>
                            Validation Errors:
                          </Typography>
                          {row.errors.map((error, index) => (
                            <Alert key={index} severity="error" sx={{ mb: 1 }}>
                              <Typography variant="body2">
                                <strong>{error.field}:</strong> {error.error}
                                {error.value && (
                                  <span> (Value: "{error.value}")</span>
                                )}
                              </Typography>
                            </Alert>
                          ))}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      <TablePagination
        component="div"
        count={previewData.length}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 20, 50]}
      />

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
        <Box>
          <Button
            variant="outlined"
            onClick={() => handleSelectAll(true)}
            disabled={validRows.length === 0}
            sx={{ mr: 1 }}
          >
            Select All Valid ({validRows.length})
          </Button>
          <Button
            variant="outlined"
            onClick={() => handleSelectAll(false)}
            disabled={selectedRows.length === 0}
          >
            Deselect All
          </Button>
        </Box>

        <Button
          variant="contained"
          onClick={handleNext}
          disabled={selectedRows.length === 0}
          startIcon={<NextIcon />}
        >
          Continue with {selectedRows.length} Sites
        </Button>
      </Box>

      {selectedRows.length === 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Please select at least one valid row to continue.
        </Alert>
      )}
    </Box>
  );
};

export default PreviewTableStep;
