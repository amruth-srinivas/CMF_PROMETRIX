import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ZoomIn, ZoomOut, RotateCw, Maximize2, Download, FileText, Settings, Save, MousePointer2, Hand, Trash2, Stamp, StickyNote, Upload, FilePlus, Ruler, Bluetooth } from 'lucide-react';
import PDFViewer from '../components/PDFViewer';
import NotesTable from '../components/NotesTable';
import RegionViewModal from '../components/RegionViewModal';
import AutoBalloonButton from '../components/AutoBalloonButton';
import useBboxStore from '../store/bbox';
import { noteService } from '../services/noteService';
import { parseNotesFromExtractedText } from '../utils/noteTextParser';
import { extractText, downloadBalloonedPDF } from '../utils/pdfAnnotationApi';
import AutoBalloonService from '../services/autoBalloonService';
import { FileText as ReportIcon } from 'lucide-react';
import './InspectionPlan.css';
import jsPDF from 'jspdf';
import Report from '../components/Report';
import { measurementService } from '../services/measurementService';

const InspectionPlan = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const partData = location.state?.partData || {};
  const blobUrlRef = useRef(null);

  // const [activeTab, setActiveTab] = useState('boc'); // 'boc' or 'notes'
  // // Report modal state
  // const [showReportModal, setShowReportModal] = useState(false);
   // Custom fields state

   // Report component uses useReportStore internally for report data
  const [customFields, setCustomFields] = useState([]);
  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');
  
  // Logo state
  const [logo, setLogo] = useState(null);
  const [showLogoModal, setShowLogoModal] = useState(false);

  // Auto-ballooning state
  const [autoBalloonStatus, setAutoBalloonStatus] = useState('idle'); // 'idle', 'processing', 'completed', 'error'
  const [autoBalloonProgress, setAutoBalloonProgress] = useState(0);
  const [autoBalloonResults, setAutoBalloonResults] = useState(null);
  const [isAutoBalloonProcessing, setIsAutoBalloonProcessing] = useState(false);

  const pdfContainerRef = useRef(null);
 
  const {
    boundingBoxes,
    loading: bboxLoading,
    error: bboxError,
    pdfData,
    pdfDimensions,
    currentPage,
    totalPages,
    scale,
    rotation,
    isSelectionMode,
    isPanMode,
    isStampMode,
    selectedBboxId,
    loadBoundingBoxes,
    saveBoundingBox,
    updateBoundingBox,
    deleteBoundingBox,
    deleteAllBoundingBoxes,
    processDimensions,
    setPdfData,
    setPdfDimensions,
    setCurrentPage,
    setTotalPages,
    setScale,
    setRotation,
    setSelectionMode,
    setPanMode,
    setStampMode,
    setSelectedBboxId
  } = useBboxStore();
  
  const [pdfUrl, setPdfUrl] = useState(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [bomData, setBomData] = useState([]);
  const partId = partData.id || partData.part_id;
  const [documentId, setDocumentId] = useState(partData.document_id);
  
  // Stamp mode state
  const [showStampModal, setShowStampModal] = useState(false);
  const [stampRegion, setStampRegion] = useState(null);
  const [stampNominal, setStampNominal] = useState('');
  const [stampUpperTol, setStampUpperTol] = useState('');
  const [stampLowerTol, setStampLowerTol] = useState('');
  const [stampDimType, setStampDimType] = useState('Length');
  
  // Dimension types for stamp modal
  const dimensionTypes = ['Length', 'GDT', 'Diameter', 'Angular', 'Radius'];
  
  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [changedRows, setChangedRows] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  



  
  // Mode state - 'plan' or 'measure'
  const [viewMode, setViewMode] = useState('plan'); // Default to plan mode
  // Selected part quantity for measurements (Part 1, Part 2, ...)
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  // Quantity from DB (PartLocation) - used for Part dropdown options; default 1 until loaded
  const [bocQuantityFromDb, setBocQuantityFromDb] = useState(1);

  // Keep selected quantity in range when bocQuantityFromDb changes
  useEffect(() => {
    if (selectedQuantity > bocQuantityFromDb) setSelectedQuantity(bocQuantityFromDb);
  }, [bocQuantityFromDb]);

  // Notes mode state
  const [isNotesMode, setIsNotesMode] = useState(false);
  const [notes, setNotes] = useState([]);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [notesLoading, setNotesLoading] = useState(false);
  // Measure mode: entry mode for M1/M2/M3 only (Enter → next row)
  const [isMeasureEntryMode, setIsMeasureEntryMode] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  
  // Balloon delete confirmation popup state
  const [deleteConfirmation, setDeleteConfirmation] = useState({
    show: false,
    bboxId: null,
    position: { x: 0, y: 0 }
  });
  
  // Region view modal state
  const [regionViewModal, setRegionViewModal] = useState({
    isOpen: false,
    pdfId: null,
    boundingBox: null,
    page: 0
  });
  
  // Tab state for BOC/Notes switching
  const [activeTab, setActiveTab] = useState('boc'); // 'boc' or 'notes'
  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  // Inspection plan status (for plan tab confirm)
  const [inspectionPlanStatus, setInspectionPlanStatus] = useState(false);
  const [inspectionPlanStatusLoading, setInspectionPlanStatusLoading] = useState(false);
  const [inspectionPlanConfirmLoading, setInspectionPlanConfirmLoading] = useState(false);
  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showSettings && !event.target.closest('[data-settings-panel]') && !event.target.closest('[data-settings-button]')) {
        setShowSettings(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);
  

  // Fetch quantity from DB (PartLocation) when inspection plan loads
  useEffect(() => {
    if (!partId) return;
    let cancelled = false;
    fetch(`http://172.18.100.26:8986/api/v1/parts/${partId}/with-location`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data) => {
        if (!cancelled && data && typeof data.quantity === 'number' && data.quantity >= 1) {
          setBocQuantityFromDb(data.quantity);
        }
      })
      .catch(() => {
        if (!cancelled) setBocQuantityFromDb(1);
      });
    return () => { cancelled = true; };
  }, [partId]);

  // Report fetches its own data when modal opens (via Report component)

  // Fetch part inspection plan status when partId is available (for plan tab)
  useEffect(() => {
    if (!partId) return;
    let cancelled = false;
    setInspectionPlanStatusLoading(true);
    fetch(`http://172.18.100.26:8986/api/v1/parts/${partId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((part) => {
        if (!cancelled && part && typeof part.inspection_plan_status === 'boolean') {
          setInspectionPlanStatus(part.inspection_plan_status);
        }
      })
      .catch((err) => {
        if (!cancelled) console.warn('Could not fetch inspection plan status:', err);
      })
      .finally(() => {
        if (!cancelled) setInspectionPlanStatusLoading(false);
      });
    return () => { cancelled = true; };
  }, [partId]);

  // Fetch document_id from version_id if not available
  // We need to query the database to get document_id from version_id
  // Since there's no direct endpoint, we'll query documents for this part
  useEffect(() => {
    const fetchDocumentId = async () => {
      if (!documentId && partData.pdfUrl && partId) {
        const urlMatch = partData.pdfUrl.match(/\/documents\/versions\/(\d+)\//);
        if (urlMatch) {
          const versionId = urlMatch[1];
          try {
            // Query documents for this part to find the one with matching version
            const documentsResponse = await fetch(`http://172.18.100.26:8986/api/v1/documents?part_id=${partId}`);
            if (documentsResponse.ok) {
              const documents = await documentsResponse.json();
              // Find document that has this version
              // We need to check versions, but for now try to match by checking if any document's current version matches
              // Actually, we can query the version's document_id by querying DocumentVersion table
              // But we don't have a direct endpoint, so let's use the first document for this part as fallback
              if (documents && documents.length > 0) {
                // Use the first PDF document found for this part
                const pdfDoc = documents.find(doc => 
                  doc.file_format === 'pdf' || 
                  (doc.download_url && doc.download_url.includes('pdf'))
                );
                if (pdfDoc && pdfDoc.id) {
                  setDocumentId(String(pdfDoc.id));
                }
              }
            }
          } catch (e) {
            console.warn('Could not fetch document_id:', e);
          }
        }
      }
    };
    
    fetchDocumentId();
  }, [partData.pdfUrl, partId]);

  // Load PDF and bounding boxes
  useEffect(() => {
    const loadPDF = async () => {
      if (!partData || !partData.pdfUrl) {
        console.log('No PDF URL available in partData:', partData);
        return;
      }
      
      if (partData.pdfUrl) {
        console.log('Loading PDF from URL:', partData.pdfUrl);
        setLoading(true);
        setError(null);
        
        try {
          const response = await fetch(partData.pdfUrl, {
            method: 'GET',
            mode: 'cors',
            headers: { 'Accept': 'application/pdf' },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();
          
          // Validate blob is actually a PDF
          if (!blob.type.includes('pdf') && blob.size > 0) {
            // Try to set the type manually
            const pdfBlob = new Blob([blob], { type: 'application/pdf' });
            const arrayBuffer = await pdfBlob.arrayBuffer();
            setPdfData(arrayBuffer);
          } else {
            // Convert blob to ArrayBuffer for PDF.js
            const arrayBuffer = await blob.arrayBuffer();
            setPdfData(arrayBuffer);
          }
          
          // Also create blob URL for fallback
          const blobUrl = URL.createObjectURL(blob);
          blobUrlRef.current = blobUrl;
          setPdfBlobUrl(blobUrl);
          setPdfUrl(partData.pdfUrl);
          
          showStatus('PDF loaded successfully', 'success');
        } catch (err) {
          console.error('Error loading PDF:', err);
          setError(err.message || 'Failed to load PDF');
          showStatus('Failed to load PDF: ' + err.message, 'error');
        } finally {
          setLoading(false);
        }
      }
    };

    loadPDF();
    
  // In InspectionPlan.jsx useEffect
if (partId) {
  console.log('Loading data for part ID:', partId);
  loadBoundingBoxes(partId).catch(err => {
    console.error('Error loading bounding boxes:', err);
    if (err.message.includes('404')) {
      showStatus(`Part ${partId} not found. Please check the part ID.`, 'error');
    } else {
      showStatus('Failed to load bounding boxes', 'error');
    }
  });
}
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [partData?.pdfUrl, partId]);

  // Update BOM data when bounding boxes change
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Load saved measurements for this part and selected quantity (balloon_db_id -> latest measurement)
      let measurementsByBalloon = {};
      if (partId) {
        try {
          const list = await measurementService.getMeasurementsByPart(partId, selectedQuantity);
          if (Array.isArray(list)) {
            list.forEach((m) => {
              const bid = m.balloon_id;
              if (bid != null) {
                const existing = measurementsByBalloon[bid];
                const mTime = m.measured_at ? new Date(m.measured_at).getTime() : 0;
                const eTime = existing?.measured_at ? new Date(existing.measured_at).getTime() : 0;
                if (!existing || mTime >= eTime) measurementsByBalloon[bid] = m;
              }
            });
          }
        } catch (_) {}
      }
      const bomRows = [];
      let rowNumber = 1;
    
    // Sort bounding boxes the same way as PDFViewer to ensure balloon numbers match table IDs
    const sortedBoundingBoxes = [...boundingBoxes].sort((a, b) => {
      // First, sort by page
      const aPage = a.page !== undefined ? a.page : 1;
      const bPage = b.page !== undefined ? b.page : 1;
      if (aPage !== bPage) return aPage - bPage;
      
      // Then by display_order if available
      const aOrder = a.display_order !== undefined && a.display_order !== null ? a.display_order : Infinity;
      const bOrder = b.display_order !== undefined && b.display_order !== null ? b.display_order : Infinity;
      if (aOrder !== Infinity || bOrder !== Infinity) {
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
      }
      
      // Then by Y position (top to bottom)
      const yDiff = a.y - b.y;
      if (Math.abs(yDiff) > 10) return yDiff;
      
      // Finally by X position (left to right)
      return a.x - b.x;
    });
    
    sortedBoundingBoxes.forEach((bbox) => {
      const dimensions = bbox.dimension_data || [];
      const gdtData = bbox.extracted_gdt || [];
      
      // Debug: Log bbox structure with GDT data
      if (dimensions.length > 0 || gdtData.length > 0) {
        console.log('BOM Row Generation - Bbox:', {
          id: bbox.id,
          dimensions: dimensions,
          gdtData: gdtData,
          extracted_gdt: bbox.extracted_gdt,
          // Check for GDT in dimensions
          gdtInDimensions: dimensions.map(dim => ({
            hasGDT: !!dim.gdt_data,
            gdtData: dim.gdt_data,
            dimensionType: dim.dimension_type
          }))
        });
      }
      
      if (dimensions.length > 0) {
        // Separate GDT dimensions from regular dimensions
        const gdtDimensions = [];
        const regularDimensions = [];
        
        dimensions.forEach((dim) => {
          // Check if this is a GDT-only dimension (no nominal value, or dimension_type is GDT)
          const isGDTOnly = dim.dimension_type === 'GDT' || 
                           (!dim.nominal_value && !dim.upper_tolerance && !dim.lower_tolerance);
          
          if (isGDTOnly) {
            gdtDimensions.push(dim);
          } else {
            regularDimensions.push(dim);
          }
        });
        
        // Process regular dimensions and match with GDT
        regularDimensions.forEach((dim) => {
          // Look for GDT data associated with this dimension
          let gdtName = '';
          let usedGDTIndex = -1;
          
          // First, check if dimension has embedded gdt_data
          let gdtSymbol = ''; // Store the GDT symbol separately
          if (dim.gdt_data) {
            let gdtDataItem = null;
            if (typeof dim.gdt_data === 'object' && !Array.isArray(dim.gdt_data)) {
              gdtDataItem = dim.gdt_data;
            } else if (Array.isArray(dim.gdt_data) && dim.gdt_data.length > 0) {
              gdtDataItem = dim.gdt_data[0];
            }
            
            if (gdtDataItem && gdtDataItem.class_name) {
              // Keep the full class_name with symbol (e.g., "⏥ flatness", "↗ circular runout")
              const className = gdtDataItem.class_name;
              
              // Extract the symbol (first Unicode symbol)
              const symbolMatch = className.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/);
              if (symbolMatch) {
                gdtSymbol = symbolMatch[0];
              }
              
              // Extract GDT name from class_name (e.g., "⏥ flatness" -> "Flatness", "↗ circular runout" -> "Circular runout")
              // Remove common GDT symbols: ⏥ ⟂ ⊥ ∥ ∠ ⌯ ⌖ ↗ ↖ → ← ↑ ↓ and other Unicode symbols
              const cleanedName = className.replace(/[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/g, '').trim();
              if (cleanedName) {
                // Split by spaces and capitalize each word
                const words = cleanedName.split(/\s+/).filter(w => w.length > 0);
                if (words.length > 0) {
                  // Capitalize first letter of each word
                  gdtName = words.map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                } else {
                  gdtName = className; // Fallback to original if cleaning removes everything
                }
              } else {
                // If no text after symbol, use the class_name as-is
                gdtName = className;
              }
            }
          }
          
          // If no GDT found in dimension, check extracted_gdt array
          if (!gdtName && gdtData.length > 0) {
            // Use the first available GDT
            const gdtArray = Array.isArray(gdtData) ? gdtData : [gdtData];
            const availableGDT = gdtArray.find((gdt, idx) => {
              // Check if this GDT hasn't been used yet
              return gdt && (gdt.class_name || gdt.text) && !gdt._used;
            });
            
            if (availableGDT) {
              // Extract name from class_name or text field
              if (availableGDT.class_name) {
                const className = availableGDT.class_name;
                // Extract symbol
                const symbolMatch = className.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/);
                if (symbolMatch) {
                  gdtSymbol = symbolMatch[0];
                }
                // Extract name
                const cleanedName = className.replace(/[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/g, '').trim();
                if (cleanedName) {
                  const words = cleanedName.split(/\s+/).filter(w => w.length > 0);
                  if (words.length > 0) {
                    gdtName = words.map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                  } else {
                    gdtName = className;
                  }
                } else {
                  gdtName = className;
                }
              } else if (availableGDT.text) {
                // Extract from text like "⏥ flatness" or "↗ circular runout"
                const text = availableGDT.text.trim();
                const symbolMatch = text.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/);
                if (symbolMatch) {
                  gdtSymbol = symbolMatch[0];
                }
                const cleanedText = text.replace(/[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/g, '').trim();
                const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
                if (words.length > 0) {
                  gdtName = words.map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                }
              }
              if (gdtName) {
                availableGDT._used = true; // Mark as used
              }
            }
          }
          
          // Also check if there's a matching GDT dimension we can merge
          if (!gdtName && gdtDimensions.length > 0) {
            // Take the first GDT dimension and extract its name
            const gdtDim = gdtDimensions[0];
            
            // Extract from text field (e.g., "⏥ flatness")
            if (gdtDim.text) {
              const text = gdtDim.text.trim();
              const symbolMatch = text.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/);
              if (symbolMatch) {
                gdtSymbol = symbolMatch[0];
              }
              const cleanedText = text.replace(/[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/g, '').trim();
              const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
              if (words.length > 0) {
                gdtName = words.map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
              }
            }
            
            // Also check gdt_data
            if (!gdtName && gdtDim.gdt_data) {
              let gdtDataItem = null;
              if (typeof gdtDim.gdt_data === 'object' && !Array.isArray(gdtDim.gdt_data)) {
                gdtDataItem = gdtDim.gdt_data;
              } else if (Array.isArray(gdtDim.gdt_data) && gdtDim.gdt_data.length > 0) {
                gdtDataItem = gdtDim.gdt_data[0];
              }
              
              if (gdtDataItem && gdtDataItem.class_name) {
                const className = gdtDataItem.class_name;
                const symbolMatch = className.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/);
                if (symbolMatch) {
                  gdtSymbol = symbolMatch[0];
                }
                const cleanedName = className.replace(/[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/g, '').trim();
                if (cleanedName) {
                  const words = cleanedName.split(/\s+/).filter(w => w.length > 0);
                  if (words.length > 0) {
                    gdtName = words.map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                  } else {
                    gdtName = className;
                  }
                } else {
                  gdtName = className;
                }
              }
            }
            
            // Mark this GDT dimension as used so we don't create a separate row
            gdtDimensions.shift(); // Remove the first one since we're merging it
          }
          
          // Build dimension type string - show GDT name with symbol if available; preserve Diameter
          let dimensionType = dim.dimension_type || bbox.type || '';
          let isReference = false;

          // Track reference dimensions based on parentheses in raw values/type
          const rawNominal = dim.nominal_value ?? bbox.nominal ?? '';
          if (typeof rawNominal === 'string' && rawNominal.includes('(') && rawNominal.includes(')')) {
            isReference = true;
          }
          if (typeof dimensionType === 'string' && dimensionType.includes('(') && dimensionType.includes(')')) {
            isReference = true;
          }

          if (gdtName && dimensionType !== 'Diameter') {
            // If dimension has GDT (and is not Diameter), show "GDT: [symbol] [name]" format
            if (dimensionType === 'GDT' || dimensionType === 'Length') {
              dimensionType = gdtSymbol ? `GDT: ${gdtSymbol} ${gdtName}` : `GDT: ${gdtName}`;
            } else if (dimensionType && dimensionType !== gdtName) {
              dimensionType = dimensionType;
            } else {
              dimensionType = gdtSymbol ? `GDT: ${gdtSymbol} ${gdtName}` : `GDT: ${gdtName}`;
            }
          }
          // Diameter stays as "Diameter" (from backend or bbox.type)

          // Normalize Radius / Angular dimension types that encode the nominal value
          let nominal = rawNominal || '';
          if (!nominal && typeof dimensionType === 'string' && dimensionType) {
            // Examples we handle:
            // "Angular: 90°"  -> type: "Angular", nominal: "90"
            // "Radius: R6.75" -> type: "Radius", nominal: "6.75"
            const angularMatch = dimensionType.match(/Angular\s*:\s*\(?\s*([0-9.+-]+)\s*°?\s*\)?/i);
            const radiusMatch = dimensionType.match(/Radius\s*:\s*R?\s*\(?\s*([0-9.+-]+)\s*\)?/i);

            if (angularMatch) {
              nominal = angularMatch[1];
              dimensionType = 'Angular';
              isReference = isReference || /\(.*\)/.test(dimensionType);
            } else if (radiusMatch) {
              nominal = radiusMatch[1];
              dimensionType = 'Radius';
              isReference = isReference || /\(.*\)/.test(dimensionType);
            }
          }

          // Clean nominal for reference dimensions like "(45)" or "(90°)"
          if (typeof nominal === 'string') {
            if (nominal.includes('(') && nominal.includes(')')) {
              isReference = true;
              nominal = nominal.replace(/[()]/g, '').replace(/°/g, '').trim();
            }
          }

          // If this is a reference dimension, append "(Reference)" to the base type
          if (isReference && typeof dimensionType === 'string' && dimensionType) {
            const baseType = dimensionType.replace(/\(.*\)/, '').replace(/:\s*$/,'').trim() || dimensionType;
            dimensionType = `${baseType} (Reference)`;
          }

          const meas = measurementsByBalloon[bbox.balloon_db_id] || {};
          bomRows.push({
            id: rowNumber,
            balloonId: bbox.id,
            nominal: nominal,
            actual: meas.mean != null ? String(meas.mean) : '',
            utol: dim.upper_tolerance || bbox.utol || '',
            ltol: dim.lower_tolerance || bbox.ltol || '',
            dimensionType: dimensionType || 'Length',
            zone: bbox.zone || '',
            m1: meas.m1 != null ? String(meas.m1) : '',
            m2: meas.m2 != null ? String(meas.m2) : '',
            m3: meas.m3 != null ? String(meas.m3) : '',
            instrumentUsed: bbox.measuring_instrument || '',
            goOrNoGo: meas.go_or_no_go || null
          });
          rowNumber++;
        });
        
        // Process remaining standalone GDT dimensions (only if not merged with regular dimensions)
        // These should only appear if there are NO regular dimensions
        if (regularDimensions.length === 0) {
          gdtDimensions.forEach((dim) => {
            // Extract GDT class_name
            let gdtName = 'GDT';
            
            if (dim.gdt_data) {
              if (typeof dim.gdt_data === 'object' && dim.gdt_data.class_name) {
                gdtName = dim.gdt_data.class_name;
              } else if (Array.isArray(dim.gdt_data) && dim.gdt_data.length > 0) {
                const gdtItem = dim.gdt_data[0];
                if (gdtItem && gdtItem.class_name) {
                  gdtName = gdtItem.class_name;
                }
              }
            } else if (gdtData.length > 0) {
              const gdtArray = Array.isArray(gdtData) ? gdtData : [gdtData];
              const availableGDT = gdtArray.find(gdt => gdt && gdt.class_name && !gdt._used);
              if (availableGDT && availableGDT.class_name) {
                gdtName = availableGDT.class_name;
                availableGDT._used = true;
              }
            }
            
            const measGdt = measurementsByBalloon[bbox.balloon_db_id] || {};
            bomRows.push({
              id: rowNumber,
              balloonId: bbox.id,
              nominal: dim.nominal_value || bbox.nominal || '',
              actual: measGdt.mean != null ? String(measGdt.mean) : '',
              utol: dim.upper_tolerance || bbox.utol || '',
              ltol: dim.lower_tolerance || bbox.ltol || '',
              dimensionType: gdtName,
              zone: bbox.zone || '',
              m1: measGdt.m1 != null ? String(measGdt.m1) : '',
              m2: measGdt.m2 != null ? String(measGdt.m2) : '',
              m3: measGdt.m3 != null ? String(measGdt.m3) : '',
              instrumentUsed: bbox.measuring_instrument || '',
              goOrNoGo: measGdt.go_or_no_go || null
            });
            rowNumber++;
          });
        }
      } else {
        // Empty bbox or bbox with only GDT data (no dimension_data)
        // Check if there's GDT data to display
        let dimensionType = bbox.type || '';
        let isReference = false;

        if (gdtData.length > 0) {
          const firstGDT = Array.isArray(gdtData) ? gdtData[0] : gdtData;
          if (firstGDT && firstGDT.class_name) {
            dimensionType = firstGDT.class_name;
          } else if (!dimensionType) {
            dimensionType = 'GDT';
          }
        } else if (!dimensionType) {
          dimensionType = '';
        }

        // Normalize Radius / Angular values that are embedded into the type
        let nominal = bbox.nominal || '';

        // Detect reference based on parentheses in nominal
        if (typeof nominal === 'string' && nominal.includes('(') && nominal.includes(')')) {
          isReference = true;
          nominal = nominal.replace(/[()]/g, '').replace(/°/g, '').trim();
        }

        // Also mark as reference if type itself has parentheses
        if (typeof dimensionType === 'string' && dimensionType.includes('(') && dimensionType.includes(')')) {
          isReference = true;
        }

        if (!nominal && typeof dimensionType === 'string' && dimensionType) {
          const angularMatch = dimensionType.match(/Angular\s*:\s*\(?\s*([0-9.+-]+)\s*°?\s*\)?/i);
          const radiusMatch = dimensionType.match(/Radius\s*:\s*R?\s*\(?\s*([0-9.+-]+)\s*\)?/i);

          if (angularMatch) {
            nominal = angularMatch[1];
            dimensionType = 'Angular';
          } else if (radiusMatch) {
            nominal = radiusMatch[1];
            dimensionType = 'Radius';
          }
        }

        if (isReference && typeof dimensionType === 'string' && dimensionType) {
          const baseType = dimensionType.replace(/\(.*\)/, '').replace(/:\s*$/,'').trim() || dimensionType;
          dimensionType = `${baseType} (Reference)`;
        }
        
        const measEmpty = measurementsByBalloon[bbox.balloon_db_id] || {};
        bomRows.push({
          id: rowNumber,
          balloonId: bbox.id,
          nominal: nominal,
          actual: measEmpty.mean != null ? String(measEmpty.mean) : '',
          utol: bbox.utol || '',
          ltol: bbox.ltol || '',
          dimensionType: dimensionType,
          zone: bbox.zone || '',
          m1: measEmpty.m1 != null ? String(measEmpty.m1) : '',
          m2: measEmpty.m2 != null ? String(measEmpty.m2) : '',
          m3: measEmpty.m3 != null ? String(measEmpty.m3) : '',
          instrumentUsed: bbox.measuring_instrument || '',
          goOrNoGo: measEmpty.go_or_no_go || null
        });
        rowNumber++;
      }
    });
    
    if (!cancelled) setBomData(bomRows);
    })();
    return () => { cancelled = true; };
  }, [boundingBoxes, partId, selectedQuantity]);

  const showStatus = (message, type) => {
    setStatusMessage({ text: message, type });
    setTimeout(() => setStatusMessage(null), 3000);
  };
  
  // Handle auto-ballooning
  const handleAutoBalloon = async () => {
    if (!partId || !documentId || !pdfDimensions) {
      showStatus('Missing required information for auto-ballooning', 'error');
      return;
    }

    if (!totalPages || totalPages === 0) {
      showStatus('PDF pages not loaded yet', 'error');
      return;
    }

    setAutoBalloonStatus('processing');
    setIsAutoBalloonProcessing(true);
    setAutoBalloonProgress(0);
    setAutoBalloonResults(null);

    try {
      showStatus('Starting auto-ballooning...', 'info');

      const result = await AutoBalloonService.processAutoBalloon({
        partId,
        documentId,
        pdfDimensions,
        totalPages,
        skipExisting: true,
        existingBoxes: boundingBoxes,
        onProgress: (currentPage, totalPages, results) => {
          setAutoBalloonProgress(currentPage);
          showStatus(`Processing page ${currentPage} of ${totalPages}...`, 'info');
        },
        onPageComplete: (page, pageResult) => {
          console.log(`Page ${page} completed:`, pageResult);
          // Reload bounding boxes after each page to show progress
          loadBoundingBoxes(partId);
        }
      });

      if (result.success) {
        setAutoBalloonStatus('completed');
        setAutoBalloonResults(result.results);
        showStatus(`Auto-ballooning completed: ${result.results.created} balloons created`, 'success');
        
        // Reload all bounding boxes to show final results
        await loadBoundingBoxes(partId);
      } else {
        setAutoBalloonStatus('error');
        setAutoBalloonResults({ error: result.error });
        showStatus(`Auto-ballooning failed: ${result.error}`, 'error');
      }
    } catch (error) {
      console.error('Auto-ballooning error:', error);
      setAutoBalloonStatus('error');
      setAutoBalloonResults({ error: error.message });
      showStatus(`Auto-ballooning error: ${error.message}`, 'error');
    } finally {
      setIsAutoBalloonProcessing(false);
    }
  };
  
  // Handle cell double-click for editing (edit mode: all fields; measure entry mode: M1/M2/M3 only)
  const handleCellDoubleClick = (rowId, field, currentValue) => {
    const measureFields = ['m1', 'm2', 'm3'];
    const canEditAll = isEditMode;
    const canEditMeasure = viewMode === 'measure' && isMeasureEntryMode && measureFields.includes(field);
    if (!canEditAll && !canEditMeasure) return;
    setEditingCell({ rowId, field });
    setEditValue(currentValue || '');
  };

  // Next cell for measure entry: m1→m2→m3→next row m1
  const getNextMeasureCell = (rowIndex, field) => {
    if (field === 'm1') return { rowIndex, field: 'm2' };
    if (field === 'm2') return { rowIndex, field: 'm3' };
    if (field === 'm3' && rowIndex < bomData.length - 1) return { rowIndex: rowIndex + 1, field: 'm1' };
    return null;
  };

  const handleMeasureEnterAndNext = (rowIndex, field) => {
    const next = getNextMeasureCell(rowIndex, field);
    handleCellEditSave();
    if (next) {
      const nextRow = bomData[next.rowIndex];
      setTimeout(() => {
        setEditingCell({ rowId: nextRow.id, field: next.field });
        setEditValue(nextRow[next.field] || '');
      }, 0);
    }
  };
  
  // Compute actual as mean of m1, m2, m3 when all three are numeric
  const computeActualFromMeasurements = (row) => {
    const m1 = parseFloat(row.m1);
    const m2 = parseFloat(row.m2);
    const m3 = parseFloat(row.m3);
    if (Number.isFinite(m1) && Number.isFinite(m2) && Number.isFinite(m3)) {
      const mean = (m1 + m2 + m3) / 3;
      return String(Number(mean.toFixed(6)));
    }
    return row.actual || '';
  };

  // Check if actual is within nominal ± tolerance (nominal - ltol <= actual <= nominal + utol)
  const getRowToleranceStatus = (item) => {
    const actual = parseFloat(item.actual);
    const nominal = parseFloat(item.nominal);
    const utol = parseFloat(item.utol);
    const ltol = parseFloat(item.ltol);
    if (!Number.isFinite(actual) || !Number.isFinite(nominal)) return null;
    const upper = Number.isFinite(utol) ? nominal + utol : nominal;
    const lower = Number.isFinite(ltol) ? nominal + ltol : nominal; // ltol is typically negative
    if (actual >= Math.min(lower, upper) && actual <= Math.max(lower, upper)) return 'in';
    return 'out';
  };

  // Handle cell edit save
  const handleCellEditSave = () => {
    if (!editingCell) return;
    
    // Update bomData
    let updatedBomData = bomData.map(item => {
      if (item.id !== editingCell.rowId) return item;
      const updated = { ...item, [editingCell.field]: editValue };
      // When saving m1, m2, or m3, set actual = mean(m1, m2, m3)
      if (['m1', 'm2', 'm3'].includes(editingCell.field)) {
        updated.actual = computeActualFromMeasurements(updated);
      }
      return updated;
    });
    
    setBomData(updatedBomData);
    
    // Mark this row as changed
    setChangedRows(prev => new Set(prev).add(editingCell.rowId));
    setHasUnsavedChanges(true);
    
    setEditingCell(null);
    setEditValue('');
  };
  
  // Handle cell edit cancel
  const handleCellEditCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };
  // PDF Generation function
