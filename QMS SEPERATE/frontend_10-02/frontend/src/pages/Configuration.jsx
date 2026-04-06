import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Chip,
  IconButton,
  Alert,
  Snackbar,
  Backdrop,
  Tooltip,
  useTheme,
  alpha
} from '@mui/material';
import {
  Bluetooth as BluetoothIcon,
  Add as PlusIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Wifi as WifiIcon,
  WifiOff as WifiOffIcon,
  Description as ReportIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  ShowChart as MeasurementIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Image as ImageIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import {
  Card,
  CardContent,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';

const Configuration = () => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState(0);
  const [devices, setDevices] = useState([]);
  const [discoveredDevices, setDiscoveredDevices] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false);
  const [showDiscoveredDevicesModal, setShowDiscoveredDevicesModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [testingConnection, setTestingConnection] = useState(null);
  const [connectingDeviceId, setConnectingDeviceId] = useState(null);
  const [showConnectedDialog, setShowConnectedDialog] = useState(null);
  const [connectionTestReadValue, setConnectionTestReadValue] = useState(null);
  const [deviceForMeasurements, setDeviceForMeasurements] = useState(null);
  const [measurementValues, setMeasurementValues] = useState(null);
  const [showEditDeviceModal, setShowEditDeviceModal] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', deviceId: '', calibration: '', next_calibration_date: '' });
  const [deviceToDelete, setDeviceToDelete] = useState(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [deviceForm, setDeviceForm] = useState({
    name: '',
    deviceId: '',
    calibration: ''
  });

  // Base URL for API calls - can be configured based on environment
  const API_BASE_URL = 'http://172.18.100.26:8986/api/v1/bluetooth';
  const REPORT_CONFIG_API = 'http://172.18.100.26:8986/api/v1/report-config';
  const BLOB_BASE = 'http://172.18.100.26:8986/blob';

  const [reports, setReports] = useState([
    { id: 1, name: 'Inspection Report - Part A', date: '2024-01-15', status: 'Completed' },
    { id: 2, name: 'Quality Report - Assembly B', date: '2024-01-14', status: 'In Progress' },
    { id: 3, name: 'Calibration Report - Tool C', date: '2024-01-13', status: 'Draft' }
  ]);

  // Report Manager state
  const [reportConfig, setReportConfig] = useState(null);
  const [reportConfigLoading, setReportConfigLoading] = useState(false);
  const [reportConfigSaving, setReportConfigSaving] = useState(false);
  const [reportConfigForm, setReportConfigForm] = useState({ report_name: 'Inspection Report', company_name: '' });
  const [addFieldSection, setAddFieldSection] = useState(null);
  const [newField, setNewField] = useState({ field_label: '', backend_key: '' });
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editFieldForm, setEditFieldForm] = useState({ field_label: '', backend_key: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const inputFileRef = React.useRef(null);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  // Load saved devices from database on component mount
  useEffect(() => {
    fetchSavedDevices();
    fetchConnectedDevices();
  }, []);

  // Load report config when Report Manager tab is active
  useEffect(() => {
    if (activeTab === 1) fetchReportConfig();
  }, [activeTab]);

  const fetchReportConfig = async () => {
    setReportConfigLoading(true);
    try {
      const res = await fetch(`${REPORT_CONFIG_API}/default`);
      if (res.ok) {
        const data = await res.json();
        setReportConfig(data);
        setReportConfigForm({ report_name: data.report_name || 'Inspection Report', company_name: data.company_name || '' });
      } else {
        setReportConfig(null);
      }
    } catch (e) {
      console.error('Failed to fetch report config:', e);
      showSnackbar('Failed to load report configuration', 'error');
    } finally {
      setReportConfigLoading(false);
    }
  };

  const saveReportConfig = async () => {
    if (!reportConfig) return;
    setReportConfigSaving(true);
    try {
      const res = await fetch(`${REPORT_CONFIG_API}/${reportConfig.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportConfigForm)
      });
      if (res.ok) {
        const data = await res.json();
        setReportConfig(data);
        showSnackbar('Configuration saved');
      } else {
        const err = await res.json().catch(() => ({}));
        showSnackbar(err.detail || 'Failed to save', 'error');
      }
    } catch (e) {
      showSnackbar('Failed to save configuration', 'error');
    } finally {
      setReportConfigSaving(false);
    }
  };

  const handleLockTemplate = async () => {
    if (!reportConfig) return;
    try {
      const res = await fetch(`${REPORT_CONFIG_API}/${reportConfig.id}/lock`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReportConfig(data);
        showSnackbar('Template locked');
      } else {
        const err = await res.json().catch(() => ({}));
        showSnackbar(err.detail || 'Failed to lock', 'error');
      }
    } catch (e) {
      showSnackbar('Failed to lock template', 'error');
    }
  };

  const handleUnlockTemplate = async () => {
    if (!reportConfig) return;
    try {
      const res = await fetch(`${REPORT_CONFIG_API}/${reportConfig.id}/unlock`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setReportConfig(data);
        showSnackbar('Template unlocked');
      } else {
        const err = await res.json().catch(() => ({}));
        showSnackbar(err.detail || 'Failed to unlock', 'error');
      }
    } catch (e) {
      showSnackbar('Failed to unlock template', 'error');
    }
  };

  const handleLogoUpload = async () => {
    if (!reportConfig || !logoFile) return;
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append('file', logoFile);
      const res = await fetch(`${REPORT_CONFIG_API}/${reportConfig.id}/logo`, {
        method: 'POST',
        body: form
      });
      if (res.ok) {
        const data = await res.json();
        setReportConfig(data);
        setLogoFile(null);
        if (inputFileRef.current) inputFileRef.current.value = '';
        showSnackbar('Logo uploaded');
      } else {
        const err = await res.json().catch(() => ({}));
        showSnackbar(err.detail || 'Upload failed', 'error');
      }
    } catch (e) {
      showSnackbar('Failed to upload logo', 'error');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    if (!reportConfig) return;
    try {
      const res = await fetch(`${REPORT_CONFIG_API}/${reportConfig.id}/logo`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setReportConfig(data);
        showSnackbar('Logo removed');
      }
    } catch (e) {
      showSnackbar('Failed to remove logo', 'error');
    }
  };

  const addField = async () => {
    if (!reportConfig || !addFieldSection || !newField.field_label?.trim() || !newField.backend_key?.trim()) return;
    try {
      const res = await fetch(`${REPORT_CONFIG_API}/${reportConfig.id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section: addFieldSection, field_label: newField.field_label.trim(), backend_key: newField.backend_key.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setReportConfig(prev => ({
          ...prev,
          fields: [...(prev?.fields || []), data]
        }));
        setNewField({ field_label: '', backend_key: '' });
        setAddFieldSection(null);
        showSnackbar('Field added');
      } else {
        const err = await res.json().catch(() => ({}));
        showSnackbar(err.detail || 'Failed to add field', 'error');
      }
    } catch (e) {
      showSnackbar('Failed to add field', 'error');
    }
  };

  const updateField = async () => {
    if (!reportConfig || !editingFieldId) return;
    try {
      const res = await fetch(`${REPORT_CONFIG_API}/${reportConfig.id}/fields/${editingFieldId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFieldForm)
      });
      if (res.ok) {
        const data = await res.json();
        setReportConfig(prev => ({
          ...prev,
          fields: (prev?.fields || []).map(f => f.id === data.id ? data : f)
        }));
        setEditingFieldId(null);
        showSnackbar('Field updated');
      } else {
        const err = await res.json().catch(() => ({}));
        showSnackbar(err.detail || 'Failed to update', 'error');
      }
    } catch (e) {
      showSnackbar('Failed to update field', 'error');
    }
  };

  const deleteField = async (fieldId) => {
    if (!reportConfig) return;
    try {
      const res = await fetch(`${REPORT_CONFIG_API}/${reportConfig.id}/fields/${fieldId}`, { method: 'DELETE' });
      if (res.ok) {
        setReportConfig(prev => ({
          ...prev,
          fields: (prev?.fields || []).filter(f => f.id !== fieldId)
        }));
        if (editingFieldId === fieldId) setEditingFieldId(null);
        showSnackbar('Field removed');
      } else {
        const err = await res.json().catch(() => ({}));
        showSnackbar(err.detail || 'Failed to delete', 'error');
      }
    } catch (e) {
      showSnackbar('Failed to delete field', 'error');
    }
  };

  const openEditField = (field) => {
    setEditingFieldId(field.id);
    setEditFieldForm({ field_label: field.field_label, backend_key: field.backend_key });
  };

  const headerFields = (reportConfig?.fields || []).filter(f => f.section === 'header');
  const footerFields = (reportConfig?.fields || []).filter(f => f.section === 'footer');
  // Realistic preview values based on backend_key (used in live preview when no report data exists)
  const getPreviewValue = (backendKey) => {
    if (!backendKey) return '';
    const key = backendKey.toLowerCase().replace(/\s+/g, '_');
    const today = new Date().toISOString().slice(0, 10);
    const map = {
      inspection_no: 'IR-2025-001',
      report_no: 'IR-2025-001',
      project_no: 'GSP2502101',
      project_number: 'GSP2502101',
      project_title: 'Design and development of hydrostatic bearing blocks',
      project_name: 'X and Z Axis',
      quantity: '1',
      qty: '1',
      part_name: 'Back plate',
      part_no: '01-2-2',
      supplier_name: 'M/s COE IIT BHU',
      supplier: 'M/s COE IIT BHU',
      inspector_name: 'Amruth',
      inspector: 'Amruth',
      inspection_date: today,
      date: today,
      prepared_by: 'Amruth',
      prepared: 'Amruth',
      signed_by: 'Narendra',
      approved_by: 'Narendra',
      checked_by: 'BR',
      approved: 'SGK',
      centre: 'C-SMPM/G-SPMA',
      ref_master_bom_no: 'None',
      page: '1 of 1',
      bom_name: 'X and Z AXIS',
      bom_no: '01-1-1 Rev:00',
      customer: 'M/s COE IIT BHU',
      po_no: 'IIT(BHU)/COE/MTD/2025-26/TD/001',
      ref_oa_no: 'PPM/SMPM/020/2025-26(12)RT/OA 18-09-2025',
      project: 'Back plate',
    };
    return map[key] ?? backendKey;
  };

  const previewData = {
    report_name: reportConfigForm.report_name || reportConfig?.report_name,
    company_name: reportConfigForm.company_name || reportConfig?.company_name,
    logo_url: reportConfig?.logo_path ? `${BLOB_BASE}/${reportConfig.logo_path}` : null,
    header: headerFields,
    footer: footerFields
  };

  const fetchSavedDevices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`);
      if (response.ok) {
        const savedDevices = await response.json();
        setDevices(savedDevices);
        setBackendAvailable(true);
      } else {
        setBackendAvailable(false);
      }
    } catch (error) {
      console.error('Failed to fetch saved devices:', error);
      setBackendAvailable(false);
      // Don't show error on initial load, only on user actions
    }
  };

  const fetchConnectedDevices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/connected`);
      if (response.ok) {
        const connectedDevices = await response.json();
        // Update the connection status of saved devices
        setDevices(prev => 
          prev.map(device => ({
            ...device,
            connected: connectedDevices.some(connected => connected.mac_address === device.mac_address)
          }))
        );
        setBackendAvailable(true);
      } else {
        setBackendAvailable(false);
      }
    } catch (error) {
      console.error('Failed to fetch connected devices:', error);
      setBackendAvailable(false);
    }
  };

  // Bluetooth functionality
  const scanDevices = async () => {
    if (!backendAvailable) {
      showSnackbar('Backend server is not available. Please start the backend service.', 'error');
      return;
    }

    setIsScanning(true);
    try {
      const response = await fetch(`${API_BASE_URL}/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const discovered = await response.json();
        setDiscoveredDevices(discovered);
        
        if (discovered.length > 0) {
          setShowDiscoveredDevicesModal(true);
          showSnackbar(`Found ${discovered.length} device(s)`, 'success');
        } else {
          showSnackbar('No devices found', 'info');
        }
      } else {
        showSnackbar('Scan failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Scan failed:', error);
      setBackendAvailable(false);
      showSnackbar('Backend server is not available. Please start the backend service.', 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const openAddDeviceModal = (device) => {
    setSelectedDevice(device);
    setDeviceForm({
      name: device.name || '',
      deviceId: '',
      calibration: ''
    });
    setShowAddDeviceModal(true);
  };

  const closeAddDeviceModal = () => {
    setShowAddDeviceModal(false);
    setSelectedDevice(null);
    setDeviceForm({ name: '', deviceId: '', calibration: '' });
  };

  const saveDevice = async () => {
    if (!deviceForm.name || !deviceForm.deviceId) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: deviceForm.name,
          device_id: deviceForm.deviceId,
          mac_address: selectedDevice.address,
          calibration: deviceForm.calibration || '',
          signal_strength: selectedDevice.rssi,
          connected: false
        }),
      });
      
      if (response.ok) {
        const savedDevice = await response.json();
        
        // Add to devices list
        setDevices(prev => [...prev, savedDevice]);
        
        // Remove from discovered devices
        setDiscoveredDevices(prev => 
          prev.filter(device => device.address !== selectedDevice.address)
        );
        
        closeAddDeviceModal();
        showSnackbar('Device saved successfully!', 'success');
        
        // Close discovered devices modal if no more devices
        if (discoveredDevices.length <= 1) {
          setShowDiscoveredDevicesModal(false);
        }
      } else {
        showSnackbar('Failed to save device', 'error');
      }
    } catch (error) {
      console.error('Save failed:', error);
      showSnackbar('Failed to save device', 'error');
    }
  };

  const testConnection = async (device) => {
    setTestingConnection(device.id);
    setConnectingDeviceId(device.id);
    setConnectionTestReadValue(null);
    try {
      const response = await fetch(`${API_BASE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: device.mac_address, name: device.name }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.success) {
        await fetchConnectedDevices();
        setShowConnectedDialog(device);
        if (data.characteristic_value != null && data.characteristic_value !== '') {
          setConnectionTestReadValue({
            value: data.characteristic_value,
            uuid: data.characteristic_uuid || null,
          });
        }
        showSnackbar('Device connected. Click the device row to view measurements.', 'success');
      } else {
        showSnackbar(data.detail || 'Connection test failed', 'error');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      showSnackbar('Connection test failed', 'error');
    } finally {
      setTestingConnection(null);
      setConnectingDeviceId(null);
    }
  };

  const connectDevice = async (device) => {
    if (device.connected) {
      try {
        const response = await fetch(`${API_BASE_URL}/disconnect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: device.mac_address }),
        });
        if (response.ok) {
          await fetchConnectedDevices();
          setShowConnectedDialog(null);
          setDeviceForMeasurements(null);
          showSnackbar('Device disconnected', 'success');
        } else {
          showSnackbar('Disconnect failed', 'error');
        }
      } catch (error) {
        showSnackbar('Disconnect failed', 'error');
      }
      return;
    }
    setConnectingDeviceId(device.id);
    try {
      const response = await fetch(`${API_BASE_URL}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: device.mac_address, name: device.name }),
      });
      if (response.ok) {
        await fetchConnectedDevices();
        setShowConnectedDialog(device);
        showSnackbar('Device connected. Click the device row to view measurements.', 'success');
      } else {
        showSnackbar('Connection failed', 'error');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      showSnackbar('Connection failed', 'error');
    } finally {
      setConnectingDeviceId(null);
    }
  };

  const fetchMeasurementValues = async (device) => {
    if (!device?.connected) return;
    setDeviceForMeasurements(device);
    try {
      const response = await fetch(`${API_BASE_URL}/services/${encodeURIComponent(device.mac_address)}`);
      if (response.ok) {
        const data = await response.json();
        setMeasurementValues(data);
      } else {
        setMeasurementValues({ placeholder: true, message: 'Live measurement data will appear here when supported by the device.' });
      }
    } catch {
      setMeasurementValues({ placeholder: true, message: 'Live measurement data will appear here when supported by the device.' });
    }
  };

  const openEditDeviceModal = (device) => {
    setEditDevice(device);
    setEditForm({
      name: device.name || '',
      deviceId: device.device_id || '',
      calibration: device.calibration || '',
      next_calibration_date: device.next_calibration_date || ''
    });
    setShowEditDeviceModal(true);
  };

  const closeEditDeviceModal = () => {
    setShowEditDeviceModal(false);
    setEditDevice(null);
    setEditForm({ name: '', deviceId: '', calibration: '', next_calibration_date: '' });
  };

  const saveEditDevice = async () => {
    if (!editDevice || !editForm.name?.trim() || !editForm.deviceId?.trim()) {
      showSnackbar('Name and Device ID are required', 'error');
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${editDevice.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name.trim(),
          device_id: editForm.deviceId.trim(),
          calibration: editForm.calibration || null,
          next_calibration_date: editForm.next_calibration_date || null
        }),
      });
      if (response.ok) {
        const updated = await response.json();
        setDevices(prev => prev.map(d => d.id === updated.id ? updated : d));
        closeEditDeviceModal();
        showSnackbar('Device updated successfully', 'success');
      } else {
        const err = await response.json().catch(() => ({}));
        showSnackbar(err.detail || 'Failed to update device', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to update device', 'error');
    }
  };

  const removeDevice = async (deviceIdOrDevice) => {
    const deviceId = typeof deviceIdOrDevice === 'object' ? deviceIdOrDevice.device_id : deviceIdOrDevice;
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${encodeURIComponent(deviceId)}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setDevices(prev => prev.filter(d => d.device_id !== deviceId));
        setDeviceToDelete(null);
        setShowConnectedDialog(prev => prev?.device_id === deviceId ? null : prev);
        setDeviceForMeasurements(prev => prev?.device_id === deviceId ? null : prev);
        showSnackbar('Device removed', 'info');
      } else {
        showSnackbar('Failed to remove device', 'error');
      }
    } catch (error) {
      showSnackbar('Failed to remove device', 'error');
    }
  };

  // Report Manager functionality
  const downloadReport = (reportId) => {
    showSnackbar(`Downloading report ${reportId}...`, 'info');
    // Simulate download
    setTimeout(() => {
      showSnackbar('Report downloaded successfully', 'success');
    }, 1500);
  };

  const uploadReport = () => {
    showSnackbar('Upload functionality coming soon', 'info');
  };

  const deleteReport = (reportId) => {
    setReports(prev => prev.filter(report => report.id !== reportId));
    showSnackbar('Report deleted', 'info');
  };

  return (
    <Box sx={{ width: '100%', px: 3, pt: 1, pb: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {/* <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, color: '#111827' }}>
        Configuration
      </Typography> */}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, mt: 0 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 500,
              minHeight: 48
            }
          }}
        >
          <Tab 
            icon={<BluetoothIcon fontSize="small" />} 
            label="Bluetooth" 
            iconPosition="start"
            sx={{ mr: 2 }}
          />
          <Tab 
            icon={<ReportIcon fontSize="small" />} 
            label="Report Manager" 
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Bluetooth Tab */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Bluetooth Device Management
              </Typography>
              {!backendAvailable && (
                <Chip 
                  icon={<WifiOffIcon sx={{ fontSize: 16 }} />}
                  label="Backend Offline" 
                  color="error" 
                  size="small"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
            </Box>
            <Button
              variant="contained"
              startIcon={isScanning ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
              onClick={scanDevices}
              disabled={isScanning || !backendAvailable}
              sx={{
                bgcolor: backendAvailable ? '#2F6FED' : '#9CA3AF',
                '&:hover': { bgcolor: backendAvailable ? '#1E5DD4' : '#6B7280' },
                minWidth: 140,
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              {isScanning ? 'Scanning...' : backendAvailable ? 'Scan Devices' : 'Backend Offline'}
            </Button>
          </Box>

          {isScanning && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, p: 2, bgcolor: alpha('#2F6FED', 0.08), borderRadius: 1 }}>
              <CircularProgress size={20} sx={{ mr: 2 }} />
              <Typography variant="body2">Scanning for nearby Bluetooth devices...</Typography>
            </Box>
          )}

          <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8125rem', py: 1.5 }}>Device Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8125rem', py: 1.5 }}>Device ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8125rem', py: 1.5 }}>MAC Address</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8125rem', py: 1.5 }}>Signal</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8125rem', py: 1.5 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8125rem', py: 1.5 }}>Next Calibration Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.8125rem', py: 1.5 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 8 }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'text.secondary' }}>
                        <BluetoothIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                        <Typography variant="body1">
                          No devices added yet. Click "Scan Devices" to discover and add Bluetooth devices.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  devices.map((device) => (
                    <TableRow
                      key={device.id}
                      hover
                      onClick={() => device.connected && fetchMeasurementValues(device)}
                      sx={{
                        cursor: device.connected ? 'pointer' : 'default',
                        bgcolor: deviceForMeasurements?.id === device.id ? alpha('#2F6FED', 0.06) : undefined
                      }}
                    >
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <BluetoothIcon color="primary" sx={{ fontSize: 20 }} />
                          <Typography variant="body2" fontWeight={500}>
                            {device.name || 'Unknown Device'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}><Typography variant="body2">{device.device_id || '-'}</Typography></TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
                          {device.mac_address}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2">{device.signal_strength ? `${device.signal_strength} dBm` : 'N/A'}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Chip
                          icon={device.connected ? <WifiIcon sx={{ fontSize: 14 }} /> : <WifiOffIcon sx={{ fontSize: 14 }} />}
                          label={device.connected ? 'Connected' : 'Disconnected'}
                          color={device.connected ? 'success' : 'default'}
                          size="small"
                          variant={device.connected ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body2">{device.next_calibration_date || '-'}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} sx={{ py: 1.25 }}>
                        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                          <Tooltip title="Test connection" arrow placement="top">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => testConnection(device)}
                                disabled={testingConnection === device.id || connectingDeviceId !== null}
                                color="primary"
                                aria-label="Test connection"
                                sx={{ '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' } }}
                              >
                                {testingConnection === device.id ? (
                                  <CircularProgress size={20} color="inherit" />
                                ) : (
                                  <BluetoothIcon fontSize="small" />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Edit device" arrow placement="top">
                            <IconButton
                              size="small"
                              onClick={() => openEditDeviceModal(device)}
                              color="primary"
                              aria-label="Edit device"
                              sx={{ '&:hover': { bgcolor: 'primary.main', color: 'primary.contrastText' } }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete device" arrow placement="top">
                            <IconButton
                              size="small"
                              onClick={() => setDeviceToDelete(device)}
                              color="error"
                              aria-label="Delete device"
                              sx={{ '&:hover': { bgcolor: 'error.dark', color: 'error.contrastText' } }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Report Manager Tab */}
      {activeTab === 1 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 180px)' }}>
          {reportConfigLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: 320 }}>
              <CircularProgress />
            </Box>
          ) : reportConfig ? (
            <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0, width: '100%', flexDirection: { xs: 'column', md: 'row' } }}>
              {/* Configuration panel */}
              <Box sx={{ flex: { xs: '0 0 auto', md: '0 0 340px' }, overflow: 'auto', minWidth: 0 }}>
                <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'divider', overflow: 'hidden' }}>
                  <Box sx={{ px: 2.5, py: 2, bgcolor: alpha(theme.palette.primary.main, 0.06), borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'text.primary' }}>
                      Report template configuration
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Configure header, footer, and branding. Lock when ready for use.
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: 2.5 }}>
                    {/* Logo */}
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.8 }}>Company logo</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, mb: 2 }}>
                      <Box
                        sx={{
                          width: 72,
                          height: 72,
                          borderRadius: 1,
                          border: '2px dashed',
                          borderColor: 'divider',
                          bgcolor: 'grey.50',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        {previewData.logo_url ? (
                          <Box component="img" src={previewData.logo_url} alt="Logo" sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <ImageIcon sx={{ fontSize: 32, color: 'grey.400' }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <input
                          type="file"
                          ref={inputFileRef}
                          accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
                          style={{ display: 'none' }}
                          onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        />
                        {reportConfig.is_locked ? null : (
                          <>
                            <Button size="small" variant="outlined" startIcon={logoUploading ? <CircularProgress size={16} /> : <UploadIcon />} onClick={() => inputFileRef.current?.click()} disabled={logoUploading} sx={{ textTransform: 'none', mr: 1 }}>
                              {logoFile ? logoFile.name : 'Choose file'}
                            </Button>
                            {logoFile && <Button size="small" variant="contained" onClick={handleLogoUpload} disabled={logoUploading} sx={{ textTransform: 'none' }}>Upload</Button>}
                            {previewData.logo_url && <Button size="small" color="error" sx={{ ml: 1, textTransform: 'none' }} onClick={handleLogoRemove}>Remove</Button>}
                          </>
                        )}
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.8 }}>Report & company</Typography>
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Typography variant="body2" sx={{ minWidth: 120, color: 'text.primary', fontWeight: 500 }}>Report name</Typography>
                        <TextField
                          size="small"
                          hiddenLabel
                          value={reportConfigForm.report_name}
                          onChange={(e) => setReportConfigForm(f => ({ ...f, report_name: e.target.value }))}
                          disabled={reportConfig.is_locked}
                          fullWidth
                          sx={{ flex: 1 }}
                          slotProps={{ input: { sx: { bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)', '&:hover': { borderColor: 'grey.400' }, '&.Mui-focused': { borderColor: 'primary.main', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } } } }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Typography variant="body2" sx={{ minWidth: 120, color: 'text.primary', fontWeight: 500 }}>Company name</Typography>
                        <TextField
                          size="small"
                          hiddenLabel
                          value={reportConfigForm.company_name}
                          onChange={(e) => setReportConfigForm(f => ({ ...f, company_name: e.target.value }))}
                          disabled={reportConfig.is_locked}
                          fullWidth
                          sx={{ flex: 1 }}
                          slotProps={{ input: { sx: { bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)', '&:hover': { borderColor: 'grey.400' }, '&.Mui-focused': { borderColor: 'primary.main', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } } } }}
                        />
                      </Box>
                      {!reportConfig.is_locked && (
                        <Button variant="contained" onClick={saveReportConfig} disabled={reportConfigSaving} startIcon={reportConfigSaving ? <CircularProgress size={18} color="inherit" /> : null} sx={{ mt: 0.5, textTransform: 'none', fontWeight: 600 }}>
                          {reportConfigSaving ? 'Saving…' : 'Save changes'}
                        </Button>
                      )}
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Header fields - 2-col label + input layout */}
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.8 }}>Header fields</Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      {headerFields.map((f) => (
                        <Grid item xs={12} sm={6} key={f.id}>
                          {editingFieldId === f.id ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Typography variant="body2" sx={{ minWidth: 100, color: 'text.primary', fontWeight: 500 }}>Field label</Typography>
                                <TextField size="small" hiddenLabel value={editFieldForm.field_label} onChange={(e) => setEditFieldForm(prev => ({ ...prev, field_label: e.target.value }))} fullWidth sx={{ flex: 1 }} slotProps={{ input: { sx: { bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } } } } />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Typography variant="body2" sx={{ minWidth: 100, color: 'text.primary', fontWeight: 500 }}>Backend key</Typography>
                                <TextField size="small" hiddenLabel value={editFieldForm.backend_key} onChange={(e) => setEditFieldForm(prev => ({ ...prev, backend_key: e.target.value }))} fullWidth sx={{ flex: 1 }} slotProps={{ input: { sx: { bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } } } } />
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" variant="contained" onClick={updateField} sx={{ textTransform: 'none' }}>Save</Button>
                                <Button size="small" variant="outlined" onClick={() => setEditingFieldId(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
                              </Box>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Typography variant="body2" sx={{ minWidth: 100, color: 'text.primary', fontWeight: 500 }}>{f.field_label}</Typography>
                              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ flex: 1, py: 0.75, px: 1.25, bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)', fontSize: '0.875rem', color: 'text.secondary' }}>{f.backend_key}</Box>
                                {!reportConfig.is_locked && (
                                  <>
                                    <IconButton size="small" onClick={() => openEditField(f)} sx={{ p: 0.5 }}><EditIcon sx={{ fontSize: 18 }} /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => deleteField(f.id)} sx={{ p: 0.5 }}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                                  </>
                                )}
                              </Box>
                            </Box>
                          )}
                        </Grid>
                      ))}
                    </Grid>
                    {!reportConfig.is_locked && (
                      <>
                        {addFieldSection === 'header' ? (
                          <Box sx={{ mt: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                              <Typography variant="body2" sx={{ minWidth: 100, color: 'text.primary', fontWeight: 500 }}>Field label</Typography>
                              <TextField size="small" hiddenLabel placeholder="e.g. Inspection Report No." value={newField.field_label} onChange={(e) => setNewField(f => ({ ...f, field_label: e.target.value }))} fullWidth sx={{ flex: 1 }} slotProps={{ input: { sx: { bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } } } } />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                              <Typography variant="body2" sx={{ minWidth: 100, color: 'text.primary', fontWeight: 500 }}>Backend key</Typography>
                              <TextField size="small" hiddenLabel placeholder="e.g. inspection_no" value={newField.backend_key} onChange={(e) => setNewField(f => ({ ...f, backend_key: e.target.value }))} fullWidth sx={{ flex: 1 }} slotProps={{ input: { sx: { bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } } } } />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button size="small" variant="contained" onClick={addField} disabled={!newField.field_label?.trim() || !newField.backend_key?.trim()} sx={{ textTransform: 'none' }}>Add</Button>
                              <Button size="small" variant="outlined" onClick={() => { setAddFieldSection(null); setNewField({ field_label: '', backend_key: '' }); }} sx={{ textTransform: 'none' }}>Cancel</Button>
                            </Box>
                          </Box>
                        ) : (
                          <Button size="small" startIcon={<PlusIcon />} onClick={() => setAddFieldSection('header')} sx={{ mt: 0.5, textTransform: 'none' }}>Add header field</Button>
                        )}
                      </>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Footer fields - 2-col label + input layout */}
                    <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.8 }}>Footer fields</Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5 }}>
                      {footerFields.map((f) => (
                        <Grid item xs={12} sm={6} key={f.id}>
                          {editingFieldId === f.id ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Typography variant="body2" sx={{ minWidth: 100, color: 'text.primary', fontWeight: 500 }}>Field label</Typography>
                                <TextField size="small" hiddenLabel value={editFieldForm.field_label} onChange={(e) => setEditFieldForm(prev => ({ ...prev, field_label: e.target.value }))} fullWidth sx={{ flex: 1 }} slotProps={{ input: { sx: { bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } } } } />
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Typography variant="body2" sx={{ minWidth: 100, color: 'text.primary', fontWeight: 500 }}>Backend key</Typography>
                                <TextField size="small" hiddenLabel value={editFieldForm.backend_key} onChange={(e) => setEditFieldForm(prev => ({ ...prev, backend_key: e.target.value }))} fullWidth sx={{ flex: 1 }} slotProps={{ input: { sx: { bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } } } } />
                              </Box>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button size="small" variant="contained" onClick={updateField} sx={{ textTransform: 'none' }}>Save</Button>
                                <Button size="small" variant="outlined" onClick={() => setEditingFieldId(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
                              </Box>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Typography variant="body2" sx={{ minWidth: 100, color: 'text.primary', fontWeight: 500 }}>{f.field_label}</Typography>
                              <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box sx={{ flex: 1, py: 0.75, px: 1.25, bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)', fontSize: '0.875rem', color: 'text.secondary' }}>{f.backend_key}</Box>
                                {!reportConfig.is_locked && (
                                  <>
                                    <IconButton size="small" onClick={() => openEditField(f)} sx={{ p: 0.5 }}><EditIcon sx={{ fontSize: 18 }} /></IconButton>
                                    <IconButton size="small" color="error" onClick={() => deleteField(f.id)} sx={{ p: 0.5 }}><DeleteIcon sx={{ fontSize: 18 }} /></IconButton>
                                  </>
                                )}
                              </Box>
                            </Box>
                          )}
                        </Grid>
                      ))}
                    </Grid>
                    {!reportConfig.is_locked && (
                      <>
                        {addFieldSection === 'footer' ? (
                          <Box sx={{ mt: 1.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                              <Typography variant="body2" sx={{ minWidth: 100, color: 'text.primary', fontWeight: 500 }}>Field label</Typography>
                              <TextField size="small" hiddenLabel placeholder="e.g. Inspector" value={newField.field_label} onChange={(e) => setNewField(f => ({ ...f, field_label: e.target.value }))} fullWidth sx={{ flex: 1 }} slotProps={{ input: { sx: { bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } } } } />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                              <Typography variant="body2" sx={{ minWidth: 100, color: 'text.primary', fontWeight: 500 }}>Backend key</Typography>
                              <TextField size="small" hiddenLabel placeholder="e.g. inspector_name" value={newField.backend_key} onChange={(e) => setNewField(f => ({ ...f, backend_key: e.target.value }))} fullWidth sx={{ flex: 1 }} slotProps={{ input: { sx: { bgcolor: '#fff', border: '1px solid', borderColor: 'grey.300', borderRadius: 0, boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)' } } } } />
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button size="small" variant="contained" onClick={addField} disabled={!newField.field_label?.trim() || !newField.backend_key?.trim()} sx={{ textTransform: 'none' }}>Add</Button>
                              <Button size="small" variant="outlined" onClick={() => { setAddFieldSection(null); setNewField({ field_label: '', backend_key: '' }); }} sx={{ textTransform: 'none' }}>Cancel</Button>
                            </Box>
                          </Box>
                        ) : (
                          <Button size="small" startIcon={<PlusIcon />} onClick={() => setAddFieldSection('footer')} sx={{ mt: 0.5, textTransform: 'none' }}>Add footer field</Button>
                        )}
                      </>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      {reportConfig.is_locked ? (
                        <Chip icon={<LockIcon />} label="Template locked" color="primary" size="small" />
                      ) : (
                        <Chip icon={<LockOpenIcon />} label="Template editable" color="default" size="small" variant="outlined" />
                      )}
                      {reportConfig.is_locked ? (
                        <Button size="small" variant="outlined" startIcon={<LockOpenIcon />} onClick={handleUnlockTemplate} sx={{ textTransform: 'none' }}>Unlock template</Button>
                      ) : (
                        <Button size="small" variant="contained" color="primary" startIcon={<LockIcon />} onClick={handleLockTemplate} sx={{ textTransform: 'none', fontWeight: 600 }}>Lock template</Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Box>

              {/* Live preview - fills all remaining space */}
              <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <Card variant="outlined" sx={{ borderRadius: 2, borderColor: 'divider', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <Box sx={{ px: 2.5, py: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.06), borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PreviewIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Live preview</Typography>
                  </Box>
                  <CardContent sx={{ p: 2, flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Paper
                      elevation={2}
                      sx={{
                        height: '100%',
                        width: 'auto',
                        maxHeight: '100%',
                        maxWidth: '100%',
                        aspectRatio: '210/297',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        bgcolor: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                        flexShrink: 0,
                      }}
                    >
                      {/* Preview header */}
                      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: '#fafafa' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: previewData.header?.length > 0 ? 2 : 0 }}>
                          {previewData.logo_url && (
                            <Box component="img" src={previewData.logo_url} alt="" sx={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
                          )}
                          <Box>
                            <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.3 }}>{previewData.company_name || 'Company name'}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{previewData.report_name || 'Report name'}</Typography>
                          </Box>
                        </Box>
                        {previewData.header?.length > 0 && (
                          <TableContainer sx={{ mt: 1.5, border: '1px solid', borderColor: 'grey.400' }}>
                            <Table size="small" sx={{ borderCollapse: 'collapse' }}>
                              <TableBody>
                                {(() => {
                                  const pairs = [];
                                  for (let i = 0; i < previewData.header.length; i += 2) {
                                    pairs.push([previewData.header[i], previewData.header[i + 1] || null]);
                                  }
                                  return pairs;
                                })().map((pair, idx) => (
                                  <TableRow key={pair[0].id}>
                                    <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontWeight: 600, fontSize: '0.8125rem', width: '20%', bgcolor: 'grey.50', py: 0.75, px: 1.25 }}>{pair[0].field_label}</TableCell>
                                    <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontSize: '0.8125rem', py: 0.75, px: 1.25 }}>{getPreviewValue(pair[0].backend_key)}</TableCell>
                                    <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontWeight: 600, fontSize: '0.8125rem', width: '20%', bgcolor: 'grey.50', py: 0.75, px: 1.25 }}>{pair[1] ? pair[1].field_label : ''}</TableCell>
                                    <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontSize: '0.8125rem', py: 0.75, px: 1.25 }}>{pair[1] ? getPreviewValue(pair[1].backend_key) : ''}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </Box>
                      {/* Preview body */}
                      <Box sx={{ flex: 1, p: 2, bgcolor: '#fff' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Report content will appear here when generated.
                        </Typography>
                      </Box>
                      {/* Preview footer */}
                      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider', bgcolor: '#fafafa' }}>
                        {previewData.footer?.length > 0 ? (
                          <TableContainer sx={{ border: '1px solid', borderColor: 'grey.400' }}>
                            <Table size="small" sx={{ borderCollapse: 'collapse' }}>
                              <TableBody>
                                {(() => {
                                  const pairs = [];
                                  for (let i = 0; i < previewData.footer.length; i += 2) {
                                    pairs.push([previewData.footer[i], previewData.footer[i + 1] || null]);
                                  }
                                  return pairs;
                                })().map((pair, idx) => (
                                  <TableRow key={pair[0].id}>
                                    <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontWeight: 600, fontSize: '0.8125rem', width: '20%', bgcolor: 'grey.50', py: 0.75, px: 1.25 }}>{pair[0].field_label}</TableCell>
                                    <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontSize: '0.8125rem', py: 0.75, px: 1.25 }}>{getPreviewValue(pair[0].backend_key)}</TableCell>
                                    <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontWeight: 600, fontSize: '0.8125rem', width: '20%', bgcolor: 'grey.50', py: 0.75, px: 1.25 }}>{pair[1] ? pair[1].field_label : ''}</TableCell>
                                    <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontSize: '0.8125rem', py: 0.75, px: 1.25 }}>{pair[1] ? getPreviewValue(pair[1].backend_key) : ''}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        ) : (
                          <Typography variant="caption" color="text.secondary">Footer fields will appear here</Typography>
                        )}
                      </Box>
                    </Paper>
                  </CardContent>
                </Card>
              </Box>
            </Box>
          ) : (
            <Alert severity="info">Could not load report configuration. Ensure the backend is running.</Alert>
          )}
        </Box>
      )}

      {/* Add Device Modal */}
      <Dialog open={showAddDeviceModal} onClose={closeAddDeviceModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
          <BluetoothIcon color="primary" />
          Add Device to Database
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Device Name *"
              fullWidth
              value={deviceForm.name}
              onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })}
              placeholder="Enter device name"
            />
            <TextField
              label="Device ID *"
              fullWidth
              value={deviceForm.deviceId}
              onChange={(e) => setDeviceForm({ ...deviceForm, deviceId: e.target.value })}
              placeholder="Enter unique device ID"
            />
            <TextField
              label="MAC Address"
              fullWidth
              value={selectedDevice?.address || ''}
              disabled
              sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#6B7280' } }}
            />
            <TextField
              label="Calibration Settings"
              fullWidth
              multiline
              rows={3}
              value={deviceForm.calibration}
              onChange={(e) => setDeviceForm({ ...deviceForm, calibration: e.target.value })}
              placeholder="Enter calibration parameters (optional)"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeAddDeviceModal} variant="outlined">
            Cancel
          </Button>
          <Button onClick={saveDevice} variant="contained" sx={{ bgcolor: '#2F6FED', '&:hover': { bgcolor: '#1E5DD4' } }}>
            Save to Database
          </Button>
        </DialogActions>
      </Dialog>

      {/* Discovered Devices Modal */}
      <Dialog 
        open={showDiscoveredDevicesModal} 
        onClose={() => setShowDiscoveredDevicesModal(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
          <BluetoothIcon color="primary" />
          Discovered Bluetooth Devices
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {discoveredDevices.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                <BluetoothIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                <Typography variant="body1">
                  No devices found. Make sure Bluetooth is enabled and devices are in range.
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>Device Name</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>MAC Address</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Signal</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {discoveredDevices.map((device) => (
                      <TableRow key={device.address} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BluetoothIcon sx={{ fontSize: 16 }} color="action" />
                            <Typography variant="body2">
                              {device.name || 'Unknown Device'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {device.address}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {device.rssi ? `${device.rssi} dBm` : 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PlusIcon fontSize="small" />}
                            onClick={() => {
                              setShowDiscoveredDevicesModal(false);
                              openAddDeviceModal(device);
                            }}
                            sx={{ fontSize: '0.75rem' }}
                          >
                            Add
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button 
            onClick={() => setShowDiscoveredDevicesModal(false)} 
            variant="outlined"
          >
            Close
          </Button>
          <Button 
            onClick={scanDevices} 
            variant="contained"
            startIcon={<RefreshIcon />}
            disabled={isScanning}
            sx={{ bgcolor: '#2F6FED', '&:hover': { bgcolor: '#1E5DD4' } }}
          >
            {isScanning ? 'Scanning...' : 'Scan Again'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Loading overlay when connecting */}
      <Backdrop
        open={connectingDeviceId !== null}
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress color="inherit" size={48} sx={{ mb: 2 }} />
          <Typography variant="h6">Connecting to device...</Typography>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>Please wait</Typography>
        </Box>
      </Backdrop>

      {/* Connected success dialog */}
      <Dialog
        open={!!showConnectedDialog}
        onClose={() => { setShowConnectedDialog(null); setConnectionTestReadValue(null); }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
          <WifiIcon sx={{ color: 'success.main', fontSize: 28 }} />
          Device connected
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: connectionTestReadValue ? 2 : 0 }}>
            {showConnectedDialog?.name || 'Device'} is now connected.
          </Typography>
          {connectionTestReadValue && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                BLE characteristic value read from device
              </Typography>
              <Typography variant="h6" component="div" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {connectionTestReadValue.value}
              </Typography>
              {connectionTestReadValue.uuid && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Characteristic: {connectionTestReadValue.uuid}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => { setShowConnectedDialog(null); setConnectionTestReadValue(null); }} variant="contained" sx={{ bgcolor: '#2F6FED', '&:hover': { bgcolor: '#1E5DD4' } }}>
            OK
          </Button>
        </DialogActions>
      </Dialog>

      {/* Measurement values dialog */}
      <Dialog
        open={!!deviceForMeasurements}
        onClose={() => setDeviceForMeasurements(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
          <MeasurementIcon color="primary" />
          Measurement values — {deviceForMeasurements?.name || 'Device'}
        </DialogTitle>
        <DialogContent>
          {measurementValues?.placeholder ? (
            <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}>
              <MeasurementIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} color="action" />
              <Typography variant="body1">{measurementValues.message}</Typography>
            </Box>
          ) : measurementValues && !measurementValues.placeholder ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {typeof measurementValues === 'object' && Object.entries(measurementValues).map(([key, value]) => (
                <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="body2" fontWeight={500}>{key}</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{String(value)}</Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ py: 3, textAlign: 'center' }}>
              <CircularProgress size={32} />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeviceForMeasurements(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit device dialog */}
      <Dialog open={showEditDeviceModal} onClose={closeEditDeviceModal} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
          <EditIcon color="primary" />
          Edit device
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Device name"
              fullWidth
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <TextField
              label="Device ID"
              fullWidth
              value={editForm.deviceId}
              onChange={(e) => setEditForm(prev => ({ ...prev, deviceId: e.target.value }))}
              required
            />
            <TextField
              label="MAC Address"
              fullWidth
              value={editDevice?.mac_address || ''}
              disabled
              size="small"
              sx={{ '& .MuiInputBase-input.Mui-disabled': { WebkitTextFillColor: '#6B7280' } }}
            />
            <TextField
              label="Next calibration date"
              fullWidth
              type="date"
              value={editForm.next_calibration_date}
              onChange={(e) => setEditForm(prev => ({ ...prev, next_calibration_date: e.target.value }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Calibration / notes"
              fullWidth
              multiline
              rows={3}
              value={editForm.calibration}
              onChange={(e) => setEditForm(prev => ({ ...prev, calibration: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeEditDeviceModal} variant="outlined">Cancel</Button>
          <Button onClick={saveEditDevice} variant="contained" sx={{ bgcolor: '#2F6FED', '&:hover': { bgcolor: '#1E5DD4' } }}>
            Save changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deviceToDelete} onClose={() => setDeviceToDelete(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontWeight: 600 }}>
          <DeleteIcon color="error" sx={{ fontSize: 26 }} />
          Remove device
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to remove <strong>{deviceToDelete?.name || 'this device'}</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeviceToDelete(null)} variant="outlined">Cancel</Button>
          <Button
            onClick={() => removeDevice(deviceToDelete)}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon fontSize="small" />}
          >
            Delete device
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Configuration;
