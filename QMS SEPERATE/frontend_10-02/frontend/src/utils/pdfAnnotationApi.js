const API_BASE = 'http://172.18.100.26:8986/api/v1';

export const saveBoundingBox = async (partId, documentId, bbox, label) => {
  const response = await fetch(`${API_BASE}/pdf-annotation/bounding-box`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      part_id: partId,
      pdf_id: documentId ? String(documentId) : null,
      bounding_box: bbox,
      label: label || ''
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save: ${response.status} ${errorText}`);
  }
  
  return await response.json();
};

export const getBoundingBoxes = async (partId) => {
  const response = await fetch(`${API_BASE}/pdf-annotation/bounding-boxes/part/${partId}`);
  if (!response.ok) {
    throw new Error(`Failed to load: ${response.status}`);
  }
  return await response.json();
};

export const deleteBoundingBox = async (partId, balloonId) => {
  const response = await fetch(`${API_BASE}/pdf-annotation/bounding-box/part/${partId}/${balloonId}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete');
  }
  
  return await response.json();
};

export const updateBoundingBox = async (partId, balloonId, data) => {
  try {
    const response = await fetch(`${API_BASE}/pdf-annotation/bounding-box/part/${partId}/${balloonId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch (e) {
        errorText = `HTTP ${response.status} ${response.statusText}`;
      }
      
      // Provide more specific error messages
      if (response.status === 404) {
        throw new Error(`Bounding box ${balloonId} not found for part ${partId}. It may not have been created yet.`);
      } else if (response.status === 500) {
        throw new Error(`Server error updating bounding box: ${errorText}. The bounding box may have been created but the update failed.`);
      } else {
        throw new Error(`Failed to update bounding box: ${response.status} ${errorText}`);
      }
    }
    
    return await response.json();
  } catch (error) {
    // Re-throw with more context if it's a network error
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Network error: Unable to reach the server. Please check your connection and CORS settings. Original error: ${error.message}`);
    }
    throw error;
  }
};

export const processDimensions = async (partId, documentId, region, rotationAngle = null) => {
  // Backend requires pdf_id to be a string (not null)
  // If documentId is not provided, we need to handle it
  // For now, use a placeholder or skip the call
  if (!documentId) {
    throw new Error('documentId is required for processing dimensions. Please ensure the part has an associated document.');
  }
  
  const body = {
    part_id: partId,
    pdf_id: String(documentId), // Backend requires string, not null
    bounding_box: region,
    scale_factor: 1.0,
    check_overlaps: false
  };
  
  if (rotationAngle !== null) {
    body.rotation_angle = rotationAngle;
  }
  
  const response = await fetch(`${API_BASE}/pdf-annotation/process-dimensions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to process dimensions: ${response.status} ${errorText}`);
  }
  
  return await response.json();
};

export const extractText = async (partId, documentId, region, rotationAngle = null) => {
  const body = {
    part_id: partId,
    pdf_id: documentId ? String(documentId) : null,
    bounding_box: region,
    scale_factor: 1.0,
    check_overlaps: false
  };
  
  if (rotationAngle !== null) {
    body.rotation_angle = rotationAngle;
  }
  
  const response = await fetch(`${API_BASE}/pdf-annotation/extract-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to extract text: ${response.status} ${errorText}`);
  }
  
  return await response.json();
};

export const extractGDT = async (partId, documentId, region, rotationAngle = null) => {
  if (!documentId) {
    throw new Error('documentId is required for GDT extraction. Please ensure the part has an associated document.');
  }
  
  const body = {
    part_id: partId,
    pdf_id: String(documentId),
    bounding_box: region,
    scale_factor: 1.0,
    check_overlaps: false
  };
  
  if (rotationAngle !== null) {
    body.rotation_angle = rotationAngle;
  }
  
  const response = await fetch(`${API_BASE}/pdf-annotation/extract-gdt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to extract GDT: ${response.status} ${errorText}`);
  }
  
  return await response.json();
};

export const downloadBalloonedPDF = async (documentId) => {
  if (!documentId) {
    throw new Error('Document ID is required for downloading ballooned PDF.');
  }
  
  const response = await fetch(`${API_BASE}/pdf-annotation/pdf/${documentId}/download-ballooned`, {
    method: 'GET'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to download ballooned PDF: ${response.status} ${errorText}`);
  }
  
  // Get the blob and create download link
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `ballooned_drawing_${documentId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  
  return true;
};
