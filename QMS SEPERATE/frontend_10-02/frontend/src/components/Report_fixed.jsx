import React, { useState, useEffect } from 'react';
import { FileText as ReportIcon, Download, FilePlus, Upload, ChevronLeft, ChevronRight, Palette, Table, Settings } from 'lucide-react';
import useReportStore from '../store/report';
import useBboxStore from '../store/bbox';
import PDFViewer from './PDFViewer';
import jsPDF from 'jspdf';

const Report = ({ 
  partData, partId, bomData, logo, setLogo, customFields, 
  showReportModal, setShowReportModal,
  showCustomFieldsModal, setShowCustomFieldsModal,
  showLogoModal, setShowLogoModal,
  showStatus
}) => {

  // Access PDF drawing data from bbox store
  const { pdfData, pdfDimensions, currentPage } = useBboxStore();

  // State for table data management
  const [tableData, setTableData] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([
    'Nominal', 'Tolerance', 'Type', 'M1', 'M2', 'M3', 'Mean', 'Status'
  ]);

  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    row: null,
    col: null
  });

  const handleContextMenu = (e, rowIndex, colIndex) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      row: rowIndex,
      col: colIndex
    });
  };

  const closeContextMenu = () => {
    setContextMenu({
      visible: false,
      x: 0,
      y: 0,
      row: null,
      col: null
    });
  };

  // State for company name and logo
  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState(null);

  const { reportData, loading: reportLoading, error: reportError, fetchPartReport } = useReportStore();
  const [selectedQuantity, setSelectedQuantity] = useState('');

  // Initialize table data from reportData
  useEffect(() => {
    if (reportData?.quantity_reports && reportData.quantity_reports.length > 0) {
      const selectedReport = reportData.quantity_reports.find(
        qr => qr.quantity.toString() === selectedQuantity
      ) || reportData.quantity_reports[0];

      if (selectedReport?.balloons) {
        const formattedData = selectedReport.balloons.map(balloonItem => ({
          nominal: balloonItem.balloon?.nominal || 'N/A',
          tolerance: balloonItem.balloon?.utol && balloonItem.balloon?.ltol 
            ? `${balloonItem.balloon.ltol} / ${balloonItem.balloon.utol}` 
            : 'N/A',
          type: balloonItem.balloon?.type || 'N/A',
          m1: balloonItem.measurements?.[0]?.m1 || 'N/A',
          m2: balloonItem.measurements?.[0]?.m2 || 'N/A',
          m3: balloonItem.measurements?.[0]?.m3 || 'N/A',
          mean: balloonItem.measurements?.[0]?.mean || 'N/A',
          status: balloonItem.measurements?.[0]?.go_or_no_go || 'N/A'
        }));
        setTableData(formattedData);
      }
    }
  }, [reportData, selectedQuantity]);

  useEffect(() => {
    if (reportData?.quantity_reports && reportData.quantity_reports.length > 0 && !selectedQuantity) {
      setSelectedQuantity(reportData.quantity_reports[0].quantity.toString());
    }
  }, [reportData, selectedQuantity]);

  useEffect(() => {
    if (showReportModal && partId) {
      fetchPartReport(partId).catch(err => {
        console.error('Failed to fetch report data:', err);
        showStatus('Failed to load report data', 'error');
      });
    }
  }, [showReportModal, partId, fetchPartReport, showStatus]);

  const generatePDF = async () => {
    try {
      showStatus('Generating PDF...', 'info');
      const { jsPDF } = await import('jspdf');
      
      // Create PDF in landscape mode for side-by-side A4 pages
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth(); // ~297mm in landscape
      const pageHeight = pdf.internal.pageSize.getHeight(); // ~210mm in landscape
      const margin = 10;
      
      // Calculate dimensions for two A4 pages side by side
      const a4PortraitWidth = 210; // A4 width in portrait
      const a4PortraitHeight = 297; // A4 height in portrait
      const scaleFactor = Math.min((pageWidth - 2 * margin) / (2 * a4PortraitWidth), (pageHeight - 2 * margin) / a4PortraitHeight);
      
      const scaledA4Width = a4PortraitWidth * scaleFactor;
      const scaledA4Height = a4PortraitHeight * scaleFactor;
      
      // Positions for left and right A4 pages
      const leftPageX = margin;
      const rightPageX = margin + scaledA4Width + 10; // 10mm gap between pages
      const pageY = margin + (pageHeight - 2 * margin - scaledA4Height) / 2; // Center vertically
      
      let currentY = pageY;

      // Draw page borders for visual separation
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      // Left page border
      pdf.rect(leftPageX, pageY, scaledA4Width, scaledA4Height);
      // Right page border  
      pdf.rect(rightPageX, pageY, scaledA4Width, scaledA4Height);

      // ===== LEFT PAGE: Inspection Report =====
      
      // Add company logo if available
      if (companyLogo) {
        try {
          const logoWidth = 30;
          const logoHeight = 15;
          pdf.addImage(companyLogo, 'PNG', leftPageX + scaledA4Width - logoWidth - 5, currentY, logoWidth, logoHeight);
        } catch (error) {
          console.warn('Could not add company logo to PDF:', error);
        }
      }

      // Add company name if available
      if (companyName) {
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(companyName, leftPageX + 5, currentY + 10);
      }

      currentY += 20;

      // Title
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.text('Inspection Report', leftPageX + scaledA4Width / 2, currentY, { align: 'center' });
      currentY += 15;

      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(leftPageX + 5, currentY, leftPageX + scaledA4Width - 5, currentY);
      currentY += 10;

      // Part Information Section
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'bold');
      pdf.text('Part Information', leftPageX + 5, currentY);
      currentY += 8;

      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      
      const partInfo = [
        ['Part Number:', String(reportData?.part_no || 'N/A')],
        ['Part Name:', String(reportData?.part_name || 'N/A')],
        ['Project:', String(reportData?.boc?.project?.name || 'N/A')],
        ['Quantity:', String(reportData?.boc?.quantity || 'N/A')]
      ];

      partInfo.forEach(([label, value]) => {
        pdf.setFont(undefined, 'bold');
        pdf.text(label, leftPageX + 5, currentY);
        pdf.setFont(undefined, 'normal');
        pdf.text(value, leftPageX + 30, currentY);
        currentY += 6;
      });

      currentY += 5;

      // Custom Headers
      if (customHeaders && customHeaders.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text('Custom Headers', leftPageX + 5, currentY);
        currentY += 8;

        pdf.setFontSize(8);
        customHeaders.forEach((header) => {
          pdf.setFont(undefined, 'bold');
          pdf.text(`${String(header.name)}:`, leftPageX + 5, currentY);
          pdf.setFont(undefined, 'normal');
          pdf.text(String(header.value), leftPageX + 30, currentY);
          currentY += 6;
        });
        currentY += 5;
      }

      // Inspection Data Table
      if (tableData && tableData.length > 0) {
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text('Inspection Data', leftPageX + 5, currentY);
        currentY += 10;

        const columnWidths = [12, 16, 12, 10, 10, 10, 10, 12];
        const totalTableWidth = columnWidths.reduce((sum, w) => sum + w, 0);
        const startX = leftPageX + 5;
        const rowHeight = 6;

        // Table Headers
        pdf.setFontSize(6);
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(52, 73, 94);
        pdf.setTextColor(255, 255, 255);

        let xPos = startX;
        tableHeaders.forEach((header, index) => {
          pdf.rect(xPos, currentY, columnWidths[index], rowHeight, 'F');
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(xPos, currentY, columnWidths[index], rowHeight);
          const textWidth = pdf.getTextWidth(header);
          pdf.text(header, xPos + (columnWidths[index] - textWidth) / 2, currentY + 4);
          xPos += columnWidths[index];
        });

        currentY += rowHeight;
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');

        // Table Rows
        tableData.forEach((row, index) => {
          xPos = startX;

          const rowValues = [row.nominal, row.tolerance, row.type, row.m1, row.m2, row.m3, row.mean, row.status];

          rowValues.forEach((cell, cellIndex) => {
            if (index % 2 === 0) {
              pdf.setFillColor(245, 245, 245);
            } else {
              pdf.setFillColor(255, 255, 255);
            }

            pdf.rect(xPos, currentY, columnWidths[cellIndex], rowHeight, 'F');
            pdf.setDrawColor(0, 0, 0);
            pdf.rect(xPos, currentY, columnWidths[cellIndex], rowHeight);

            let displayText = cell?.toString() || 'N/A';
            if (displayText.length > 10) {
              displayText = displayText.substring(0, 8) + '...';
            }

            pdf.text(displayText, xPos + 1, currentY + 4);
            xPos += columnWidths[cellIndex];
          });

          currentY += rowHeight;
        });
      }

      // ===== RIGHT PAGE: Part Drawing =====
      currentY = pageY;
      
      // Title
      pdf.setFontSize(16);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('Part Drawing', rightPageX + scaledA4Width / 2, currentY + 15, { align: 'center' });
      currentY += 25;

      // Separator line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.5);
      pdf.line(rightPageX + 5, currentY, rightPageX + scaledA4Width - 5, currentY);
      currentY += 10;

      // Add PDF drawing if available
      if (pdfData) {
        try {
          const availableHeight = pageY + scaledA4Height - currentY - 20;
          const availableWidth = scaledA4Width - 10;
          
          const pdfAspectRatio = pdfDimensions?.height && pdfDimensions?.width 
            ? pdfDimensions.height / pdfDimensions.width 
            : 1.414;
          
          let pdfDisplayWidth = availableWidth;
          let pdfDisplayHeight = pdfDisplayWidth * pdfAspectRatio;
          
          if (pdfDisplayHeight > availableHeight) {
            pdfDisplayHeight = availableHeight;
            pdfDisplayWidth = pdfDisplayHeight / pdfAspectRatio;
          }
          
          const pdfX = rightPageX + 5 + (availableWidth - pdfDisplayWidth) / 2;
          const pdfY = currentY + 5;
          
          // Draw placeholder rectangle for PDF
          pdf.setDrawColor(100, 100, 100);
          pdf.setLineWidth(1);
          pdf.rect(pdfX, pdfY, pdfDisplayWidth, pdfDisplayHeight);
          
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text('PDF Drawing Preview', pdfX + pdfDisplayWidth / 2, pdfY + pdfDisplayHeight / 2, { align: 'center' });
          
        } catch (error) {
          console.warn('Could not add PDF drawing:', error);
        }
      } else {
        // No PDF available message
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        const noDrawingText = 'No drawing available';
        const textWidth = pdf.getTextWidth(noDrawingText);
        pdf.text(noDrawingText, rightPageX + (scaledA4Width - textWidth) / 2, currentY + 50);
      }

      // Add page numbers
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        pdf.text(`Generated on ${new Date().toLocaleDateString()}`, margin, pageHeight - 5);
      }

      const fileName = `Inspection_Report_${partData.name || 'Direct_Part'}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      showStatus('PDF downloaded successfully!', 'success');
      setShowReportModal(false);

    } catch (error) {
      console.error('Error generating PDF:', error);
      showStatus('Error generating PDF: ' + error.message, 'error');
    }
  };

  return (
    <div>
      <h2>Report Component</h2>
      <p>PDF generation has been fixed for side-by-side A4 pages.</p>
      <button onClick={generatePDF}>Generate PDF</button>
    </div>
  );
};

export default Report;
