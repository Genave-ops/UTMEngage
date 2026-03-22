import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { moderationAPI } from '../services/api';
import {
  Card,
  Button,
  Modal,
  LoadingSpinner,
  EmptyState
} from '../components/UI.jsx';
import {
  AlertTriangle,
  Flag,
  Trash2,
  CheckCircle,
  XCircle,
  User,
  AlertCircle,
  Search,
  Eye,
  Shield,
  Ban,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

const ModerationView = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [allReports, setAllReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [contentTypeFilter, setContentTypeFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [expandedReports, setExpandedReports] = useState({});
  const fetchIdRef = useRef(0);

  const fetchAllReports = useCallback(async () => {
    try {
      const response = await moderationAPI.getReports({});
      const data = Array.isArray(response.data) ? response.data : [];
      setAllReports(data);
      return data;
    } catch (err) {
      return [];
    }
  }, []);

  const fetchReports = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      if (contentTypeFilter !== 'all') params.contentType = contentTypeFilter;

      const hasFilters = statusFilter !== 'all' || priorityFilter !== 'all' || contentTypeFilter !== 'all';

      const response = await moderationAPI.getReports(params);
      if (fetchId !== fetchIdRef.current) return;
      const data = Array.isArray(response.data) ? response.data : [];
      const uniqueReports = data.filter((report, index, self) =>
        index === self.findIndex((r) => r.id === report.id)
      );
      setReports(uniqueReports);

      if (hasFilters) {
        fetchAllReports();
      } else {
        setAllReports(uniqueReports);
      }
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err.response?.data?.error || 'Failed to load reports');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [statusFilter, priorityFilter, contentTypeFilter, fetchAllReports]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleMarkReviewing = async (reportId) => {
    try {
      await moderationAPI.updateStatus(reportId, 'reviewing');
      fetchReports();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDismiss = async (reportId) => {
    const notes = prompt('Dismiss this report? Optionally add a reason:');
    if (notes === null) return; // user cancelled
    try {
      await moderationAPI.dismiss(reportId, notes || '');
      fetchReports();
      alert('Report dismissed successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to dismiss report');
    }
  };

  const handleResolve = async (reportId, resolution, notes) => {
    try {
      await moderationAPI.resolve(reportId, resolution, notes);
      setShowResolveModal(false);
      setSelectedReport(null);
      fetchReports();
      alert('Report resolved successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resolve report');
    }
  };

  const toggleExpand = (reportId) => {
    setExpandedReports(prev => ({
      ...prev,
      [reportId]: !prev[reportId]
    }));
  };

  const filteredReports = reports.filter((report) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      report.reason?.toLowerCase().includes(searchLower) ||
      report.reporterName?.toLowerCase().includes(searchLower) ||
      report.contentAuthorName?.toLowerCase().includes(searchLower) ||
      report.contentPreview?.toLowerCase().includes(searchLower) ||
      report.description?.toLowerCase().includes(searchLower)
    );
  });

  // Statistics (always computed from allReports for accurate totals)
  const statsSource = allReports.length > 0 ? allReports : reports;
  const stats = {
    total: statsSource.length,
    pending: statsSource.filter(r => r.status === 'pending').length,
    reviewing: statsSource.filter(r => r.status === 'reviewing').length,
    resolved: statsSource.filter(r => r.status === 'resolved').length,
    critical: statsSource.filter(r => r.priority === 'critical').length,
  };

  // Check if current user is admin (before loading to avoid unnecessary fetches)
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </Card>
      </div>
    );
  }

  if (loading && reports.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
          <p className="text-gray-600 mt-1">Review and manage reported content</p>
        </div>
        <Button onClick={fetchReports} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard title="Total Reports" value={stats.total} icon={Flag} color="blue" />
        <StatCard title="Pending" value={stats.pending} icon={Clock} color="yellow" />
        <StatCard title="Reviewing" value={stats.reviewing} icon={Eye} color="purple" />
        <StatCard title="Resolved" value={stats.resolved} icon={CheckCircle} color="green" />
        <StatCard title="Critical" value={stats.critical} icon={AlertTriangle} color="red" />
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by reason, reporter, author, or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none text-sm"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none text-sm"
            >
              <option value="all">All Types</option>
              <option value="post">Posts</option>
              <option value="comment">Comments</option>
              <option value="event">Events</option>
              <option value="user">Users</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
            <Button variant="outline" onClick={fetchReports} className="ml-auto">
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title="No reports found"
          description={searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || contentTypeFilter !== 'all' ? "Try adjusting your filters" : "No reports to review at this time"}
        />
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isExpanded={expandedReports[report.id]}
              onToggleExpand={() => toggleExpand(report.id)}
              onMarkReviewing={() => handleMarkReviewing(report.id)}
              onDismiss={() => handleDismiss(report.id)}
              onResolve={() => {
                setSelectedReport(report);
                setShowResolveModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Resolve Report Modal */}
      {selectedReport && (
        <ResolveReportModal
          isOpen={showResolveModal}
          report={selectedReport}
          onClose={() => {
            setShowResolveModal(false);
            setSelectedReport(null);
          }}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-[#005eb8]',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};

// Report Card Component
const ReportCard = ({ report, isExpanded, onToggleExpand, onMarkReviewing, onDismiss, onResolve }) => {
  const getPriorityBadge = (priority) => {
    const styles = {
      critical: 'bg-red-100 text-red-700 border-red-200',
      high: 'bg-orange-100 text-orange-700 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return styles[priority] || styles.medium;
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      reviewing: 'bg-purple-100 text-purple-700',
      resolved: 'bg-green-100 text-green-700',
      dismissed: 'bg-gray-100 text-gray-700',
    };
    return styles[status] || styles.pending;
  };

  const getReasonLabel = (reason) => {
    const labels = {
      spam: 'Spam',
      harassment: 'Harassment',
      hate_speech: 'Hate Speech',
      misinformation: 'Misinformation',
      inappropriate: 'Inappropriate Content',
      other: 'Other',
    };
    return labels[reason] || reason;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return 'N/A';
    return parsed.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isActionable = report.status === 'pending' || report.status === 'reviewing';

  return (
    <Card className={`transition-all ${report.priority === 'critical' ? 'border-l-4 border-l-red-500' : report.priority === 'high' ? 'border-l-4 border-l-orange-500' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg ${report.priority === 'critical' ? 'bg-red-100' : 'bg-orange-50'}`}>
            <Flag className={`h-5 w-5 ${report.priority === 'critical' ? 'text-red-600' : 'text-orange-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-semibold capitalize ${getStatusBadge(report.status)}`}>
                {report.status}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getPriorityBadge(report.priority)}`}>
                {report.priority}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                {report.contentType}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900 mt-2">
              {getReasonLabel(report.reason)}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Reported by <span className="font-medium">{report.reporterName || 'Unknown'}</span> on {formatDate(report.createdAt)}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleExpand}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Content Preview */}
      {report.contentPreview && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-700 line-clamp-2">{report.contentPreview}</p>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {/* Report Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Reporter</h4>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{report.reporterName || 'Anonymous'}</span>
                {report.reporterEmail && (
                  <span className="text-xs text-gray-500">({report.reporterEmail})</span>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Content Author</h4>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{report.contentAuthorName || 'Unknown'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {report.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Additional Details</h4>
              <p className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">{report.description}</p>
            </div>
          )}

          {/* Resolution Info (if resolved) */}
          {(report.status === 'resolved' || report.status === 'dismissed') && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Resolution</h4>
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">Action:</span> <span className="font-medium capitalize">{report.resolution?.replace(/_/g, ' ') || 'N/A'}</span></p>
                <p><span className="text-gray-500">Resolved by:</span> {report.resolvedByName || 'N/A'}</p>
                <p><span className="text-gray-500">Resolved on:</span> {formatDate(report.resolvedAt)}</p>
                {report.resolutionNotes && (
                  <p><span className="text-gray-500">Notes:</span> {report.resolutionNotes}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {isActionable && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
          {report.status === 'pending' && (
            <Button variant="outline" onClick={onMarkReviewing} className="text-sm">
              <Eye className="h-4 w-4 mr-1" />
              Mark as Reviewing
            </Button>
          )}
          <Button onClick={onResolve} className="text-sm">
            <Shield className="h-4 w-4 mr-1" />
            Take Action
          </Button>
          <Button variant="ghost" onClick={onDismiss} className="text-sm">
            <XCircle className="h-4 w-4 mr-1" />
            Dismiss
          </Button>
        </div>
      )}
    </Card>
  );
};

// Resolve Report Modal
const ResolveReportModal = ({ isOpen, report, onClose, onResolve }) => {
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setResolution('');
      setNotes('');
    }
  }, [isOpen, report?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!resolution) {
      alert('Please select an action');
      return;
    }
    setLoading(true);
    try {
      await onResolve(report.id, resolution, notes);
    } finally {
      setLoading(false);
    }
  };

  const resolutionOptions = [
    {
      value: 'content_removed',
      label: 'Remove Content',
      description: 'Delete the reported content from the platform',
      icon: Trash2,
      color: 'text-red-600 bg-red-50'
    },
    {
      value: 'user_warned',
      label: 'Warn User',
      description: 'Issue a warning to the content author',
      icon: AlertTriangle,
      color: 'text-yellow-600 bg-yellow-50'
    },
    {
      value: 'user_banned',
      label: 'Ban User',
      description: 'Ban the content author from the platform',
      icon: Ban,
      color: 'text-red-600 bg-red-50'
    },
    {
      value: 'no_action',
      label: 'No Action Needed',
      description: 'Mark as reviewed but no action required',
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50'
    }
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Resolve Report">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Report Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Report Summary</h4>
          <div className="space-y-2 text-sm">
            <p><span className="text-gray-500">Reason:</span> <span className="font-medium capitalize">{report.reason?.replace(/_/g, ' ')}</span></p>
            <p><span className="text-gray-500">Content Type:</span> <span className="font-medium capitalize">{report.contentType}</span></p>
            <p><span className="text-gray-500">Author:</span> {report.contentAuthorName || 'Unknown'}</p>
            {report.contentPreview && (
              <div className="mt-2 p-2 bg-white rounded border">
                <p className="text-gray-700 line-clamp-3">{report.contentPreview}</p>
              </div>
            )}
          </div>
        </div>

        {/* Resolution Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Action</label>
          <div className="space-y-2">
            {resolutionOptions.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  resolution === option.value
                    ? 'border-[#005eb8] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="resolution"
                  value={option.value}
                  checked={resolution === option.value}
                  onChange={(e) => setResolution(e.target.value)}
                  className="mt-1"
                />
                <div className={`p-2 rounded-lg ${option.color}`}>
                  <option.icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Resolution Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Resolution Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none resize-none"
            placeholder="Add any notes about this moderation action..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button type="submit" disabled={loading || !resolution} className="flex-1">
            {loading ? 'Processing...' : 'Confirm Action'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ModerationView;
