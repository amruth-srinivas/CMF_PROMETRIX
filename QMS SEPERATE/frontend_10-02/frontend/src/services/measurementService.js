import axios from 'axios';

// Use the same API base URL as other services
const API_BASE_URL = 'http://172.18.100.26:8986/api/v1';

export const measurementService = {
  // Get all measurements for a part, optionally filtered by quantity (part instance)
  getMeasurementsByPart: async (partId, quantity = null) => {
    if (!partId) return [];
    try {
      const params = {
        part_id: partId,
        skip: 0,
        limit: 1000
      };
      if (quantity !== null && quantity !== undefined) {
        params.quantity = quantity;
      }
      const response = await axios.get(`${API_BASE_URL}/measurements`, { params });
      return response.data || [];
    } catch (error) {
      console.error('Error fetching measurements:', error);
      throw error;
    }
  },

  // Create or update a measurement for a given balloon and part instance
  upsertMeasurementForBalloon: async ({
    measurementId,
    balloonDbId,
    partId,
    quantity,  // Part instance number (1, 2, 3, etc.)
    m1,
    m2,
    m3,
    measuredBy,
    notes
  }) => {
    if (!balloonDbId) {
      throw new Error('balloonDbId is required to save measurements');
    }

    const toNumber = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    };

    const payload = {
      balloon_id: balloonDbId,
      part_id: partId || null,
      quantity: quantity || 1,  // Part instance number
      m1: toNumber(m1),
      m2: toNumber(m2),
      m3: toNumber(m3),
      measured_by: measuredBy || null,
      notes: notes || null
      // mean is calculated on the backend if not provided
    };

    try {
      if (measurementId) {
        const response = await axios.put(
          `${API_BASE_URL}/measurements/${measurementId}`,
          payload
        );
        return response.data;
      } else {
        // Find existing measurement for this balloon and quantity, or create new
        // First, try to find existing measurement
        const existingResponse = await axios.get(`${API_BASE_URL}/measurements`, {
          params: {
            balloon_id: balloonDbId,
            quantity: quantity || 1,
            limit: 1
          }
        });
        
        if (existingResponse.data && existingResponse.data.length > 0) {
          // Update existing measurement
          const existingId = existingResponse.data[0].id;
          const response = await axios.put(
            `${API_BASE_URL}/measurements/${existingId}`,
            payload
          );
          return response.data;
        } else {
          // Create new measurement
          const response = await axios.post(`${API_BASE_URL}/measurements`, payload);
          return response.data;
        }
      }
    } catch (error) {
      console.error('Error saving measurement:', error);
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
      }
      throw error;
    }
  }
};

export default measurementService;

