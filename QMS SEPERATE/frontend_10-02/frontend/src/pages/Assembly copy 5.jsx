import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Edit2, Trash2, Plus, ChevronRight, ChevronDown, Box, Package, Menu, FileText, Download, Upload, Square, Folder, ClipboardCheck, Eye, X } from 'lucide-react';
import { NavContext } from '../App';
import useProjectStore from '../store/projectCreation';
import useAssemblyStore from '../store/assembly'; // Add this import
import StepViewer from '../components/StepViewer';
import PDFViewer from '../components/PDFViewer';
import usePartStore from '../store/part';

// Add this function to build tree structure from flat assembly list
const buildAssemblyTree = (assemblies, parentId = null) => {
  return assemblies
    .filter(assembly => assembly.parent_assembly_id === parentId)
    .map(assembly => ({
      ...assembly,
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
  fetchAllAssemblies,
  fetchDocuments,
  fetchDocumentsForNode,  // New: fetch documents for specific node
  loading: assemblyLoading,
  error: assemblyError
} = useAssemblyStore();
  
const {
  createPart,
  updatePart,  // Add this
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
const [expandedNodes, setExpandedNodes] = useState(new Set(['direct-parts', 'assemblies', 'subassemblies']));
const [selectedNode, setSelectedNode] = useState(null);
const [showModal, setShowModal] = useState(false);
const [previewDoc, setPreviewDoc] = useState(null); // { doc, type: '2D'|'3D' } for document preview modal
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
    const docs = await fetchDocuments();
    console.log('📄 Documents refreshed, count:', docs?.length || 0);
    console.log('📄 Documents data:', docs);
    setDocuments(docs || []);
  } catch (error) {
    console.error('Failed to refresh documents:', error);
    setDocuments([]);
  } finally {
    setDocumentsLoading(false);
  }
};




const [modalData, setModalData] = useState({
  name: '', 
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
          ...assembly,
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
  
  console.log('=== HANDLE SAVE DEBUG ===');
  console.log('modalData:', modalData);
  console.log('modalData.type:', modalData.type);
  console.log('modalData.isDirectPart:', modalData.isDirectPart);
  console.log('Condition check:', modalData.type === 'part' && !modalData.isDirectPart);
  console.log('========================');
  
  // Debug: Log modal data
  console.log('Modal data:', modalData);
  console.log('Project ID:', modalData.project_id);
  
 // Validate project_id - allow null for parts inside assemblies
if (modalData.type === 'part' && !modalData.isDirectPart) {
  // For parts inside assemblies, project_id should be null
  if (modalData.project_id !== null) {
    console.error('For parts inside assemblies, project_id must be null:', modalData.project_id);
    return;
  }
} else {
  // For assemblies and direct parts, project_id is required
  if (!modalData.project_id || modalData.project_id === 'undefined' || modalData.project_id === '') {
    console.error('Invalid project_id:', modalData.project_id);
    return;
  }
}
  
  // Validate parent_assembly_id
  if (modalData.parent_assembly_id && modalData.parent_assembly_id !== '') {
    const parentId = parseInt(modalData.parent_assembly_id);
    if (isNaN(parentId)) {
      console.error('Invalid parent_assembly_id:', modalData.parent_assembly_id);
      return;
    }
    modalData.parent_assembly_id = parentId;
  } else {
    modalData.parent_assembly_id = null;
  }
  
  try {
    let updatedAssembly = null;
    let newPart = null;
    
    if ((modalData.type === 'assembly' || modalData.type === 'sub Assembly') && !modalData.isDirectPart) {
      const assemblyData = {
        name: modalData.name,
        project_id: parseInt(modalData.project_id),
        parent_assembly_id: modalData.parent_assembly_id ? parseInt(modalData.parent_assembly_id) : null,
        id: modalData.id,
        created_at: modalData.created_at
      };

      if (modalData.editId) {
        // Update existing assembly via API
        updatedAssembly = await updateAssembly(modalData.editId, assemblyData);
        
        // Update local state
        setCurrentProject(prev => ({
          ...prev,
          assemblies: prev.assemblies.map(assembly => 
            assembly.id === modalData.editId ? { 
              ...assembly, 
              ...updatedAssembly,
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
            } : assembly
          )
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
      console.log('🎯 ENTERING DIRECT PART CREATION LOGIC');
      
      try {
        const quantity = Math.max(1, parseInt(modalData.quantity, 10) || 1);
        const partData = {
          name: modalData.name,
          project_id: modalData.project_id,
          assembly_id: null, // Direct parts have no assembly (only project_id)
          part_number: modalData.partNumber || null,
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
        alert(`Failed to create direct part: ${error.message || error}`);
      }
      
   } else if (modalData.type === 'part' && !modalData.isDirectPart) {
  console.log('🎯 ENTERING PART CREATION LOGIC');
  
  try {
    const quantity = Math.max(1, parseInt(modalData.quantity, 10) || 1);
    const partData = {
      name: modalData.name,
      project_id: modalData.project_id,
      assembly_id: modalData.parent_assembly_id, // Use assembly_id (the parent assembly where part is being added)
      part_number: modalData.partNumber || null,
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
    alert(`Failed to create part: ${error.message || error}`);
  }
} else {
      // Handle parts and direct parts locally (existing logic)
      const newItem = {
        id: Date.now().toString(),
        name: modalData.name,
        partNumber: modalData.partNumber,
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
      setSelectedNode({ ...updatedAssembly, type: modalData.type, isDirectPart: modalData.isDirectPart });
    }
  } catch (error) {
    console.error('Error saving assembly:', error);
    // Error is already handled in the store
  }
};



const handleDelete = async (id, type, isDirectPart) => {
  if (!window.confirm('Delete this item?')) return;
  
  try {
    // Only call API for actual assemblies (not direct parts or sub-parts)
    if (type === 'assembly' && !isDirectPart) {
      await deleteAssembly(id);
    }
    
    // Update local state
    setCurrentProject(prev => {
      let updated = { ...prev };
      if (isDirectPart) {
        updated.directParts = (updated.directParts || []).filter(p => p.id !== id);
      } else if (type === 'assembly') {
        updated.assemblies = updated.assemblies.filter(a => a.id !== id);
      } else {
        updated.assemblies = findAndDelete(updated.assemblies, id);
      }
      return updated;
    });
    
    if (selectedNode && selectedNode.id === id) setSelectedNode(null);
  } catch (error) {
    console.error('Failed to delete assembly:', error);
    // Show error message to user
    alert('Failed to delete assembly. Please try again.');
  }
}

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
            margin: '2px 0', 
            position: 'relative',
            backgroundColor: isSelected ? '#e0f2fe' : 'transparent',
            transition: 'background-color 0.2s ease',
            '&:hover': {
              backgroundColor: isSelected ? '#d1e9ff' : '#f8fafc'
            }
          }}
          onClick={() => setSelectedNode({ ...node, isDirectPart: isDirectPart })}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
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
              {isDirectPart && (
                <span style={{ 
                  fontSize: '0.6875rem', 
                  background: 'linear-gradient(135deg, #10b981, #059669)', 
                  color: 'white', 
                  padding: '0.125rem 0.5rem', 
                  borderRadius: '4px', 
                  textTransform: 'uppercase', 
                  fontWeight: '600',
                  flexShrink: 0
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
    style={{ background: '#dbeafe', color: '#2563eb', border: '1px solid #93c5fd', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
    title="Add Subassembly">
    <Layers size={14} />
  </button>
)}
            {/* Show add part button for assemblies (not direct parts) */}
            {!isDirectPart && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleAddPart(node.id); }}
                style={{ background: '#d1fae5', color: '#059669', border: '1px solid #6ee7b7', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                title="Add Part">
                <Plus size={14} />
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); handleEdit(node, isDirectPart); }}
              style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Edit2 size={14} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDelete(node.id, node.type, isDirectPart); }}
              style={{ background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Trash2 size={14} />
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
    if (!searchTerm.trim()) return items;
    
    const term = searchTerm.toLowerCase();
    
    return items.filter(item => {
      // Check if current item matches
      const itemMatches = item.name.toLowerCase().includes(term) || 
                         item.type.toLowerCase().includes(term);
      
      // Check if any child matches (recursively)
      const childrenMatch = item.parts && item.parts.length > 0 ? 
                          searchInTree(item.parts, searchTerm).length > 0 : false;
      
      return itemMatches || childrenMatch;
    }).map(item => {
      // If item itself matches, return it with all its children
      if (item.name.toLowerCase().includes(term) || item.type.toLowerCase().includes(term)) {
        return { ...item };
      }
      // If only children match, return the item with only matching children
      return {
        ...item,
        parts: searchInTree(item.parts || [], searchTerm)
      };
    });
  };

  const filteredAssemblies = searchTerm 
    ? searchInTree([...currentProject.assemblies], searchTerm)
    : currentProject.assemblies;

  const paginatedDirectParts = getPaginatedItems(
    currentProject.directParts || [], 
    currentPage.directParts, 
    'directParts'
  );

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
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = type === 'PDF' ? '.pdf' : '.step,.stp';
                input.onchange = (e) => onUpload(e.target.files[0]);
                input.click();
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
        border: '1px solid #e2e8f0'
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
        border: '1px solid #e2e8f0'
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
        border: '1px solid #e2e8f0'
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
              <div style={{ 
                border: `2px solid #dc2626`,
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  padding: '1rem',
                  borderBottom: `1px solid #dc262620`,
                  background: '#fef2f2'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      padding: '0.5rem', 
                      background: '#dc2626', 
                      borderRadius: '6px',
                      color: 'white'
                    }}>
                      <FileText size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        fontSize: '0.9375rem', 
                        color: '#dc2626', 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {doc.title}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem',
                        color: '#dc2626',
                        marginTop: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        2D Document • {doc.file_format?.toUpperCase() || 'PDF'}
                        {doc.pdf_content_type === 'scanned' && (
                          <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '600' }}>OCR</span>
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
                  
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    {doc.download_url ? (
                      <>
                        <button
                          onClick={() => {
                            console.log('📥 Downloading 2D document:', doc.title);
                            window.open(`http://172.18.100.26:8986${doc.download_url}`, '_blank');
                          }}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '0.5rem',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.8125rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem'
                          }}
                        >
                          <Download size={14} /> Download
                        </button>
                        <button
                          onClick={() => setPreviewDoc({ doc, type: '2D' })}
                          style={{
                            flex: 1,
                            minWidth: '80px',
                            padding: '0.5rem',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
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
              <div style={{ 
                border: `2px solid #2563eb`,
                borderRadius: '8px',
                overflow: 'hidden',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div style={{ 
                  padding: '1rem',
                  borderBottom: `1px solid #2563eb20`,
                  background: '#eff6ff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      padding: '0.5rem', 
                      background: '#2563eb', 
                      borderRadius: '6px',
                      color: 'white'
                    }}>
                      <Box size={20} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        fontSize: '0.9375rem', 
                        color: '#2563eb', 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {doc.title}
                      </div>
                      <div style={{ 
                        fontSize: '0.75rem',
                        color: '#2563eb',
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
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.8125rem',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem'
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
                            background: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
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
    if (type === '2D') return '#dc2626'; // Red border for 2D like in image
    return '#3b82f6'; // Blue border for 3D like in image
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
            e.target.style.backgroundColor = color === '#dc2626' ? '#b91c1c' : '#2563eb';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = color;
          }}
        >
          <Download size={14} />
          Download
        </a>
        
        <button
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
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f3f4f6', fontFamily: 'system-ui' }}>
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
        <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
            <span 
              style={{ color: '#6b7280', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={handleBackToProjects}
            >
              Projects
            </span>
            <span style={{ color: '#6b7280' }}>/</span>
            <span style={{ color: '#2563eb', fontWeight: '600' }}>{currentProject.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            
            <button onClick={handleAddAssembly} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}>
              <Plus size={16} /> Add Assembly
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem', padding: '1.5rem', height: 'calc(100vh - 80px)' }}>
          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb', fontWeight: '600' }}>
              {currentProject.name}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <div onClick={() => toggleNode('direct-parts')} style={{ padding: '0.75rem 1rem', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>



                    {expandedNodes.has('direct-parts') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                    <span>Direct Parts</span>
                    <span style={{ background: 'rgba(255,255,255,0.25)', padding: '0.125rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                      {(currentProject.directParts || []).length}
                    </span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleAddDirectPart(); }} style={{ background: 'white', color: '#059669', border: 'none', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Plus size={16} strokeWidth={3} />
                  </button>
                </div>
                {expandedNodes.has('direct-parts') && (
                  <div style={{ background: 'white' }}>
                    {(currentProject.directParts || []).length > 0 ? (
                      <>
                        {paginatedDirectParts.map(p => (
                          <TreeNode key={p.id} node={p} level={0} isLast={false} parentPath={[]} isDirectPart={true} searchTerm={searchTerm} />
                        ))}
                        <Pagination 
                          current={currentPage.directParts}
                          total={(currentProject.directParts || []).length}
                          onPageChange={handlePageChange}
                          type="directParts"
                        />
                      </>
                    ) : (
                                            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
                        No direct parts yet. Click + to add one.
                      </div>
                    )}
                  </div>
                  
                )}





















                {selectedNode?.type === 'subassembly-document' && (
  <div>
    {/* Header Section */}
    <div style={{ 
      padding: '1.25rem 1.5rem',
      borderBottom: '1px solid #e5e7eb',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0 }}>
        <div style={{
          width: '28px',
          height: '28px',
          marginRight: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {selectedNode.doc_type === '2D' ? (
            <FileText size={20} style={{ color: '#dc2626' }} />
          ) : (
            <Box size={20} style={{ color: '#3b82f6' }} />
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <h3 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: '#111827', 
              marginBottom: '0.5rem' 
            }}>
              {selectedNode.title}
            </h3>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              <span style={{ 
                fontSize: '0.6875rem', 
                background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                color: 'white', 
                padding: '0.125rem 0.5rem', 
                borderRadius: '4px', 
                textTransform: 'uppercase',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}>
                {selectedNode.doc_type}
              </span>
              <span style={{ 
                fontSize: '0.6875rem', 
                background: 'linear-gradient(135deg, #6b7280, #4b5563)', 
                color: 'white', 
                padding: '0.125rem 0.5rem', 
                borderRadius: '4px', 
                textTransform: 'uppercase',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}>
                SUBASSEMBLY
              </span>
            </div>
          </div>
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#6b7280', 
            marginTop: '0.25rem' 
          }}>
            Version {selectedNode.version_no} • {selectedNode.file_format?.toUpperCase()} • Created {new Date(selectedNode.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>

    {/* Document Content */}
    <div style={{ padding: '1.5rem' }}>
      <div style={{ 
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #f3f4f6',
          backgroundColor: '#f9fafb'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.125rem',
            fontWeight: '600',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {selectedNode.doc_type === '2D' ? (
              <FileText size={20} color="#dc2626" />
            ) : (
              <Box size={20} color="#3b82f6" />
            )}
            Document Details
          </h3>
        </div>
        
        <div style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Document Type
              </label>
              <div style={{ padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem' }}>
                {selectedNode.doc_type}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                File Format
              </label>
              <div style={{ padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem' }}>
                {selectedNode.file_format?.toUpperCase()}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Version
              </label>
              <div style={{ padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem' }}>
                {selectedNode.version_no}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.25rem' }}>
                Created Date
              </label>
              <div style={{ padding: '0.5rem', backgroundColor: '#f9fafb', borderRadius: '6px', fontSize: '0.875rem' }}>
                {new Date(selectedNode.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <a
              href={`http://172.18.100.26:8986${selectedNode.download_url}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                backgroundColor: selectedNode.doc_type === '2D' ? '#dc2626' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: '500',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <Download size={16} />
              Download Document
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
)}
              </div>

           <div>
  <div style={{ display: 'flex', alignItems: 'center', background: 'linear-gradient(135deg, #667eea, #764ba2)', padding: '0.75rem 1rem', color: 'white', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase' }}>
    <div 
      onClick={() => toggleNode('assemblies')} 
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}
    >
      {expandedNodes.has('assemblies') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
      <span>Assemblies</span>
      <span style={{ background: 'rgba(255,255,255,0.25)', padding: '0.125rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem' }}>
        {currentProject.assemblies.length}
      </span>
    </div>
    {/* <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          handleAddAssembly();
        }}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '4px',
          padding: '0.25rem 0.5rem',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontWeight: '500'
        }}
        title="Add Assembly"
      >
        <Plus size={14} />
        <span>Add Assembly</span>
      </button>
    </div> */}
    <div style={{ position: 'relative', marginLeft: '1rem' }}>
      <input
        type="text"
        placeholder="Search assemblies..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '0.25rem 0.5rem',
          paddingRight: '1.5rem',
          borderRadius: '4px',
          border: 'none',
          fontSize: '0.75rem',
          width: '180px',
          color: '#333',
          backgroundColor: 'rgba(255, 255, 255, 0.9)'
        }}
      />
      {searchTerm && (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSearchTerm('');
          }}
          style={{
            position: 'absolute',
            right: '0.5rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#666',
            padding: '0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>
      )}
    </div>
  </div>

{expandedNodes.has('assemblies') && (
  <div style={{ background: 'white', padding: '0.5rem 0' }}>
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
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowY: 'auto' }}>
            {selectedNode ? (
              <div>
                {/* Header Section */}
                <div style={{ 
                  padding: '1.25rem 1.5rem',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0 }}>
                    {selectedNode.type === 'part' ? 
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
                      </div> : 
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
                      
                    }
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <h3 style={{ 
                          fontSize: '1.125rem', 
                          fontWeight: '600', 
                          color: '#111827', 
                          marginBottom: '0.5rem' 
                        }}>
                          {selectedNode.name}
                        </h3>
                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                          
                          {selectedNode.isDirectPart && (
                            <span style={{ 
                              fontSize: '0.6875rem', 
                              background: 'linear-gradient(135deg, #10b981, #059669)', 
                              color: 'white', 
                              padding: '0.125rem 0.5rem', 
                              borderRadius: '4px', 
                              textTransform: 'uppercase',
                              fontWeight: '600',
                              whiteSpace: 'nowrap'
                            }}>
                              DIRECT
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0, alignItems: 'center' }}>
                    {(selectedNode.isDirectPart || selectedNode.type === 'part') && (
                      <button
                        onClick={() => handleCreateInspectionPlan(selectedNode)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.5rem 1rem',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#e5e7eb',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          fontWeight: '600'
                        }}
                        title="Create Inspection Plan"
                      >
                        <ClipboardCheck size={18} /> Create Inspection Plan
                      </button>
                    )}
                    <button 
                      onClick={() => handleEdit(selectedNode, selectedNode.isDirectPart)}
                      style={{
                        padding: '0.25rem',
                        background: '#fef3c7',
                        color: '#d97706',
                        border: '1px solid #fcd34d',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px'
                      }}
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(selectedNode.id, selectedNode.type, selectedNode.isDirectPart)}
                      style={{
                        padding: '0.25rem',
                        background: '#fee2e2',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px'
                      }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
{/* Enhanced Universal Documents Display - Works for Assembly, Subassembly, and Parts */}
                       

                {/* Content Section */}
                <div style={{ padding: '1.5rem' }}>
                  {/* Information Card */}
                  <div style={{ 
                    background: 'white',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    overflow: 'hidden',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                  }}>
                    {/* Header */}
                    <div style={{
                      padding: '1.25rem 1.5rem',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: '#f9fafb'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        color: '#111827',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        {selectedNode.type === 'part' ? (
                          <Box size={20} color="#4f46e5" />
                        ) : (
                          <Layers size={20} color="#7c3aed" />
                        )}
                        {selectedNode.name}
                      </h3>
                      {selectedNode.isDirectPart && (
                        <span style={{
                          fontSize: '0.6875rem',
                          background: 'linear-gradient(135deg, #10b981, #059669)',
                          color: 'white',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '9999px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Direct Part
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1.5rem' }}>
                      {/* Part Number */}
                      {selectedNode.partNumber && (
                        <div style={{ 
                          marginBottom: '1.5rem',
                          padding: '0.75rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: '#e0f2fe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <span style={{ 
                              color: '#0369a1',
                              fontWeight: '600',
                              fontSize: '0.875rem'
                            }}>#</span>
                          </div>
                          <div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#64748b',
                              marginBottom: '0.125rem',
                              fontWeight: '500'
                            }}>Part Number</div>
                            <div style={{
                              fontSize: '0.9375rem',
                              color: '#0f172a',
                              fontWeight: '600',
                              fontFamily: 'monospace',
                              letterSpacing: '0.3px'
                            }}>{selectedNode.partNumber}</div>
                          </div>
                        </div>
                      )}

                      {/* Details Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                        gap: '1.25rem',
                        marginBottom: '1.5rem'
                      }}>
                        {/* Item Type */}
                        <div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            marginBottom: '0.375rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.375rem'
                          }}>
                            <span>Item Type</span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.9375rem',
                            color: '#0f172a',
                            fontWeight: '500'
                          }}>
                            {selectedNode.type === 'part' ? (
                              <>
                                <Box size={16} color="#4f46e5" />
                                <span>Part</span>
                              </>
                            ) : (
                              <>
                                <Layers size={16} color="#7c3aed" />
                                <span>Assembly</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Child Items */}
                        {(selectedNode.parts || selectedNode.isDirectPart || selectedNode.type === 'part') && (
                          <div>
                            <div style={{
                              fontSize: '0.75rem',
                              color: '#64748b',
                              marginBottom: '0.375rem',
                              fontWeight: '500'
                            }}>
                              Components
                            </div>

                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.9375rem',
                              color: '#0f172a',
                              fontWeight: '500'
                            }}>
                              <Layers size={16} color="#64748b" />
                              <span>{(selectedNode.parts || []).length} items</span>
                            </div>
                         </div>
                        )}
                      </div>

                        {selectedNode && (
                          <div key={`docs-${selectedNode.id}-${nodeDocuments?.length || 0}`} style={{ marginBottom: '1.5rem' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '1rem',
                              padding: '0.75rem 1rem',
                              backgroundColor: '#f8fafc',
                              borderRadius: '8px',
                              border: '1px solid #e2e8f0'
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
                                {selectedNode.isDirectPart ? 'Direct Part Documents' : 
                                 selectedNode.type === 'part' ? 'Part Documents' : 
                                 'Assembly Documents'} 
                                (ID: {selectedNode.id})
                              </h4>
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                                {nodeDocuments?.length || 0} document(s)
                              </span>
                            </div>
                            
                            {/* Show loading state */}
                            {documentsLoading ? (
                              <div style={{
                                padding: '2rem',
                                textAlign: 'center',
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                                  Loading documents...
                                </div>
                              </div>
                            ) : nodeDocuments && nodeDocuments.length > 0 ? (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                {nodeDocuments.map((doc, idx) => (
                                    <React.Fragment key={doc.id || idx}>
                                      {/* 2D Document Card */}
                                      {doc.doc_type === '2D' && (
                                        <div style={{ 
                                          border: `2px solid #dc2626`,
                                          borderRadius: '8px',
                                          overflow: 'hidden',
                                          background: 'white',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}>
                                          <div style={{ 
                                            padding: '1rem',
                                            borderBottom: `1px solid #dc262620`,
                                            background: '#fef2f2'
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                              <div style={{ 
                                                padding: '0.5rem', 
                                                background: '#dc2626', 
                                                borderRadius: '6px',
                                                color: 'white'
                                              }}>
                                                <FileText size={20} />
                                              </div>
                                              <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ 
                                                  fontWeight: '600', 
                                                  fontSize: '0.9375rem', 
                                                  color: '#dc2626', 
                                                  whiteSpace: 'nowrap',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis'
                                                }}>
                                                  {doc.title}
                                                </div>
                                                <div style={{ 
                                                  fontSize: '0.75rem',
                                                  color: '#dc2626',
                                                  marginTop: '0.25rem',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  gap: '0.25rem'
                                                }}>
                                                  2D Document • {doc.file_format?.toUpperCase() || 'PDF'}
                                                  {doc.pdf_content_type === 'scanned' && (
                                                    <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: '600' }}>OCR</span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Document Details - Version, Size, Date */}
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
                                              <button
                                                onClick={() => {
                                                  console.log('📥 Downloading 2D document:', doc.title);
                                                  window.open(`http://172.18.100.26:8986${doc.download_url}`, '_blank');
                                                }}
                                                style={{
                                                  flex: 1,
                                                  minWidth: '80px',
                                                  padding: '0.5rem',
                                                  background: '#dc2626',
                                                  color: 'white',
                                                  border: 'none',
                                                  borderRadius: '6px',
                                                  fontSize: '0.8125rem',
                                                  fontWeight: '500',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '0.375rem'
                                                }}
                                              >
                                                <Download size={14} /> Download
                                              </button>
                                              <button
                                                onClick={() => setPreviewDoc({ doc, type: '2D' })}
                                                style={{
                                                  flex: 1,
                                                  minWidth: '80px',
                                                  padding: '0.5rem',
                                                  background: '#dc2626',
                                                  color: 'white',
                                                  border: 'none',
                                                  borderRadius: '6px',
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
                                              <button
                                                onClick={() => {
                                                  console.log('📤 New version for 2D document:', doc.title);
                                                  // TODO: Implement new version functionality
                                                }}
                                                style={{
                                                  flex: 1,
                                                  minWidth: '80px',
                                                  padding: '0.5rem',
                                                  background: 'white',
                                                  color: '#dc2626',
                                                  border: '2px solid #dc2626',
                                                  borderRadius: '6px',
                                                  fontSize: '0.8125rem',
                                                  fontWeight: '500',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '0.375rem'
                                                }}
                                              >
                                                <Upload size={14} /> New Version
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* 3D Document Card */}
                                      {doc.doc_type === '3D' && (
                                        <div style={{ 
                                          border: `2px solid #2563eb`,
                                          borderRadius: '8px',
                                          overflow: 'hidden',
                                          background: 'white',
                                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                        }}>
                                          <div style={{ 
                                            padding: '1rem',
                                            borderBottom: `1px solid #2563eb20`,
                                            background: '#eff6ff'
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                              <div style={{ 
                                                padding: '0.5rem', 
                                                background: '#2563eb', 
                                                borderRadius: '6px',
                                                color: 'white'
                                              }}>
                                                <Box size={20} />
                                              </div>
                                              <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ 
                                                  fontWeight: '600', 
                                                  fontSize: '0.9375rem', 
                                                  color: '#2563eb', 
                                                  whiteSpace: 'nowrap',
                                                  overflow: 'hidden',
                                                  textOverflow: 'ellipsis'
                                                }}>
                                                  {doc.title}
                                                </div>
                                                <div style={{ 
                                                  fontSize: '0.75rem',
                                                  color: '#2563eb',
                                                  marginTop: '0.25rem'
                                                }}>
                                                  3D Document • {doc.file_format?.toUpperCase() || 'STEP'}
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Document Details - Version, Size, Date */}
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
                                              <button
                                                onClick={() => {
                                                  console.log('📥 Downloading 3D document:', doc.title);
                                                  window.open(`http://172.18.100.26:8986${doc.download_url}`, '_blank');
                                                }}
                                                style={{
                                                  flex: 1,
                                                  minWidth: '80px',
                                                  padding: '0.5rem',
                                                  background: '#2563eb',
                                                  color: 'white',
                                                  border: 'none',
                                                  borderRadius: '6px',
                                                  fontSize: '0.8125rem',
                                                  fontWeight: '500',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '0.375rem'
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
                                                  background: '#2563eb',
                                                  color: 'white',
                                                  border: 'none',
                                                  borderRadius: '6px',
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
                                              <button
                                                onClick={() => {
                                                  console.log('📤 New version for 3D document:', doc.title);
                                                  // TODO: Implement new version functionality
                                                }}
                                                style={{
                                                  flex: 1,
                                                  minWidth: '80px',
                                                  padding: '0.5rem',
                                                  background: 'white',
                                                  color: '#2563eb',
                                                  border: '2px solid #2563eb',
                                                  borderRadius: '6px',
                                                  fontSize: '0.8125rem',
                                                  fontWeight: '500',
                                                  cursor: 'pointer',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  gap: '0.375rem'
                                                }}
                                              >
                                                <Upload size={14} /> New Version
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </React.Fragment>
                                  ))}
                              </div>
                            ) : (
                              <div style={{
                                padding: '2rem',
                                textAlign: 'center',
                                backgroundColor: '#f8fafc',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0'
                              }}>
                                <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                                  No documents found for {selectedNode.isDirectPart ? 'direct part' : selectedNode.type === 'part' ? 'part' : 'assembly'} "{selectedNode.name}"
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                                  {selectedNode.isDirectPart ? 'Part ID' : selectedNode.type === 'part' ? 'Part ID' : 'Assembly ID'}: {selectedNode.id} • 
                                  Check if documents exist with this {selectedNode.isDirectPart ? 'part_id' : selectedNode.type === 'part' ? 'part_id' : 'assembly_id'}
                                </div>
                              </div>
                            )}
                          </div>
                        )}




{/* 
                                         {(selectedNode.type === 'assembly' || selectedNode.type === 'part') && (
<DocumentsSection 
  assemblyId={selectedNode.id} 
  isDirectPart={selectedNode.isDirectPart} 
  partId={selectedNode.isDirectPart ? selectedNode.id : null}
/>
)}
     */}

                   

                      {/* Action Buttons */}
                      <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        paddingTop: '1rem',
                        borderTop: '1px solid #f1f5f9'
                      }}>
                       
                       
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6b7280' }}>
                <Box size={64} style={{ margin: '0 auto 1.5rem', color: '#d1d5db' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>No Item Selected</h3>
                <p style={{ fontSize: '0.9375rem', color: '#6b7280' }}>Choose an assembly or part from the tree to view its details</p>
              </div>
            )}
          </div>
        </div>
      </div>

         {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ 
            background: 'white', 
            borderRadius: '12px', 
            width: '100%', 
            maxWidth: '600px', 
            maxHeight: '90vh', 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} />
                
                {modalData.editId ? (
                  modalData.type === 'part' ? (
                    modalData.isDirectPart ? 'Edit Direct Part' : 'Edit '
                  ) : (
                    modalData.parent_assembly_id ? 'Edit Sub' : 'Edit '
                  )
                ) : (
                  modalData.parent_assembly_id ? 'Add Sub' : 'Add'
                )} {modalData.type === 'part' ? (modalData.isDirectPart ? 'Direct Part' : 'Part') : 'Assembly'}
              </h3>
            
            {/* Scrollable Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* Basic Information */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Basic Information
                </h4>
                
             <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>Name *</label>
                    <input 
                      type="text" 
                      value={modalData.name} 
                      onChange={(e) => setModalData({...modalData, name: e.target.value})} 
                      placeholder="Enter name" 
                      autoFocus 
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }} 
                    />
                  </div>
                  
                  {modalData.type === 'part' && (
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>Quantity *</label>
                      <input 
                        type="number" 
                        min={1}
                        value={modalData.quantity ?? 1} 
                        onChange={(e) => setModalData({...modalData, quantity: e.target.value === '' ? 1 : Math.max(1, parseInt(e.target.value, 10) || 1)})} 
                        placeholder="1" 
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }} 
                      />
                    </div>
                  )}
                  
                  {/* <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>Part Number</label>
                    <input 
                      type="text" 
                      value={modalData.partNumber} 
                      onChange={(e) => setModalData({...modalData, partNumber: e.target.value})} 
                      placeholder="Enter part number" 
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }} 
                    />
                  </div> */}
                </div>
              </div>

              {/* API Fields */}
              <div style={{ marginBottom: '1.5rem' }}>
                {/* <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  API Configuration
                </h4> */}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>Project ID</label>
                    <input 
                      type="text" 
                      value={modalData.project_id} 
                      onChange={(e) => setModalData({...modalData, project_id: e.target.value})} 
                      placeholder="Project ID" 
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#f9fafb' }}
                      readOnly
                    />
                  </div>
                  
                 <div>
  <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>Parent Assembly ID</label>
  <input 
    type="text" 
    value={modalData.parent_assembly_id || ''} 
    onChange={(e) => setModalData({...modalData, parent_assembly_id: e.target.value || null})} 
    placeholder="Optional" 
    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
    readOnly={modalData.type === 'assembly' && !modalData.editId}  // Make read-only for new assemblies
    title={modalData.type === 'assembly' && !modalData.editId ? "Parent assembly is set automatically when adding sub-assemblies" : ""}
  />
</div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>Assembly ID</label>
                    <input 
                      type="text" 
                      value={modalData.id || ''} 
                      onChange={(e) => setModalData({...modalData, id: e.target.value || null})} 
                      placeholder="Optional" 
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem' }}
                    />
                  </div> */}
                  
                  {/* <div>
                    <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>Created At</label>
                    <input 
                      type="text" 
                      value={modalData.created_at || ''} 
                      onChange={(e) => setModalData({...modalData, created_at: e.target.value})} 
                      placeholder="Auto-generated" 
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.875rem', backgroundColor: '#f9fafb' }}
                      readOnly
                    />
                  </div> */}
                </div>
              </div>

              {/* File Upload Section */}
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  File Attachments
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* PDF Upload */}
                  <div>
                     <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>
    2D Drawing (PDF)
    {modalData.type === 'part' && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
  </label>
  
  {/* Show existing PDF if editing */}
  {modalData.editId && modalData.existingPdf && (
    <div style={{ 
      marginBottom: '0.5rem',
      padding: '0.5rem',
      backgroundColor: '#f0fdf4',
      border: '1px solid #10b981',
      borderRadius: '6px',
      fontSize: '0.75rem',
      color: '#059669'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FileText size={16} />
        <span>Current: {modalData.existingPdf.title || 'PDF Document'}</span>
        <a 
          href={`http://172.18.100.26:8986${modalData.existingPdf.download_url}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#059669', textDecoration: 'underline', marginLeft: 'auto' }}
        >
          View
        </a>
      </div>
    </div>
  )}
                    <div style={{ 
                      border: '2px dashed #d1d5db', 
                      borderRadius: '8px', 
                      padding: '1rem', 
                      textAlign: 'center',
                      backgroundColor: modalData.pdfFile ? '#f0fdf4' : '#f9fafb',
                      transition: 'all 0.2s',
                      borderColor: modalData.pdfFile ? '#10b981' : '#d1d5db',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <input 
                        type="file" 
                        id="pdf-upload"
                        accept=".pdf" 
                        onChange={(e) => setModalData({...modalData, pdfFile: e.target.files[0]})} 
                        style={{ display: 'none' }} 
                      />
                      <label 
                        htmlFor="pdf-upload" 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          cursor: 'pointer',
                          color: modalData.pdfFile ? '#059669' : '#6b7280',
                          width: '100%'
                        }}
                      >
                        <FileText size={20} style={{ marginBottom: '0.25rem' }} />
                        {modalData.pdfFile ? (
                          <span style={{ fontSize: '0.75rem', textAlign: 'center' }}>{modalData.pdfFile.name}</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem' }}>Click to upload</span>
                        )}
                      </label>
                    </div>
                    {/* 2D PDF type: Normal (text layer) vs Scanned (OCR for annotations) */}
                    <div style={{ marginTop: '0.5rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', fontSize: '0.75rem', color: '#6b7280' }}>
                        2D PDF type
                      </label>
                      <select
                        value={modalData.pdf_content_type_2d || 'normal'}
                        onChange={(e) => setModalData({ ...modalData, pdf_content_type_2d: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.375rem 0.5rem',
                          fontSize: '0.8125rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          backgroundColor: '#fff',
                          color: '#374151'
                        }}
                      >
                        <option value="normal">Normal (text layer)</option>
                        <option value="scanned">Scanned (OCR)</option>
                      </select>
                    </div>
                  </div>

                  {/* STEP File Upload */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.875rem', color: '#374151' }}>
                      3D Model (STEP)
                      {modalData.type === 'part' && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
                    </label>
                    <div style={{ 
                      border: '2px dashed #d1d5db', 
                      borderRadius: '8px', 
                      padding: '1rem', 
                      textAlign: 'center',
                      backgroundColor: modalData.stepFile ? '#f0fdf4' : '#f9fafb',
                      transition: 'all 0.2s',
                      borderColor: modalData.stepFile ? '#10b981' : '#d1d5db',
                      minHeight: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <input 
                        type="file" 
                        id="step-upload"
                        accept=".step,.stp" 
                        onChange={(e) => setModalData({...modalData, stepFile: e.target.files[0]})} 
                        style={{ display: 'none' }} 
                      />
                      <label 
                        htmlFor="step-upload" 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          cursor: 'pointer',
                          color: modalData.stepFile ? '#059669' : '#6b7280',
                          width: '100%'
                        }}
                      >
                        <Box size={20} style={{ marginBottom: '0.25rem' }} />
                        {modalData.stepFile ? (
                          <span style={{ fontSize: '0.75rem', textAlign: 'center' }}>{modalData.stepFile.name}</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem' }}>Click to upload</span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div style={{ 
              padding: '1rem 1.5rem', 
              borderTop: '1px solid #e5e7eb', 
              background: '#f9fafb',
              display: 'flex', 
              justifyContent: 'flex-end', 
              gap: '0.75rem' 
            }}>
              <button 
                onClick={() => setShowModal(false)} 
                style={{ 
                  padding: '0.5rem 1rem', 
                  background: 'white', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontWeight: '500',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
               disabled={!modalData.name.trim() || (modalData.type === 'part' && !modalData.isDirectPart && (!modalData.pdfFile || !modalData.stepFile))}
                style={{ 
                  padding: '0.5rem 1.5rem', 
                  backgroundColor: !modalData.name.trim() || (modalData.type === 'part' && (!modalData.pdfFile || !modalData.stepFile)) ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: !modalData.name.trim() || (modalData.type === 'part' && (!modalData.pdfFile || !modalData.stepFile)) ? 'not-allowed' : 'pointer', 
                  opacity: !modalData.name.trim() || (modalData.type === 'part' && (!modalData.pdfFile || !modalData.stepFile)) ? 0.7 : 1,
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                {assemblyLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '16px', height: '16px', border: '2px solid white', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    Creating...
                  </span>
                ) : (
                  modalData.editId ? 'Update' : 'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal (2D PDF / 3D STEP) */}
      {previewDoc && (
        <div
          onClick={() => setPreviewDoc(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '1rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: previewDoc.type === '2D' ? '900px' : '800px',
              maxHeight: '90vh',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f9fafb'
            }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#374151' }}>
                {previewDoc.type === '2D' ? '2D' : '3D'} Preview: {previewDoc.doc?.title}
              </h3>
              <button
                onClick={() => setPreviewDoc(null)}
                style={{
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                aria-label="Close preview"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '1rem', minHeight: '400px' }}>
              {previewDoc.type === '2D' && previewDoc.doc?.download_url && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', minHeight: '500px' }}>
                  <PDFViewer
                    pdfData={`http://172.18.100.26:8986${previewDoc.doc.download_url}`}
                    currentPage={1}
                    scale={1.2}
                  />
                </div>
              )}
              {previewDoc.type === '3D' && (previewDoc.doc?.preview_3d_url || previewDoc.doc?.download_url) && (() => {
                const doc = previewDoc.doc;
                const versionId = doc.version_id ?? doc.download_url?.match(/\/versions\/(\d+)\//)?.[1];
                const preview3dUrl = doc.preview_3d_url || (versionId ? `/api/v1/documents/versions/${versionId}/preview-3d` : null) || doc.download_url;
                return (
                  <div style={{ height: '500px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                    <StepViewer
                      fileUrl={`http://172.18.100.26:8986${preview3dUrl}`}
                      style={{ height: '100%' }}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assembly;