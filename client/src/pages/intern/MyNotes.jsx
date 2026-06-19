import { useEffect, useState } from 'react';
import api from '../../lib/api';

function getPreviewUrl(fileUrl, fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const officeFormats = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
  if (officeFormats.includes(ext)) {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
  }
  return fileUrl;
}

function FileIcon({ fileName }) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const colors = {
    pdf: 'text-red-500', docx: 'text-blue-500', doc: 'text-blue-500',
    md: 'text-purple-500', ipynb: 'text-orange-500', txt: 'text-gray-500',
    ppt: 'text-orange-500', pptx: 'text-orange-500',
    xls: 'text-green-500', xlsx: 'text-green-500',
  };
  return (
    <span className={`font-mono text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 ${colors[ext] || 'text-gray-500'}`}>
      {ext || 'file'}
    </span>
  );
}

function MyNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/intern/notes');
        setNotes(res.data.notes || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString([], { dateStyle: 'medium' }) : '';

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Notes</h2>
        <p className="text-gray-600 text-sm mt-1">Notes and resources shared by your mentor</p>
      </div>

      {notes.length === 0 ? (
        <p className="text-gray-500 text-center py-8 bg-white rounded-2xl shadow-sm">
          No notes shared yet. Check back later.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => {
            const isExpanded = expandedId === n.id;
            const hasLongContent = n.content && n.content.length > 200;

            return (
              <div key={n.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800">{n.title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {n.mentor?.name} · {fmtDate(n.createdAt)}
                      {' · '}
                      <span className={`${n.type === 'COHORT' ? 'text-blue-500' : 'text-purple-500'}`}>
                        {n.type === 'COHORT' ? 'Cohort note' : 'Shared with you'}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Text content */}
                {n.content && (
                  <div className="mt-2">
                    <p className={`text-sm text-gray-700 whitespace-pre-wrap ${!isExpanded && hasLongContent ? 'line-clamp-3' : ''}`}>
                      {n.content}
                    </p>
                    {hasLongContent && (
                      <button onClick={() => setExpandedId(isExpanded ? null : n.id)} className="text-xs text-purple-600 hover:underline mt-1 font-medium">
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                )}

                {/* File attachment */}
                {n.fileUrl && (
                  <div className="mt-3 bg-gray-50 rounded-lg px-3 py-2.5">
                    <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Attachment</p>
                    <div className="flex items-center gap-3">
                      <FileIcon fileName={n.fileName} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{n.fileName}</span>
                      <div className="flex gap-2 shrink-0">
                        <a href={getPreviewUrl(n.fileUrl, n.fileName)} target="_blank" rel="noreferrer" className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition font-medium">
                          Preview
                        </a>
                        <a href={n.fileUrl} target="_blank" rel="noreferrer" className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition font-medium">
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyNotes;