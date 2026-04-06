import { create } from 'zustand';

export const getBalloonedPdfDownloadUrl = (pdfId) =>
  `http://172.18.100.26:8986/api/v1/pdf-annotation/pdf/${pdfId}/download-ballooned`;

const useReportStore = create((set, get) => ({
  // Initial state
  reportData: null,
  loading: false,
  error: null,
  
  // Fetch part report
  fetchPartReport: async (partId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`http://172.18.100.26:8986/api/v1/reports/parts/${partId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch report: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      set({ reportData: data, loading: false });
      return data;
    } catch (error) {
      console.error('Error fetching part report:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  // Clear report data
  clearReportData: () => {
    set({ reportData: null, error: null });
  },
}));

export default useReportStore;