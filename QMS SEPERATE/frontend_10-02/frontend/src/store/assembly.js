// d:\Project_management\my-app\src\store\assembly.js
import { create } from 'zustand';
// Helper function for showing notifications
const showNotification = (message, type = 'success') => {
  // Remove any existing notifications
  const existingNotification = document.querySelector('.download-notification');
  if (existingNotification) {
    existingNotification.remove();
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'download-notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#10b981' : '#ef4444'};
    color: white;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideIn 0.3s ease-out;
  `;
  notification.textContent = message;
  
  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(notification);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
};
const useAssemblyStore = create((set, get) => ({
// Initial state
assemblies: [],
documents: [], // Add this line
loading: false,
error: null,
  
 createAssembly: async (assemblyData) => {
  set({ loading: true, error: null });
  
  // Debug: Log what we're sending
console.log('About to call fetch API...');
console.trace('Stack trace to API call');
  
  try {
    const response = await fetch('http://172.18.100.26:8986/api/v1/assemblies/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: assemblyData.name,
        no: assemblyData.no || null,
        rev: assemblyData.rev || null,
        project_id: assemblyData.project_id,
        parent_assembly_id: assemblyData.parent_assembly_id || null,
        id: assemblyData.id || null,
        created_at: assemblyData.created_at || new Date().toISOString()
      })
    });
    
    // Debug: Log response status
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      // Debug: Log error response
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const newAssembly = await response.json();
    console.log('Created assembly:', newAssembly);
    
    // Add the new assembly to local state
    set((state) => ({
      assemblies: [...state.assemblies, newAssembly],
      loading: false
    }));
    
    return newAssembly;
  } catch (error) {
    set({ 
      error: error.message || 'Failed to create assembly',
      loading: false 
    });
    throw error;
  }
},
updateAssembly: async (id, assemblyData) => {
  set({ loading: true, error: null });
  
  // Debug: Log what we're sending
  console.log('Updating assembly with data:', assemblyData);
  console.log('Assembly ID:', id);
  
  try {
    const response = await fetch(`http://172.18.100.26:8986/api/v1/assemblies/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: assemblyData.name,
        no: assemblyData.no || null,
        rev: assemblyData.rev || null,
        project_id: assemblyData.project_id,
        parent_assembly_id: assemblyData.parent_assembly_id || null,
        id: assemblyData.id || id,
        created_at: assemblyData.created_at
      })
    });
    
    // Debug: Log response status
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      // Debug: Log error response
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const updatedAssembly = await response.json();
    console.log('Updated assembly:', updatedAssembly);
    
    // Update the assembly in local state
    set((state) => ({
      assemblies: state.assemblies.map(assembly => 
        assembly.id === id ? { ...assembly, ...updatedAssembly } : assembly
      ),
      loading: false
    }));
    
    return updatedAssembly;
  } catch (error) {
    set({ 
      error: error.message || 'Failed to update assembly',
      loading: false 
    });
    throw error;
  }
},
deleteAssembly: async (id) => {
  set({ loading: true, error: null });
  
  try {
    const response = await fetch(`http://172.18.100.26:8986/api/v1/assemblies/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Remove the assembly from local state
    set((state) => ({
      assemblies: state.assemblies.filter(assembly => assembly.id !== id),
      loading: false
    }));
    
    return true;
  } catch (error) {
    set({ 
      error: error.message || 'Failed to delete assembly',
      loading: false 
    });
    throw error;
  }
},
 uploadDocument: async (documentData) => {
  set({ loading: true, error: null });
  
  try {
    const formData = new FormData();
    
    // Always add 2D file (required)
if (documentData.file_2d && documentData.file_2d instanceof File) {
  formData.append('file_2d', documentData.file_2d);
} else {
  throw new Error('2D document file is required');
}

// Add 3D file only if provided (optional)
if (documentData.file_3d && documentData.file_3d instanceof File) {
  formData.append('file_3d', documentData.file_3d);
}
    
    // Add other fields
    formData.append('doc_type', documentData.doc_type || '');
    formData.append('title', documentData.title || '');
    formData.append('assembly_id', documentData.assembly_id || '');
    formData.append('part_id', documentData.part_id || '');
    formData.append('file_format_2d', documentData.file_format_2d || '');
    // Add file_format_3d only if 3D file is provided
    if (documentData.file_3d && documentData.file_3d instanceof File) {
      formData.append('file_format_3d', documentData.file_format_3d || '');
    }
    formData.append('pdf_content_type_2d', documentData.pdf_content_type_2d || 'normal');
    formData.append('uploaded_by', documentData.uploaded_by || '');
    formData.append('change_note', documentData.change_note || '');
    
    console.log('Uploading document with FormData:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    const response = await fetch('http://172.18.100.26:8986/api/v1/documents/', {
      method: 'POST',
      body: formData  // Don't set Content-Type header, let browser set it for FormData
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Document uploaded:', result);
    
    set({ loading: false });
    return result;
  } catch (error) {
    set({ 
      error: error.message || 'Failed to upload document',
      loading: false 
    });
    throw error;
  }
},

  fetchAssemblies: async (projectId) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(`http://172.18.100.26:8986/api/v1/assemblies/?project_id=${projectId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Handle different response formats
     const assemblies = Array.isArray(data) ? data : data.assemblies || data.results || data.items || [];
      
      set({ 
        assemblies: assemblies,
        loading: false 
      });
      
      return assemblies;
    } catch (error) {
      set({ 
        error: error.message || 'Failed to fetch assemblies',
        loading: false 
      });
      throw error;
    }
  },
fetchAllAssemblies: async () => {
  set({ loading: true, error: null });
  
  try {
    console.log('Fetching all assemblies...');
    const response = await fetch('http://172.18.100.26:8986/api/v1/assemblies/?skip=0&limit=100', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Fetched assemblies:', data);
    
    // The API returns an array directly, not wrapped in an object
    const assemblies = Array.isArray(data) ? data : [];
    
    set({ 
      assemblies: assemblies,
      loading: false 
    });
    
    return assemblies;
  } catch (error) {
    set({ 
      error: error.message || 'Failed to fetch assemblies',
      loading: false 
    });
    throw error;
  }
},

fetchDocuments: async () => {
  set({ loading: true, error: null });
  
  try {
    console.log('Fetching all documents...');
    // Increased limit to 1000 to ensure we get all documents
    const response = await fetch('http://172.18.100.26:8986/api/v1/documents/?skip=0&limit=1000', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Documents response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Documents error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();

    // Handle different response formats (including value wrapper from some APIs)
    const documents = Array.isArray(data) ? data : data.value || data.documents || data.results || data.items || [];
    console.log(`Fetched ${documents.length} documents from API`);

    set({
      documents: documents,
      loading: false
    });

    return documents;
  } catch (error) {
    set({ 
      error: error.message || 'Failed to fetch documents',
      loading: false 
    });
    throw error;
  }
},

// Fetch documents for a specific part or assembly using API filters
fetchDocumentsForNode: async (nodeId, isPartOrDirectPart = false) => {
  try {
    const filterParam = isPartOrDirectPart ? `part_id=${nodeId}` : `assembly_id=${nodeId}`;
    console.log(`Fetching documents with filter: ${filterParam}`);
    
    const response = await fetch(`http://172.18.100.26:8986/api/v1/documents/?${filterParam}&skip=0&limit=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Documents error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const documents = Array.isArray(data) ? data : data.value || data.documents || data.results || data.items || [];
    console.log(`Fetched ${documents.length} documents for node ${nodeId}`);
    
    return documents;
  } catch (error) {
    console.error('Failed to fetch documents for node:', error);
    return [];
  }
},

// Add this function after fetchAllAssemblies (around line 278)
getSubAssemblyCount: async (parentId) => {
  try {
    const response = await fetch(`http://172.18.100.26:8986/api/v1/assemblies/?skip=0&limit=100`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const assemblies = Array.isArray(data) ? data : [];
    
    // Count direct sub-assemblies for the given parent
    const subAssemblies = assemblies.filter(assembly => 
      assembly.parent_assembly_id === parentId
    );
    
    return subAssemblies.length;
  } catch (error) {
    console.error('Failed to get sub-assembly count:', error);
    return 0;
  }
},

downloadDocument: async (documentId, fileType = '2d') => {
  try {
    console.log(`=== DOWNLOAD DEBUG ===`);
    console.log(`Document ID: ${documentId}`);
    console.log(`File Type: ${fileType}`);
    
    // Use consistent endpoint - remove the duplicate definition
    const endpoint = `http://172.18.100.26:8986/api/v1/documents/versions/${fileType}/download`;
    console.log(`Full endpoint: ${endpoint}`);
    
    console.log(`Request body:`, JSON.stringify({
      document_id: documentId
    }));
    
    const response = await fetch(endpoint, {  // Use the endpoint variable, not hardcoded URL
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document_id: documentId
      })
    });
    
    console.log('Download response status:', response.status);
    console.log('Download response headers:', response.headers);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Download error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Get the blob from response
    const blob = await response.blob();
    console.log('Blob size:', blob.size);
    
    // Create a temporary URL and trigger download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    
    // Get filename from response headers or use default
    const contentDisposition = response.headers.get('content-disposition');
    let filename = `document.${fileType === '2d' ? 'pdf' : 'step'}`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }
    
    console.log('Download filename:', filename);
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    // Show success notification
    const fileTypeName = fileType === '2d' ? '2D Document' : '3D Document';
    showNotification(`${fileTypeName} downloaded successfully!`, 'success');
    
    console.log(`Successfully downloaded ${fileType.toUpperCase()} document`);
    return true;
  } catch (error) {
    console.error(`Failed to download ${fileType.toUpperCase()} document:`, error);
    throw error;
  }
},

fetchDocumentVersions: async (documentId) => {
  set({ loading: true, error: null });
  
  try {
    console.log(`Fetching document versions for ID: ${documentId}`);
    
    const response = await fetch(`http://172.18.100.26:8986/api/v1/documents/${documentId}/versions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('Document versions response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Document versions error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const versions = await response.json();
    console.log('Fetched document versions:', versions);
    
    set({ loading: false });
    return versions;
  } catch (error) {
    set({ 
      error: error.message || 'Failed to fetch document versions',
      loading: false 
    });
    throw error;
  }
},

upload3DDocumentOnly: async (documentData) => {
  set({ loading: true, error: null });
  
  try {
    const formData = new FormData();
    
    // Validate required 3D file
    if (documentData.file_3d && documentData.file_3d instanceof File) {
      formData.append('file_3d', documentData.file_3d);
    } else {
      throw new Error('3D document file is required');
    }
    
    // Add other fields
    formData.append('title', documentData.title || '');
    formData.append('assembly_id', documentData.assembly_id || '');
    formData.append('part_id', documentData.part_id || '');
    formData.append('file_format_3d', documentData.file_format_3d || '');
    formData.append('uploaded_by', documentData.uploaded_by || '');
    formData.append('change_note', documentData.change_note || '');
    
    console.log('Uploading 3D-only document with FormData:');
    for (let [key, value] of formData.entries()) {
      console.log(`${key}:`, value);
    }
    
    const response = await fetch('http://172.18.100.26:8986/api/v1/documents/3d-only', {
      method: 'POST',
      body: formData  // Don't set Content-Type header, let browser set it for FormData
    });
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('3D document created successfully:', result);
    
    set({ loading: false });
    return result;
    
  } catch (error) {
    console.error('Error uploading 3D document:', error);
    set({ 
      error: error.message || 'Failed to upload 3D document',
      loading: false 
    });
    throw error;
  }
},

uploadDocumentVersion: async (documentId, file, fileFormat, changeNote, versionNo = null) => {
  set({ loading: true, error: null });
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_format', fileFormat);
    if (changeNote != null && changeNote !== '') {
      formData.append('change_note', changeNote);
    }
    if (versionNo != null && versionNo !== '') {
      const num = typeof versionNo === 'number' ? versionNo : parseInt(String(versionNo), 10);
      if (!Number.isNaN(num)) {
        formData.append('version_no', num);
      }
    }
    
    const response = await fetch(`http://172.18.100.26:8986/api/v1/documents/${documentId}/versions`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let message = `Upload failed: ${response.status}`;
      try {
        const errJson = JSON.parse(errorText);
        if (errJson.detail) message = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      } catch (_) {
        if (errorText) message = errorText;
      }
      throw new Error(message);
    }
    
    const newVersion = await response.json();
    set({ loading: false });
    return newVersion;
  } catch (error) {
    set({ 
      error: error.message || 'Failed to upload document version',
      loading: false 
    });
    throw error;
  }
},

  // Clear error
  clearError: () => set({ error: null })
}));

export default useAssemblyStore;