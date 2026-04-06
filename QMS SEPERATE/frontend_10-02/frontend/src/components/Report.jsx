import React, { useState, useEffect, useMemo } from 'react';
import { FileText as ReportIcon, Download, Upload, ChevronLeft, ChevronRight, Palette, Table, Settings, FileSpreadsheet } from 'lucide-react';
import useReportStore from '../store/report';
import useBboxStore from '../store/bbox';
import PDFViewer from './PDFViewer';
import jsPDF from "jspdf";
import { getBalloonedPdfDownloadUrl } from "../store/report";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Grid,
  Table as MuiTable,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  CircularProgress,
  TextField,
  Tooltip,
  Chip,
  FormControlLabel,
  Checkbox,
  MenuItem,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import TableChartIcon from '@mui/icons-material/TableChart';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const REPORT_CONFIG_API = 'http://172.18.100.26:8986/api/v1/report-config';
const BLOB_BASE = 'http://172.18.100.26:8986/blob';

// ─────────────────────────────────────────────────────────────────
// Helper: fetch ballooned PDF page as PNG using direct API endpoint
// ─────────────────────────────────────────────────────────────────
const fetchBalloonedImageAsBase64 = async (pdfId) => {
  const url = `http://172.18.100.26:8986/api/v1/pdf-annotation/pdf/${pdfId}/download-ballooned`;
  const res = await fetch(url, { headers: { accept: 'application/pdf' } });
  if (!res.ok) throw new Error(`Failed to fetch ballooned PDF: ${res.status} ${res.statusText}`);
  const buffer = await res.arrayBuffer();

  const pdfjsLib = await import('pdfjs-dist');
  if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  }
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
  const page = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 3 });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
    aspect: canvas.width / canvas.height,
  };
};

