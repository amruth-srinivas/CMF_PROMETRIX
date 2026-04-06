import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Edit2, Trash2, Plus, Minus, ChevronRight, ChevronDown, Box as BoxIcon, Package, Menu, FileText, Download, Upload, Square, Folder, ClipboardCheck, Eye, X, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { NavContext } from '../App';
import useProjectStore from '../store/projectCreation';
import useAssemblyStore from '../store/assembly'; // Add this import
import StepViewer from '../components/StepViewer';
import PDFViewer from '../components/PDFViewer';
import usePartStore from '../store/part';

const theme = createTheme({
  typography: {
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    h6: { fontWeight: 600, fontSize: '1rem' },
    body2: { fontSize: '0.8125rem' },
  },
  palette: {
    mode: 'light',
    primary: { main: '#2F6FED' },
    secondary: { main: '#6B7280' },
    success: { main: '#2F6FED', light: 'rgba(47, 111, 237, 0.08)', dark: '#1E5DD4' },
    error: { main: '#DC2626' },
    background: { default: '#F5F6F8', paper: '#ffffff' },
    text: { primary: '#1F2937', secondary: '#6B7280', disabled: '#9CA3AF' },
    divider: '#D6D9DE',
    action: { hover: '#F0F4F8', selected: '#E8F0FF' },
  },
  shape: { borderRadius: 4 },
});

// Add this function to build tree structure from flat assembly list
const buildAssemblyTree = (assemblies, parentId = null) => {
  return assemblies
    .filter(assembly => assembly.parent_assembly_id === parentId)
    .map(assembly => ({
      // Ensure every assembly node in the tree has a consistent type
      ...assembly,
      type: assembly.type || 'assembly',
      parts: buildAssemblyTree(assemblies, assembly.id) // This should be assemblies, not parts
    }));
};
const Assembly = () => {
  const navigate = useNavigate();
  const { setActiveNav } = useContext(NavContext);
  
const { 
  selectedProject,
  setSelectedProject, // Add this line
  projectDetails,
  fetchProjectDetails,
  loading: projectLoading,
  error: projectError
} = useProjectStore();
  
const {
  createAssembly,
  updateAssembly,
  deleteAssembly,
  uploadDocument,
  upload3DDocumentOnly,
  fetchAllAssemblies,
  fetchDocuments,
  fetchDocumentsForNode,  // New: fetch documents for specific node
  fetchDocumentVersions,
  uploadDocumentVersion,
  loading: assemblyLoading,
  error: assemblyError
} = useAssemblyStore();
  
const {
  createPart,
  updatePart,
  deletePart,
  fetchParts,
  fetchAllParts,
  loading: partLoading,
  error: partError
} = usePartStore();

// Removed fetchAndAssociateParts - parts are now associated via projectDetails





const [documents, setDocuments] = useState([]);
const [nodeDocuments, setNodeDocuments] = useState([]);  // Documents for currently selected node
const [documentsLoading, setDocumentsLoading] = useState(false);

// const [sidebarOpen, setSidebarOpen] = useState(true);
const [expandedNodes, setExpandedNodes] = useState(new Set(['assemblies', 'direct-parts']));
const [selectedNode, setSelectedNode] = useState(null);
const [showModal, setShowModal] = useState(false);
const [previewDoc, setPreviewDoc] = useState(null); // { doc, type: '2D'|'3D' } for document preview modal
const [pdfScale, setPdfScale] = useState(1.0); // PDF zoom scale for inline preview
const [showNewVersionModal, setShowNewVersionModal] = useState(false);
const [newVersionDoc, setNewVersionDoc] = useState(null); // Current document for new version
const [newVersionFile, setNewVersionFile] = useState(null); // New file to upload
const [newVersionName, setNewVersionName] = useState(''); // Version name
const [newVersionNumber, setNewVersionNumber] = useState(''); // Version number
const [uploadingNewVersion, setUploadingNewVersion] = useState(false);
const [documentVersions, setDocumentVersions] = useState([]); // All versions for current doc in modal
const [documentVersionsLoading, setDocumentVersionsLoading] = useState(false);
const [previewPart, setPreviewPart] = useState(null); // Part details when previewing a document linked to a part (for inspection plan)
const [previewPartLoading, setPreviewPartLoading] = useState(false);
const [showUploadSuccessDialog, setShowUploadSuccessDialog] = useState(false);
const [messageDialog, setMessageDialog] = useState({ open: false, title: '', message: '', variant: 'info', onConfirm: null, onCancel: null });
const showMessageDialog = (config) => setMessageDialog({ open: true, ...config });
const closeMessageDialog = () => setMessageDialog(prev => ({ ...prev, open: false, onConfirm: null, onCancel: null }));
// Initialize with project details when available - MOVE THIS HERE
// Replace the current initialization (lines 41-46) with:
const [currentProject, setCurrentProject] = useState({
  id: null,
  name: '',  // Empty string instead of 'Loading...'
  assemblies: [],
  directParts: []
});

// Removed duplicate assembly fetch - assemblies are now fetched via projectDetails
// This ensures assemblies are loaded with their associated parts from part_locations

const refreshDocuments = async () => {
  setDocumentsLoading(true);
  try {
    // Refresh global documents list
    const docs = await fetchDocuments();
    console.log('📄 Documents refreshed, count:', docs?.length || 0);
    console.log('📄 Documents data:', docs);
    setDocuments(docs || []);

    // Also refresh documents for the currently selected node so
    // the latest version is used immediately in the sidebar/details.
    if (selectedNode && selectedNode.id) {
      const isPartOrDirectPart =
        selectedNode.isDirectPart || selectedNode.type === 'part';
      try {
        const nodeDocs = await fetchDocumentsForNode(
          selectedNode.id,
          isPartOrDirectPart
        );
        console.log(
          '📄 Node documents refreshed after upload:',
          nodeDocs
        );
        setNodeDocuments(Array.isArray(nodeDocs) ? nodeDocs : []);
      } catch (nodeErr) {
        console.error(
          'Failed to refresh documents for selected node:',
          nodeErr
        );
      }
    }
  } catch (error) {
    console.error('Failed to refresh documents:', error);
    setDocuments([]);
  } finally {
    setDocumentsLoading(false);
  }
};




const [modalData, setModalData] = useState({
  name: '', 
  no: '',
  rev: '',
  project_id: currentProject.id,  // This will work now
  parent_assembly_id: null,
  id: null,
  created_at: null,
  partNumber: '',
  quantity: 1,
  type: '', 
  parentId: null, 
  editId: null, 
  pdfFile: null, 
  stepFile: null, 
  isDirectPart: false,
  pdfDocType: '2D',
  stepDocType: '3D',
  pdf_content_type_2d: 'normal'  // 'normal' = text layer, 'scanned' = OCR for annotations
});

// Ctrl + mouse wheel zoom handler for PDF views
const handlePdfWheelZoom = (event) => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  const delta = event.deltaY || 0;
  setPdfScale((prev) => {
    const step = 0.1;
    const next = delta > 0 ? prev - step : prev + step;
    return Math.min(3, Math.max(0.25, next));
  });
};

// Currently selected node's primary 2D document (if any)
const current2DDoc = nodeDocuments?.find(d => d.doc_type === '2D');

