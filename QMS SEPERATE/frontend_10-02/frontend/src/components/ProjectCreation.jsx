// Project Management – Desktop productivity style (Material UI)
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ThemeProvider,
  createTheme,
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  TablePagination,
  Grid,
  Tooltip,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Plus, Edit2, Trash2, Folder, Eye, Search, FolderOpen, Clock, LayoutDashboard, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { NavContext } from '../App';
import useProjectStore from '../store/projectCreation';

const EMPTY_VALUE = '—';

const SECTION_SPACING = 3; // 24px
const INNER_SPACING = 2;   // 16px

const theme = createTheme({
  typography: {
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    subtitle1: { fontWeight: 500, fontSize: '0.9375rem' },
    body2: { fontSize: '0.8125rem' },
  },
  palette: {
    mode: 'light',
    primary: { main: '#374151' },
    secondary: { main: '#6b7280' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    text: { primary: '#111827', secondary: '#6b7280', disabled: '#9ca3af' },
    divider: '#e5e7eb',
    action: { hover: '#e5e7eb', selected: '#d1d5db' },
  },
  shape: { borderRadius: 4 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 500 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', boxShadow: 'none' },
      },
    },
  },
});

const ProjectCreation = () => {
  const navigate = useNavigate();
  const { setActiveNav } = useContext(NavContext);
  const {
    projects,
    updateProject,
    deleteProject,
    setSelectedProject,
    createProject,
    fetchProjects,
    fetchProjectDetails,
    validateProjectCompletion,
    loading,
    error,
    clearError,
  } = useProjectStore();

  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [modalData, setModalData] = useState({
    project_number: '',
    name: '',
    customer_details: '',
    reference_no: '',
    id: Date.now().toString(),
    created: new Date().toISOString().split('T')[0],
    status: 'Active',
    is_completed: false,
    editId: null,
  });

  useEffect(() => {
    fetchProjects().catch(console.error);
  }, [fetchProjects]);

  const top3RecentIds = useMemo(() => {
    const sorted = [...projects].sort(
      (a, b) => new Date(b.created_at || b.created || 0) - new Date(a.created_at || a.created || 0)
    );
    return new Set(sorted.slice(0, 3).map((p) => p.id));
  }, [projects]);

  const isRecentProject = (id) => top3RecentIds.has(id);

  const filteredAndSortedProjects = useMemo(() => {
    let result = projects;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.project_number || '').toLowerCase().includes(q) ||
          (p.customer_details || '').toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const dateA = new Date(a.created_at || a.created || 0);
      const dateB = new Date(b.created_at || b.created || 0);
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  }, [projects, searchQuery, sortOrder]);

  const summaryStats = useMemo(() => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const total = projects.length;
    const active = projects.filter((p) => (p.status || 'Active') === 'Active').length;
    const completed = projects.filter((p) => p.is_completed === true).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const createdThisMonth = projects.filter((p) => {
      const d = new Date(p.created_at || p.created || 0);
      return d >= thisMonthStart;
    }).length;
    return { total, active, completed, completionRate, createdThisMonth };
  }, [projects]);

  useEffect(() => {
    setPage(0);
  }, [searchQuery, sortOrder]);

  const paginatedProjects = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredAndSortedProjects.slice(start, start + rowsPerPage);
  }, [filteredAndSortedProjects, page, rowsPerPage]);

  const formatDate = (project) => {
    const d = project.created_at || project.created;
    if (!d) return EMPTY_VALUE;
    return new Date(d).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const safeValue = (val) => (val != null && val !== '' ? val : EMPTY_VALUE);

  const handleSave = async () => {
    if (!modalData.project_number?.trim() || !modalData.name?.trim()) return;
    try {
      if (modalData.editId) {
        await updateProject(modalData.editId, {
          project_number: modalData.project_number.trim(),
          name: modalData.name.trim(),
          customer_details: modalData.customer_details?.trim() || null,
          reference_no: modalData.reference_no?.trim() || null,
          is_completed: modalData.is_completed,
        });
      } else {
        await createProject({
          project_number: modalData.project_number.trim(),
          name: modalData.name.trim(),
          customer_details: modalData.customer_details?.trim() || null,
          reference_no: modalData.reference_no?.trim() || null,
        });
      }
      setShowModal(false);
      setModalData({
        project_number: '',
        name: '',
        customer_details: '',
        reference_no: '',
        id: Date.now().toString(),
        created: new Date().toISOString().split('T')[0],
        status: 'Active',
        is_completed: false,
        editId: null,
      });
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const handleValidateAndComplete = async () => {
    try {
      const validation = await validateProjectCompletion(modalData.editId);
      setValidationResult(validation);
      setShowValidationModal(true);
    } catch (error) {
      console.error('Failed to validate project:', error);
    }
  };

  const handleMarkAsComplete = async () => {
    if (!validationResult || !validationResult.can_complete) return;
    
    try {
      await updateProject(modalData.editId, { is_completed: true });
      
      // Update local state
      setModalData(prev => ({ ...prev, is_completed: true }));
      setShowValidationModal(false);
      setValidationResult(null);
      setShowModal(false);
      
      // Refresh projects list
      await fetchProjects();
      
      // Clear any existing errors and show success
      clearError();
      setSuccessMessage('Project marked as complete successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to mark project as complete:', error);
      // Clear success message and let the error show through the alert system
      setSuccessMessage('');
    }
  };

  const handleEdit = (project) => {
    // Clear any existing errors when opening the modal
    clearError();
    setModalData({
      project_number: project.project_number || '',
      name: project.name,
      customer_details: project.customer_details || '',
      reference_no: project.reference_no || '',
      id: project.id,
      created: project.created_at || project.created,
      status: project.status || 'Active',
      is_completed: project.is_completed || false,
      editId: project.id,
    });
    setShowModal(true);
  };

  const handleDeleteClick = (id) => {
    setProjectToDeleteId(id);
    setDeleteConfirmText('');
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setProjectToDeleteId(null);
    setDeleteConfirmText('');
  };

  const handleConfirmDelete = async () => {
    if (!projectToDeleteId || deleteConfirmText.trim().toLowerCase() !== 'delete') return;
    try {
      await deleteProject(projectToDeleteId);
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const isDeleteConfirmValid = deleteConfirmText.trim().toLowerCase() === 'delete';

  const handleViewAssembly = async (project) => {
    try {
      await fetchProjectDetails(project.id);
      setSelectedProject(project);
      setActiveNav('assembly');
      navigate('/Assembly');
    } catch (err) {
      console.error('Failed to fetch project details:', err);
      setSelectedProject(project);
      setActiveNav('assembly');
      navigate('/Assembly');
    }
  };

  const openCreateModal = () => {
    setModalData({
      project_number: '',
      name: '',
      customer_details: '',
      reference_no: '',
      id: Date.now().toString(),
      created: new Date().toISOString().split('T')[0],
      status: 'Active',
      editId: null,
    });
    setShowModal(true);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ width: '100%', boxSizing: 'border-box', px: { xs: 2, sm: 3 }, py: 0, bgcolor: 'background.default', minHeight: '100%' }}>
        {successMessage && (
          <Alert severity="success" sx={{ mb: INNER_SPACING }} onClose={() => setSuccessMessage('')}>
            {successMessage}
          </Alert>
        )}

        {/* Page Header: Title + Description + Toolbar */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
            p: 3,
            borderBottom: '1px solid',
            borderColor: 'divider',
            mb: SECTION_SPACING,
          }}
        >
          <Box>
            <Typography variant="h5" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1.25, fontWeight: 600, color: 'text.primary', mb: 1.5 }}>
              <Box component="span" sx={{ display: 'inline-flex', color: 'primary.main' }}>
                <LayoutDashboard size={28} />
              </Box>
              Welcome to Project Management Portal
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage and organize all projects
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 0.5 }}>
            <IconButton
              onClick={() => fetchProjects().catch(console.error)}
              disabled={loading}
              size="small"
              title="Refresh projects"
              sx={{ color: 'text.secondary', '&:hover': { bgcolor: 'action.hover', color: 'primary.main' } }}
            >
              <RefreshCw size={18} />
            </IconButton>
            <Button
              variant="contained"
              size="medium"
              startIcon={<Plus size={16} />}
              onClick={openCreateModal}
              disabled={loading}
              sx={{ textTransform: 'none' }}
            >
              New Project
            </Button>
          </Box>
        </Box>

        {/* Summary Section */}
        <Box sx={{ mb: SECTION_SPACING }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: INNER_SPACING,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'background.paper',
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Total Projects
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {summaryStats.total}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: INNER_SPACING,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'rgba(25,118,210,0.04)',
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Active Projects
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {summaryStats.active}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: INNER_SPACING,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'rgba(46,125,50,0.04)',
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Completed Projects
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {summaryStats.completed}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: INNER_SPACING,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  bgcolor: 'rgba(46,125,50,0.04)',
                }}
              >
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Completion Rate
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'success.main' }}>
                  {summaryStats.completionRate}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Projects Table Section */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2,
              mb: 1.5,
            }}
          >
            <Typography variant="subtitle1" color="text.primary" sx={{ fontWeight: 500 }}>
              All Projects
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <TextField
                size="small"
                placeholder="Search by name, project no, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary' }}>
                        <Search size={16} />
                      </Box>
                    </InputAdornment>
                  ),
                  sx: { fontSize: '0.8125rem' },
                }}
                sx={{ minWidth: 220 }}
              />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Sort</InputLabel>
                <Select
                  value={sortOrder}
                  label="Sort"
                  onChange={(e) => setSortOrder(e.target.value)}
                  sx={{ fontSize: '0.8125rem' }}
                >
                  <MenuItem value="newest">Newest first</MenuItem>
                  <MenuItem value="oldest">Oldest first</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>

          <Paper
            variant="outlined"
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper',
              overflow: 'hidden',
            }}
          >
            {loading && projects.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                <CircularProgress size={40} sx={{ mb: 1.5 }} />
                <Typography variant="body2" color="text.secondary">
                  Loading projects...
                </Typography>
              </Box>
            ) : projects.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                <Box sx={{ color: 'text.disabled', mb: 1.5, display: 'inline-flex' }}>
                  <FolderOpen size={56} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  No projects yet. Create your first project.
                </Typography>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table size="medium" sx={{ '& .MuiTableCell-root': { borderBottom: '1px solid', borderColor: 'divider' } }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: '#f3f6fa', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5, color: 'text.secondary' }}>
                          Project Name
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5, color: 'text.secondary' }}>
                          Project No
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5, color: 'text.secondary' }}>
                          Created Date
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5, color: 'text.secondary' }}>
                          Customer
                        </TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5, color: 'text.secondary' }}>
                          Reference No
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 0.5, py: 1.5, color: 'text.secondary', width: 120 }}>
                          Actions
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAndSortedProjects.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No projects match your search.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedProjects.map((project) => (
                          <TableRow
                            key={project.id}
                            onMouseEnter={() => setHoveredRowId(project.id)}
                            onMouseLeave={() => setHoveredRowId(null)}
                            sx={{
                              cursor: 'pointer',
                              bgcolor: hoveredRowId === project.id ? 'action.hover' : 'transparent',
                              transition: 'background-color 0.1s ease',
                              '&:hover': { bgcolor: 'action.hover' },
                              '&:hover [data-icon="folder"]': { color: 'primary.main' },
                              '&:hover [data-icon="clock"]': { color: 'primary.main' },
                            }}
                            onClick={() => handleViewAssembly(project)}
                            onKeyDown={(e) => e.key === 'Enter' && handleViewAssembly(project)}
                            role="button"
                            tabIndex={0}
                          >
                            <TableCell sx={{ py: 1.75 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary' }} data-icon="folder">
                                  <Folder size={16} />
                                </Box>
                                <Typography variant="body1" fontWeight={600} color="text.primary">
                                  {safeValue(project.name)}
                                </Typography>
                                {isRecentProject(project.id) && (
                                  <Tooltip title="Recent" placement="top">
                                    <Box component="span" sx={{ display: 'inline-flex', color: 'text.secondary', ml: 0.5 }} data-icon="clock" aria-label="Recent project">
                                      <Clock size={14} />
                                    </Box>
                                  </Tooltip>
                                )}
                                {project.is_completed && (
                                  <Box 
                                    component="span" 
                                    sx={{ 
                                      ml: 1,
                                      px: 1,
                                      py: 0.25,
                                      backgroundColor: 'success.main',
                                      color: 'white',
                                      borderRadius: 1,
                                      fontSize: '0.7rem',
                                      fontWeight: 500,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 0.5
                                    }}
                                  >
                                    <Check size={10} />
                                    Complete
                                  </Box>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell sx={{ py: 1.75 }}>
                              <Typography variant="body2" color="text.secondary">
                                {safeValue(project.project_number || project.id)}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1.75 }}>
                              <Typography variant="body2" color="text.secondary">
                                {formatDate(project)}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1.75, maxWidth: 180 }}>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {safeValue(project.customer_details)}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ py: 1.75, maxWidth: 140 }}>
                              <Typography variant="body2" color="text.secondary" noWrap>
                                {safeValue(project.reference_no)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center" sx={{ py: 1.75 }} onClick={(e) => e.stopPropagation()}>
                              <Box sx={{ display: 'inline-flex', gap: 0.25 }}>
                                <IconButton
                                  size="small"
                                  title="View"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewAssembly(project);
                                  }}
                                  disabled={loading}
                                  sx={{
                                    color: 'text.secondary',
                                    '&:hover': { bgcolor: 'action.selected', color: 'primary.main' },
                                  }}
                                >
                                  <Eye size={16} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  title="Edit"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(project);
                                  }}
                                  disabled={loading}
                                  sx={{
                                    color: 'text.secondary',
                                    '&:hover': { bgcolor: 'action.selected', color: 'primary.main' },
                                  }}
                                >
                                  <Edit2 size={16} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  title="Delete"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(project.id);
                                  }}
                                  disabled={loading}
                                  sx={{
                                    color: 'text.secondary',
                                    '&:hover': { bgcolor: 'action.selected', color: 'error.main' },
                                  }}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                {filteredAndSortedProjects.length > rowsPerPage && (
                  <TablePagination
                    component="div"
                    count={filteredAndSortedProjects.length}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                      setRowsPerPage(parseInt(e.target.value, 10));
                      setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25]}
                    labelRowsPerPage="Rows:"
                    sx={{ borderTop: '1px solid', borderColor: 'divider', fontSize: '0.8125rem' }}
                  />
                )}
              </>
            )}
          </Paper>
        </Box>

        <Dialog
          open={showModal}
          onClose={() => setShowModal(false)}
          maxWidth="sm"
          fullWidth
          PaperProps={{ sx: { borderRadius: 1, boxShadow: 'none', border: '1px solid', borderColor: 'divider' } }}
        >
          <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem', pb: 1 }}>
            {modalData.editId ? 'Edit' : 'Create'} Project
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 0 }}>
              <TextField
                label="Project Number"
                required
                fullWidth
                size="small"
                value={modalData.project_number}
                onChange={(e) => setModalData({ ...modalData, project_number: e.target.value })}
                placeholder="Enter project number"
                autoFocus
              />
              <TextField
                label="Project Name"
                required
                fullWidth
                size="small"
                value={modalData.name}
                onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                placeholder="Enter project name"
              />
              <TextField
                label="Customer Details (optional)"
                fullWidth
                size="small"
                value={modalData.customer_details}
                onChange={(e) => setModalData({ ...modalData, customer_details: e.target.value })}
                placeholder="Enter customer details if present"
              />
              <TextField
                label="Reference No (optional)"
                fullWidth
                size="small"
                value={modalData.reference_no}
                onChange={(e) => setModalData({ ...modalData, reference_no: e.target.value })}
                placeholder="Enter reference number if present"
              />
              {modalData.editId && (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={modalData.is_completed}
                          onChange={(e) => setModalData({ ...modalData, is_completed: e.target.checked })}
                          disabled={loading}
                          size="small"
                        />
                      }
                      label="Mark Project as Complete"
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleValidateAndComplete}
                      disabled={loading}
                    >
                      Check Completion Status
                    </Button>
                  </Box>
                  
                  {/* Show error message in modal */}
                  {error && (
                    <Alert severity="error" sx={{ mt: 1 }} onClose={() => clearError()}>
                      {error}
                    </Alert>
                  )}
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 2.5, py: 2 }}>
            <Button onClick={() => setShowModal(false)} disabled={loading} size="medium">
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!modalData.project_number?.trim() || !modalData.name?.trim() || loading}
              size="medium"
            >
              {loading ? 'Saving...' : modalData.editId ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleCloseDeleteDialog}
          maxWidth="xs"
          fullWidth
          PaperProps={{ sx: { borderRadius: 1, boxShadow: 'none', border: '1px solid', borderColor: 'divider' } }}
        >
          <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem', pb: 0 }}>
            Delete project
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 0.5 }}>
              This action cannot be undone. All project data will be permanently removed. Type <strong>delete</strong> below to confirm.
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Type delete to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              autoComplete="off"
              sx={{ mt: 0.5 }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 2.5, py: 2 }}>
            <Button onClick={handleCloseDeleteDialog} size="medium">
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmDelete}
              disabled={!isDeleteConfirmValid || loading}
              size="medium"
            >
              {loading ? 'Deleting...' : 'Delete project'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Validation Modal */}
        <Dialog
          open={showValidationModal}
          onClose={() => setShowValidationModal(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 1, boxShadow: 'none', border: '1px solid', borderColor: 'divider' } }}
        >
          <DialogTitle sx={{ fontWeight: 600, fontSize: '1rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            {validationResult?.can_complete ? (
              <Check size={20} sx={{ color: 'success.main' }} />
            ) : (
              <AlertCircle size={20} sx={{ color: 'error.main' }} />
            )}
            Project Completion Status
          </DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500, 
                  color: validationResult?.can_complete ? 'success.main' : 'error.main',
                  mb: 1
                }}
              >
                {validationResult?.message}
              </Typography>
            </Box>
            
            {!validationResult?.can_complete && validationResult?.incomplete_parts?.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Incomplete Parts ({validationResult.incomplete_parts.length}):
                </Typography>
                <Box sx={{ 
                  maxHeight: 300, 
                  overflowY: 'auto', 
                  border: 1, 
                  borderColor: 'divider',
                  borderRadius: 1,
                  backgroundColor: 'grey.50'
                }}>
                  {validationResult.incomplete_parts.map((part, index) => (
                    <Box 
                      key={part.id}
                      sx={{ 
                        p: 1.5, 
                        borderBottom: index < validationResult.incomplete_parts.length - 1 ? 1 : 0,
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {part.part_no} - {part.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Inspection Status: {part.inspection_plan_status ? 'Complete' : 'Incomplete'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 2.5, py: 2 }}>
            <Button 
              onClick={() => setShowValidationModal(false)} 
              disabled={loading}
              size="medium"
            >
              {validationResult?.can_complete ? 'Cancel' : 'Close'}
            </Button>
            {validationResult?.can_complete && (
              <Button 
                variant="contained"
                onClick={handleMarkAsComplete}
                disabled={loading}
                size="medium"
              >
                {loading ? 'Marking...' : 'Mark as Complete'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default ProjectCreation;
