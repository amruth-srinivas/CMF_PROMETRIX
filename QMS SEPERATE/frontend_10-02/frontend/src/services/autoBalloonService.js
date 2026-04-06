import { processDimensions } from '../utils/pdfAnnotationApi';

/**
 * Auto-ballooning service for processing entire PDF pages
 */
class AutoBalloonService {
  /**
   * Process auto-ballooning for entire PDF document
   * @param {Object} options - Processing options
   * @param {number} options.partId - Part ID
   * @param {string} options.documentId - Document ID
   * @param {Object} options.pdfDimensions - PDF dimensions {width, height}
   * @param {number} options.totalPages - Total number of pages
   * @param {Function} options.onProgress - Progress callback (page, totalPages, results)
   * @param {Function} options.onPageComplete - Page completion callback (page, result)
   * @param {boolean} options.skipExisting - Skip pages that already have balloons
   * @param {Array} options.existingBoxes - Existing bounding boxes to avoid overlaps
   * @returns {Promise<Object>} - Final results
   */
  static async processAutoBalloon({
    partId,
    documentId,
    pdfDimensions,
    totalPages,
    onProgress,
    onPageComplete,
    skipExisting = true,
    existingBoxes = []
  }) {
    const API_BASE = 'http://172.18.100.26:8986/api/v1';

    try {
      // Call the new auto-ballooning endpoint
      const response = await fetch(`${API_BASE}/pdf-annotation/auto-ballooning`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          part_id: partId,
          pdf_id: String(documentId),
          bounding_box: {
            x: 0,
            y: 0,
            width: pdfDimensions.width,
            height: pdfDimensions.height,
            page: 1  // Will be overridden by backend for each page
          },
          scale_factor: 1.0,
          check_overlaps: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to process auto-ballooning: ${response.status} ${errorText}`);
      }

      const results = await response.json();

      // Simulate progress updates for UI consistency
      if (onProgress) {
        for (let page = 1; page <= totalPages; page++) {
          onProgress(page, totalPages, results);
          // Small delay to show progress
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Call page completion callback for each page
      if (onPageComplete && results.page_results) {
        for (const pageResult of results.page_results) {
          onPageComplete(pageResult.page, pageResult);
        }
      }

      return {
        success: true,
        results
      };

    } catch (error) {
      console.error('Auto-ballooning failed:', error);
      return {
        success: false,
        error: error.message,
        results: {
          total_pages: totalPages,
          created: 0,
          skipped: 0,
          text_detections: 0,
          gdt_detections: 0,
          dimensions: 0,
          page_results: [],
          errors: [error.message]
        }
      };
    }
  }

  /**
   * Create balloons from detection results (legacy method for compatibility)
   * @param {number} partId - Part ID
   * @param {string} documentId - Document ID
   * @param {Object} detections - Detection results from API
   * @param {number} page - Page number
   * @returns {Promise<Object>} - Balloon creation results
   */
  static async createBalloonsFromDetections(partId, documentId, detections, page) {
    // This method is now handled by the backend, but kept for compatibility
    return {
      created: detections.text_detections?.length || 0 + 
               detections.gdt_detections?.length || 0 + 
               detections.dimension_parsing?.length || 0,
      skipped: 0,
      balloons: []
    };
  }

  /**
   * Check if a balloon should be created for this detection
   * @param {Object} detection - Detection object
   * @returns {boolean} - Whether to create a balloon
   */
  static shouldCreateBalloon(detection) {
    // This logic is now handled by the backend, but kept for compatibility
    return true;
  }

  /**
   * Check if detection is in exclusion zone
   * @param {Object} detection - Detection object
   * @returns {boolean} - Whether in exclusion zone
   */
  static isInExclusionZone(detection) {
    // This logic is now handled by the backend, but kept for compatibility
    return false;
  }

  /**
   * Check if detection is too small
   * @param {Object} detection - Detection object
   * @returns {boolean} - Whether too small
   */
  static isTooSmall(detection) {
    // This logic is now handled by the backend, but kept for compatibility
    return false;
  }

  /**
   * Check if detection text is irrelevant
   * @param {Object} detection - Detection object
   * @returns {boolean} - Whether text is irrelevant
   */
  static isIrrelevantText(detection) {
    // This logic is now handled by the backend, but kept for compatibility
    return false;
  }

  /**
   * Create bounding box from detection
   * @param {Object} detection - Detection object
   * @param {number} page - Page number
   * @returns {Object} - Bounding box object
   */
  static createBoundingBoxFromDetection(detection, page) {
    // This logic is now handled by the backend, but kept for compatibility
    const bbox = detection.bbox || detection.box || [];
    
    if (bbox.length >= 2) {
      const x = bbox[0][0];
      const y = bbox[0][1];
      const width = bbox.length > 2 ? bbox[2][0] - bbox[0][0] : 0;
      const height = bbox.length > 2 ? bbox[2][1] - bbox[0][1] : 0;

      return {
        x,
        y,
        width,
        height,
        page
      };
    }

    // Fallback if bbox format is different
    return {
      x: 0,
      y: 0,
      width: 50,
      height: 30,
      page
    };
  }

  /**
   * Check if two rectangles overlap
   * @param {Object} rect1 - First rectangle {x, y, width, height}
   * @param {Object} rect2 - Second rectangle {x, y, width, height}
   * @returns {boolean} - Whether rectangles overlap
   */
  static rectanglesOverlap(rect1, rect2) {
    return !(
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y
    );
  }
}

export default AutoBalloonService;
