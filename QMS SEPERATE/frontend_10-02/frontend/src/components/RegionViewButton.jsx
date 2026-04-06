import React, { useState } from 'react';
import { Eye } from 'lucide-react';
import RegionViewModal from './RegionViewModal';

const RegionViewButton = ({ 
  pdfId, 
  boundingBox, 
  page = 0,
  buttonText = "View Region",
  buttonClassName = "",
  showIcon = true,
  size = "md", // sm, md, lg
  variant = "primary" // primary, secondary, outline
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewRegion = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  // Variant classes
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700',
    outline: 'border border-blue-600 text-blue-600 hover:bg-blue-50'
  };

  const buttonClasses = `
    inline-flex items-center gap-2 rounded-md font-medium transition-colors
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size] || sizeClasses.md}
    ${variantClasses[variant] || variantClasses.primary}
    ${buttonClassName}
  `;

  // Validate required props
  if (!pdfId) {
    console.warn('RegionViewButton: pdfId is required');
    return null;
  }

  if (!boundingBox || !boundingBox.x !== undefined) {
    console.warn('RegionViewButton: boundingBox is required and must have coordinates');
    return null;
  }

  return (
    <>
      <button
        onClick={handleViewRegion}
        className={buttonClasses}
        title={`View region at (${boundingBox.x.toFixed(1)}, ${boundingBox.y.toFixed(1)})`}
      >
        {showIcon && <Eye className="w-4 h-4" />}
        {buttonText}
      </button>

      <RegionViewModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        pdfId={pdfId}
        boundingBox={boundingBox}
        page={page}
        title={`Region View - Page ${page + 1}`}
      />
    </>
  );
};

export default RegionViewButton;
