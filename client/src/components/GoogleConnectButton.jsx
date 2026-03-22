import { useState, useEffect } from 'react';
import { CheckCircle, Link2, Unlink } from 'lucide-react';
import { Button } from './UI';
import { googleAPI } from '../services/api';

const GoogleConnectButton = ({ onStatusChange, compact = false }) => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await googleAPI.getStatus();
      setConnected(response.data.connected);
      if (onStatusChange) {
        onStatusChange(response.data.connected);
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      const response = await googleAPI.getAuthUrl();
      // Redirect to Google OAuth
      window.location.href = response.data.authUrl;
    } catch (error) {
      console.error('Error getting auth URL:', error);
      alert('Failed to initiate Google connection. Please try again.');
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect your Google account? You will not be able to create online meetings until you reconnect.')) {
      return;
    }

    setActionLoading(true);
    try {
      await googleAPI.disconnect();
      setConnected(false);
      if (onStatusChange) {
        onStatusChange(false);
      }
      alert('Google account disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      alert('Failed to disconnect Google account. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
        {!compact && <span>Checking Google connection...</span>}
      </div>
    );
  }

  if (connected) {
    return (
      <div className={`flex items-center gap-2 ${compact ? '' : 'p-3 bg-green-50 border border-green-200 rounded-lg'}`}>
        <CheckCircle size={16} className="text-green-600" />
        <span className={`text-green-700 ${compact ? 'text-sm' : ''}`}>
          Google Connected
        </span>
        <button
          onClick={handleDisconnect}
          disabled={actionLoading}
          className="ml-auto text-sm text-gray-500 hover:text-red-600 flex items-center gap-1 transition-colors"
        >
          {actionLoading ? (
            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400" />
          ) : (
            <>
              <Unlink size={14} />
              {!compact && 'Disconnect'}
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={compact ? '' : 'p-3 bg-amber-50 border border-amber-200 rounded-lg'}>
      {!compact && (
        <p className="text-sm text-amber-800 mb-2">
          Connect your Google account to create online meetings with Google Meet
        </p>
      )}
      <Button
        onClick={handleConnect}
        disabled={actionLoading}
        variant={compact ? 'outline' : 'primary'}
        className={`${compact ? 'text-sm py-1.5' : ''} flex items-center gap-2`}
      >
        {actionLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {compact ? 'Connect Google' : 'Connect Google Account'}
          </>
        )}
      </Button>
    </div>
  );
};

export default GoogleConnectButton;
