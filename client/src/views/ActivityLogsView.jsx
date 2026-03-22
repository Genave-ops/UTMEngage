import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI } from '../services/api';
import {
  Card,
  Button,
  LoadingSpinner,
  EmptyState
} from '../components/UI.jsx';
import {
  Activity,
  Search,
  AlertCircle,
  Download,
  Clock,
  LogIn,
  RefreshCw,
  Shield,
  Users,
  CalendarDays,
  Monitor,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

const ActivityLogsView = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [pagination, setPagination] = useState({ offset: 0, limit: 50, total: 0 });
  const fetchIdRef = useRef(0);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchLogs = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    try {
      setLoading(true);
      setError(null);

      const params = {
        limit: pagination.limit,
        offset: pagination.offset
      };

      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (appliedSearch) params.search = appliedSearch;

      // Date filter
      if (dateFilter !== 'all') {
        const now = new Date();
        if (dateFilter === 'today') {
          params.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        } else if (dateFilter === 'week') {
          params.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (dateFilter === 'month') {
          params.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      const response = await analyticsAPI.getLogs(params);
      if (fetchId !== fetchIdRef.current) return;
      const data = response.data || {};
      const logsData = Array.isArray(data.logs) ? data.logs : [];
      const uniqueLogs = logsData.filter((log, index, self) =>
        index === self.findIndex((l) => l.id === log.id)
      );
      setLogs(uniqueLogs);
      setPagination(prev => ({
        ...prev,
        total: data.total || 0
      }));
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err.response?.data?.error || 'Failed to load activity logs');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [categoryFilter, typeFilter, dateFilter, appliedSearch, pagination.offset, pagination.limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const fetchStats = async () => {
    try {
      const response = await analyticsAPI.getLogStats();
      setStats(response.data);
    } catch (err) {
      // Stats are non-critical, silently fail
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setAppliedSearch(searchQuery);
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleExportLogs = async () => {
    try {
      const params = { limit: 10000, offset: 0 };
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (appliedSearch) params.search = appliedSearch;
      if (dateFilter !== 'all') {
        const now = new Date();
        if (dateFilter === 'today') {
          params.startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        } else if (dateFilter === 'week') {
          params.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        } else if (dateFilter === 'month') {
          params.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      const response = await analyticsAPI.getLogs(params);
      const exportData = response.data || {};
      const allLogs = Array.isArray(exportData.logs) ? exportData.logs : [];

      if (allLogs.length === 0) {
        alert('No logs to export');
        return;
      }

      const csvContent = convertLogsToCSV(allLogs);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to export logs');
    }
  };

  const convertLogsToCSV = (logs) => {
    const headers = ['Timestamp', 'Category', 'Type', 'Action', 'User', 'Details', 'IP Address', 'Target'];
    const rows = logs.map(log => [
      new Date(log.createdAt).toLocaleString(),
      log.category || 'system',
      log.type || 'info',
      log.action,
      log.userName || 'System',
      log.details || '',
      log.ipAddress || 'N/A',
      log.targetType ? `${log.targetType}:${log.targetId}` : 'N/A'
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
  };

  const handleNextPage = () => {
    if (pagination.offset + pagination.limit < pagination.total) {
      setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      setPagination(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
    }
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

  if (loading && logs.length === 0) {
    return <LoadingSpinner />;
  }

  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600 mt-1">Monitor system activity and user actions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { fetchLogs(); fetchStats(); }}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={handleExportLogs}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Logs"
          value={stats?.total || 0}
          icon={Activity}
          color="blue"
        />
        <StatCard
          title="Today"
          value={stats?.today || 0}
          icon={Clock}
          color="green"
        />
        <StatCard
          title="This Week"
          value={stats?.thisWeek || 0}
          icon={CalendarDays}
          color="purple"
        />
        <StatCard
          title="Auth Events"
          value={stats?.byCategory?.auth || 0}
          icon={LogIn}
          color="orange"
        />
        <StatCard
          title="Errors"
          value={stats?.byType?.error || 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Filters */}
      <Card>
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by action, user, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPagination(p => ({...p, offset: 0})); }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none text-sm"
            >
              <option value="all">All Categories</option>
              <option value="auth">Authentication</option>
              <option value="user">User Management</option>
              <option value="event">Events</option>
              <option value="committee">Committees</option>
              <option value="moderation">Moderation</option>
              <option value="system">System</option>
              <option value="security">Security</option>
              <option value="feedback">Feedback</option>
              <option value="broadcast">Broadcast</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPagination(p => ({...p, offset: 0})); }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none text-sm"
            >
              <option value="all">All Types</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => { setDateFilter(e.target.value); setPagination(p => ({...p, offset: 0})); }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none text-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </div>
        </form>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
            <Button variant="outline" onClick={fetchLogs} className="ml-auto">
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Activity Logs */}
      {logs.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity logs found"
          description={appliedSearch || categoryFilter !== 'all' || typeFilter !== 'all' || dateFilter !== 'all' ? "Try adjusting your filters" : "No activity logs recorded yet"}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log, index) => (
                  <LogRow key={log.id || index} log={log} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {pagination.offset + 1} to {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} logs
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevPage}
                  disabled={pagination.offset === 0}
                  className="px-3 py-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={handleNextPage}
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                  className="px-3 py-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-[#005eb8]',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
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

// Log Row Component
const LogRow = ({ log }) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getTypeBadge = (type) => {
    const styles = {
      success: 'bg-green-100 text-green-700',
      warning: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
      info: 'bg-blue-100 text-blue-700'
    };
    return styles[type] || styles.info;
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'auth': return <LogIn className="h-4 w-4" />;
      case 'user': return <Users className="h-4 w-4" />;
      case 'event': return <CalendarDays className="h-4 w-4" />;
      case 'committee': return <Users className="h-4 w-4" />;
      case 'moderation': return <Shield className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'N/A';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <div>
            <p className="text-sm text-gray-900">{formatTimestamp(log.createdAt)}</p>
            <p className="text-xs text-gray-500">
              {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(log.type)}`}>
            {getTypeIcon(log.type)}
            {log.type || 'info'}
          </span>
          <span className="text-xs text-gray-500 capitalize flex items-center gap-1">
            {getCategoryIcon(log.category)}
            {log.category || 'system'}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#005eb8] to-[#00b5e2] rounded-full flex items-center justify-center text-white text-xs font-semibold">
            {log.userName?.charAt(0).toUpperCase() || 'S'}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{log.userName || 'System'}</p>
            <p className="text-xs text-gray-500">{log.userRole || ''}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <p className="text-sm font-medium text-gray-900">{log.action || 'Unknown'}</p>
        {log.targetType && (
          <p className="text-xs text-gray-500">
            Target: {log.targetType} {log.targetName && `(${log.targetName})`}
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-gray-600 max-w-xs truncate" title={log.details}>
          {log.details || 'No details'}
        </p>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="text-sm font-mono text-gray-600">
          {log.ipAddress || 'N/A'}
        </span>
      </td>
    </tr>
  );
};

export default ActivityLogsView;
