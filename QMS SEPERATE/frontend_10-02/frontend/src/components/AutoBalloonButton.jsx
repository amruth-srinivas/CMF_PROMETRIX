import React, { useState } from 'react';
import { Brain, CheckCircle, XCircle, Loader2, Zap } from 'lucide-react';

const AutoBalloonButton = ({ 
  onAutoBalloon, 
  isProcessing = false, 
  progress = 0, 
  totalPages = 0,
  currentPage = 0,
  status = 'idle', // 'idle', 'processing', 'completed', 'error'
  results = null 
}) => {
  const [showOverlay, setShowOverlay] = useState(true);

  // When status changes to completed or error, make sure overlay is visible again
  React.useEffect(() => {
    if (status === 'completed' || status === 'error') {
      setShowOverlay(true);
    }
  }, [status]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader2 className="auto-balloon-icon auto-balloon-icon-spin" />;
      case 'completed':
        return <CheckCircle className="auto-balloon-icon auto-balloon-icon-success" />;
      case 'error':
        return <XCircle className="auto-balloon-icon auto-balloon-icon-error" />;
      default:
        return <Brain className="auto-balloon-icon" />;
    }
  };

  const getStatusText = () => {
    if (status === 'processing') {
      return `Processing ${currentPage}/${totalPages}`;
    }
    if (status === 'completed') {
      return `Created ${results?.created || 0}`;
    }
    if (status === 'error') {
      return 'Error';
    }
    return 'Auto Balloon';
  };

  const getProgressPercentage = () => {
    if (totalPages === 0) return 0;
    return (progress / totalPages) * 100;
  };

  const handleButtonClick = () => {
    if (status === 'processing') {
      // Can add pause functionality here if needed
      return;
    }
    onAutoBalloon();
  };

  return (
    <div className="auto-balloon-wrapper">
      <button
        onClick={handleButtonClick}
        disabled={status === 'processing'}
        className={`sidebar-tool-button auto-balloon-button ${
          status === 'processing'
            ? 'auto-balloon-button-processing'
            : status === 'completed'
            ? 'auto-balloon-button-completed'
            : status === 'error'
            ? 'auto-balloon-button-error'
            : ''
        }`}
        title={getStatusText()}
      >
        <div className="auto-balloon-icon-stack">
          {getStatusIcon()}
          {status === 'idle' && <Zap className="auto-balloon-zap" />}
        </div>
      </button>

      {/* Progress mini-bar under the button for quick feedback */}
      {status === 'processing' && (
        <div className="auto-balloon-progress">
          <div className="auto-balloon-progress-bar">
            <div
              className="auto-balloon-progress-fill"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <p className="auto-balloon-progress-text">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}

      {/* Results summary (center overlay) */}
      {status === 'completed' && results && showOverlay && (
        <div className="auto-balloon-results-overlay">
          <div className="auto-balloon-results-card">
            <div className="auto-balloon-results-header">
              <span className="auto-balloon-results-title">Auto-Balloon Results</span>
              <button
                className="auto-balloon-results-close"
                onClick={() => setShowOverlay(false)}
                aria-label="Close results"
              >
                ×
              </button>
            </div>

            <div className="auto-balloon-results-summary">
              <div>
                <span className="label">Total Created</span>
                <span className="value">{results.created}</span>
              </div>
              <div>
                <span className="label">Total Skipped</span>
                <span className="value">{results.skipped}</span>
              </div>
              <div>
                <span className="label">Text Detections</span>
                <span className="value">{results.text_detections}</span>
              </div>
              <div>
                <span className="label">GDT Symbols</span>
                <span className="value">{results.gdt_detections}</span>
              </div>
              <div>
                <span className="label">Dimensions</span>
                <span className="value">{results.dimensions}</span>
              </div>
            </div>

            {results.page_results && (
              <div className="auto-balloon-results-details">
                <div className="details-title">Page-by-page</div>
                <div className="details-list">
                  {results.page_results.map((pageResult, index) => (
                    <div key={index} className="details-row">
                      <div className="details-row-header">
                        <span>Page {pageResult.page}</span>
                        <span>{pageResult.created} created · {pageResult.skipped} skipped</span>
                      </div>
                      <div className="details-row-metrics">
                        Text {pageResult.text_detections} · GDT {pageResult.gdt_detections} · Dim {pageResult.dimensions}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message (center overlay) */}
      {status === 'error' && showOverlay && (
        <div className="auto-balloon-results-overlay">
          <div className="auto-balloon-results-card auto-balloon-results-card-error">
            <div className="auto-balloon-results-header">
              <span className="auto-balloon-results-title">Auto-Balloon Error</span>
              <button
                className="auto-balloon-results-close"
                onClick={() => setShowOverlay(false)}
                aria-label="Close error"
              >
                ×
              </button>
            </div>
            <p className="auto-balloon-results-error-text">
              {results?.error || 'An error occurred during auto-ballooning. Please try again.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AutoBalloonButton;
