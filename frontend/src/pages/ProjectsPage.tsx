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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService } from '../services/projectService';
import { clientService } from '../services/clientService';
import ProjectForm from '../components/projects/ProjectForm';
import { Project, CreateProjectData, UpdateProjectData } from '../types';
import { format } from 'date-fns';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  format?: (value: any) => any;
}

const ProjectsPage: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | undefined>();

  const queryClient = useQueryClient();

  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects', { page: page + 1, limit: rowsPerPage, search }],
    queryFn: () => projectService.getProjects({ page: page + 1, limit: rowsPerPage, search }),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients({ limit: 1000 }),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateProjectData) => projectService.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setFormOpen(false);
      setSelectedProject(undefined);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectData }) =>
      projectService.updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setFormOpen(false);
      setSelectedProject(undefined);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setDeleteDialogOpen(false);
      setProjectToDelete(undefined);
    },
    onError: (error: any) => {
      console.error('Delete project error:', error);
      // Keep dialog open to show error message
    },
  });

  const columns: Column[] = [
    { id: 'projectName', label: 'Project Name', minWidth: 200 },
    { id: 'websiteUrl', label: 'Website URL', minWidth: 200 },
    { id: 'client', label: 'Client Name', minWidth: 150 },
    { id: 'companyName', label: 'Company Name', minWidth: 150 },
    {
      id: 'createdAt',
      label: 'Created Date',
      minWidth: 120,
      format: (value: string) => format(new Date(value), 'MMM dd, yyyy'),
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 120,
    },
  ];

  const handleAddProject = () => {
    setSelectedProject(undefined);
    setFormOpen(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setFormOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateProjectData | UpdateProjectData) => {
    if (selectedProject) {
      await updateMutation.mutateAsync({ id: selectedProject.id, data });
    } else {
      await createMutation.mutateAsync(data as CreateProjectData);
    }
  };

  const handleDeleteConfirm = async () => {
    if (projectToDelete) {
      try {
        await deleteMutation.mutateAsync(projectToDelete.id);
      } catch (error) {
        // Error is handled by the mutation's onError callback
        console.error('Delete failed:', error);
      }
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const projects = projectsData?.data || [];
  const totalCount = projectsData?.pagination?.total || 0;
  const clients = clientsData?.data || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Projects
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddProject}
        >
          Add Project
        </Button>
      </Box>

      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {columns.map((column) => (
                  <TableCell
                    key={column.id}
                    style={{ minWidth: column.minWidth }}
                  >
                    {column.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.map((project) => (
                <TableRow hover key={project.id}>
                  <TableCell>{project.projectName}</TableCell>
                  <TableCell>
                    {project.websiteUrl ? (
                      <a
                        href={project.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'none' }}
                      >
                        {project.websiteUrl}
                      </a>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{project.client?.name || '-'}</TableCell>
                  <TableCell>{project.companyName || '-'}</TableCell>
                  <TableCell>
                    {format(new Date(project.createdAt), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEditProject(project)}
                      title="Edit"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteProject(project)}
                      title="Delete"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <ProjectForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedProject(undefined);
        }}
        onSubmit={handleFormSubmit}
        project={selectedProject}
        clients={clients}
        loading={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
          deleteMutation.reset(); // Reset error state
        }}
      >
        <DialogTitle>Delete Project</DialogTitle>
        <DialogContent>
          Are you sure you want to delete the project "{projectToDelete?.projectName}"?
          This action cannot be undone.
          {deleteMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteMutation.error?.response?.data?.error || 'Failed to delete project. Please try again.'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteDialogOpen(false);
            deleteMutation.reset(); // Reset error state
          }}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectsPage;