const handleDeleteCurrent2DDoc = () => {
  if (!current2DDoc) return;

  showMessageDialog({
    title: 'Delete 2D document?',
    message:
      'This will permanently remove the 2D drawing for this part/assembly. You can always upload a new file later.',
    variant: 'warning',
    onConfirm: async () => {
      try {
        await fetch(`http://172.18.100.26:8986/api/v1/documents/${current2DDoc.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });
        await refreshDocuments();
        showMessageDialog({
          title: 'Document deleted',
          message: 'The 2D document was deleted successfully.',
          variant: 'success',
        });
      } catch (error) {
        console.error('Failed to delete document', error);
        showMessageDialog({
          title: 'Delete failed',
          message: 'Unable to delete the 2D document. Please try again.',
          variant: 'error',
        });
      }
    },
  });
};

// Update currentProject when projectDetails changes
useEffect(() => {
  if (projectDetails) {
    // Extract direct parts from the parts array (where assembly_id is null)
    const directPartsFromAPI = projectDetails.parts ? projectDetails.parts.filter(part => 
      part.assembly_id === null
    ).map(part => ({
      ...part,
      type: 'part',
      parts: [],
      isDirectPart: true,
      partNumber: part.part_no || ''
    })) : [];

    // Build the assembly tree from the assemblies data
    // Note: buildAssemblyTree uses 'parts' to store child assemblies
    const assemblyTree = buildAssemblyTree(projectDetails.assemblies || []);

    // Function to recursively add actual parts to assemblies in the tree
    // Note: In the tree, 'parts' contains child assemblies, so we need to add actual parts
    // alongside child assemblies
    const addPartsToAssemblyTree = (assemblies, allParts) => {
      return assemblies.map(assembly => {
        // Find parts that belong to this assembly (using assembly_id from part_locations)
        const assemblyParts = allParts.filter(part => 
          part.assembly_id === assembly.id
        ).map(part => ({
          ...part,
          type: 'part',
          parts: [],
          partNumber: part.part_no || ''
        }));

        // Recursively process child assemblies (which are stored in assembly.parts)
        const childAssemblies = addPartsToAssemblyTree(
          assembly.parts || [], 
          allParts
        );

        // Combine: child assemblies + actual parts
        // Note: The tree structure uses 'parts' for both child assemblies and actual parts
        return {
          // Preserve and normalize type so edit logic can reliably detect assemblies
          ...assembly,
          type: assembly.type || 'assembly',
          parts: [...childAssemblies, ...assemblyParts]
        };
      });
    };

    // Associate parts with assemblies in the tree
    const assemblyTreeWithParts = addPartsToAssemblyTree(
      assemblyTree, 
      projectDetails.parts || []
    );

    setCurrentProject(prev => ({
      ...prev,
      id: selectedProject?.id || prev.id,
      name: selectedProject?.name || prev.name,
      assemblies: assemblyTreeWithParts,
      directParts: directPartsFromAPI
    }));
  }
}, [projectDetails, selectedProject]);

useEffect(() => {
  const fetchProjectData = async () => {
    if (selectedProject && selectedProject.id) {
      try {
        await fetchProjectDetails(selectedProject.id);
      } catch (error) {
        console.error('Failed to fetch project details:', error);
      }
    }
  };
  
  fetchProjectData();
}, [selectedProject?.id, fetchProjectDetails]);

// Removed duplicate assembly fetch - assemblies are now fetched via projectDetails
// This prevents conflicts where assemblies are loaded without their associated parts

// Fetch documents when component mounts
useEffect(() => {
  const fetchDocs = async () => {
    setDocumentsLoading(true);
    try {
      const docs = await fetchDocuments();
      console.log('📄 Initial fetch - documents count:', docs?.length || 0);
      
      // Log each document's part_id and assembly_id for debugging
      if (docs && docs.length > 0) {
        docs.forEach((doc, index) => {
          console.log(`📄 Document ${index + 1}:`, {
            id: doc.id,
            title: doc.title,
            part_id: doc.part_id,
            assembly_id: doc.assembly_id,
            doc_type: doc.doc_type
          });
        });
      }
      
      setDocuments(docs || []);
    } catch (error) {
      console.error('❌ Failed to fetch documents:', error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };
  
  fetchDocs();
}, []);

// NEW: Fetch documents specifically for the selected node using API filters
useEffect(() => {
  const fetchNodeDocs = async () => {
    if (selectedNode && selectedNode.id) {
      console.log('🔄 Node selected, fetching documents for ID:', selectedNode.id, 'Type:', selectedNode.type, 'isDirectPart:', selectedNode.isDirectPart);
      setDocumentsLoading(true);
      
      try {
        // Determine if this is a part (use part_id filter) or assembly (use assembly_id filter)
        const isPartOrDirectPart = selectedNode.isDirectPart || selectedNode.type === 'part';
        const docs = await fetchDocumentsForNode(selectedNode.id, isPartOrDirectPart);
        
        console.log('📄 Fetched documents for node:', docs);
        setNodeDocuments(docs || []);
      } catch (error) {
        console.error('Failed to fetch documents for node:', error);
        setNodeDocuments([]);
      } finally {
        setDocumentsLoading(false);
      }
    } else {
      setNodeDocuments([]);
    }
  };
  
  fetchNodeDocs();
}, [selectedNode?.id, selectedNode?.type, selectedNode?.isDirectPart]);

// When Upload New Version modal opens, fetch all versions for the document and pre-fill next version number
useEffect(() => {
  if (!showNewVersionModal || !newVersionDoc?.id) {
    setDocumentVersions([]);
    return;
  }
  setNewVersionFile(null);
  setNewVersionName('');
  const nextVer = (newVersionDoc.version_no != null ? Number(newVersionDoc.version_no) : 0) + 1;
  setNewVersionNumber(String(nextVer));
  setDocumentVersionsLoading(true);
  setDocumentVersions([]);
  fetchDocumentVersions(newVersionDoc.id)
    .then((versions) => {
      setDocumentVersions(Array.isArray(versions) ? versions : []);
    })
    .catch(() => setDocumentVersions([]))
    .finally(() => setDocumentVersionsLoading(false));
}, [showNewVersionModal, newVersionDoc?.id]);

// When document preview opens and doc has part_id, fetch part for inspection plan section
useEffect(() => {
  if (!previewDoc?.doc?.part_id) {
    setPreviewPart(null);
    return;
  }
  setPreviewPartLoading(true);
  setPreviewPart(null);
  fetch(`http://172.18.100.26:8986/api/v1/parts/${previewDoc.doc.part_id}`)
    .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
    .then((part) => setPreviewPart(part))
    .catch(() => setPreviewPart(null))
    .finally(() => setPreviewPartLoading(false));
}, [previewDoc?.doc?.part_id]);


const getAssemblyDocuments = (assemblyId, isDirectPart = false, partId = null) => {
  console.log('🔍 Getting documents for assembly ID:', assemblyId, 'isDirectPart:', isDirectPart, 'partId:', partId);
  console.log('📋 Available documents count:', documents?.length || 0);
  
  if (!assemblyId && !isDirectPart && !partId) {
    console.log('⚠️ No IDs provided for document filtering');
    return [];
  }
  
  if (!documents || documents.length === 0) {
    console.log('⚠️ No documents available to filter');
    return [];
  }
  
  // Enhanced filtering with detailed logging
  const apiDocuments = documents.filter(doc => {
    let matches = false;
    
    if (isDirectPart && partId) {
      // For direct parts, filter by part_id
      matches = doc.part_id === partId || doc.part_id === parseInt(partId);
      console.log(`📄 Document ${doc.id} part_id: ${doc.part_id} vs partId: ${partId} -> ${matches}`);
    } else if (assemblyId) {
      // For assemblies, filter by assembly_id
      matches = doc.assembly_id === assemblyId || doc.assembly_id === parseInt(assemblyId);
      console.log(`📄 Document ${doc.id} assembly_id: ${doc.assembly_id} vs assemblyId: ${assemblyId} -> ${matches}`);
    }
    
    return matches;
  });
  
  console.log('✅ Filtered documents count:', apiDocuments.length);
  console.log('📄 Filtered documents:', apiDocuments);
  
  return apiDocuments;
};


const getPartAssemblyDocuments = (partNodeOrId) => {
  // Handle both partNode object and partId number
  const partNode = typeof partNodeOrId === 'object' ? partNodeOrId : 
    (selectedNode && selectedNode.id === partNodeOrId ? selectedNode : null);
  
  if (!partNode) {
    console.log('⚠️ Part node not found for ID:', partNodeOrId);
    return [];
  }
  
  console.log('🔍 Getting assembly documents for part:', partNode);
  console.log('📦 Part assembly_id:', partNode.assembly_id);
  console.log('📋 Available documents:', documents);
  
  if (!partNode.assembly_id) {
    console.log('⚠️ Part has no assembly_id');
    return [];
  }
  
  if (!documents || documents.length === 0) {
    console.log('⚠️ No documents available');
    return [];
  }
  
  const assemblyId = partNode.assembly_id;
  
  const assemblyDocuments = documents.filter(doc => {
    const matches = doc.assembly_id === assemblyId || doc.assembly_id === parseInt(assemblyId);
    console.log(`📄 Document ${doc.id}: assembly_id=${doc.assembly_id} vs part's assembly_id=${assemblyId} -> ${matches}`);
    return matches;
  });
  
  console.log('✅ Found assembly documents for part:', assemblyDocuments);
  return assemblyDocuments;
};


const getSubAssemblyDocuments = () => {
  console.log('Getting subassembly documents (assembly_id: null)');
  console.log('Available documents:', documents);
  
  if (!documents) {
    return [];
  }
  
  // Filter documents where assembly_id is null
  const subAssemblyDocs = documents.filter(doc => doc.assembly_id === null);
  
  console.log('Subassembly documents:', subAssemblyDocs);
  return subAssemblyDocs;
};


  const [currentPage, setCurrentPage] = useState({
    directParts: 1,
    assemblies: 1
  });
  const itemsPerPage = 10;

  const getPaginatedItems = (items, page, type) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const handlePageChange = (type, page) => {
    setCurrentPage(prev => ({ ...prev, [type]: page }));
  };

  const Pagination = ({ current, total, onPageChange, type }) => {
    const totalPages = Math.ceil(total / itemsPerPage);
    if (totalPages <= 1) return null;

    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
        <button 
          onClick={() => onPageChange(type, current - 1)} 
          disabled={current === 1}
          style={{
            padding: '0.25rem 0.5rem',
            border: '1px solid #d1d5db',
            background: 'white',
            borderRadius: '4px',
            cursor: current === 1 ? 'not-allowed' : 'pointer',
            opacity: current === 1 ? 0.5 : 1
          }}
        >
          Previous
        </button>
        <span style={{ fontSize: '0.875rem' }}>
          Page {current} of {totalPages}
        </span>
        <button 
          onClick={() => onPageChange(type, current + 1)}
          disabled={current === totalPages}
          style={{
            padding: '0.25rem 0.5rem',
            border: '1px solid #d1d5db',
            background: 'white',
            borderRadius: '4px',
            cursor: current === totalPages ? 'not-allowed' : 'pointer',
            opacity: current === totalPages ? 0.5 : 1
          }}
        >
          Next
        </button>
      </div>
    );
  };

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };
  
const handleAddAssembly = () => {
  setModalData({ 
    name: '', 
    no: '',
    rev: '',
    project_id: currentProject.id,
    parent_assembly_id: null, // This should be null for root assemblies
    id: null,
    created_at: null,
    partNumber: '',
    quantity: 1,
    type: 'assembly',
    parentId: null, 
    editId: null, 
    pdfFile: null, 
    stepFile: null, 
    isDirectPart: false,
    pdfDocType: '2D',
    stepDocType: '3D'
  });
  setShowModal(true);
};


const handleAddPart = (parentId) => {
  // Find the parent assembly to get project_id
  const findParentAssembly = (assemblies, targetId) => {
    for (const assembly of assemblies) {
      if (assembly.id === targetId) return assembly;
      if (assembly.parts) {
        const found = findParentAssembly(assembly.parts, targetId);
        if (found) return found;
      }
    }
    return null;
  };
  
  const parentAssembly = findParentAssembly(currentProject.assemblies, parentId);
  
  setModalData({ 
    name: '', 
    no: '',
    rev: '',
    partNumber: '', 
    quantity: 1,
    type: 'part', 
    parentId: parentId,
    project_id: null, // Changed: Set to null for parts inside assemblies
    parent_assembly_id: parentId,
    editId: null, 
    pdfFile: null, 
    stepFile: null, 
    isDirectPart: false 
  });
  setShowModal(true);
};

const handleAddDirectPart = () => {
  setModalData({ 
    name: '', 
    no: '',
    rev: '',
    partNumber: '', 
    quantity: 1,
    type: 'part', 
    parentId: null, 
    editId: null, 
    pdfFile: null, 
    stepFile: null, 
    isDirectPart: true,
    project_id: currentProject.id,  // Add this
    parent_assembly_id: null       // Add this
  });
  setShowModal(true);
};
  const handleAddSubAssembly = (parentId) => {
  setModalData({ 
    name: '', 
    no: '',
    rev: '',
    project_id: currentProject.id,
    parent_assembly_id: parentId, // Set the parent ID
    id: null,
    created_at: null,
    partNumber: '',
    quantity: 1,
    type: 'assembly', // Use 'assembly' type for API
    parentId: parentId, 
    editId: null, 
    pdfFile: null, 
    stepFile: null, 
    isDirectPart: false,
    pdfDocType: '2D',
    stepDocType: '3D'
  });
  setShowModal(true);
};

const handleEdit = async (node, isDirectPart) => {
  console.log('🖱️ EDIT CLICKED - Starting edit process');
  console.log('📋 Node received:', node);
  console.log('📋 isDirectPart:', isDirectPart);
  
  // Get existing documents based on node type
  let existingDocuments = [];
  
  if (node.type === 'part' || isDirectPart) {
    // For parts, filter by part_id
    console.log('🔍 Fetching documents for part with ID:', node.id);
    existingDocuments = getAssemblyDocuments(null, true, node.id);
  } else {
    // For assemblies, filter by assembly_id
    console.log('🔍 Fetching documents for assembly with ID:', node.id);
    existingDocuments = getAssemblyDocuments(node.id, false, null);
  }
  
  console.log('📄 All available documents:', documents);
  console.log('📄 Filtered existing documents for this node:', existingDocuments);
  
  // Find existing 2D and 3D files
  const existingPdf = existingDocuments.find(doc => {
    const is2D = doc.doc_type === '2D' || doc.doc_type === 'TWO_D';
    console.log(`Checking document ${doc.id}: doc_type=${doc.doc_type}, file_format=${doc.file_format}, is2D=${is2D}`);
    return is2D;
  });
  
  const existingStep = existingDocuments.find(doc => {
    const is3D = doc.doc_type === '3D' || doc.doc_type === 'THREE_D';
    console.log(`Checking document ${doc.id}: doc_type=${doc.doc_type}, file_format=${doc.file_format}, is3D=${is3D}`);
    return is3D;
  });
  
  console.log('📄 Found existing PDF:', existingPdf);
  console.log('📄 Found existing STEP:', existingStep);
  
  // Determine correct project_id based on part type
  let correctProjectId;
  if (isDirectPart) {
    correctProjectId = node.project_id || currentProject.id;
  } else if (node.type === 'part') {
    // Part inside assembly - check if it has assembly_id
    correctProjectId = node.assembly_id ? null : (node.project_id || currentProject.id);
  } else {
    // Assembly
    correctProjectId = node.project_id || currentProject.id;
  }
  
  console.log('✅ Setting up modal with:');
  console.log('  - editId:', node.id);
  console.log('  - project_id:', correctProjectId);
  console.log('  - parent_assembly_id:', node.assembly_id || node.parent_assembly_id);
  console.log('  - existingPdf:', existingPdf);
  console.log('  - existingStep:', existingStep);
  
  setModalData({ 
    name: node.name, 
    no: node.no || '',
    rev: node.rev || '',
    project_id: correctProjectId,
    parent_assembly_id: node.assembly_id || node.parent_assembly_id || null,
    id: node.id,
    created_at: node.created_at || new Date().toISOString(),
    partNumber: node.partNumber || node.part_no || '',
    quantity: node.quantity != null ? Number(node.quantity) : 1,
    type: node.type, 
    parentId: null, 
    editId: node.id, 
    pdfFile: null, 
    stepFile: null, 
    isDirectPart: isDirectPart,
    pdfDocType: '2D',
    stepDocType: '3D',
    // Add existing documents info
    existingPdf: existingPdf || null,
    existingStep: existingStep || null
  });
  
  console.log('✅ Modal opened for editing');
  setShowModal(true);
};

 const findAndUpdate = (items, id, updater) => {
  return items.map(item => {
    if (item.id === id) return updater(item);
    if (item.parts && item.parts.length > 0) return { ...item, parts: findAndUpdate(item.parts, id, updater) };
    return item;
  });
};

  const findAndDelete = (items, id) => {
    return items.filter(item => item.id !== id).map(item => ({
      ...item,
      parts: item.parts ? findAndDelete(item.parts, id) : []
    }));
  };
const handleSave = async () => {
  if (!modalData.name.trim()) return;
  
  // Require 2D document for all new creations (not edits)
  if (!modalData.editId && !modalData.pdfFile) {
    showMessageDialog({
      variant: 'error',
      title: 'Required Document Missing',
      message: 'A 2D drawing (PDF) is required to create assemblies and parts.'
    });
    return;
  }
  
  console.log('=== HANDLE SAVE DEBUG ===');
  console.log('modalData:', modalData);
  console.log('modalData.type:', modalData.type);
  console.log('modalData.isDirectPart:', modalData.isDirectPart);
  console.log('Condition check:', modalData.type === 'part' && !modalData.isDirectPart);
  console.log('========================');
  
  // Debug: Log modal data
  console.log('Modal data (before normalization):', modalData);
  console.log('Project ID (before normalization):', modalData.project_id);

  // Normalize project_id / parent_assembly_id instead of bailing out,
  // so the API call is always made when user clicks Update.
  const isPartInsideAssembly = modalData.type === 'part' && !modalData.isDirectPart;

  // For parts inside assemblies, force project_id to null (backend uses assembly_id)
  if (isPartInsideAssembly) {
    if (modalData.project_id !== null) {
      console.warn('Normalizing project_id to null for part inside assembly. Was:', modalData.project_id);
    }
    modalData.project_id = null;
  } else {
    // For assemblies and direct parts, ensure we have a valid project_id.
    if (
      modalData.project_id === undefined ||
      modalData.project_id === null ||
      modalData.project_id === '' ||
      modalData.project_id === 'undefined'
    ) {
      console.warn(
        'project_id was missing/invalid, normalizing to currentProject.id:',
        modalData.project_id,
        '→',
        currentProject?.id
      );
      modalData.project_id = currentProject?.id ?? null;
    }
  }

  // Normalize parent_assembly_id
  if (modalData.parent_assembly_id && modalData.parent_assembly_id !== '') {
    const parentId = parseInt(modalData.parent_assembly_id, 10);
    if (isNaN(parentId)) {
      console.warn('Invalid parent_assembly_id, forcing to null:', modalData.parent_assembly_id);
      modalData.parent_assembly_id = null;
    } else {
      modalData.parent_assembly_id = parentId;
    }
  } else {
    modalData.parent_assembly_id = null;
  }
  
  try {
    let updatedAssembly = null;
    let newPart = null;
    
    if ((modalData.type === 'assembly' || modalData.type === 'sub Assembly') && !modalData.isDirectPart) {
      const editIdNum = modalData.editId != null ? Number(modalData.editId) : null;
      const assemblyData = {
        name: modalData.name,
        no: modalData.no || null,
        rev: modalData.rev || null,
        project_id: parseInt(modalData.project_id),
        parent_assembly_id: modalData.parent_assembly_id ? parseInt(modalData.parent_assembly_id) : null,
        id: modalData.id,
        created_at: modalData.created_at
      };

      if (editIdNum) {
        // Update existing assembly via API
        updatedAssembly = await updateAssembly(editIdNum, assemblyData);
        
        // Update local state (supports both root and nested sub-assemblies)
        setCurrentProject(prev => ({
          ...prev,
          assemblies: findAndUpdate(prev.assemblies || [], editIdNum, (assembly) => ({
            ...assembly,
            ...updatedAssembly,
            // Preserve type information for tree rendering
            type: assembly.type || 'assembly',
            files: {
              ...assembly.files,
              ...(modalData.pdfFile && {
                pdf: { 
                  url: URL.createObjectURL(modalData.pdfFile), 
                  name: modalData.pdfFile.name, 
                  size: modalData.pdfFile.size,
                  uploadedAt: new Date().toISOString()
                }
              }),
              ...(modalData.stepFile && {
                step: { 
                  url: URL.createObjectURL(modalData.stepFile), 
                  name: modalData.stepFile.name, 
                  size: modalData.stepFile.size,
                  uploadedAt: new Date().toISOString()
                }
              })
            }
          }))
        }));
      } else {
        // Create new assembly via API
        updatedAssembly = await createAssembly(assemblyData);
        
        // Update local state - FIXED: Properly handle tree structure
        setCurrentProject(prev => {
          if (modalData.parent_assembly_id) {
            // This is a subassembly, add it to the parent's parts
            return {
              ...prev,
              assemblies: findAndUpdate(prev.assemblies, modalData.parent_assembly_id, parent => ({
                ...parent,
                parts: [...(parent.parts || []), {
                  ...updatedAssembly,
                  type: 'assembly',
                  parts: []
                }]
              }))
            };
          } else {
            // This is a root assembly, add to the main assemblies array
            return {
              ...prev,
              assemblies: [...(prev.assemblies || []), {
                ...updatedAssembly,
                type: 'assembly',
                parts: []
              }]
            };
          }
        });
      }
      
      // Upload files if they exist
      if (modalData.pdfFile || modalData.stepFile) {
        try {
          const documentData = {
            file_2d: modalData.pdfFile || null,
            file_3d: modalData.stepFile || null,
            doc_type: 'assembly',
            title: `${modalData.name} - Documents`,
            assembly_id: updatedAssembly.id,
            part_id: '',
            file_format_2d: modalData.pdfFile ? 'pdf' : '',
            file_format_3d: modalData.stepFile ? 'step' : '',
            pdf_content_type_2d: modalData.pdf_content_type_2d || 'normal',
            uploaded_by: 'current_user',
            change_note: 'Document update'
          };
          
          await uploadDocument(documentData);
          console.log('Documents uploaded successfully for assembly:', updatedAssembly.id);
          
          // Refresh documents list after upload
        try {
  const refreshedDocs = await fetchDocuments();
  setDocuments(refreshedDocs);
  console.log('Documents refreshed after direct part creation:', refreshedDocs);
} catch (error) {
  console.error('Failed to refresh documents:', error);
}
        } catch (uploadError) {
          console.error('Failed to upload documents:', uploadError);
        }
      }
      
    } else if (modalData.type === 'part' && modalData.isDirectPart) {
      if (modalData.editId) {
        try {
          const qty = Math.max(1, parseInt(modalData.quantity, 10) || 1);
          const partUpdateData = {
            name: modalData.name,
            part_number: modalData.partNumber || modalData.part_no || '',
            rev: modalData.rev || null,
            quantity: qty
          };
          newPart = await updatePart(modalData.editId, partUpdateData);
          setCurrentProject(prev => ({
            ...prev,
            directParts: (prev.directParts || []).map(p =>
              p.id === modalData.editId ? { ...p, ...newPart, name: newPart.name, part_no: newPart.part_no, partNumber: newPart.part_no, quantity: qty } : p
            )
          }));
          if (selectedProject?.id) await fetchProjectDetails(selectedProject.id);
        } catch (error) {
          console.error('Failed to update direct part:', error);
          showMessageDialog({ variant: 'error', title: 'Update failed', message: error?.message || 'Failed to update part. Please try again.' });
          return;
        }
      } else {
      console.log('🎯 ENTERING DIRECT PART CREATION LOGIC');
      
      try {
        const quantity = Math.max(1, parseInt(modalData.quantity, 10) || 1);
        const partData = {
          name: modalData.name,
          project_id: modalData.project_id,
          assembly_id: null, // Direct parts have no assembly (only project_id)
          part_number: modalData.partNumber || null,
          rev: modalData.rev || null,
          quantity,
          created_at: new Date().toISOString()
        };
        
        console.log('📤 Sending direct part data:', partData);
        newPart = await createPart(partData);
        console.log('✅ Direct part created:', newPart);
        
        // Upload documents if they exist
        if (modalData.pdfFile || modalData.stepFile) {
          try {
            const documentData = {
              file_2d: modalData.pdfFile || null,
              file_3d: modalData.stepFile || null,
              doc_type: 'part',
              title: `${modalData.name} - Documents`,
              assembly_id: '',
              part_id: newPart.id,
              file_format_2d: modalData.pdfFile ? 'pdf' : '',
              file_format_3d: modalData.stepFile ? 'step' : '',
              pdf_content_type_2d: modalData.pdf_content_type_2d || 'normal',
              uploaded_by: 'current_user',
              change_note: 'Document update'
            };
            
            await uploadDocument(documentData); // This hits POST /api/v1/documents/
            console.log('Documents uploaded successfully for direct part:', newPart.id);
            
            // Refresh documents list - This hits GET /api/v1/documents/?skip=0&limit=100
            try {
              const refreshedDocs = await fetchDocuments();
              setDocuments(refreshedDocs);
              console.log('Documents refreshed after direct part creation:', refreshedDocs);
            } catch (error) {
              console.error('Failed to refresh documents:', error);
            }
          } catch (uploadError) {
            console.error('Failed to upload documents:', uploadError);
          }
        }
        
        // Refresh project details to get updated parts with locations
        if (selectedProject?.id) {
          try {
            await fetchProjectDetails(selectedProject.id);
            console.log('Project details refreshed after direct part creation');
          } catch (error) {
            console.error('Failed to refresh project details:', error);
            // Fallback: Update local state manually
            setCurrentProject(prev => ({
              ...prev,
              directParts: [...(prev.directParts || []), {
                ...newPart,
                type: 'part',
                parts: [],
                isDirectPart: true,
                partNumber: newPart.part_no || ''
              }]
            }));
          }
        }

      } catch (error) {
        console.error('❌ Error creating direct part:', error);
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
        // Show error to user
        showMessageDialog({ variant: 'error', title: 'Create failed', message: error?.message || 'Failed to create direct part.' });
      }
      }
      
   } else if (modalData.type === 'part' && !modalData.isDirectPart) {
  if (modalData.editId) {
    try {
      const qty = Math.max(1, parseInt(modalData.quantity, 10) || 1);
      const partUpdateData = {
        name: modalData.name,
        part_number: modalData.partNumber || modalData.part_no || '',
        rev: modalData.rev || null,
        quantity: qty
      };
      newPart = await updatePart(modalData.editId, partUpdateData);
      setCurrentProject(prev => ({
        ...prev,
        assemblies: findAndUpdate(prev.assemblies, modalData.editId, part => ({ ...part, ...newPart, name: newPart.name, part_no: newPart.part_no, partNumber: newPart.part_no, quantity: qty }))
      }));
      if (selectedProject?.id) await fetchProjectDetails(selectedProject.id);
    } catch (error) {
      console.error('Failed to update part:', error);
      showMessageDialog({ variant: 'error', title: 'Update failed', message: error?.message || 'Failed to update part. Please try again.' });
      return;
    }
  } else {
  console.log('🎯 ENTERING PART CREATION LOGIC');
  
  try {
    const quantity = Math.max(1, parseInt(modalData.quantity, 10) || 1);
    const partData = {
      name: modalData.name,
      project_id: modalData.project_id,
      assembly_id: modalData.parent_assembly_id, // Use assembly_id (the parent assembly where part is being added)
      part_number: modalData.partNumber || null,
      rev: modalData.rev || null,
      quantity,
      created_at: new Date().toISOString()
    };
    
    console.log('📤 Sending part data:', partData);
    newPart = await createPart(partData);
    console.log('✅ Part created:', newPart);
    
    // Upload documents if they exist
    if (modalData.pdfFile || modalData.stepFile) {
      try {
        const documentData = {
          file_2d: modalData.pdfFile || null,
          file_3d: modalData.stepFile || null,
          doc_type: 'part',
          title: `${modalData.name} - Documents`,
          assembly_id: '',
          part_id: newPart.id,
          file_format_2d: modalData.pdfFile ? 'pdf' : '',
          file_format_3d: modalData.stepFile ? 'step' : '',
          pdf_content_type_2d: modalData.pdf_content_type_2d || 'normal',
          uploaded_by: 'current_user',
          change_note: 'Document update'
        };
        
        await uploadDocument(documentData); // This hits POST /api/v1/documents/
        console.log('Documents uploaded successfully for part:', newPart.id);
        
        // Refresh documents list - This hits GET /api/v1/documents/?skip=0&limit=100
        try {
          const refreshedDocs = await fetchDocuments();
          setDocuments(refreshedDocs);
          console.log('Documents refreshed after part creation:', refreshedDocs);
        } catch (error) {
          console.error('Failed to refresh documents:', error);
        }
      } catch (uploadError) {
        console.error('Failed to upload documents:', uploadError);
      }
    }
    // Check if project has no assemblies and no direct parts
const isEmptyProject = !currentProject.assemblies.length && !currentProject.directParts.length;
    // Refresh project details to get updated parts with locations
    if (selectedProject?.id) {
      try {
        await fetchProjectDetails(selectedProject.id);
        console.log('Project details refreshed after part creation');
      } catch (error) {
        console.error('Failed to refresh project details:', error);
        // Fallback: Update local state manually
        setCurrentProject(prev => ({
          ...prev,
          assemblies: findAndUpdate(prev.assemblies, modalData.parent_assembly_id, assembly => ({
            ...assembly,
            parts: [...(assembly.parts || []), {
              ...newPart,
              type: 'part',
              parts: []
            }]
          }))
        }));
      }
    }

  } catch (error) {
    console.error('❌ Error creating part:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    // Show error to user
    showMessageDialog({ variant: 'error', title: 'Create failed', message: error?.message || 'Failed to create part.' });
  }
  }
} else {
      // Handle parts and direct parts locally (existing logic)
      const newItem = {
        id: Date.now().toString(),
        name: modalData.name,
        partNumber: modalData.partNumber,
        rev: modalData.rev || null,
        type: modalData.type || 'part',
        parts: [],
        files: {
          pdf: modalData.pdfFile ? { 
            url: URL.createObjectURL(modalData.pdfFile), 
            name: modalData.pdfFile.name, 
            size: modalData.pdfFile.size,
            uploadedAt: new Date().toISOString()
          } : null,
          step: modalData.stepFile ? { 
            url: URL.createObjectURL(modalData.stepFile), 
            name: modalData.stepFile.name, 
            size: modalData.stepFile.size,
            uploadedAt: new Date().toISOString()
          } : null
        }
      };

      setCurrentProject(prev => {
        const updated = { ...prev };
        
        if (modalData.editId) {
          if (modalData.isDirectPart) {
            updated.directParts = (updated.directParts || []).map(p =>
              p.id === modalData.editId ? { ...p, ...newItem } : p
            );
          } else if (modalData.type === 'assembly') {
            updated.assemblies = updated.assemblies.map(a =>
              a.id === modalData.editId ? { ...a, ...newItem } : a
            );
          } else {
            updated.assemblies = findAndUpdate(updated.assemblies, modalData.editId, i => ({ ...i, ...newItem }));
          }
        } else if (modalData.isDirectPart) {
          updated.directParts = [...(updated.directParts || []), newItem];
        } else if (modalData.type === 'sub Assembly') {
          updated.assemblies = findAndUpdate(updated.assemblies, modalData.parentId, i => ({
            ...i, 
            parts: [...(i.parts || []), newItem]
          }));
        } else if (modalData.parentId) {
          updated.assemblies = findAndUpdate(updated.assemblies, modalData.parentId, i => ({
            ...i, 
            parts: [...(i.parts || []), newItem]
          }));
        }
        
        return updated;
      });
    }

    setShowModal(false);
    setModalData({ 
      name: '', 
      project_id: currentProject.id,
      parent_assembly_id: null,
      id: null,
      created_at: null,
      no: '',
      rev: '',
      partNumber: '',
      type: '', 
      parentId: null, 
      editId: null, 
      pdfFile: null, 
      stepFile: null, 
      isDirectPart: false,
      pdfDocType: '2D',
      stepDocType: '3D'
    });
    
    // Auto-select the updated/newly created item
    if (!modalData.editId) {
      if (modalData.type === 'part' && modalData.isDirectPart) {
        setSelectedNode({ ...newPart, type: 'part', isDirectPart: true, parts: [] });
      } else if (modalData.type === 'part' && !modalData.isDirectPart) {
        setSelectedNode({ ...newPart, type: 'part', isDirectPart: false, parts: [] });
      } else {
        setSelectedNode(updatedAssembly);
      }
    } else {
      const updatedItem = updatedAssembly || newPart;
      if (updatedItem) {
        const node = { ...updatedItem, type: modalData.type, isDirectPart: modalData.isDirectPart, parts: updatedItem.parts || [] };
        if (modalData.type === 'part') {
          node.quantity = Math.max(1, parseInt(modalData.quantity, 10) || 1);
          node.name = newPart?.name ?? node.name;
          node.part_no = newPart?.part_no ?? node.part_no;
          node.partNumber = node.part_no ?? node.partNumber;
          node.rev = newPart?.rev ?? node.rev;
        }
        setSelectedNode(node);
      }
    }
  } catch (error) {
    console.error('Error saving assembly:', error);
    // Error is already handled in the store
  }
};



const handleDelete = (id, type, isDirectPart) => {
  const itemLabel = type === 'assembly' ? 'assembly' : 'part';
  showMessageDialog({
    variant: 'confirm',
    title: 'Confirm delete',
    message: `Delete this ${itemLabel}? This cannot be undone.`,
    onConfirm: async () => {
      closeMessageDialog();
      try {
        if (type === 'assembly' && !isDirectPart) {
          await deleteAssembly(id);
        } else if (type === 'part' || isDirectPart) {
          await deletePart(id);
        }
        setCurrentProject(prev => {
          let updated = { ...prev };
          if (isDirectPart) {
            updated.directParts = (updated.directParts || []).filter(p => p.id !== id);
          } else if (type === 'assembly') {
            updated.assemblies = findAndDelete(updated.assemblies, id);
          } else {
            updated.assemblies = findAndDelete(updated.assemblies, id);
          }
          return updated;
        });
        if (selectedNode && selectedNode.id === id) setSelectedNode(null);
        if (selectedProject?.id) {
          try {
            await fetchProjectDetails(selectedProject.id);
          } catch (e) {
            console.warn('Could not refresh project after delete:', e);
          }
        }
      } catch (error) {
        console.error(`Failed to delete ${type}:`, error);
        showMessageDialog({
          variant: 'error',
          title: 'Delete failed',
          message: error?.message || `Failed to delete ${itemLabel}. Please try again.`
        });
      }
    },
    onCancel: () => closeMessageDialog()
  });
}

const handleTogglePriorityComponent = async (node) => {
  try {
    const updatedPart = await updatePart(node.id, {
      ...node,
      priority_component: !node.priority_component
    });
    
    setCurrentProject(prev => {
      const updated = { ...prev };
      
      // Update direct parts if it's a direct part
      if (node.assembly_id === null) {
        updated.directParts = (updated.directParts || []).map(p =>
          p.id === node.id ? { ...p, priority_component: !node.priority_component } : p
        );
      }
      
      // Update parts in assemblies if it's in an assembly
      const updatePartsInAssemblies = (assemblies) => {
        return assemblies.map(assembly => {
          if (assembly.parts) {
            assembly.parts = assembly.parts.map(part =>
              part.id === node.id ? { ...part, priority_component: !node.priority_component } : part
            );
          }
          return assembly;
        });
      };
      
      updated.assemblies = updatePartsInAssemblies(updated.assemblies || []);
      
      return updated;
    });
    
    // Update selected node if it's the current one
    if (selectedNode && selectedNode.id === node.id) {
      setSelectedNode(prev => ({ ...prev, priority_component: !node.priority_component }));
    }
    
    // Refresh project details to ensure side panel reflects the change immediately
    if (selectedProject?.id) {
      await fetchProjectDetails(selectedProject.id);
    }
    
  } catch (error) {
    console.error('Failed to toggle priority component:', error);
    showMessageDialog({
      variant: 'error',
      title: 'Update failed',
      message: error.message || 'Failed to update priority component status'
    });
  }
};

const handleCreateInspectionPlan = (node) => {
  // Get documents for this direct part
  const partDocuments = getAssemblyDocuments(node.id, true, node.id);
  
  // Find PDF document - check for doc_type === '2D' and file_format === 'pdf'
  const pdfDocument = partDocuments.find(doc => {
    // Check if it's a 2D document (PDF)
    const is2D = doc.doc_type === '2D' || doc.doc_type === 'TWO_D';
    const isPdf = doc.file_format && doc.file_format.toLowerCase() === 'pdf';
    return is2D && isPdf;
  });
  
  // Construct the full PDF URL from download_url
  let pdfUrl = null;
  if (pdfDocument) {
    if (pdfDocument.download_url) {
      // Use the download_url from the document
      pdfUrl = `http://172.18.100.26:8986${pdfDocument.download_url}`;
    } else if (pdfDocument.file_2d_url) {
      // Fallback to file_2d_url if download_url is not available
      pdfUrl = pdfDocument.file_2d_url.startsWith('http') 
        ? pdfDocument.file_2d_url 
        : `http://172.18.100.26:8986${pdfDocument.file_2d_url}`;
    }
  }
  
  console.log('Creating inspection plan for part:', node.name);
  console.log('Part documents:', partDocuments);
  console.log('PDF document found:', pdfDocument);
  console.log('PDF URL:', pdfUrl);
  
  // Navigate to inspection plan page with part data
  // pdfDocument should have an 'id' field which is the document_id
  navigate('/inspection-plan', {
    state: {
      partData: {
        id: node.id,
        name: node.name,
        partNumber: node.partNumber,
        pdfUrl: pdfUrl,
        document_id: pdfDocument ? (pdfDocument.id || pdfDocument.document_id) : null // Include document_id from pdfDocument
      }
    }
  });
}

const handleUpload3DDocument = async (node) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.step,.stp';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const documentData = {
        file_3d: file,
        title: `${node.name} - 3D Document`,
        assembly_id: node.type === 'assembly' ? node.id : '',
        part_id: node.type === 'part' || node.isDirectPart ? node.id : '',
        file_format_3d: file.name.split('.').pop().toLowerCase(),
        uploaded_by: 'current_user',
        change_note: 'Initial 3D document upload'
      };
      
      await upload3DDocumentOnly(documentData);
      
      // Wait a moment for backend to process, then refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh documents for this node
      const refreshedDocs = await fetchDocumentsForNode(node.id, node.type === 'part' || node.isDirectPart ? 'part' : 'assembly');
      await fetchDocuments(); // Refresh all documents
      
      // Explicitly update nodeDocuments state
      setNodeDocuments(refreshedDocs || []);
      
      // Force a re-render by updating the selectedNode with a timestamp
      if (selectedNode && selectedNode.id === node.id) {
        setSelectedNode({ 
          ...selectedNode, 
          _refreshTimestamp: Date.now() // Add timestamp to force re-render
        });
      }
      
      // Show success message
      showMessageDialog({
        variant: 'success',
        title: 'Success',
        message: '3D document uploaded successfully! Preview should be available now.'
      });
      
    } catch (error) {
      console.error('Error uploading 3D document:', error);
      showMessageDialog({
        variant: 'error',
        title: 'Upload Failed',
        message: 'Failed to upload 3D document: ' + error.message
      });
    }
  };
  input.click();
};

  const highlightText = (text, highlight) => {
    if (!highlight.trim()) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === highlight.toLowerCase() ? 
      <mark key={i} style={{ backgroundColor: '#ffeb3b', padding: '0 2px', borderRadius: '3px' }}>{part}</mark> : 
      part
    );
  };

  const TreeNode = ({ node, level, isLast, parentPath, isDirectPart, searchTerm = '' }) => {
    const hasChildren = node.parts && node.parts.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNode && selectedNode.id === node.id;
    const [showTooltip, setShowTooltip] = useState(false);

    const [hoveredButton, setHoveredButton] = useState(null);
const getTooltipContent = (buttonType) => {
  switch(buttonType) {
    case 'subAssembly': return 'Create Sub Assembly';
    case 'addParts': return 'Add Parts';
    case 'edit': return 'Edit';
    case 'delete': return 'Delete';
    default: return '';
  }
};

    return (
      <div key={node.id}>
        <div 
          style={{
            display: 'flex', 
            alignItems: 'center', 
            padding: '0.5rem 0.75rem', 
            paddingLeft: `${level * 24 + 12}px`,
            cursor: 'pointer', 
            borderRadius: '6px', 
            margin: '2px 6px',
            position: 'relative',
            backgroundColor: isSelected ? '#E8F0FF' : 'transparent',
            borderLeft: isSelected ? '3px solid #2F6FED' : '3px solid transparent',
            transition: 'background-color 0.15s ease, border-color 0.15s ease',
            boxShadow: 'none'
          }}
          onClick={() => { setSelectedNode({ ...node, isDirectPart: isDirectPart }); setPdfScale(1.0); }}
          onMouseEnter={(e) => {
            setShowTooltip(true);
            if (!isSelected) e.currentTarget.style.backgroundColor = '#F0F4F8';
          }}
          onMouseLeave={(e) => {
            setShowTooltip(false);
            if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
              style={{ background: 'none', border: 'none', padding: '4px', marginRight: '4px', cursor: 'pointer' }}>
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : <span style={{ width: '24px' }}></span>}
          
          {node.type === 'part' ? (
            <div style={{
              width: '28px',
              height: '28px',
              marginRight: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/images/parts-icon.png" 
                alt="Part" 
                style={{ width: '20px', height: '20px' }}
              />
            </div>
          ) : (
            <div style={{
              width: '28px',
              height: '28px',
              marginRight: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <img 
                src="/images/assembly-icon.png" 
                alt="Assembly" 
                style={{ width: '20px', height: '20px' }}
              />
            </div>
          )}
          
          <div style={{ position: 'relative', flex: 1 }}>
            <span style={{ 
              flex: 1, 
              fontSize: '0.9375rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              padding: '2px 0'
            }}>
              {searchTerm ? highlightText(node.name, searchTerm) : node.name}
              {node.type === 'part' && node.priority_component && (
                <span style={{ 
                  color: '#FCD34D', 
                  marginLeft: '4px',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}>
                  ★
                </span>
              )}
              {isDirectPart && (
                <span style={{ 
                  fontSize: '0.6875rem', 
                  background: '#CCFBF1', 
                  color: '#0D9488', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '6px', 
                  textTransform: 'uppercase', 
                  fontWeight: '600',
                  flexShrink: 0,
                  border: '1px solid #5EEAD4'
                }}>
                  DIRECT
                </span>
              )}
            </span>
            
            {node.partNumber && showTooltip && (
              <div style={{
                position: 'absolute',
                left: '50%',
                bottom: 'calc(100% + 8px)',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(31, 41, 55, 0.95)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                whiteSpace: 'nowrap',
                zIndex: 1000,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                animation: 'fadeIn 0.15s ease-out',
                '@keyframes fadeIn': {
                  '0%': { opacity: 0, transform: 'translateX(-50%) translateY(4px)' },
                  '100%': { opacity: 1, transform: 'translateX(-50%) translateY(0)' }
                }
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span style={{ 
                    color: '#9ca3af',
                    fontSize: '0.75rem',
                    fontWeight: 500
                  }}>
                    Part #:
                  </span>
                  <span style={{ 
                    fontWeight: 600,
                    letterSpacing: '0.3px'
                  }}>
                    {node.partNumber}
                  </span>
                </div>
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '6px solid rgba(31, 41, 55, 0.95)',
                  filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))'
                }}></div>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
           {/* Show subassembly button for assemblies (not parts, not direct parts) */}
           {node.type !== 'part' && !isDirectPart && (
  <button 
    onClick={(e) => { e.stopPropagation(); handleAddSubAssembly(node.id); }}
    style={{ background: '#EEF4FF', color: '#2F6FED', border: '1px solid #C7D7FE', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
    onMouseEnter={(e) => { e.currentTarget.style.background = '#2F6FED'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#2F6FED'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = '#EEF4FF'; e.currentTarget.style.color = '#2F6FED'; e.currentTarget.style.borderColor = '#C7D7FE'; }}
    title="Add Subassembly">
    <Layers size={12} />
  </button>
)}
            {/* Show add part button for assemblies only (not for parts or direct parts) */}
            {!isDirectPart && node.type !== 'part' && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleAddPart(node.id); }}
                style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#059669'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ECFDF5'; e.currentTarget.style.color = '#059669'; e.currentTarget.style.borderColor = '#A7F3D0'; }}
                title="Add Part">
                <Plus size={12} />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); handleDelete(node.id, node.type, isDirectPart); }}
              style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#DC2626'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FECACA'; }}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.parts.map((child, idx) => (
              <TreeNode key={child.id} node={child} level={level + 1} isLast={idx === node.parts.length - 1} parentPath={[...parentPath, isLast]} isDirectPart={false} searchTerm={searchTerm} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const [searchTerm, setSearchTerm] = useState('');

  const searchInTree = (items, searchTerm) => {
    if (!searchTerm.trim() || !items || items.length === 0) return items || [];
    
    const term = searchTerm.toLowerCase();
    
    return items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      const itemMatches = name.includes(term) || type.includes(term);
      
      const childrenMatch = item.parts && item.parts.length > 0 ? 
                          searchInTree(item.parts, searchTerm).length > 0 : false;
      
      return itemMatches || childrenMatch;
    }).map(item => {
      const name = (item.name || '').toLowerCase();
      const type = (item.type || '').toLowerCase();
      if (name.includes(term) || type.includes(term)) {
        return { ...item };
      }
      return {
        ...item,
        parts: searchInTree(item.parts || [], searchTerm)
      };
    });
  };

  const filteredAssemblies = searchTerm.trim()
    ? searchInTree([...(currentProject.assemblies || [])], searchTerm)
    : (currentProject.assemblies || []);

  const filterDirectPartsBySearch = (parts, term) => {
    if (!term.trim() || !parts || parts.length === 0) return parts || [];
    const t = term.toLowerCase();
    return parts.filter(p => 
      (p.name || '').toLowerCase().includes(t) || (p.type || '').toLowerCase().includes(t)
    );
  };

  const filteredDirectParts = searchTerm.trim()
    ? filterDirectPartsBySearch(currentProject.directParts || [], searchTerm)
    : (currentProject.directParts || []);

  const paginatedDirectParts = getPaginatedItems(
    filteredDirectParts, 
    currentPage.directParts, 
    'directParts'
  );

  // Reset to page 1 when search term changes so pagination stays valid
  useEffect(() => {
    setCurrentPage(prev => ({ ...prev, directParts: 1 }));
  }, [searchTerm]);

  // const paginatedAssemblies = getPaginatedItems(
  //   filteredAssemblies, 
  //   currentPage.assemblies, 
  //   'assemblies'
  // );

  const handleFileUpload = (file, fileType) => {
    if (!file) return;
    
    const newFile = {
      name: file.name,
      size: file.size,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toISOString(),
      version: selectedNode.files[fileType]?.version ? selectedNode.files[fileType].version + 1 : 1,
      isCurrent: true,
      previousVersions: selectedNode.files[fileType] 
        ? [
            ...(selectedNode.files[fileType].previousVersions || []),
            { 
              ...selectedNode.files[fileType], 
              isCurrent: false,
              // Make sure we don't carry over the previousVersions to avoid circular references
              previousVersions: undefined
            }
          ]
        : []
    };
    
    setCurrentProject(prev => {
      const updated = {
        ...prev,
        [selectedNode.isDirectPart ? 'directParts' : 'assemblies']: prev[selectedNode.isDirectPart ? 'directParts' : 'assemblies'].map(item => 
          item.id === selectedNode.id 
            ? { 
                ...item, 
                files: { 
                  ...item.files, 
                  [fileType]: newFile
                } 
              } 
            : item
        )
      };
      
      // Update the selectedNode reference to reflect the changes
      const updatedNode = updated[selectedNode.isDirectPart ? 'directParts' : 'assemblies'].find(
        item => item.id === selectedNode.id
      );
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
      
      return updated;
    });
  };

  const FileCard = ({ file, type, color, icon: Icon, onUpload }) => {
    const [showVersions, setShowVersions] = useState(false);
    const allVersions = [file, ...(file.previousVersions || [])].sort((a, b) => 
      new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
// {selectedNode.files && (
//   <div>
//     <h4>Attached Files</h4>
//     {selectedNode.files.pdf && <FileCard file={selectedNode.files.pdf} type="pdf" />}
//     {selectedNode.files.step && <FileCard file={selectedNode.files.step} type="step" />}
//   </div>
// )}
    return (
      <div style={{ 
        border: `1px solid ${color}20`,
        borderRadius: '8px',
        overflow: 'hidden',
        background: 'white'
      }}>
        <div style={{ 
          padding: '0.75rem',
          borderBottom: `1px solid ${color}20`,
          background: `${color}08`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              padding: '0.5rem', 
              background: 'white', 
              borderRadius: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontWeight: '600', 
                fontSize: '0.875rem', 
                color: '#111827', 
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                padding: '2px 0'
              }}>
                {file.name}
              </div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.125rem'
              }}>
                <span>v{file.version}</span>
                <span>•</span>
                <span>{(file.size / 1024).toFixed(1)} KB</span>
                <span>•</span>
                <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button 
              onClick={() => setShowVersions(!showVersions)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Version history"
            >
              <ChevronDown size={16} style={{ transform: showVersions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
            <a 
              href={file.url} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                flex: 1,
                textAlign: 'center',
                padding: '0.375rem 0.5rem',
                background: 'white',
                border: `1px solid ${color}30`,
                borderRadius: '4px',
                color: color,
                fontSize: '0.75rem',
                fontWeight: '500',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
            >
              <Download size={14} /> Download
            </a>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNewVersionDoc(document);
                setShowNewVersionModal(true);
              }}
              style={{
                flex: 1,
                padding: '0.375rem 0.5rem',
                background: 'white',
                border: `1px solid ${color}30`,
                borderRadius: '4px',
                color: color,
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
            >
              <Upload size={14} /> New Version
            </button>
          </div>
        </div>
        {showVersions && allVersions.length > 0 && (
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
            <div style={{ 
              padding: '0.5rem 0.75rem',
              fontSize: '0.6875rem',
              fontWeight: '600',
              color: '#6b7280',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: '#f9fafb'
            }}>
              Version History
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              {allVersions.map((version, idx) => (
                <div 
                  key={version.uploadedAt}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid #f3f4f6',
                    background: version.isCurrent ? `${color}08` : 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.8125rem'
                  }}
                >
                  <div style={{ 
                    width: '24px', 
                    height: '24px', 
                    borderRadius: '50%',
                    background: version.isCurrent ? color : '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ 
                      color: version.isCurrent ? 'white' : '#9ca3af',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      v{version.version}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ 
                        fontWeight: version.isCurrent ? '600' : '400',
                        color: version.isCurrent ? '#111827' : '#4b5563',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {version.name}
                      </span>
                      {version.isCurrent && (
                        <span style={{
                          fontSize: '0.6875rem',
                          background: color,
                          color: 'white',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '4px',
                          fontWeight: '500',
                          flexShrink: 0
                        }}>
                          Current
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#9ca3af',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <span>{(version.size / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span>{new Date(version.uploadedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <a 
                    href={version.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      color: color,
                      padding: '0.25rem',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                    title="Download this version"
                  >
                    <Download size={16} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

const DocumentsSection = ({ assemblyId, isDirectPart = false, partId = null, isPart = false }) => {
  const [partAssemblyDocs, setPartAssemblyDocs] = useState([]);
  const [loadingPartDocs, setLoadingPartDocs] = useState(false);
  
  // Fetch assembly documents for parts
  useEffect(() => {
    const fetchPartAssemblyDocs = async () => {
      if (isPart && partId && !isDirectPart) {
        setLoadingPartDocs(true);
        const docs = await getPartAssemblyDocuments(partId);
        setPartAssemblyDocs(docs);
        setLoadingPartDocs(false);
      }
    };
    
    fetchPartAssemblyDocs();
  }, [isPart, partId, isDirectPart]);
  
  // Determine which documents to show
  let displayDocuments = [];
  
  if (isPart && !isDirectPart) {
    // For parts inside assemblies, show the assembly documents
    displayDocuments = partAssemblyDocs;
  } else if (isDirectPart) {
    // For direct parts, filter by part_id
    displayDocuments = getAssemblyDocuments(null, true, partId);
  } else {
    // For assemblies, filter by assembly_id
    displayDocuments = getAssemblyDocuments(assemblyId, false, null);
  }
  
  if (loadingPartDocs) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Loading assembly documents...
        </div>
      </div>
    );
  }
  
  if (!displayDocuments || displayDocuments.length === 0) {
    return (
      <div style={{
        padding: '2rem',
        textAlign: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
          {isPart && !isDirectPart 
            ? `No assembly documents found for this part`
            : `No documents found for ${isDirectPart ? 'direct part' : 'part'} (ID: ${partId || assemblyId})`
          }
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          {isPart && !isDirectPart
            ? 'This part belongs to an assembly without documents'
            : `${isDirectPart ? 'Part ID' : 'Assembly ID'}: ${partId || assemblyId} • Check if documents exist with this ${isDirectPart ? 'part_id' : 'assembly_id'}`
          }
        </div>
      </div>
    );
  }


 return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '1rem',
        padding: '0.75rem 1rem',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #E5E7EB'
      }}>
        <h4 style={{ 
          fontSize: '0.875rem', 
          fontWeight: '600', 
          margin: 0,
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <FileText size={16} />
          {isPart && !isDirectPart 
            ? 'Assembly Documents (from parent assembly)' 
            : isDirectPart 
              ? 'Direct Part Documents' 
              : 'Assembly Documents'
          } (ID: {partId || assemblyId})
        </h4>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {displayDocuments.map((doc, idx) => (
          <React.Fragment key={doc.id || idx}>
            {/* 2D Document Card */}
            {doc.doc_type === '2D' && (
              <div 
                style={{ 
                  border: '1px solid #D6D9DE',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  background: '#ffffff',
                  transition: 'border-color 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2F6FED'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D6D9DE'; }}
              >
                <div style={{ 
                  padding: '0.875rem',
                  borderBottom: '1px solid #E5E7EB',
                  background: '#ffffff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ 
                      padding: '0.375rem', 
                      background: '#F0F4F8', 
                      borderRadius: '4px',
                      color: '#6B7280',
                      border: '1px solid #D6D9DE'
                    }}>
                      <FileText size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        fontSize: '0.875rem', 
                        color: '#1F2937', 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {doc.title}
                      </div>
                      <div style={{ 
                        fontSize: '0.6875rem',
                        color: '#6B7280',
                        marginTop: '0.125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        2D Document • {doc.file_format?.toUpperCase() || 'PDF'}
                        {doc.pdf_content_type === 'scanned' && (
                          <span style={{ fontSize: '0.625rem', background: '#E5E7EB', color: '#4B5563', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: '600' }}>OCR</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    <span>v{doc.version_no || 1}</span>
                    <span>•</span>
                    <span>{(doc.size || 0).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>{new Date(doc.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    {doc.download_url ? (
                      <>
                        <button
                          onClick={() => {
                            console.log('📥 Downloading 2D document:', doc.title);
                            window.open(`http://172.18.100.26:8986${doc.download_url}`, '_blank');
                          }}
                          style={{
                            flex: 1,
                            minWidth: '70px',
                            padding: '0.375rem',
                            background: '#2F6FED',
                            color: 'white',
                            border: '1px solid #2F6FED',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.25rem',
                            minHeight: '30px',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#1E5DD4'; e.currentTarget.style.borderColor = '#1E5DD4'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#2F6FED'; e.currentTarget.style.borderColor = '#2F6FED'; }}
                        >
                          <Download size={12} /> Download
                        </button>
                        <button
                          onClick={() => setPreviewDoc({ doc, type: '2D' })}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '0.5rem',
                            background: '#B45309',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.8125rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem'
                          }}
                        >
                          <Eye size={14} /> Preview
                        </button>
                      </>
                    ) : (
                      <div style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#e5e7eb',
                        color: '#6b7280',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.8125rem',
                        textAlign: 'center'
                      }}>
                        No file available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* 3D Document Card */}
            {doc.doc_type === '3D' && (
              <div 
                style={{ 
                  border: '1px solid #DDD6FE',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  transition: 'box-shadow 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'; }}
              >
                <div style={{ 
                  padding: '1rem',
                  borderBottom: '1px solid #E5E7EB',
                  background: '#F5F3FF'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      padding: '0.5rem', 
                      background: '#DDD6FE', 
                      borderRadius: '6px',
                      color: '#855CF1'
                    }}>
                      <BoxIcon size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        fontSize: '0.9375rem', 
                        color: '#855CF1', 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {doc.title}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem',
                        color: '#6D28D9',
                        marginTop: '0.25rem'
                      }}>
                        3D Document • {doc.file_format?.toUpperCase() || 'STEP'}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginTop: '0.75rem',
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    <span>v{doc.version_no || 1}</span>
                    <span>•</span>
                    <span>{(doc.size || 0).toFixed(1)} KB</span>
                    <span>•</span>
                    <span>{new Date(doc.created_at || Date.now()).toLocaleDateString()}</span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    {doc.download_url ? (
                      <>
                        <button
                          onClick={() => {
                            console.log('📥 Downloading 3D document:', doc.title);
                            window.open(`http://172.18.100.26:8986${doc.download_url}`, '_blank');
                          }}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '0.5rem',
                            background: '#855CF1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.8125rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                            minHeight: '36px'
                          }}
                        >
                          <Download size={14} /> Download
                        </button>
                        <button
                          onClick={() => setPreviewDoc({ doc, type: '3D' })}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '0.5rem',
                            background: '#855CF1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontSize: '0.8125rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                            minHeight: '36px'
                          }}
                        >
                          <Eye size={14} /> Preview
                        </button>
                      </>
                    ) : (
                      <div style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#F1F5F9',
                        color: '#64748b',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '0.8125rem',
                        textAlign: 'center'
                      }}>
                        No file available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const DocumentCard = ({ document, type }) => {
  const getIcon = () => {
    if (type === '2D') return FileText;
    return Box;
  };
  
  const getColor = () => {
    if (type === '2D') return '#B45309';
    return '#855CF1';
  };

  const Icon = getIcon();
  const color = getColor();

  return (
    <div style={{
      border: `2px solid ${color}`,
      borderRadius: '8px',
      padding: '1rem',
      backgroundColor: 'white',
      marginBottom: '0.75rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {/* File Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '0.75rem'
      }}>
        <div style={{
          padding: '0.5rem',
          backgroundColor: `${color}10`,
          borderRadius: '4px',
          marginRight: '0.75rem'
        }}>
          <Icon size={20} style={{ color }} />
        </div>
        
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.9375rem',
            fontWeight: '600',
            color: '#111827',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {document.title}
          </div>
        </div>
      </div>
      
      {/* File Info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        <span>v{document.version_no}</span>
        <span>•</span>
        <span>{(document.size || 0).toFixed(1)} KB</span>
        <span>•</span>
        <span>{new Date(document.created_at).toLocaleDateString()}</span>
      </div>
      
      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '0.5rem'
      }}>
        <a
          href={`http://172.18.100.26:8986${document.download_url}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            padding: '0.5rem 1rem',
            backgroundColor: color,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = color === '#dc2626' ? '#b91c1c' : '#1d4ed8';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = color;
          }}
        >
          <Download size={14} />
          Download
        </a>
        
        <button
          onClick={() => {
            setNewVersionDoc(document);
            setShowNewVersionModal(true);
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.375rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'white',
            color: color,
            border: `2px solid ${color}`,
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = `${color}10`;
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = 'white';
          }}
        >
          <Upload size={14} />
          New Version
        </button>
      </div>
    </div>
  );
};

  const [isModelLoading, setIsModelLoading] = useState(false);

  const handleBackToProjects = () => {
    setActiveNav('projects');
    navigate('/');
  };

  // Add error display
  const ErrorAlert = () => {
    if (!error) return null;
    
    return (
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        padding: '0.75rem',
        marginBottom: '1rem',
        color: '#dc2626'
      }}>
        <strong>Error:</strong> {error}
      </div>
    );
  };

// Add this after line 889, before the return statement
{assemblyError && (
  <div style={{
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    zIndex: 1000,
    maxWidth: '400px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span>{assemblyError}</span>
      <button 
        onClick={() => {
          const { clearError } = useAssemblyStore.getState();
          clearError();
        }}
        style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
      >
        ×
      </button>
    </div>
  </div>
)}


  return (
    <ThemeProvider theme={theme}>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F5F6F8', fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' }}>
      {/* <div style={{ width: sidebarOpen ? '250px' : '60px', background: '#1f2937', color: 'white', transition: 'width 0.3s', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #374151' }}>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem' }}
          >
            <Menu size={20} />
          </button>
          {sidebarOpen && <span style={{ fontWeight: '600', fontSize: '1.125rem' }}>Assembly</span>}
        </div>
      </div> */}

      <div style={{ flex: 1 }}>
        <div style={{ background: '#ffffff', padding: '1rem 1.5rem', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.125rem' }}>
            <span 
              style={{ color: '#2563EB', cursor: 'pointer', textDecoration: 'underline', fontWeight: '500' }}
              onClick={handleBackToProjects}
            >
              Projects
            </span>
            <span style={{ color: '#9ca3af' }}>/</span>
            <span style={{ color: '#374151', fontWeight: '600' }}>{currentProject.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1rem', padding: '16px', height: 'calc(100vh - 72px)' }}>
          <div style={{ background: '#ffffff', borderRadius: '4px', border: '1px solid #D6D9DE', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #D6D9DE', backgroundColor: '#EEF0F3', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1F2937', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                {currentProject.name}
              </span>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  flex: '0 1 auto',
                  minWidth: '120px',
                  maxWidth: '150px',
                  padding: '0.375rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #FDE68A',
                  fontSize: '0.8125rem',
                  color: '#374151',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0', backgroundColor: '#EEF0F3' }}>
              {/* Check if project is empty (no assemblies and no direct parts) */}
              {(!currentProject.assemblies || currentProject.assemblies.length === 0) && 
               (!currentProject.directParts || currentProject.directParts.length === 0) ? (
                // Simplified view for empty projects
                <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ 
                    textAlign: 'center', 
                    color: '#64748b', 
                    fontSize: '0.875rem',
                    marginBottom: '2rem',
                    padding: '2rem 1rem',
                    background: '#f1f5f9',
                    borderRadius: '8px',
                    border: '1px dashed #E5E7EB'
                  }}>
                    <div style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '500' }}>
                      No assemblies or parts yet
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      Start by adding an assembly or parts
                    </div>
                  </div>
                  
                  {/* Action Buttons - Assembly (indigo) and Direct Parts (teal) */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '2rem' }}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<Plus size={16} />}
                      onClick={handleAddAssembly}
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        textTransform: 'none',
                        borderRadius: '4px',
                        minHeight: '36px',
                        backgroundColor: '#2F6FED',
                        '&:hover': { backgroundColor: '#1E5DD4' },
                      }}
                    >
                      Add Assembly
                    </Button>
                    
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Plus size={16} />}
                      onClick={handleAddDirectPart}
                      sx={{
                        fontSize: '0.8125rem',
                        fontWeight: 500,
                        textTransform: 'none',
                        borderRadius: '4px',
                        minHeight: '36px',
                        borderColor: '#D6D9DE',
                        color: '#1F2937',
                        '&:hover': {
                          borderColor: '#2F6FED',
                          color: '#2F6FED',
                          backgroundColor: '#F0F4F8',
                        },
                      }}
                    >
                      Add Parts
                    </Button>
                  </div>
                </div>
              ) : (
                // Normal view for projects with content
                <>
                  {/* Assemblies Section - Always show first */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#EEF4FF', padding: '0.625rem 1rem', color: '#1F2937', fontWeight: '600', fontSize: '0.8125rem', textTransform: 'uppercase', borderBottom: '1px solid #C7D7FE', gap: '0.5rem' }}>
                      <div 
                        onClick={() => toggleNode('assemblies')} 
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
                      >
                        {expandedNodes.has('assemblies') ? <ChevronDown size={16} color="#4F6FED" /> : <ChevronRight size={16} color="#4F6FED" />}
                        <div style={{
                          width: '24px',
                          height: '24px',
                          background: '#ffffff',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1px solid #C7D7FE'
                        }}>
                          <img 
                            src="/images/assembly-icon.png" 
                            alt="Assembly" 
                            style={{ width: '16px', height: '16px' }}
                          />
                        </div>
                        <span style={{ color: '#1E40AF' }}>ASSEMBLIES</span>
                        <span style={{ background: '#C7D7FE', color: '#1E40AF', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: '600' }}>
                          {searchTerm.trim() ? filteredAssemblies.length : (currentProject.assemblies || []).length}
                        </span>
                      </div>
                    </div>

                    {expandedNodes.has('assemblies') && (
                      <div style={{ background: '#ffffff', padding: '0.5rem 0' }}>
                        {filteredAssemblies.length > 0 ? (
                          filteredAssemblies.map((a, i) => (
                            <TreeNode 
                              key={a.id} 
                              node={a} 
                              level={0} 
                              isLast={i === filteredAssemblies.length - 1} 
                              parentPath={[]} 
                              isDirectPart={false} 
                              searchTerm={searchTerm}
                            />
                          ))
                        ) : (
                          <div style={{ padding: '1rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                            {searchTerm ? 'No matching assemblies found' : 'No assemblies yet. Click + to add one.'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Direct Parts Section - Only show if there are direct parts */}
                  {(currentProject.directParts && currentProject.directParts.length > 0) && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <div onClick={() => toggleNode('direct-parts')} style={{ padding: '0.625rem 1rem', background: '#FEF9E7', color: '#1F2937', fontWeight: '600', fontSize: '0.8125rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #F5D86C' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {expandedNodes.has('direct-parts') ? <ChevronDown size={16} color="#B7791F" /> : <ChevronRight size={16} color="#B7791F" />}
                          <div style={{
                            width: '24px',
                            height: '24px',
                            marginRight: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: '#ffffff',
                            borderRadius: '4px',
                            border: '1px solid #F5D86C'
                          }}>
                            <img 
                              src="/images/parts-icon.png" 
                              alt="Part" 
                              style={{ width: '16px', height: '16px' }}
                            />
                          </div>
                          <span style={{ color: '#92600E' }}>PARTS</span>
                          <span style={{ background: '#F5D86C', color: '#92600E', padding: '0.125rem 0.5rem', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: '600' }}>
                            {searchTerm.trim() ? filteredDirectParts.length : (currentProject.directParts || []).length}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAddDirectPart(); }} 
                          style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#059669'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#ECFDF5'; e.currentTarget.style.color = '#059669'; e.currentTarget.style.borderColor = '#A7F3D0'; }}>
                          <Plus size={14} strokeWidth={2.5} />
                        </button>
                      </div>
                      {expandedNodes.has('direct-parts') && (
                        <div style={{ background: '#ffffff' }}>
                          {filteredDirectParts.length > 0 ? (
                            <>
                              {paginatedDirectParts.map(p => (
                                <TreeNode key={p.id} node={p} level={0} isLast={false} parentPath={[]} isDirectPart={true} searchTerm={searchTerm} />
                              ))}
                              <Pagination 
                                current={currentPage.directParts}
                                total={filteredDirectParts.length}
                                onPageChange={handlePageChange}
                                type="directParts"
                              />
                            </>
                          ) : (
                            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                              {searchTerm.trim() ? 'No matching direct parts found' : 'No direct parts yet. Click + to add one.'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
              </div>

              {/* Action Buttons at Bottom - Only show when not empty project */}
              {((currentProject.assemblies && currentProject.assemblies.length > 0) || 
                (currentProject.directParts && currentProject.directParts.length > 0)) && (
                <div style={{ padding: '0.75rem', borderTop: '1px solid #D6D9DE', display: 'flex', gap: '0.5rem', backgroundColor: '#EEF0F3' }}>
                  <button 
                    onClick={handleAddAssembly} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '0.375rem', 
                      padding: '0.5rem 1rem', 
                      minHeight: '34px',
                      borderRadius: '4px', 
                      border: '1px solid #2F6FED', 
                      backgroundColor: '#2F6FED', 
                      color: '#ffffff', 
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '0.8125rem',
                      transition: 'all 0.15s',
                      flex: 1
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1E5DD4'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#2F6FED'; }}
                  >
                    <Plus size={14} /> Add Assembly
                  </button>
                  <button 
                    onClick={handleAddDirectPart} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '0.375rem', 
                      padding: '0.5rem 1rem', 
                      minHeight: '34px',
                      borderRadius: '4px', 
                      border: '1px solid #D6D9DE', 
                      backgroundColor: '#ffffff', 
                      color: '#1F2937', 
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '0.8125rem',
                      transition: 'all 0.15s',
                      flex: 1
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2F6FED'; e.currentTarget.style.color = '#2F6FED'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#D6D9DE'; e.currentTarget.style.color = '#1F2937'; }}
                  >
                    <Plus size={14} /> Add Direct Part
                  </button>
                </div>
              )}





















                              </div>

<div style={{ background: '#ffffff', borderRadius: '4px', border: '1px solid #D6D9DE', overflowY: 'auto' }}>
            {selectedNode ? (
              <div>
                {/* Header Section */}
                <div style={{ 
                  padding: '16px 20px',
                  borderBottom: '1px solid #D6D9DE',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                  backgroundColor: '#EEF0F3'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: 0 }}>
                    {selectedNode.type === 'part' ?
                      <div style={{
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <img 
                          src="/images/parts-icon.png" 
                          alt="Part" 
                          style={{ width: '36px', height: '36px' }}
                        />
                      </div> : 
                      <div style={{
                        width: '40px',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                       <img 
  src="/images/assembly-icon.png" 
  alt="Assembly" 
  style={{ width: '36px', height: '36px' }}
/>

</div>
                      
                    }
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h3 style={{ 
                          fontSize: '1.375rem', 
                          fontWeight: '600', 
                          color: '#111827', 
                          margin: 0
                        }}>
                          {selectedNode.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          
                          {selectedNode.isDirectPart && (
                            <span style={{ 
                              fontSize: '0.8125rem', 
                              background: '#CCFBF1', 
                              color: '#0D9488', 
                              padding: '0.3rem 0.75rem', 
                              borderRadius: '6px', 
                              textTransform: 'uppercase',
                              fontWeight: '600',
                              whiteSpace: 'nowrap',
                              border: '1px solid #5EEAD4'
                            }}>
                              DIRECT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </div>

                {/* Content Section: Two divisions */}
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Division 1: Basic Information */}
                  <div style={{ 
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ 
                      padding: '14px 18px', 
                      borderBottom: '1px solid #E2E8F0', 
                      background: '#F8FAFC',
                      fontSize: '0.8125rem',
                      fontWeight: '600',
                      color: '#475569',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}>
                      Basic Information
                    </div>
                    <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                      {/* Left: Item Type & Components */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '2rem',
                        flex: '1 1 auto',
                        minWidth: 0,
                        alignItems: 'flex-start'
                      }}>
                        {/* Item Type */}
                        <div style={{ minWidth: '150px' }}>
                          <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>Item Type</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>
                            {selectedNode.type === 'part' ? (
                              <><BoxIcon size={18} color="#4f46e5" /><span>Part</span></>
                            ) : (
                              <><Layers size={18} color="#7c3aed" /><span>Assembly</span></>
                            )}
                          </div>
                        </div>
                        
                        {/* Identification Group: Name, Number, Revision */}
                        <div style={{ 
                          display: 'flex', 
                          gap: '2rem',
                          minWidth: '300px',
                          flex: '1'
                        }}>
                          <div style={{ minWidth: '120px' }}>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>Name</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>
                              <span>{selectedNode.name || '-'}</span>
                            </div>
                          </div>
                          <div style={{ minWidth: '120px' }}>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>Number</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>
                              <span>{selectedNode.no || selectedNode.part_no || '-'}</span>
                            </div>
                          </div>
                          <div style={{ minWidth: '100px' }}>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>Revision</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>
                              <span>{selectedNode.rev || '-'}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Quantity or Components */}
                        <div style={{ minWidth: '120px' }}>
                          {(selectedNode.isDirectPart || selectedNode.type === 'part') ? (
                            <>
                              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>Quantity</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>
                                <span>{selectedNode.quantity != null ? Number(selectedNode.quantity) : 1}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.375rem', fontWeight: '500' }}>Components</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', color: '#0f172a', fontWeight: '600' }}>
                                <Layers size={18} color="#64748b" />
                                <span>{(selectedNode.parts || []).length} items</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Right: Create Inspection Plan (parts), Edit, Delete */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                        {(selectedNode.isDirectPart || selectedNode.type === 'part') && (
                          <button
                            onClick={() => handleCreateInspectionPlan(selectedNode)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #2F6FED',
                              backgroundColor: '#2F6FED', color: 'white', cursor: 'pointer',
                              fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.15s'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1E5DD4'; e.currentTarget.style.borderColor = '#1E5DD4'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#2F6FED'; e.currentTarget.style.borderColor = '#2F6FED'; }}
                            title="Create Inspection Plan"
                          >
                            <ClipboardCheck size={16} /> Create Inspection Plan
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(selectedNode, selectedNode.isDirectPart)}
                          style={{
                            padding: '0.5rem', background: '#FEF9E7', color: '#B7791F', border: '1px solid #FDE68A',
                            borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s', width: '36px', height: '36px'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#F59E0B'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#F59E0B'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#FEF9E7'; e.currentTarget.style.color = '#B7791F'; e.currentTarget.style.borderColor = '#FDE68A'; }}
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        {selectedNode.type === 'part' && (
                          <button
                            onClick={() => handleTogglePriorityComponent(selectedNode)}
                            style={{
                              padding: '0.5rem', 
                              background: selectedNode.priority_component ? '#FEF3C7' : '#F3F4F6', 
                              color: selectedNode.priority_component ? '#D97706' : '#6B7280', 
                              border: `1px solid ${selectedNode.priority_component ? '#FDE68A' : '#D1D5DB'}`,
                              borderRadius: '6px', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              transition: 'all 0.15s', 
                              width: '36px', 
                              height: '36px'
                            }}
                            onMouseEnter={(e) => { 
                              if (selectedNode.priority_component) {
                                e.currentTarget.style.background = '#F59E0B'; 
                                e.currentTarget.style.color = '#fff'; 
                                e.currentTarget.style.borderColor = '#F59E0B'; 
                              } else {
                                e.currentTarget.style.background = '#E5E7EB'; 
                                e.currentTarget.style.color = '#374151'; 
                                e.currentTarget.style.borderColor = '#9CA3AF'; 
                              }
                            }}
                            onMouseLeave={(e) => { 
                              if (selectedNode.priority_component) {
                                e.currentTarget.style.background = '#FEF3C7'; 
                                e.currentTarget.style.color = '#D97706'; 
                                e.currentTarget.style.borderColor = '#FDE68A'; 
                              } else {
                                e.currentTarget.style.background = '#F3F4F6'; 
                                e.currentTarget.style.color = '#6B7280'; 
                                e.currentTarget.style.borderColor = '#D1D5DB'; 
                              }
                            }}
                            title={selectedNode.priority_component ? "Remove Priority" : "Mark as Priority Component"}
                          >
                            <span style={{ fontSize: '16px' }}>★</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(selectedNode.id, selectedNode.type, selectedNode.isDirectPart)}
                          style={{
                            padding: '0.5rem', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                            borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.15s', width: '36px', height: '36px'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#DC2626'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FECACA'; }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Division 2: Documents (2D & 3D) */}
                  <div style={{ 
                    background: '#ffffff',
                    borderRadius: '10px',
                    border: '1px solid #E2E8F0',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                  }}>
                    <div style={{ 
                      padding: '14px 18px', 
                      borderBottom: '1px solid #E2E8F0', 
                      background: '#F8FAFC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: '600', color: '#475569', letterSpacing: '0.02em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} /> {selectedNode.isDirectPart ? 'Direct Part Documents' : selectedNode.type === 'part' ? 'Part Documents' : 'Assembly Documents'}
                      </span>
                      <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>{nodeDocuments?.length || 0} document(s)</span>
                    </div>
                    <div style={{ padding: '1.25rem 1.5rem' }}>
                        {selectedNode && (
                          <div key={`docs-${selectedNode.id}-${nodeDocuments?.length || 0}`}>
                            {documentsLoading ? (
                              <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading documents...</div>
                              </div>
                            ) : (
                              <>
                                {/* Headers for 2D and 3D document sections */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.5rem' }}>
                                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#B45309', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    2D Document
                                  </div>
                                  <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6D28D9', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                    3D Document
                                  </div>
                                </div>
                                {/* 2D and 3D document cards in one row - name + Download + New Version on same line */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                  {/* 2D Document header card */}
                                  <div style={{ 
                                    border: '1px solid #FED7AA', borderRadius: '10px', background: '#FFF7ED', padding: '1rem',
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                      <div style={{ padding: '0.375rem', background: '#FDBA74', borderRadius: '6px', color: '#B45309', flexShrink: 0 }}>
                                        <FileText size={18} />
                                      </div>
                                      <span style={{ fontWeight: '600', fontSize: '0.9375rem', color: '#B45309', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {`${selectedNode?.name || selectedNode?.partNumber || selectedNode?.part_no || 'Item'}${(selectedNode?.no || selectedNode?.part_no) ? ` (${selectedNode?.no || selectedNode?.part_no})` : ''}${selectedNode?.rev ? ` Rev: ${selectedNode.rev}` : ''}`} - Documents
                                      </span>
                                      {nodeDocuments?.find(d => d.doc_type === '2D') ? (
                                        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                                          <button onClick={() => window.open(`http://172.18.100.26:8986${nodeDocuments.find(d => d.doc_type === '2D').download_url}`, '_blank')} style={{ padding: '0.375rem 0.625rem', background: '#DC2626', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Download size={14} /> Download</button>
                                          <button onClick={() => { setNewVersionDoc(nodeDocuments.find(d => d.doc_type === '2D')); setShowNewVersionModal(true); }} style={{ padding: '0.375rem 0.625rem', background: 'white', color: '#DC2626', border: '1px solid #DC2626', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Upload size={14} /> New Version</button>
                                        </div>
                                      ) : (
                                        <span style={{ fontSize: '0.8125rem', color: '#92400e' }}>No 2D document</span>
                                      )}
                                    </div>
                                    {nodeDocuments?.find(d => d.doc_type === '2D') && (
                                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        v{nodeDocuments.find(d => d.doc_type === '2D').version_no || 1} • {(nodeDocuments.find(d => d.doc_type === '2D').size || 0).toFixed(1)} KB • {new Date(nodeDocuments.find(d => d.doc_type === '2D').created_at || Date.now()).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                  {/* 3D Document header card */}
                                  <div style={{ 
                                    border: '1px solid #DDD6FE', borderRadius: '10px', background: '#F5F3FF', padding: '1rem',
                                    display: 'flex', flexDirection: 'column', gap: '0.5rem'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                      <div style={{ padding: '0.375rem', background: '#C4B5FD', borderRadius: '6px', color: '#6D28D9', flexShrink: 0 }}>
                                        <Package size={18} />
                                      </div>
                                      <span style={{ fontWeight: '600', fontSize: '0.9375rem', color: '#5B21B6', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {`${selectedNode?.name || selectedNode?.partNumber || selectedNode?.part_no || 'Item'}${(selectedNode?.no || selectedNode?.part_no) ? ` (${selectedNode?.no || selectedNode?.part_no})` : ''}${selectedNode?.rev ? ` Rev: ${selectedNode.rev}` : ''}`} - Documents
                                      </span>
                                      {nodeDocuments?.find(d => d.doc_type === '3D') ? (
                                        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                                          <button onClick={() => window.open(`http://172.18.100.26:8986${nodeDocuments.find(d => d.doc_type === '3D').download_url}`, '_blank')} style={{ padding: '0.375rem 0.625rem', background: '#2563EB', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Download size={14} /> Download</button>
                                          <button onClick={() => { setNewVersionDoc(nodeDocuments.find(d => d.doc_type === '3D')); setShowNewVersionModal(true); }} style={{ padding: '0.375rem 0.625rem', background: 'white', color: '#2563EB', border: '1px solid #2563EB', borderRadius: '6px', fontSize: '0.8125rem', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Upload size={14} /> New Version</button>
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                                          <span style={{ fontSize: '0.8125rem', color: '#6D28D9' }}>No 3D document</span>
                                          <button 
                                            onClick={() => handleUpload3DDocument(selectedNode)}
                                            style={{ 
                                              padding: '0.375rem 0.625rem', 
                                              background: '#2563EB', 
                                              color: 'white', 
                                              border: 'none', 
                                              borderRadius: '6px', 
                                              fontSize: '0.8125rem', 
                                              fontWeight: '500', 
                                              cursor: 'pointer', 
                                              display: 'flex', 
                                              alignItems: 'center', 
                                              gap: '0.25rem' 
                                            }}
                                            title="Upload 3D document"
                                          >
                                            <Upload size={14} /> Upload
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    {nodeDocuments?.find(d => d.doc_type === '3D') && (
                                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        v{nodeDocuments.find(d => d.doc_type === '3D').version_no || 1} • {(nodeDocuments.find(d => d.doc_type === '3D').size || 0).toFixed(1)} KB • {new Date(nodeDocuments.find(d => d.doc_type === '3D').created_at || Date.now()).toLocaleDateString()}
                                      </div>
                                    )}
                                  </div>
                                </div>

                            {/* Previews below document cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.25rem' }}>
                              {/* 2D Preview Section */}
                              <div style={{ 
                                background: '#ffffff', 
                                borderRadius: '8px', 
                                border: '1px solid #D6D9DE',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '420px'
                              }}>
                                <div style={{
                                  padding: '12px 16px',
                                  borderBottom: '1px solid #D6D9DE',
                                  background: '#EEF0F3',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexShrink: 0
                                }}>
                                  <span style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#1F2937' }}>
                                    2D Preview: {selectedNode.name}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                      onClick={() => setPdfScale(prev => Math.max(0.25, prev - 0.25))}
                                      style={{
                                        padding: '4px 8px',
                                        background: '#E5E7EB',
                                        color: '#6B7280',
                                        border: '1px solid #D6D9DE',
                                        borderRadius: '4px',
                                        fontSize: '0.6875rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#2F6FED'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#2F6FED'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#D6D9DE'; }}
                                    >
                                      −
                                    </button>
                                    <span style={{ 
                                      fontSize: '0.6875rem', 
                                      fontWeight: '500', 
                                      color: '#4B5563',
                                      minWidth: '40px',
                                      textAlign: 'center',
                                      background: '#ffffff',
                                      padding: '4px 6px',
                                      borderRadius: '3px',
                                      border: '1px solid #D6D9DE'
                                    }}>
                                      {Math.round(pdfScale * 100)}%
                                    </span>
                                    <button
                                      onClick={() => setPdfScale(prev => Math.min(3, prev + 0.25))}
                                      style={{
                                        padding: '4px 8px',
                                        background: '#E5E7EB',
                                        color: '#6B7280',
                                        border: '1px solid #D6D9DE',
                                        borderRadius: '4px',
                                        fontSize: '0.6875rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        display: 'flex',
                                        alignItems: 'center'
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#2F6FED'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#2F6FED'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#D6D9DE'; }}
                                    >
                                      +
                                    </button>
                                    <button
                                      onClick={() => setPdfScale(1.0)}
                                      style={{
                                        padding: '4px 8px',
                                        background: '#E5E7EB',
                                        color: '#6B7280',
                                        border: '1px solid #D6D9DE',
                                        borderRadius: '4px',
                                        fontSize: '0.625rem',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s',
                                        marginLeft: '2px'
                                      }}
                                      onMouseOver={(e) => { e.currentTarget.style.background = '#6B7280'; e.currentTarget.style.color = '#ffffff'; e.currentTarget.style.borderColor = '#6B7280'; }}
                                      onMouseOut={(e) => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.color = '#6B7280'; e.currentTarget.style.borderColor = '#D6D9DE'; }}
                                    >
                                      Reset
                                    </button>
                                    {current2DDoc && (
                                      <>
                                        <Tooltip title="Open full PDF preview">
                                          <IconButton
                                            size="small"
                                            sx={{
                                              ml: 0.5,
                                              bgcolor: '#ffffff',
                                              border: '1px solid #D6D9DE',
                                              '&:hover': {
                                                bgcolor: '#2F6FED',
                                                borderColor: '#2F6FED',
                                                '& .MuiSvgIcon-root': { color: '#ffffff' },
                                              },
                                            }}
                                            onClick={() => setPreviewDoc({ type: '2D', doc: current2DDoc })}
                                          >
                                            <VisibilityIcon sx={{ fontSize: 18, color: '#4B5563' }} />
                                          </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete this 2D document">
                                          <IconButton
                                            size="small"
                                            sx={{
                                              bgcolor: '#ffffff',
                                              border: '1px solid #FCA5A5',
                                              '&:hover': {
                                                bgcolor: '#DC2626',
                                                borderColor: '#DC2626',
                                                '& .MuiSvgIcon-root': { color: '#ffffff' },
                                              },
                                            }}
                                            onClick={handleDeleteCurrent2DDoc}
                                          >
                                            <DeleteOutlineIcon sx={{ fontSize: 18, color: '#DC2626' }} />
                                          </IconButton>
                                        </Tooltip>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div style={{ 
                                  flex: 1, 
                                  overflow: 'auto', 
                                  background: '#F5F6F8',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                  onWheel={handlePdfWheelZoom}
                                >
                                  {(() => {
                                    const doc2d = current2DDoc;
                                    if (doc2d && doc2d.download_url) {
                                      return (
                                        <div style={{ width: '100%', height: '100%' }}>
                                          <PDFViewer
                                            pdfData={`http://172.18.100.26:8986${doc2d.download_url}`}
                                            currentPage={1}
                                            scale={pdfScale}
                                          />
                                        </div>
                                      );
                                    }
                                    return (
                                      <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '100%',
                                        color: '#6B7280',
                                        textAlign: 'center',
                                        padding: '1.5rem',
                                        gap: '0.75rem',
                                      }}>
                                        <div style={{
                                          width: '48px',
                                          height: '48px',
                                          background: '#E5E7EB',
                                          borderRadius: '4px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          border: '1px solid #D6D9DE',
                                        }}>
                                          <FileText size={24} color="#9CA3AF" />
                                        </div>
                                        <h3 style={{ margin: 0, fontWeight: 600, color: '#1F2937', fontSize: '0.875rem' }}>
                                          No 2D Document
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF' }}>
                                          Upload a PDF to preview the drawing.
                                        </p>
                                        {selectedNode && (
                                          <label htmlFor="inline-2d-upload" style={{ cursor: 'pointer' }}>
                                            <Button
                                              variant="contained"
                                              size="small"
                                              component="span"
                                              sx={{
                                                textTransform: 'none',
                                                borderRadius: '999px',
                                              }}
                                            >
                                              Upload 2D PDF
                                            </Button>
                                            <input
                                              id="inline-2d-upload"
                                              type="file"
                                              accept=".pdf"
                                              style={{ display: 'none' }}
                                              onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                  const isPartOrDirectPart =
                                                    selectedNode.isDirectPart ||
                                                    selectedNode.type === 'part';
                                                  const documentData = {
                                                    file_2d: file,
                                                    file_3d: null,
                                                    doc_type: isPartOrDirectPart ? 'part' : 'assembly',
                                                    title: `${selectedNode.name} - Documents`,
                                                    assembly_id: isPartOrDirectPart ? '' : selectedNode.id,
                                                    part_id: isPartOrDirectPart ? selectedNode.id : '',
                                                    file_format_2d: 'pdf',
                                                    file_format_3d: '',
                                                    pdf_content_type_2d:
                                                      modalData.pdf_content_type_2d || 'normal',
                                                    uploaded_by: 'current_user',
                                                    change_note: 'Initial 2D document upload from preview',
                                                  };
                                                  await uploadDocument(documentData);
                                                  await refreshDocuments();
                                                  showMessageDialog({
                                                    variant: 'success',
                                                    title: '2D document uploaded',
                                                    message:
                                                      'Your PDF has been uploaded. The preview will refresh with the latest drawing.',
                                                  });
                                                } catch (error) {
                                                  console.error('Error uploading 2D document:', error);
                                                  showMessageDialog({
                                                    variant: 'error',
                                                    title: 'Upload failed',
                                                    message:
                                                      error?.message ||
                                                      'Unable to upload the 2D document. Please try again.',
                                                  });
                                                } finally {
                                                  e.target.value = '';
                                                }
                                              }}
                                            />
                                          </label>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* 3D Preview Section */}
                              <div style={{ 
                                background: '#ffffff', 
                                borderRadius: '8px', 
                                border: '1px solid #D6D9DE',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '420px'
                              }}>
                                <div style={{
                                  padding: '12px 16px',
                                  borderBottom: '1px solid #D6D9DE',
                                  background: '#EEF0F3',
                                  flexShrink: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}>
                                  <span style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#1F2937' }}>
                                    3D Preview: {selectedNode.name}
                                  </span>
                                  <span style={{ fontSize: '0.625rem', color: '#6B7280' }}>
                                    Drag to rotate • Scroll to zoom
                                  </span>
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden', background: '#F5F6F8' }}>
                                  {(() => {
                                    const doc3d = nodeDocuments?.find(d => d.doc_type === '3D');
                                    if (doc3d && (doc3d.preview_3d_url || doc3d.download_url)) {
                                      const versionId =
                                        doc3d.version_id ??
                                        doc3d.download_url?.match(/\/versions\/(\d+)\//)?.[1];
                                      const preview3dUrl =
                                        doc3d.preview_3d_url ||
                                        (versionId
                                          ? `/api/v1/documents/versions/${versionId}/preview-3d`
                                          : null) ||
                                        doc3d.download_url;
                                      return (
                                        <StepViewer
                                          fileUrl={
                                            preview3dUrl.startsWith('http')
                                              ? preview3dUrl
                                              : `http://172.18.100.26:8986${preview3dUrl}`
                                          }
                                          style={{ height: '100%', width: '100%' }}
                                        />
                                      );
                                    }
                                    return (
                                      <div
                                        style={{
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          height: '100%',
                                          color: '#6B7280',
                                          textAlign: 'center',
                                          padding: '1.5rem',
                                          gap: '0.75rem',
                                        }}
                                      >
                                        <div
                                          style={{
                                            width: '48px',
                                            height: '48px',
                                            background: '#E5E7EB',
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid #D6D9DE',
                                          }}
                                        >
                                          <BoxIcon size={24} color="#9CA3AF" />
                                        </div>
                                        <h3
                                          style={{
                                            margin: 0,
                                            fontWeight: 600,
                                            color: '#1F2937',
                                            fontSize: '0.875rem',
                                          }}
                                        >
                                          No 3D Document
                                        </h3>
                                        <p
                                          style={{
                                            margin: 0,
                                            fontSize: '0.75rem',
                                            color: '#9CA3AF',
                                          }}
                                        >
                                          Upload a STEP file to preview the 3D model.
                                        </p>
                                        {selectedNode && (
                                          <label htmlFor="inline-3d-upload" style={{ cursor: 'pointer' }}>
                                            <Button
                                              variant="outlined"
                                              size="small"
                                              component="span"
                                              sx={{
                                                textTransform: 'none',
                                                borderRadius: '999px',
                                              }}
                                            >
                                              Upload 3D STEP
                                            </Button>
                                            <input
                                              id="inline-3d-upload"
                                              type="file"
                                              accept=".step,.stp"
                                              style={{ display: 'none' }}
                                              onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                try {
                                                  const isPartOrDirectPart =
                                                    selectedNode.isDirectPart ||
                                                    selectedNode.type === 'part';
                                                  const documentData = {
                                                    file_3d: file,
                                                    title: `${selectedNode.name} - 3D Document`,
                                                    assembly_id: isPartOrDirectPart ? '' : selectedNode.id,
                                                    part_id: isPartOrDirectPart ? selectedNode.id : '',
                                                    file_format_3d: 'step',
                                                    uploaded_by: 'current_user',
                                                    change_note:
                                                      'Initial 3D document upload from preview',
                                                  };
                                                  await upload3DDocumentOnly(documentData);
                                                  await refreshDocuments();
                                                  showMessageDialog({
                                                    variant: 'success',
                                                    title: '3D document uploaded',
                                                    message:
                                                      'Your 3D model has been uploaded. The preview will refresh with the latest file.',
                                                  });
                                                } catch (error) {
                                                  console.error('Error uploading 3D document:', error);
                                                  showMessageDialog({
                                                    variant: 'error',
                                                    title: 'Upload failed',
                                                    message:
                                                      error?.message ||
                                                      'Unable to upload the 3D document. Please try again.',
                                                  });
                                                } finally {
                                                  e.target.value = '';
                                                }
                                              }}
                                            />
                                          </label>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                            </>
                            )}
                          </div>
                        )}

                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6b7280' }}>
                <BoxIcon size={64} style={{ margin: '0 auto 1.5rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.375rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>No Item Selected</h3>
                <p style={{ fontSize: '0.9375rem', color: '#64748b' }}>Choose an assembly or part from the tree to view its details</p>
              </div>
            )}
          </div>
        </div>
      </div>

         {showModal && (
        <Dialog
          open={showModal}
          onClose={() => setShowModal(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            },
          }}
        >
          <DialogTitle sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            fontWeight: 600, 
            fontSize: '1.25rem', 
            borderBottom: '1px solid #D6D9DE', 
            py: 2.5, 
            px: 3,
            bgcolor: '#EEF0F3', 
            color: '#1F2937' 
          }}>
            <Box
              component="img"
              src={modalData.type === 'part' ? '/images/parts-icon.png' : '/images/assembly-icon.png'}
              alt=""
              sx={{ width: 40, height: 40, objectFit: 'contain' }}
            />
            {modalData.editId ? 'Edit' : 'Add'}{' '}
            {modalData.type === 'part' 
              ? (modalData.isDirectPart ? 'Direct Part' : 'Part') 
              : (modalData.parent_assembly_id ? 'Sub Assembly' : 'Assembly')
            }
          </DialogTitle>
          <DialogContent sx={{ px: 4, py: 3.5, overflowY: 'auto' }}>
              {/* Basic Information */}
              <Box sx={{ mb: 4, mt: 1.5 }}>
                <Typography sx={{ 
                  fontWeight: 600, 
                  color: '#475569', 
                  letterSpacing: '0.05em', 
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  display: 'block', 
                  mb: 2 
                }}>
                  Basic Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <TextField
                    label="Name"
                    required
                    fullWidth
                    value={modalData.name}
                    onChange={(e) => setModalData({ ...modalData, name: e.target.value })}
                    placeholder="Enter name"
                    autoFocus
                    sx={{
                      '& .MuiInputLabel-root': { fontSize: '1rem' },
                      '& .MuiOutlinedInput-root': {
                        bgcolor: '#ffffff',
                        fontSize: '1rem',
                        minHeight: '56px',
                        '& fieldset': { borderColor: '#e2e8f0' },
                        '&:hover fieldset': { borderColor: '#cbd5e1' },
                        '&.Mui-focused fieldset': { borderColor: '#3b82f6', borderWidth: 2 },
                      },
                    }}
                  />
                  {modalData.type === 'assembly' && (
                    <>
                      <TextField
                        label="No"
                        fullWidth
                        value={modalData.no || ''}
                        onChange={(e) => setModalData({ ...modalData, no: e.target.value })}
                        placeholder="Assembly number"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: '#ffffff',
                            fontSize: '1rem',
                            minHeight: '56px',
                            '& fieldset': { borderColor: '#e2e8f0' },
                            '&:hover fieldset': { borderColor: '#cbd5e1' },
                          },
                        }}
                      />
                      <TextField
                        label="Rev"
                        fullWidth
                        value={modalData.rev || ''}
                        onChange={(e) => setModalData({ ...modalData, rev: e.target.value })}
                        placeholder="Revision"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: '#ffffff',
                            fontSize: '1rem',
                            minHeight: '56px',
                            '& fieldset': { borderColor: '#e2e8f0' },
                            '&:hover fieldset': { borderColor: '#cbd5e1' },
                          },
                        }}
                      />
                    </>
                  )}
                  {modalData.type === 'part' && (
                    <>
                      <TextField
                        label="No"
                        fullWidth
                        value={modalData.partNumber || ''}
                        onChange={(e) => setModalData({ ...modalData, partNumber: e.target.value })}
                        placeholder="Part number"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: '#ffffff',
                            fontSize: '1rem',
                            minHeight: '56px',
                            '& fieldset': { borderColor: '#e2e8f0' },
                            '&:hover fieldset': { borderColor: '#cbd5e1' },
                          },
                        }}
                      />
                      <TextField
                        label="Rev"
                        fullWidth
                        value={modalData.rev || ''}
                        onChange={(e) => setModalData({ ...modalData, rev: e.target.value })}
                        placeholder="Revision"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            bgcolor: '#ffffff',
                            fontSize: '1rem',
                            minHeight: '56px',
                            '& fieldset': { borderColor: '#e2e8f0' },
                            '&:hover fieldset': { borderColor: '#cbd5e1' },
                          },
                        }}
                      />
                    <Box>
                      <Typography component="label" sx={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'text.secondary', mb: 1 }}>
                        Quantity <span style={{ color: '#dc2626' }}>*</span>
                      </Typography>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => setModalData({ ...modalData, quantity: Math.max(1, (modalData.quantity ?? 1) - 1) })}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            border: '1px solid #e2e8f0',
                            background: '#fff',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                          aria-label="Decrease quantity"
                        >
                          <Minus size={18} strokeWidth={2.5} />
                        </button>
                        <TextField
                          type="number"
                          fullWidth
                          inputProps={{
                            min: 1,
                            style: {
                              textAlign: 'center',
                              fontSize: '1.125rem',
                              fontWeight: 600,
                              MozAppearance: 'textfield',
                            },
                          }}
                          value={modalData.quantity ?? 1}
                          onChange={(e) => {
                            const v = e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value, 10) || 1);
                            setModalData({ ...modalData, quantity: v });
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              bgcolor: '#ffffff',
                              minHeight: '48px',
                              '& fieldset': { borderColor: '#e2e8f0' },
                              '&:hover fieldset': { borderColor: '#cbd5e1' },
                            },
                            '& input[type=number]': {
                              WebkitAppearance: 'none',
                              margin: 0,
                            },
                            '& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button': {
                              WebkitAppearance: 'none',
                              margin: 0,
                            },
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setModalData({ ...modalData, quantity: (modalData.quantity ?? 1) + 1 })}
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            border: '1px solid #e2e8f0',
                            background: '#fff',
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                          aria-label="Increase quantity"
                        >
                          <Plus size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                    </Box>
                    </>
                  )}
                </Box>
              </Box>

              {/* File Attachments - only when adding new item, not when editing */}
              {!modalData.editId && (
              <Box sx={{ mt: 0 }}>
                <Typography sx={{ 
                  fontWeight: 600, 
                  color: '#475569', 
                  letterSpacing: '0.05em', 
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  display: 'block', 
                  mb: 2 
                }}>
                  File Attachments
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 3 }}>
                  {/* 2D PDF Upload */}
                  <Box>
                    <Typography sx={{ fontWeight: 600, mb: 1.5, fontSize: '1rem', color: '#374151' }}>
                      2D Drawing (PDF)
                      <Box component="span" sx={{ color: '#ef4444', ml: 0.5 }}>*</Box>
                    </Typography>
                    <Box
                      component="label"
                      htmlFor="pdf-upload"
                      sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        minHeight: 120,
                        border: '2px dashed',
                        borderColor: modalData.pdfFile ? '#2F6FED' : '#D6D9DE',
                        borderRadius: '8px',
                        bgcolor: modalData.pdfFile ? '#E8F0FF' : '#ffffff',
                        cursor: 'pointer',
                        color: modalData.pdfFile ? '#1F2937' : '#6B7280',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#2F6FED', bgcolor: '#F0F4F8', transform: 'translateY(-2px)' },
                      }}
                    >
                      <input type="file" id="pdf-upload" accept=".pdf" onChange={(e) => setModalData({ ...modalData, pdfFile: e.target.files[0] })} style={{ display: 'none' }} />
                      <Box component="img" src="/images/pdf.jpg" alt="PDF" sx={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '1rem', fontWeight: modalData.pdfFile ? 600 : 500 }}>{modalData.pdfFile ? modalData.pdfFile.name : 'Click to upload'}</Typography>
                    </Box>
                    <FormControl fullWidth sx={{ mt: 2, '& .MuiOutlinedInput-root': { bgcolor: '#fff', fontSize: '1rem', minHeight: '48px', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#cbd5e1' } } }}>
                      <InputLabel sx={{ fontSize: '1rem' }}>2D PDF type</InputLabel>
                      <Select
                        value={modalData.pdf_content_type_2d || 'normal'}
                        label="2D PDF type"
                        onChange={(e) => setModalData({ ...modalData, pdf_content_type_2d: e.target.value })}
                        sx={{ fontSize: '1rem' }}
                      >
                        <MenuItem value="normal" sx={{ fontSize: '1rem' }}>Normal (text layer)</MenuItem>
                        <MenuItem value="scanned" sx={{ fontSize: '1rem' }}>Scanned (OCR)</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                  {/* 3D STEP Upload */}
                  <Box>
                    <Typography sx={{ fontWeight: 600, mb: 1.5, fontSize: '1rem', color: '#374151' }}>
                      3D Model (STEP)
                      <Box component="span" sx={{ color: '#6b7280', ml: 0.5, fontSize: '0.875rem' }}>(Optional)</Box>
                    </Typography>
                    <Box
                      component="label"
                      htmlFor="step-upload"
                      sx={{
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                        minHeight: 120,
                        border: '2px dashed',
                        borderColor: modalData.stepFile ? '#2F6FED' : '#D6D9DE',
                        borderRadius: '8px',
                        bgcolor: modalData.stepFile ? '#E8F0FF' : '#ffffff',
                        cursor: 'pointer',
                        color: modalData.stepFile ? '#1F2937' : '#6B7280',
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#2F6FED', bgcolor: '#F0F4F8', transform: 'translateY(-2px)' },
                      }}
                    >
                      <input type="file" id="step-upload" accept=".step,.stp" onChange={(e) => setModalData({ ...modalData, stepFile: e.target.files[0] })} style={{ display: 'none' }} />
                      <Box component="img" src="/images/step.png" alt="STEP" sx={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '1rem', fontWeight: modalData.stepFile ? 600 : 500 }}>{modalData.stepFile ? modalData.stepFile.name : 'Click to upload'}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>
              )}
          </DialogContent>
          <DialogActions sx={{ 
            px: 3, 
            py: 2.5, 
            borderTop: '1px solid #D6D9DE', 
            bgcolor: '#EEF0F3',
            gap: 1.5
          }}>
            <Button 
              onClick={() => setShowModal(false)} 
              sx={{
                color: '#6B7280',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
                borderRadius: '6px',
                border: '1px solid #D6D9DE',
                px: 3,
                py: 1.25,
                '&:hover': { bgcolor: '#F0F4F8', borderColor: '#6B7280' }
              }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!modalData.name.trim() || (!modalData.editId && !modalData.pdfFile)}
              startIcon={assemblyLoading ? <CircularProgress size={18} color="inherit" /> : null}
              sx={{
                bgcolor: '#2F6FED',
                fontWeight: 600,
                textTransform: 'none',
                fontSize: '1rem',
                borderRadius: '6px',
                px: 3,
                py: 1.25,
                '&:hover': { bgcolor: '#1E5DD4' },
                '&.Mui-disabled': { bgcolor: '#9CA3AF', color: '#fff' }
              }}
            >
              {assemblyLoading ? (modalData.editId ? 'Updating...' : 'Creating...') : (modalData.editId ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Document Preview Modal (2D PDF / 3D STEP) */}
      {previewDoc && (
        <Dialog
          open={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          maxWidth={false}
          PaperProps={{
            sx: {
              borderRadius: 2,
              overflow: 'hidden',
              width: '80vw',
              maxWidth: 960,
              height: '80vh',
              maxHeight: 960,
            },
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: 'grey.50',
              borderBottom: 1,
              borderColor: 'divider',
              py: 1.5,
              pr: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {previewDoc.type === '2D' ? '2D' : '3D'} Preview: {previewDoc.doc?.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {previewDoc.doc?.version_id != null
                  ? `Viewing version v${previewDoc.doc?.version_no ?? '—'}`
                  : `Viewing latest version (v${previewDoc.doc?.version_no ?? '—'})`}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setPreviewDoc(null)}
              aria-label="Close preview"
            >
              <X size={20} />
            </IconButton>
          </DialogTitle>

          {previewDoc?.doc?.part_id && (
            <Box
              sx={{
                px: 2.5,
                py: 1.25,
                borderBottom: 1,
                borderColor: 'divider',
                bgcolor: '#f0fdf4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <ClipboardCheck size={18} color="#059669" />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 500, color: '#065f46' }}
                >
                  Inspection plan
                </Typography>
                {previewPartLoading ? (
                  <Typography variant="body2" color="text.secondary">
                    Loading…
                  </Typography>
                ) : previewPart ? (
                  <Typography
                    variant="body2"
                    sx={{
                      color: previewPart.inspection_plan_status
                        ? '#059669'
                        : '#b45309',
                      fontWeight: 500,
                    }}
                  >
                    {previewPart.inspection_plan_status ? 'Active' : 'Inactive'}
                  </Typography>
                ) : null}
              </Box>

              {previewPart && (
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const doc = previewDoc.doc;
                    const pdfUrlForPlan = doc.download_url
                      ? `http://172.18.100.26:8986${doc.download_url}`
                      : null;
                    navigate('/inspection-plan', {
                      state: {
                        partData: {
                          id: previewPart.id,
                          name: previewPart.name,
                          partNumber: previewPart.part_no,
                          pdfUrl: pdfUrlForPlan,
                          document_id: doc.id,
                        },
                      },
                    });
                    setPreviewDoc(null);
                  }}
                  startIcon={<ClipboardCheck size={14} />}
                  sx={{
                    borderRadius: 2,
                    borderColor: '#059669',
                    color: '#059669',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: '#059669',
                      borderColor: '#059669',
                      color: '#ffffff',
                    },
                  }}
                >
                  View Inspection Plan
                </Button>
              )}
            </Box>
          )}

          <DialogContent
            dividers
            sx={{
              p: 0,
              minHeight: 0,
              bgcolor: 'grey.50',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {previewDoc.type === '2D' && previewDoc.doc?.download_url && (
              <>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: 1,
                    borderColor: 'divider',
                    bgcolor: 'grey.100',
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Use Ctrl + mouse wheel to zoom, or the buttons on the right.
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        setPdfScale((prev) => Math.max(0.25, prev - 0.25))
                      }
                      sx={{ minWidth: 0, px: 1 }}
                    >
                      −
                    </Button>
                    <Typography
                      variant="body2"
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        minWidth: 56,
                        textAlign: 'center',
                        fontWeight: 500,
                      }}
                    >
                      {Math.round(pdfScale * 100)}%
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() =>
                        setPdfScale((prev) => Math.min(3, prev + 0.25))
                      }
                      sx={{ minWidth: 0, px: 1 }}
                    >
                      +
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setPdfScale(1.0)}
                      sx={{ textTransform: 'none' }}
                    >
                      Reset
                    </Button>
                  </Box>
                </Box>
                <Box
                  sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    overflow: 'hidden',
                    flex: 1,
                    bgcolor: 'background.paper',
                  }}
                  onWheel={handlePdfWheelZoom}
                >
                  <PDFViewer
                    pdfData={`http://172.18.100.26:8986${previewDoc.doc.download_url}`}
                    currentPage={1}
                    scale={pdfScale}
                  />
                </Box>
              </>
            )}

            {previewDoc.type === '3D' &&
              (previewDoc.doc?.preview_3d_url || previewDoc.doc?.download_url) &&
              (() => {
                const doc = previewDoc.doc;
                const versionId =
                  doc.version_id ??
                  doc.download_url?.match(/\/versions\/(\d+)\//)?.[1];
                const preview3dUrl =
                  doc.preview_3d_url ||
                  (versionId
                    ? `/api/v1/documents/versions/${versionId}/preview-3d`
                    : null) ||
                  doc.download_url;
                return (
                  <Box
                    sx={{
                      height: 500,
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: 1,
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <StepViewer
                      fileUrl={`http://172.18.100.26:8986${preview3dUrl}`}
                      style={{ height: '100%' }}
                    />
                  </Box>
                );
              })()}
          </DialogContent>
        </Dialog>
      )}

      {/* New Version Modal */}
      {showNewVersionModal && newVersionDoc && (
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
            zIndex: 1000
          }}
          onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowNewVersionModal(false);
                  setNewVersionDoc(null);
                  setNewVersionFile(null);
                  setNewVersionName('');
                  setNewVersionNumber('');
                }
              }}
        >
          <div 
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '0',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8fafc',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', letterSpacing: '-0.02em' }}>
                Upload new version <span style={{ fontWeight: '400', color: '#64748b' }}>· {newVersionDoc.title}</span>
              </h3>
              <button
                onClick={() => {
                  setShowNewVersionModal(false);
                  setNewVersionDoc(null);
                  setNewVersionFile(null);
                  setNewVersionName('');
                  setNewVersionNumber('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: '0.25rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 'auto'
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '1.5rem 1.75rem' }}>
              {/* New Document Upload Section — first */}
              <div style={{
                marginBottom: '1.75rem',
                padding: '1.25rem',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <h4 style={{
                  margin: '0 0 1.25rem 0',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Upload size={18} color="#2563eb" />
                  Upload new version
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.375rem',
                      fontSize: '0.8125rem',
                      fontWeight: '500',
                      color: '#475569'
                    }}>
                      Version name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={newVersionName}
                      onChange={(e) => setNewVersionName(e.target.value)}
                      placeholder="e.g., Updated Design"
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: '#fff'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.375rem',
                      fontSize: '0.8125rem',
                      fontWeight: '500',
                      color: '#475569'
                    }}>
                      Version number
                    </label>
                    <input
                      type="text"
                      value={newVersionNumber}
                      onChange={(e) => setNewVersionNumber(e.target.value)}
                      placeholder="e.g., 2"
                      style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        fontSize: '0.875rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                        backgroundColor: '#fff'
                      }}
                    />
                  </div>
                </div>
                <div style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '1.75rem',
                  textAlign: 'center',
                  backgroundColor: '#fff',
                  transition: 'border-color 0.2s, background 0.2s'
                }}>
                  {newVersionFile ? (
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        <FileText size={22} color="#475569" />
                        <span style={{ fontWeight: '500', color: '#1e293b', fontSize: '0.875rem' }}>
                          {newVersionFile.name}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 1rem 0', fontSize: '0.8125rem', color: '#64748b' }}>
                        {(newVersionFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        type="button"
                        onClick={() => setNewVersionFile(null)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid #f87171',
                          borderRadius: '8px',
                          backgroundColor: '#fff',
                          color: '#dc2626',
                          fontSize: '0.8125rem',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div>
                      <Upload size={40} color="#94a3b8" style={{ marginBottom: '0.75rem' }} />
                      <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9375rem', color: '#334155', fontWeight: '500' }}>
                        Click to browse or drag and drop
                      </p>
                      <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8125rem', color: '#64748b' }}>
                        {newVersionDoc.file_format === 'pdf' ? 'PDF only' : 'STEP (.step, .stp)'}
                      </p>
                      <input
                        type="file"
                        id="new-version-file-input"
                        accept={newVersionDoc.file_format === 'pdf' ? '.pdf' : '.step,.stp'}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) setNewVersionFile(file);
                        }}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('new-version-file-input').click()}
                        style={{
                          padding: '0.5rem 1.25rem',
                          border: 'none',
                          borderRadius: '8px',
                          backgroundColor: '#2563eb',
                          color: '#fff',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          cursor: 'pointer'
                        }}
                      >
                        Choose file
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Previous versions — second */}
              <div>
                <h4 style={{
                  margin: '0 0 0.75rem 0',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  color: '#1e293b',
                  letterSpacing: '-0.01em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <FileText size={18} color="#64748b" />
                  Version history
                </h4>
                {documentVersionsLoading ? (
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>Loading…</p>
                ) : documentVersions.length === 0 ? (
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>No previous versions.</p>
                ) : (
                  <div style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    backgroundColor: '#fff'
                  }}>
                    {documentVersions.map((v) => (
                      <div
                        key={v.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem 1rem',
                          borderBottom: '1px solid #f1f5f9'
                        }}
                      >
                        <div>
                          <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '0.875rem' }}>v{v.version_no}</span>
                          {v.is_current && (
                            <span style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.6875rem',
                              color: '#059669',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em'
                            }}>
                              Current
                            </span>
                          )}
                          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                            {v.uploaded_at ? new Date(v.uploaded_at).toLocaleString() : '—'}
                            {v.change_note ? ` · ${v.change_note}` : ''}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => window.open(`http://172.18.100.26:8986/api/v1/documents/versions/${v.id}/download`, '_blank')}
                            style={{
                              padding: '0.375rem 0.75rem',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              backgroundColor: '#fff',
                              color: '#475569',
                              fontSize: '0.8125rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Download size={14} />
                            Download
                          </button>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({
                              doc: {
                                ...newVersionDoc,
                                version_id: v.id,
                                version_no: v.version_no,
                                file_format: v.file_format,
                                download_url: `/api/v1/documents/versions/${v.id}/download`,
                                preview_3d_url: newVersionDoc.doc_type === '3D' ? `/api/v1/documents/versions/${v.id}/preview-3d` : null
                              },
                              type: newVersionDoc.doc_type === '3D' ? '3D' : '2D'
                            })}
                            style={{
                              padding: '0.375rem 0.75rem',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              backgroundColor: '#fff',
                              color: '#475569',
                              fontSize: '0.8125rem',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Eye size={14} />
                            Preview
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.25rem 1.75rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              backgroundColor: '#f8fafc',
              borderBottomLeftRadius: '12px',
              borderBottomRightRadius: '12px'
            }}>
              <button
                type="button"
                onClick={() => {
                  setShowNewVersionModal(false);
                  setNewVersionDoc(null);
                  setNewVersionFile(null);
                  setNewVersionName('');
                  setNewVersionNumber('');
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  minHeight: '38px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  color: '#475569',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!newVersionFile) {
                    showMessageDialog({ variant: 'error', title: 'Missing file', message: 'Please select a file to upload.' });
                    return;
                  }
                  if (!newVersionName.trim()) {
                    showMessageDialog({ variant: 'error', title: 'Missing version name', message: 'Please enter a version name.' });
                    return;
                  }

                  setUploadingNewVersion(true);
                  try {
                    const versionNo = newVersionNumber.trim() ? parseInt(newVersionNumber.trim(), 10) : null;
                    if (newVersionNumber.trim() && Number.isNaN(versionNo)) {
                      showMessageDialog({ variant: 'error', title: 'Invalid version number', message: 'Version number must be a number (e.g. 2 or 2.0).' });
                      setUploadingNewVersion(false);
                      return;
                    }
                    await uploadDocumentVersion(
                      newVersionDoc.id,
                      newVersionFile,
                      newVersionDoc.file_format || 'pdf',
                      newVersionName.trim(),
                      versionNo
                    );
                    setShowNewVersionModal(false);
                    setShowUploadSuccessDialog(true);
                    setNewVersionDoc(null);
                    setNewVersionFile(null);
                    setNewVersionName('');
                    setNewVersionNumber('');
                    await refreshDocuments();
                  } catch (error) {
                    console.error('Error uploading new version:', error);
                    showMessageDialog({ variant: 'error', title: 'Upload failed', message: error?.message || 'Failed to upload new version. Please try again.' });
                  } finally {
                    setUploadingNewVersion(false);
                  }
                }}
                disabled={!newVersionFile || !newVersionName.trim() || uploadingNewVersion}
                style={{
                  padding: '0.5rem 1.25rem',
                  minHeight: '38px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: (!newVersionFile || !newVersionName.trim() || uploadingNewVersion) ? '#94a3b8' : '#2563eb',
                  color: '#fff',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: (!newVersionFile || !newVersionName.trim() || uploadingNewVersion) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {uploadingNewVersion ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Upload New Version
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload success dialog */}
      <Dialog
        open={showUploadSuccessDialog}
        onClose={() => setShowUploadSuccessDialog(false)}
        PaperProps={{
          style: {
            borderRadius: '12px',
            padding: '1.5rem',
            minWidth: '320px',
            textAlign: 'center'
          }
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <CheckCircle size={48} color="#10b981" style={{ flexShrink: 0 }} />
          <Typography variant="h6" style={{ fontWeight: 600, color: '#111827' }}>
            Success
          </Typography>
          <Typography variant="body2" style={{ color: '#6b7280' }}>
            New version uploaded successfully!
          </Typography>
          <Button
            variant="contained"
            onClick={() => setShowUploadSuccessDialog(false)}
            style={{
              backgroundColor: '#10b981',
              color: '#fff',
              marginTop: '0.5rem',
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600
            }}
          >
            OK
          </Button>
        </div>
      </Dialog>

      {/* Message / confirm dialog (errors, confirmations) */}
      <Dialog
        open={messageDialog.open}
        onClose={() => messageDialog.variant === 'confirm' ? messageDialog.onCancel?.() : closeMessageDialog()}
        PaperProps={{
          style: {
            borderRadius: '12px',
            padding: '1.5rem',
            minWidth: '320px',
            maxWidth: '400px',
            textAlign: 'center'
          }
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          {messageDialog.variant === 'error' && <AlertCircle size={48} color="#dc2626" style={{ flexShrink: 0 }} />}
          {messageDialog.variant === 'success' && <CheckCircle size={48} color="#10b981" style={{ flexShrink: 0 }} />}
          {messageDialog.variant === 'confirm' && <HelpCircle size={48} color="#f59e0b" style={{ flexShrink: 0 }} />}
          <Typography variant="h6" style={{ fontWeight: 600, color: '#111827' }}>
            {messageDialog.title}
          </Typography>
          <Typography variant="body2" style={{ color: '#6b7280', whiteSpace: 'pre-wrap' }}>
            {messageDialog.message}
          </Typography>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {messageDialog.variant === 'confirm' && (
              <Button
                variant="outlined"
                onClick={() => { messageDialog.onCancel?.(); closeMessageDialog(); }}
                style={{
                  borderColor: '#d1d5db',
                  color: '#475569',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600
                }}
              >
                Cancel
              </Button>
            )}
            <Button
              variant="contained"
              onClick={() => {
                if (messageDialog.variant === 'confirm' && messageDialog.onConfirm) {
                  messageDialog.onConfirm();
                } else {
                  closeMessageDialog();
                }
              }}
              style={{
                backgroundColor: messageDialog.variant === 'error' ? '#dc2626' : messageDialog.variant === 'confirm' ? '#2563eb' : '#10b981',
                color: '#fff',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600
              }}
            >
              OK
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
    </ThemeProvider>
  );
};

export default Assembly;