const Report = ({
  partData, partId, bomData, logo, setLogo, customFields, notes,
  showReportModal, setShowReportModal,
  showCustomFieldsModal, setShowCustomFieldsModal,
  showLogoModal, setShowLogoModal,
  showStatus
}) => {

  const { pdfData, pdfDimensions, currentPage } = useBboxStore();
  const [tableData, setTableData] = useState([]);
  const [tableHeaders, setTableHeaders] = useState(['ID', 'NOMINAL', 'TOLERANCE', 'TYPE', 'M1', 'M2', 'M3', 'MEAN', 'STATUS']);
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, row: null, col: null });

  const handleContextMenu = (e, rowIndex, colIndex) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, row: rowIndex, col: colIndex });
  };
  const closeContextMenu = () => setContextMenu({ visible: false, x: 0, y: 0, row: null, col: null });

  const [isResizingLogo, setIsResizingLogo] = useState(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const handleLogoResizeMouseDown = (e, handle) => {
    e.preventDefault(); e.stopPropagation();
    setIsResizingLogo(handle);
    setResizeStart({ x: e.clientX, y: e.clientY, width: reportCompanyLogoSize.width, height: reportCompanyLogoSize.height });
  };

  const [companyNamePosition, setCompanyNamePosition] = useState({ x: 20, y: 10, isDragging: false });
  const [companyNameDragStart, setCompanyNameDragStart] = useState({ x: 0, y: 0 });
  const [companyNameSize, setCompanyNameSize] = useState({ fontSize: 20, width: 300 });
  const [showNameControls, setShowNameControls] = useState(false);
  const [reportCompanyLogoPosition, setReportCompanyLogoPosition] = useState({ x: 340, y: 10, isDragging: false });
  const [reportCompanyLogoDragStart, setReportCompanyLogoDragStart] = useState({ x: 0, y: 0 });
  const [reportCompanyLogoSize, setReportCompanyLogoSize] = useState({ width: 150, height: 80 });
  const [showLogoControls, setShowLogoControls] = useState(false);

  const handleCompanyNameMouseDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const el = document.getElementById('report-header');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCompanyNameDragStart({ x: e.clientX - rect.left - companyNamePosition.x, y: e.clientY - rect.top - companyNamePosition.y });
    setCompanyNamePosition(prev => ({ ...prev, isDragging: true }));
  };

  const handleReportCompanyLogoMouseDown = (e) => {
    e.preventDefault(); e.stopPropagation();
    const el = document.getElementById('report-header');
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setReportCompanyLogoDragStart({ x: e.clientX - rect.left - reportCompanyLogoPosition.x, y: e.clientY - rect.top - reportCompanyLogoPosition.y });
    setReportCompanyLogoPosition(prev => ({ ...prev, isDragging: true }));
  };

  const [customHeaders, setCustomHeaders] = useState([]);
  const [customFooters, setCustomFooters] = useState([]);
  const [showHeadersFootersModal, setShowHeadersFootersModal] = useState(false);
  const [newHeaderLabel, setNewHeaderLabel] = useState('');
  const [newHeaderValue, setNewHeaderValue] = useState('');
  const [newFooterLabel, setNewFooterLabel] = useState('');
  const [newFooterValue, setNewFooterValue] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [showThemesModal, setShowThemesModal] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reportZoom, setReportZoom] = useState(1);
  const [reportAlignment, setReportAlignment] = useState('center');
  const [reportFontScale, setReportFontScale] = useState('medium'); // 'small' | 'medium' | 'large'
  const [reportFontFamily, setReportFontFamily] = useState('system'); // 'system' | 'serif' | 'mono'
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyLogoPosition, setCompanyLogoPosition] = useState({ x: 20, y: 20, isDragging: false });
  const [companyLogoDragStart, setCompanyLogoDragStart] = useState({ x: 0, y: 0 });
  const [includeDrawing, setIncludeDrawing] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);

  // Dynamic theme for live font size / style preview
  const baseTheme = useMemo(() => createTheme(), []);
  const reportTheme = useMemo(() => {
    const fontFamily =
      reportFontFamily === 'serif'
        ? '"Times New Roman", Georgia, "Times", serif'
        : reportFontFamily === 'mono'
        ? '"Roboto Mono", "Courier New", monospace'
        : '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif';

    const scale =
      reportFontScale === 'small' ? 0.9 : reportFontScale === 'large' ? 1.15 : 1.0;

    // Use explicit numeric sizes (in rem) to avoid NaN from multiplying strings
    const baseBodySize = 0.9;
    const baseBody2Size = 0.8;
    const baseCaptionSize = 0.7;
    const baseSubtitle2Size = 0.8;
    const baseSubtitle1Size = 0.95;
    const baseH6Size = 1.0;

    return createTheme({
      ...baseTheme,
      typography: {
        ...baseTheme.typography,
        fontFamily,
        body1: {
          ...baseTheme.typography.body1,
          fontSize: `${baseBodySize * scale}rem`,
        },
        body2: {
          ...baseTheme.typography.body2,
          fontSize: `${baseBody2Size * scale}rem`,
        },
        caption: {
          ...baseTheme.typography.caption,
          fontSize: `${baseCaptionSize * scale}rem`,
        },
        subtitle2: {
          ...baseTheme.typography.subtitle2,
          fontSize: `${baseSubtitle2Size * scale}rem`,
        },
        subtitle1: {
          ...baseTheme.typography.subtitle1,
          fontSize: `${baseSubtitle1Size * scale}rem`,
        },
        h6: {
          ...baseTheme.typography.h6,
          fontSize: `${baseH6Size * scale}rem`,
        },
      },
    });
  }, [baseTheme, reportFontFamily, reportFontScale]);

  useEffect(() => {
    const fn = () => { if (contextMenu.visible) closeContextMenu(); };
    document.addEventListener('click', fn);
    return () => document.removeEventListener('click', fn);
  }, [contextMenu.visible]);

  const reportThemes = {
    default: {
      name: 'Default Theme',
      headerBg: '#ffffff',
      headerBorder: '#d1d5db',
      titleColor: '#111827',
      subtitleColor: '#4b5563',
      sectionBg: '#ffffff',
      sectionBorder: '#e5e7eb',
      tableHeaderBg: '#f9fafb',
      tableHeaderColor: '#374151',
      tableBorder: '#e5e7eb',
      footerBg: '#f9fafb',
      footerColor: '#6b7280',
    },
    blue: {
      name: 'Blue Professional',
      headerBg: '#e0ecff',
      headerBorder: '#93c5fd',
      titleColor: '#1e3a8a',
      subtitleColor: '#1d4ed8',
      sectionBg: '#ffffff',
      sectionBorder: '#bfdbfe',
      tableHeaderBg: '#eff6ff',
      tableHeaderColor: '#1e40af',
      tableBorder: '#dbeafe',
      footerBg: '#eff6ff',
      footerColor: '#1e3a8a',
    },
    green: {
      name: 'Green Corporate',
      headerBg: '#dcfce7',
      headerBorder: '#86efac',
      titleColor: '#166534',
      subtitleColor: '#15803d',
      sectionBg: '#ffffff',
      sectionBorder: '#bbf7d0',
      tableHeaderBg: '#ecfdf5',
      tableHeaderColor: '#166534',
      tableBorder: '#bbf7d0',
      footerBg: '#ecfdf5',
      footerColor: '#166534',
    },
    purple: {
      name: 'Purple Modern',
      headerBg: '#f3e8ff',
      headerBorder: '#e9d5ff',
      titleColor: '#581c87',
      subtitleColor: '#7e22ce',
      sectionBg: '#ffffff',
      sectionBorder: '#e9d5ff',
      tableHeaderBg: '#faf5ff',
      tableHeaderColor: '#6b21a8',
      tableBorder: '#e9d5ff',
      footerBg: '#faf5ff',
      footerColor: '#6b21a8',
    },
    minimal: {
      name: 'Minimal Light',
      headerBg: '#fafafa',
      headerBorder: '#e5e7eb',
      titleColor: '#111827',
      subtitleColor: '#6b7280',
      sectionBg: '#ffffff',
      sectionBorder: '#e5e7eb',
      tableHeaderBg: '#f9fafb',
      tableHeaderColor: '#374151',
      tableBorder: '#e5e7eb',
      footerBg: '#f9fafb',
      footerColor: '#9ca3af',
    },
  };

  const hexToRgb = (hex) => {
    if (!hex) return [0, 0, 0];
    const cleaned = String(hex).replace('#', '');
    if (cleaned.length !== 6) return [0, 0, 0];
    const num = parseInt(cleaned, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  };

  const ThemesModal = () => {
    if (!showThemesModal) return null;
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1003, padding: '1rem' }}
        onClick={(e) => { if (e.target === e.currentTarget) setShowThemesModal(false); }}>
        <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '1.5rem', width: '500px', maxWidth: '95vw', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', fontWeight: '700', color: '#111827' }}>Choose Report Theme</h3>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
            {Object.entries(reportThemes).map(([key, theme]) => (
              <div key={key} onClick={() => setSelectedTheme(key)} style={{ padding: '1rem', border: selectedTheme === key ? '2px solid #3b82f6' : '1px solid #e5e7eb', borderRadius: '6px', backgroundColor: selectedTheme === key ? '#eff6ff' : '#ffffff', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '4px', backgroundColor: theme.headerBg, border: `2px solid ${theme.headerBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '20px', height: '20px', backgroundColor: theme.titleColor, borderRadius: '2px' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>{theme.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Professional {key} theme</div>
                  </div>
                  {selectedTheme === key && <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff' }} /></div>}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowThemesModal(false)} style={{ padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#ffffff', color: '#374151', fontSize: '0.875rem', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => setShowThemesModal(false)} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', backgroundColor: '#3b82f6', color: '#ffffff', fontSize: '0.875rem', cursor: 'pointer' }}>Apply Theme</button>
          </div>
        </div>
      </div>
    );
  };

  const { reportData, loading: reportLoading, error: reportError, fetchPartReport } = useReportStore();
  const [reportConfig, setReportConfig] = useState(null);
  const [reportConfigLoading, setReportConfigLoading] = useState(false);
  const [partDetails, setPartDetails] = useState(null);

  // Resolve footer/header field value from backend_key using report, part, and partDetails
  const getReportValue = (backendKey, reportDataVal = reportData, partDataVal = partData, bomDataVal = bomData) => {
    if (!backendKey) return '';
    const key = String(backendKey).toLowerCase().replace(/\s+/g, '_');
    const rd = reportDataVal || {};
    const pd = partDataVal || {};
    const part = partDetails || pd;
    const bomRaw = bomDataVal;
    const bom = Array.isArray(bomRaw) ? (bomRaw[0] || {}) : (bomRaw || {});
    const boc = rd.boc || {};
    const projectObj = boc.project || part.project || bom.project || (part.project_id && { name: part.project_name || 'N/A' }) || {};
    const projectName = typeof projectObj === 'object' && projectObj !== null ? (projectObj.name ?? projectObj.title) : (projectObj || '');
    const inspection = rd.inspection || {};
    const today = new Date().toISOString().slice(0, 10);
    const map = {
      part_no: rd.part_no ?? pd.name ?? part.name ?? part.part_no ?? 'N/A',
      part_number: rd.part_no ?? pd.name ?? part.name ?? part.part_no ?? 'N/A',
      part_name: rd.part_name ?? pd.part_name ?? part.part_name ?? part.name ?? 'N/A',
      project: (projectName || boc.project?.name) ?? bom.project?.name ?? part.project_name ?? 'N/A',
      project_name: (projectName || boc.project?.name) ?? bom.project?.name ?? part.project_name ?? 'N/A',
      project_no: projectObj?.code ?? boc.project?.code ?? bom.project?.code ?? part.project_code ?? 'N/A',
      project_number: projectObj?.code ?? boc.project?.code ?? bom.project?.code ?? part.project_code ?? 'N/A',
      quantity: boc.quantity ?? bom.quantity ?? rd.quantity ?? part.quantity ?? 'N/A',
      qty: boc.quantity ?? bom.quantity ?? rd.quantity ?? part.quantity ?? 'N/A',
      inspection_no: rd.inspection_no ?? rd.report_no ?? inspection.no ?? inspection.number ?? inspection.id ?? part.inspection_no ?? part.report_no ?? 'N/A',
      report_no: rd.report_no ?? rd.inspection_no ?? inspection.no ?? inspection.number ?? part.report_no ?? part.inspection_no ?? 'N/A',
      inspection_date: rd.inspection_date ?? rd.date ?? inspection.date ?? part.inspection_date ?? part.date ?? today,
      date: rd.inspection_date ?? rd.date ?? inspection.date ?? part.inspection_date ?? part.date ?? today,
      inspection_address: rd.inspection_address ?? inspection.address ?? boc.inspection_address ?? boc.address ?? projectObj?.address ?? part.inspection_address ?? part.address ?? part.location ?? rd.address ?? 'N/A',
      inspector_name: rd.inspector_name ?? rd.inspector ?? inspection.inspector ?? part.inspector_name ?? part.inspector ?? 'N/A',
      inspector: rd.inspector ?? rd.inspector_name ?? inspection.inspector ?? part.inspector ?? part.inspector_name ?? 'N/A',
      prepared_by: rd.prepared_by ?? rd.prepared ?? part.prepared_by ?? 'N/A',
      prepared: rd.prepared ?? rd.prepared_by ?? part.prepared_by ?? 'N/A',
      checked_by: rd.checked_by ?? rd.checked ?? part.checked_by ?? 'N/A',
      approved_by: rd.approved_by ?? rd.approved ?? part.approved_by ?? 'N/A',
      approved: rd.approved ?? rd.approved_by ?? part.approved_by ?? 'N/A',
      centre: rd.centre ?? part.centre ?? 'N/A',
      ref_master_bom_no: rd.ref_master_bom_no ?? bom.bom_no ?? part.ref_master_bom_no ?? 'N/A',
      bom_no: bom.bom_no ?? rd.bom_no ?? part.bom_no ?? 'N/A',
      bom_name: bom.name ?? part.bom_name ?? 'N/A',
      customer: rd.customer ?? boc.customer ?? part.customer ?? 'N/A',
      supplier_name: rd.supplier_name ?? rd.supplier ?? part.supplier_name ?? part.supplier ?? 'N/A',
      supplier: rd.supplier ?? rd.supplier_name ?? part.supplier ?? part.supplier_name ?? 'N/A',
      page: '1 of 1',
      po_no: rd.po_no ?? part.po_no ?? 'N/A',
      ref_oa_no: rd.ref_oa_no ?? part.ref_oa_no ?? 'N/A',
    };
    const val = map[key];
    if (val != null && val !== '') return val;
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (rd[key] != null) return String(rd[key]);
    if (rd[backendKey] != null) return String(rd[backendKey]);
    if (rd[camelKey] != null) return String(rd[camelKey]);
    if (part[key] != null) return String(part[key]);
    if (part[camelKey] != null) return String(part[camelKey]);
    if (boc[key] != null) return String(boc[key]);
    if (boc[camelKey] != null) return String(boc[camelKey]);
    return '';
  };

  const headerConfigFields = (reportConfig?.fields || []).filter(f => f.section === 'header');
  const footerConfigFields = (reportConfig?.fields || []).filter(f => f.section === 'footer');
  const backendLogoUrl = reportConfig?.logo_path ? `${BLOB_BASE}/${reportConfig.logo_path}` : null;
  const backendCompanyName = reportConfig?.company_name || '';
  const backendReportName = reportConfig?.report_name || '';

  const [logoPosition, setLogoPosition] = useState({ x: 0, y: 0, isDragging: false });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reportData?.quantity_reports?.length > 0) {
      const sel = reportData.quantity_reports.find(qr => qr.quantity.toString() === selectedQuantity) || reportData.quantity_reports[0];
      if (sel?.balloons) {
        setTableData(sel.balloons.map(b => ({
          nominal: b.balloon?.nominal || 'N/A',
          tolerance: b.balloon?.utol && b.balloon?.ltol ? `${b.balloon.ltol} / ${b.balloon.utol}` : 'N/A',
          type: b.balloon?.type || 'N/A',
          m1: b.measurements?.[0]?.m1 || 'N/A',
          m2: b.measurements?.[0]?.m2 || 'N/A',
          m3: b.measurements?.[0]?.m3 || 'N/A',
          mean: b.measurements?.[0]?.mean || 'N/A',
          status: b.measurements?.[0]?.go_or_no_go || 'N/A'
        })));
      }
    }
  }, [reportData, selectedQuantity]);

  const handleLogoMouseDown = (e) => {
    e.preventDefault();
    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    setDragStart({ x: e.clientX - rect.left - logoPosition.x, y: e.clientY - rect.top - logoPosition.y });
    setLogoPosition(prev => ({ ...prev, isDragging: true }));
  };

  useEffect(() => {
    const onMove = (e) => {
      if (logoPosition.isDragging) {
        const el = document.getElementById('report-header');
        if (el) { const r = el.getBoundingClientRect(); setLogoPosition({ x: Math.max(0, Math.min(e.clientX - r.left - dragStart.x, r.width - 120)), y: Math.max(0, Math.min(e.clientY - r.top - dragStart.y, r.height - 60)), isDragging: true }); }
      }
      if (companyNamePosition.isDragging) {
        const el = document.getElementById('report-header');
        if (el) { const r = el.getBoundingClientRect(); setCompanyNamePosition({ x: Math.max(0, Math.min(e.clientX - r.left - companyNameDragStart.x, r.width - companyNameSize.width)), y: Math.max(0, Math.min(e.clientY - r.top - companyNameDragStart.y, r.height - 50)), isDragging: true }); }
      }
      if (reportCompanyLogoPosition.isDragging) {
        const el = document.getElementById('report-header');
        if (el) { const r = el.getBoundingClientRect(); setReportCompanyLogoPosition({ x: Math.max(0, Math.min(e.clientX - r.left - reportCompanyLogoDragStart.x, r.width - reportCompanyLogoSize.width)), y: Math.max(0, Math.min(e.clientY - r.top - reportCompanyLogoDragStart.y, r.height - reportCompanyLogoSize.height)), isDragging: true }); }
      }
      if (isResizingLogo) {
        const dx = e.clientX - resizeStart.x, dy = e.clientY - resizeStart.y;
        let w = resizeStart.width, h = resizeStart.height;
        switch (isResizingLogo) {
          case 'se': w = Math.max(50, Math.min(400, w + dx)); h = Math.max(30, Math.min(200, h + dy)); break;
          case 'sw': w = Math.max(50, Math.min(400, w - dx)); h = Math.max(30, Math.min(200, h + dy)); break;
          case 'ne': w = Math.max(50, Math.min(400, w + dx)); h = Math.max(30, Math.min(200, h - dy)); break;
          case 'nw': w = Math.max(50, Math.min(400, w - dx)); h = Math.max(30, Math.min(200, h - dy)); break;
          case 'e': w = Math.max(50, Math.min(400, w + dx)); break;
          case 'w': w = Math.max(50, Math.min(400, w - dx)); break;
          case 'n': h = Math.max(30, Math.min(200, h - dy)); break;
          case 's': h = Math.max(30, Math.min(200, h + dy)); break;
        }
        setReportCompanyLogoSize({ width: w, height: h });
      }
    };
    const onUp = () => {
      if (logoPosition.isDragging) setLogoPosition(p => ({ ...p, isDragging: false }));
      if (companyLogoPosition.isDragging) setCompanyLogoPosition(p => ({ ...p, isDragging: false }));
      if (companyNamePosition.isDragging) setCompanyNamePosition(p => ({ ...p, isDragging: false }));
      if (reportCompanyLogoPosition.isDragging) setReportCompanyLogoPosition(p => ({ ...p, isDragging: false }));
      if (isResizingLogo) setIsResizingLogo(null);
    };
    const active = logoPosition.isDragging || companyLogoPosition.isDragging || companyNamePosition.isDragging || reportCompanyLogoPosition.isDragging || isResizingLogo;
    if (active) { document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); }
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
  }, [logoPosition.isDragging, companyLogoPosition.isDragging, dragStart, companyLogoDragStart, companyNamePosition.isDragging, companyNameDragStart, companyNameSize.width, reportCompanyLogoPosition.isDragging, reportCompanyLogoDragStart, reportCompanyLogoSize.width, reportCompanyLogoSize.height, isResizingLogo, resizeStart]);

  useEffect(() => {
    if (reportData?.quantity_reports?.length > 0 && !selectedQuantity) setSelectedQuantity(reportData.quantity_reports[0].quantity.toString());
  }, [reportData, selectedQuantity]);

  useEffect(() => {
    if (showReportModal && partId) fetchPartReport(partId).catch(err => { console.error(err); showStatus('Failed to load report data', 'error'); });
  }, [showReportModal, partId, fetchPartReport, showStatus]);

  useEffect(() => {
    if (!showReportModal) return;
    setReportConfigLoading(true);
    fetch(`${REPORT_CONFIG_API}/default`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { setReportConfig(data || null); })
      .catch(() => setReportConfig(null))
      .finally(() => setReportConfigLoading(false));
  }, [showReportModal]);

  useEffect(() => {
    if (!showReportModal || !partId) return;
    fetch(`http://172.18.100.26:8888/api/v1/parts/${partId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => setPartDetails(data || null))
      .catch(() => setPartDetails(null));
  }, [showReportModal, partId]);

  // ─────────────────────────────────────────────────────────────────
  // generatePDF
  // ─────────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    try {
      showStatus('Generating PDF...', 'info');
      const { jsPDF } = await import('jspdf');
      const pdfId = reportData?.pdf_id || reportData?.pdfId || reportData?.document_id || reportData?.documentId || reportData?.quantity_reports?.[0]?.pdf_id || reportData?.quantity_reports?.[0]?.pdfId || partData?.document_id || partData?.documentId || partData?.pdf_id || partData?.pdfId;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(), pageHeight = pdf.internal.pageSize.getHeight(), margin = 20;
      let y = margin;
      const addY = (n) => { y += n; };
      const checkPB = (h) => { if (y + h > pageHeight - margin) { pdf.addPage(); y = margin; } };

      // Match PDF styling with live preview controls
      const theme = reportThemes[selectedTheme] || reportThemes.default;
      const fontFamilyPdf =
        reportFontFamily === 'serif' ? 'times' : reportFontFamily === 'mono' ? 'courier' : 'helvetica';
      const fontScale =
        reportFontScale === 'small' ? 0.9 : reportFontScale === 'large' ? 1.15 : 1.0;

      pdf.setFont(fontFamilyPdf, 'normal');

      let imgData = null, imgAspect = null;
      if (pdfId) { try { const info = await fetchBalloonedImageAsBase64(pdfId); imgData = info.dataUrl; imgAspect = info.aspect; } catch (e) { console.warn(e); } }

      const pdfLogoUrl = reportConfig?.logo_path ? `${BLOB_BASE}/${reportConfig.logo_path}` : null;
      let pdfLogoData = null;
      if (pdfLogoUrl) { try { const r = await fetch(pdfLogoUrl); const blob = await r.blob(); const reader = new FileReader(); pdfLogoData = await new Promise((res, rej) => { reader.onload = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(blob); }); } catch (e) { console.warn(e); } }
      const logoToUse = pdfLogoData || companyLogo;
      const nameToUse = reportConfig?.company_name || companyName;
      const reportTitleToUse = reportConfig?.report_name || '';

      if (logoToUse) { try { pdf.addImage(logoToUse, 'PNG', margin, y - 10, 40, 20); } catch (e) { } }
      if (nameToUse) {
        pdf.setFontSize(16 * fontScale);
        pdf.setFont(fontFamilyPdf, 'bold');
        pdf.setTextColor(...hexToRgb(theme.titleColor));
        pdf.text(nameToUse, margin + (logoToUse ? 45 : 0), y + 5, { align: 'left' });
      }
      if (reportTitleToUse) {
        pdf.setFontSize(10 * fontScale);
        pdf.setFont(fontFamilyPdf, 'normal');
        pdf.setTextColor(...hexToRgb(theme.subtitleColor));
        pdf.text(reportTitleToUse, margin + (logoToUse ? 45 : 0), y + (nameToUse ? 12 : 5), { align: 'left' });
      }
      addY(25);
      pdf.setDrawColor(...hexToRgb(theme.sectionBorder));
      pdf.setLineWidth(0.3);
      pdf.line(margin, y, pageWidth - margin, y);
      addY(10);

      checkPB(40);
      pdf.setFontSize(12 * fontScale);
      pdf.setFont(fontFamilyPdf, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Part Information', margin, y);
      addY(8);
      const piData = [['Part Number:', String(reportData?.part_no || 'N/A')], ['Part Name:', String(reportData?.part_name || 'N/A')], ['Project:', String(reportData?.boc?.project?.name || 'N/A')], ['Quantity:', String(reportData?.boc?.quantity || 'N/A')]];
      pdf.setFontSize(9 * fontScale);
      let maxV = 0; piData.forEach(([, v]) => { maxV = Math.max(maxV, pdf.getTextWidth(v)); });
      const lw = 35, vw = maxV + 4, tw = lw + vw, rh = 6, tx = margin, rx = margin + tw + 10, psy = y;
      piData.forEach(([l, v]) => {
        checkPB(rh + 2);
        pdf.setDrawColor(...hexToRgb(theme.sectionBorder));
        pdf.setLineWidth(0.3);
        pdf.rect(tx, y, tw, rh);
        pdf.line(tx + lw, y, tx + lw, y + rh);
        pdf.setFont(fontFamilyPdf, 'bold');
        pdf.setTextColor(...hexToRgb(theme.tableHeaderColor));
        pdf.text(l, tx + 2, y + 4);
        pdf.setFont(fontFamilyPdf, 'normal');
        pdf.setTextColor(0, 0, 0);
        pdf.text(v, tx + lw + 2, y + 4);
        addY(rh);
      });
      if (customHeaders?.length > 0) {
        const rtw = pageWidth - margin - rx; let mrl = 0, mrv = 0;
        customHeaders.forEach(h => { mrl = Math.max(mrl, pdf.getTextWidth(String(h?.fieldname || '') + ':')); mrv = Math.max(mrv, pdf.getTextWidth(String(h?.value ?? ''))); });
        const rlw = Math.min(60, Math.max(28, mrl + 4)), rvw = Math.min(rtw - rlw, mrv + 4), ctw2 = rlw + rvw;
        customHeaders.forEach((h, i) => { if (!h) return; const ry2 = psy + i * rh; pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.5); pdf.rect(rx, ry2, ctw2, rh); pdf.line(rx + rlw, ry2, rx + rlw, ry2 + rh); pdf.setFont(undefined, 'bold'); pdf.text((h.fieldname || '') + ':', rx + 2, ry2 + 4); pdf.setFont(undefined, 'normal'); pdf.text(String(h.value ?? ''), rx + rlw + 2, ry2 + 4); });
      }
      addY(15);
      if (includeDrawing && imgData && imgAspect) {
        const rem = pageHeight - margin - y, uw = pageWidth - 6, uh = rem - 5;
        if (uh > 20) { let dw = uw, dh = dw / imgAspect; if (dh > uh) { dh = uh; dw = dh * imgAspect; } pdf.addImage(imgData, 'PNG', 3 + (uw - dw) / 2, y, dw, dh); addY(dh + 10); }
      }

      pdf.addPage(); let ty = margin; const tm = 15, tw2 = pageWidth - 2 * tm;
      const cw = [tw2 * 0.04, tw2 * 0.10, tw2 * 0.13, tw2 * 0.18, tw2 * 0.06, tw2 * 0.06, tw2 * 0.06, tw2 * 0.06, tw2 * 0.09];
      const hdrs = ['ID', 'NOMINAL', 'TOLERANCE', 'TYPE', 'M1', 'M2', 'M3', 'MEAN', 'STATUS'];
      pdf.setFontSize(12 * fontScale); pdf.setFont(fontFamilyPdf, 'bold'); pdf.text('Inspection Data', tm, ty); ty += 8;
      pdf.setFontSize(9 * fontScale); pdf.setFont(fontFamilyPdf, 'bold');
      let cx = tm; const hh = 8, rwh = 13;
      const [thR, thG, thB] = hexToRgb(theme.tableHeaderBg);
      const [thTextR, thTextG, thTextB] = hexToRgb(theme.tableHeaderColor);
      hdrs.forEach((h, i) => {
        pdf.setFillColor(thR, thG, thB);
        pdf.rect(cx, ty, cw[i], hh, 'F');
        pdf.setDrawColor(...hexToRgb(theme.tableBorder));
        pdf.setLineWidth(0.3);
        pdf.rect(cx, ty, cw[i], hh);
        pdf.setTextColor(thTextR, thTextG, thTextB);
        pdf.text(h, cx + cw[i] / 2, ty + hh / 2 + 2, { align: 'center' });
        cx += cw[i];
      });
      ty += hh; pdf.setFontSize(9 * fontScale); pdf.setFont(fontFamilyPdf, 'normal');
      tableData.forEach((row, idx) => {
        if (ty > pageHeight - tm - 20) { pdf.addPage(); ty = tm; }
        const vals = [String(idx + 1), String(row.nominal || '-').trim(), String(row.tolerance || '-').trim(), String(row.type || '-').trim(), String(row.m1 || '-').trim(), String(row.m2 || '-').trim(), String(row.m3 || '-').trim(), String(row.mean || '-').trim(), String(row.status || '-').trim()];
        cx = tm;
        vals.forEach((val, i) => {
          pdf.setFillColor(255, 255, 255); pdf.rect(cx, ty, cw[i], rwh, 'F'); pdf.setDrawColor(...hexToRgb(theme.tableBorder)); pdf.setLineWidth(0.2); pdf.rect(cx, ty, cw[i], rwh);
          if (i === 8) { const su = vals[8].toUpperCase(); if (su === 'NO_GO' || su === 'NO-GO' || su === 'NO GO') pdf.setTextColor(255, 0, 0); else if (su === 'GO') pdf.setTextColor(0, 200, 0); else pdf.setTextColor(0, 0, 0); } else { pdf.setTextColor(0, 0, 0); }
          pdf.text(val.substring(0, 30), cx + cw[i] / 2, ty + rwh / 2 + 2, { align: 'center' }); cx += cw[i];
        });
        ty += rwh;
      });

      if (includeNotes && notes?.length > 0) {
        pdf.addPage(); let ny = margin;
        pdf.setFontSize(14 * fontScale); pdf.setFont(fontFamilyPdf, 'bold'); pdf.text('Notes', margin, ny); ny += 15;
        pdf.setFontSize(10 * fontScale); pdf.setFont(fontFamilyPdf, 'normal'); let nn = 1;
        notes.forEach(note => {
          if (!note.note_text) return;
          note.note_text.replace(/^NOTE:\s*/i, '').trim().split(/\n?\s*\d+\.\s*/).map(i => i.trim()).filter(i => i).forEach(item => {
            const u = item.toUpperCase();
            if (!(u.includes('TO BE') || u.includes('CHAMFER') || u.includes('HARDEN') || u.includes('SURFACE') || u.includes('PEENED') || u.includes('PLATED') || u.includes('SHARP') || u.includes('EDGE') || (item.length > 20 && item.split(' ').length > 4))) return;
            if (ny > pageHeight - margin - 30) { pdf.addPage(); ny = margin; }
            pdf.setFont(undefined, 'bold'); pdf.text(`${nn}.`, margin, ny); pdf.setFont(undefined, 'normal');
            pdf.splitTextToSize(item, pageWidth - 2 * margin - 20).forEach((line, li) => { if (li > 0 && ny > pageHeight - margin - 30) { pdf.addPage(); ny = margin; } pdf.text(line, margin + 15, ny); if (li < pdf.splitTextToSize(item, pageWidth - 2 * margin - 20).length - 1) ny += 6; });
            ny += 12; nn++;
          });
        });
      }

      const tp = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= tp; i++) {
        pdf.setPage(i);
        pdf.setDrawColor(210, 210, 210);
        pdf.setLineWidth(0.4);
        pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
      }
      pdf.setPage(tp);
      const fm = 15, fw = pageWidth - 2 * fm, frh = 7;
      pdf.setFontSize(9); pdf.setTextColor(0, 0, 0); pdf.setDrawColor(200, 200, 200); pdf.setLineWidth(0.4);
      const pdfFooterConfig = (reportConfig?.fields || []).filter(f => f.section === 'footer');
      const pdfFooterPairs = [
        ...pdfFooterConfig.map(f => ({ label: f.field_label || f.backend_key || '', value: getReportValue(f.backend_key) || (f.backend_key != null ? String(f.backend_key) : '') })),
        ...(customFooters || []).map(f => ({ label: f.label || '', value: String(f.value ?? '') }))
      ];
      if (pdfFooterPairs.length > 0) {
        const half = Math.ceil(pdfFooterPairs.length / 2);
        const colW = (fw - 10) / 2;
        const lw = colW * 0.35;
        let fy = pageHeight - margin - (half * (frh + 2));
        for (let r = 0; r < half; r++) {
          const left = pdfFooterPairs[r];
          const right = pdfFooterPairs[r + half] || null;
          if (left) {
            pdf.rect(fm, fy, lw, frh); pdf.setFont(undefined, 'bold'); pdf.text((left.label || '') + ':', fm + 2, fy + 5);
            pdf.rect(fm + lw, fy, colW - lw, frh); pdf.setFont(undefined, 'normal'); pdf.text(String(left.value || '').substring(0, 25), fm + lw + 2, fy + 5);
          }
          const rx = fm + colW + 5;
          if (right) {
            pdf.rect(rx, fy, lw, frh); pdf.setFont(undefined, 'bold'); pdf.text((right.label || '') + ':', rx + 2, fy + 5);
            pdf.rect(rx + lw, fy, colW - lw, frh); pdf.setFont(undefined, 'normal'); pdf.text(String(right.value || '').substring(0, 25), rx + lw + 2, fy + 5);
          }
          fy += frh + 2;
        }
        pdf.setFont(undefined, 'normal'); pdf.setFontSize(8); pdf.text(`Page ${tp} of ${tp}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      } else {
        const fy = pageHeight - 25;
        pdf.setFont(undefined, 'normal'); pdf.text('Generated on ' + new Date().toLocaleDateString(), fm, fy + 5);
        pdf.text(partData?.name || 'Direct Part', pageWidth - fm - pdf.getTextWidth(partData?.name || 'Direct Part'), fy + 5);
      }
      pdf.save(`Inspection_Report_${partData.name || 'Direct_Part'}_${new Date().toISOString().split('T')[0]}.pdf`);
      showStatus('PDF downloaded successfully!', 'success');
      setShowReportModal(false);
    } catch (error) { console.error(error); showStatus('Error generating PDF: ' + error.message, 'error'); }
  };

  // ─────────────────────────────────────────────────────────────────
  // generateExcel
  // Layout (SINGLE "Inspection Report" sheet):
  //
  //   Cols A–J  →  Title / Part Info / Inspection Data table
  //   Col K     →  spacer
  //   Cols L–S  →  "BALLOONED DRAWING" header + image, anchored
  //               at the same row as the Inspection Data header
  // ─────────────────────────────────────────────────────────────────
  const generateExcel = async () => {
    try {
      showStatus('Generating Excel...', 'info');

      // Dynamic import for ExcelJS
      const ExcelJS = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Inspection Report');

      // ── Resolve PDF ID ──────────────────────────────────────────
      const pdfId =
        reportData?.pdf_id || reportData?.pdfId ||
        reportData?.document_id || reportData?.documentId ||
        reportData?.quantity_reports?.[0]?.pdf_id ||
        reportData?.quantity_reports?.[0]?.pdfId ||
        partData?.document_id || partData?.documentId ||
        partData?.pdf_id || partData?.pdfId;

      console.log('[Excel] PDF ID:', pdfId);

      // ── Fetch ballooned drawing ─────────────────────────────────
      let imgId = null;
      if (pdfId) {
        try {
          showStatus('Fetching ballooned drawing...', 'info');
          const info = await fetchBalloonedImageAsBase64(pdfId);
          console.log('[Excel] Image:', info.width, 'x', info.height);
          const b64 = info.dataUrl.replace(/^data:image\/png;base64,/, '');
          const bin = atob(b64);
          const buf = new ArrayBuffer(bin.length);
          const view = new Uint8Array(buf);
          for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
          imgId = workbook.addImage({ buffer: buf, extension: 'png' });
          console.log('[Excel] Image ID:', imgId);
        } catch (e) {
          console.warn('[Excel] Image fetch failed:', e);
          showStatus('Warning: Could not load drawing image', 'warning');
        }
      }

      // ── Column widths ────────────────────────────────────────────
      // A  = spacer, B–J = data table, K = gap, L–S = drawing
      ws.columns = [
        { width: 3 },   // A  spacer
        { width: 20 },  // B  ID
        { width: 14 },  // C  NOMINAL
        { width: 18 },  // D  TOLERANCE
        { width: 20 },  // E  TYPE
        { width: 10 },  // F  M1
        { width: 10 },  // G  M2
        { width: 10 },  // H  M3
        { width: 10 },  // I  MEAN
        { width: 13 },  // J  STATUS
        { width: 3 },   // K  gap
        { width: 14 },  // L  \
        { width: 14 },  // M   |
        { width: 14 },  // N   | drawing area  (~500 px wide total)
        { width: 14 },  // O   |
        { width: 14 },  // P   |
        { width: 14 },  // Q   |
        { width: 14 },  // R  /
      ];

      let row = 1;

      // ── Title ────────────────────────────────────────────────────
      ws.mergeCells(`B${row}:J${row}`);
      Object.assign(ws.getCell(`B${row}`), {
        value: 'INSPECTION REPORT',
        font: { bold: true, size: 18, color: { argb: '1F4E79' }, name: 'Arial' },
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      ws.getRow(row).height = 32;
      row += 2;

      // ── Part Information ─────────────────────────────────────────
      ws.mergeCells(`B${row}:J${row}`);
      Object.assign(ws.getCell(`B${row}`), {
        value: 'PART INFORMATION',
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' }, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      ws.getRow(row).height = 20; row++;

      const piRows = [
        ['Part Number:', String(reportData?.part_no || partData?.name || 'N/A')],
        ['Part Name:', String(reportData?.part_name || partData?.part_name || 'N/A')],
        ['Project:', String(reportData?.boc?.project?.name || bomData?.project?.name || 'N/A')],
        ['Quantity:', String(reportData?.boc?.quantity || 'N/A')],
        ...(customHeaders?.map(h => [String(h.fieldname || h.name) + ':', String(h.value)]) || [])
      ];
      piRows.forEach(([label, value]) => {
        ws.mergeCells(`C${row}:J${row}`);
        const lc = ws.getCell(`B${row}`); lc.value = label; lc.font = { bold: true, size: 11, name: 'Arial' }; lc.alignment = { horizontal: 'left', vertical: 'middle' };
        const vc = ws.getCell(`C${row}`); vc.value = value; vc.font = { size: 11, name: 'Arial' }; vc.alignment = { horizontal: 'left', vertical: 'middle' };
        ws.getRow(row).height = 16; row++;
      });

      row++; // spacing before inspection data

      // ═══════════════════════════════════════════════════════════
      // INSPECTION DATA section — remember start row for image anchor
      // ═══════════════════════════════════════════════════════════
      const inspStartRow = row; // image will be placed at this row, col L

      // Inspection Data section header (left side cols B–J)
      ws.mergeCells(`B${row}:J${row}`);
      Object.assign(ws.getCell(`B${row}`), {
        value: 'INSPECTION DATA',
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' }, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      ws.getRow(row).height = 20;

      // "BALLOONED DRAWING" header label (right side cols L–R) — same row
      ws.mergeCells(`L${row}:R${row}`);
      Object.assign(ws.getCell(`L${row}`), {
        value: 'BALLOONED DRAWING',
        font: { bold: true, size: 12, color: { argb: 'FFFFFF' }, name: 'Arial' },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '047857' } },
        alignment: { horizontal: 'center', vertical: 'middle' }
      });
      row++;

      // Table column headers (B–J)
      const tblHdrs = ['ID', 'NOMINAL', 'TOLERANCE', 'TYPE', 'M1', 'M2', 'M3', 'MEAN', 'STATUS'];
      tblHdrs.forEach((h, i) => {
        const c = ws.getCell(String.fromCharCode(66 + i) + row);
        c.value = h;
        c.font = { bold: true, size: 11, color: { argb: 'FFFFFF' }, name: 'Arial' };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '047857' } };
        c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        c.border = { top: { style: 'thin', color: { argb: 'D9D9D9' } }, left: { style: 'thin', color: { argb: 'D9D9D9' } }, bottom: { style: 'thin', color: { argb: 'D9D9D9' } }, right: { style: 'thin', color: { argb: 'D9D9D9' } } };
      });
      ws.getRow(row).height = 20; row++;

      // Table data rows
      tableData.forEach((rowData, idx) => {
        const vals = [idx + 1, rowData.nominal || '-', rowData.tolerance || '-', rowData.type || '-', rowData.m1 || '-', rowData.m2 || '-', rowData.m3 || '-', rowData.mean || '-', rowData.status || '-'];
        vals.forEach((val, ci) => {
          const c = ws.getCell(String.fromCharCode(66 + ci) + row);
          c.value = val;
          c.font = { size: 10, name: 'Arial' };
          c.alignment = { horizontal: 'center', vertical: 'middle' };
          if (ci === 8) {
            const su = String(val).toUpperCase();
            if (su === 'NO_GO' || su === 'NO-GO' || su === 'NO GO') {
              c.font = { size: 10, name: 'Arial', color: { argb: 'CC0000' }, bold: true };
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E5' } };
            } else if (su === 'GO') {
              c.font = { size: 10, name: 'Arial', color: { argb: '006400' }, bold: true };
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E5FFE5' } };
            } else {
              c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB' } };
            }
          } else {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFF' : 'F9FAFB' } };
          }
          c.border = { top: { style: 'thin', color: { argb: 'D9D9D9' } }, left: { style: 'thin', color: { argb: 'D9D9D9' } }, bottom: { style: 'thin', color: { argb: 'D9D9D9' } }, right: { style: 'thin', color: { argb: 'D9D9D9' } } };
        });
        ws.getRow(row).height = 16; row++;
      });

      const inspEndRow = row - 1;

      // ── Place image RIGHT of table (cols L–R, same rows as inspection section) ──
      if (imgId !== null) {
        // How many rows does the table span?
        const spanRows = inspEndRow - inspStartRow + 1;
        // Each row ≈ 18px; minimum 400px tall; max 600px
        const imgH = Math.min(600, Math.max(400, spanRows * 18));
        const imgW = 500; // fits neatly across cols L–R

        ws.addImage(imgId, {
          // tl: top-left corner. col 11 = col L (0-indexed), row = inspStartRow + 1 (0-indexed = inspStartRow)
          tl: { col: 11, row: inspStartRow },
          ext: { width: imgW, height: imgH },
          editAs: 'oneCell'
        });
        console.log('[Excel] Image placed at col L, row', inspStartRow + 1, ', size', imgW, 'x', imgH);
      } else {
        // Placeholder
        ws.mergeCells(`L${inspStartRow + 1}:R${inspStartRow + 3}`);
        const ph = ws.getCell(`L${inspStartRow + 1}`);
        ph.value = 'Ballooned drawing could not be loaded. Check PDF ID or network.';
        ph.font = { italic: true, size: 11, color: { argb: 'CC0000' }, name: 'Arial' };
        ph.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
      }

      // ── Notes ────────────────────────────────────────────────────
      if (notes?.length > 0) {
        row += 2;
        ws.mergeCells(`B${row}:J${row}`);
        Object.assign(ws.getCell(`B${row}`), { value: 'NOTES', font: { bold: true, size: 12, color: { argb: 'FFFFFF' }, name: 'Arial' }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } }, alignment: { horizontal: 'center', vertical: 'middle' } });
        ws.getRow(row).height = 20; row += 2;
        let nn = 1;
        notes.forEach(note => {
          if (!note.note_text) return;
          note.note_text.replace(/^NOTE:\s*/i, '').trim().split(/\n?\s*\d+\.\s*/).map(i => i.trim()).filter(i => i).forEach(item => {
            const u = item.toUpperCase();
            if (!(u.includes('TO BE') || u.includes('CHAMFER') || u.includes('HARDEN') || u.includes('SURFACE') || u.includes('PEENED') || u.includes('PLATED') || u.includes('SHARP') || u.includes('EDGE') || (item.length > 20 && item.split(' ').length > 4))) return;
            ws.mergeCells(`C${row}:J${row}`);
            ws.getCell(`B${row}`).value = `${nn}.`; ws.getCell(`B${row}`).font = { bold: true, size: 10, name: 'Arial' }; ws.getCell(`B${row}`).alignment = { horizontal: 'right', vertical: 'middle' };
            ws.getCell(`C${row}`).value = item; ws.getCell(`C${row}`).font = { size: 10, name: 'Arial' }; ws.getCell(`C${row}`).alignment = { wrapText: true };
            ws.getRow(row).height = 16; row++; nn++;
          });
        });
      }

      // ── Download ─────────────────────────────────────────────────
      const buf = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inspection_report_${partData?.name || 'report'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus('Excel downloaded successfully!', 'success');
    } catch (error) {
      console.error('[Excel] Error:', error);
      showStatus('Error generating Excel: ' + error.message, 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────────
  // Custom Headers & Footers modal
  // ─────────────────────────────────────────────────────────────────
  const addCustomHeader = () => {
    const label = newHeaderLabel.trim();
    const value = newHeaderValue.trim();
    if (label) {
      setCustomHeaders(prev => [...prev, { fieldname: label, name: label, value }]);
      setNewHeaderLabel('');
      setNewHeaderValue('');
      showStatus('Header field added', 'success');
    }
  };
  const removeCustomHeader = (index) => {
    setCustomHeaders(prev => prev.filter((_, i) => i !== index));
    showStatus('Header field removed', 'info');
  };
  const addCustomFooter = () => {
    const label = newFooterLabel.trim();
    const value = newFooterValue.trim();
    if (label) {
      setCustomFooters(prev => [...prev, { label, value }]);
      setNewFooterLabel('');
      setNewFooterValue('');
      showStatus('Footer field added', 'success');
    }
  };
  const removeCustomFooter = (index) => {
    setCustomFooters(prev => prev.filter((_, i) => i !== index));
    showStatus('Footer field removed', 'info');
  };

  const HeadersFootersModal = () => (
    <Dialog open={showHeadersFootersModal} onClose={() => setShowHeadersFootersModal(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Custom Headers & Footers</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'block' }}>Custom header fields</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Add extra rows to the Part Information table.</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField size="small" label="Label" placeholder="e.g. Batch No" value={newHeaderLabel} onChange={(e) => setNewHeaderLabel(e.target.value)} sx={{ minWidth: 140 }} />
              <TextField size="small" label="Value" placeholder="e.g. B-2025-01" value={newHeaderValue} onChange={(e) => setNewHeaderValue(e.target.value)} sx={{ minWidth: 140 }} />
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addCustomHeader}>Add</Button>
            </Box>
            {customHeaders.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                {customHeaders.map((h, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                    <Typography variant="body2" sx={{ flex: 1 }}><strong>{h.fieldname || h.name}</strong>: {h.value || '—'}</Typography>
                    <IconButton size="small" onClick={() => removeCustomHeader(i)} color="error" aria-label="Remove"><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
          <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'block' }}>Custom footer fields</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Add extra rows to the report footer.</Typography>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField size="small" label="Label" placeholder="e.g. Verified by" value={newFooterLabel} onChange={(e) => setNewFooterLabel(e.target.value)} sx={{ minWidth: 140 }} />
              <TextField size="small" label="Value" placeholder="e.g. John" value={newFooterValue} onChange={(e) => setNewFooterValue(e.target.value)} sx={{ minWidth: 140 }} />
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addCustomFooter}>Add</Button>
            </Box>
            {customFooters.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                {customFooters.map((f, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                    <Typography variant="body2" sx={{ flex: 1 }}><strong>{f.label}</strong>: {f.value || '—'}</Typography>
                    <IconButton size="small" onClick={() => removeCustomFooter(i)} color="error" aria-label="Remove"><DeleteOutlineIcon fontSize="small" /></IconButton>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button variant="contained" onClick={() => setShowHeadersFootersModal(false)}>Done</Button>
        </Box>
      </DialogContent>
    </Dialog>
  );

  // ─────────────────────────────────────────────────────────────────
  // ContextMenu
  // ─────────────────────────────────────────────────────────────────
  const ContextMenu = () => {
    if (!contextMenu.visible) return null;
    const items = [
      { label: 'Add Column Before', action: 'addColumnBefore', divider: false }, { label: 'Add Column After', action: 'addColumnAfter', divider: true },
      { label: 'Delete Column Before', action: 'deleteColumnBefore', divider: false }, { label: 'Delete Column After', action: 'deleteColumnAfter', divider: false }, { label: 'Delete Column', action: 'deleteColumn', divider: true },
      { label: 'Add Row Before', action: 'addRowBefore', divider: false }, { label: 'Add Row After', action: 'addRowAfter', divider: true },
      { label: 'Delete Row Before', action: 'deleteRowBefore', divider: false }, { label: 'Delete Row After', action: 'deleteRowAfter', divider: false }, { label: 'Delete Row', action: 'deleteRow', divider: true },
      { label: 'Import Data', action: 'importData', divider: false }, { label: 'Change column name', action: 'changeColumnName', divider: true },
      { label: 'Go', action: 'setGo', divider: false }, { label: 'No-Go', action: 'setNoGo', divider: false }, { label: 'Remove Go/No-Go', action: 'removeGoNoGo', divider: false }
    ];
    const keys = ['nominal', 'tolerance', 'type', 'm1', 'm2', 'm3', 'mean', 'status'];
    const emptyRow = () => { const r = {}; tableHeaders.forEach((_, i) => { r[i < keys.length ? keys[i] : `col_${i}`] = 'N/A'; }); return r; };
    const handle = (action) => {
      const { row, col } = contextMenu;
      switch (action) {
        case 'addColumnBefore': case 'addColumnAfter': setTableHeaders([...tableHeaders, `Col ${tableHeaders.length + 1}`]); setTableData(tableData.map(r => ({ ...r, [`col_${tableHeaders.length}`]: 'N/A' }))); showStatus('Column added', 'success'); break;
        case 'deleteColumnBefore': if (col > 0) { setTableHeaders(tableHeaders.filter((_, i) => i !== col - 1)); showStatus('Column before deleted', 'success'); } break;
        case 'deleteColumnAfter': if (col < tableHeaders.length - 1) { setTableHeaders(tableHeaders.filter((_, i) => i !== col + 1)); showStatus('Column after deleted', 'success'); } break;
        case 'deleteColumn': if (col !== null) { setTableHeaders(tableHeaders.filter((_, i) => i !== col)); showStatus('Column deleted', 'success'); } break;
        case 'addRowBefore': if (row !== null) { const d = [...tableData]; d.splice(row, 0, emptyRow()); setTableData(d); showStatus('Row added', 'success'); } break;
        case 'addRowAfter': if (row !== null) { setTableData([...tableData, emptyRow()]); showStatus('Row added', 'success'); } break;
        case 'deleteRowBefore': if (row > 0) { setTableData(tableData.filter((_, i) => i !== row - 1)); showStatus('Row deleted', 'success'); } break;
        case 'deleteRowAfter': if (row < tableData.length - 1) { setTableData(tableData.filter((_, i) => i !== row + 1)); showStatus('Row deleted', 'success'); } break;
        case 'deleteRow': if (row !== null) { setTableData(tableData.filter((_, i) => i !== row)); showStatus('Row deleted', 'success'); } break;
        case 'importData': showStatus('Import data - coming soon', 'info'); break;
        case 'changeColumnName': if (col !== null) { const n = prompt('New column name:', tableHeaders[col]); if (n?.trim()) { const h = [...tableHeaders]; h[col] = n.trim(); setTableHeaders(h); showStatus('Column renamed', 'success'); } } break;
        case 'setGo': if (row !== null) { const d = [...tableData]; d[row].status = 'GO'; setTableData(d); showStatus('Status: GO', 'success'); } break;
        case 'setNoGo': if (row !== null) { const d = [...tableData]; d[row].status = 'NO-GO'; setTableData(d); showStatus('Status: NO-GO', 'success'); } break;
        case 'removeGoNoGo': if (row !== null) { const d = [...tableData]; d[row].status = 'N/A'; setTableData(d); showStatus('Status cleared', 'success'); } break;
        default: break;
      }
      closeContextMenu();
    };
    return (
      <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y, backgroundColor: 'white', border: '1px solid #d1d5db', borderRadius: '6px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 1000, minWidth: '200px', maxHeight: '400px', overflow: 'auto' }} onClick={(e) => e.stopPropagation()}>
        {items.map((item, i) => (
          <React.Fragment key={i}>
            <div onClick={() => handle(item.action)} style={{ padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.875rem', color: '#374151' }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f6'; }} onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}>{item.label}</div>
            {item.divider && i < items.length - 1 && <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '0.25rem 0' }} />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  if (!showReportModal) return null;

  // Build header rows: present fields (Part Number, Part Name, Project, Qty) + backend header fields, paired in 2-column grid
  const presentHeaderRows = [
    { label: 'PART NUMBER', value: reportData?.part_no ?? partData?.name ?? 'N/A' },
    { label: 'PART NAME', value: reportData?.part_name ?? partData?.part_name ?? 'N/A' },
    { label: 'PROJECT', value: reportData?.boc?.project?.name ?? bomData?.project?.name ?? 'N/A' },
    { label: 'QTY', value: reportData?.boc?.quantity ?? bomData?.quantity ?? 'N/A' },
  ];
  const backendHeaderPairs = headerConfigFields.map(f => {
    const resolved = getReportValue(f.backend_key);
    return { label: (f.field_label || f.backend_key || '').toUpperCase(), value: (resolved !== '' ? resolved : (f.backend_key != null ? String(f.backend_key) : '')) };
  });
  const userHeaderPairs = (customHeaders || []).map(h => ({ label: String(h.fieldname || h.name || h.label || '').toUpperCase(), value: String(h.value ?? '') }));
  const allHeaderPairs = [...presentHeaderRows.map(r => ({ label: r.label, value: r.value })), ...backendHeaderPairs, ...userHeaderPairs];
  const headerGridRows = [];
  for (let i = 0; i < allHeaderPairs.length; i += 2) {
    headerGridRows.push([allHeaderPairs[i], allHeaderPairs[i + 1] || null]);
  }

  // Quick inspection summary for sidebar
  const totalCharacteristics = tableData.length;
  let goCount = 0;
  let noGoCount = 0;
  tableData.forEach(row => {
    const status = String(row.status || '').toUpperCase();
    if (status === 'GO') {
      goCount += 1;
    } else if (status === 'NO-GO' || status === 'NO_GO' || status === 'NO GO') {
      noGoCount += 1;
    }
  });
  const hasInspectionData = totalCharacteristics > 0;

  // Footer: DB footer fields + user custom footers in 2-column grid
  const userFooterPairs = (customFooters || []).map(f => ({ label: String(f.label || '').toUpperCase(), value: String(f.value ?? '') }));
  const footerGridRows = [];
  for (let i = 0; i < footerConfigFields.length; i += 2) {
    footerGridRows.push([footerConfigFields[i], footerConfigFields[i + 1] || null]);
  }
  for (let i = 0; i < userFooterPairs.length; i += 2) {
    footerGridRows.push([userFooterPairs[i], userFooterPairs[i + 1] || null]);
  }

  return (
    <ThemeProvider theme={reportTheme}>
      <Dialog
        open={showReportModal}
        onClose={() => setShowReportModal(false)}
        maxWidth={false}
        fullWidth
        PaperProps={{ sx: { maxWidth: 1200, width: '95vw', height: '90vh', borderRadius: 2, overflow: 'hidden' } }}
      >
        <DialogTitle
          sx={{
            px: 2.5,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Inspection Report
            </Typography>
            {partData?.name && (
              <Typography variant="body2" color="text.secondary">
                {partData.name}
              </Typography>
            )}
          </Box>
          <IconButton
            size="small"
            onClick={() => setShowReportModal(false)}
            aria-label="Close report"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'row', overflow: 'hidden', bgcolor: 'grey.100' }}>
        {/* ── SIDEBAR (Report Controls) ── */}
        <Paper
          elevation={0}
          sx={{
            width: sidebarCollapsed ? 72 : 320,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
            borderRight: '2px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Box
            sx={{
              borderBottom: '2px solid',
              borderColor: 'divider',
              py: 1.5,
              px: sidebarCollapsed ? 1 : 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'space-between',
              gap: 1,
            }}
          >
            {!sidebarCollapsed && (
              <Box>
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: 1,
                    color: 'text.secondary',
                  }}
                >
                  Report controls
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {partData?.name || reportData?.part_name || 'Untitled part'}
                </Typography>
              </Box>
            )}
          </Box>

          <Box
            sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              p: 1.5,
            }}
          >
            {!sidebarCollapsed && (
              <>
                {/* Configuration */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 0.5, display: 'block' }}
                  >
                    Configuration
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ViewModuleIcon />}
                        onClick={() => setShowHeadersFootersModal(true)}
                        sx={{ textTransform: 'none' }}
                      >
                        Headers & Footers
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Palette size={16} />}
                        onClick={() => setShowThemesModal(true)}
                        sx={{ textTransform: 'none' }}
                      >
                        Themes
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        select
                        size="small"
                        label="Font size"
                        value={reportFontScale}
                        onChange={(e) => setReportFontScale(e.target.value)}
                        sx={{ minWidth: 120 }}
                      >
                        <MenuItem value="small">Small</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="large">Large</MenuItem>
                      </TextField>
                      <TextField
                        select
                        size="small"
                        label="Font style"
                        value={reportFontFamily}
                        onChange={(e) => setReportFontFamily(e.target.value)}
                        sx={{ minWidth: 140 }}
                      >
                        <MenuItem value="system">Sans (default)</MenuItem>
                        <MenuItem value="serif">Serif</MenuItem>
                        <MenuItem value="mono">Monospace</MenuItem>
                      </TextField>
                    </Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={includeDrawing}
                          onChange={(e) => setIncludeDrawing(e.target.checked)}
                        />
                      }
                      label="Attach part drawing in report"
                      sx={{ mt: 0.25 }}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          size="small"
                          checked={includeNotes}
                          onChange={(e) => setIncludeNotes(e.target.checked)}
                        />
                      }
                      label="Append notes section in report"
                      sx={{ mt: -0.25 }}
                    />
                  </Box>
                </Box>

                {/* Scope & status */}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'text.secondary', mb: 0.5, display: 'block' }}
                  >
                    Data scope
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {reportData?.quantity_reports?.length > 0 && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ minWidth: 80 }}>
                          Quantity
                        </Typography>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <MuiTable size="small">
                            <TableBody>
                              <TableRow>
                                <TableCell sx={{ border: 0, p: 0 }}>
                                  <select
                                    value={selectedQuantity}
                                    onChange={(e) => setSelectedQuantity(e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '8px 12px',
                                      border: '1px solid #ccc',
                                      borderRadius: 4,
                                      fontSize: '0.875rem',
                                      background: '#fff',
                                    }}
                                  >
                                    <option value="">All Qty</option>
                                    {reportData.quantity_reports.map((qr, i) => (
                                      <option key={i} value={qr.quantity}>
                                        Qty{qr.quantity}
                                      </option>
                                    ))}
                                    <option value="consolidate">Consolidate</option>
                                  </select>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </MuiTable>
                        </Box>
                      </Box>
                    )}

                    {hasInspectionData && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip
                          size="small"
                          label={`Characteristics: ${totalCharacteristics}`}
                          color="default"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`GO: ${goCount}`}
                          color="success"
                          variant="outlined"
                        />
                        <Chip
                          size="small"
                          label={`NO-GO: ${noGoCount}`}
                          color={noGoCount > 0 ? 'error' : 'default'}
                          variant="outlined"
                        />
                      </Box>
                    )}
                  </Box>
                </Box>
              </>
            )}

            <Box sx={{ flex: 1 }} />

            {/* Export actions */}
            {!sidebarCollapsed ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    color: 'text.secondary',
                  }}
                >
                  Export
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.75,
                  }}
                >
                  <Box sx={{ display: 'flex', gap: 0.75 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      size="small"
                      startIcon={<DownloadIcon />}
                      onClick={generatePDF}
                      sx={{ flex: 1, textTransform: 'none', borderRadius: 999 }}
                    >
                      Download PDF
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<TableChartIcon />}
                      onClick={generateExcel}
                      sx={{
                        textTransform: 'none',
                        bgcolor: '#166534',
                        '&:hover': { bgcolor: '#14532d' },
                        borderRadius: 999,
                        px: 2.5,
                      }}
                    >
                      Excel
                    </Button>
                  </Box>
                  {/* Close moved to dialog header for better UX */}
                </Box>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                <Tooltip title="Download PDF" placement="right">
                  <IconButton
                    size="small"
                    onClick={generatePDF}
                    sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download Excel" placement="right">
                  <IconButton
                    size="small"
                    onClick={generateExcel}
                    sx={{ bgcolor: '#2e7d32', color: 'white', '&:hover': { bgcolor: '#1b5e20' } }}
                  >
                    <TableChartIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Close report" placement="right">
                  <IconButton size="small" onClick={() => setShowReportModal(false)}>
                    <CloseIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </Paper>

        {/* ── A4 SHEET ── */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', overflow: 'auto', py: 2 }}>
          <Paper
            id="report-sheet"
            elevation={3}
            sx={{
              width: 794,
              minHeight: 1123,
              maxWidth: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 0,
              border: '3px solid',
              borderColor: 'divider',
              transform: `scale(${reportZoom})`,
              transformOrigin:
                reportAlignment === 'left'
                  ? 'top left'
                  : reportAlignment === 'right'
                  ? 'top right'
                  : 'top center',
              fontFamily:
                reportFontFamily === 'serif'
                  ? '"Times New Roman", Georgia, "Times", serif'
                  : reportFontFamily === 'mono'
                  ? '"Roboto Mono", "Courier New", monospace'
                  : '"Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
            }}
          >

            {/* Report Header: 2-column grid (present fields + backend header fields) */}
            <Box id="report-header" sx={{ borderBottom: '2px solid', borderColor: reportThemes[selectedTheme].headerBorder, p: 2, bgcolor: reportThemes[selectedTheme].headerBg, position: 'relative' }}>
              {/* Backend logo and company/report info from report config */}
              {(backendLogoUrl || backendCompanyName || backendReportName) && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                  {backendLogoUrl && (
                    <Box component="img" src={backendLogoUrl} alt="Company logo" sx={{ width: 56, height: 56, objectFit: 'contain', flexShrink: 0 }} />
                  )}
                  <Box>
                    {backendCompanyName && (
                      <Typography variant="subtitle1" fontWeight={700} color="text.primary" sx={{ lineHeight: 1.3 }}>{backendCompanyName}</Typography>
                    )}
                    {backendReportName && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{backendReportName}</Typography>
                    )}
                  </Box>
                </Box>
              )}
              {(companyName || companyLogo || logo) && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', minHeight: 80 }}>
                {companyName && (
                  <Box onMouseDown={handleCompanyNameMouseDown} onMouseEnter={() => setShowNameControls(true)} onMouseLeave={() => setShowNameControls(false)}
                    sx={{ position: 'absolute', left: companyNamePosition.x, top: companyNamePosition.y, width: companyNameSize.width, p: 0.5, border: '2px solid', borderColor: companyNamePosition.isDragging ? 'primary.main' : showNameControls ? 'primary.main' : 'transparent', borderRadius: 1, bgcolor: companyNamePosition.isDragging ? 'action.hover' : showNameControls ? 'action.selected' : 'transparent', cursor: companyNamePosition.isDragging ? 'grabbing' : 'grab', zIndex: companyNamePosition.isDragging ? 1000 : 2 }}>
                    <Typography sx={{ fontSize: companyNameSize.fontSize, fontWeight: 700, color: reportThemes[selectedTheme].titleColor, textTransform: 'uppercase' }}>{companyName}</Typography>
                    {showNameControls && (
                      <Box onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} sx={{ position: 'absolute', bottom: -4, left: 0, display: 'flex', gap: 0.25, bgcolor: 'background.paper', p: 0.25, borderRadius: 1, border: '1px solid', borderColor: 'divider', zIndex: 1001 }}>
                        <Button size="small" onClick={(e) => { e.stopPropagation(); setCompanyNameSize(p => ({ ...p, fontSize: Math.max(10, p.fontSize - 2) })); }}>A-</Button>
                        <Button size="small" onClick={(e) => { e.stopPropagation(); setCompanyNameSize(p => ({ ...p, fontSize: Math.min(48, p.fontSize + 2) })); }}>A+</Button>
                      </Box>
                    )}
                  </Box>
                )}
                {companyLogo && (
                  <Box onMouseDown={handleReportCompanyLogoMouseDown} onMouseEnter={() => setShowLogoControls(true)} onMouseLeave={() => setShowLogoControls(false)}
                    sx={{ position: 'absolute', left: reportCompanyLogoPosition.x, top: reportCompanyLogoPosition.y, width: reportCompanyLogoSize.width, height: reportCompanyLogoSize.height, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5, border: '2px solid', borderColor: reportCompanyLogoPosition.isDragging ? 'primary.main' : 'divider', borderRadius: 1, cursor: reportCompanyLogoPosition.isDragging ? 'grabbing' : 'grab', zIndex: 2 }}>
                    <Box component="img" src={companyLogo} alt="Company Logo" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                    {showLogoControls && (
                      <Box sx={{ position: 'absolute', bottom: -4, left: 0, display: 'flex', gap: 0.25, bgcolor: 'background.paper', p: 0.25, borderRadius: 1, border: '1px solid', borderColor: 'divider', zIndex: 1001 }}>
                        <Button size="small" onClick={(e) => { e.stopPropagation(); setReportCompanyLogoSize(p => ({ width: Math.max(50, p.width - 10), height: Math.max(30, p.height - 6) })); }}>-</Button>
                        <Button size="small" onClick={(e) => { e.stopPropagation(); setReportCompanyLogoSize(p => ({ width: Math.min(400, p.width + 10), height: Math.min(200, p.height + 6) })); }}>+</Button>
                      </Box>
                    )}
                  </Box>
                )}
                {logo && (
                  <Box onMouseDown={handleLogoMouseDown} sx={{ position: 'absolute', left: logoPosition.x, top: logoPosition.y, width: 120, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 0.5, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50', cursor: logoPosition.isDragging ? 'grabbing' : 'grab', zIndex: 1 }}>
                    <Box component="img" src={logo} alt="Logo" sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
                  </Box>
                )}
                <Box sx={{ flex: 1 }} />
              </Box>
              )}
              {customFields.length > 0 && (
                <Grid container spacing={1.5} sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  {customFields.map(f => (
                    <Grid item xs={12} sm={6} md={4} key={f.id}>
                      <Box sx={{ p: 0.5, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>{f.name}</Typography>
                        <Typography variant="body2" fontWeight={600}>{f.value || '-'}</Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              )}
              {/* 2-column grid: Part Information (present + backend header fields) */}
              <Typography variant="subtitle2" sx={{ mt: 2, mb: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid', borderColor: 'divider', pb: 0.5 }}>Part Information</Typography>
              <TableContainer sx={{ border: '1px solid', borderColor: 'grey.400' }}>
                <MuiTable size="small" sx={{ borderCollapse: 'collapse' }}>
                  <TableBody>
                    {headerGridRows.map((pair, idx) => (
                      <TableRow key={idx}>
                        <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontWeight: 600, fontSize: '0.8125rem', width: '22%', bgcolor: 'grey.50', py: 0.75, px: 1.25 }}>{pair[0].label}</TableCell>
                        <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontSize: '0.8125rem', py: 0.75, px: 1.25 }}>{pair[0].value}</TableCell>
                        <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontWeight: 600, fontSize: '0.8125rem', width: '22%', bgcolor: 'grey.50', py: 0.75, px: 1.25 }}>{pair[1] ? pair[1].label : ''}</TableCell>
                        <TableCell sx={{ border: '1px solid', borderColor: 'grey.400', fontSize: '0.8125rem', py: 0.75, px: 1.25 }}>{pair[1] ? pair[1].value : ''}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </MuiTable>
              </TableContainer>
            </Box>

            {/* Report Content */}
            <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
              {reportLoading && (
                <Box sx={{ textAlign: 'center', py: 4 }}><CircularProgress size={40} sx={{ mb: 2 }} /><Typography variant="body2" color="text.secondary">Loading report data...</Typography></Box>
              )}
              {reportError && (
                <Box sx={{ textAlign: 'center', py: 4, color: 'error.main', bgcolor: 'error.light', borderRadius: 2, border: '1px solid', borderColor: 'error.main', px: 2 }}>
                  <Typography fontWeight={600} sx={{ mb: 0.5 }}>Error loading report</Typography>
                  <Typography variant="body2">{reportError}</Typography>
                </Box>
              )}
              {!reportLoading && !reportError && reportData && (
                <Box>
                  {pdfData && includeDrawing && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid', borderColor: 'divider', pb: 0.5 }}>Part Drawing</Typography>
                      <Paper variant="outlined" sx={{ p: 1, overflow: 'hidden' }}>
                        <PDFViewer pdfData={pdfData} pdfDimensions={pdfDimensions} currentPage={currentPage || 1} scale={1.2} boundingBoxes={useBboxStore.getState().boundingBoxes} notes={[]} isSelectionMode={false} isPanMode={false} isNotesMode={false} isStampMode={false} rotation={0} />
                      </Paper>
                    </Box>
                  )}
                  {tableData.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, borderBottom: '2px solid', borderColor: 'divider', pb: 0.5 }}>
                        <Typography variant="subtitle2" fontWeight={700} textTransform="uppercase" letterSpacing={0.5}>Inspection Data</Typography>
                        <Typography variant="body2" fontWeight={600} color="primary">{selectedQuantity === '' ? 'All Qty' : selectedQuantity === 'consolidate' ? 'Consolidate' : `Qty${selectedQuantity}`}</Typography>
                      </Box>
                      <TableContainer component={Paper} variant="outlined" sx={{ overflow: 'hidden' }}>
                        <MuiTable size="small" sx={{ minWidth: 600 }}>
                          <TableBody>
                            <TableRow sx={{ bgcolor: 'grey.100' }}>
                              {tableHeaders.map((h, ci) => (
                                <TableCell key={ci} onContextMenu={(e) => isEditing && handleContextMenu(e, null, ci)} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>{h}</TableCell>
                              ))}
                            </TableRow>
                            {tableData.map((row, ri) => (
                              <TableRow key={ri} sx={{ bgcolor: ri % 2 === 0 ? 'white' : 'grey.50' }}>
                                {tableHeaders.map((h, ci) => {
                                  const ks = ['id', 'nominal', 'tolerance', 'type', 'm1', 'm2', 'm3', 'mean', 'status'];
                                  const ck = ks[ci]; const cv = ci === 0 ? (ri + 1).toString() : (row[ck] || 'N/A');
                                  return (
                                    <TableCell key={ci} onContextMenu={(e) => isEditing && handleContextMenu(e, ri, ci)} contentEditable={isEditing && ci !== 8} suppressContentEditableWarning
                                      onBlur={(e) => { if (isEditing && ci !== 8) { const nd = [...tableData]; nd[ri][ck] = e.currentTarget.textContent; setTableData(nd); } }}
                                      sx={{ fontSize: '0.75rem', textAlign: ci >= 3 && ci <= 6 ? 'center' : 'left' }}>
                                      {ci === 8 ? <Typography component="span" variant="caption" sx={{ px: 0.5, py: 0.25, borderRadius: 1, fontWeight: 600, bgcolor: cv === 'GO' ? 'success.light' : cv === 'NO-GO' ? 'error.light' : 'grey.200', color: cv === 'GO' ? 'success.dark' : cv === 'NO-GO' ? 'error.dark' : 'text.secondary' }}>{cv}</Typography> : cv}
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            ))}
                          </TableBody>
                        </MuiTable>
                      </TableContainer>
                    </Box>
                  )}
                  {includeNotes && notes?.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 1,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          borderBottom: '2px solid',
                          borderColor: 'divider',
                          pb: 0.5,
                        }}
                      >
                        Notes
                      </Typography>
                      <Paper variant="outlined" sx={{ p: 1.5 }}>
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                          {notes
                            .filter((n) => n?.note_text)
                            .map((note, idx) => (
                              <li key={idx} style={{ marginBottom: '0.35rem' }}>
                                <Typography variant="body2">
                                  {note.note_text}
                                </Typography>
                              </li>
                            ))}
                        </Box>
                      </Paper>
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            {/* Footer: 2-column grid from stored DB (report config footer fields) */}
            <Box
              sx={{
                borderTop: '2px solid',
                borderColor: reportThemes[selectedTheme].sectionBorder,
                p: 1.5,
                bgcolor: reportThemes[selectedTheme].footerBg,
              }}
            >
              {footerGridRows.length > 0 ? (
                <TableContainer
                  sx={{
                    border: '1px solid',
                    borderColor: reportThemes[selectedTheme].tableBorder,
                  }}
                >
                  <MuiTable size="small" sx={{ borderCollapse: 'collapse' }}>
                    <TableBody>
                      {footerGridRows.map((pair, idx) => {
                        const label0 = pair[0] ? (pair[0].field_label ?? pair[0].label ?? pair[0].backend_key ?? '') : '';
                        const label1 = pair[1] ? (pair[1].field_label ?? pair[1].label ?? pair[1].backend_key ?? '') : '';
                        const v0 = pair[0] ? (pair[0].label != null ? String(pair[0].value ?? '') : (getReportValue(pair[0].backend_key) || (pair[0].backend_key != null ? String(pair[0].backend_key) : ''))) : '';
                        const v1 = pair[1] ? (pair[1].label != null ? String(pair[1].value ?? '') : (getReportValue(pair[1].backend_key) || (pair[1].backend_key != null ? String(pair[1].backend_key) : ''))) : '';
                        return (
                          <TableRow key={idx}>
                            <TableCell
                              sx={{
                                border: '1px solid',
                                borderColor: reportThemes[selectedTheme].tableBorder,
                                fontWeight: 600,
                                fontSize: '0.8125rem',
                                width: '22%',
                                bgcolor: reportThemes[selectedTheme].tableHeaderBg,
                                color: reportThemes[selectedTheme].tableHeaderColor,
                                py: 0.75,
                                px: 1.25,
                              }}
                            >
                              {label0}
                            </TableCell>
                            <TableCell
                              sx={{
                                border: '1px solid',
                                borderColor: reportThemes[selectedTheme].tableBorder,
                                fontSize: '0.8125rem',
                                py: 0.75,
                                px: 1.25,
                              }}
                            >
                              {v0}
                            </TableCell>
                            <TableCell
                              sx={{
                                border: '1px solid',
                                borderColor: reportThemes[selectedTheme].tableBorder,
                                fontWeight: 600,
                                fontSize: '0.8125rem',
                                width: '22%',
                                bgcolor: reportThemes[selectedTheme].tableHeaderBg,
                                color: reportThemes[selectedTheme].tableHeaderColor,
                                py: 0.75,
                                px: 1.25,
                              }}
                            >
                              {label1}
                            </TableCell>
                            <TableCell
                              sx={{
                                border: '1px solid',
                                borderColor: reportThemes[selectedTheme].tableBorder,
                                fontSize: '0.8125rem',
                                py: 0.75,
                                px: 1.25,
                              }}
                            >
                              {v1}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </MuiTable>
                </TableContainer>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.875rem',
                    color: reportThemes[selectedTheme].footerColor,
                  }}
                >
                  <Typography variant="caption">
                    Generated on {new Date().toLocaleDateString()}
                  </Typography>
                  <Typography variant="caption">
                    {partData?.name || 'Direct Part'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>
        {HeadersFootersModal()}
        {ThemesModal()}
        {ContextMenu()}
      </DialogContent>
      </Dialog>
    </ThemeProvider>
  );
};

export default Report;