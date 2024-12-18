// frontend/src/components/DocumentApproval.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const DocumentApproval = ({ document, onApprove }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState('');

  if (user.role !== 'boss' || document.approvalStatus === 'approved') {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-lg font-medium">Document Approval</h3>
      <div className="mt-2">
        <textarea
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          className="w-full rounded-md border-gray-300"
          placeholder="Add approval comments..."
        />
      </div>
      <div className="mt-2 flex space-x-2">
        <button
          onClick={() => onApprove('approved', comments)}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Approve
        </button>
        <button
          onClick={() => onApprove('rejected', comments)}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Reject
        </button>
      </div>
    </div>
  );
};

export default DocumentApproval;