const generatePDF = async () => {
  try {
    showStatus('Generating PDF...', 'info');
      
    // Create a new jsPDF instance
    const { jsPDF } = await import('jspdf');
const pdf = new jsPDF('p', 'mm', 'a4');
      
    // Page dimensions
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;
      
    // Helper function to add new page if needed
    const checkPageBreak = (requiredHeight) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
    };
      
    // Header section with logo and title
    if (logo) {
      try {
        // Add logo in top right
        pdf.addImage(logo, 'PNG', pageWidth - 45, yPosition, 30, 15);
      } catch (error) {
        console.warn('Could not add logo to PDF:', error);
      }
    }
      
    // Title - positioned to not overlap with logo
    checkPageBreak(20);
    pdf.setFontSize(24);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
      
    // Center the title
    const titleWidth = pdf.getTextWidth('Inspection Report');
    const titleX = (pageWidth - titleWidth) / 2;
    pdf.text('Inspection Report', titleX, yPosition + 10);
      
    // Add a line under the title
    yPosition += 15;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      
    yPosition += 10;
      
    // // Project Information section
    // checkPageBreak(15);
    // pdf.setFontSize(14);
    // pdf.setFont(undefined, 'bold');
    // pdf.setTextColor(0, 0, 0);
    // pdf.text('Project Information', margin, yPosition);
      
    // yPosition += 8;
      
    // // Project details in a more compact format
    // pdf.setFontSize(10);
    // pdf.setFont(undefined, 'normal');
      
    // checkPageBreak(8);
    // pdf.text(`Project: ${partData.name || 'Direct Part'}`, margin, yPosition);
    // yPosition += 8;
      
    // checkPageBreak(8);
    // pdf.text(`Part ID: ${partId || 'N/A'}`, margin, yPosition);
    // yPosition += 8;
      
    // checkPageBreak(8);
    // pdf.text(`Inspection Points: ${bomData.length || 0}`, margin, yPosition);
    // yPosition += 8;

          // Custom Fields Table
    if (customFields.length > 0) {
      checkPageBreak(15);
      yPosition += 5;
      pdf.setFontSize(14);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Custom Fields', margin, yPosition);
      yPosition += 10;
      
      // Custom fields table setup - no headers
      const cfColumnWidths = [50, 50];
      const cfTableWidth = cfColumnWidths.reduce((sum, width) => sum + width, 0);
      const cfStartX = margin;
      const cfRowHeight = 8;
      const cfStartY = yPosition;
      
      // Custom fields table rows (no headers)
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(0, 0, 0);
      
      customFields.forEach((field, index) => {
        checkPageBreak(cfRowHeight + 2);
        let cfXPos = cfStartX;
        
        const cfRow = [
          field.name || '',
          field.value || 'Not set'
        ];
        
        cfRow.forEach((cell, cellIndex) => {
          if (index % 2 === 0) {
            pdf.setFillColor(245, 245, 245);
          } else {
            pdf.setFillColor(255, 255, 255);
          }
          
          pdf.rect(cfXPos, yPosition, cfColumnWidths[cellIndex], cfRowHeight, 'F');
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(cfXPos, yPosition, cfColumnWidths[cellIndex], cfRowHeight);
          
          let displayText = cell.toString();
          if (displayText.length > 12) {
            displayText = displayText.substring(0, 10) + '...';
          }
          
          pdf.setTextColor(0, 0, 0);
          pdf.text(displayText, cfXPos + 2, yPosition + 5);
          cfXPos += cfColumnWidths[cellIndex];
        });
        
        yPosition += cfRowHeight;
      });
      
      // Draw outer border
      pdf.setDrawColor(0, 0, 0);
      pdf.rect(cfStartX, cfStartY, cfTableWidth, customFields.length * cfRowHeight);
      
      // Reduced spacing after custom fields table
      yPosition += 8;
    }
      
    // Add some spacing before the table
    yPosition += 10;
      
                   // Inspection Data Table
      if (bomData.length > 0) {
        checkPageBreak(20);
        yPosition += 10;
        pdf.setFontSize(14);
        pdf.setFont(undefined, 'bold');
        pdf.text('Inspection Data', margin, yPosition);
        yPosition += 20;
        
        // Table setup - more compact
        const headers = ['ID', 'Nominal', 'Actual', 'UTol', 'LTol', 'Type', 'Instrument'];
        const columnWidths = [12, 20, 20, 15, 15, 25, 30];
        const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
        const startX = margin; // Left align with other content
        const rowHeight = 8;
        const startY = yPosition;
        
        // Draw table headers
        pdf.setFontSize(7);
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(52, 73, 94);
        pdf.setTextColor(255, 255, 255);
        
        let xPos = startX;
        headers.forEach((header, index) => {
          pdf.setFillColor(52, 73, 94);
          pdf.rect(xPos, yPosition, columnWidths[index], rowHeight, 'F');
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(xPos, yPosition, columnWidths[index], rowHeight);
          const textWidth = pdf.getTextWidth(header);
          pdf.setTextColor(255, 255, 255);
          pdf.text(header, xPos + (columnWidths[index] - textWidth) / 2, yPosition + 5);
          xPos += columnWidths[index];
        });
        
        yPosition += rowHeight;
        pdf.setTextColor(0, 0, 0);
        
        // Table rows
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7);
        
        bomData.forEach((item, index) => {
          checkPageBreak(rowHeight + 2);
          xPos = startX;
          
          const row = [
            item.id.toString(),
            item.nominal || '',
            item.actual || '',
            item.utol || '',
            item.ltol || '',
            item.dimensionType || '',
            item.instrumentUsed || ''
          ];
          
          row.forEach((cell, cellIndex) => {
            if (index % 2 === 0) {
              pdf.setFillColor(245, 245, 245);
            } else {
              pdf.setFillColor(255, 255, 255);
            }
            
            pdf.rect(xPos, yPosition, columnWidths[cellIndex], rowHeight, 'F');
            pdf.setDrawColor(0, 0, 0);
            pdf.rect(xPos, yPosition, columnWidths[cellIndex], rowHeight);
            
            let displayText = cell.toString();
            if (displayText.length > 8) {
              displayText = displayText.substring(0, 6) + '...';
            }
            
            pdf.setTextColor(0, 0, 0);
            pdf.text(displayText, xPos + 1, yPosition + 5);
            xPos += columnWidths[cellIndex];
          });
          
          yPosition += rowHeight;
        });
        
        // Draw outer table border
            // Draw outer table border
              // Draw outer table border
        pdf.setDrawColor(0, 0, 0);
        pdf.rect(startX, startY, tableWidth, (bomData.length + 1) * rowHeight);
      }
      
      // No extra spacing after table - go directly to footer
      
      // No extra spacing after table - go directly to footer
      
      
      // Footer
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 20, pageHeight - 10);
        pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);
      }
      
      // Save the PDF
      const fileName = `Inspection_Report_${partData.name || 'Direct_Part'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      showStatus('PDF downloaded successfully!', 'success');
      setShowReportModal(false);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      showStatus('Failed to generate PDF. Please try again.', 'error');
    }
  };
  // Handle Tab key to move to next cell
  const handleCellKeyDown = (e, rowId, field, rowIndex) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const editableFields = ['nominal', 'actual', 'utol', 'ltol', 'dimensionType', 'zone', 'm1', 'm2', 'm3', 'instrumentUsed'];
      const currentFieldIndex = editableFields.indexOf(field);
      
      if (e.shiftKey) {
        // Move to previous cell
        if (currentFieldIndex > 0) {
          // Same row, previous field
          const prevField = editableFields[currentFieldIndex - 1];
          const currentValue = bomData[rowIndex][prevField];
          handleCellDoubleClick(rowId, prevField, currentValue);
        } else if (rowIndex > 0) {
          // Previous row, last field
          const prevRowData = bomData[rowIndex - 1];
          const lastField = editableFields[editableFields.length - 1];
          handleCellDoubleClick(prevRowData.id, lastField, prevRowData[lastField]);
        }
      } else {
        // Move to next cell
        if (currentFieldIndex < editableFields.length - 1) {
          // Same row, next field
          const nextField = editableFields[currentFieldIndex + 1];
          const currentValue = bomData[rowIndex][nextField];
          handleCellDoubleClick(rowId, nextField, currentValue);
        } else if (rowIndex < bomData.length - 1) {
          // Next row, first field
          const nextRowData = bomData[rowIndex + 1];
          const firstField = editableFields[0];
          handleCellDoubleClick(nextRowData.id, firstField, nextRowData[firstField]);
        }
      }
    }
  };
  
  // Save changes to database
  const handleSaveChanges = async () => {
    if (!hasUnsavedChanges || changedRows.size === 0) return;
    
    setIsSaving(true);
    
    try {
      // Get all changed rows data
      const changedRowsData = bomData.filter(item => changedRows.has(item.id));
      
      // Update each changed row in the database (dimension data + measurements)
      const updatePromises = changedRowsData.map(async (row) => {
        // Find the corresponding bounding box
        const bbox = boundingBoxes.find(b => b.id === row.balloonId);
        if (!bbox) return;
        
        // Prepare dimension data update
        const dimensionData = bbox.dimension_data && bbox.dimension_data.length > 0
          ? bbox.dimension_data.map((dim, index) => {
              // For simplicity, update the first dimension with the row data
              if (index === 0) {
                return {
                  ...dim,
                  nominal_value: row.nominal || dim.nominal_value,
                  upper_tolerance: row.utol || dim.upper_tolerance,
                  lower_tolerance: row.ltol || dim.lower_tolerance,
                  dimension_type: row.dimensionType || dim.dimension_type,
                  actual_value: row.actual || dim.actual_value,
                };
              }
              return dim;
            })
          : [{
              nominal_value: row.nominal,
              upper_tolerance: row.utol,
              lower_tolerance: row.ltol,
              dimension_type: row.dimensionType,
              actual_value: row.actual,
            }];
        
        // Update the bounding box
        await updateBoundingBox(partId, row.balloonId, {
          dimension_data: dimensionData,
          text_data: bbox.extracted_text || [],
          gdt_data: bbox.extracted_gdt || []
        });
        
        // Save measurement details (m1, m2, m3) to measurements table when present
        const hasMeasurements = row.m1 !== '' || row.m2 !== '' || row.m3 !== '';
        if (hasMeasurements && bbox.balloon_db_id != null) {
          try {
            await measurementService.upsertMeasurementForBalloon({
              balloonDbId: bbox.balloon_db_id,
              partId,
              quantity: selectedQuantity,
              m1: row.m1 || null,
              m2: row.m2 || null,
              m3: row.m3 || null,
            });
          } catch (measErr) {
            console.error('Error saving measurement for balloon:', measErr);
            showStatus('Dimension saved; measurement save failed: ' + (measErr.message || 'Unknown error'), 'error');
          }
        }
      });
      
      await Promise.all(updatePromises);
      
      // Reload bounding boxes to get updated data
      await loadBoundingBoxes(partId);
      
      // Clear changed rows and unsaved changes flag
      setChangedRows(new Set());
      setHasUnsavedChanges(false);
      
      showStatus('Changes saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving changes:', error);
      showStatus('Error saving changes: ' + error.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Discard changes
  const handleDiscardChanges = () => {
    // Reload bounding boxes to reset data
    loadBoundingBoxes(partId);
    setChangedRows(new Set());
    setHasUnsavedChanges(false);
    setEditingCell(null);
    setEditValue('');
    showStatus('Changes discarded', 'success');
  };

  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.1, 3.0));
  };

  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.1, 0.3));
  };

  const handleRotate = () => {
    setRotation((rotation + 90) % 360);
  };

  const handleReset = () => {
    setScale(1.0);
    setRotation(0);
    if (pdfContainerRef.current) {
      pdfContainerRef.current.scrollTop = 0;
      pdfContainerRef.current.scrollLeft = 0;
    }
  };

  const handleBack = () => {
    navigate('/Assembly');
  };

  const handleSelectionModeToggle = () => {
    setSelectionMode(!isSelectionMode);
    setPanMode(false);
    setStampMode(false);
    setIsNotesMode(false);
    showStatus(isSelectionMode ? 'Selection mode disabled' : 'Selection mode enabled - Drag to select area', 'success');
  };

  const handlePanModeToggle = () => {
    setPanMode(!isPanMode);
    setSelectionMode(false);
    setStampMode(false);
    setIsNotesMode(false);
    showStatus(isPanMode ? 'Pan mode disabled' : 'Pan mode enabled', 'success');
  };

  const handleStampModeToggle = () => {
    setStampMode(!isStampMode);
    setPanMode(false);
    setSelectionMode(false);
    setIsNotesMode(false);
    showStatus(isStampMode ? 'Stamp mode disabled' : 'Stamp mode enabled - Drag to select area for manual entry', 'success');
  };
  
  const handleNotesModeToggle = () => {
    setIsNotesMode(!isNotesMode);
    setSelectionMode(false);
    setPanMode(false);
    setStampMode(false);
    showStatus(isNotesMode ? 'Notes mode disabled' : 'Notes mode enabled - Drag to select area for notes', 'success');
  };

  const handleMeasureEntryToggle = () => {
    setIsMeasureEntryMode(!isMeasureEntryMode);
    if (isMeasureEntryMode) {
      setEditingCell(null);
      setEditValue('');
    }
    showStatus(!isMeasureEntryMode ? 'Measure entry mode - Enter in M1/M2/M3 moves to next cell/row' : 'Measure entry mode disabled', 'success');
  };

  const handleConnectToggle = () => {
    setShowConnectModal(true);
  };

  // Helper function to convert bbox array to region format
  const bboxToRegion = (bbox, page) => {
    if (!bbox || !Array.isArray(bbox) || bbox.length < 2) {
      return null;
    }
    
    // Extract x and y coordinates from polygon points
    const xCoords = bbox.map(p => {
      if (Array.isArray(p)) return p[0];
      if (typeof p === 'object' && p.x !== undefined) return p.x;
      return p;
    }).filter(x => x !== undefined && x !== null);
    
    const yCoords = bbox.map(p => {
      if (Array.isArray(p)) return p[1];
      if (typeof p === 'object' && p.y !== undefined) return p.y;
      return p;
    }).filter(y => y !== undefined && y !== null);
    
    if (xCoords.length === 0 || yCoords.length === 0) {
      return null;
    }
    
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      page: page
    };
  };

  // Helper function to merge multiple bounding boxes into one
  const mergeBoundingBoxes = (bboxes, page) => {
    if (!bboxes || bboxes.length === 0) {
      return null;
    }
    
    // Convert all bboxes to regions first
    const regions = bboxes
      .map(bbox => bboxToRegion(bbox, page))
      .filter(region => region !== null);
    
    if (regions.length === 0) {
      return null;
    }
    
    // Find the bounding box that encompasses all regions
    const minX = Math.min(...regions.map(r => r.x));
    const minY = Math.min(...regions.map(r => r.y));
    const maxX = Math.max(...regions.map(r => r.x + r.width));
    const maxY = Math.max(...regions.map(r => r.y + r.height));
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      page: page
    };
  };

  // Helper function to cluster horizontally aligned elements (same Y position, different X)
  // Used for GD&T frames: [symbol] 0.025 M N
  // For vertically oriented items (height > width), finds immediate left/right neighbors
  const clusterHorizontallyAlignedElements = (items, page, tolerance = 10) => {
    if (!items || items.length === 0) return items;
    
    const clustered = [];
    const processed = new Set();
    
    for (let i = 0; i < items.length; i++) {
      if (processed.has(i)) continue;
      
      const item1 = items[i];
      const item1Region = bboxToRegion(item1.bbox || item1.box || [], page);
      if (!item1Region) {
        clustered.push(item1);
        processed.add(i);
        continue;
      }
      
      // Check if item1 is vertically oriented (height > width)
      const isVerticallyOriented = item1Region.height > item1Region.width;
      
      // Find horizontally aligned items (same Y position, different X)
      const cluster = [item1];
      const clusterIndices = [i];
      
      for (let j = i + 1; j < items.length; j++) {
        if (processed.has(j)) continue;
        
        const item2 = items[j];
        const item2Region = bboxToRegion(item2.bbox || item2.box || [], page);
        if (!item2Region) continue;
        
        // Check if horizontally aligned (same Y, within tolerance)
        const yDiff = Math.abs(item2Region.y - item1Region.y);
        const xDiff = Math.abs(item2Region.x - item1Region.x);
        
        // For vertically oriented items, look for immediate left/right neighbors
        // Check if items overlap vertically (for vertical orientation) or are on same line (for horizontal)
        let shouldCluster = false;
        
        if (isVerticallyOriented) {
          // For vertically oriented items, check if they overlap in Y and are side-by-side in X
          const yOverlap = !(item2Region.y + item2Region.height < item1Region.y || 
                            item1Region.y + item1Region.height < item2Region.y);
          const isLeftRight = xDiff > 5 && xDiff < 200; // Within reasonable horizontal distance
          
          // Also check if they're roughly on the same horizontal line (center alignment)
          const centerY1 = item1Region.y + item1Region.height / 2;
          const centerY2 = item2Region.y + item2Region.height / 2;
          const centerYDiff = Math.abs(centerY2 - centerY1);
          
          shouldCluster = (yOverlap || centerYDiff < tolerance) && isLeftRight;
        } else {
          // For horizontally oriented items, use original logic (same Y line)
          shouldCluster = yDiff < tolerance && xDiff > 5;
        }
        
        if (shouldCluster) {
          cluster.push(item2);
          clusterIndices.push(j);
          processed.add(j);
        }
      }
      
      // If we have a cluster, combine them
      if (cluster.length > 1) {
        // Sort by X position (left to right)
        const sortedCluster = cluster.map((item, idx) => ({
          item,
          region: bboxToRegion(item.bbox || item.box || [], page),
          x: bboxToRegion(item.bbox || item.box || [], page)?.x || 0
        })).filter(item => item.region).sort((a, b) => a.x - b.x);
        
        if (sortedCluster.length > 1) {
          // Merge all bounding boxes
          const allBboxes = sortedCluster.map(item => item.item.bbox || item.item.box || [])
            .filter(bbox => bbox && bbox.length > 0);
          
          const mergedBbox = mergeBoundingBoxes(allBboxes, page);
          
          if (mergedBbox) {
            // Combine text content from all items
            const combinedText = sortedCluster.map(item => {
              const text = item.item.text || item.item.content || item.item.class_name || '';
              return text.trim();
            }).filter(t => t).join(' ');
            
            // Create combined item
            const combinedItem = {
              ...item1,
              text: combinedText,
              bbox: allBboxes.flat(),
              clustered: true,
              clusterItems: sortedCluster.map(item => item.item)
            };
            
            clustered.push(combinedItem);
            continue;
          }
        }
      }
      
      // If no cluster found, add item as-is
      clustered.push(item1);
      processed.add(i);
    }
    
    return clustered;
  };

  // Helper function to cluster tolerances - Python cluster_tolerances logic
  const clusterTolerances = (pdfResults, page) => {
    if (!pdfResults || pdfResults.length === 0) return pdfResults;
    
    console.log("\n=== Starting Tolerance Clustering ===");
    console.log(`Processing ${pdfResults.length} PDF results`);
    
    // Helper function to check if two boxes are on the same X axis (vertical alignment)
    const isOnSameXAxis = (bbox1, bbox2) => {
      const y1_bbox1 = Math.min(...bbox1.map(p => p[1]));
      const y2_bbox1 = Math.max(...bbox1.map(p => p[1]));
      const textHeight = y2_bbox1 - y1_bbox1;
      const y1_bbox2 = Math.min(...bbox2.map(p => p[1]));
      const x1_bbox1 = Math.min(...bbox1.map(p => p[0]));
      const x1_bbox2 = Math.min(...bbox2.map(p => p[0]));
      
      return Math.abs(x1_bbox1 - x1_bbox2) < 1 && Math.abs(y1_bbox1 - y1_bbox2) <= textHeight * 1.2;
    };
      
    // Helper function to check if two boxes are on the same Y axis (horizontal alignment)
    const isOnSameYAxis = (bbox1, bbox2) => {
      const x1_bbox1 = Math.min(...bbox1.map(p => p[0]));
      const x2_bbox1 = Math.max(...bbox1.map(p => p[0]));
      const textWidth = x2_bbox1 - x1_bbox1;
      const x1_bbox2 = Math.min(...bbox2.map(p => p[0]));
      const y1_bbox1 = Math.min(...bbox1.map(p => p[1]));
      const y1_bbox2 = Math.min(...bbox2.map(p => p[1]));
      
      return Math.abs(y1_bbox1 - y1_bbox2) < 1 && Math.abs(x1_bbox1 - x1_bbox2) <= textWidth * 1.2;
    };
      
    // Helper function to check if item is duplicate in cluster
    const isDuplicateInCluster = (item, cluster) => {
      for (const existing of cluster) {
        if (existing.text === item.text && 
            JSON.stringify(existing.box) === JSON.stringify(item.box)) {
          return true;
        }
      }
      return false;
    };
    
    const processedIndices = new Set();
    const clusteredResults = [];
    
    // Process each detection
    for (let i = 0; i < pdfResults.length; i++) {
      if (processedIndices.has(i)) continue;
      
      const det1 = pdfResults[i];
      if (det1.text && det1.text.trim() === '+') {
        continue;
      }
      
      const box1 = det1.box || det1.bbox || [];
      if (!box1 || box1.length === 0) {
        clusteredResults.push(det1);
        processedIndices.add(i);
        continue;
      }
      
      // Find cluster members
      const cluster = [det1];
      const clusterBoxes = [box1];
      processedIndices.add(i);
      
      // Set orientation based on angle
      let orientation = null;
      const angle = Math.abs(det1.angle || 0);
      if (angle === 0) {
        // Horizontal Box
        orientation = true;
      } else if (angle === 90) {
        // Vertical Box
        orientation = false;
      }
      
      // Look for aligned elements
      for (let j = 0; j < pdfResults.length; j++) {
        if (j === i || processedIndices.has(j)) continue;
        
        const det2 = pdfResults[j];
        const box2 = det2.box || det2.bbox || [];
        if (!box2 || box2.length === 0) continue;
        
        let sameAxis = false;
        
        if (orientation !== null) {
          if (orientation) {
            sameAxis = isOnSameXAxis(det1.box || det1.bbox, det2.box || det2.bbox);
        } else {
            sameAxis = isOnSameYAxis(det1.box || det1.bbox, det2.box || det2.bbox);
          }
        }
        
        if (sameAxis) {
          if (!isDuplicateInCluster(det2, cluster)) {
            cluster.push(det2);
            clusterBoxes.push(box2);
            processedIndices.add(j);
          }
        }
      }
      
      let closestDet = null;
      // Find closest nominal value if we have a cluster of tolerances
      if (cluster.length === 2) {
        for (let j = 0; j < pdfResults.length; j++) {
          if (processedIndices.has(j)) continue;
        
          const det2 = pdfResults[j];
          if (det2.text && det2.text.trim() === '+') continue;
          
          const box3 = det2.box || det2.bbox || [];
          if (!box3 || box3.length === 0) continue;
          
          if (orientation) {
            // Horizontal orientation
            const firstBox = cluster.reduce((max, item) => {
              const itemBox = item.box || item.bbox || [];
              const itemY = Math.max(...itemBox.map(p => p[1]));
              const maxY = Math.max(...(max.box || max.bbox || []).map(p => p[1]));
              return itemY > maxY ? item : max;
            }, cluster[0]);
            
            const firstBoxCoords = firstBox.box || firstBox.bbox || [];
            const x_dist = firstBoxCoords[3] ? firstBoxCoords[3][0] - (box3[2] ? box3[2][0] : box3[0][0]) : 0;
            const y_dist = Math.abs((firstBoxCoords[1] ? firstBoxCoords[1][1] : firstBoxCoords[0][1]) - (box3[0] ? box3[0][1] : 0));
            
            if (1 <= x_dist && x_dist < 15 && Math.abs(y_dist) < 10) {
              closestDet = det2;
            }
          } else {
            // Vertical orientation
            const firstBox = cluster.reduce((max, item) => {
              const itemBox = item.box || item.bbox || [];
              const itemX = Math.max(...itemBox.map(p => p[0]));
              const maxX = Math.max(...(max.box || max.bbox || []).map(p => p[0]));
              return itemX > maxX ? item : max;
            }, cluster[0]);
            
            const firstBoxCoords = firstBox.box || firstBox.bbox || [];
            const x_dist = Math.abs((firstBoxCoords[0] ? firstBoxCoords[0][0] : 0) - (box3[0] ? box3[0][0] : 0));
            const y_dist = (box3[1] ? box3[1][1] : box3[0][1]) - (firstBoxCoords[3] ? firstBoxCoords[3][1] : firstBoxCoords[0][1]);
            
            if (1 <= y_dist && y_dist < 15 && Math.abs(x_dist) < 5) {
              closestDet = det2;
        }
      }
        }
        
        if (closestDet) {
          const closestBox = closestDet.box || closestDet.bbox || [];
          let combinedText, upperTol, lowerTol, combinedBox;
          
          if (orientation) {
            // Horizontal
            const item_1 = cluster.reduce((min, item) => {
              const itemBox = item.box || item.bbox || [];
              const itemY = Math.min(...itemBox.map(p => p[1]));
              const minY = Math.min(...(min.box || min.bbox || []).map(p => p[1]));
              return itemY < minY ? item : min;
            }, cluster[0]);
            
            const item_2 = cluster.reduce((max, item) => {
              const itemBox = item.box || item.bbox || [];
              const itemY = Math.max(...itemBox.map(p => p[1]));
              const maxY = Math.max(...(max.box || max.bbox || []).map(p => p[1]));
              return itemY > maxY ? item : max;
            }, cluster[0]);
            
            const item1Box = item_1.box || item_1.bbox || [];
            const item2Box = item_2.box || item_2.bbox || [];
            
            combinedText = closestDet.text || '';
            upperTol = '+ ' + (item_1.text || '');
            lowerTol = '- ' + (item_2.text || '');
            
            combinedBox = [
              [closestBox[0] ? closestBox[0][0] : 0, item1Box[0] ? item1Box[0][1] : 0],
              [item1Box[1] ? item1Box[1][0] : 0, item1Box[1] ? item1Box[1][1] : 0],
              [item2Box[1] ? item2Box[1][0] : 0, item2Box[3] ? item2Box[3][1] : item2Box[1] ? item2Box[1][1] : 0],
              [closestBox[0] ? closestBox[0][0] : 0, item2Box[3] ? item2Box[3][1] : item2Box[1] ? item2Box[1][1] : 0]
            ];
          } else {
            // Vertical
            const item_1 = cluster.reduce((min, item) => {
              const itemBox = item.box || item.bbox || [];
              const itemX = Math.min(...itemBox.map(p => p[0]));
              const minX = Math.min(...(min.box || min.bbox || []).map(p => p[0]));
              return itemX < minX ? item : min;
            }, cluster[0]);
            
            const item_2 = cluster.reduce((max, item) => {
              const itemBox = item.box || item.bbox || [];
              const itemX = Math.max(...itemBox.map(p => p[0]));
              const maxX = Math.max(...(max.box || max.bbox || []).map(p => p[0]));
              return itemX > maxX ? item : max;
            }, cluster[0]);
            
            const item1Box = item_1.box || item_1.bbox || [];
            const item2Box = item_2.box || item_2.bbox || [];
            
            combinedText = closestDet.text || '';
            upperTol = '+' + (item_1.text || '');
            lowerTol = '-' + (item_2.text || '');
            
            combinedBox = [
              [item1Box[0] ? item1Box[0][0] : 0, item1Box[0] ? item1Box[0][1] : 0],
              [item2Box[1] ? item2Box[1][0] : 0, item1Box[0] ? item1Box[0][1] : 0],
              [item2Box[1] ? item2Box[1][0] : 0, closestBox[3] ? closestBox[3][1] : closestBox[1] ? closestBox[1][1] : 0],
              [item1Box[0] ? item1Box[0][0] : 0, closestBox[3] ? closestBox[3][1] : closestBox[1] ? closestBox[1][1] : 0]
            ];
          }
          
          clusteredResults.push({
            text: `${combinedText} ${upperTol} ${lowerTol}`,
            box: combinedBox,
            bbox: combinedBox,
            confidence: det1.confidence || 0,
            angle: det1.angle || 0,
            upper_tol: upperTol,
            lower_tol: lowerTol
          });
          
          // Mark closest detection as processed
          const closestIndex = pdfResults.indexOf(closestDet);
          if (closestIndex !== -1) {
            processedIndices.add(closestIndex);
          }
          
          // Mark all cluster items as processed
          for (const item of cluster) {
            const idx = pdfResults.indexOf(item);
            if (idx !== -1) {
              processedIndices.add(idx);
            }
          }
        } else {
          // If no closest detection found, add cluster items individually
          for (const item of cluster) {
            if (!clusteredResults.some(existing => 
              existing.text === item.text && 
              JSON.stringify(existing.box) === JSON.stringify(item.box)
            )) {
              clusteredResults.push(item);
            }
          }
        }
      } else {
        // If cluster size is not 2, add items individually
        for (const item of cluster) {
          if (!clusteredResults.some(existing => 
            existing.text === item.text && 
            JSON.stringify(existing.box) === JSON.stringify(item.box)
          )) {
            clusteredResults.push(item);
          }
                }
              }
    }
    
    return clusteredResults;
  };

  // Helper function to cluster vertically aligned dimensions (nominal + upper + lower tolerances)
  // This uses the Python cluster_tolerances logic directly on textDetections, then combines with dimensions
  const clusterVerticallyAlignedDimensions = (dimensions, textDetections, page) => {
    // First, cluster tolerances from textDetections using Python logic
    // This handles the case where tolerances are stacked vertically
    const clusteredTextDetections = clusterTolerances(textDetections || [], page);
    
    // Then process dimensions with clustered text detections
    if (!dimensions || dimensions.length === 0) return dimensions;
    
    const clustered = [];
    const processed = new Set();
              
    // Helper to check if text is vertically aligned with dimension (same X, different Y)
    const isVerticallyAligned = (textBox, dimBox) => {
      const textRegion = bboxToRegion(textBox, page);
      const dimRegion = bboxToRegion(dimBox, page);
      if (!textRegion || !dimRegion) return false;
      
      const xDiff = Math.abs(textRegion.x - dimRegion.x);
      const yDiff = Math.abs(textRegion.y - dimRegion.y);
      
      // Python logic: abs(x1 - x2) <= text_width * 1.2 and abs(y1 - y2) < 1
      // For vertical stacking: strict Y alignment (< 1) and close X based on width
      const textWidth = textRegion.width;
      return yDiff < 1 && xDiff <= textWidth * 1.2;
    };
    
    for (let i = 0; i < dimensions.length; i++) {
      if (processed.has(i)) continue;
      
      const dim1 = dimensions[i];
      const dim1Region = bboxToRegion(dim1.bbox || [], page);
      if (!dim1Region) {
        clustered.push(dim1);
        processed.add(i);
                continue;
              }
              
      const dim1Text = (dim1.text || '').trim();
      const dim1Type = (dim1.dimension_type || '').trim();
      const isGDT1 = dim1Type.startsWith('GDT-');
      
      // Check if this dimension already has tolerances
      const hasTolerancesInText = dim1Text.includes('±') || 
                                  dim1Text.match(/[\+\-]\s*\d+\.?\d*/) ||
                                  (dim1.upper_tolerance && dim1.lower_tolerance);
      
      if (hasTolerancesInText || isGDT1) {
        clustered.push(dim1);
        processed.add(i);
        continue;
      }
      
      // Find vertically aligned text detections (both original and clustered)
      const alignedTexts = [];
      
      // Check clustered text detections first (these already have tolerances combined)
      for (const clusteredText of clusteredTextDetections) {
        if (clusteredText.upper_tol || clusteredText.lower_tol) {
          const textBox = clusteredText.box || clusteredText.bbox || [];
          if (isVerticallyAligned(textBox, dim1.bbox || [])) {
            alignedTexts.push({
              text: clusteredText,
              isClustered: true,
              y: bboxToRegion(textBox, page)?.y || 0
            });
                }
              }
      }
      
      // Also check original text detections for vertically aligned items
      for (const text of textDetections || []) {
        const textBox = text.box || text.bbox || [];
        if (!textBox || textBox.length === 0) continue;
        
        if (isVerticallyAligned(textBox, dim1.bbox || [])) {
          const textContent = (text.text || text.content || '').trim();
          // Skip if it's just a + or - sign
          if (textContent === '+' || textContent === '-') continue;
                
          // Check if this text is not already part of a clustered result
          const isInClustered = clusteredTextDetections.some(ct => {
            const ctBox = ct.box || ct.bbox || [];
            return JSON.stringify(ctBox) === JSON.stringify(textBox);
          });
          
          if (!isInClustered) {
            alignedTexts.push({
              text: text,
              isClustered: false,
              y: bboxToRegion(textBox, page)?.y || 0
            });
                }
        }
      }
      
      // ALSO check for horizontally aligned tolerances (same Y, different X)
      // This handles cases like: "80 +0.008 -0.004" or "⌀80 +0.008" "+0.004"
      // Based on Python: abs(y1 - y2) < 1 and abs(x1 - x2) <= text_height * 1.2
      const isHorizontallyAligned = (box1, box2) => {
        if (!box1 || !box2 || box1.length < 2 || box2.length < 2) return false;
        
        const y1Min = Math.min(box1[0][1], box1[1][1]);
        const y1Max = Math.max(box1[0][1], box1[1][1]);
        const y2Min = Math.min(box2[0][1], box2[1][1]);
        const x1Min = Math.min(box1[0][0], box1[1][0]);
        const x2Min = Math.min(box2[0][0], box2[1][0]);
        
        const textHeight = y1Max - y1Min;
        const yDiff = Math.abs(y1Min - y2Min);
        const xDiff = Math.abs(x1Min - x2Min);
        
        // Python logic: same X axis (xDiff < 1) and close Y (yDiff <= text_height * 1.2)
        return xDiff < 1 && yDiff <= textHeight * 1.2;
      };
      
      for (const text of textDetections || []) {
        const textBox = text.box || text.bbox || [];
        if (!textBox || textBox.length === 0) continue;
        
        if (isHorizontallyAligned(textBox, dim1.bbox || [])) {
          const textContent = (text.text || text.content || '').trim();
          // Only include if it starts with + or - (tolerance marker)
          if (textContent.startsWith('+') || textContent.startsWith('-')) {
            // Check if this text is not already part of a clustered result
            const isInClustered = clusteredTextDetections.some(ct => {
              const ctBox = ct.box || ct.bbox || [];
              return JSON.stringify(ctBox) === JSON.stringify(textBox);
            });
            
            if (!isInClustered) {
              const textRegion = bboxToRegion(textBox, page);
              alignedTexts.push({
                text: text,
                isClustered: false,
                y: textRegion?.y || 0,
                x: textRegion?.x || 0,
                isHorizontal: true
              });
              console.log('Found horizontally aligned tolerance:', {
                content: textContent,
                nominal: dim1Text,
                x: textRegion?.x,
                y: textRegion?.y
              });
            }
              }
            }
          }
          
      // Sort by Y position (top to bottom)
      alignedTexts.sort((a, b) => a.y - b.y);
      
      // If we have aligned texts, try to combine them
      if (alignedTexts.length > 0) {
        // Check if we have a clustered tolerance result
        const clusteredTolerance = alignedTexts.find(at => at.isClustered);
        
        if (clusteredTolerance) {
          // Use the clustered tolerance result
          const ct = clusteredTolerance.text;
          const combinedDim = {
            ...dim1,
            text: `${dim1Text} ${ct.upper_tol || ''} ${ct.lower_tol || ''}`.trim(),
            nominal_value: dim1Text,
            upper_tolerance: ct.upper_tol ? ct.upper_tol.replace(/^\+\s*/, '') : (dim1.upper_tolerance || '0'),
            lower_tolerance: ct.lower_tol ? ct.lower_tol.replace(/^-\s*/, '') : (dim1.lower_tolerance || '0'),
            bbox: [...(dim1.bbox || []), ...(ct.box || ct.bbox || [])],
            dimension_type: dim1.dimension_type || 'Length'
          };
          
          clustered.push(combinedDim);
          processed.add(i);
          continue;
        } else if (alignedTexts.length >= 2) {
          // We have multiple aligned texts, try to identify nominal, upper, and lower
          let nominal = null;
          let upperTol = null;
          let lowerTol = null;
          
          // Sort all items (dimension + texts) by Y position (vertical) or X position (horizontal)
          const allItems = [
            {
              type: 'dimension',
              content: dim1Text,
              y: dim1Region.y,
              x: dim1Region.x,
              bbox: dim1.bbox || []
            },
            ...alignedTexts.map(at => ({
              type: 'text',
              content: at.isClustered ? (at.text.text || '') : (at.text.text || at.text.content || ''),
              y: at.y,
              x: at.x || 0,
              isHorizontal: at.isHorizontal || false,
              bbox: at.isClustered ? (at.text.box || at.text.bbox || []) : (at.text.box || at.text.bbox || [])
            }))
          ];
          
          // Sort: vertically aligned items by Y, horizontally aligned by X
          const verticalItems = allItems.filter(item => !item.isHorizontal).sort((a, b) => a.y - b.y);
          const horizontalItems = allItems.filter(item => item.isHorizontal).sort((a, b) => a.x - b.x);
          const sortedItems = [...verticalItems, ...horizontalItems];
          
          // Strategy: Identify nominal, upper tol, and lower tol based on:
          // 1. Items with +/- are tolerances
          // 2. The LARGEST numeric value is likely the nominal
          // 3. For vertical stacks: top (smallest Y) with no +/- might be upper tol if it's small
          
          let candidates = [];
          
          // Collect all numeric items
          for (const item of sortedItems) {
            const content = item.content.trim();
            const cleanContent = content.replace(/^[⌀∅Ø]/g, '').trim();
            
            // Tolerance with explicit +/- sign
            if (content.startsWith('+')) {
              const tolValue = content.replace(/^\+/, '').trim();
              if (!upperTol) {
                upperTol = tolValue;
                console.log('Found explicit upper tolerance (+):', upperTol);
              }
            } else if (content.startsWith('-')) {
              const tolValue = content.replace(/^-/, '').trim();
              if (!lowerTol) {
                lowerTol = tolValue;
                console.log('Found explicit lower tolerance (-):', lowerTol);
              }
            } 
            // Numeric value without +/- sign
            else if (/^\d+\.?\d*$/.test(cleanContent)) {
              const numericValue = parseFloat(cleanContent);
              candidates.push({
                value: cleanContent,
                numericValue: numericValue,
                y: item.y,
                type: item.type,
                isHorizontal: item.isHorizontal
              });
            }
          }
          
          // Sort candidates by numeric value (descending) to find the largest
          candidates.sort((a, b) => b.numericValue - a.numericValue);
          
          console.log('Numeric candidates for nominal/tolerances:', candidates);
          
          // The largest value is typically the nominal
          // Small values (< 1) are likely tolerances
          if (candidates.length > 0) {
            const largest = candidates[0];
            
            // If largest value is >= 1, it's definitely the nominal
            if (largest.numericValue >= 1) {
              nominal = largest.value;
              console.log('Identified nominal (largest value >= 1):', nominal);
              
              // Remaining candidates are tolerances
              for (let i = 1; i < candidates.length; i++) {
                const candidate = candidates[i];
                // Determine if it's upper or lower based on Y position relative to nominal
                if (candidate.y < largest.y && !upperTol) {
                  // Above the nominal = upper tolerance
                  upperTol = candidate.value;
                  console.log('Identified upper tolerance (above nominal):', upperTol);
                } else if (candidate.y > largest.y && !lowerTol) {
                  // Below the nominal = lower tolerance
                  lowerTol = candidate.value;
                  console.log('Identified lower tolerance (below nominal):', lowerTol);
                }
              }
            } else {
              // All values are < 1, use dimension text as nominal
              const cleanDimText = dim1Text.replace(/^[⌀∅Ø]/g, '').trim();
              const numMatch = cleanDimText.match(/^(\d+\.?\d*)/);
              if (numMatch) {
                nominal = numMatch[1];
                console.log('Using dimension text as nominal (all candidates < 1):', nominal);
              }
              
              // All candidates are tolerances
              for (const candidate of candidates) {
                if (candidate.y < dim1Region.y && !upperTol) {
                  upperTol = candidate.value;
                  console.log('Upper tolerance:', upperTol);
                } else if (candidate.y > dim1Region.y && !lowerTol) {
                  lowerTol = candidate.value;
                  console.log('Lower tolerance:', lowerTol);
                }
              }
            }
          } else {
            // No candidates found, use dimension text
            const cleanDimText = dim1Text.replace(/^[⌀∅Ø]/g, '').trim();
            const numMatch = cleanDimText.match(/^(\d+\.?\d*)/);
            if (numMatch) {
              nominal = numMatch[1];
              console.log('Using dimension text as nominal (no candidates):', nominal);
            }
          }
          
          // If we found tolerances, combine them
          if (upperTol || lowerTol) {
            const allBboxes = sortedItems.map(item => item.bbox).filter(bbox => bbox && bbox.length > 0);
            const mergedBbox = mergeBoundingBoxes(allBboxes, page);
            
            if (mergedBbox) {
              const combinedDim = {
                ...dim1,
                text: `${nominal || dim1Text} ${upperTol ? '+' + upperTol : ''} ${lowerTol ? '-' + lowerTol : ''}`.trim(),
                nominal_value: nominal || dim1Text,
                upper_tolerance: upperTol || (dim1.upper_tolerance || '0'),
                lower_tolerance: lowerTol || (dim1.lower_tolerance || '0'),
                bbox: allBboxes.flat(),
                dimension_type: dim1.dimension_type || 'Length'
              };
              
              clustered.push(combinedDim);
              processed.add(i);
              continue;
            }
          }
        }
      }
      
      // If no match found, add dimension as-is
      clustered.push(dim1);
      processed.add(i);
    }
    
    return clustered;
  };

  const handleSelectionComplete = async (region) => {
    if (!partId) {
      showStatus('Part ID not available', 'error');
      return;
    }

    // If in notes mode, handle note creation
    if (isNotesMode) {
      await handleNoteSelectionComplete(region);
      return;
    }

    // If in stamp mode, show input modal
    if (isStampMode) {
      setStampRegion(region);
      setStampNominal('');
      setStampUpperTol('');
      setStampLowerTol('');
      setStampDimType('Length');
      setShowStampModal(true);
      return;
    }

    // Check if documentId is available
    if (!documentId) {
      showStatus('Document ID is required for processing dimensions. Please ensure the part has an associated document.', 'error');
      console.error('documentId is missing:', { partData, documentId, pdfUrl: partData.pdfUrl });
      return;
    }

    try {
      showStatus('Processing dimensions...', 'success');
      const result = await processDimensions(partId, documentId, region, rotation);
      
      // Handle both backend2 format (dimensions) and backend1 format (dimension_parsing)
      const dimensions = result.dimensions || result.dimension_parsing || [];
      
      // Extract GDT detections if available
      const gdtDetections = result.gdt_detections || [];
      const textDetections = result.text_detections || [];
      
      if (result.success && (dimensions.length > 0 || gdtDetections.length > 0)) {
        let createdCount = 0;
        
        // STEP 1: Cluster GD&T detections horizontally (for feature control frames)
        // GD&T frames are horizontally aligned: [symbol] 0.025 M N
        let clusteredGDT = [];
        if (gdtDetections.length > 0) {
          // Combine GD&T symbols with nearby text detections that might be part of the frame
          // First, find text detections that are likely part of GD&T frames (numbers, M, N)
          const gdtRelatedTexts = textDetections.filter(text => {
            const textContent = (text.text || text.content || '').trim();
            // Match: numbers (tolerance values), M, N (modifiers)
            return /^\d+\.?\d*$/.test(textContent) || 
                   /^[MN]$/i.test(textContent) ||
                   /^[MN]+$/i.test(textContent);
          });
          
          // Combine GD&T detections with related texts for horizontal clustering
          const gdtItems = [
            ...gdtDetections.map(gdt => ({ ...gdt, type: 'gdt', bbox: gdt.bbox || gdt.box })),
            ...gdtRelatedTexts.map(text => ({ ...text, type: 'text', bbox: text.box || text.bbox }))
          ];
          
          // Cluster horizontally aligned GD&T items
          clusteredGDT = clusterHorizontallyAlignedElements(gdtItems, region.page, 10);
          console.log(`Clustered ${gdtDetections.length} GD&T detections to ${clusteredGDT.length} clusters`);
        }
        
        // STEP 2: Cluster vertically aligned dimensions (nominal + upper + lower tolerances)
        // This handles cases like: Ø, 103, ±0.2 stacked vertically
        const clusteredDimensions = clusterVerticallyAlignedDimensions(
          dimensions,
          textDetections,
          region.page
        );
        
        console.log(`Processing ${dimensions.length} dimensions from backend, clustered to ${clusteredDimensions.length} dimensions`);
        
        // STEP 3: Separate dimensions with values from GDT-only dimensions
        // IMPORTANT: Include GDT dimensions that have nominal values (e.g., "⏥ 0.003" or "↗ 0.005 M")
        // These should be treated as separate dimensions, each with their own bounding box
        const dimensionsWithValues = clusteredDimensions.filter(dim => 
          dim.nominal_value !== null && dim.nominal_value !== undefined
        );
        const gdtOnlyDimensions = clusteredDimensions.filter(dim => 
          dim.dimension_type === 'GDT' && (dim.nominal_value === null || dim.nominal_value === undefined)
        );
        
        console.log('Processing dimensions:', {
          allDimensions: clusteredDimensions,
          dimensionsWithValues,
          gdtOnlyDimensions,
          gdtDetections: clusteredGDT.length > 0 ? clusteredGDT : gdtDetections
        });

        // Track used GDT and text indices to avoid duplicates
        const usedGDTIndices = new Set();
        const usedTextIndices = new Set();
        const processedDimensions = new Set(); // Track dimensions already processed via clustered GDT

        // STEP 4: Process clustered GDT frames FIRST (horizontal frames like "⌖ 0.003 M")
        // Each clustered GDT becomes ONE bbox
        for (let gdtIdx = 0; gdtIdx < clusteredGDT.length; gdtIdx++) {
          const gdt = clusteredGDT[gdtIdx];
          
          // Only process clustered items (horizontal frames)
          if (!gdt.clustered || !gdt.clusterItems) continue;
          
          console.log('🎯 Processing clustered GDT frame:', {
            text: gdt.text,
            itemCount: gdt.clusterItems.length
          });
          
          // Collect all bboxes from cluster items
          const clusterBboxes = [];
          const clusterTextDetections = [];
          let nominalValue = null;
          let gdtSymbol = null;
          let gdtClassName = null;
          
          gdt.clusterItems.forEach(item => {
            const itemBox = item.bbox || item.box;
            if (itemBox && Array.isArray(itemBox) && itemBox.length >= 2) {
              clusterBboxes.push(itemBox);
            }
            
            // Extract nominal value from text items
            if (item.type === 'text' && /^\d+\.?\d*$/.test(item.text)) {
              nominalValue = item.text;
              // Mark this dimension as processed
              const matchingDim = dimensionsWithValues.find(d => d.nominal_value === item.text);
              if (matchingDim) {
                processedDimensions.add(matchingDim);
                console.log('  ✓ Marking dimension as processed:', item.text);
              }
              
              // Find and mark text detection as used
              const textIdx = textDetections.findIndex(t => 
                (t.box && JSON.stringify(t.box) === JSON.stringify(itemBox)) ||
                (t.bbox && JSON.stringify(t.bbox) === JSON.stringify(itemBox))
              );
              if (textIdx >= 0) {
                usedTextIndices.add(textIdx);
                clusterTextDetections.push(textDetections[textIdx]);
              }
            }
            
            // Extract GDT symbol and class from gdt items
            if (item.type === 'gdt') {
              gdtClassName = item.class_name || '';
              const symbolMatch = gdtClassName.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ⌰∅⌀]/);
              if (symbolMatch) {
                gdtSymbol = symbolMatch[0];
              }
            }
            
            // Mark text items (M, N) as used
            if (item.type === 'text' && /^[MN]+$/i.test(item.text)) {
              const textIdx = textDetections.findIndex(t => 
                (t.box && JSON.stringify(t.box) === JSON.stringify(itemBox)) ||
                (t.bbox && JSON.stringify(t.bbox) === JSON.stringify(itemBox))
              );
              if (textIdx >= 0) {
                usedTextIndices.add(textIdx);
                clusterTextDetections.push(textDetections[textIdx]);
              }
            }
          });
          
          if (clusterBboxes.length === 0) {
            console.warn('  ⚠️ No valid bboxes in cluster');
            continue;
          }
          
          // Merge all bboxes into one
          const mergedBbox = mergeBoundingBoxes(clusterBboxes, region.page);
          if (!mergedBbox) {
            console.warn('  ⚠️ Failed to merge cluster bboxes');
            continue;
          }
          
          // Create label
          const gdtName = gdtClassName ? gdtClassName.replace(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ⌰∅⌀]/, '').trim() : '';
          const label = gdtSymbol 
            ? `GDT: ${gdtSymbol} ${gdtName || 'Unknown'} - ${nominalValue || gdt.text}`
            : `GDT: ${gdt.text}`;
          
          console.log('  ✅ Creating bbox for clustered GDT:', {
            label,
            bboxCount: clusterBboxes.length,
            merged: mergedBbox
          });
          
          // Save bbox
          const saveResult = await saveBoundingBox(partId, documentId, mergedBbox, label);
          
          if (saveResult.id) {
            try {
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Prepare update data with GDT info
              const dimensionData = {
                text: gdt.text,
                nominal_value: nominalValue || '0',
                upper_tolerance: '0',
                lower_tolerance: '0',
                dimension_type: 'GDT-' + gdtClassName,
                bbox: mergedBbox
              };
              
              // Add GDT data
              if (gdtClassName) {
                dimensionData.gdt_data = {
                  class_name: gdtClassName,
                  confidence: gdt.confidence || 1.0,
                  bbox: gdt.bbox
                };
              }
              
              const updateData = {
                dimension_data: [dimensionData],
                text_data: clusterTextDetections,
                gdt_data: gdt.clusterItems.filter(item => item.type === 'gdt')
              };
              
              console.log('  📝 Saving dimension data:', dimensionData);
              
              await updateBoundingBox(partId, saveResult.id, updateData);
              console.log('  ✅ Saved clustered GDT bbox:', saveResult.id);
              
              // Mark this GDT as used
              usedGDTIndices.add(gdtIdx);
              createdCount++;
            } catch (error) {
              console.error('  ❌ Error updating clustered GDT bbox:', error);
            }
          }
        }

        // Array to collect bounding boxes for batch creation
        const bboxesToCreate = [];
        
        // STEP 5: Process remaining dimensions (not part of clustered GDT)
        for (const dim of dimensionsWithValues) {
          // Skip if already processed as part of clustered GDT
          if (processedDimensions.has(dim)) {
            console.log('⏭️ Skipping dimension (already in clustered GDT):', dim.nominal_value);
            continue;
          }
          // Check if this dimension is a GDT dimension (dimension_type starts with "GDT-" or equals "GDT")
          const dimType = dim.dimension_type || '';
          const isGDT = dimType.startsWith('GDT-') || dimType === 'GDT';
          
          // Create a copy to modify
          let dimension = { ...dim };
          
          // IMPORTANT: Length dimensions (like "120 ±0.2") should NEVER be associated with GD&T
          // Only GD&T dimensions with small tolerance values (< 1) should be associated with GD&T symbols
          const nominalValue = parseFloat(dimension.nominal_value) || 0;
          let isLengthDimension = !isGDT && (dimType === 'Length' || !dimType || dimType === '');
          
          // SPECIAL CASE: Backend sometimes returns GD&T tolerance values as "Length" dimensions
          // Check if this "Length" dimension with small value (< 1) is actually a GD&T tolerance
          // BUT: Only convert if it's NOT part of a horizontal clustered GDT frame
          // IMPORTANT: Only convert if nominal value is < 1 (tolerance values, not dimensions like 60, 120, etc.)
          if (isLengthDimension && nominalValue < 1 && nominalValue > 0) {
            console.log('🔍 Checking if Length dimension should be GDT:', {
              nominal: dimension.nominal_value,
              text: dimension.text,
              isSmallValue: nominalValue < 1
            });
            // Get dimension bbox early for proximity check
            const tempDimBbox = dimension.bbox || [];
            const tempDimRegion = bboxToRegion(tempDimBbox, region.page);
            
            if (tempDimRegion) {
              // First, check if this dimension is already part of a clustered GDT
              // (horizontal frames like "⌖ 0.003 M" are already clustered)
              // IMPORTANT: We need to find the EXACT clustered GDT that contains this specific dimension
              const matchingClusteredGDT = clusteredGDT.find((gdt, gdtIdx) => {
                if (!gdt.clustered || !gdt.clusterItems) return false;
                if (usedGDTIndices.has(gdtIdx)) return false; // Skip already used GDTs
                
                // Check if any cluster item matches this dimension's EXACT bbox or text
                const hasExactMatch = gdt.clusterItems.some(item => {
                  // Try exact bbox match first (most reliable)
                  const itemBox = item.bbox || item.box;
                  if (itemBox && tempDimBbox && Array.isArray(itemBox) && Array.isArray(tempDimBbox)) {
                    const boxMatch = JSON.stringify(itemBox) === JSON.stringify(tempDimBbox);
                    if (boxMatch) {
                      console.log('✓ Exact bbox match found:', {
                        itemText: item.text || item.class_name,
                        dimNominal: dimension.nominal_value
                      });
                      return true;
                    }
                  }
                  
                  // Try exact text match
                  if (item.type === 'text') {
                    if (item.text === dimension.text || item.text === dimension.nominal_value) {
                      console.log('✓ Exact text match found:', {
                        itemText: item.text,
                        dimText: dimension.text,
                        dimNominal: dimension.nominal_value
                      });
                      return true;
                    }
                  }
                  
                  return false;
                });
                
                return hasExactMatch;
              });
              
              if (matchingClusteredGDT) {
                // Found in clustered GDT - convert to GDT type so it goes through GDT processing
                console.log('🔄 Converting Length to GDT (found in clustered GDT):', {
                  nominal: dimension.nominal_value,
                  clusteredText: matchingClusteredGDT.text,
                  clusteredClassName: matchingClusteredGDT.class_name
                });
                isLengthDimension = false;
                
                // Extract symbol from clustered GDT
                const gdtSymbolMatch = (matchingClusteredGDT.text || matchingClusteredGDT.class_name || '')
                  .match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ⌰∅⌀]/);
                const extractedSymbol = gdtSymbolMatch ? gdtSymbolMatch[0] : '';
                
                // Get the GDT class_name from cluster items
                const gdtItem = matchingClusteredGDT.clusterItems.find(item => item.type === 'gdt');
                const gdtClassName = gdtItem ? (gdtItem.class_name || '') : (matchingClusteredGDT.class_name || '');
                
                dimension.dimension_type = 'GDT-' + (gdtClassName || extractedSymbol);
                dimension.gdt_data = {
                  class_name: gdtClassName,
                  confidence: gdtItem ? gdtItem.confidence : (matchingClusteredGDT.confidence || 1.0),
                  bbox: gdtItem ? (gdtItem.bbox || gdtItem.box) : (matchingClusteredGDT.bbox || matchingClusteredGDT.box)
                };
                
                // IMPORTANT: Store reference to the specific clustered GDT to ensure we only match with this one
                dimension._specificClusteredGDT = matchingClusteredGDT;
                
                // Mark this clustered GDT as "reserved" for this dimension to prevent others from using it
                const reservedIdx = clusteredGDT.indexOf(matchingClusteredGDT);
                if (reservedIdx >= 0) {
                  usedGDTIndices.add(reservedIdx);
                  console.log('🔒 Reserved clustered GDT for this dimension:', {
                    index: reservedIdx,
                    text: matchingClusteredGDT.text
                  });
                }
              } else {
                // Look for a nearby GD&T symbol that is VERTICALLY aligned (for vertical callouts)
                const nearbyGDT = gdtDetections.find(gdt => {
                  const gdtClassName = (gdt.class_name || '').trim();
                  const isDatumLetter = /^[A-Z]$/.test(gdtClassName);
                  if (isDatumLetter) return false; // Skip datum letters
                  
                  const gdtBox = gdt.bbox || gdt.box;
                  if (!gdtBox || !Array.isArray(gdtBox) || gdtBox.length < 2) return false;
                  
                  const gdtRegion = bboxToRegion(gdtBox, region.page);
                  if (!gdtRegion) return false;
                  
                  // Check if vertically aligned (same X, different Y)
                  const xDiff = Math.abs(gdtRegion.x - tempDimRegion.x);
                  const yDiff = Math.abs(gdtRegion.y - tempDimRegion.y);
                  
                  // Must be on same vertical line (xDiff < 10) and reasonably close vertically (yDiff < 50)
                  // This ensures we only match vertical GDT callouts, not horizontal frames
                  return xDiff < 10 && yDiff < 50 && yDiff > 0;
                });
                
                if (nearbyGDT) {
                  console.log('🔄 Converting Length dimension to GDT (found nearby VERTICAL symbol):', {
                    originalType: dimType,
                    nominal: dimension.nominal_value,
                    nearbySymbol: nearbyGDT.class_name,
                    xDiff: Math.abs(bboxToRegion(nearbyGDT.bbox || nearbyGDT.box, region.page).x - tempDimRegion.x),
                    yDiff: Math.abs(bboxToRegion(nearbyGDT.bbox || nearbyGDT.box, region.page).y - tempDimRegion.y)
                  });
                  isLengthDimension = false;
                  // Update dimension type to GDT
                  dimension.dimension_type = 'GDT-' + nearbyGDT.class_name;
                  // Store the GDT data
                  if (!dimension.gdt_data) {
                    dimension.gdt_data = {
                      class_name: nearbyGDT.class_name,
                      confidence: nearbyGDT.confidence || 1.0,
                      bbox: nearbyGDT.bbox || nearbyGDT.box
                    };
                  }
                } else {
                  console.log('ℹ️ No vertical GDT symbol found for Length dimension:', dimension.nominal_value);
                }
              }
            }
          }
          
          // Recalculate isGDT after potential conversion
          const finalDimType = dimension.dimension_type || '';
          let finalIsGDT = finalDimType.startsWith('GDT-') || finalDimType === 'GDT';
          
          // CRITICAL: If nominal value >= 1, this CANNOT be a GDT tolerance
          // GDT tolerances are always small values (< 1), like 0.003, 0.025, etc.
          // Dimensions like 60, 120, 103 are regular dimensions, NOT GDT
          // NEVER overwrite Diameter – backend sends Diameter for ⌀ callouts
          const isDiameter = (dimension.dimension_type || '').trim() === 'Diameter';
          if (finalIsGDT && nominalValue >= 1 && !isDiameter) {
            console.log('⚠️ Correcting misclassified GDT - value >= 1:', {
              nominal: dimension.nominal_value,
              originalType: dimension.dimension_type
            });
            dimension.dimension_type = 'Length';
            finalIsGDT = false;
            isLengthDimension = true;
            // Remove any GDT data
            delete dimension.gdt_data;
            delete dimension._specificClusteredGDT;
          }
          if (isDiameter) {
            isLengthDimension = false;
          }
          
          // Skip GD&T association for Length dimensions
          if (isLengthDimension) {
            // This is a Length dimension, process it separately without GD&T association
            // Just use the dimension as-is with its bbox
            console.log('✓ Processing as Length dimension:', {
              nominal: dimension.nominal_value,
              type: dimension.dimension_type
            });
          }
          
          // Clean GDT nominal values: remove M and N modifiers (e.g., "0.005 M" -> "0.005", "0.025 MN" -> "0.025")
          if (finalIsGDT && dimension.nominal_value && nominalValue < 1) {
            // Remove M and N modifiers from anywhere in the string (with optional spaces)
            dimension.nominal_value = dimension.nominal_value
              .replace(/\s*[MN]+\s*/gi, ' ') // Remove M, N, MN, NM, etc. with surrounding spaces
              .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
              .trim();
            
            // Also clean the text field if it exists
            if (dimension.text) {
              dimension.text = dimension.text
                .replace(/\s*[MN]+\s*/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            }
          }
          
          // Get dimension bbox
          const dimBbox = dimension.bbox || [];
          const dimRegion = bboxToRegion(dimBbox, region.page);
          
          // If no valid dimension bbox, skip
          if (!dimRegion || dimRegion.width <= 0 || dimRegion.height <= 0) {
            continue;
          }
          
          // Collect all bounding boxes to merge (like frontend does)
          const bboxesToMerge = [dimBbox];
          let needsMerging = false;
          
          // Track text detections used specifically for THIS dimension
          const dimensionTextDetections = [];
          
          // For GDT dimensions, use clustered GD&T if available
          const gdtToUse = clusteredGDT.length > 0 ? clusteredGDT : gdtDetections;
          
          // Only associate GD&T if:
          // 1. It's a GD&T dimension (not Length)
          // 2. The nominal value is < 1 (tolerance value, not dimension value)
          // 3. The GD&T symbol is not just a datum letter (like "B")
          if (finalIsGDT && nominalValue < 1) {
            console.log('🔷 Processing GD&T dimension:', {
              nominal: dimension.nominal_value,
              dimType,
              gdtData: dimension.gdt_data,
              availableGDT: gdtToUse.length,
              rawGDTDetections: gdtDetections.length
            });
            
            // Extract GDT symbol from dimension type (e.g., "GDT-⏥" -> "⏥")
            // If dimType is just "GDT", we'll get the symbol from gdt_data or gdtDetections
            let gdtSymbol = dimType.startsWith('GDT-') ? dimType.replace('GDT-', '').trim() : '';
            
            // Check gdt_data for class_name first (most reliable)
            if (dimension.gdt_data) {
              const gdtDataItem = typeof dimension.gdt_data === 'object' && !Array.isArray(dimension.gdt_data)
                ? dimension.gdt_data
                : (Array.isArray(dimension.gdt_data) && dimension.gdt_data.length > 0 ? dimension.gdt_data[0] : null);
              if (gdtDataItem && gdtDataItem.class_name) {
                const symbolMatch = gdtDataItem.class_name.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ⌰∅⌀]/);
                if (symbolMatch) {
                  gdtSymbol = symbolMatch[0];
                  console.log('✓ Extracted GD&T symbol from gdt_data:', gdtSymbol);
                }
              }
            }
            
            // If still no symbol, try to extract from dimension text
            if (!gdtSymbol && dimension.text) {
              const symbolMatch = dimension.text.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ⌰∅⌀]/);
              if (symbolMatch) {
                gdtSymbol = symbolMatch[0];
                console.log('✓ Extracted GD&T symbol from text:', gdtSymbol);
              }
            }
            
            console.log('🔍 GD&T Symbol:', gdtSymbol || 'NONE FOUND');
            
            // Find the clustered GD&T that matches this dimension
            // Clustered GD&T will have combined text like "⏥ 0.025 M N"
            // IMPORTANT: Skip datum letters (like "B") - they should not be associated with tolerance values
            
            // First check if this dimension has a specific clustered GDT reference
            let matchingGDT = null;
            if (dimension._specificClusteredGDT) {
              // Use the specific clustered GDT that was identified during conversion
              // This GDT should already be marked as used (reserved) during conversion
              matchingGDT = dimension._specificClusteredGDT;
              console.log('✓ Using specific clustered GDT reference (already reserved):', {
                dimensionNominal: dimension.nominal_value,
                clusteredText: matchingGDT.text
              });
            }
            
            // If no specific reference, search for matching GDT
            if (!matchingGDT) {
              matchingGDT = gdtToUse.find((gdt, idx) => {
              if (usedGDTIndices.has(idx)) return false;
              const gdtText = gdt.text || gdt.class_name || '';
              const gdtClassName = gdt.class_name || '';
              
                // Skip if it's just a datum letter (single letter like "B", "A", etc.)
                // Datum letters should not be associated with tolerance values
                const isDatumLetter = /^[A-Z]$/.test(gdtClassName.trim()) || /^[A-Z]$/.test(gdtText.trim());
                if (isDatumLetter) return false;
                
                // Match by:
                // 1. Symbol in text/class_name
                // 2. GDT class match
                // 3. For clustered GDT: check if dimension's nominal value is in the cluster text
                const symbolMatch = gdtSymbol && (gdtText.includes(gdtSymbol) || gdtClassName.includes(gdtSymbol));
                const classMatch = dimension.gdt_class !== undefined && gdt.class === dimension.gdt_class;
                const valueMatch = gdt.clustered && dimension.nominal_value && gdtText.includes(dimension.nominal_value);
                
                return symbolMatch || classMatch || valueMatch;
              });
            }
            
            console.log('🔍 Searching for matching GDT:', {
              dimensionNominal: dimension.nominal_value,
              gdtSymbol: gdtSymbol || 'NONE',
              availableGDT: gdtToUse.map((g, idx) => ({
                index: idx,
                text: g.text || g.class_name,
                clustered: g.clustered || false,
                used: usedGDTIndices.has(idx)
              })),
              matchFound: !!matchingGDT
            });
            
            let matchType = 'name';
            // If no match by name, try proximity-based matching (within 150 points)
            if (!matchingGDT) {
              matchingGDT = gdtToUse.find((gdt, idx) => {
                if (usedGDTIndices.has(idx)) return false;
                const gdtBox = gdt.bbox || gdt.box;
                if (!gdtBox || !Array.isArray(gdtBox) || gdtBox.length < 2) return false;
                
                const gdtText = gdt.text || gdt.class_name || '';
                const gdtClassName = gdt.class_name || '';
                
                // Skip if it's just a datum letter (single letter like "B", "A", etc.)
                const isDatumLetter = /^[A-Z]$/.test(gdtClassName.trim()) || /^[A-Z]$/.test(gdtText.trim());
                if (isDatumLetter) return false;
                
                const gdtRegion = bboxToRegion(gdtBox, region.page);
                if (!gdtRegion) return false;
                
                // Check proximity to dimension
                const distance = Math.sqrt(
                  Math.pow(gdtRegion.x - dimRegion.x, 2) + 
                  Math.pow(gdtRegion.y - dimRegion.y, 2)
                );
                return distance < 150; // Within 150 points
              });
              if (matchingGDT) {
                matchType = 'proximity';
              }
            }
            
            if (matchingGDT) {
              // If this is a clustered GD&T item, it may have clusterItems with individual bboxes
              // We should include all of them for proper merging (symbol + value + modifiers)
              if (matchingGDT.clustered && matchingGDT.clusterItems) {
                console.log('📦 Processing clustered GDT with items:', {
                  clusterText: matchingGDT.text,
                  itemCount: matchingGDT.clusterItems.length,
                  items: matchingGDT.clusterItems.map(item => ({
                    type: item.type,
                    text: item.text || item.class_name,
                    hasBox: !!(item.bbox || item.box)
                  }))
                });
                
                // Add all bboxes from cluster items (includes GD&T symbol, value, M, N, etc.)
                matchingGDT.clusterItems.forEach((clusterItem, itemIdx) => {
                  const itemBox = clusterItem.bbox || clusterItem.box;
                  if (itemBox && Array.isArray(itemBox) && itemBox.length >= 2) {
                    bboxesToMerge.push(itemBox);
                    console.log(`  ✓ Added cluster item ${itemIdx + 1} bbox:`, {
                      type: clusterItem.type,
                      text: clusterItem.text || clusterItem.class_name,
                      bboxCount: bboxesToMerge.length
                    });
                    
                    // Mark associated text detections as used
                    if (clusterItem.type === 'text') {
                      const textIndex = textDetections.findIndex(t => 
                        (t.box && JSON.stringify(t.box) === JSON.stringify(itemBox)) ||
                        (t.bbox && JSON.stringify(t.bbox) === JSON.stringify(itemBox))
                      );
                      if (textIndex >= 0) {
                        usedTextIndices.add(textIndex);
                        dimensionTextDetections.push(textDetections[textIndex]);
                      }
                    }
                  } else {
                    console.warn(`  ⚠️ Cluster item ${itemIdx + 1} has no valid bbox:`, clusterItem);
                  }
                });
              } else {
                // Single GD&T item, add its bbox (the GD&T symbol bbox)
              const gdtBox = matchingGDT.bbox || matchingGDT.box;
              if (gdtBox && Array.isArray(gdtBox) && gdtBox.length >= 2) {
                bboxesToMerge.push(gdtBox);
                  console.log('✓ Added single GD&T bbox:', {
                    text: matchingGDT.text || matchingGDT.class_name,
                    bboxCount: bboxesToMerge.length
                  });
                }
              }
              
                const gdtIdx = gdtToUse.indexOf(matchingGDT);
              if (gdtIdx >= 0 && !usedGDTIndices.has(gdtIdx)) {
                usedGDTIndices.add(gdtIdx);
                console.log('🔒 Marked GDT as used (index ' + gdtIdx + ')');
              } else if (gdtIdx >= 0) {
                console.log('ℹ️ GDT already marked as used (index ' + gdtIdx + ')');
              }
                needsMerging = true;
              console.log('✅ Final matching GD&T:', {
                  gdtText: matchingGDT.text || matchingGDT.class_name,
                  gdtSymbol: gdtSymbol || '(none)',
                  matchType: matchType,
                isClustered: matchingGDT.clustered || false,
                clusterItemsCount: matchingGDT.clusterItems ? matchingGDT.clusterItems.length : 0,
                  dimension: dimension.nominal_value,
                totalBboxesToMerge: bboxesToMerge.length
              });
            }
            
            // ALWAYS try to find the raw GD&T detection bbox for the symbol
            // This ensures we include the symbol even if clustered matching didn't work
            if (gdtDetections.length > 0 && gdtSymbol) {
              console.log('🔍 Searching raw GD&T detections for symbol:', gdtSymbol);
              console.log('Available GD&T detections:', gdtDetections.map(g => ({
                className: g.class_name,
                hasBox: !!(g.bbox || g.box)
              })));
              
              const rawGDT = gdtDetections.find((gdt, idx) => {
                const gdtClassName = (gdt.class_name || '').trim();
                const isDatumLetter = /^[A-Z]$/.test(gdtClassName);
                
                console.log(`Checking GD&T detection "${gdtClassName}":`, {
                  isDatumLetter,
                  used: usedGDTIndices.has(idx),
                  includesSymbol: gdtClassName.includes(gdtSymbol)
                });
                
                if (usedGDTIndices.has(idx)) return false;
                if (isDatumLetter) return false;
                
                // Match by symbol
                return gdtClassName.includes(gdtSymbol);
              });
              
              if (rawGDT) {
                const gdtBox = rawGDT.bbox || rawGDT.box;
                if (gdtBox && Array.isArray(gdtBox) && gdtBox.length >= 2) {
                  // Check if this bbox is already in bboxesToMerge
                  const alreadyAdded = bboxesToMerge.some(bbox => 
                    JSON.stringify(bbox) === JSON.stringify(gdtBox)
                  );
                  
                  if (!alreadyAdded) {
                    bboxesToMerge.push(gdtBox);
                    const gdtIdx = gdtDetections.indexOf(rawGDT);
                    if (gdtIdx >= 0) usedGDTIndices.add(gdtIdx);
                    needsMerging = true;
                    console.log('✅ Added raw GD&T symbol bbox:', {
                      gdtClassName: rawGDT.class_name,
                      gdtSymbol: gdtSymbol,
                      bboxCount: bboxesToMerge.length
                });
              } else {
                    console.log('ℹ️ GD&T symbol bbox already in merge list');
              }
            } else {
                  console.warn('⚠️ Raw GD&T found but has no valid bbox');
                }
              } else {
                console.warn('⚠️ No raw GD&T detection found for symbol:', gdtSymbol);
              }
            }
            
            // Find ALL associated text detections for GD&T frames
            // For vertically stacked GD&T (like ⌰ 0.025 M N), we need to collect ALL vertically aligned texts
            const nominalValue = dimension.nominal_value || '';
            const isDimVerticallyOriented = dimRegion.height > dimRegion.width;
            
            if (nominalValue) {
              // Find ALL vertically aligned text detections (including M, N modifiers)
              // IMPORTANT: Use strict X-axis alignment to avoid mixing different vertical stacks
              const associatedTexts = textDetections.filter((text, idx) => {
                if (usedTextIndices.has(idx)) return false;
                const textBbox = text.box || text.bbox || [];
                const textRegion = bboxToRegion(textBbox, region.page);
                if (!textRegion) return false;
                
                const textContent = (text.text || text.content || '').trim();
                
                // Skip if the text is already part of a complete dimension (has ± or both + and -)
                // This prevents "120 ±0.2" from being included in GDT frames
                if (textContent.includes('±') || 
                    (textContent.includes('+') && textContent.includes('-'))) {
                  return false;
                }
                
                // For vertically oriented GD&T, check for vertically aligned items (same X, different Y)
                if (isDimVerticallyOriented) {
                  // Check if text is on the same vertical line (same X, within STRICT tolerance)
                  const xDiff = Math.abs(textRegion.x - dimRegion.x);
                  const yDiff = Math.abs(textRegion.y - dimRegion.y);
                  
                  // STRICT X position match (within 5 pixels) - vertically stacked on same line
                  // This ensures we only get items on the SAME vertical stack, not adjacent stacks
                  return xDiff < 5 && yDiff > 0 && yDiff < 100; // Same X, different Y
                } else {
                  // For horizontally oriented GD&T, check proximity
                  const distance = Math.sqrt(
                    Math.pow(textRegion.x - dimRegion.x, 2) + 
                    Math.pow(textRegion.y - dimRegion.y, 2)
                  );
                  
                  // Also check if the text content matches the nominal value or is M/N
                  return distance < 100 || textContent.includes(nominalValue) || 
                         textContent === 'M' || textContent === 'N';
                }
              });
              
              // Sort by Y position (top to bottom) for vertical stacking
              if (associatedTexts.length > 0) {
                associatedTexts.sort((a, b) => {
                  const aRegion = bboxToRegion(a.box || a.bbox || [], region.page);
                  const bRegion = bboxToRegion(b.box || b.bbox || [], region.page);
                  if (!aRegion || !bRegion) return 0;
                  
                  // Sort by Y position (top to bottom)
                  return aRegion.y - bRegion.y;
                });
                
                // Add ALL associated texts to bboxesToMerge (including M, N, 0.025, etc.)
                associatedTexts.forEach(text => {
                  if (text.box || text.bbox) {
                    bboxesToMerge.push(text.box || text.bbox);
                  // Mark the text index as used
                    const textIndex = textDetections.findIndex(t => t === text);
                  if (textIndex >= 0) usedTextIndices.add(textIndex);
                    // Add to dimension-specific text detections
                    dimensionTextDetections.push(text);
                  needsMerging = true;
                }
                });
              }
            }
          } else {
            // For non-GDT dimensions (Length, Diameter, etc.), do NOT merge with GD&T
            // Length dimensions like "120 ±0.2" should remain completely separate from GD&T frames
            // Only process their own bbox
            console.log('ℹ️ Length dimension - using only its own bbox, no GDT merging');
            
            // Mark all text detections that match this dimension as used
            // This prevents them from being included in other dimensions
            // Also add matching text to dimensionTextDetections
              textDetections.forEach((text, idx) => {
                if (usedTextIndices.has(idx)) return;
                const textBbox = text.box || text.bbox || [];
                const textRegion = bboxToRegion(textBbox, region.page);
                if (!textRegion) return;
                
                // Check if text bbox matches dimension bbox (same coordinates)
                if (Math.abs(textRegion.x - dimRegion.x) < 2 &&
                    Math.abs(textRegion.y - dimRegion.y) < 2 &&
                    Math.abs(textRegion.width - dimRegion.width) < 2 &&
                    Math.abs(textRegion.height - dimRegion.height) < 2) {
                  usedTextIndices.add(idx);
                // Add to dimension-specific text detections
                dimensionTextDetections.push(text);
              }
              
              // Also mark text as used if it matches the dimension's text exactly
              // This prevents "120 ±0.2" text from being included in other dimensions
              const textContent = (text.text || text.content || '').trim();
              if (textContent === dimension.text || textContent === dimension.nominal_value) {
                usedTextIndices.add(idx);
                // Add to dimension-specific text detections if not already added
                if (!dimensionTextDetections.includes(text)) {
                  dimensionTextDetections.push(text);
            }
              }
            });
          }
          
          // ALWAYS merge if we have multiple boxes, regardless of needsMerging flag
          // This ensures GDT, text, and M/N modifiers are included
          let finalRegion = dimRegion;
          
          console.log('🔍 Merge check:', {
            needsMerging,
            bboxesToMergeCount: bboxesToMerge.length,
            isGDT: finalIsGDT,
            dimType: finalDimType,
            hasMultipleBoxes: bboxesToMerge.length > 1
          });
          
          // Merge if we have more than just the dimension bbox
          if (bboxesToMerge.length > 1) {
            console.log('🔄 Merging bboxes:', {
              count: bboxesToMerge.length,
              bboxes: bboxesToMerge.map((bbox, i) => {
                const reg = bboxToRegion(bbox, region.page);
                return {
                  index: i,
                  type: Array.isArray(bbox) ? 'array' : typeof bbox,
                  length: Array.isArray(bbox) ? bbox.length : 'N/A',
                  region: reg ? `${reg.x.toFixed(1)},${reg.y.toFixed(1)} ${reg.width.toFixed(1)}x${reg.height.toFixed(1)}` : 'invalid'
                };
              })
            });
            
            const mergedRegion = mergeBoundingBoxes(bboxesToMerge, region.page);
            if (mergedRegion && mergedRegion.width > 0 && mergedRegion.height > 0) {
              finalRegion = mergedRegion;
              console.log('✅ Successfully merged bboxes:', {
                count: bboxesToMerge.length,
                original: `${dimRegion.x.toFixed(1)},${dimRegion.y.toFixed(1)} ${dimRegion.width.toFixed(1)}x${dimRegion.height.toFixed(1)}`,
                merged: `${finalRegion.x.toFixed(1)},${finalRegion.y.toFixed(1)} ${finalRegion.width.toFixed(1)}x${finalRegion.height.toFixed(1)}`,
                sizeIncrease: {
                  width: (finalRegion.width - dimRegion.width).toFixed(1),
                  height: (finalRegion.height - dimRegion.height).toFixed(1)
                }
              });
            } else {
              console.warn('⚠️ Merge failed - invalid merged region:', mergedRegion);
              console.warn('⚠️ Using original dimension region instead');
              finalRegion = dimRegion;
            }
          } else {
            console.log('ℹ️ No merging needed - only 1 bbox:', {
              bboxesToMergeCount: bboxesToMerge.length
            });
          }
          
          // Use finalRegion as bbox - THIS IS THE KEY: use merged region
          const bbox = finalRegion;
          
          console.log('📦 Final bbox to save:', {
            x: bbox.x.toFixed(1),
            y: bbox.y.toFixed(1),
            width: bbox.width.toFixed(1),
            height: bbox.height.toFixed(1),
            page: bbox.page,
            isMerged: bbox !== dimRegion
          });
          
          // Extract GDT info for label
          let associatedGDT = null;
          let gdtName = '';
          let gdtSymbol = '';
          
          // Extract GDT info from dimension's gdt_data if available
          if (dimension.gdt_data) {
            const gdtDataItem = typeof dimension.gdt_data === 'object' && !Array.isArray(dimension.gdt_data)
              ? dimension.gdt_data
              : (Array.isArray(dimension.gdt_data) && dimension.gdt_data.length > 0 ? dimension.gdt_data[0] : null);
            
            if (gdtDataItem && gdtDataItem.class_name) {
              associatedGDT = gdtDataItem;
              const className = gdtDataItem.class_name;
              const symbolMatch = className.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/);
              if (symbolMatch) {
                gdtSymbol = symbolMatch[0];
              }
              const cleanedName = className.replace(/[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/g, '').trim();
              if (cleanedName) {
                const words = cleanedName.split(/\s+/).filter(w => w.length > 0);
                if (words.length > 0) {
                  gdtName = words.map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  ).join(' ');
                } else {
                  gdtName = className;
                }
              } else {
                gdtName = className;
              }
            }
          }
          
          // If not a GDT dimension and no gdt_data, check for separate GDT dimensions
          // IMPORTANT: Do NOT associate GD&T with Length dimensions (like "120 ±0.2")
          // Only associate GD&T with dimensions that are already marked as GDT or have tolerance values < 1
          if (!finalIsGDT && !dimension.gdt_data && gdtOnlyDimensions.length > 0 && nominalValue < 1) {
            // Only associate if the nominal value is a tolerance (< 1), not a dimension value
            associatedGDT = gdtOnlyDimensions[0]; // Take the first one
            
            // Extract GDT name and symbol from the GDT dimension's text field
            // The text field contains something like "⏥ flatness" or "⟂ perpendicularity"
            if (associatedGDT.text) {
              const text = associatedGDT.text.trim();
              // Extract symbol
              const symbolMatch = text.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/);
              if (symbolMatch) {
                gdtSymbol = symbolMatch[0];
              }
              // Remove common GDT symbols and extract the word
              const cleanedText = text.replace(/[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/g, '').trim();
              const words = cleanedText.split(/\s+/).filter(w => w.length > 0);
              if (words.length > 0) {
                // Capitalize first letter of each word
                gdtName = words.map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                ).join(' ');
              } else {
                gdtName = text;
              }
            }
            
            // Also check gdt_data for class_name
            if (!gdtName && associatedGDT.gdt_data) {
              let gdtDataItem = null;
              if (typeof associatedGDT.gdt_data === 'object' && !Array.isArray(associatedGDT.gdt_data)) {
                gdtDataItem = associatedGDT.gdt_data;
              } else if (Array.isArray(associatedGDT.gdt_data) && associatedGDT.gdt_data.length > 0) {
                gdtDataItem = associatedGDT.gdt_data[0];
              }
              
              if (gdtDataItem && gdtDataItem.class_name) {
                const className = gdtDataItem.class_name;
                const symbolMatch = className.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/);
                if (symbolMatch) {
                  gdtSymbol = symbolMatch[0];
                }
                const cleanedName = className.replace(/[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/g, '').trim();
                if (cleanedName) {
                  const words = cleanedName.split(/\s+/).filter(w => w.length > 0);
                  if (words.length > 0) {
                    gdtName = words.map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                  } else {
                    gdtName = className;
                  }
                } else {
                  gdtName = className;
                }
              }
            }
            
            // Check gdtDetections for class_name
            if (!gdtName && gdtDetections.length > 0) {
              const matchingGDT = gdtDetections.find(gdt => gdt.class_name);
              if (matchingGDT && matchingGDT.class_name) {
                const className = matchingGDT.class_name;
                const symbolMatch = className.match(/^[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/);
                if (symbolMatch) {
                  gdtSymbol = symbolMatch[0];
                }
                const cleanedName = className.replace(/[⏥⟂⊥∥∠⌯⌖↗↖→←↑↓ⓂⓁⓅⓈⓉ∅⌀]/g, '').trim();
                if (cleanedName) {
                  const words = cleanedName.split(/\s+/).filter(w => w.length > 0);
                  if (words.length > 0) {
                    gdtName = words.map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    ).join(' ');
                  } else {
                    gdtName = className;
                  }
                } else {
                  gdtName = className;
                }
                // Use the detection as the source of truth for GDT data
                associatedGDT = { ...associatedGDT, ...matchingGDT };
              }
            }
            
            gdtOnlyDimensions.shift(); // Remove it so it's not processed separately
          }
          
          // Note: Bbox merging is already handled above by mergeBoundingBoxes() function
          // The bbox variable now contains the merged result
          
          console.log('Processing dimension (will create separate bbox):', {
            dimension: dimension,
            isGDT: finalIsGDT,
            nominal_value: dimension.nominal_value,
            associatedGDT,
            gdtName,
            gdtSymbol,
            bbox
          });
          
          // Build label with GDT symbol if available
          // For GDT dimensions, show the GDT symbol and name prominently
          let label = '';
          
          // 🔥 SPECIAL HANDLING FOR MATERIAL TYPES - Use backend text directly
          if (dimension.dimension_type === 'Material') {
            label = dimension.text || 'Material';
            console.log('🔥 Material dimension detected - using backend label:', label);
          } else if (finalIsGDT && gdtName) {
            label = gdtSymbol ? `GDT: ${gdtSymbol} ${gdtName} - ${dimension.nominal_value}` : `GDT: ${gdtName} - ${dimension.nominal_value}`;
          } else {
            const baseLabel = dimension.nominal_value ? `${dimension.dimension_type || 'Length'}: ${dimension.nominal_value}` : 'Dimension';
            label = gdtName ? (gdtSymbol ? `${baseLabel} (GDT: ${gdtSymbol} ${gdtName})` : `${baseLabel} (GDT: ${gdtName})`) : baseLabel;
          }
          
          // // 🔥 SKIP MATERIAL TYPES - Backend already handles them
          // if (dimension.dimension_type === 'Material') {
          //   console.log('🔥 Skipping Material bbox creation - backend handles it');
          //   continue; // Skip to next dimension
          // }
          
          // Collect bbox info for batch creation - don't create yet
          bboxesToCreate.push({
            bbox,
            label,
            dimension,
            associatedGDT,
            gdtName,
            gdtSymbol,
            dimensionTextDetections,
            finalIsGDT
          });
        }
        
        // BATCH CREATE: Create all bounding boxes at once
        console.log(`🚀 Batch creating ${bboxesToCreate.length} bounding boxes...`);
        const savePromises = bboxesToCreate.map(item => 
          saveBoundingBox(partId, documentId, item.bbox, item.label)
        );
        
        // Wait for all saves to complete
        const saveResults = await Promise.all(savePromises);
        
        // BATCH UPDATE: Update all bounding boxes with dimension data
        console.log(`🔄 Batch updating ${saveResults.length} bounding boxes with dimension data...`);
        const updatePromises = saveResults.map((saveResult, index) => {
          if (!saveResult.id) return Promise.resolve();
          
          const item = bboxesToCreate[index];
          const { dimension, associatedGDT, gdtName, dimensionTextDetections } = item;
          
          // Prepare dimension data - include GDT info in the dimension if available
          const dimensionData = { ...dimension };
          
          // If we have GDT, add it to the dimension data
          if (associatedGDT) {
            // Extract GDT data structure
            let gdtDataItem = null;
            
            if (associatedGDT.gdt_data) {
              gdtDataItem = typeof associatedGDT.gdt_data === 'object' && !Array.isArray(associatedGDT.gdt_data)
                ? associatedGDT.gdt_data
                : (Array.isArray(associatedGDT.gdt_data) ? associatedGDT.gdt_data[0] : null);
            } else if (associatedGDT.class_name || associatedGDT.text) {
              // Create GDT data structure from the GDT dimension or detection
              gdtDataItem = {
                class_name: gdtName || associatedGDT.class_name || associatedGDT.text,
                confidence: associatedGDT.confidence || 1.0,
                bbox: associatedGDT.bbox || associatedGDT.gdt_data?.bbox
              };
            }
            
            if (gdtDataItem) {
              dimensionData.gdt_data = gdtDataItem;
            }
          }
          
          // Prepare update data
          // Only include text detections that were actually used/merged for THIS dimension
          const updateData = {
            dimension_data: [dimensionData],
            text_data: dimensionTextDetections.length > 0 ? dimensionTextDetections : [],
            gdt_data: []
          };
          
          // Add GDT data to the gdt_data array
          if (associatedGDT) {
            if (associatedGDT.gdt_data) {
              const gdtItem = typeof associatedGDT.gdt_data === 'object' && !Array.isArray(associatedGDT.gdt_data)
                ? associatedGDT.gdt_data
                : (Array.isArray(associatedGDT.gdt_data) ? associatedGDT.gdt_data[0] : null);
              if (gdtItem) {
                updateData.gdt_data = [gdtItem];
              }
            } else if (gdtDetections.length > 0) {
              // Use the matching GDT detection
              const matchingGDT = gdtDetections.find(gdt => 
                gdt.class_name === gdtName || 
                (gdt.class_name && gdtName.toLowerCase().includes(gdt.class_name.toLowerCase()))
              ) || gdtDetections[0];
              if (matchingGDT) {
                updateData.gdt_data = [matchingGDT];
              }
            } else if (gdtName) {
              // Create GDT data structure if we have the name
              updateData.gdt_data = [{
                class_name: gdtName,
                confidence: 1.0
              }];
            }
          }
          
          return updateBoundingBox(partId, saveResult.id, updateData).catch(updateError => {
            console.warn('Failed to update bounding box with dimension data, but bbox was created:', updateError);
            // Return null to indicate partial success (bbox created but not updated)
            return null;
          });
        });
        
        // Wait for all updates to complete
        const updateResults = await Promise.all(updatePromises);
        
        // Count successes
        createdCount = updateResults.filter(r => r !== undefined).length;
        console.log(`✅ Successfully created and updated ${createdCount} bounding boxes`);
        
        // Process remaining standalone clustered GD&T (only if no dimension values were found)
        // Use clustered GD&T if available, otherwise fall back to original detections
        const remainingGDTToProcess = clusteredGDT.length > 0 
          ? clusteredGDT.filter((gdt, idx) => !usedGDTIndices.has(idx))
          : (gdtOnlyDimensions.length > 0 ? gdtOnlyDimensions : gdtDetections);
          
        if (dimensionsWithValues.length === 0 && remainingGDTToProcess.length > 0) {
          const remainingGDT = remainingGDTToProcess;
          
          // Collect GDT bboxes for batch creation
          const gdtBboxesToCreate = [];
          
          for (const gdtItem of remainingGDT) {
            let bbox = {
              x: region.x,
              y: region.y,
              width: region.width,
              height: region.height,
              page: region.page
            };
            
            // Use GDT item's bbox if available
            const gdtBbox = gdtItem.bbox || (gdtItem.gdt_data && gdtItem.gdt_data.bbox);
            if (gdtBbox && Array.isArray(gdtBbox) && gdtBbox.length >= 2) {
              const xCoords = gdtBbox.map(p => p[0] || p.x).filter(x => x !== undefined);
              const yCoords = gdtBbox.map(p => p[1] || p.y).filter(y => y !== undefined);
              if (xCoords.length > 0 && yCoords.length > 0) {
                bbox = {
                  x: Math.min(...xCoords),
                  y: Math.min(...yCoords),
                  width: Math.max(...xCoords) - Math.min(...xCoords),
                  height: Math.max(...yCoords) - Math.min(...yCoords),
                  page: region.page
                };
              }
            }
            
            // For clustered GD&T, use the combined text (e.g., "⏥ 0.025 M N")
            const gdtText = gdtItem.text || gdtItem.class_name || (gdtItem.gdt_data && gdtItem.gdt_data.class_name) || 'GDT Symbol';
            const label = `GDT: ${gdtText}`;
            
            gdtBboxesToCreate.push({ bbox, label, gdtItem });
          }
          
          // BATCH CREATE GDT bounding boxes
          if (gdtBboxesToCreate.length > 0) {
            console.log(`🚀 Batch creating ${gdtBboxesToCreate.length} GDT bounding boxes...`);
            const gdtSavePromises = gdtBboxesToCreate.map(item => 
              saveBoundingBox(partId, documentId, item.bbox, item.label)
            );
            
            const gdtSaveResults = await Promise.all(gdtSavePromises);
            
            // BATCH UPDATE GDT bounding boxes
            console.log(`🔄 Batch updating ${gdtSaveResults.length} GDT bounding boxes...`);
            const gdtUpdatePromises = gdtSaveResults.map((saveResult, index) => {
              if (!saveResult.id) return Promise.resolve();
              
              const item = gdtBboxesToCreate[index];
              const gdtDataItem = item.gdtItem.gdt_data || {
                class_name: item.gdtItem.class_name,
                confidence: item.gdtItem.confidence,
                bbox: item.gdtItem.bbox
              };
              
              return updateBoundingBox(partId, saveResult.id, {
                dimension_data: [{
                  dimension_type: 'GDT',
                  nominal_value: null,
                  upper_tolerance: null,
                  lower_tolerance: null,
                  gdt_data: gdtDataItem
                }],
                text_data: [],
                gdt_data: [gdtDataItem]
              }).catch(error => {
                console.warn('Failed to update GDT bbox:', error);
                return null;
              });
            });
            
            const gdtUpdateResults = await Promise.all(gdtUpdatePromises);
            const gdtCreatedCount = gdtUpdateResults.filter(r => r !== undefined).length;
            createdCount += gdtCreatedCount;
            console.log(`✅ Successfully created and updated ${gdtCreatedCount} GDT bounding boxes`);
          }
        }
        
        // STEP 7: Process remaining unused text detections as materials/general text
        // This is now handled on the backend - no need for complex frontend logic
        const unusedTextDetections = textDetections.filter((text, idx) => !usedTextIndices.has(idx));
        console.log('🔍 Processing unused text detections (backend handles materials):', unusedTextDetections.length);
        
        if (unusedTextDetections.length > 0) {
          console.log('🔥 Backend now handles material combination - skipping frontend processing');
          // Backend now combines Material + EN* entries, so we don't need frontend logic
        }
        
        showStatus(`Created ${createdCount} dimension(s)`, 'success');
        
        // Reload bounding boxes to ensure UI is in sync
        try {
          await loadBoundingBoxes(partId);
        } catch (reloadError) {
          console.warn('Failed to reload bounding boxes:', reloadError);
          // Don't fail the whole operation if reload fails
        }
      } else {
        showStatus('No dimensions found in selected region', 'error');
      }
    } catch (err) {
      console.error('Error processing dimensions:', err);
      showStatus('Failed to process dimensions: ' + err.message, 'error');
    }
  };

  const handleCanvasReady = (info) => {
    if (info.error) {
      console.error('PDF loading error:', info.error);
      setError(info.error);
      showStatus('PDF loading error: ' + info.error, 'error');
      return;
    }
    
    // Set PDF dimensions - use actual PDF dimensions if available, otherwise use canvas display size
    if (info.pdfWidth && info.pdfHeight) {
      setPdfDimensions({ width: info.pdfWidth, height: info.pdfHeight });
    } else if (info.width && info.height) {
      setPdfDimensions({ width: info.width, height: info.height });
    }
    
    if (info.totalPages) {
      setTotalPages(info.totalPages);
      // Ensure currentPage is within valid range
      if (currentPage < 1 || currentPage > info.totalPages) {
        setCurrentPage(1);
      }
    }
    
    // Handle setPage callback from PDFViewer
    if (info.setPage) {
      setCurrentPage(info.setPage);
    }
  };

  const handleBalloonClick = (bboxId, rowNumber) => {
    setSelectedBboxId(bboxId);
    
    // Scroll to row in BOM table if needed
    const rowElement = document.querySelector(`[data-row-id="${rowNumber}"]`);
    if (rowElement) {
      rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleBalloonDelete = (bboxId, event) => {
    if (!partId) {
      showStatus('Part ID not available', 'error');
      return;
    }
    
    // Get position from click event to show popup near balloon
    const rect = event.target.getBoundingClientRect();
    setDeleteConfirmation({
      show: true,
      bboxId: bboxId,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      }
    });
  };

  const handleBalloonView = (bbox, page) => {
    if (!bbox) {
      showStatus('Bounding box information not available', 'error');
      return;
    }
    
    // Find the full balloon data from boundingBoxes array
    const balloonData = boundingBoxes.find(b => 
      b.id === bbox.id || 
      b.balloon_id === bbox.id ||
      (b.bounding_box && 
       b.bounding_box.x === bbox.x && 
       b.bounding_box.y === bbox.y)
    );
    
    // Set the region view modal data
    setRegionViewModal({
      isOpen: true,
      pdfId: documentId,
      boundingBox: {
        x: bbox.x || bbox.bounding_box?.x || 0,
        y: bbox.y || bbox.bounding_box?.y || 0,
        width: bbox.width || bbox.bounding_box?.width || 0,
        height: bbox.height || bbox.bounding_box?.height || 0
      },
      balloonData: balloonData || bbox, // Pass full balloon data
      page: page || currentPage // Keep as 1-indexed for backend
    });
  };

  const handleRegionViewEdit = (balloonDataFromView) => {
    if (!balloonDataFromView) return;
    const bboxId = balloonDataFromView.id ?? balloonDataFromView.balloon_id;
    const row = bomData.find((item) => item.balloonId === bboxId);
    if (!row) {
      showStatus('Could not find BOC row for this balloon', 'error');
      return;
    }
    setActiveTab('boc');
    setSelectedBboxId(row.balloonId);
    setIsEditMode(true);
    setEditingCell({ rowId: row.id, field: 'nominal' });
    setEditValue(row.nominal || '');
    setRegionViewModal((prev) => ({ ...prev, isOpen: false }));
    setTimeout(() => {
      const el = document.querySelector(`tr[data-row-id="${row.id}"]`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  };

  const confirmBalloonDelete = async () => {
    try {
      await deleteBoundingBox(partId, deleteConfirmation.bboxId);
      showStatus('Balloon deleted successfully', 'success');
      setSelectedBboxId(null);
      setDeleteConfirmation({ show: false, bboxId: null, position: { x: 0, y: 0 } });
    } catch (error) {
      console.error('Error deleting balloon:', error);
      showStatus('Failed to delete balloon: ' + error.message, 'error');
    }
  };

  const cancelBalloonDelete = () => {
    setDeleteConfirmation({ show: false, bboxId: null, position: { x: 0, y: 0 } });
  };

  const handleDeleteAllBalloons = async () => {
    if (!partId) {
      showStatus('Part ID not available', 'error');
      return;
    }
    
    // Confirm deletion
    const confirmed = window.confirm('Are you sure you want to delete all balloons? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      // Delete all balloons for the current page
      await deleteAllBoundingBoxes(partId, currentPage);
      showStatus('All balloons deleted!', 'success');
      setSelectedBboxId(null);
    } catch (error) {
      console.error('Error deleting balloons:', error);
      showStatus('Error deleting balloons: ' + error.message, 'error');
    }
  };

  const handleDeleteSelectedRow = async () => {
    if (!partId || !selectedBboxId) return;
    try {
      await deleteBoundingBox(partId, selectedBboxId);
      showStatus('Row deleted', 'success');
      setSelectedBboxId(null);
      await loadBoundingBoxes(partId, currentPage);
    } catch (error) {
      console.error('Error deleting row:', error);
      showStatus('Error deleting row: ' + error.message, 'error');
    }
  };

  // Delete selected table row when user presses Delete key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (!selectedBboxId) return;
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      e.preventDefault();
      handleDeleteSelectedRow();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedBboxId, partId, currentPage]);

  
  // Load notes
const loadNotes = async () => {
  if (!partId) return;
  
  try {
    setNotesLoading(true);
    const fetchedNotes = await noteService.getNotesByPart(partId);
    console.log('Loaded notes:', fetchedNotes);
    setNotes(fetchedNotes || []);
  } catch (error) {
    console.warn('Failed to load notes, continuing without notes:', error);
    setNotes([]); // Set empty array instead of showing error
    // Remove the status message to avoid confusing users
  } finally {
    setNotesLoading(false);
  }
};

  // Load notes when inspection plan page loads (when partId is available)
  useEffect(() => {
    if (!partId) return;
    loadNotes();
  }, [partId]);

  const handleConfirmInspectionStatus = async () => {
    if (!partId) return;
    setInspectionPlanConfirmLoading(true);
    try {
      const response = await fetch(`http://172.18.100.26:8987/api/v1/parts/${partId}/toggle-inspection-plan`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(response.statusText || 'Toggle failed');
      const part = await response.json();
      setInspectionPlanStatus(part.inspection_plan_status === true);
      showStatus(part.inspection_plan_status ? 'Inspection status confirmed (Complete)' : 'Inspection status unconfirmed (Incomplete)', 'success');
    } catch (err) {
      console.error('Toggle inspection plan status:', err);
      showStatus('Failed to update inspection status', 'error');
    } finally {
      setInspectionPlanConfirmLoading(false);
    }
  };

  // Handle note selection complete (when user draws bbox in notes mode)
  const handleNoteSelectionComplete = async (region) => {
    if (!partId || !documentId) {
      showStatus('Part ID or Document ID not available', 'error');
      return;
    }
    
    try {
      // Extract text from the selected region using text extraction API
      const textResult = await extractText(partId, documentId, region, rotation);
      console.log('Text extraction result:', textResult);
      
      // Extract text from detections array (extract-text returns "detections", not "text_detections")
      let extractedText = '';
      if (textResult?.detections && Array.isArray(textResult.detections)) {
        extractedText = textResult.detections
          .map(t => t.text || t.content || t.value || '')
          .filter(Boolean)
          .join('\n');
      } else if (textResult?.text_detections && Array.isArray(textResult.text_detections)) {
        // Fallback for process-dimensions format
        extractedText = textResult.text_detections
          .map(t => t.text || t.content || '')
          .filter(Boolean)
          .join('\n');
      } else if (textResult?.text) {
        extractedText = textResult.text;
      }
      
      console.log('Extracted text:', extractedText);
      
      // Parse extracted text into individual notes
      const individualNotes = parseNotesFromExtractedText(extractedText);
      console.log('Parsed individual notes:', individualNotes);
      
      // Create separate note entries for each parsed note
      for (const noteText of individualNotes) {
        if (noteText.trim()) {
          const newNote = await noteService.createNote(partId, documentId, region, noteText.trim());
          console.log('Created note:', newNote);
        }
      }
      
      showStatus('Note created successfully!', 'success');
      
      // Reload notes
      await loadNotes();
    } catch (error) {
      console.error('Error creating note:', error);
      showStatus('Failed to create note: ' + error.message, 'error');
    }
  };

  const handleSaveStamp = async () => {
    if (!partId || !stampRegion) {
      showStatus('Invalid region selected', 'error');
      return;
    }

    // Check if documentId is available
    if (!documentId) {
      showStatus('Document ID is required. Please ensure the part has an associated document.', 'error');
      return;
    }

    try {
      // Generate label from nominal value or use default
      const generatedLabel = stampNominal.trim() 
        ? `${stampDimType.trim() || 'Length'}: ${stampNominal.trim()}`
        : `Manual Entry ${boundingBoxes.length + 1}`;

      // Create bounding box
      const result = await saveBoundingBox(partId, documentId, stampRegion, generatedLabel);

      const boxId = result?.id;
      
      // If dimension data is provided, update the bounding box
      if (stampNominal.trim() || stampDimType.trim() || stampUpperTol.trim() || stampLowerTol.trim()) {
        const dimensionData = {
          nominal_value: stampNominal.trim() || '',
          upper_tolerance: stampUpperTol.trim() || '0',
          lower_tolerance: stampLowerTol.trim() || '0',
          dimension_type: stampDimType.trim() || 'Length'
        };

        if (boxId) {
          await updateBoundingBox(partId, boxId, {
            dimension_data: [dimensionData],
            text_data: [],
            gdt_data: []
          });
        }
      }

      showStatus('Bounding box created successfully!', 'success');
      setShowStampModal(false);
      setStampRegion(null);
      setStampNominal('');
      setStampUpperTol('');
      setStampLowerTol('');
      setStampDimType('Length');
      
      // Reload bounding boxes
      await loadBoundingBoxes(partId);
    } catch (error) {
      console.error('Error creating bounding box:', error);
      showStatus('Error creating bounding box: ' + error.message, 'error');
    }
  };

  const handleCancelStamp = () => {
    setShowStampModal(false);
    setStampRegion(null);
    setStampNominal('');
    setStampUpperTol('');
    setStampLowerTol('');
    setStampDimType('Length');
  };

  return (
    <div className="inspection-plan-container">
      {/* Header with Tools */}
      <div className="inspection-plan-header">
        <div className="header-left">
          <button onClick={handleBack} className="back-button">
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <div className="header-title">
            <FileText size={20} />
            <span>Quality Management System - {partData.name || 'Direct Part'}</span>
          </div>
          
         {/* Mode Buttons */}
<div className="mode-buttons">
  <button
    className={`mode-button ${viewMode === 'plan' ? 'active' : ''}`}
    onClick={() => setViewMode('plan')}
    title="Plan Mode - View inspection plan"
  >
    <FileText size={16} />
    <span>Plan</span>
  </button>
  <button
    className={`mode-button ${viewMode === 'measure' ? 'active' : ''}`}
    onClick={() => setViewMode('measure')}
    title="Measure Mode - Record measurements"
  >
    <Settings size={16} />
    <span>Measure</span>
  </button>  
  <button
  className="mode-button"
  onClick={() => setShowReportModal(true)}
  title="Generate Report"
  style={{
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: '1px solid #10b981'
  }}
  onMouseOver={(e) => {
    e.target.style.backgroundColor = '#059669';
    e.target.style.borderColor = '#059669';
  }}
  onMouseOut={(e) => {
    e.target.style.backgroundColor = '#10b981';
    e.target.style.borderColor = '#10b981';
  }}
>
    <ReportIcon size={16} />
    <span>Report</span>
  </button>
</div>
        </div>
        
        <div className="header-tools">
          <div className="tool-group">
            <span className="zoom-indicator">{Math.round(scale * 100)}%</span>
          </div>
          
          {/* Inspection Status - moved next to zoom indicator */}
          {viewMode === 'plan' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 1rem',
                background: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                marginLeft: '1rem'
              }}
            >
              <span style={{ fontSize: '0.875rem', color: '#475569', fontWeight: 500 }}>
                Inspection status:{' '}
                {inspectionPlanStatusLoading ? (
                  <span style={{ color: '#64748b' }}>Loading...</span>
                ) : (
                  <span style={{
                    marginLeft: '0.35rem',
                    color: inspectionPlanStatus ? '#10b981' : '#ef4444',
                    fontWeight: 600,
                  }}>
                    {inspectionPlanStatus ? 'Complete' : 'Incomplete'}
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={handleConfirmInspectionStatus}
                disabled={inspectionPlanConfirmLoading || inspectionPlanStatusLoading}
                style={{
                  padding: '0.4rem 1rem',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#ffffff',
                  background: inspectionPlanStatus ? '#64748b' : '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: inspectionPlanConfirmLoading || inspectionPlanStatusLoading ? 'not-allowed' : 'pointer',
                  opacity: inspectionPlanConfirmLoading || inspectionPlanStatusLoading ? 0.7 : 1,
                }}
              >
                {inspectionPlanConfirmLoading ? 'Updating...' : inspectionPlanStatus ? 'Unconfirm inspection status' : 'Confirm inspection status'}
              </button>
            </div>
          )}
          
          <div className="tool-group">
            <button 
              className={`tool-button ${showSettings ? 'active' : ''}`} 
              title="Settings"
              onClick={() => setShowSettings(!showSettings)}
              data-settings-button
            >
              <Settings size={18} />
            </button>
            <button 
              className="tool-button" 
              title="Download ballooned drawing"
              onClick={async () => {
                if (!documentId) {
                  showStatus('No document available to download', 'error');
                  return;
                }
                try {
                  showStatus('Downloading ballooned drawing...', 'info');
                  await downloadBalloonedPDF(documentId);
                  showStatus('Ballooned drawing downloaded', 'success');
                } catch (err) {
                  showStatus(err.message || 'Download failed', 'error');
                }
              }}
            >
              <Download size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Dropdown */}
      {showSettings && (
        <div 
          data-settings-panel
          style={{
            position: 'fixed',
            top: '60px',
            right: '20px',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '1rem',
            zIndex: 1000,
            minWidth: '250px',
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#111827' }}>
              Settings
            </h4>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5rem',
                color: '#6b7280',
                padding: 0,
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.5rem',
              borderRadius: '6px',
              backgroundColor: isEditMode ? '#eff6ff' : 'transparent'
            }}>
              <label 
                htmlFor="edit-mode-toggle"
                style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: 500,
                  color: '#374151',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                Edit Mode
              </label>
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <input
                  id="edit-mode-toggle"
                  type="checkbox"
                  checked={isEditMode}
                  onChange={(e) => {
                    setIsEditMode(e.target.checked);
                    if (!e.target.checked) {
                      setEditingCell(null);
                      setEditValue('');
                    }
                  }}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: 0,
                    height: 0
                  }}
                />
                <label
                  htmlFor="edit-mode-toggle"
                  style={{
                    display: 'block',
                    width: '44px',
                    height: '24px',
                    backgroundColor: isEditMode ? '#3b82f6' : '#d1d5db',
                    borderRadius: '12px',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: isEditMode ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#ffffff',
                      borderRadius: '50%',
                      transition: 'left 0.2s',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                    }}
                  />
                </label>
              </div>
            </div>
            
            {isEditMode && (
              <div style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                padding: '0.5rem',
                backgroundColor: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                💡 Double-click on any cell to edit. Press <strong>Enter</strong> to save or <strong>Esc</strong> to cancel.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="inspection-plan-content">
        {/* Tools Sidebar */}
        <div className="tools-sidebar">
          {/* Tools Section Label */}
          <div className="sidebar-section-label">TOOLS</div>
          
          {/* Selection Tools (plan mode only) */}
          {viewMode !== 'measure' && (
            <div className="sidebar-tool-group">
              <button 
                className={`sidebar-tool-button ${isSelectionMode ? 'active' : ''}`} 
                onClick={handleSelectionModeToggle}
                title="Selection Mode - Draw to select region"
                disabled={isPanMode || isStampMode}
              >
                <MousePointer2 size={20} />
              </button>
              <span className="sidebar-tool-label">Select</span>
            </div>
          )}
          
          <div className="sidebar-tool-group">
            <button 
              className={`sidebar-tool-button ${isPanMode ? 'active' : ''}`} 
              onClick={handlePanModeToggle}
              title="Pan Mode - Drag to move"
              disabled={isSelectionMode || isStampMode}
            >
              <Hand size={20} />
            </button>
            <span className="sidebar-tool-label">Pan</span>
          </div>
          
          {viewMode !== 'measure' && (
            <div className="sidebar-tool-group">
              <button 
                className={`sidebar-tool-button ${isStampMode ? 'active' : ''}`} 
                onClick={handleStampModeToggle}
                title="Stamp Mode - Manual entry"
                disabled={isPanMode || isSelectionMode || isNotesMode}
              >
                <Stamp size={20} />
              </button>
              <span className="sidebar-tool-label">Stamp</span>
            </div>
          )}
          
          {viewMode !== 'measure' && (
            <div className="sidebar-tool-group">
              <button 
                className={`sidebar-tool-button ${isNotesMode ? 'active' : ''}`} 
                onClick={handleNotesModeToggle}
                title="Notes Mode - Add notes"
                disabled={isPanMode || isSelectionMode || isStampMode}
              >
                <StickyNote size={20} />
              </button>
              <span className="sidebar-tool-label">Notes</span>
            </div>
          )}
          
          {/* Measure mode only: Measure entry & Connect */}
          {viewMode === 'measure' && (
            <>
              <div className="sidebar-tool-group">
                <button 
                  className={`sidebar-tool-button ${isMeasureEntryMode ? 'active' : ''}`} 
                  onClick={handleMeasureEntryToggle}
                  title="Measure - Enter M1/M2/M3; Enter moves to next cell/row"
                >
                  <Ruler size={20} />
                </button>
                <span className="sidebar-tool-label">Measure</span>
              </div>
              <div className="sidebar-tool-group">
                <button 
                  className="sidebar-tool-button" 
                  onClick={handleConnectToggle}
                  title="Connect Bluetooth instruments"
                >
                  <Bluetooth size={20} />
                </button>
                <span className="sidebar-tool-label">Connect</span>
              </div>
            </>
          )}
          
          <div className="sidebar-divider"></div>
          
          {/* View Controls */}
          <div className="sidebar-section-label">VIEW</div>
          
          <div className="sidebar-tool-group">
            <button 
              className="sidebar-tool-button" 
              onClick={handleZoomIn}
              title="Zoom In"
            >
              <ZoomIn size={20} />
            </button>
            <span className="sidebar-tool-label">Zoom In</span>
          </div>
          
          <div className="sidebar-tool-group">
            <button 
              className="sidebar-tool-button" 
              onClick={handleZoomOut}
              title="Zoom Out"
            >
              <ZoomOut size={20} />
            </button>
            <span className="sidebar-tool-label">Zoom Out</span>
          </div>
          
          <div className="sidebar-tool-group">
            <button 
              className="sidebar-tool-button" 
              onClick={handleRotate}
              title="Rotate 90°"
            >
              <RotateCw size={20} />
            </button>
            <span className="sidebar-tool-label">Rotate</span>
          </div>
          
          <div className="sidebar-tool-group">
            <button 
              className="sidebar-tool-button" 
              onClick={handleReset}
              title="Reset View"
            >
              <Maximize2 size={20} />
            </button>
            <span className="sidebar-tool-label">Reset</span>
          </div>
          
          <div className="sidebar-divider"></div>
          
          {/* Actions */}
          <div className="sidebar-section-label">ACTIONS</div>
          
          <div className="sidebar-tool-group">
            <AutoBalloonButton
              onAutoBalloon={handleAutoBalloon}
              isProcessing={isAutoBalloonProcessing}
              progress={autoBalloonProgress}
              totalPages={totalPages}
              currentPage={autoBalloonProgress}
              status={autoBalloonStatus}
              results={autoBalloonResults}
            />
            <span className="sidebar-tool-label">Auto Balloon</span>
          </div>
          
          <div className="sidebar-tool-group">
            <button 
              className="sidebar-tool-button sidebar-tool-danger" 
              onClick={handleDeleteAllBalloons}
              title="Delete All Balloons"
            >
              <Trash2 size={20} />
            </button>
            <span className="sidebar-tool-label">Clear All</span>
          </div>
        </div>
        
        {/* PDF Viewer Section */}
        <div className="pdf-viewer-section">
          <div className="pdf-viewer-container" ref={pdfContainerRef}>
            {autoBalloonStatus === 'processing' && (
              <div className="auto-balloon-overlay">
                <div className="auto-balloon-overlay-content">
                  <div className="auto-balloon-overlay-spinner" />
                  <span className="auto-balloon-overlay-text">
                    Auto-ballooning in progress...
                  </span>
                </div>
              </div>
            )}
            {loading && !pdfData ? (
              <div className="pdf-placeholder">
                <FileText size={64} />
                <p>Loading PDF...</p>
              </div>
            ) : error || (bboxError && !pdfData) ? (
              <div className="pdf-placeholder">
                <FileText size={64} />
                <p>Error loading PDF</p>
                <p className="placeholder-subtitle">{error || bboxError}</p>
              </div>
            ) : pdfData ? (
              <PDFViewer
                pdfData={pdfData}
                pdfDimensions={pdfDimensions}
                currentPage={currentPage}
                scale={scale}
                boundingBoxes={boundingBoxes}
                onSelectionComplete={handleSelectionComplete}
                onCanvasReady={handleCanvasReady}
                onZoomChange={setScale}
                isPanMode={isPanMode}
                isSelectionMode={isSelectionMode}
                isStampMode={isStampMode}
                isNotesMode={isNotesMode}
                rotation={rotation}
                selectedBboxId={selectedBboxId}
                onBalloonClick={handleBalloonClick}
                onBalloonDelete={handleBalloonDelete}
                onBalloonView={handleBalloonView}
                notes={notes}
              />
            ) : (
              <div className="pdf-placeholder">
                <FileText size={64} />
                <p>No PDF document available</p>
                <p className="placeholder-subtitle">Upload a PDF to view it here</p>
              </div>
            )}
          </div>
          {statusMessage && (
            <div className={`status-message ${statusMessage.type}`}>
              {statusMessage.text}
            </div>
          )}
          {/* Region View - restricted to PDF section only */}
          <div className="region-view-in-pdf-section">
            <RegionViewModal
              isOpen={regionViewModal.isOpen}
              onClose={() => setRegionViewModal(prev => ({ ...prev, isOpen: false }))}
              pdfId={regionViewModal.pdfId}
              boundingBox={regionViewModal.boundingBox}
              balloonData={regionViewModal.balloonData}
              page={regionViewModal.page}
              title="Region View"
              variant="inline"
              onEdit={handleRegionViewEdit}
            />
          </div>
        </div>

        {/* BOM/Notes Tabbed Section */}
        <div className="bom-section">
          {/* Tab Navigation */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'boc' ? 'active' : ''}`}
              onClick={() => setActiveTab('boc')}
            >
              BOC
            </button>
            <button
              className={`tab-button ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              Notes
            </button>
          </div>
          
          {/* BOC Tab Content */}
          {activeTab === 'boc' && (
            <>
              <div className="bom-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                {/* <h3 style={{ margin: 0 }}>Bill of Characteristics (BOC)</h3> */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Part (quantity) selector - only in Measure mode, on the right */}
                  {viewMode === 'measure' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label htmlFor="quantity-select-boc" style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151', whiteSpace: 'nowrap' }}>
                        Quantity :
                      </label>
                      <select
                        id="quantity-select-boc"
                        value={selectedQuantity}
                        onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                        style={{
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.875rem',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          background: '#ffffff',
                          color: '#111827',
                          cursor: 'pointer',
                          minWidth: '100px',
                        }}
                        title="Select which part (quantity) to view and record measurements for. Options match quantity in database."
                      >
                        {Array.from({ length: bocQuantityFromDb }, (_, i) => i + 1).map((q) => (
                          <option key={q} value={q}>
                            Part {q}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
            {hasUnsavedChanges && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  color: '#f59e0b',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    background: '#f59e0b', 
                    borderRadius: '50%',
                    animation: 'pulse 2s infinite'
                  }}></span>
                  {changedRows.size} unsaved change{changedRows.size !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={handleDiscardChanges}
                  disabled={isSaving}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#ffffff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: '#6b7280',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = '#f3f4f6';
                    e.target.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = '#ffffff';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                >
                  Discard
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  style={{
                    padding: '0.5rem 1.5rem',
                    background: isSaving ? '#9ca3af' : '#3b82f6',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    if (!isSaving) {
                      e.target.style.background = '#2563eb';
                      e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isSaving) {
                      e.target.style.background = '#3b82f6';
                      e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.3)';
                    }
                  }}
                >
                  {isSaving ? (
                    <>
                      <span style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid #ffffff',
                        borderTopColor: 'transparent',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite'
                      }}></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
                </div>
              </div>
          <div className="bom-table-container">
            <table className="bom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nominal</th>
                  {viewMode === 'measure' && <th>Actual</th>}
                  <th>UTol</th>
                  <th>LTol</th>
                  <th>Dim Type</th>
                  <th>Zone</th>
                  {viewMode === 'measure' && (
                    <>
                      <th>M1</th>
                      <th>M2</th>
                      <th>M3</th>
                    </>
                  )}
                  <th>Instrument</th>
                </tr>
              </thead>
              <tbody>
                {bomData.length > 0 ? (
                  bomData.map((item, rowIndex) => {
                    const measureFields = ['m1', 'm2', 'm3'];
                    const renderCell = (field, value) => {
                      const canEditCell = isEditMode || (viewMode === 'measure' && isMeasureEntryMode && measureFields.includes(field));
                      const isEditing = editingCell?.rowId === item.id && editingCell?.field === field;
                      const hasChanged = changedRows.has(item.id);
                      
                      if (isEditing) {
                        const isMeasureField = measureFields.includes(field);
                        const enterMovesNext = viewMode === 'measure' && isMeasureEntryMode && isMeasureField;
                        return (
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={handleCellEditSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                if (enterMovesNext) {
                                  e.preventDefault();
                                  handleMeasureEnterAndNext(rowIndex, field);
                                } else {
                                  handleCellEditSave();
                                }
                              } else if (e.key === 'Escape') {
                                handleCellEditCancel();
                              } else if (e.key === 'Tab') {
                                handleCellEditSave();
                                handleCellKeyDown(e, item.id, field, rowIndex);
                              }
                            }}
                            autoFocus
                            style={{
                              width: '100%',
                              padding: '4px 8px',
                              border: '2px solid #3b82f6',
                              borderRadius: '4px',
                              outline: 'none',
                              fontSize: '0.875rem',
                              background: '#ffffff'
                            }}
                          />
                        );
                      }
                      
                      return (
                        <span
                          onDoubleClick={() => handleCellDoubleClick(item.id, field, value)}
                          style={{ 
                            cursor: canEditCell ? 'text' : 'default',
                            display: 'block',
                            padding: '4px 8px',
                            background: hasChanged ? '#fef3c7' : 'transparent',
                            borderRadius: '4px',
                            transition: 'background 0.2s'
                          }}
                          title={canEditCell ? 'Double-click to edit' : ''}
                        >
                          {value || '-'}
                        </span>
                      );
                    };
                    
                    // Row highlight: backend GO/NO_GO (saved) or local tolerance (unsaved). CSS on td so it shows.
                    const goNoGo = item.goOrNoGo ? String(item.goOrNoGo).toUpperCase() : null;
                    const useBackendStatus = viewMode === 'measure' && (goNoGo === 'GO' || goNoGo === 'NO_GO') && !changedRows.has(item.id);
                    const tolStatus = viewMode === 'measure' && !useBackendStatus ? getRowToleranceStatus(item) : null;
                    const rowHighlightClass = (useBackendStatus && goNoGo === 'GO') || tolStatus === 'in' ? 'row-highlight-go'
                      : (useBackendStatus && goNoGo === 'NO_GO') || tolStatus === 'out' ? 'row-highlight-no-go'
                      : '';
                    return (
                      <tr 
                        key={item.id} 
                        data-row-id={item.id}
                        className={[selectedBboxId === item.balloonId ? 'selected-row' : '', rowHighlightClass].filter(Boolean).join(' ')}
                        onClick={() => setSelectedBboxId(item.balloonId)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>{item.id}</td>
                        <td>{renderCell('nominal', item.nominal)}</td>
                        {viewMode === 'measure' && <td>{renderCell('actual', item.actual)}</td>}
                        <td>{renderCell('utol', item.utol)}</td>
                        <td>{renderCell('ltol', item.ltol)}</td>
                        <td>{renderCell('dimensionType', item.dimensionType)}</td>
                        <td>{renderCell('zone', item.zone)}</td>
                        {viewMode === 'measure' && (
                          <>
                            <td>{renderCell('m1', item.m1)}</td>
                            <td>{renderCell('m2', item.m2)}</td>
                            <td>{renderCell('m3', item.m3)}</td>
                          </>
                        )}
                        <td>{renderCell('instrumentUsed', item.instrumentUsed)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={viewMode === 'plan' ? '6' : '10'} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                      {isSelectionMode ? 'Drag on PDF to select area and process dimensions' : 
                       isStampMode ? 'Drag on PDF to select area for manual entry' : 
                       'No inspection data available'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
            </>
          )}
          
          {/* Notes Tab Content */}
          {activeTab === 'notes' && (
            <div className="notes-tab-content">
              <NotesTable 
                notes={notes}
                notesLoading={notesLoading}
                selectedNoteId={selectedNoteId}
                onNoteSelect={setSelectedNoteId}
                onDeleteNote={async (noteId) => {
                  try {
                    await noteService.deleteNote(noteId);
                    showStatus('Note deleted successfully!', 'success');
                    await loadNotes();
                    if (selectedNoteId === noteId) {
                      setSelectedNoteId(null);
                    }
                  } catch (error) {
                    console.error('Error deleting note:', error);
                    showStatus('Failed to delete note: ' + error.message, 'error');
                  }
                }}
                onUpdateNote={async (noteId, noteText) => {
                  try {
                    await noteService.updateNote(noteId, { note_text: noteText });
                    showStatus('Note updated successfully!', 'success');
                    await loadNotes();
                  } catch (error) {
                    console.error('Error updating note:', error);
                    showStatus('Failed to update note: ' + error.message, 'error');
                  }
                }}
                onDeleteAllNotes={async () => {
                  if (!partId) return;
                  try {
                    await noteService.deleteAllNotesForPart(partId);
                    showStatus('All notes deleted successfully!', 'success');
                    setSelectedNoteId(null);
                    await loadNotes();
                  } catch (error) {
                    console.error('Error deleting all notes:', error);
                    showStatus('Failed to delete all notes: ' + error.message, 'error');
                  }
                }}
                onAddNote={async (noteText) => {
                  if (!partId || !documentId) {
                    showStatus('Part or document not available.', 'error');
                    return;
                  }
                  try {
                    const page = currentPage ?? 1;
                    const bbox = { x: 0, y: 0, width: 1, height: 1, page };
                    await noteService.createNote(partId, documentId, bbox, noteText);
                    showStatus('Note added successfully!', 'success');
                    await loadNotes();
                  } catch (error) {
                    console.error('Error adding note:', error);
                    showStatus('Failed to add note: ' + error.message, 'error');
                    throw error;
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Stamp Input Modal */}
      {showStampModal && (
        <div 
          className="modal-overlay" 
          onClick={(e) => e.target === e.currentTarget && handleCancelStamp()}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal-dialog" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '0',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="modal-header" style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                Manual Entry - Create Bounding Box
              </h3>
              <button 
                onClick={handleCancelStamp}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem', 
                  fontWeight: 500, 
                  color: '#374151' 
                }}>
                  Nominal Value
                </label>
                <input
                  type="text"
                  value={stampNominal}
                  onChange={(e) => setStampNominal(e.target.value)}
                  placeholder="e.g., 60, 0.003"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem', 
                  fontWeight: 500, 
                  color: '#374151' 
                }}>
                  Upper Tolerance
                </label>
                <input
                  type="text"
                  value={stampUpperTol}
                  onChange={(e) => setStampUpperTol(e.target.value)}
                  placeholder="e.g., +0.05, +0.008"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem', 
                  fontWeight: 500, 
                  color: '#374151' 
                }}>
                  Lower Tolerance
                </label>
                <input
                  type="text"
                  value={stampLowerTol}
                  onChange={(e) => setStampLowerTol(e.target.value)}
                  placeholder="e.g., -0.05, -0.004"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.875rem', 
                  fontWeight: 500, 
                  color: '#374151' 
                }}>
                  Type
                </label>
                <select
                  value={stampDimType}
                  onChange={(e) => setStampDimType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  {dimensionTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div className="modal-footer" style={{ 
                display: 'flex', 
                gap: '0.75rem', 
                justifyContent: 'flex-end' 
              }}>
                <button 
                  onClick={handleCancelStamp}
                  style={{
                    padding: '0.5rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#f9fafb';
                    e.target.style.borderColor = '#9ca3af';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#ffffff';
                    e.target.style.borderColor = '#d1d5db';
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveStamp}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#2563eb';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#3b82f6';
                  }}
                >
                  Save
                </button>


              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connect Bluetooth instruments modal */}
      {showConnectModal && (
        <div 
          className="modal-overlay" 
          onClick={(e) => e.target === e.currentTarget && setShowConnectModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div 
            className="modal-content"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bluetooth size={22} />
                Connect Bluetooth instruments
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0 0.25rem',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Bluetooth device connection will be available here. You can pair calipers, gauges, or other measurement instruments to auto-fill M1/M2/M3 and Instrument.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowConnectModal(false)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Report
        partData={partData}
        partId={partId}
        bomData={bomData}
        logo={logo}
        setLogo={setLogo}
        customFields={customFields}
        notes={notes}
        showReportModal={showReportModal}
        setShowReportModal={setShowReportModal}
        showCustomFieldsModal={showCustomFieldsModal}
        setShowCustomFieldsModal={setShowCustomFieldsModal}
        showLogoModal={showLogoModal}
        setShowLogoModal={setShowLogoModal}
        showStatus={showStatus}
      />
{/* Custom Fields Modal */}
{showCustomFieldsModal && (
  <div 
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001
    }}
    onClick={(e) => {
      if (e.target === e.currentTarget) {
        setShowCustomFieldsModal(false);
      }
    }}
  >
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        width: '500px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', color: '#111827' }}>
          Custom Fields
        </h3>
        <button
          onClick={() => setShowCustomFieldsModal(false)}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '0.25rem'
          }}
        >
          ×
        </button>
      </div>
      
      {/* Add new field form */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '500', color: '#374151' }}>
          Add New Field
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Field Name (e.g., Project No)"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
          <input
            type="text"
            placeholder="Field Value"
            value={newFieldValue}
            onChange={(e) => setNewFieldValue(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '0.875rem',
              outline: 'none'
            }}
          />
          <button
            onClick={() => {
              if (newFieldName.trim()) {
                setCustomFields([...customFields, { 
                  id: Date.now(), 
                  name: newFieldName.trim(), 
                  value: newFieldValue.trim() 
                }]);
                setNewFieldName('');
                setNewFieldValue('');
                showStatus('Custom field added successfully!', 'success');
              }
            }}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#10b981',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#059669';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#10b981';
            }}
          >
            Add Field
          </button>
        </div>
      </div>
      
    {/* Existing fields */}
{customFields.length > 0 && (
  <div style={{ marginBottom: '1.5rem' }}>
    <h4 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: '500', color: '#374151' }}>
      Existing Fields
    </h4>
    <div style={{ 
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        backgroundColor: 'white'
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            <th style={{ 
              padding: '0.75rem',
              textAlign: 'left',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              borderBottom: '1px solid #e5e7eb',
              borderRight: '1px solid #e5e7eb'
            }}>
              Field Name
            </th>
            <th style={{ 
              padding: '0.75rem',
              textAlign: 'left',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              borderBottom: '1px solid #e5e7eb'
            }}>
              Field Value
            </th>
            <th style={{ 
              padding: '0.75rem',
              textAlign: 'center',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              borderBottom: '1px solid #e5e7eb',
              width: '80px'
            }}>
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {customFields.map((field, index) => (
            <tr key={field.id} style={{ 
              backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
            }}>
              <td style={{ 
                padding: '0.75rem',
                fontSize: '0.875rem',
                color: '#374151',
                borderBottom: '1px solid #e5e7eb',
                borderRight: '1px solid #e5e7eb',
                fontWeight: '500'
              }}>
                {field.name}
              </td>
              <td style={{ 
                padding: '0.75rem',
                fontSize: '0.875rem',
                color: '#111827',
                borderBottom: '1px solid #e5e7eb'
              }}>
                {field.value || 'Not set'}
              </td>
              <td style={{ 
                padding: '0.75rem',
                borderBottom: '1px solid #e5e7eb',
                textAlign: 'center'
              }}>
                <button
                  onClick={() => {
                    setCustomFields(customFields.filter(f => f.id !== field.id));
                    showStatus('Custom field removed', 'info');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#fef2f2';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                  title="Delete field"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)}
      
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button 
          onClick={() => setShowCustomFieldsModal(false)}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.target.style.backgroundColor = '#f9fafb';
            e.target.style.borderColor = '#9ca3af';
          }}
          onMouseOut={(e) => {
            e.target.style.backgroundColor = '#ffffff';
            e.target.style.borderColor = '#d1d5db';
          }}
        >
          Close
        </button>
      </div>
    </div>
  </div>
  )}

      {/* Balloon Delete Confirmation Popup */}
      {deleteConfirmation.show && (
        <div 
          style={{
            position: 'fixed',
            left: deleteConfirmation.position.x - 75, // Center the popup
            top: deleteConfirmation.position.y - 60,
            zIndex: 9999,
            backgroundColor: '#ffffff',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            minWidth: '200px',
            fontSize: '14px'
          }}
        >
          <div style={{ marginBottom: '8px', fontWeight: '600', color: '#111827' }}>
            Delete Balloon
          </div>
          <div style={{ marginBottom: '12px', color: '#6b7280' }}>
            Are you sure you want to delete this balloon and its associated data?
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={cancelBalloonDelete}
              style={{
                padding: '6px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                backgroundColor: '#ffffff',
                color: '#6b7280',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.borderColor = '#9ca3af';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ffffff';
                e.target.style.borderColor = '#d1d5db';
              }}
            >
              Cancel
            </button>
            <button
              onClick={confirmBalloonDelete}
              style={{
                padding: '6px 12px',
                border: '1px solid #ef4444',
                borderRadius: '4px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = '#dc2626';
                e.target.style.borderColor = '#dc2626';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = '#ef4444';
                e.target.style.borderColor = '#ef4444';
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default InspectionPlan;

