import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';
import useAuthStore from '../store/authStore';

export default function NotificationBell() {
  const user = useAuthStore((s) => s.user);
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onNotification = ({ type, message, targetUserId }) => {
      if (targetUserId && targetUserId !== user?.id) return;
      const newNotif = {
        id: Date.now(),
        type,
        message,
        time: new Date(),
        read: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
    };

    socket.on('notification:new', onNotification);
    return () => socket.off('notification:new', onNotification);
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
    setOpen(false);
  };

  const fmtTime = (date) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const typeIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED': return '📋';
      case 'TASK_BLOCKED': return '🚫';
      case 'SPRINT_PHASE': return '🏃';
      case 'ANNOUNCEMENT': return '📢';
      default: return '🔔';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(!open); if (!open) markAllRead(); }}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-bold text-gray-800">Notifications</p>
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-red-500 transition"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">
                  No notifications yet.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition ${n.read ? 'opacity-70' : ''}`}
                  >
                    <div className="flex gap-3">
                      <span className="text-lg shrink-0">{typeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtTime(n.time)}</p>
                      </div>
                      {!n.read && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-1 shrink-0" />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}