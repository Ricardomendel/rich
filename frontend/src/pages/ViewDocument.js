// ViewDocument.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  FileText, 
  Download, 
  Pencil, 
  Trash,     
  X 
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import DocViewer, { DocViewerRenderers } from "@cyntler/react-doc-viewer";
import "@cyntler/react-doc-viewer/dist/index.css";

const ViewDocument = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const { loading } = useAuth();
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    category: '',
    tags: ''
  });

  const fetchDocument = useCallback(async () => {
    try {

      const response = await api.get(`/documents/${id}`);
      
      if (!response.data || !response.data.document) {
        throw new Error('Invalid response format');
      }

      const documentData = response.data.document;
      console.log('Fetched document:', documentData);
      
      setDocument(documentData);
      setEditForm({
        title: documentData?.title || '',
        category: documentData?.category || 'other',
        tags: documentData.tags ? documentData.tags.join(', ') : ''
      });
    } catch (err) {
      console.error('Error fetching document:', err);
      if (err.code === 'ERR_NETWORK') {
        setError('Unable to connect to server. Please check if the server is running.');
      } else {
        setError(err.response?.data?.error || 'Failed to load document');
      }
    } 
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleDownload = async (documentId, filename) => {
    try {
      console.log('Downloading document:', documentId, filename);

      const response = await api.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
        headers: {
          'Accept': '*/*'
        }
      });

      // Create download URL
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = window.document.createElement('a');
      link.href = url;
      
      // Set the filename
      link.setAttribute('download', filename);
      window.document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Download error:', err);
      setError(`Failed to download document: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await api.delete(`/documents/${id}`);
        navigate('/documents');
      } catch (err) {
        setError('Failed to delete document');
      }
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      const response = await api.patch(`/documents/${id}`, editForm);
      setDocument(response.data);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update document');
    }
  };

  if (loading) {
    return <div className="text-center">Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">{error}</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {/* Document Header */}
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {isEditing ? 'Edit Document' : document?.title}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Uploaded on {new Date(document?.createdAt || '').toLocaleDateString()}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => handleDownload(document?._id, document?.filename)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </button>
          </div>
        </div>

        {/* Document Content */}
        {isEditing ? (
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">Select a category</option>
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                  <option value="contract">Contract</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tags
                </label>
                <input
                  type="text"
                  value={editForm.tags}
                  onChange={(e) => setEditForm({ ...editForm, tags: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm"
                  placeholder="Enter tags separated by commas"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="border-t border-gray-200">
            <dl>
              {/* Document Details */}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">File Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {document?.fileName}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {document?.category || 'Uncategorized'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Tags</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {document?.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">File Size</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {(document?.fileSize / 1024).toFixed(2)} KB
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Upload Date</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(document?.createdAt).toLocaleString()}
                </dd>
              </div>

              {/* Document Preview */}
              <div className="bg-white px-4 py-5 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 mb-4">Preview</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {document &&
                    <DocViewer documents={[
                      {
                        uri: `${process.env.REACT_APP_API_URL}/uploads/${document?.fileName}`
                      }
                    ]}
                    pluginRenderers={DocViewerRenderers} 
                    />}
                </dd>
              </div>

              {/* OCR Text (if available) */}
              {document?.metadata?.ocr && (
                <div className="bg-gray-50 px-4 py-5 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 mb-4">
                    Extracted Text (OCR)
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 bg-white p-4 rounded-lg shadow-sm">
                    <pre className="whitespace-pre-wrap font-sans">
                      {document?.metadata?.ocr}
                    </pre>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <X className="h-5 w-5 text-red-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewDocument;
