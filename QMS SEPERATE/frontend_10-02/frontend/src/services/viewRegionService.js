const API_BASE = 'http://172.18.100.26:8986/api/v1';

/**
 * Service for handling PDF region view extraction
 */
export const viewRegionService = {
  /**
   * Extract a specific region from a PDF page and return it as a base64-encoded image
   * @param {string} pdfId - ID of the PDF file
   * @param {Object} params - Extraction parameters
   * @param {number} params.page - Page number (0-indexed)
   * @param {number} params.x - X coordinate of the region in PDF coordinates
   * @param {number} params.y - Y coordinate of the region in PDF coordinates
   * @param {number} params.width - Width of the region in PDF coordinates
   * @param {number} params.height - Height of the region in PDF coordinates
   * @param {number} params.zoomFactor - Zoom factor for extraction quality (default 2.0)
   * @param {boolean} params.autoRotate - Whether to auto-rotate for readability (default true)
   * @returns {Promise<Object>} Response with success status, base64 image, and region data
   */
  async extractRegion(pdfId, params) {
    try {
      const queryParams = new URLSearchParams({
        page: params.page.toString(),
        x: params.x.toString(),
        y: params.y.toString(),
        width: params.width.toString(),
        height: params.height.toString(),
        zoom_factor: (params.zoomFactor || 2.0).toString(),
        auto_rotate: (params.autoRotate !== false).toString()
      });

      const response = await fetch(`${API_BASE}/view-region/${encodeURIComponent(pdfId)}?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to extract region: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      // Re-throw with more context if it's a network error
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to reach the server. Please check your connection and CORS settings. Original error: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Get information about a PDF file, including number of pages and dimensions
   * @param {string} pdfId - ID of the PDF file
   * @returns {Promise<Object>} Response with PDF information
   */
  async getPDFInfo(pdfId) {
    try {
      const response = await fetch(`${API_BASE}/view-region/${encodeURIComponent(pdfId)}/info`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to get PDF info: ${response.status} ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      // Re-throw with more context if it's a network error
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to reach the server. Please check your connection and CORS settings. Original error: ${error.message}`);
      }
      throw error;
    }
  },

  /**
   * Extract region from bounding box data
   * @param {string} pdfId - ID of the PDF file
   * @param {Object} boundingBox - Bounding box object with coordinates
   * @param {number} boundingBox.x - X coordinate
   * @param {number} boundingBox.y - Y coordinate
   * @param {number} boundingBox.width - Width
   * @param {number} boundingBox.height - Height
   * @param {number} page - Page number (0-indexed)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Response with extracted region
   */
  async extractRegionFromBoundingBox(pdfId, boundingBox, page = 0, options = {}) {
    return this.extractRegion(pdfId, {
      page,
      x: boundingBox.x,
      y: boundingBox.y,
      width: boundingBox.width,
      height: boundingBox.height,
      zoomFactor: options.zoomFactor || 2.0,
      autoRotate: options.autoRotate !== false
    });
  }
};

export default viewRegionService;
