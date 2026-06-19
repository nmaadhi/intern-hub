import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

function MyAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/intern/assignments');
        setAssignments(res.data.assignments || []);
        setNote(res.data._note || '');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load assignments');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : null;

  const statusInfo = (a) => {
    if (!a.mySubmission) return { label: 'NOT SUBMITTED', className: 'bg-gray-200 text-gray-600' };
    switch (a.mySubmission.status) {
      case 'APPROVED': return { label: 'APPROVED', className: 'bg-emerald-100 text-emerald-700' };
      case 'NEEDS_REVISION': return { label: 'NEEDS REVISION', className: 'bg-amber-100 text-amber-700' };
      default: return { label: 'SUBMITTED', className: 'bg-blue-100 text-blue-700' };
    }
  };

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Assignments</h2>
        <p className="text-gray-600 text-sm mt-1">Work assigned by your mentor</p>
      </div>

      {note && (<div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 text-sm">{note}</div>)}

      <div className="space-y-3">
        {assignments.length === 0 && !note ? (
          <p className="text-gray-500 text-center py-8 bg-white rounded-2xl shadow-sm">No assignments yet. Check back soon.</p>
        ) : (
          assignments.map((a) => {
            const info = statusInfo(a);
            return (
              <Link key={a.id} to={`/intern/assignments/${a.id}`} className="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{a.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{fmtDate(a.dueDate) ? `Due ${fmtDate(a.dueDate)}` : 'No due date'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${info.className}`}>{info.label}</span>
                </div>
                {a.mySubmission?.status === 'NEEDS_REVISION' && a.mySubmission.feedback && (
                  <p className="text-sm text-amber-700 bg-amber-50 rounded p-2 mt-3">Feedback: {a.mySubmission.feedback}</p>
                )}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export default MyAssignments;