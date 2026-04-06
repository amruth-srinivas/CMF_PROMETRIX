import React, { useState, useEffect } from 'react';
import { X, Eye, Loader2, AlertCircle, RefreshCw, Download, ZoomIn, RotateCw, Info } from 'lucide-react';
import viewRegionService from '../services/viewRegionService';

const RegionViewModal = ({ 
  isOpen, 
  onClose, 
  pdfId, 
  boundingBox, 
  balloonData,
  page = 0,
  title = "BOC Region View" 
}) => {
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomFactor, setZoomFactor] = useState(3.0);
  const [autoRotate, setAutoRotate] = useState(true);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && pdfId && boundingBox) {
      extractRegion();
    } else if (!isOpen) {
      // Reset when closing
      setImageData(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, pdfId, boundingBox, page, zoomFactor, autoRotate]);

  const extractRegion = async () => {
    if (!pdfId || !boundingBox) {
      setError('Missing PDF ID or bounding box information');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Enhance bounding box for better BOC extraction
      const enhancedBoundingBox = {
        x: boundingBox.x - 2, // Small padding
        y: boundingBox.y - 2,
        width: boundingBox.width + 4,
        height: boundingBox.height + 4
      };

      const response = await viewRegionService.extractRegionFromBoundingBox(
        pdfId, 
        enhancedBoundingBox, 
        page, 
        { zoomFactor, autoRotate }
      );

      if (response.success && response.image_base64) {
        setImageData(response.image_base64);
      } else {
        setError(response.message || 'Failed to extract BOC region');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while extracting the BOC region');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    extractRegion();
  };

  const handleDownload = () => {
    if (!imageData) return;

    try {
      const link = document.createElement('a');
      link.href = imageData;
      link.download = `boc_region_${pdfId}_page${page}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error downloading image:', err);
    }
  };

  const renderBalloonDetails = () => {
    if (!balloonData) return null;

    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
        <div className="flex items-center mb-3">
          <Info className="w-5 h-5 mr-2 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">BOC Details</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Balloon ID</p>
            <p className="font-medium text-gray-900">
              {balloonData.id || balloonData.balloon_id || 'N/A'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-1">Label</p>
            <p className="font-medium text-gray-900">
              {balloonData.label || balloonData.balloon_label || 'N/A'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-1">Nominal Value</p>
            <p className="font-medium text-gray-900">
              {balloonData.nominal || balloonData.balloon?.nominal || 'N/A'}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-1">Tolerance</p>
            <p className="font-medium text-gray-900">
              {balloonData.tolerance || 
               (balloonData.balloon?.ltol && balloonData.balloon?.utol 
                 ? `${balloonData.balloon.ltol} / ${balloonData.balloon.utol}`
                 : 'N/A')}
            </p>
          </div>
          
          {balloonData.extracted_text && (
            <div className="col-span-2">
              <p className="text-sm text-gray-600 mb-1">Extracted Text</p>
              <p className="font-mono text-sm bg-white p-2 rounded border border-gray-300">
                {balloonData.extracted_text}
              </p>
            </div>
          )}
          
          {balloonData.dimension_data && balloonData.dimension_data.length > 0 && (
            <div className="col-span-2">
              <p className="text-sm text-gray-600 mb-2">Measurement Data</p>
              <div className="flex flex-wrap gap-2">
                {balloonData.dimension_data.map((dim, index) => (
                  <span 
                    key={index}
                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                  >
                    {dim.type}: {dim.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-blue-600 text-white">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Controls */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-4 items-center mb-3">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Zoom Level:</label>
                <select
                  value={zoomFactor}
                  onChange={(e) => setZoomFactor(parseFloat(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1.0}>1x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2.0}>2x</option>
                  <option value={3.0}>3x</option>
                  <option value={4.0}>4x</option>
                  <option value={5.0}>5x</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRotate"
                  checked={autoRotate}
                  onChange={(e) => setAutoRotate(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="autoRotate" className="text-sm font-medium text-gray-700">
                  Auto-rotate for readability
                </label>
              </div>

              <button
                onClick={handleRetry}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </>
                )}
              </button>

              {imageData && (
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              )}
            </div>

            {/* Region Info */}
            {boundingBox && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">Region:</span> x={boundingBox.x.toFixed(2)}, y={boundingBox.y.toFixed(2)}, 
                w={boundingBox.width.toFixed(2)}, h={boundingBox.height.toFixed(2)}, page={page}
              </div>
            )}
          </div>

          {/* Balloon Details */}
          {renderBalloonDetails()}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-gray-600 flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Extracting BOC region from PDF...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-800">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Image Display */}
          {imageData && !loading && !error && (
            <div className="flex justify-center">
              <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm bg-gray-50 p-4">
                <img
                  src={imageData}
                  alt="BOC Region"
                  className="max-w-full h-auto"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
              </div>
            </div>
          )}

          {/* Empty State */}
          {!imageData && !loading && !error && (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Eye className="w-12 h-12 mb-3 text-gray-400" />
              <p className="text-lg">No BOC region to display</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegionViewModal;
