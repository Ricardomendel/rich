// Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Upload, HardDrive, AlertCircle } from 'lucide-react';

const Dashboard = () => {
  const {loading } = useAuth();
  const [stats, setStats] = useState({
    totalDocuments: 0,
    recentDocuments: [],
    totalSize: 0,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Check auth state before making request
        const token = localStorage.getItem('token');
        console.log('Attempting dashboard fetch with token:', token);
  
        // Add explicit headers to the request
        const response = await api.get('/documents', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        //if (!token) {
          //throw new Error('No auth token available');
        //}

        // Set token in headers again just to be sure
        //api.defaults.headers.common['Authorization'] = `Bearer ${token}`;


        if (response.data && Array.isArray(response.data.documents)) {
          const documents = response.data.documents;
          
          setStats({
            totalDocuments: documents.length,
            recentDocuments: documents.slice(-5).reverse(), // Get last 5 documents in reverse chronological order
            totalSize: documents.reduce((acc, doc) => {
              const size = doc.fileSize || 0;
              return acc + size;
            }, 0)
          });
        } else {
          setStats({
            totalDocuments: 0,
            recentDocuments: [],
            totalSize: 0
          });
        }
      }catch (error) {
        console.error('Dashboard fetch error:', {
          status: error.response?.status,
          message: error.response?.data,
          token: !!localStorage.getItem('token')
        });
        setError('Failed to load dashboard data');
      }
    };

    fetchDashboardData();
  }, [loading]);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">
          <svg className="animate-spin h-8 w-8 mr-3 inline" viewBox="0 0 24 24">
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 p-4 rounded-md m-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Documents Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Documents
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.totalDocuments}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/documents"
                className="font-medium text-indigo-600 hover:text-indigo-900"
              >
                View all documents
              </Link>
            </div>
          </div>
        </div>

        {/* Storage Used Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <HardDrive className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Storage Used
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {formatFileSize(stats.totalSize)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Card */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Upload className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Quick Upload
                  </dt>
                  <dd className="text-sm text-gray-900">
                    Add new documents to your collection
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link
                to="/upload"
                className="font-medium text-indigo-600 hover:text-indigo-900"
              >
                Upload new document
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Documents */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Recent Documents
          </h3>
          <div className="mt-4">
            {stats.recentDocuments.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {stats.recentDocuments.map((doc) => (
                  <li key={doc._id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {doc.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(doc.fileSize)} • Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Link
                          to={`/documents/${doc._id}`}
                          className="inline-flex items-center shadow-sm px-2.5 py-0.5 border border-gray-300 text-sm leading-5 font-medium rounded-full text-gray-700 bg-white hover:bg-gray-50"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-6">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by uploading a document.
                </p>
                <div className="mt-6">
                  <Link
                    to="/upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Upload className="-ml-1 mr-2 h-5 w-5" />
                    Upload Document
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;