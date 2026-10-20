import api from '../api/client';

/**
 * Securely downloads an official academic PDF document using axios with responseType: 'blob'
 * and Authorization header. Triggers download via an Object URL.
 *
 * @param {string} documentId - Document identifier or ID
 * @param {string} [customName] - Optional custom filename
 * @returns {Promise<string>} Downloaded filename
 */
export async function downloadOfficialDocument(documentId, customName = null) {
  const token = localStorage.getItem('docai_token');
  if (!token) {
    throw new Error('Authentication required: please log in to download documents.');
  }

  try {
    const response = await api.get(`/documents/${documentId}/download`, {
      responseType: 'blob',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    // Determine filename from Content-Disposition header if provided
    let filename = customName || `${documentId}.pdf`;
    const disposition = response.headers['content-disposition'];
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (match && match[1]) {
        filename = match[1].replace(/['"]/g, '');
      }
    }

    // Create object URL and trigger download
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    // Clean up
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    }, 150);

    return filename;
  } catch (error) {
    // If responseType is blob, error payload will be a Blob instance
    if (error.response && error.response.data instanceof Blob) {
      try {
        const errorText = await error.response.data.text();
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `Download failed with status ${error.response.status}`);
      } catch (parseErr) {
        if (parseErr.message && !parseErr.message.includes('JSON')) {
          throw parseErr;
        }
        throw new Error(`Download failed with status ${error.response?.status || 500}`);
      }
    }
    throw new Error(error.response?.data?.message || error.message || 'Download failed');
  }
}
