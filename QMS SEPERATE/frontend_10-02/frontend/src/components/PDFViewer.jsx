import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './PDFViewer.css';

// Set PDF.js worker
if (typeof window !== 'undefined') {
  // Use local worker file from public folder (most reliable, no CORS issues)
  // The worker file should be at /pdf.worker.min.mjs in the public folder
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  
  console.log('PDF.js worker configured:', pdfjsLib.GlobalWorkerOptions.workerSrc);
}

function PDFViewer({
  pdfData,
  pdfDimensions,
  currentPage,
  scale,
  boundingBoxes = [],
  notes = [],
  onSelectionComplete,
  onCanvasReady,
  onZoomChange,
  isPanMode = false,
  isSelectionMode = false,
  isNotesMode = false,
  isStampMode = false,
  isWhiteOutMode = false,
  rotation = 0,
  selectedBboxId = null,
  onBalloonClick = null,
  onBalloonDelete = null,
  onBalloonView = null
}) {
  const canvasRef = useRef(null);
  const annotationLayerRef = useRef(null);
  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);
  const pdfDataRef = useRef(null);
  const renderTaskRef = useRef(null);
  const dimensionsNotifiedRef = useRef(false);
  const prevPageRef = useRef(null);
  const prevScaleRef = useRef(null);
  const prevRotationRef = useRef(null);
  const prevContainerSizeRef = useRef({ width: 0, height: 0 });
  const prevCanvasSizeRef = useRef({ width: 0, height: 0 });
  const resizeTimeoutRef = useRef(null);
  const isRenderingRef = useRef(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [currentSelection, setCurrentSelection] = useState(null);
  const selectionBoxRef = useRef(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState(null);

  // Load PDF document when pdfData changes
  useEffect(() => {
    if (pdfData && pdfData !== pdfDataRef.current) {
      pdfDataRef.current = pdfData;
      dimensionsNotifiedRef.current = false; // Reset when loading new PDF
      loadPDFDocument();
    }
  }, [pdfData]);

  // Render page when PDF document, page, scale, or rotation changes
  // Use refs to track previous values and only re-render when they actually change
  useEffect(() => {
    // Only render if PDF is loaded
    if (pdfDocRef.current && canvasRef.current) {
      const pageChanged = prevPageRef.current !== currentPage;
      const scaleChanged = prevScaleRef.current !== scale;
      const rotationChanged = prevRotationRef.current !== rotation;
      
      // Render if values changed OR if this is the first render (refs are null)
      const isFirstRender = prevPageRef.current === null || 
                           prevScaleRef.current === null || 
                           prevRotationRef.current === null;
      
      if (isFirstRender || pageChanged || scaleChanged || rotationChanged) {
        prevPageRef.current = currentPage;
        prevScaleRef.current = scale;
        prevRotationRef.current = rotation;
        renderPage();
      }
    } else {
      // Initialize refs even if PDF not loaded yet
      if (prevPageRef.current === null) prevPageRef.current = currentPage;
      if (prevScaleRef.current === null) prevScaleRef.current = scale;
      if (prevRotationRef.current === null) prevRotationRef.current = rotation;
    }
  }, [currentPage, scale, rotation]);

  const loadPDFDocument = async () => {
    if (!pdfDataRef.current) return;
    
    try {
      // Verify worker is loaded
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        throw new Error('PDF.js worker not configured');
      }
      
      let bufferToUse = pdfDataRef.current;
      
      // Handle different data types
      if (bufferToUse instanceof Blob) {
        bufferToUse = await bufferToUse.arrayBuffer();
      } else if (typeof bufferToUse === 'string') {
        // If it's a URL, fetch it
        const response = await fetch(bufferToUse);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
        }
        bufferToUse = await response.arrayBuffer();
      } else if (!(bufferToUse instanceof ArrayBuffer)) {
        // Try to convert to ArrayBuffer
        if (bufferToUse.buffer instanceof ArrayBuffer) {
          bufferToUse = bufferToUse.buffer;
        } else {
          throw new Error('Invalid PDF data format. Expected ArrayBuffer, Blob, or URL string.');
        }
      }
      
      // Validate it's actually a PDF (check PDF header)
      const uint8Array = new Uint8Array(bufferToUse);
      if (uint8Array.length < 4) {
        throw new Error('PDF data is too short');
      }
      
      const pdfHeader = String.fromCharCode(
        uint8Array[0], 
        uint8Array[1], 
        uint8Array[2], 
        uint8Array[3]
      );
      
      if (pdfHeader !== '%PDF') {
        console.warn('PDF header check failed, but attempting to load anyway:', pdfHeader);
        // Don't throw, some PDFs might have different headers
      }
      
      console.log('Loading PDF, size:', bufferToUse.byteLength, 'bytes');
      
      // Create a copy of the buffer to avoid issues
      const bufferCopy = bufferToUse.slice(0);
      
      // Load PDF with error handling
      // Load PDF - match original frontend exactly
      const loadingTask = pdfjsLib.getDocument({ data: bufferCopy });
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      
      // Trigger render after loading - match original frontend
      if (canvasRef.current) {
        renderPage();
      }
      
    } catch (error) {
      console.error('Error loading PDF document:', error);
      if (onCanvasReady) {
        onCanvasReady({ error: error.message || 'Failed to load PDF' });
      }
    }
  };

  // Render annotations when boundingBoxes change
  // This should NOT trigger PDF re-render - only updates the annotation layer
  useEffect(() => {
    // Only render annotations if PDF canvas is already rendered
    // This prevents trying to render annotations before PDF is ready
    if (annotationLayerRef.current && boundingBoxes && pdfDimensions) {
      const canvas = canvasRef.current;
      // Check if canvas has been rendered (has width/height)
      if (canvas && canvas.style.width && parseFloat(canvas.style.width) > 0) {
        // Use requestAnimationFrame to batch DOM updates and prevent visual flicker
        requestAnimationFrame(() => {
          renderAnnotations();
        });
      }
    }
  }, [boundingBoxes, notes, selectedBboxId, isWhiteOutMode, currentPage, pdfDimensions]);

  const renderPage = async () => {
    // Match original frontend exactly - simple check
    if (!pdfDocRef.current || !canvasRef.current) return;
    
    // Prevent concurrent renders
    if (isRenderingRef.current) {
      return;
    }
    
    isRenderingRef.current = true;

    try {
      const pdf = pdfDocRef.current;
      const page = await pdf.getPage(currentPage);

      const container = containerRef.current;
      if (!container) {
        isRenderingRef.current = false;
        return;
      }

      // Container is already checked above, use it directly
      const containerRect = container.getBoundingClientRect();
      const maxWidth = containerRect.width - 40;
      const maxHeight = containerRect.height - 40;
      const devicePixelRatio = window.devicePixelRatio || 1;

      // Get the page's viewport with user-specified rotation
      const initialViewport = page.getViewport({ scale: 1.0, rotation: rotation });
      
      // Calculate scale to fit the container
      // This ensures the entire PDF page is visible
      const scaleToFitWidth = maxWidth / initialViewport.width;
      const scaleToFitHeight = maxHeight / initialViewport.height;
      const scaleToFit = Math.min(scaleToFitWidth, scaleToFitHeight);
      
      // Apply user zoom scale
      const finalScale = scaleToFit * scale;

      // Get viewport with the calculated scale and user rotation
      const viewport = page.getViewport({ scale: finalScale, rotation: rotation });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const displayWidth = viewport.width;
      const displayHeight = viewport.height;
      
      // Check if canvas size actually changed - if not, skip re-rendering the PDF
      const canvasSizeChanged = 
        Math.abs(displayWidth - prevCanvasSizeRef.current.width) > 0.5 ||
        Math.abs(displayHeight - prevCanvasSizeRef.current.height) > 0.5;
      
      // If canvas size hasn't changed and PDF is already rendered, skip re-rendering
      // This prevents PDF from re-rendering when only annotations change
      if (!canvasSizeChanged && canvas.width > 0 && canvas.height > 0) {
        isRenderingRef.current = false;
        // Still update annotation layer size and render annotations if needed
        if (annotationLayerRef.current) {
          annotationLayerRef.current.style.width = displayWidth + 'px';
          annotationLayerRef.current.style.height = displayHeight + 'px';
        }
        // Don't call renderAnnotations here - it will be called by the useEffect when boundingBoxes change
        return;
      }
      
      prevCanvasSizeRef.current = { width: displayWidth, height: displayHeight };

      // Set canvas internal size to match viewport exactly (no clipping)
      // Only resize if dimensions actually changed to avoid clearing
      const newWidth = Math.ceil(displayWidth * devicePixelRatio);
      const newHeight = Math.ceil(displayHeight * devicePixelRatio);
      
      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
      }
      
      // Reset transform completely before any operations
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      
      // Scale the canvas context to match device pixel ratio
      ctx.scale(devicePixelRatio, devicePixelRatio);

      // Set canvas display size to match viewport exactly
      canvas.style.width = displayWidth + 'px';
      canvas.style.height = displayHeight + 'px';
      canvas.style.display = 'block';
      canvas.style.background = '#ffffff';
      canvas.style.maxWidth = 'none';
      canvas.style.maxHeight = 'none';

      if (annotationLayerRef.current) {
        annotationLayerRef.current.style.width = displayWidth + 'px';
        annotationLayerRef.current.style.height = displayHeight + 'px';
        annotationLayerRef.current.style.position = 'absolute';
        annotationLayerRef.current.style.top = '0';
        annotationLayerRef.current.style.left = '0';
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, displayWidth, displayHeight);

      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      
      try {
        await renderTask.promise;
        renderTaskRef.current = null;
      } catch (error) {
        // Ignore RenderingCancelledException - it's expected when cancelling
        // Check both error name and message for cancellation
        const isCancelled = error.name === 'RenderingCancelledException' || 
                           error.name === 'AbortException' ||
                           error.message?.includes('RenderingCancelled') ||
                           error.message?.includes('cancelled');
        
        if (!isCancelled) {
          throw error;
        }
        renderTaskRef.current = null;
        return; // Exit early if cancelled
      }

      // Size and position annotation layer to match canvas exactly
      // The annotation layer must be positioned at the same location as the canvas
      if (annotationLayerRef.current) {
        annotationLayerRef.current.style.width = displayWidth + 'px';
        annotationLayerRef.current.style.height = displayHeight + 'px';
        annotationLayerRef.current.style.position = 'absolute';
        annotationLayerRef.current.style.top = '0px';
        annotationLayerRef.current.style.left = '0px';
        // Ensure it's on top of canvas
        annotationLayerRef.current.style.zIndex = '10';
      }

      // Update PDF dimensions for annotation rendering (only once to avoid re-render loop)
      if (onCanvasReady && !dimensionsNotifiedRef.current) {
        dimensionsNotifiedRef.current = true;
        onCanvasReady({ 
          width: displayWidth, 
          height: displayHeight,
          pdfWidth: initialViewport.width,
          pdfHeight: initialViewport.height
        });
      }

      // Render annotations immediately after page is rendered
      // Only if annotation layer exists and bounding boxes are available
      if (annotationLayerRef.current && boundingBoxes && pdfDimensions) {
        renderAnnotations();
      }
      } catch (error) {
        // Only log non-cancellation errors
        const isCancelled = error.name === 'RenderingCancelledException' || 
                         error.name === 'AbortException' ||
                         error.message?.includes('RenderingCancelled') ||
                         error.message?.includes('cancelled');
        
        if (!isCancelled) {
          console.error('Error rendering page:', error);
        }
    } finally {
      isRenderingRef.current = false;
    }
  };

  const renderAnnotations = () => {
    if (!annotationLayerRef.current || !boundingBoxes || !pdfDimensions) {
      console.log('renderAnnotations: Missing requirements', {
        hasAnnotationLayer: !!annotationLayerRef.current,
        hasBoundingBoxes: !!boundingBoxes,
        boundingBoxesCount: boundingBoxes?.length || 0,
        hasPdfDimensions: !!pdfDimensions
      });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('renderAnnotations: Canvas not available');
      return;
    }

    // Ensure annotation layer is sized correctly
    const canvasDisplayWidth = parseFloat(canvas.style.width) || canvas.width / (window.devicePixelRatio || 1);
    const canvasDisplayHeight = parseFloat(canvas.style.height) || canvas.height / (window.devicePixelRatio || 1);
    
    if (annotationLayerRef.current) {
      annotationLayerRef.current.style.width = canvasDisplayWidth + 'px';
      annotationLayerRef.current.style.height = canvasDisplayHeight + 'px';
    }

    console.log('Rendering annotations:', {
      boundingBoxesCount: boundingBoxes.length,
      currentPage,
      pdfDimensions,
      canvasSize: { width: canvasDisplayWidth, height: canvasDisplayHeight },
      annotationLayerSize: {
        width: annotationLayerRef.current.style.width,
        height: annotationLayerRef.current.style.height
      }
    });

    // Preserve selection box if it exists
    let selectionBoxElement = null;
    const selectionBox = selectionBoxRef.current || currentSelection;
    if (selectionBox && annotationLayerRef.current && annotationLayerRef.current.contains(selectionBox)) {
      // Save the selection box element and its styles
      selectionBoxElement = selectionBox.cloneNode(true);
      selectionBoxElement.style.left = selectionBox.style.left;
      selectionBoxElement.style.top = selectionBox.style.top;
      selectionBoxElement.style.width = selectionBox.style.width;
      selectionBoxElement.style.height = selectionBox.style.height;
    }

    annotationLayerRef.current.innerHTML = '';
    
    // Restore selection box if it existed
    if (selectionBoxElement) {
      annotationLayerRef.current.appendChild(selectionBoxElement);
      setCurrentSelection(selectionBoxElement);
      selectionBoxRef.current = selectionBoxElement;
    } else {
      selectionBoxRef.current = null;
    }

    const scaleX = canvasDisplayWidth / pdfDimensions.width;
    const scaleY = canvasDisplayHeight / pdfDimensions.height;

    // Sort bounding boxes
    const pageBoxes = [...boundingBoxes]
      .filter(bbox => bbox.page === currentPage)
      .sort((a, b) => {
        const aOrder = a.display_order !== undefined && a.display_order !== null ? a.display_order : Infinity;
        const bOrder = b.display_order !== undefined && b.display_order !== null ? b.display_order : Infinity;
        if (aOrder !== Infinity || bOrder !== Infinity) {
          if (aOrder !== bOrder) {
            return aOrder - bOrder;
          }
        }
        const yDiff = a.y - b.y;
        if (Math.abs(yDiff) > 10) return yDiff;
        return a.x - b.x;
      });

    // Calculate cumulative row number from ALL previous pages
    let cumulativeRowNumber = 0;
    boundingBoxes.forEach((bbox) => {
      const boxPage = bbox.page !== undefined ? bbox.page : 1;
      if (boxPage < currentPage) {
        // Count rows from previous pages
        const dimensions = bbox.dimension_data || [];
        const gdtData = bbox.extracted_gdt || [];
        if (dimensions.length > 0) {
          cumulativeRowNumber += dimensions.length;
        } else if (gdtData.length > 0) {
          cumulativeRowNumber += gdtData.length;
        } else {
          cumulativeRowNumber += 1;
        }
      }
    });

    pageBoxes.forEach((bbox, index) => {
      const left = bbox.x * scaleX;
      const top = bbox.y * scaleY;
      const width = bbox.width * scaleX;
      const height = bbox.height * scaleY;

      const annotation = document.createElement('div');
      annotation.className = 'annotation-box';
      // Set all positioning and sizing styles
      annotation.style.position = 'absolute';
      annotation.style.left = left + 'px';
      annotation.style.top = top + 'px';
      annotation.style.width = width + 'px';
      annotation.style.height = height + 'px';
      annotation.style.boxSizing = 'border-box';
      annotation.style.zIndex = '5';
      annotation.style.display = 'block';
      annotation.style.visibility = 'visible';
      
      const processedDimensions = bbox.dimension_data || [];
      const gdtData = bbox.extracted_gdt || [];
      
      // Calculate number of rows this bbox will create in the table
      let numRows = 0;
      if (processedDimensions.length > 0) {
        numRows = processedDimensions.length;
      } else if (gdtData.length > 0) {
        numRows = gdtData.length;
      } else {
        numRows = 1;
      }
      
      const startRowNumber = cumulativeRowNumber + 1;
      const endRowNumber = cumulativeRowNumber + numRows;
      
      // Create balloon label - show range if multiple rows, single number if one row
      const balloonLabel = numRows > 1 ? `${startRowNumber}-${endRowNumber}` : `${startRowNumber}`;
      
      annotation.title = bbox.label || `Box ${balloonLabel}`;
      
      const bboxId = bbox.id !== undefined && bbox.id !== null ? String(bbox.id) : String(index);
      const selectedId = selectedBboxId !== null && selectedBboxId !== undefined ? String(selectedBboxId) : null;
      
      if (!isWhiteOutMode && selectedId !== null && selectedId === bboxId) {
        annotation.style.borderColor = '#3b82f6'; // Blue color matching frontend2 theme
        annotation.style.borderWidth = '3px';
        annotation.style.borderStyle = 'solid';
      } else if (!isWhiteOutMode) {
        annotation.style.borderColor = '#10b981'; // Green color matching frontend2 success color
        annotation.style.borderWidth = '2px';
        annotation.style.borderStyle = 'solid';
        annotation.style.backgroundColor = 'transparent';
      }
      
      if (isWhiteOutMode) {
        annotation.style.backgroundColor = '#ffffff';
        annotation.style.borderColor = '#ffffff';
        annotation.style.borderWidth = '0px';
        annotation.style.borderStyle = 'none';
        annotation.style.zIndex = '10';
        annotation.style.opacity = '1';
      }
      
      if (onBalloonClick && !isSelectionMode && !isNotesMode && !isStampMode && !isWhiteOutMode) {
        annotation.style.cursor = 'pointer';
        annotation.addEventListener('click', (e) => {
          e.stopPropagation();
          onBalloonClick(bboxId, startRowNumber);
        });
      }
      
      annotationLayerRef.current.appendChild(annotation);

      // Draw balloon (red circle with triangle) - skip if white out mode
      if (!isWhiteOutMode) {
        drawAreaBalloon(bbox, left, top, width, height, index, bboxId, balloonLabel);
      }
      
      // Update cumulative row number
      cumulativeRowNumber += numRows;
    });
    
    console.log(`Rendered ${pageBoxes.length} bounding boxes with balloons`);

    // Render notes
    if (notes && notes.length > 0) {
      notes.forEach((note, index) => {
        if (!note.page || note.page !== currentPage) return;

        const noteLeft = note.x * scaleX;
        const noteTop = note.y * scaleY;
        const noteWidth = note.width * scaleX;
        const noteHeight = note.height * scaleY;

        const noteAnnotation = document.createElement('div');
        noteAnnotation.className = 'annotation-box';
        noteAnnotation.style.position = 'absolute';
        noteAnnotation.style.left = noteLeft + 'px';
        noteAnnotation.style.top = noteTop + 'px';
        noteAnnotation.style.width = noteWidth + 'px';
        noteAnnotation.style.height = noteHeight + 'px';
        noteAnnotation.style.borderColor = '#f59e0b'; // Yellow/orange color
        noteAnnotation.style.borderWidth = '2px';
        noteAnnotation.style.borderStyle = 'solid';
        noteAnnotation.style.backgroundColor = 'rgba(245, 158, 11, 0.1)';
        noteAnnotation.style.boxSizing = 'border-box';
        noteAnnotation.style.zIndex = '5';
        noteAnnotation.title = note.note_text || 'Note';
        
        annotationLayerRef.current.appendChild(noteAnnotation);
      });
    }
  };

  const drawAreaBalloon = (bbox, left, top, width, height, index, bboxId, balloonLabel) => {
    if (!annotationLayerRef.current) return;
    
    // Determine balloon size based on label length
    const isRangeLabel = typeof balloonLabel === 'string' && balloonLabel.includes('-');
    const balloonSize = isRangeLabel ? 32 : 20; // Wider for ranges like "1-3"
    const lineOffset = 8; // Closer to bbox
    const triangleSize = 8; // Smaller triangle
    
    // Position balloon to the LEFT of the bbox, vertically centered
    // left, top, width, height are already in display pixels (scaled from PDF coordinates)
    // These coordinates are relative to the annotation layer which is positioned at (0,0) matching the canvas
    const totalBalloonWidth = balloonSize + triangleSize;
    // Position container so the triangle (on the right) points to the bbox
    const balloonX = left - lineOffset - totalBalloonWidth; // Position to the left of bbox
    const balloonY = top + (height / 2) - (balloonSize / 2); // Center vertically with bbox center

    const bboxIdToUse = bboxId || (bbox.id !== undefined && bbox.id !== null ? String(bbox.id) : String(index));
    const selectedId = selectedBboxId !== null && selectedBboxId !== undefined ? String(selectedBboxId) : null;
    const isSelected = selectedId !== null && selectedId === bboxIdToUse;

    // Create balloon container (circle + triangle)
    const balloonContainer = document.createElement('div');
    balloonContainer.style.position = 'absolute';
    balloonContainer.style.left = balloonX + 'px';
    balloonContainer.style.top = balloonY + 'px';
    balloonContainer.style.width = totalBalloonWidth + 'px'; // Circle + triangle width
    balloonContainer.style.height = balloonSize + 'px';
    balloonContainer.style.zIndex = '20';
    balloonContainer.style.pointerEvents = 'auto';
    balloonContainer.setAttribute('data-bbox-id', bboxIdToUse);

    // Create circle (white background, red border, red number)
    const circle = document.createElement('div');
    circle.style.position = 'absolute';
    circle.style.left = '0px'; // Circle at the left of container
    circle.style.top = '0px';
    circle.style.width = balloonSize + 'px';
    circle.style.height = balloonSize + 'px';
    circle.style.borderRadius = isRangeLabel ? '12px' : '50%'; // Rounded rectangle for ranges, circle for single
    circle.style.border = '2px solid #ef4444'; // Red border
    circle.style.backgroundColor = '#ffffff'; // White fill
    circle.style.color = '#ef4444'; // Red number
    circle.style.fontSize = isRangeLabel ? '9px' : '11px'; // Smaller font for ranges
    circle.style.fontWeight = '600';
    circle.style.textAlign = 'center';
    circle.style.lineHeight = balloonSize + 'px';
    circle.style.zIndex = '2';
    circle.style.display = 'flex';
    circle.style.alignItems = 'center';
    circle.style.justifyContent = 'center';
    circle.textContent = balloonLabel;
    
    if (isSelected) {
      circle.style.borderColor = '#3b82f6';
      circle.style.color = '#3b82f6';
    }
    
    // Create triangle pointer (red filled triangle pointing RIGHT towards the bbox)
    // The triangle should be at the right edge of the container, pointing right towards the bbox
    const triangle = document.createElement('div');
    triangle.style.position = 'absolute';
    triangle.style.left = balloonSize + 'px'; // Triangle at the right edge of circle (pointing right towards bbox)
    triangle.style.top = (balloonSize / 2 - triangleSize / 2) + 'px'; // Center vertically
    triangle.style.width = '0';
    triangle.style.height = '0';
    triangle.style.borderTop = (triangleSize / 2) + 'px solid transparent';
    triangle.style.borderBottom = (triangleSize / 2) + 'px solid transparent';
    triangle.style.borderLeft = triangleSize + 'px solid #ef4444'; // Red triangle pointing right (using borderLeft creates right-pointing triangle)
    triangle.style.zIndex = '2';

    // Create delete button
    const deleteButton = document.createElement('div');
    deleteButton.style.position = 'absolute';
    deleteButton.style.top = '-8px'; // Position above the circle
    deleteButton.style.right = '-8px'; // Position to the right of the circle
    deleteButton.style.width = '16px';
    deleteButton.style.height = '16px';
    deleteButton.style.borderRadius = '50%';
    deleteButton.style.backgroundColor = '#ef4444'; // Red background
    deleteButton.style.color = '#ffffff'; // White cross
    deleteButton.style.border = '2px solid #ffffff';
    deleteButton.style.fontSize = '10px';
    deleteButton.style.fontWeight = 'bold';
    deleteButton.style.display = 'none'; // Initially hidden
    deleteButton.style.alignItems = 'center';
    deleteButton.style.justifyContent = 'center';
    deleteButton.style.cursor = 'pointer';
    deleteButton.style.zIndex = '30';
    deleteButton.innerHTML = '×'; // Cross mark
    deleteButton.title = 'Delete balloon';

    // Create view button
    const viewButton = document.createElement('div');
    viewButton.style.position = 'absolute';
    viewButton.style.top = '-8px'; // Position above the circle
    viewButton.style.left = '-8px'; // Position to the left of the circle
    viewButton.style.width = '16px';
    viewButton.style.height = '16px';
    viewButton.style.borderRadius = '50%';
    viewButton.style.backgroundColor = '#3b82f6'; // Blue background
    viewButton.style.color = '#ffffff'; // White eye icon
    viewButton.style.border = '2px solid #ffffff';
    viewButton.style.fontSize = '10px';
    viewButton.style.fontWeight = 'bold';
    viewButton.style.display = 'none'; // Initially hidden
    viewButton.style.alignItems = 'center';
    viewButton.style.justifyContent = 'center';
    viewButton.style.cursor = 'pointer';
    viewButton.style.zIndex = '30';
    viewButton.innerHTML = '👁'; // Eye icon
    viewButton.title = 'View region';

    // Add hover functionality
    balloonContainer.addEventListener('mouseenter', () => {
      deleteButton.style.display = 'flex';
      viewButton.style.display = 'flex';
    });

    balloonContainer.addEventListener('mouseleave', () => {
      deleteButton.style.display = 'none';
      viewButton.style.display = 'none';
    });

    // Add delete functionality
    deleteButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onBalloonDelete) {
        onBalloonDelete(bboxIdToUse, e);
      }
    });

    // Add view functionality
    viewButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onBalloonView) {
        onBalloonView(bbox, currentPage);
      }
    });

    balloonContainer.appendChild(circle);
    balloonContainer.appendChild(triangle);
    balloonContainer.appendChild(deleteButton);
    balloonContainer.appendChild(viewButton);
    
    // Add click handler
    if (onBalloonClick && !isSelectionMode && !isNotesMode && !isStampMode && !isWhiteOutMode) {
      balloonContainer.style.cursor = 'pointer';
      balloonContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        // Extract first number from label for click handler
        const firstNumber = typeof balloonLabel === 'string' ? parseInt(balloonLabel.split('-')[0]) : balloonLabel;
        onBalloonClick(bboxIdToUse, firstNumber);
      });
    }
    
    annotationLayerRef.current.appendChild(balloonContainer);
  };

  const getCanvasDisplaySize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return { width: 0, height: 0 };

    const styleWidth = parseFloat(canvas.style.width);
    const styleHeight = parseFloat(canvas.style.height);

    if (styleWidth > 0 && styleHeight > 0) {
      return { width: styleWidth, height: styleHeight };
    }

    const devicePixelRatio = window.devicePixelRatio || 1;
    return {
      width: canvas.width / devicePixelRatio,
      height: canvas.height / devicePixelRatio
    };
  };

  const handleMouseDown = (e) => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // If in pan mode, start panning
    if (isPanMode) {
      setIsPanning(true);
      setPanStart({
        x: e.clientX + containerRef.current.scrollLeft,
        y: e.clientY + containerRef.current.scrollTop
      });
      canvasRef.current.style.cursor = 'grabbing';
      return;
    }
    
    // Only allow selection if selection mode, notes mode, or stamp mode is active
    if (!isSelectionMode && !isNotesMode && !isStampMode) {
      return;
    }
    
    // Start selection
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setSelectionStart({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // If in pan mode and panning, scroll the container
    if (isPanMode && isPanning && panStart) {
      e.preventDefault();
      containerRef.current.scrollLeft = panStart.x - e.clientX;
      containerRef.current.scrollTop = panStart.y - e.clientY;
      return;
    }
    
    // Update cursor in pan mode
    if (isPanMode) {
      canvasRef.current.style.cursor = 'grab';
      return;
    }
    
    // Update cursor in selection mode, notes mode, or stamp mode
    if ((isSelectionMode || isNotesMode || isStampMode) && !isSelecting) {
      canvasRef.current.style.cursor = 'crosshair';
      return;
    }
    
    // Only handle selection if selection mode, notes mode, or stamp mode is active
    if (!isSelectionMode && !isNotesMode && !isStampMode) {
      return;
    }
    
    // Handle selection
    if (!isSelecting || !selectionStart || !annotationLayerRef.current) return;

    // Ensure annotation layer is properly sized
    const canvas = canvasRef.current;
    const canvasDisplayWidth = parseFloat(canvas.style.width) || canvas.width / (window.devicePixelRatio || 1);
    const canvasDisplayHeight = parseFloat(canvas.style.height) || canvas.height / (window.devicePixelRatio || 1);
    
    if (annotationLayerRef.current) {
      annotationLayerRef.current.style.width = canvasDisplayWidth + 'px';
      annotationLayerRef.current.style.height = canvasDisplayHeight + 'px';
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const width = Math.abs(x - selectionStart.x);
    const height = Math.abs(y - selectionStart.y);
    const left = Math.min(selectionStart.x, x);
    const top = Math.min(selectionStart.y, y);

    if (!currentSelection) {
      const selection = document.createElement('div');
      selection.className = 'selection-box';
      selection.style.position = 'absolute';
      selection.style.pointerEvents = 'none';
      selection.style.zIndex = '20';
      selection.style.border = '2px dashed #3b82f6';
      selection.style.borderWidth = '2px';
      selection.style.borderStyle = 'dashed';
      selection.style.borderColor = '#3b82f6';
      selection.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      selection.style.boxSizing = 'border-box';
      selection.style.display = 'block';
      selection.style.visibility = 'visible';
      selection.style.opacity = '1';
      annotationLayerRef.current.appendChild(selection);
      setCurrentSelection(selection);
      selectionBoxRef.current = selection;
    }

    // Add null check before accessing style
    if (currentSelection) {
      currentSelection.style.left = left + 'px';
      currentSelection.style.top = top + 'px';
      currentSelection.style.width = Math.max(width, 2) + 'px';
      currentSelection.style.height = Math.max(height, 2) + 'px';
      currentSelection.style.display = 'block';
      currentSelection.style.visibility = 'visible';
      currentSelection.style.opacity = '1';
    }
  };

  const handleMouseUp = (e) => {
    // If panning, stop panning
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      if (canvasRef.current) {
        if (isPanMode) {
          canvasRef.current.style.cursor = 'grab';
        } else if (isSelectionMode) {
          canvasRef.current.style.cursor = 'crosshair';
        } else {
          canvasRef.current.style.cursor = 'default';
        }
      }
      return;
    }
    
    // Only handle selection if selection mode, notes mode, or stamp mode is active
    if (!isSelectionMode && !isNotesMode && !isStampMode) {
      // Clean up any partial selection if selection mode was turned off
      if (isSelecting) {
        setIsSelecting(false);
        const selectionBox = selectionBoxRef.current || currentSelection;
        if (selectionBox) {
          selectionBox.remove();
          setCurrentSelection(null);
          selectionBoxRef.current = null;
        }
        setSelectionStart(null);
      }
      return;
    }
    
    // Handle selection completion
    if (!isSelecting || !selectionStart || !currentSelection || !pdfDimensions) return;

    setIsSelecting(false);

    const selectionLeft = parseFloat(currentSelection.style.left);
    const selectionTop = parseFloat(currentSelection.style.top);
    const selectionWidth = parseFloat(currentSelection.style.width);
    const selectionHeight = parseFloat(currentSelection.style.height);

    const canvasDisplay = getCanvasDisplaySize();
    const scaleX = pdfDimensions.width / canvasDisplay.width;
    const scaleY = pdfDimensions.height / canvasDisplay.height;

    const normalizedRegion = {
      x: selectionLeft * scaleX,
      y: selectionTop * scaleY,
      width: selectionWidth * scaleX,
      height: selectionHeight * scaleY,
      page: currentPage
    };

    if (onSelectionComplete) {
      onSelectionComplete(normalizedRegion);
    }

    const selectionBox = selectionBoxRef.current || currentSelection;
    if (selectionBox) {
      selectionBox.remove();
      setCurrentSelection(null);
      selectionBoxRef.current = null;
    }
    setSelectionStart(null);
  };

  const handleWheel = useCallback((e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      
      const zoomFactor = 0.1;
      const zoomDelta = -e.deltaY / 100;
      const newScale = scale + (zoomDelta * zoomFactor);
      
      const minScale = 0.3;
      const maxScale = 3.0;
      const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
      
      if (onZoomChange) {
        onZoomChange(clampedScale);
      }
    }
  }, [scale, onZoomChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const wheelHandler = (e) => {
      handleWheel(e);
    };

    canvas.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', wheelHandler);
    };
  }, [handleWheel]);

  useEffect(() => {
    if (canvasRef.current) {
      if (isPanMode) {
        canvasRef.current.style.cursor = 'grab';
      } else if (isSelectionMode || isNotesMode || isStampMode) {
        canvasRef.current.style.cursor = 'crosshair';
      } else {
        canvasRef.current.style.cursor = 'default';
      }
    }
  }, [isPanMode, isSelectionMode, isNotesMode, isStampMode]);

  // Handle mouse leave to stop panning
  const handleMouseLeave = () => {
    if (isPanning) {
      setIsPanning(false);
      setPanStart(null);
      if (canvasRef.current) {
        if (isPanMode) {
          canvasRef.current.style.cursor = 'grab';
        } else if (isSelectionMode || isNotesMode || isStampMode) {
          canvasRef.current.style.cursor = 'crosshair';
        } else {
          canvasRef.current.style.cursor = 'default';
        }
      }
    }
    if (isSelecting) {
      setIsSelecting(false);
      if (currentSelection) {
        currentSelection.remove();
        setCurrentSelection(null);
      }
      setSelectionStart(null);
    }
  };

  // Use ResizeObserver to trigger render when container gets dimensions
  // Only re-render PDF if container size actually changed (not just annotations)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !pdfDocRef.current) {
      return;
    }
    
    const resizeObserver = new ResizeObserver((entries) => {
      // Clear any pending resize timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Debounce resize events to avoid excessive re-renders
      resizeTimeoutRef.current = setTimeout(() => {
        // Only render if PDF is loaded and page is valid
        if (pdfDocRef.current && canvasRef.current) {
          const pdf = pdfDocRef.current;
          const rect = container.getBoundingClientRect();
          
          // Only render if container size actually changed (not just annotations updating)
          const sizeChanged = 
            Math.abs(rect.width - prevContainerSizeRef.current.width) > 1 ||
            Math.abs(rect.height - prevContainerSizeRef.current.height) > 1;
          
          if (rect.width > 0 && rect.height > 0 && pdf.numPages > 0) {
            if (currentPage >= 1 && currentPage <= pdf.numPages) {
              // Only render PDF if container size actually changed
              if (sizeChanged) {
                prevContainerSizeRef.current = { width: rect.width, height: rect.height };
                renderPage();
              }
            }
          }
        }
      }, 100); // 100ms debounce
    });
    
    resizeObserver.observe(container);
    
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [pdfData, currentPage]);

  return (
    <div 
      className={`pdf-canvas-container ${isSelectionMode || isNotesMode || isStampMode ? 'is-selecting' : ''}`}
      ref={containerRef} 
      style={{ width: '100%', height: '100%' }}
    >
      <div className="pdf-canvas-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
        <canvas 
          ref={canvasRef} 
          onMouseDown={handleMouseDown} 
          onMouseMove={handleMouseMove} 
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ 
            display: 'block', 
            position: 'relative', 
            zIndex: 1, 
            cursor: (isSelectionMode || isNotesMode || isStampMode) ? 'crosshair' : isPanMode ? (isPanning ? 'grabbing' : 'grab') : 'default',
            touchAction: 'none',
            userSelect: 'none'
          }}
        />
        <div 
          ref={annotationLayerRef} 
          className="annotation-layer" 
          style={{ 
            pointerEvents: 'none', 
            zIndex: 10,
            position: 'absolute',
            top: '0px',
            left: '0px',
            width: '0px',
            height: '0px'
          }}
        ></div>
      </div>
    </div>
  );
}

export default PDFViewer;
