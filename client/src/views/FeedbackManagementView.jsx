import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  Archive,
  Star,
  AlertCircle,
  Lightbulb,
  Bug,
  HelpCircle,
  X,
  RefreshCw
} from 'lucide-react';
import { Card, Button, Input, Badge, LoadingSpinner, Modal } from '../components/UI';
import { feedbackAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const FeedbackManagementView = () => {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    search: ''
  });
  const [adminNotes, setAdminNotes] = useState('');
  const fetchIdRef = useRef(0);

  const fetchFeedback = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    try {
      const params = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.type !== 'all') params.type = filters.type;
      if (filters.search) params.search = filters.search;

      const response = await feedbackAPI.getAll(params);
      if (fetchId !== fetchIdRef.current) return;
      const data = response.data.feedback || [];
      const uniqueFeedback = data.filter((item, index, self) =>
        index === self.findIndex((i) => i.id === item.id)
      );
      setFeedback(uniqueFeedback);
    } catch (error) {
      if (fetchId !== fetchIdRef.current) return;
      console.error('Error fetching feedback:', error);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters.status, filters.type, filters.search]);

  useEffect(() => {
    fetchFeedback();
    fetchStats();
  }, [fetchFeedback]);

  const fetchStats = async () => {
    try {
      const response = await feedbackAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchFeedback();
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const response = await feedbackAPI.updateStatus(id, newStatus, adminNotes);
      fetchFeedback();
      fetchStats();
      if (selectedFeedback?.id === id) {
        setSelectedFeedback(response.data);
      }
      setAdminNotes('');
      alert(`Feedback marked as ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update feedback status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;

    try {
      await feedbackAPI.delete(id);
      fetchFeedback();
      fetchStats();
      setShowDetailModal(false);
      alert('Feedback deleted successfully');
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Failed to delete feedback');
    }
  };

  const handleExport = async () => {
    try {
      const params = {};
      if (filters.status !== 'all') params.status = filters.status;
      if (filters.type !== 'all') params.type = filters.type;

      const response = await feedbackAPI.exportCSV(params);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `feedback_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting feedback:', error);
      alert('Failed to export feedback');
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug': return <Bug size={16} className="text-red-500" />;
      case 'feature': return <Lightbulb size={16} className="text-yellow-500" />;
      case 'improvement': return <AlertCircle size={16} className="text-blue-500" />;
      default: return <HelpCircle size={16} className="text-gray-500" />;
    }
  };

  const getTypeBadge = (type) => {
    const config = {
      bug: { color: 'danger', label: 'Bug Report' },
      feature: { color: 'warning', label: 'Feature Request' },
      improvement: { color: 'info', label: 'Improvement' },
      general: { color: 'secondary', label: 'General' }
    };
    const typeConfig = config[type] || config.general;
    return <Badge variant={typeConfig.color}>{typeConfig.label}</Badge>;
  };

  const getStatusBadge = (status) => {
    const config = {
      new: { color: 'primary', label: 'New' },
      reviewed: { color: 'success', label: 'Reviewed' },
      archived: { color: 'secondary', label: 'Archived' }
    };
    const statusConfig = config[status] || config.new;
    return <Badge variant={statusConfig.color}>{statusConfig.label}</Badge>;
  };

  const renderStars = (rating) => {
    if (!rating) return <span className="text-gray-400 text-sm">No rating</span>;
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
          />
        ))}
      </div>
    );
  };

  const viewFeedbackDetails = (item) => {
    setSelectedFeedback(item);
    setAdminNotes(item.adminNotes || '');
    setShowDetailModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-utm-blue" />
            Feedback Management
          </h1>
          <p className="text-gray-600 mt-1">View and manage user feedback submissions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchFeedback}>
            <RefreshCw size={16} /> Refresh
          </Button>
          <Button onClick={handleExport}>
            <Download size={16} /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="text-center">
              <p className="text-blue-100 text-sm">Total Feedback</p>
              <p className="text-3xl font-bold">{stats.total}</p>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="text-center">
              <p className="text-green-100 text-sm">New</p>
              <p className="text-3xl font-bold">{stats.new}</p>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="text-center">
              <p className="text-purple-100 text-sm">Reviewed</p>
              <p className="text-3xl font-bold">{stats.reviewed}</p>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white">
            <div className="text-center">
              <p className="text-gray-100 text-sm">Archived</p>
              <p className="text-3xl font-bold">{stats.archived}</p>
            </div>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white">
            <div className="text-center">
              <p className="text-yellow-100 text-sm">Avg Rating</p>
              <p className="text-3xl font-bold flex items-center justify-center gap-1">
                {stats.averageRating || 'N/A'}
                {stats.averageRating && <Star size={20} className="fill-white" />}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search feedback..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue outline-none"
            >
              <option value="all">All Status</option>
              <option value="new">New</option>
              <option value="reviewed">Reviewed</option>
              <option value="archived">Archived</option>
            </select>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue outline-none"
            >
              <option value="all">All Types</option>
              <option value="bug">Bug Reports</option>
              <option value="feature">Feature Requests</option>
              <option value="improvement">Improvements</option>
              <option value="general">General</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Feedback List */}
      <Card>
        {loading ? (
          <LoadingSpinner />
        ) : feedback.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600">No feedback found</h3>
            <p className="text-gray-500">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Subject/Message</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Rating</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedback.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.userName}</p>
                        <p className="text-sm text-gray-500">{item.userEmail}</p>
                        <p className="text-xs text-gray-400 capitalize">{item.userRole}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        {getTypeBadge(item.type)}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {item.subject && (
                        <p className="font-medium text-gray-800 truncate">{item.subject}</p>
                      )}
                      <p className="text-sm text-gray-600 truncate">{item.message}</p>
                    </td>
                    <td className="py-3 px-4">
                      {renderStars(item.rating)}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => viewFeedbackDetails(item)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {item.status === 'new' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'reviewed')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Mark as Reviewed"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {item.status !== 'archived' && (
                          <button
                            onClick={() => handleUpdateStatus(item.id, 'archived')}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Archive"
                          >
                            <Archive size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Feedback Detail Modal */}
      {showDetailModal && selectedFeedback && (
        <Modal isOpen={true} title="Feedback Details" onClose={() => setShowDetailModal(false)}>
          <div className="space-y-4">
            {/* User Info */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{selectedFeedback.userName}</h3>
                <p className="text-sm text-gray-500">{selectedFeedback.userEmail}</p>
                <p className="text-xs text-gray-400 capitalize">{selectedFeedback.userRole}</p>
              </div>
              <div className="text-right">
                {getStatusBadge(selectedFeedback.status)}
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(selectedFeedback.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Type and Rating */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                {getTypeIcon(selectedFeedback.type)}
                {getTypeBadge(selectedFeedback.type)}
              </div>
              {renderStars(selectedFeedback.rating)}
            </div>

            {/* Subject */}
            {selectedFeedback.subject && (
              <div>
                <label className="text-sm font-medium text-gray-700">Subject</label>
                <p className="mt-1 text-gray-900">{selectedFeedback.subject}</p>
              </div>
            )}

            {/* Message */}
            <div>
              <label className="text-sm font-medium text-gray-700">Message</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-900 whitespace-pre-wrap">{selectedFeedback.message}</p>
              </div>
            </div>

            {/* Review Info */}
            {selectedFeedback.reviewedByName && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-sm text-green-800">
                  Reviewed by <strong>{selectedFeedback.reviewedByName}</strong> on{' '}
                  {new Date(selectedFeedback.reviewedAt).toLocaleString()}
                </p>
              </div>
            )}

            {/* Admin Notes */}
            <div>
              <label className="text-sm font-medium text-gray-700">Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this feedback..."
                rows={3}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              {selectedFeedback.status === 'new' && (
                <Button
                  variant="success"
                  onClick={() => handleUpdateStatus(selectedFeedback.id, 'reviewed')}
                  className="flex-1"
                >
                  <CheckCircle size={16} /> Mark as Reviewed
                </Button>
              )}
              {selectedFeedback.status !== 'archived' && (
                <Button
                  variant="outline"
                  onClick={() => handleUpdateStatus(selectedFeedback.id, 'archived')}
                  className="flex-1"
                >
                  <Archive size={16} /> Archive
                </Button>
              )}
              <Button
                variant="danger"
                onClick={() => handleDelete(selectedFeedback.id)}
              >
                <Trash2 size={16} /> Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FeedbackManagementView;
