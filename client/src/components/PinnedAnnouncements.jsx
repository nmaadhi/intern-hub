import { useEffect, useState } from 'react';
import api from '../lib/api';
import { socket } from '../lib/socket';

export default function PinnedAnnouncements({ cohortId }) {
  const [pinned, setPinned] = useState([]);

  useEffect(() => {
    if (!cohortId) return;

    // Load pinned announcements on mount
    api.get(`/announcement?cohortId=${cohortId}`).then((res) => {
      const list = res.data.announcements || [];
      setPinned(list.filter((a) => a.pinned));
    });

    socket.emit('join:cohort', cohortId);

    // New announcement posted
    const onNew = ({ announcement }) => {
      if (announcement.pinned) {
        setPinned((prev) => [announcement, ...prev]);
      }
    };

    // Pin status changed
    const onPinned = ({ announcement }) => {
      if (announcement.pinned) {
        // Add to pinned list if not already there
        setPinned((prev) => {
          const exists = prev.find((a) => a.id === announcement.id);
          if (exists) return prev.map((a) => a.id === announcement.id ? announcement : a);
          return [announcement, ...prev];
        });
      } else {
        // Remove from pinned list
        setPinned((prev) => prev.filter((a) => a.id !== announcement.id));
      }
    };

    // Announcement deleted
    const onDeleted = ({ announcementId }) => {
      setPinned((prev) => prev.filter((a) => a.id !== announcementId));
    };

    socket.on('announcement:new', onNew);
    socket.on('announcement:pinned', onPinned);
    socket.on('announcement:deleted', onDeleted);

    return () => {
      socket.off('announcement:new', onNew);
      socket.off('announcement:pinned', onPinned);
      socket.off('announcement:deleted', onDeleted);
    };
  }, [cohortId]);

  if (pinned.length === 0) return null;

  const fmtDate = (s) => new Date(s).toLocaleDateString([], { dateStyle: 'medium' });

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
        📌 Pinned Announcements
      </h3>
      {pinned.map((a) => (
        <div key={a.id} className="bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-amber-900">{a.title}</p>
              <p className="text-sm text-amber-800 mt-1 whitespace-pre-wrap">{a.content}</p>
              <p className="text-xs text-amber-600 mt-2">
                {a.createdBy?.name} · {fmtDate(a.createdAt)}
              </p>
            </div>
            <span className="text-lg shrink-0">📌</span>
          </div>
        </div>
      ))}
    </div>
  );
}