import { api } from './api';

/**
 * Downloads a document by type and patient ID securely using the Bearer token.
 */
export const downloadDocument = async (docType: 'history' | 'vaccines' | 'passport' | 'prescription', patientId: number) => {
  try {
    const response = await api.get(`/admin/documents/generate/${docType}/${patientId}`, {
      responseType: 'blob', // Important for handling binary data
    });
    
    // Create blob link to download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Extract filename from Content-Disposition header if possible, else default
    const disposition = response.headers['content-disposition'];
    let filename = `${docType}_${patientId}.pdf`;
    if (disposition && disposition.indexOf('attachment') !== -1) {
      const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
      const matches = filenameRegex.exec(disposition);
      if (matches != null && matches[1]) { 
        filename = matches[1].replace(/['"]/g, '');
      }
    }
    
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading document', error);
    throw error;
  }
};

/**
 * Gets a blob URL for previewing a document securely.
 * This is useful for iframes or embed tags.
 */
export const getDocumentPreviewUrl = async (docType: 'history' | 'vaccines' | 'passport' | 'prescription', patientId: number): Promise<string> => {
  const response = await api.get(`/admin/documents/generate/${docType}/${patientId}?preview=true`, {
    responseType: 'blob',
  });
  return window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
};
