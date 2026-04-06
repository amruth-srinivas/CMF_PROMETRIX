import axios from 'axios';

// Use the same API base URL as other services
const API_BASE_URL = 'http://172.18.100.26:8986/api/v1';

export const noteService = {
  // Create a new note
  createNote: async (partId, documentId, bbox, noteText = '') => {
    try {
      const requestData = {
        part_id: partId,
        document_id: documentId,
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height,
        page: bbox.page,
        note_text: noteText || '' // Ensure note_text is always a string
      };
      console.log('Creating note with data:', requestData);
      const response = await axios.post(`${API_BASE_URL}/notes/`, requestData);
      console.log('Note creation response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating note:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      throw error;
    }
  },

  // Get all notes for a part
  getNotesByPart: async (partId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/notes/part/${partId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }
  },

  // Update a note
  updateNote: async (noteId, updates) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/notes/${noteId}`, updates);
      return response.data;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  },

  // Delete a note
  deleteNote: async (noteId) => {
    try {
      await axios.delete(`${API_BASE_URL}/notes/${noteId}`);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  },

  // Delete all notes for a part
  deleteAllNotesForPart: async (partId) => {
    try {
      await axios.delete(`${API_BASE_URL}/notes/part/${partId}`);
    } catch (error) {
      console.error('Error deleting all notes:', error);
      throw error;
    }
  }
};

export default noteService;

