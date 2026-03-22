import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCheck, X } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Calculate dropdown position relative to the bell button
  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - 360),
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getIconColor = (type) => {
    if (type?.includes('approved') || type === 'new_event') return 'text-green-500';
    if (type?.includes('rejected')) return 'text-red-500';
    if (type?.includes('post') || type?.includes('comment')) return 'text-blue-500';
    if (type === 'broadcast') return 'text-orange-500';
    if (type === 'meeting_scheduled') return 'text-purple-500';
    if (type?.includes('checkin')) return 'text-teal-500';
    if (type?.includes('registration')) return 'text-indigo-500';
    return 'text-gray-500';
  };

  const getEmoji = (type) => {
    if (type?.includes('approved')) return '\u2713';
    if (type?.includes('rejected')) return '\u2717';
    if (type?.includes('like')) return '\u2764';
    if (type?.includes('post') || type?.includes('comment')) return '\uD83D\uDCAC';
    if (type === 'broadcast') return '\uD83D\uDCE2';
    if (type?.includes('join')) return '\uD83D\uDC64';
    if (type === 'meeting_scheduled') return '\uD83D\uDCC5';
    if (type === 'new_event') return '\uD83C\uDF89';
    if (type?.includes('checkin')) return '\uD83D\uDCCD';
    if (type?.includes('registration')) return '\uD83C\uDFAB';
    return '\uD83D\uDD14';
  };

  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const dropdown = isOpen && createPortal(
    <div
      ref={dropdownRef}
      className="fixed w-[360px] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in"
      style={{
        top: position.top,
        left: position.left,
        zIndex: 9999,
        maxHeight: 'min(480px, calc(100vh - 80px))',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-gray-500" />
          <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-md hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="overflow-y-auto flex-1">
        {notifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Bell size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-400">No notifications yet</p>
            <p className="text-xs text-gray-300 mt-1">You're all caught up!</p>
          </div>
        ) : (
          notifications.slice(0, 50).map((n, index) => (
            <div
              key={n._id || index}
              onClick={() => !n.isRead && n._id && markAsRead(n._id)}
              className={`px-4 py-3 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0 ${
                !n.isRead
                  ? 'bg-blue-50/60 hover:bg-blue-50'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  !n.isRead ? 'bg-blue-100' : 'bg-gray-100'
                }`}>
                  <span className={`text-base ${getIconColor(n.type)}`}>
                    {getEmoji(n.type)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-tight ${!n.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0 ring-2 ring-blue-100"></span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>,
    document.body
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          isOpen ? 'bg-gray-200' : 'hover:bg-gray-100'
        }`}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell size={20} className={isOpen ? 'text-gray-800' : 'text-gray-600'} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {dropdown}
    </div>
  );
}
