import { useState, useEffect } from 'react';
import { broadcastAPI } from '../services/api';
import { Card, Button } from './UI.jsx';
import {
  Radio,
  AlertTriangle,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Bell,
  Clock
} from 'lucide-react';

const BroadcastNotifications = ({ onUnreadCountChange }) => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await broadcastAPI.getMy();
      const data = Array.isArray(response.data) ? response.data : [];
      setBroadcasts(data);

      const unreadCount = data.filter(b => !b.isRead).length;
      onUnreadCountChange?.(unreadCount);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load broadcasts');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (broadcastId) => {
    try {
      await broadcastAPI.markAsRead(broadcastId);
      setBroadcasts(prev => {
        const updated = prev.map(b => b.id === broadcastId ? { ...b, isRead: true } : b);
        const unreadCount = updated.filter(b => !b.isRead).length;
        onUnreadCountChange?.(unreadCount);
        return updated;
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark as read');
    }
  };

  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-red-50 border-red-200',
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          badge: 'bg-red-100 text-red-700'
        };
      case 'important':
        return {
          bg: 'bg-orange-50 border-orange-200',
          icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
          badge: 'bg-orange-100 text-orange-700'
        };
      default:
        return {
          bg: 'bg-blue-50 border-blue-200',
          icon: <Radio className="h-5 w-5 text-blue-500" />,
          badge: 'bg-blue-100 text-blue-700'
        };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const unreadBroadcasts = broadcasts.filter(b => !b.isRead);
  const readBroadcasts = broadcasts.filter(b => b.isRead);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <div className="mb-6">
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-center justify-between text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">{error}</p>
            </div>
            <Button variant="outline" onClick={fetchBroadcasts}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (broadcasts.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      {/* Header */}
      <div
        className="flex items-center justify-between mb-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#005eb8]" />
          <h2 className="text-lg font-semibold text-gray-900">Admin Broadcasts</h2>
          {unreadBroadcasts.length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
              {unreadBroadcasts.length} new
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {expanded && (
        <div className="space-y-3">
          {/* Unread Broadcasts */}
          {unreadBroadcasts.map((broadcast) => {
            const styles = getPriorityStyles(broadcast.priority);
            return (
              <Card
                key={broadcast.id}
                className={`${styles.bg} border-2 relative overflow-hidden`}
              >
                {/* Unread indicator */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#005eb8]"></div>

                <div className="pl-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {styles.icon}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{broadcast.title}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${styles.badge}`}>
                            {broadcast.priority}
                          </span>
                        </div>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">
                          {selectedBroadcast === broadcast.id
                            ? broadcast.message
                            : broadcast.message.length > 150
                              ? `${broadcast.message.substring(0, 150)}...`
                              : broadcast.message}
                        </p>
                        {broadcast.message.length > 150 && (
                          <button
                            onClick={() => setSelectedBroadcast(
                              selectedBroadcast === broadcast.id ? null : broadcast.id
                            )}
                            className="text-[#005eb8] text-sm hover:underline mt-1"
                          >
                            {selectedBroadcast === broadcast.id ? 'Show less' : 'Read more'}
                          </button>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(broadcast.createdAt)}
                          </span>
                          <span>From: {broadcast.senderName}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => handleMarkAsRead(broadcast.id)}
                      className="shrink-0"
                    >
                      <Check className="h-4 w-4" />
                      Mark read
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          {/* Read Broadcasts (collapsed by default if there are unread ones) */}
          {readBroadcasts.length > 0 && unreadBroadcasts.length > 0 && (
            <details className="mt-2">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                View {readBroadcasts.length} previous broadcast(s)
              </summary>
              <div className="space-y-2 mt-2">
                {readBroadcasts.slice(0, 5).map((broadcast) => {
                  const styles = getPriorityStyles(broadcast.priority);
                  return (
                    <Card key={broadcast.id} className="bg-gray-50 border border-gray-200 opacity-75">
                      <div className="flex items-start gap-3">
                        {styles.icon}
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-700 text-sm">{broadcast.title}</h3>
                          <p className="text-gray-500 text-xs mt-1 line-clamp-2">{broadcast.message}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span>{formatDate(broadcast.createdAt)}</span>
                            <span>From: {broadcast.senderName}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </details>
          )}

          {/* Show read broadcasts if no unread */}
          {readBroadcasts.length > 0 && unreadBroadcasts.length === 0 && (
            <div className="space-y-2">
              {readBroadcasts.slice(0, 3).map((broadcast) => {
                const styles = getPriorityStyles(broadcast.priority);
                return (
                  <Card key={broadcast.id} className="bg-gray-50 border border-gray-200">
                    <div className="flex items-start gap-3">
                      {styles.icon}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-700">{broadcast.title}</h3>
                        <p className="text-gray-600 text-sm mt-1">{broadcast.message}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                          <span>{formatDate(broadcast.createdAt)}</span>
                          <span>From: {broadcast.senderName}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BroadcastNotifications;
