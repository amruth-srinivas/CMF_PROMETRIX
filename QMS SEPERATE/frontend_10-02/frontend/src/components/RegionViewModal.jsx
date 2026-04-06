import React, { useState, useEffect } from 'react';
import {
  Dialog,
  IconButton,
  Button,
  Box,
  Typography,
  Paper,
  LinearProgress,
  Alert,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import viewRegionService from '../services/viewRegionService';

const LIGHT = {
  modal: '#ffffff',
  header: '#f5f5f5',
  card: '#fafafa',
  border: 'rgba(0,0,0,0.12)',
  accent: '#1976d2',
  text: 'rgba(0,0,0,0.87)',
  textSecondary: 'rgba(0,0,0,0.6)',
};

const DetailCell = ({ label, value }) => (
  <Box sx={{ display: 'flex', borderBottom: `1px solid ${LIGHT.border}` }}>
    <Box sx={{ px: 1, py: 0.5, borderRight: `1px solid ${LIGHT.border}`, flex: '1 1 50%', minWidth: 0 }}>
      <Typography variant="body2" sx={{ color: LIGHT.textSecondary, fontSize: '0.75rem' }}>{label}</Typography>
    </Box>
    <Box sx={{ px: 1, py: 0.5, flex: '1 1 50%', minWidth: 0 }}>
      <Typography variant="body2" sx={{ color: LIGHT.text, fontWeight: 500, fontSize: '0.8rem' }}>{value ?? '—'}</Typography>
    </Box>
  </Box>
);

const RegionViewModal = ({
  isOpen,
  onClose,
  pdfId,
  boundingBox,
  balloonData,
  page = 0,
  title = 'Region View',
  onEdit,
  variant = 'modal', // 'modal' | 'inline'
}) => {
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomFactor, setZoomFactor] = useState(3.0);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    if (isOpen && pdfId && boundingBox) {
      extractRegion();
    } else if (!isOpen) {
      setImageData(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, pdfId, boundingBox, page, zoomFactor, autoRotate]);

  const extractRegion = async () => {
    if (!pdfId || !boundingBox) {
      setError('Missing PDF ID or bounding box information');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const enhancedBoundingBox = {
        x: boundingBox.x - 2,
        y: boundingBox.y - 2,
        width: boundingBox.width + 4,
        height: boundingBox.height + 4,
      };
      const response = await viewRegionService.extractRegionFromBoundingBox(
        pdfId,
        enhancedBoundingBox,
        page,
        { zoomFactor, autoRotate }
      );
      if (response.success && response.image_base64) {
        setImageData(response.image_base64);
      } else {
        setError(response.message || 'Failed to extract region');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while extracting the region');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => extractRegion();

  const handleDownload = () => {
    if (!imageData) return;
    try {
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `region_${pdfId}_page${page}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading image:', err);
    }
  };

  const nominal = balloonData?.nominal ?? balloonData?.balloon?.nominal ?? balloonData?.extracted_text ?? '—';
  const utol = balloonData?.balloon?.utol ?? balloonData?.utol;
  const ltol = balloonData?.balloon?.ltol ?? balloonData?.ltol;
  const dimType = balloonData?.dimension_data?.[0]?.type ?? balloonData?.balloon?.type ?? 'Length';
  const instrument = balloonData?.measuring_instrument ?? balloonData?.dimension_data?.[0]?.instrument ?? '—';

  if (!isOpen) {
    return null;
  }

  const containerSx = {
    bgcolor: '#fff',
    borderRadius: 1,
    minHeight: 0,
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    border: `1px solid ${LIGHT.border}`,
    ...(variant === 'inline' ? { width: '100%', mt: 0.5 } : {}),
  };

  const content = (
    <Box sx={containerSx}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.4, bgcolor: LIGHT.header, borderBottom: `1px solid ${LIGHT.border}` }}>
        <Typography variant="subtitle2" sx={{ color: LIGHT.text, fontWeight: 600, fontSize: '0.8rem' }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {imageData && (
            <IconButton size="small" onClick={handleDownload} sx={{ color: LIGHT.textSecondary }} title="Download">
              <DownloadIcon fontSize="small" />
            </IconButton>
          )}
          {(loading || error) && (
            <IconButton
              size="small"
              onClick={handleRetry}
              disabled={loading}
              sx={{ color: LIGHT.textSecondary }}
              title="Refresh"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton onClick={onClose} sx={{ color: LIGHT.text }} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Content: image | Details | Dimensions + EDIT */}
      <Box sx={{ p: 0.75, display: 'flex', flexDirection: 'column' }}>
        {error && (
          <Alert severity="error" sx={{ mb: 0.75, py: 0.25 }} action={<Button color="inherit" size="small" onClick={handleRetry}>Retry</Button>}>
            {error}
          </Alert>
        )}
        {loading && (
          <Box sx={{ py: 1.5 }}>
            <LinearProgress sx={{ mb: 0.5 }} />
            <Typography variant="caption" sx={{ color: LIGHT.textSecondary, fontSize: '0.7rem' }}>Extracting region...</Typography>
          </Box>
        )}

        {!loading && (
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 0.75, alignItems: 'stretch' }}>
            {/* Region image */}
            <Box
              sx={{
                flex: { xs: '0 0 auto', sm: '0 0 26%' },
                maxWidth: { sm: 180 },
                borderRadius: 0.5,
                border: `1px solid ${LIGHT.border}`,
                overflow: 'hidden',
                bgcolor: LIGHT.card,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 88,
                maxHeight: 140,
                p: 0.5,
              }}
            >
              {imageData ? (
                <Box component="img" src={imageData} alt="Region" sx={{ maxWidth: '100%', maxHeight: 130, objectFit: 'contain', display: 'block' }} />
              ) : (
                <Typography variant="caption" sx={{ color: LIGHT.textSecondary, fontSize: '0.7rem' }}>No region image</Typography>
              )}
            </Box>

            {/* Balloon details: Nominal, Upper/Lower tol, Type, Instrument + EDIT */}
            <Paper variant="outlined" sx={{ flex: { xs: '1 1 auto', sm: '1 1 1' }, minWidth: 0, bgcolor: LIGHT.card, borderColor: LIGHT.border, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="caption" sx={{ px: 1, py: 0.4, color: LIGHT.text, fontWeight: 600, fontSize: '0.75rem' }}>Balloon details</Typography>
              <Divider sx={{ borderColor: LIGHT.border }} />
              <Box sx={{ flex: 1 }}>
                <DetailCell label="Nominal" value={String(nominal)} />
                <DetailCell label="Upper tol" value={utol != null && utol !== '' ? (String(utol).startsWith('+') || String(utol).startsWith('-') ? String(utol) : `+${utol}`) : '—'} />
                <DetailCell label="Lower tol" value={ltol != null && ltol !== '' ? String(ltol) : '—'} />
                <DetailCell label="Type of dimension" value={dimType} />
                <DetailCell label="Instrument" value={instrument} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, py: 0.5, borderTop: `1px solid ${LIGHT.border}` }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<EditIcon sx={{ fontSize: 14 }} />}
                  onClick={() => onEdit && onEdit(balloonData)}
                  color="primary"
                  sx={{ minHeight: 26, fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}
                >
                  Edit
                </Button>
              </Box>
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );

  if (variant === 'inline') {
    return content;
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
        },
      }}
      slotProps={{ backdrop: { sx: { bgcolor: 'rgba(0,0,0,0.5)' } } }}
    >
      {content}
    </Dialog>
  );
};

export default RegionViewModal;
