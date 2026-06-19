import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../lib/api';

function getPreviewUrl(fileUrl, fileName) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const officeFormats = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'];
  if (officeFormats.includes(ext)) {
    return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
  }
  // PDF, md, txt, ipynb — browser handles directly
  return fileUrl;
}

function FilePreview({ fileUrl, fileName }) {
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const colors = {
    pdf: 'text-red-500', docx: 'text-blue-500', doc: 'text-blue-500',
    md: 'text-purple-500', ipynb: 'text-orange-500', txt: 'text-gray-500',
    ppt: 'text-orange-500', pptx: 'text-orange-500',
    xls: 'text-green-500', xlsx: 'text-green-500',
  };

  const previewUrl = getPreviewUrl(fileUrl, fileName);

  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Submitted File</p>
      <div className="flex items-center gap-3">
        <span className={`font-mono text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-white border ${colors[ext] || 'text-gray-500'}`}>
          {ext || 'file'}
        </span>
        <span className="text-sm text-gray-700 flex-1 truncate">{fileName || 'Uploaded file'}</span>
        <div className="flex gap-2 shrink-0">
          <a href={previewUrl} target="_blank" rel="noreferrer" className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition font-medium">
            Preview
          </a>
          <a href={fileUrl} target="_blank" rel="noreferrer" className="text-xs bg-gray-600 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition font-medium">
            Download
          </a>
        </div>
      </div>
      {['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext) && (
        <p className="text-xs text-gray-400 mt-2">Opens in Microsoft Office Online Viewer.</p>
      )}
    </div>
  );
}

function AssignmentSubmissions() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [feedbackDrafts, setFeedbackDrafts] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/mentor/assignments/${id}/submissions`);
      setAssignment(res.data.assignment);
      setRows(res.data.submissions || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleReview = async (submissionId, status) => {
    setActionLoadingId(submissionId);
    try {
      const feedback = feedbackDrafts[submissionId] || '';
      await api.patch(`/mentor/submissions/${submissionId}`, { status, feedback });
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to review submission');
    } finally {
      setActionLoadingId(null);
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleString() : '';

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;

  const submittedCount = rows.filter((r) => r.submission).length;
  const approvedCount = rows.filter((r) => r.submission?.status === 'APPROVED').length;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/mentor/assignments" className="text-sm text-purple-600 hover:underline">← Back to Assignments</Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{assignment?.title}</h2>
            {assignment?.description && (<p className="text-gray-600 text-sm mt-1">{assignment.description}</p>)}
            {assignment?.dueDate && (<p className="text-xs text-gray-500 mt-1">Due {new Date(assignment.dueDate).toLocaleDateString()}</p>)}
          </div>
          <div className="flex gap-3 text-sm shrink-0 ml-4">
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{submittedCount} submitted</span>
            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full">{approvedCount} approved</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const sub = row.submission;
          const isPending = !sub;
          const needsAction = sub && sub.status !== 'APPROVED';

          return (
            <div key={row.intern.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-medium text-gray-800">{row.intern.name}</p>
                  <p className="text-xs text-gray-500">{row.intern.internId} · {row.intern.email}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  isPending ? 'bg-gray-200 text-gray-600' :
                  sub.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                  sub.status === 'NEEDS_REVISION' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {isPending ? 'NOT SUBMITTED' : sub.status.replace('_', ' ')}
                </span>
              </div>

              {isPending ? (
                <p className="text-sm text-gray-400 italic">Waiting for submission.</p>
              ) : (
                <div className="space-y-3">
                  {sub.content && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">Response</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.content}</p>
                    </div>
                  )}

                  {sub.linkUrl && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1 font-medium uppercase tracking-wider">Link</p>
                      <a href={sub.linkUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline break-all">{sub.linkUrl}</a>
                    </div>
                  )}

                  {sub.fileUrl && (
                    <FilePreview fileUrl={sub.fileUrl} fileName={sub.fileName} />
                  )}

                  <p className="text-xs text-gray-400">Submitted {fmtDate(sub.submittedAt)}</p>

                  {sub.feedback && (
                    <div className="bg-purple-50 rounded-lg p-3 text-sm text-purple-800">
                      <span className="font-medium">Your feedback: </span>{sub.feedback}
                    </div>
                  )}

                  {needsAction && (
                    <div className="pt-2 space-y-2 border-t border-gray-100">
                      <textarea
                        value={feedbackDrafts[sub.id] ?? sub.feedback ?? ''}
                        onChange={(e) => setFeedbackDrafts((prev) => ({ ...prev, [sub.id]: e.target.value }))}
                        rows={2}
                        placeholder="Add feedback (optional for approve, recommended for revision)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleReview(sub.id, 'APPROVED')} disabled={actionLoadingId === sub.id} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50 transition font-medium">
                          ✓ Approve
                        </button>
                        <button onClick={() => handleReview(sub.id, 'NEEDS_REVISION')} disabled={actionLoadingId === sub.id} className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-amber-600 disabled:opacity-50 transition font-medium">
                          ↩ Request Revision
                        </button>
                      </div>
                    </div>
                  )}

                  {sub.status === 'APPROVED' && (
                    <p className="text-xs text-emerald-600 font-medium">✓ Approved {sub.reviewedAt ? `on ${fmtDate(sub.reviewedAt)}` : ''}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AssignmentSubmissions;