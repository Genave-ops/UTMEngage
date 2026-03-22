import { useState, useEffect } from 'react';
import { committeesAPI } from '../services/api';
import { Card, Button, LoadingSpinner, EmptyState } from './UI.jsx';
import { UserPlus, CheckCircle, XCircle, Clock } from 'lucide-react';

const JoinRequestsManager = ({ committeeId, isCreator }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(null);

  useEffect(() => {
    if (isCreator) {
      fetchJoinRequests();
    }
  }, [committeeId, isCreator]);

  const fetchJoinRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await committeesAPI.getJoinRequests(committeeId);
      setRequests(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load join requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setProcessingRequest(requestId);
      await committeesAPI.approveJoinRequest(committeeId, requestId);
      alert('Join request approved successfully!');
      fetchJoinRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async (requestId) => {
    if (!confirm('Are you sure you want to reject this join request?')) return;

    try {
      setProcessingRequest(requestId);
      await committeesAPI.rejectJoinRequest(committeeId, requestId);
      alert('Join request rejected');
      fetchJoinRequests();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  if (!isCreator) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <div className="flex items-center gap-3 text-red-800">
          <XCircle className="h-5 w-5" />
          <p>{error}</p>
          <Button variant="outline" onClick={fetchJoinRequests} className="ml-auto">
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (requests.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={UserPlus}
          title="No pending join requests"
          description="When users request to join your committee, they will appear here"
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Join Requests ({requests.length})
          </h3>
          <Button variant="outline" size="sm" onClick={fetchJoinRequests}>
            Refresh
          </Button>
        </div>

        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-gradient-to-br from-[#005eb8] to-[#00b5e2] rounded-full flex items-center justify-center text-white font-bold">
                  {(request.userName || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{request.userName || 'Unknown User'}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="capitalize">{request.userRole || 'member'}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {(request.requestedAt || request.createdAt)
                        ? new Date(request.requestedAt || request.createdAt).toLocaleDateString()
                        : 'Unknown date'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(request.id)}
                  disabled={processingRequest === request.id}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4" />
                  {processingRequest === request.id ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(request.id)}
                  disabled={processingRequest === request.id}
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default JoinRequestsManager;
