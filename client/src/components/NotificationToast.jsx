import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useSocket } from '../contexts/SocketContext';

export default function NotificationToast() {
  const { notifications } = useSocket();
  const [toasts, setToasts] = useState([]);
  const seenIdsRef = useRef(null);
  const timeoutIdsRef = useRef([]);

  useEffect(() => {
    if (notifications.length === 0) return;

    // First load: seed the seen set with all current IDs without showing toasts
    if (seenIdsRef.current === null) {
      seenIdsRef.current = new Set(
        notifications.map((n) => n._id).filter(Boolean)
      );
      return;
    }

    const latest = notifications[0];
    if (latest && latest._id && !seenIdsRef.current.has(latest._id)) {
      seenIdsRef.current.add(latest._id);

      // Cap the seen set at 100 entries to avoid memory leaks
      if (seenIdsRef.current.size > 100) {
        const idsArray = Array.from(seenIdsRef.current);
        seenIdsRef.current = new Set(idsArray.slice(idsArray.length - 100));
      }

      const toastId = latest._id;
      setToasts((prev) => {
        if (prev.find((t) => t.id === toastId)) return prev;
        return [...prev, { id: toastId, ...latest }].slice(-3);
      });

      const timeoutId = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, 5000);
      timeoutIdsRef.current.push(timeoutId);
    }
  }, [notifications]);

  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach(clearTimeout);
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-white rounded-xl shadow-2xl border border-gray-200/80 p-4 w-[340px] animate-slide-up backdrop-blur-sm"
          style={{ animation: 'slideUp 0.3s ease-out' }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-base">{'\uD83D\uDD14'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0 -mt-0.5 -mr-1"
            >
              <X size={14} />
            </button>
          </div>
          {/* Progress bar for auto-dismiss */}
          <div className="mt-3 h-0.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-400 rounded-full"
              style={{ animation: 'shrink 5s linear forwards' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
