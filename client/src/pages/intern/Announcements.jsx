import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { socket } from '../../lib/socket';

export default function InternAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [cohortId, setCohortId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await api.get('/intern/me');
        const cId = meRes.data.profile?.cohort?.id;
        if (!cId) { setLoading(false); return; }
        setCohortId(cId);

        const res = await api.get(`/announcement?cohortId=${cId}`);
        setAnnouncements(res.data.announcements || []);
      } catch (err) {
        console.error('Failed to load announcements');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!cohortId) return;
    socket.emit('join:cohort', cohortId);

    const onNew = ({ announcement }) => {
      setAnnouncements((prev) => {
        const updated = [announcement, ...prev];
        return updated.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
      });
    };

    socket.on('announcement:new', onNew);
    return () => socket.off('announcement:new', onNew);
  }, [cohortId]);

  const fmtDate = (s) => new Date(s).toLocaleDateString([], { dateStyle: 'medium' });
  const fmtTime = (s) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Announcements</h2>
        <p className="text-sm text-gray-500 mt-1">Updates from your mentor</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Loading...</div>
      ) : !cohortId ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <p className="font-medium text-amber-800">No cohort assigned yet</p>
          <p className="text-sm text-amber-600 mt-1">Announcements will appear here once you're assigned to a cohort</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          <p className="text-4xl mb-3">📢</p>
          <p className="font-medium">No announcements yet</p>
          <p className="text-sm text-gray-400 mt-1">Your mentor will post updates here. You'll see them instantly.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className={`bg-white rounded-2xl shadow-sm p-5 border-l-4 ${a.pinned ? 'border-amber-400' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                {a.pinned && (<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">📌 Pinned</span>)}
                <h3 className="font-bold text-gray-800">{a.title}</h3>
              </div>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{a.content}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-400">{a.createdBy?.name}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">{fmtDate(a.createdAt)} at {fmtTime(a.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}