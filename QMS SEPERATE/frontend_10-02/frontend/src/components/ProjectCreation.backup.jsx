import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './ProjectCreation.css';

const ProjectCreation = () => {
  // ========== Helper Functions ==========
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ========== State Management ==========
  // Data State
  const [projects, setProjects] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  const [parts, setParts] = useState([]);
  
  // UI State
  const [activeProject, setActiveProject] = useState(null);
  const [activeAssembly, setActiveAssembly] = useState(null);
  
  // Modal States
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  
  // Form States
  const [projectForm, setProjectForm] = useState({
    name: '',
    number: '',
    description: '',
    customer: ''
  });

  const [assemblyForm, setAssemblyForm] = useState({
    name: '',
    number: '',
    revision: 'A',
    description: '',
    parentId: null,
    projectId: null,
    drawing: null
  });

  const [partForm, setPartForm] = useState({
    name: '',
    number: '',
    partType: 'standard',
    revision: 'A',
    material: '',
    description: '',
    assemblyId: null,
    files: {
      drawing2D: null,
      model3D: null,
      mpp: null
    }
  });

  // UI State for Expanded Items
  const [expandedItems, setExpandedItems] = useState({
    projects: {},
    assemblies: {}
  });

  // ========== Event Handlers ==========
  // Form Input Handlers
  const handleProjectInput = (e) => {
    const { name, value } = e.target;
    setProjectForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAssemblyInput = (e) => {
    const { name, value, files } = e.target;
    setAssemblyForm(prev => ({
      ...prev,
      [name]: files ? files[0] : value
    }));
  };

  const handlePartInput = (e) => {
    const { name, value, files } = e.target;
    
    if (name.startsWith('file_')) {
      const fileType = name.split('_')[1];
      setPartForm(prev => ({
        ...prev,
        files: {
          ...prev.files,
          [fileType]: files ? files[0] : null
        }
      }));
    } else {
      setPartForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Form Submission Handlers
  const handleProjectSubmit = (e) => {
    e.preventDefault();
    const newProject = {
      id: uuidv4(),
      ...projectForm,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setProjects(prev => [...prev, newProject]);
    setProjectForm({ name: '', number: '', description: '', customer: '' });
    setIsProjectModalOpen(false);
  };

  const handleAssemblySubmit = (e) => {
    e.preventDefault();
    const newAssembly = {
      id: uuidv4(),
      ...assemblyForm,
      projectId: activeProject,
      type: assemblyForm.parentId ? 'subassembly' : 'assembly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setAssemblies(prev => [...prev, newAssembly]);
    setAssemblyForm({
      name: '',
      number: '',
      revision: 'A',
      description: '',
      parentId: null,
      projectId: null,
      drawing: null
    });
    setIsAssemblyModalOpen(false);
  };

  const handlePartSubmit = (e) => {
    e.preventDefault();
    const newPart = {
      id: uuidv4(),
      ...partForm,
      assemblyId: activeAssembly,
      projectId: activeProject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setParts(prev => [...prev, newPart]);
    setPartForm({
      name: '',
      number: '',
      partType: 'standard',
      revision: 'A',
      material: '',
      description: '',
      assemblyId: null,
      files: { drawing2D: null, model3D: null, mpp: null }
    });
    setIsPartModalOpen(false);
  };

  // ========== Data Helpers ==========
  const getProjectAssemblies = (projectId) => {
    return assemblies.filter(a => a.projectId === projectId && !a.parentId);
  };

  const getAssemblyParts = (assemblyId) => {
    return parts.filter(p => p.assemblyId === assemblyId);
  };

  const getChildAssemblies = (parentId) => {
    return assemblies.filter(a => a.parentId === parentId);
  };

  // ========== UI Helpers ==========
  const toggleItem = (type, id) => {
    setExpandedItems(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [id]: !prev[type][id]
      }
    }));
  };

  const toggleProject = (projectId) => {
    toggleItem('projects', projectId);
  };

  const toggleAssembly = (assemblyId) => {
    toggleItem('assemblies', assemblyId);
  };
    setProjects(prev => [...prev, newProject]);
    setProjectForm({ name: '', number: '', description: '', customer: '' });
    setIsProjectModalOpen(false);
  };

  const createAssembly = (e) => {
    e.preventDefault();
    const newAssembly = {
      id: uuidv4(),
      ...assemblyForm,
      projectId: activeProject,
      type: assemblyForm.parentId ? 'subassembly' : 'assembly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setAssemblies(prev => [...prev, newAssembly]);
    setAssemblyForm({
      name: '',
      number: '',
      revision: 'A',
      description: '',
      parentId: null,
      projectId: null,
      drawing: null
    });
    setIsAssemblyModalOpen(false);
  };

  const createPart = (e) => {
    e.preventDefault();
    const newPart = {
      id: uuidv4(),
      ...partForm,
      assemblyId: activeAssembly,
      projectId: activeProject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setParts(prev => [...prev, newPart]);
    setPartForm({
      name: '',
      number: '',
      partType: 'standard',
      revision: 'A',
      material: '',
      description: '',
      assemblyId: null,
      files: { drawing2D: null, model3D: null, mpp: null }
    });
    setIsPartModalOpen(false);
  };

  // Data retrieval helpers
  const getProjectAssemblies = (projectId) => {
    return assemblies.filter(a => a.projectId === projectId && !a.parentId);
  };

  const getAssemblyParts = (assemblyId) => {
    return parts.filter(p => p.assemblyId === assemblyId);
  };

  const getChildAssemblies = (parentId) => {
    return assemblies.filter(a => a.parentId === parentId);
  };

  // UI state
  const [expandedItems, setExpandedItems] = useState({
    projects: {},
    assemblies: {}
  });

  const toggleItem = (type, id) => {
    setExpandedItems(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [id]: !prev[type][id]
      }
    }));
  };

  // ========== Render Methods ==========
  const renderPart = (part) => {
    return (
      <div 
        key={part.id} 
        className={`tree-header part ${activePart === part.id ? 'active' : ''}`}
        onClick={() => setActivePart(part.id)}
      >
        <span className="item-icon">
          {part.partType === 'standard' ? '⚙️' : '🔩'}
        </span>
        <span className="item-name">
          {part.name}
          <span className="item-detail">
            {part.number} (Rev: {part.revision})
          </span>
        </span>
      </div>
    );
  };

  const renderAssembly = (assembly) => {
    const childAssemblies = getChildAssemblies(assembly.id);
    const assemblyParts = getAssemblyParts(assembly.id);
    const isExpanded = expandedItems.assemblies[assembly.id];
    const isSubassembly = assembly.type === 'subassembly';
    
    return (
      <div key={assembly.id} className="tree-item">
        <div 
          className={`tree-header assembly ${isSubassembly ? 'subassembly' : ''} ${activeAssembly === assembly.id ? 'active' : ''}`}
          onClick={() => {
            setActiveAssembly(assembly.id);
            setActiveProject(assembly.projectId);
            toggleItem('assemblies', assembly.id);
          }}
        >
          <span className="toggle-icon">
            {(childAssemblies.length > 0 || assemblyParts.length > 0) ? 
              (isExpanded ? '▼' : '▶') : '•'}
          </span>
          <span className="item-icon">
            {isSubassembly ? '🔧' : '📦'}
          </span>
          <span className="item-name">
            {assembly.name} 
            <span className="item-detail">
              {assembly.number} (Rev: {assembly.revision})
            </span>
          </span>
          <span className="item-actions">
            {!isSubassembly && (
              <button 
                className="btn-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveProject(assembly.projectId);
                  setAssemblyForm(prev => ({
                    ...prev,
                    projectId: assembly.projectId,
                    parentId: assembly.id
                  }));
                  setIsAssemblyModalOpen(true);
                }}
                title="Add Subassembly"
              >
                + Sub
              </button>
            )}
            <button 
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                setActiveAssembly(assembly.id);
                setPartForm(prev => ({
                  ...prev,
                  assemblyId: assembly.id,
                  projectId: assembly.projectId
                }));
                setIsPartModalOpen(true);
              }}
              title="Add Part"
            >
              + Part
            </button>
          </span>
        </div>
        
        {isExpanded && (
          <div className="tree-children">
            {/* Child Assemblies */}
            {childAssemblies.length > 0 && (
              <div className="subassemblies">
                {childAssemblies.map(subassembly => renderAssembly(subassembly))}
              </div>
            )}
            
            {/* Parts */}
            {assemblyParts.length > 0 && (
              <div className="parts">
                {assemblyParts.map(part => renderPart(part))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderProject = (project) => {
    const projectAssemblies = getProjectAssemblies(project.id);
    const isExpanded = expandedItems.projects[project.id];
    
    return (
      <div key={project.id} className="tree-item">
        <div 
          className={`tree-header project ${activeProject === project.id ? 'active' : ''}`}
          onClick={() => {
            setActiveProject(project.id);
            toggleItem('projects', project.id);
          }}
        >
          <span className="toggle-icon">
            {projectAssemblies.length > 0 ? (isExpanded ? '▼' : '▶') : '•'}
          </span>
          <span className="item-icon">📁</span>
          <span className="item-name">{project.name}</span>
          <span className="item-actions">
            <button 
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                setActiveProject(project.id);
                setAssemblyForm(prev => ({
                  ...prev,
                  projectId: project.id,
                  parentId: null
                }));
                setIsAssemblyModalOpen(true);
              }}
              title="Add Assembly"
            >
              + Assembly
            </button>
          </span>
        </div>
        
        {isExpanded && (
          <div className="tree-children">
            {projectAssemblies.length > 0 ? (
              projectAssemblies.map(assembly => renderAssembly(assembly))
            ) : (
              <div className="empty-message">No assemblies yet</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Modal components
  const ProjectModal = () => (
    <div className="modal-overlay" onClick={() => setIsProjectModalOpen(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button className="modal-close" onClick={() => setIsProjectModalOpen(false)}>&times;</button>
        </div>
        <form onSubmit={createProject}>
          <div className="form-group">
            <label>Project Name *</label>
            <input 
              type="text" 
              name="name" 
              value={projectForm.name}
              onChange={handleProjectInput}
              required 
              placeholder="e.g., QMS Implementation"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Project Number *</label>
              <input 
                type="text" 
                name="number" 
                value={projectForm.number}
                onChange={handleProjectInput}
                required 
                placeholder="e.g., PRJ-2023-001"
              />
            </div>
            <div className="form-group">
              <label>Customer</label>
              <input 
                type="text" 
                name="customer" 
                value={projectForm.customer}
                onChange={handleProjectInput}
                placeholder="Customer name"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              value={projectForm.description}
              onChange={handleProjectInput}
              placeholder="Project description"
              rows="3"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsProjectModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const AssemblyModal = () => (
    <div className="modal-overlay" onClick={() => setIsAssemblyModalOpen(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {assemblyForm.parentId ? 'Create Subassembly' : 'Create Assembly'}
            {assemblyForm.parentId && <span className="subtitle"> (Child of {getAssemblyName(assemblyForm.parentId)})</span>}
          </h3>
          <button className="modal-close" onClick={() => setIsAssemblyModalOpen(false)}>&times;</button>
        </div>
        <form onSubmit={createAssembly}>
          <div className="form-group">
            <label>Name *</label>
            <input 
              type="text" 
              name="name" 
              value={assemblyForm.name}
              onChange={handleAssemblyInput}
              required 
              placeholder="e.g., Main Frame"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Number *</label>
              <input 
                type="text" 
                name="number" 
                value={assemblyForm.number}
                onChange={handleAssemblyInput}
                required 
                placeholder="e.g., ASM-001"
              />
            </div>
            <div className="form-group">
              <label>Revision</label>
              <input 
                type="text" 
                name="revision" 
                value={assemblyForm.revision}
                onChange={handleAssemblyInput}
                placeholder="e.g., A"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              value={assemblyForm.description}
              onChange={handleAssemblyInput}
              placeholder="Assembly description"
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>Drawing File</label>
            <input 
              type="file" 
              name="drawing"
              onChange={handleAssemblyInput}
              accept=".pdf,.dwg,.dxf"
            />
            {assemblyForm.drawing && (
              <div className="file-preview">
                Selected: {assemblyForm.drawing.name}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsAssemblyModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {assemblyForm.parentId ? 'Create Subassembly' : 'Create Assembly'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  const PartModal = () => (
    <div className="modal-overlay" onClick={() => setIsPartModalOpen(false)}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create New Part</h3>
          <button className="modal-close" onClick={() => setIsPartModalOpen(false)}>&times;</button>
        </div>
        <form onSubmit={createPart}>
          <div className="form-group">
            <label>Part Name *</label>
            <input 
              type="text" 
              name="name" 
              value={partForm.name}
              onChange={handlePartInput}
              required 
              placeholder="e.g., Bracket"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Part Number *</label>
              <input 
                type="text" 
                name="number" 
                value={partForm.number}
                onChange={handlePartInput}
                required 
                placeholder="e.g., PRT-001"
              />
            </div>
            <div className="form-group">
              <label>Revision</label>
              <input 
                type="text" 
                name="revision" 
                value={partForm.revision}
                onChange={handlePartInput}
                placeholder="e.g., A"
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Part Type</label>
              <select 
                name="partType" 
                value={partForm.partType}
                onChange={handlePartInput}
              >
                <option value="standard">Standard</option>
                <option value="purchased">Purchased</option>
                <option value="fabricated">Fabricated</option>
              </select>
            </div>
            <div className="form-group">
              <label>Material</label>
              <input 
                type="text" 
                name="material" 
                value={partForm.material}
                onChange={handlePartInput}
                placeholder="e.g., AISI 304"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea 
              name="description" 
              value={partForm.description}
              onChange={handlePartInput}
              placeholder="Part description"
              rows="2"
            />
          </div>
          <div className="form-group">
            <label>2D Drawing</label>
            <input 
              type="file" 
              name="file_drawing2D"
              onChange={handlePartInput}
              accept=".pdf,.dwg,.dxf"
            />
          </div>
          <div className="form-group">
            <label>3D Model</label>
            <input 
              type="file" 
              name="file_model3D"
              onChange={handlePartInput}
              accept=".step,.stp,.sldprt,.prt"
            />
          </div>
          <div className="form-group">
            <label>MPP File</label>
            <input 
              type="file" 
              name="file_mpp"
              onChange={handlePartInput}
              accept=".mpp"
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsPartModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Part
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Helper function to get assembly name by ID
            <button 
              className="btn-secondary"
              onClick={() => {
                setAssemblyForm(prev => ({ ...prev, projectId: activeProject }));
                setIsAssemblyModalOpen(true);
              }}
            >
              + Add Assembly
            </button>
          )}
        </div>
      </div>
      
      <div className="content-area">
        {activeProject ? (
          <div className="project-details">
            <h3>Project: {projects.find(p => p.id === activeProject)?.name}</h3>
            <div className="project-meta">
              <div className="meta-item">
                <span className="meta-label">Assemblies:</span>
                <span className="meta-value">
                  {assemblies.filter(a => a.projectId === activeProject).length}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Parts:</span>
                <span className="meta-value">
                  {parts.filter(p => p.projectId === activeProject).length}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Last Updated:</span>
                <span className="meta-value">
                  {formatDate(projects.find(p => p.id === activeProject)?.updatedAt || new Date().toISOString())}
                </span>
              </div>
            </div>
            
            {/* Project assemblies list */}
            <div className="section">
              <h4>Assemblies</h4>
              {assemblies.filter(a => a.projectId === activeProject && !a.parentId).length > 0 ? (
                <div className="assemblies-list">
                  {assemblies
                    .filter(a => a.projectId === activeProject && !a.parentId)
                    .map(assembly => renderAssembly(assembly))}
                </div>
              ) : (
                <div className="empty-state">
                  <p>No assemblies yet</p>
                  <button 
                    className="btn-text"
                    onClick={() => {
                      setAssemblyForm(prev => ({ ...prev, projectId: activeProject }));
                      setIsAssemblyModalOpen(true);
                    }}
                  >
                    Add your first assembly
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>No Project Selected</h3>
            <p>Select a project from the sidebar or create a new one to get started.</p>
            <button 
              className="btn-primary"
              onClick={() => setIsProjectModalOpen(true)}
            >
              Create New Project
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Modals */}
    {isProjectModalOpen && <ProjectModal />}
    {isAssemblyModalOpen && <AssemblyModal />}
    {isPartModalOpen && <PartModal />}
  </div>
);

// Modal states
const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
const [isPartModalOpen, setIsPartModalOpen] = useState(false);

// Active selections
const [activeProject, setActiveProject] = useState(null);
const [activeAssembly, setActiveAssembly] = useState(null);
const [activeParentAssembly, setActiveParentAssembly] = useState(null);

// Data stores
const [projects, setProjects] = useState([]);
const [assemblies, setAssemblies] = useState([]);
const [parts, setParts] = useState([]);

// Form states
const [projectForm, setProjectForm] = useState({
  projectName: '',
  projectCode: '',
  customerName: '',
  projectDescription: ''
});

const [assemblyForm, setAssemblyForm] = useState({
  name: '',
  number: '',
  revision: '',
  description: '',
  projectId: null,
  parentId: null,
  drawingFile: null
});

const [partForm, setPartForm] = useState({
  name: '',
  number: '',
  partType: '',
  revision: '',
  material: '',
  description: '',
  assemblyId: null,
  file2D: null,
  file3D: null,
  fileMPP: null
});

// Handle form input changes
const handleProjectInputChange = (e) => {
  const { name, value } = e.target;
  setProjectForm(prev => ({
    ...prev,
    [name]: value
  }));
};

const handleAssemblyInputChange = (e) => {
  const { name, value, files } = e.target;
  if (files) {
    setAssemblyForm(prev => ({
      ...prev,
      [name]: files[0]
    }));
  } else {
    setAssemblyForm(prev => ({
      ...prev,
      [name]: value
    }));
  }
};

const handlePartInputChange = (e) => {
  const { name, value, files } = e.target;
  if (files) {
    setPartForm(prev => ({
      ...prev,
      [name]: files[0]
    }));
  } else {
    setPartForm(prev => ({
      ...prev,
      [name]: value
    }));
  }
};

// Form submissions
const handleProjectSubmit = (e) => {
  e.preventDefault();
  const newProject = {
    id: uuidv4(),
    ...projectForm,
    createdAt: new Date().toISOString()
  };
  setProjects(prev => [...prev, newProject]);
  setProjectForm({
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  
  // Active selections
  const [activeProject, setActiveProject] = useState(null);
  const [activeAssembly, setActiveAssembly] = useState(null);
  const [activeParentAssembly, setActiveParentAssembly] = useState(null);
  
  // Data stores
  const [projects, setProjects] = useState([]);
  const [assemblies, setAssemblies] = useState([]);
  const [parts, setParts] = useState([]);
  
  // Form states
  const [projectForm, setProjectForm] = useState({
    projectName: '',
    projectCode: '',
    customerName: '',
    projectDescription: ''
  });

  const [assemblyForm, setAssemblyForm] = useState({
    name: '',
    number: '',
    revision: '',
    description: '',
    projectId: null,
    parentId: null,
    drawingFile: null
  });

  const [partForm, setPartForm] = useState({
    name: '',
    number: '',
    partType: '',
    revision: '',
    material: '',
    description: '',
    assemblyId: null,
    file2D: null,
    file3D: null,
    fileMPP: null
  });

  // Handle form input changes
  const handleProjectInputChange = (e) => {
    const { name, value } = e.target;
    setProjectForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAssemblyInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setAssemblyForm(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setAssemblyForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  };

  // Form submissions
  const handleProjectSubmit = (e) => {
    e.preventDefault();
    const newProject = {
      id: uuidv4(),
      ...projectForm,
      createdAt: new Date().toISOString()
    };
    setProjects(prev => [...prev, newProject]);
    setProjectForm({
      projectName: '',
      projectCode: '',
      customerName: '',
      projectDescription: ''
    });
    setIsProjectModalOpen(false);
  };

  const handleAssemblySubmit = (e) => {
    e.preventDefault();
    const newAssembly = {
      id: uuidv4(),
      ...assemblyForm,
      projectId: activeProject,
      parentId: activeParentAssembly,
      type: activeParentAssembly ? 'subassembly' : 'assembly',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setAssemblies(prev => [...prev, newAssembly]);
    
    // Reset form and close modal
    setAssemblyForm({
      name: '',
      number: '',
      revision: '',
      description: '',
      projectId: null,
      parentId: null,
      drawingFile: null
    });
    
    setIsAssemblyModalOpen(false);
    setActiveParentAssembly(null);
  };

  const handlePartSubmit = (e) => {
    e.preventDefault();
    const newPart = {
      id: uuidv4(),
      ...partForm,
      assemblyId: activeAssembly,
      projectId: activeProject,
      createdAt: new Date().toISOString()
    };
    setParts(prev => [...prev, newPart]);
    setPartForm({
      name: '',
      number: '',
      partType: '',
      revision: '',
      material: '',
      description: '',
      assemblyId: ''
    });
    setIsPartModalOpen(false);
  };

  // Get filtered data
  const getProjectAssemblies = (projectId) => {
    return assemblies.filter(assembly => assembly.projectId === projectId);
  };

  const getAssemblyParts = (assemblyId) => {
    return parts.filter(part => part.assemblyId === assemblyId);
  };

  // Toggle expansion
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedAssemblies, setExpandedAssemblies] = useState({});

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  const toggleAssembly = (assemblyId) => {
    setExpandedAssemblies(prev => ({
      ...prev,
      [assemblyId]: !prev[assemblyId]
    }));
  };

  // Render project tree item
  const renderProject = (project) => {
    const projectAssemblies = getProjectAssemblies(project.id);
    const isExpanded = expandedProjects[project.id];
    
    return (
      <div key={project.id} className="tree-item">
        <div 
          className={`tree-header ${activeProject === project.id ? 'active' : ''}`}
          onClick={() => {
            setActiveProject(project.id);
            toggleProject(project.id);
          }}
        >
          <span className="toggle-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
          <span className="item-icon">📁</span>
          <span className="item-name">{project.projectName}</span>
          <span className="item-actions">
            <button 
              className="add-assembly-btn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveProject(project.id);
                setAssemblyForm(prev => ({ ...prev, projectId: project.id }));
                setIsAssemblyModalOpen(true);
              }}
            >
              + Assembly
            </button>
          </span>
        </div>
        
        {isExpanded && (
          <div className="tree-children">
            {projectAssemblies.length > 0 ? (
              projectAssemblies.map(assembly => renderAssembly(assembly))
            ) : (
              <div className="empty-message">No assemblies yet</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render assembly tree item
  const renderAssembly = (assembly) => {
    const assemblyParts = getAssemblyParts(assembly.id);
    const isExpanded = expandedAssemblies[assembly.id];
    
    return (
      <div key={assembly.id} className="tree-item">
        <div 
          className={`tree-header assembly ${activeAssembly === assembly.id ? 'active' : ''}`}
          onClick={() => {
            setActiveAssembly(assembly.id);
            toggleAssembly(assembly.id);
          }}
        >
          <span className="toggle-icon">
            {isExpanded ? '▼' : '▶'}
          </span>
          <span className="item-icon">📦</span>
          <span className="item-name">{assembly.name} (Rev: {assembly.revision})</span>
          <span className="item-actions">
            <button 
              className="add-part-btn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveAssembly(assembly.id);
                setPartForm(prev => ({ 
                  ...prev, 
                  assemblyId: assembly.id,
                  projectId: assembly.projectId
                }));
                setIsPartModalOpen(true);
              }}
            >
              + Part
            </button>
            <button 
              className="add-subassembly-btn"
              onClick={(e) => {
                e.stopPropagation();
                setActiveParentAssembly(assembly.id);
                setAssemblyForm(prev => ({ 
                  ...prev, 
                  projectId: assembly.projectId,
                  parentId: assembly.id
                }));
                setIsAssemblyModalOpen(true);
              }}
            >
              + Subassembly
            </button>
          </span>
        </div>
        
        {isExpanded && (
          <div className="tree-children">
            {assemblyParts.length > 0 ? (
              assemblyParts.map(part => renderPart(part))
            ) : (
              <div className="empty-message">No parts yet</div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render part tree item
  const renderPart = (part) => (
    <div key={part.id} className="tree-item">
      <div className="tree-header part">
        <span className="item-icon">⎿</span>
        <span className="item-name">
          {part.name} ({part.number}) - {part.partType}
        </span>
        <span className="item-details">
          <span className="revision">Rev: {part.revision}</span>
          <span className="material">{part.material}</span>
        </span>
      </div>
    </div>
  );

  // Handle assembly form input changes
  const handleAssemblyInputChange = (e) => {
    const { name, value, files } = e.target;
    if (files) {
      setAssemblyForm(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else {
      setAssemblyForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle assembly form submission
  const handleAssemblySubmit = (e) => {
    e.preventDefault();
    const newAssembly = {
      id: uuidv4(),
      ...assemblyForm,
      projectId: activeProject,
      parentId: null, // This will be used for subassemblies
      type: 'assembly',
      createdAt: new Date().toISOString()
    };
    
    setAssemblies(prev => [...prev, newAssembly]);
    setAssemblyForm({
      name: '',
      number: '',
      revision: '',
      description: '',
      drawingFile: null,
      projectId: null
    });
    setIsAssemblyModalOpen(false);
  };

  // Handle creating a subassembly (similar to assembly but with parentId)
  const handleAddSubassembly = (parentId) => {
    setAssemblyForm(prev => ({
      ...prev,
      parentId,
      projectId: activeProject
    }));
    setIsAssemblyModalOpen(true);
  };

  // Find all child assemblies for a given parent
  const getChildAssemblies = (parentId) => {
    return assemblies.filter(assembly => assembly.parentId === parentId);
  };

  // Main component render
  return (
    <div className="project-container">
      {/* Project Creation Modal */}
      {isProjectModalOpen && (
        <div className="modal-overlay" onClick={() => setIsProjectModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Project</h3>
              <button className="modal-close" onClick={() => setIsProjectModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleProjectSubmit}>
              <div className="form-group">
                <label>Project Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={projectForm.name}
                  onChange={handleProjectInput}
                  required 
                  placeholder="e.g., QMS Implementation"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Project Number *</label>
                  <input 
                    type="text" 
                    name="number" 
                    value={projectForm.number}
                    onChange={handleProjectInput}
                    required 
                    placeholder="e.g., PRJ-2023-001"
                  />
                </div>
                <div className="form-group">
                  <label>Customer</label>
                  <input 
                    type="text" 
                    name="customer" 
                    value={projectForm.customer}
                    onChange={handleProjectInput}
                    placeholder="Customer name"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  name="description" 
                  value={projectForm.description}
                  onChange={handleProjectInput}
                  placeholder="Project description"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsProjectModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assembly Creation Modal */}
      {isAssemblyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAssemblyModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Assembly</h3>
              <button className="modal-close" onClick={() => setIsAssemblyModalOpen(false)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleAssemblySubmit}>
              <div className="form-group">
                <label>Assembly Name</label>
                <input
                  type="text"
                  name="name"
                  value={assemblyForm.name}
                  onChange={handleAssemblyInputChange}
                  required
                  placeholder="Enter assembly name"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Assembly Number</label>
                  <input
                    type="text"
                    name="number"
                    value={assemblyForm.number}
                    onChange={handleAssemblyInputChange}
                    required
                    placeholder="e.g., ASM-001"
                  />
                </div>
                <div className="form-group">
                  <label>Revision</label>
                  <input
                    type="text"
                    name="revision"
                    value={assemblyForm.revision}
                    onChange={handleAssemblyInputChange}
                    required
                    placeholder="e.g., A"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={assemblyForm.description}
                  onChange={handleAssemblyInputChange}
                  placeholder="Enter assembly description"
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Upload Assembly Drawing</label>
                <input
                  type="file"
                  name="drawingFile"
                  onChange={handleAssemblyInputChange}
                  accept=".pdf,.dwg,.dxf"
                />
                {assemblyForm.drawingFile && (
                  <div className="file-preview">
                    Selected: {assemblyForm.drawingFile.name}
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setIsAssemblyModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Assembly
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sidebar-logo">
            <path d="M3 3h18v18H3z"></path>
            <path d="M3 9h18M9 21V9"></path>
          </svg>
          <h3>Projects</h3>
        </div>
        <div className="tree-view">
          {projects.length > 0 ? (
            projects.map(project => renderProject(project))
          ) : (
            <div className="empty-message">No projects yet</div>
          )}
        </div>
        <button 
          className="create-project-btn"
          onClick={() => setIsProjectModalOpen(true)}
        >
          + New Project
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        <div className="header">
          <div className="header-left">
            <div className="header-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <h2>Project Management</h2>
          </div>
          <button 
            className="create-btn" 
            onClick={() => setIsModalOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Project
          </button>
        </div>

        {/* Projects Table */}
        <div className="projects-table">
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Project Name</th>
                  <th>Project Code</th>
                  <th>Customer</th>
                  <th>Description</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.length > 0 ? (
                  projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <div className="font-medium text-slate-800">{project.projectName}</div>
                      </td>
                      <td>
                        <code className="text-sm bg-slate-50 px-2 py-1 rounded text-slate-600">
                          {project.projectCode}
                        </code>
                      </td>
                      <td>
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                            <span className="text-indigo-600 font-medium text-sm">
                              {project.customerName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span>{project.customerName}</span>
                        </div>
                      </td>
                      <td>
                        <div className="text-sm text-slate-500 line-clamp-1">
                          {project.projectDescription}
                        </div>
                      </td>
                      <td>
                        <span className="status-badge status-active">
                          <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                          </svg>
                          Active
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-12 text-center">
                      <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <h4 className="text-lg font-medium text-slate-700 mb-1">No projects yet</h4>
                        <p className="text-slate-500">Create your first project to get started</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Project Modal */}
        {isModalOpen && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
            <div className="modal">
              <button 
                className="modal-close" 
                onClick={() => setIsModalOpen(false)}
                aria-label="Close modal"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              <div>
                <h3>Create New Project</h3>
                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="projectName">Project Name</label>
                    <input
                      id="projectName"
                      type="text"
                      name="projectName"
                      value={formData.projectName}
                      onChange={handleInputChange}
                      placeholder="Enter project name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="projectCode">Project Code</label>
                    <input
                      id="projectCode"
                      type="text"
                      name="projectCode"
                      value={formData.projectCode}
                      onChange={handleInputChange}
                      placeholder="Enter project code"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="customerName">Customer Name</label>
                    <input
                      id="customerName"
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleInputChange}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="projectDescription">Project Description</label>
                    <textarea
                      id="projectDescription"
                      name="projectDescription"
                      value={formData.projectDescription}
                      onChange={handleInputChange}
                      placeholder="Enter project description"
                      rows="4"
                      required
                    />
                  </div>
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => setIsModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="btn btn-primary"
                    >
                      Create Project
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCreation;
