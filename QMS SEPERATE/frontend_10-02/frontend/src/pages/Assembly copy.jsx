// d:\Project_management\my-app\src\pages\Assembly.jsx
import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Layers, Edit2, Trash2, Plus, ChevronRight, ChevronDown, Box, Package, Menu, FileText, Download, Upload, Square, Folder } from 'lucide-react';
import { NavContext } from '../App';
import useProjectStore from '../store/projectCreation';
import useAssemblyStore from '../store/assembly'; // Add this import
import StepViewer from '../components/StepViewer';
// import { useEffect } from 'react';


const Assembly = () => {
  const navigate = useNavigate();
  const { setActiveNav } = useContext(NavContext);
  
  // Use Zustand stores
  const { 
    selectedProject, 
    projectDetails,
    loading: projectLoading,
    error: projectError
  } = useProjectStore();
const {
  createAssembly,
  updateAssembly,
  deleteAssembly,
  uploadDocument,
  fetchAllAssemblies,
  fetchDocuments,  // Add this
  loading: assemblyLoading,
  error: assemblyError
} = useAssemblyStore();
  
const [documents, setDocuments] = useState([]);

const [sidebarOpen, setSidebarOpen] = useState(true);
const [expandedNodes, setExpandedNodes] = useState(new Set(['direct-parts', 'assemblies']));
const [selectedNode, setSelectedNode] = useState(null);
const [showModal, setShowModal] = useState(false);
// Initialize with project details when available - MOVE THIS HERE
// Replace the current initialization (lines 41-46) with:
const [currentProject, setCurrentProject] = useState({
  id: null,
  name: 'Loading...',
  assemblies: [],
  directParts: []
});

// Update the assembly fetching useEffect to depend on selectedProject instead of currentProject
useEffect(() => {
  const fetchAssemblies = async () => {
    // Only fetch if we have a valid selected project
    if (!selectedProject || !selectedProject.id) {
      return;
    }
    
    try {
      const assemblies = await fetchAllAssemblies();
      const currentProjectAssemblies = assemblies.filter(assembly => 
        assembly.project_id === selectedProject.id || 
        assembly.project_id === parseInt(selectedProject.id)
      );
      
      setCurrentProject(prev => ({
        ...prev,
        assemblies: currentProjectAssemblies
      }));
    } catch (error) {
      console.error('Failed to fetch assemblies:', error);
    }
  };
  
  fetchAssemblies();
}, [selectedProject?.id, fetchAllAssemblies]); // Changed from currentProject.id

const [modalData, setModalData] = useState({
  name: '', 
  project_id: currentProject.id,  // This will work now
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


// Update currentProject when projectDetails changes
useEffect(() => {
  if (projectDetails) {
    setCurrentProject(prev => ({
      ...prev,
      id: selectedProject?.id || prev.id,
      name: selectedProject?.name || prev.name,
      assemblies: projectDetails.assemblies || prev.assemblies,
      directParts: projectDetails.directParts || prev.directParts
    }));
  }
}, [projectDetails, selectedProject]);
// Fetch assemblies when component mounts


useEffect(() => {
  const fetchAssemblies = async () => {
    try {
      const assemblies = await fetchAllAssemblies();
      console.log('Fetched assemblies in component:', assemblies);
        
      // Filter assemblies for current project
      const currentProjectAssemblies = assemblies.filter(assembly => 
        assembly.project_id === currentProject.id || 
        assembly.project_id === parseInt(currentProject.id)
      ).map(assembly => ({
        ...assembly,
        type: assembly.type || 'assembly', // Ensure type is always set
        parts: assembly.parts || [] // Ensure parts array exists
      }));
        
      console.log('Filtered assemblies for current project:', currentProjectAssemblies);
        
      // Update currentProject with fetched assemblies
      setCurrentProject(prev => ({
        ...prev,
        assemblies: currentProjectAssemblies
      }));
    } catch (error) {
      console.error('Failed to fetch assemblies:', error);
    }
  };
  if (currentProject.id) {
    fetchAssemblies();
  }
}, [currentProject.id, fetchAllAssemblies]);

// Fetch documents when component mounts
useEffect(() => {
  const fetchDocs = async () => {
    try {
      const docs = await fetchDocuments();
     console.log('Fetched documents in component:', docs);
console.log('Documents structure:', JSON.stringify(docs, null, 2));
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    }
  };
  
  fetchDocs();
}, [fetchDocuments]);

const getAssemblyDocuments = (assemblyId) => {
  console.log('Getting documents for assembly ID:', assemblyId);
  console.log('Available documents:', documents);
  
  if (!assemblyId) {
    console.log('No assemblyId provided');
    return [];
  }
  
  // Get API documents
  const apiDocuments = documents ? documents.filter(doc => 
    doc.assembly_id === assemblyId || 
    doc.assembly_id === parseInt(assemblyId)
  ) : [];
  
  // Get local files from selectedNode
  const localDocuments = [];
  
  if (selectedNode && selectedNode.id === assemblyId && selectedNode.files) {
    if (selectedNode.files.pdf) {
      localDocuments.push({
        id: `local_pdf_${assemblyId}`,
        title: selectedNode.files.pdf.name,
        doc_type: '2D',
        file_format: 'pdf',
        version_no: selectedNode.files.pdf.version || 1,
        created_at: selectedNode.files.pdf.uploadedAt || new Date().toISOString(),
        size: selectedNode.files.pdf.size,
        download_url: selectedNode.files.pdf.url
      });
    }
    
    if (selectedNode.files.step) {
      localDocuments.push({
        id: `local_step_${assemblyId}`,
        title: selectedNode.files.step.name,
        doc_type: '3D',
        file_format: 'step',
        version_no: selectedNode.files.step.version || 1,
        created_at: selectedNode.files.step.uploadedAt || new Date().toISOString(),
        size: selectedNode.files.step.size,
        download_url: selectedNode.files.step.url
      });
    }
  }
  
  // Combine both sources
  const allDocuments = [...apiDocuments, ...localDocuments];
  console.log('Combined documents:', allDocuments);
  
  return allDocuments;
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
    setModalData({ name: '', partNumber: '', type: 'part', parentId: parentId, editId: null, pdfFile: null, stepFile: null, isDirectPart: false });
    setShowModal(true);
  };

  const handleAddDirectPart = () => {
    setModalData({ name: '', partNumber: '', type: 'part', parentId: null, editId: null, pdfFile: null, stepFile: null, isDirectPart: true });
    setShowModal(true);
  };

  const handleAddSubAssembly = (parentId) => {
    setModalData({ name: '', partNumber: '', type: 'sub Assembly', parentId: parentId, editId: null, pdfFile: null, stepFile: null, isDirectPart: false });
    setShowModal(true);
  };

const handleEdit = (node, isDirectPart) => {
  setModalData({ 
    name: node.name, 
    project_id: node.project_id || currentProject.id,
    parent_assembly_id: node.parent_assembly_id || null,
    id: node.id,
    created_at: node.created_at || new Date().toISOString(),
    partNumber: node.partNumber || '',
    type: node.type, 
    parentId: null, 
    editId: node.id, 
    pdfFile: null, 
    stepFile: null, 
    isDirectPart: isDirectPart,
    pdfDocType: '2D',
    stepDocType: '3D'
  });
  setShowModal(true);
};

  const findAndUpdate = (items, id, updater) => {
    return items.map(item => {
      if (item.id === id) return updater(item);
      if (item.parts) return { ...item, parts: findAndUpdate(item.parts, id, updater) };
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
  
  // Debug: Log modal data
  console.log('Modal data:', modalData);
  console.log('Project ID:', modalData.project_id);
  
  // Validate project_id
  if (!modalData.project_id || modalData.project_id === 'undefined' || modalData.project_id === '') {
    console.error('Invalid project_id:', modalData.project_id);
    return;
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
    
    if (modalData.type === 'assembly' && !modalData.isDirectPart) {
      const assemblyData = {
        name: modalData.name,
        project_id: parseInt(modalData.project_id),
        parent_assembly_id: modalData.parent_assembly_id,
        id: modalData.id,
        created_at: modalData.created_at
      };
      
     // In handleSave function, when creating a new assembly, update this part:

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
        // Preserve existing files or add new ones
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
        uploaded_by: 'current_user', // You might want to get this from auth context
        change_note: 'Document update'
      };
      
      await uploadDocument(documentData);
      console.log('Documents uploaded successfully for assembly:', updatedAssembly.id);
    } catch (uploadError) {
      console.error('Failed to upload documents:', uploadError);
      // Continue even if upload fails, but log the error
    }
  }
  
  // Update local state
  setCurrentProject(prev => ({
    ...prev,
    assemblies: [...(prev.assemblies || []), {
      ...updatedAssembly,
      type: 'assembly',
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
    }]
  }));
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
      setSelectedNode(updatedAssembly);
    } else {
      setSelectedNode({ ...updatedAssembly, isDirectPart: modalData.isDirectPart });
    }
  } catch (error) {
    console.error('Error saving assembly:', error);
    // Error is already handled in the store
  }
};

  const handleDelete = (id, type, isDirectPart) => {
    if (!window.confirm('Delete this item?')) return;
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
           {(node.type === 'assembly' || node.type === 'sub Assembly') && !isDirectPart && (
  <button onClick={(e) => { e.stopPropagation(); handleAddSubAssembly(node.id); }}
    style={{ background: '#dbeafe', color: '#2563eb', border: '1px solid #93c5fd', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
    <Layers size={14} />
  </button>
)}
            {!isDirectPart && (
              <button onClick={(e) => { e.stopPropagation(); handleAddPart(node.id); }}
                style={{ background: '#d1fae5', color: '#059669', border: '1px solid #6ee7b7', borderRadius: '4px', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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

  const paginatedAssemblies = getPaginatedItems(
    filteredAssemblies, 
    currentPage.assemblies, 
    'assemblies'
  );

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

const DocumentsSection = ({ assemblyId }) => {
  const assemblyDocuments = getAssemblyDocuments(assemblyId);
  
  if (!assemblyDocuments || assemblyDocuments.length === 0) {
    return (
      <div style={{
        padding: '1rem',
        textAlign: 'center',
        color: '#6b7280',
        fontSize: '0.875rem'
      }}>
        No documents found for this assembly
      </div>
    );
  }

  const documents2D = assemblyDocuments.filter(doc => doc.doc_type === '2D');
  const documents3D = assemblyDocuments.filter(doc => doc.doc_type === '3D');

  return (
  <div style={{ padding: '1rem' }}>
    <h4 style={{ 
      fontSize: '0.875rem', 
      fontWeight: '600', 
      marginBottom: '0.75rem',
      color: '#374151'
    }}>
      Assembly Documents
    </h4>
    
    <div style={{ 
      display: 'flex', 
      gap: '1rem',
      alignItems: 'flex-start'
    }}>
      {documents2D.length > 0 && (
        <div style={{ flex: 1 }}>
          <h5 style={{ 
            fontSize: '0.75rem', 
            fontWeight: '500', 
            marginBottom: '0.5rem',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            2D Documents
          </h5>
          {documents2D.map(doc => (
            <DocumentCard key={doc.id} document={doc} type="2D" />
          ))}
        </div>
      )}
      
      {documents3D.length > 0 && (
        <div style={{ flex: 1 }}>
          <h5 style={{ 
            fontSize: '0.75rem', 
            fontWeight: '500', 
            marginBottom: '0.5rem',
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            3D Documents
          </h5>
          {documents3D.map(doc => (
            <DocumentCard key={doc.id} document={doc} type="3D" />
          ))}
        </div>
      )}
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
      <div style={{ width: sidebarOpen ? '250px' : '60px', background: '#1f2937', color: 'white', transition: 'width 0.3s', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid #374151' }}>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.5rem' }}
          >
            <Menu size={20} />
          </button>
          {sidebarOpen && <span style={{ fontWeight: '600', fontSize: '1.125rem' }}>Assembly</span>}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', fontWeight: '600' }}>
            <span style={{ color: '#6b7280' }}>Projects</span>
            <span style={{ color: '#6b7280' }}>/</span>
            <span style={{ color: '#111827' }}>{currentProject.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              onClick={handleBackToProjects} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                color: '#4b5563',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                ':hover': {
                  backgroundColor: '#e5e7eb',
                },
              }}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
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
                      <>
                        {paginatedAssemblies.map((a, i) => (
                          <TreeNode 
                            key={a.id} 
                            node={a} 
                            level={0} 
                            isLast={i === paginatedAssemblies.length - 1} 
                            parentPath={[]} 
                            isDirectPart={false} 
                            searchTerm={searchTerm}
                          />
                        ))}
                        <Pagination 
                          current={currentPage.assemblies}
                          total={filteredAssemblies.length}
                          onPageChange={handlePageChange}
                          type="assemblies"
                        />
                      </>
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
                  <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
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
{/* API Documents */}
{getAssemblyDocuments(selectedNode.id).length > 0 && (
  <div style={{ marginBottom: '1.5rem' }}>
 
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      {getAssemblyDocuments(selectedNode.id).map((doc, idx) => (
        <React.Fragment key={doc.id || idx}>
          {/* 2D File Card */}
          {doc.file_2d_name && (
            <div style={{ 
              border: `1px solid #dc262620`,
              borderRadius: '8px',
              overflow: 'hidden',
              background: 'white'
            }}>
              <div style={{ 
                padding: '0.75rem',
                borderBottom: `1px solid #dc262620`,
                background: '#fef2f2'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    padding: '0.5rem', 
                    background: 'white', 
                    borderRadius: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <FileText size={20} style={{ color: '#dc2626' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '0.875rem', 
                      color: '#dc2626', 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      padding: '2px 0'
                    }}>
                      {doc.file_2d_name}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#dc2626',
                      marginTop: '0.125rem'
                    }}>
                      <span>2D</span>
                      <span>•</span>
                      <span>{doc.file_format_2d?.toUpperCase() || 'PDF'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    onClick={() => {
                      // Add download functionality for 2D file
                      console.log('Download 2D file:', doc.file_2d_name);
                    }}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '0.375rem 0.5rem',
                      background: 'white',
                      border: `1px solid #dc262630`,
                      borderRadius: '4px',
                      color: '#dc2626',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    onClick={() => {
                      // Add new version functionality for 2D file
                      console.log('New version for 2D file:', doc.file_2d_name);
                    }}
                    style={{
                      flex: 1,
                      padding: '0.375rem 0.5rem',
                      background: 'white',
                      border: `1px solid #dc262630`,
                      borderRadius: '4px',
                      color: '#dc2626',
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
            </div>
          )}
          
          {/* 3D File Card */}
          {doc.file_3d_name && (
            <div style={{ 
              border: `1px solid #2563eb20`,
              borderRadius: '8px',
              overflow: 'hidden',
              background: 'white'
            }}>
              <div style={{ 
                padding: '0.75rem',
                borderBottom: `1px solid #2563eb20`,
                background: '#eff6ff'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    padding: '0.5rem', 
                    background: 'white', 
                    borderRadius: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                  }}>
                    <Box size={20} style={{ color: '#2563eb' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: '600', 
                      fontSize: '0.875rem', 
                      color: '#2563eb', 
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      padding: '2px 0'
                    }}>
                      {doc.file_3d_name}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#2563eb',
                      marginTop: '0.125rem'
                    }}>
                      <span>3D</span>
                      <span>•</span>
                      <span>{doc.file_format_3d?.toUpperCase() || 'STEP'}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    onClick={() => {
                      // Add download functionality for 3D file
                      console.log('Download 3D file:', doc.file_3d_name);
                    }}
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      padding: '0.375rem 0.5rem',
                      background: 'white',
                      border: `1px solid #2563eb30`,
                      borderRadius: '4px',
                      color: '#2563eb',
                      fontSize: '0.75rem',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Download size={14} /> Download
                  </button>
                  <button
                    onClick={() => {
                      // Add new version functionality for 3D file
                      console.log('New version for 3D file:', doc.file_3d_name);
                    }}
                    style={{
                      flex: 1,
                      padding: '0.375rem 0.5rem',
                      background: 'white',
                      border: `1px solid #2563eb30`,
                      borderRadius: '4px',
                      color: '#2563eb',
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
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
)}



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
                        {selectedNode.parts && (
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
                              <span>{selectedNode.parts.length} items</span>
                            </div>
                            {selectedNode.type === 'assembly' && (
  <DocumentsSection assemblyId={selectedNode.id} />
)}
                          </div>
                        )}
                      </div>

                    

                   

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
            <div style={{ 
              padding: '1.5rem', 
              borderBottom: '1px solid #e5e7eb', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Layers size={20} />
                {modalData.editId ? 'Edit' : 'Add'} {modalData.isDirectPart ? 'Direct Part' : modalData.type || 'Item'}
              </h3>
            </div>
            
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
                <h4 style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  API Configuration
                </h4>
                
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
                disabled={!modalData.name.trim() || (modalData.type === 'part' && (!modalData.pdfFile || !modalData.stepFile))}
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
    </div>
  );
};

export default Assembly;