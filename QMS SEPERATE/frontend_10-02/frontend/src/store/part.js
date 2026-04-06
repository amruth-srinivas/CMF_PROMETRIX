// d:\Project_management\my-app\src\store\part.js
import { create } from 'zustand';
const usePartStore = create((set, get) => ({
  // Initial state
  parts: [],
  loading: false,
  error: null,
  
  createPart: async (partData) => {
  set({ loading: true, error: null });
  
  // Debug: Log what we're sending
  console.log('Creating part with data:', partData);
  console.log('Project ID:', partData.project_id);
  console.log('Assembly ID:', partData.assembly_id);
  
  try {
    // Build request body - use assembly_id (not parent_assembly_id) and include quantity
    const requestBody = {
      name: partData.name,
      part_no: partData.part_number || `PART-${Date.now()}`,  // Generate unique part number
      rev: partData.rev || null,
      priority_component: partData.priority_component || false,
    };
    
    // Add location information if provided
    if (partData.project_id) {
      requestBody.project_id = partData.project_id;
    }
    if (partData.assembly_id) {
      requestBody.assembly_id = partData.assembly_id;
    }
    if (partData.quantity !== undefined) {
      requestBody.quantity = partData.quantity;
    } else {
      requestBody.quantity = 1; // Default quantity
    }
    
    const response = await fetch('http://172.18.100.26:8986/api/v1/parts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    // Debug: Log response status
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      // Debug: Log error response with better parsing
      const errorText = await response.text();
      console.error('Error response text:', errorText);
      
      let errorDetails;
      try {
        errorDetails = JSON.parse(errorText);
        console.error('Parsed error details:', errorDetails);
      } catch (e) {
        console.error('Could not parse error as JSON:', errorText);
      }
      
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const newPart = await response.json();
    console.log('Created part:', newPart);
    
    // Add the new part to local state
    set((state) => ({
      parts: [...state.parts, newPart],
      loading: false
    }));
    
    return newPart;
  } catch (error) {
    set({ 
      error: error.message || 'Failed to create part',
      loading: false 
    });
    throw error;
  }
},

  updatePart: async (id, partData) => {
    set({ loading: true, error: null });
    
    // Debug: Log what we're sending
    console.log('Updating part with data:', partData);
    console.log('Part ID:', id);
    
    try {
      const response = await fetch(`http://172.18.100.26:8986/api/v1/parts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
  body: JSON.stringify({
  name: partData.name,
  project_id: partData.project_id,
  parent_assembly_id: partData.parent_assembly_id || null,
  part_no: partData.part_number || partData.part_no || `PART-${Date.now()}`,
  rev: partData.rev || null,
  priority_component: partData.priority_component || false,
  created_at: partData.created_at,
  quantity: partData.quantity != null ? Math.max(1, parseInt(partData.quantity, 10) || 1) : undefined
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
      
      const updatedPart = await response.json();
      console.log('Updated part:', updatedPart);
      
      // Update the part in local state
      set((state) => ({
        parts: state.parts.map(part => 
          part.id === id ? { ...part, ...updatedPart } : part
        ),
        loading: false
      }));
      
      return updatedPart;
    } catch (error) {
      set({ 
        error: error.message || 'Failed to update part',
        loading: false 
      });
      throw error;
    }
  },

  deletePart: async (id) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(`http://172.18.100.26:8986/api/v1/parts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        const text = await response.text();
        let msg = `Delete failed (${response.status})`;
        try {
          const j = JSON.parse(text);
          if (j.detail) msg = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail);
        } catch (_) {
          if (text) msg = text;
        }
        throw new Error(msg);
      }
      
      set((state) => ({
        parts: state.parts.filter(part => part.id !== id),
        loading: false
      }));
      
      return true;
    } catch (error) {
      set({ 
        error: error.message || 'Failed to delete part',
        loading: false 
      });
      throw error;
    }
  },

  fetchParts: async (projectId) => {
    set({ loading: true, error: null });
    
    try {
      const response = await fetch(`http://172.18.100.26:8986/api/v1/parts/?project_id=${projectId}`, {
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
      const parts = Array.isArray(data) ? data : data.parts || data.results || data.items || [];
      
      set({ 
        parts: parts,
        loading: false 
      });
      
      return parts;
    } catch (error) {
      set({ 
        error: error.message || 'Failed to fetch parts',
        loading: false 
      });
      throw error;
    }
  },

  fetchAllParts: async () => {
    set({ loading: true, error: null });
    
    try {
      console.log('Fetching all parts...');
      const response = await fetch('http://172.18.100.26:8986/api/v1/parts/?skip=0&limit=100', {
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
      console.log('Fetched parts:', data);
      
      // The API returns an array directly, not wrapped in an object
      const parts = Array.isArray(data) ? data : [];
      
      set({ 
        parts: parts,
        loading: false 
      });
      
      return parts;
    } catch (error) {
      set({ 
        error: error.message || 'Failed to fetch parts',
        loading: false 
      });
      throw error;
    }
  },

  // Clear error
  clearError: () => set({ error: null })
}));

export default usePartStore;