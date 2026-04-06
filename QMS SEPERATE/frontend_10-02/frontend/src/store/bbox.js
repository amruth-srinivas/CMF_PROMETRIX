import { create } from 'zustand';
import * as pdfAnnotationApi from '../utils/pdfAnnotationApi';

const useBboxStore = create((set, get) => ({
  // Initial state
  boundingBoxes: [],
  loading: false,
  error: null,
  currentPage: 1,
  totalPages: 1,
  pdfDimensions: { width: 0, height: 0 },
  pdfData: null,
  scale: 1.0,
  rotation: 0,
  isSelectionMode: false,
  isPanMode: false,
  isStampMode: false,
  selectedBboxId: null,
  
  // Load bounding boxes for a part
 loadBoundingBoxes: async (partId) => {
  set({ loading: true, error: null });
  try {
    const response = await pdfAnnotationApi.getBoundingBoxes(partId);
    const boxes = response.bounding_boxes || [];
      
      // Ensure all boxes have dimension_data field and parse JSON if needed
      boxes.forEach((bbox) => {
        // Parse JSON fields if they come as strings
        if (typeof bbox.dimension_data === 'string') {
          try {
            bbox.dimension_data = JSON.parse(bbox.dimension_data);
          } catch (e) {
            console.warn('Failed to parse dimension_data:', e);
            bbox.dimension_data = [];
          }
        }
        if (typeof bbox.text_data === 'string') {
          try {
            bbox.extracted_text = JSON.parse(bbox.text_data);
          } catch (e) {
            console.warn('Failed to parse text_data:', e);
            bbox.extracted_text = [];
          }
        }
        if (typeof bbox.gdt_data === 'string') {
          try {
            bbox.extracted_gdt = JSON.parse(bbox.gdt_data);
          } catch (e) {
            console.warn('Failed to parse gdt_data:', e);
            bbox.extracted_gdt = [];
          }
        }
        
        // Ensure fields exist (fallback to empty arrays)
        if (!bbox.dimension_data) bbox.dimension_data = [];
        if (!bbox.extracted_text) bbox.extracted_text = bbox.text_data || [];
        if (!bbox.extracted_gdt) bbox.extracted_gdt = bbox.gdt_data || [];
      });
      
     set({ boundingBoxes: boxes, loading: false });
    return boxes;
  } catch (error) {
    console.warn('Failed to load bounding boxes, using empty array:', error);
    // Set empty array instead of error state to allow app to continue
    set({ boundingBoxes: [], loading: false, error: null });
    return []; // Return empty array instead of throwing
  }
  },
  
  // Save a new bounding box
  saveBoundingBox: async (partId, documentId, bbox, label) => {
    set({ loading: true, error: null });
    try {
      const result = await pdfAnnotationApi.saveBoundingBox(partId, documentId, bbox, label);
      
      // Add the new bbox to local state
      const newBbox = {
        id: result.id,
        ...bbox,
        label: label || '',
        zone: result.balloon?.zone || null,  // Include zone from backend response
        dimension_data: [],
        extracted_text: [],
        extracted_gdt: [],
        part_id: partId,
        document_id: documentId
      };
      
      set((state) => ({
        boundingBoxes: [...state.boundingBoxes, newBbox],
        loading: false
      }));
      
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Update a bounding box
  updateBoundingBox: async (partId, balloonId, data) => {
    set({ loading: true, error: null });
    try {
      const result = await pdfAnnotationApi.updateBoundingBox(partId, balloonId, data);
      
      // Update local state
      set((state) => ({
        boundingBoxes: state.boundingBoxes.map((bbox) => {
          if (bbox.id === balloonId) {
            return {
              ...bbox,
              ...(data.dimension_data && { dimension_data: data.dimension_data }),
              ...(data.text_data && { extracted_text: data.text_data }),
              ...(data.gdt_data && { extracted_gdt: data.gdt_data })
            };
          }
          return bbox;
        }),
        loading: false
      }));
      
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Delete a bounding box
  deleteBoundingBox: async (partId, balloonId) => {
    set({ loading: true, error: null });
    try {
      await pdfAnnotationApi.deleteBoundingBox(partId, balloonId);
      
      // Remove from local state
      set((state) => ({
        boundingBoxes: state.boundingBoxes.filter((bbox) => bbox.id !== balloonId),
        loading: false
      }));
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Delete all bounding boxes for a part (all balloons)
  deleteAllBoundingBoxes: async (partId, page = null) => {
    set({ loading: true, error: null });
    try {
      const state = get();
      let boxesToDelete = state.boundingBoxes;
      
      // Filter by page if specified
      if (page !== null) {
        boxesToDelete = boxesToDelete.filter((bbox) => bbox.page === page);
      }
      
      // Delete all bounding boxes
      const deletePromises = boxesToDelete.map((bbox) => 
        pdfAnnotationApi.deleteBoundingBox(partId, bbox.id)
      );
      
      await Promise.all(deletePromises);
      
      // Remove from local state
      if (page !== null) {
        set((state) => ({
          boundingBoxes: state.boundingBoxes.filter((bbox) => bbox.page !== page),
          loading: false
        }));
      } else {
        set({ boundingBoxes: [], loading: false });
      }
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Process dimensions from a region
  processDimensions: async (partId, documentId, region, rotationAngle = null) => {
    set({ loading: true, error: null });
    try {
      const result = await pdfAnnotationApi.processDimensions(partId, documentId, region, rotationAngle);
      set({ loading: false });
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Extract text from a region
  extractText: async (partId, documentId, region, rotationAngle = null) => {
    set({ loading: true, error: null });
    try {
      const result = await pdfAnnotationApi.extractText(partId, documentId, region, rotationAngle);
      set({ loading: false });
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Extract GDT from a region
  extractGDT: async (partId, documentId, region, rotationAngle = null) => {
    set({ loading: true, error: null });
    try {
      const result = await pdfAnnotationApi.extractGDT(partId, documentId, region, rotationAngle);
      set({ loading: false });
      return result;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Set PDF data
  setPdfData: (data) => set({ pdfData: data }),
  
  // Set PDF dimensions
  setPdfDimensions: (dimensions) => set({ pdfDimensions: dimensions }),
  
  // Set current page
  setCurrentPage: (page) => set({ currentPage: page }),
  
  // Set total pages
  setTotalPages: (pages) => set({ totalPages: pages }),
  
  // Set scale
  setScale: (scale) => set({ scale }),
  
  // Set rotation
  setRotation: (rotation) => set({ rotation }),
  
  // Toggle selection mode
  setSelectionMode: (isSelectionMode) => set({ isSelectionMode }),
  
  // Toggle pan mode
  setPanMode: (isPanMode) => set({ isPanMode }),
  
  // Toggle stamp mode
  setStampMode: (isStampMode) => set({ isStampMode }),
  
  // Set selected bbox
  setSelectedBboxId: (id) => set({ selectedBboxId: id }),
  
  // Clear error
  clearError: () => set({ error: null })
}));

export default useBboxStore;
