import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  InputAdornment,
  TablePagination,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  WhatsApp as WhatsAppIcon,
  Language as WebsiteIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { publisherService, Publisher } from '../services/publisherService';
import PublisherForm from '../components/publishers/PublisherForm';

const PublishersPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedPublisher, setSelectedPublisher] = useState<Publisher | undefined>();
  const [deleteError, setDeleteError] = useState<string>('');

  const queryClient = useQueryClient();

  const { data: publishersData, isLoading, error } = useQuery({
    queryKey: ['publishers', page, rowsPerPage, search],
    queryFn: () => publisherService.getPublishers({
      page: page + 1,
      limit: rowsPerPage,
      search: search || undefined,
    }),
  });

  const createMutation = useMutation({
    mutationFn: publisherService.createPublisher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      publisherService.updatePublisher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
      setFormOpen(false);
      setSelectedPublisher(undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: publisherService.deletePublisher,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
      setDeleteError('');
    },
    onError: (error: any) => {
      setDeleteError(error.response?.data?.error || 'Failed to delete publisher');
    },
  });

  const publishers = publishersData?.data || [];
  const totalCount = publishersData?.pagination?.total || 0;

  const handleSubmit = async (data: any) => {
    if (selectedPublisher) {
      await updateMutation.mutateAsync({ id: selectedPublisher.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (publisher: Publisher) => {
    setSelectedPublisher(publisher);
    setFormOpen(true);
  };

  const handleDelete = (publisher: Publisher) => {
    if (window.confirm(`Are you sure you want to delete ${publisher.publisherName}?`)) {
      deleteMutation.mutate(publisher.id);
    }
  };

  const handleAddNew = () => {
    setSelectedPublisher(undefined);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setSelectedPublisher(undefined);
  };

  const formatCommunicationMode = (mode: string) => {
    return mode === 'EMAIL' ? 'Email' : 'WhatsApp';
  };

  const getCommunicationIcon = (mode: string) => {
    return mode === 'EMAIL' ? <EmailIcon fontSize="small" /> : <WhatsAppIcon fontSize="small" />;
  };

  if (error) {
    return (
      <Box>
        <Alert severity="error">
          Failed to load publishers. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4">Publishers</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddNew}
        >
          Add Publisher
        </Button>
      </Box>

      {deleteError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDeleteError('')}>
          {deleteError}
        </Alert>
      )}

      <Paper sx={{ mb: 3, p: 2 }}>
        <TextField
          fullWidth
          placeholder="Search publishers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Publisher Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Communication</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : publishers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No publishers found
                </TableCell>
              </TableRow>
            ) : (
              publishers.map((publisher) => (
                <TableRow key={publisher.id} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {publisher.publisherName}
                      </Typography>
                      {publisher.whatsapp && (
                        <Typography variant="caption" color="text.secondary">
                          WhatsApp: {publisher.whatsapp}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {publisher.email ? (
                      <Typography variant="body2">
                        {publisher.email}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        No email
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getCommunicationIcon(publisher.modeOfCommunication)}
                      label={formatCommunicationMode(publisher.modeOfCommunication)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={publisher.isActive ? 'Active' : 'Inactive'}
                      color={publisher.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(publisher.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => handleEdit(publisher)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(publisher)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </TableContainer>

      <PublisherForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        publisher={selectedPublisher}
        loading={createMutation.isPending || updateMutation.isPending}
      />
    </Box>
  );
};

export default PublishersPage;
