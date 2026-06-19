import { useEffect, useState } from 'react';
import api from '../../lib/api';

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.md,.txt,.ipynb,.ppt,.pptx,.xls,.xlsx';

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('resource_type', 'raw');
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/raw/upload`,
    { method: 'POST', body: formData }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Upload failed');
  }
  const data = await res.json();
  return { fileUrl: data.secure_url, fileName: file.name };
}

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

function ManageNotes() {
  const [notes, setNotes] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [noteType, setNoteType] = useState('cohort');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [selectedInternIds, setSelectedInternIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [createMessage, setCreateMessage] = useState(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const activeCohorts = cohorts.filter((c) => c.status === 'ACTIVE');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [nRes, cRes, iRes] = await Promise.all([
        api.get('/mentor/notes'),
        api.get('/mentor/cohorts'),
        api.get('/mentor/interns'),
      ]);
      setNotes(nRes.data.notes || []);
      setCohorts(cRes.data.cohorts || []);
      setInterns(iRes.data.interns || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const resetForm = () => {
    setTitle(''); setContent(''); setCohortId('');
    setSelectedInternIds([]); setNoteType('cohort');
    setSelectedFile(null); setUploadedFile(null);
    setUploadError(''); setCreateMessage(null);
  };

  const toggleIntern = (id) => {
    setSelectedInternIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File must be under 10MB');
      return;
    }
    setSelectedFile(file);
    setUploadError('');
    setUploading(true);
    setUploadedFile(null);
    try {
      const result = await uploadToCloudinary(file);
      setUploadedFile(result);
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Try again.');
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateMessage(null);

    if (!content.trim() && !uploadedFile) {
      setCreateMessage({ success: false, error: 'Add text content, a file, or both' });
      return;
    }
    if (noteType === 'cohort' && !cohortId) {
      setCreateMessage({ success: false, error: 'Please select a cohort' });
      return;
    }
    if (noteType === 'direct' && selectedInternIds.length === 0) {
      setCreateMessage({ success: false, error: 'Select at least one intern' });
      return;
    }
    if (uploading) {
      setCreateMessage({ success: false, error: 'Wait for file to finish uploading' });
      return;
    }

    setSubmitting(true);
    try {
      const body = {
        title,
        content: content || undefined,
        fileUrl: uploadedFile?.fileUrl || undefined,
        fileName: uploadedFile?.fileName || undefined,
        ...(noteType === 'cohort' ? { cohortId } : { internIds: selectedInternIds }),
      };
      await api.post('/mentor/notes', body);
      setCreateMessage({ success: true });
      resetForm();
      await loadAll();
    } catch (err) {
      setCreateMessage({ success: false, error: err.response?.data?.error || 'Failed to create note' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId) => {
    if (!window.confirm('Delete this note? Interns will no longer see it.')) return;
    try {
      await api.delete(`/mentor/notes/${noteId}`);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete note');
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString([], { dateStyle: 'medium' }) : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Notes</h2>
          <p className="text-gray-600 text-sm mt-1">Share text and files with your cohort or specific interns</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); resetForm(); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium">
          {showForm ? 'Cancel' : '+ New Note'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Share a note</h3>

          {/* Type toggle */}
          <div className="flex gap-2 mb-5">
            <button type="button" onClick={() => setNoteType('cohort')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${noteType === 'cohort' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              For Cohort
            </button>
            <button type="button" onClick={() => setNoteType('direct')} className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${noteType === 'direct' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              For Specific Interns
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Week 1 React Notes" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content (optional if uploading a file)</label>
              <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Write your notes here..." />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attach a file (optional)
                <span className="text-xs text-gray-400 font-normal ml-2">PDF, Word, .md, .ipynb — max 10MB</span>
              </label>
              {!uploadedFile ? (
                <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-5 cursor-pointer transition ${uploading ? 'border-purple-300 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'}`}>
                  <input type="file" accept={ACCEPTED_EXTENSIONS} onChange={handleFileSelect} className="hidden" disabled={uploading} />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2 text-purple-600">
                      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Uploading {selectedFile?.name}...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="text-sm">Click to upload</span>
                    </div>
                  )}
                </label>
              ) : (
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <FileIcon fileName={uploadedFile.fileName} />
                    <span className="text-sm text-purple-700 font-medium truncate max-w-xs">{uploadedFile.fileName}</span>
                  </div>
                  <button type="button" onClick={() => { setUploadedFile(null); setSelectedFile(null); }} className="text-xs text-red-500 hover:text-red-700 underline ml-4">Remove</button>
                </div>
              )}
              {uploadError && (<p className="text-sm text-red-600 mt-1">{uploadError}</p>)}
            </div>

            {/* Cohort selector */}
            {noteType === 'cohort' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cohort</label>
                {activeCohorts.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">No active cohorts assigned to you.</p>
                ) : (
                  <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">Select a cohort</option>
                    {activeCohorts.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.internCount} interns)</option>))}
                  </select>
                )}
              </div>
            )}

            {/* Intern selector */}
            {noteType === 'direct' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select interns <span className="text-gray-400 font-normal">({selectedInternIds.length} selected)</span>
                </label>
                {interns.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">No directly assigned interns.</p>
                ) : (
                  <div className="border border-gray-300 rounded-lg divide-y max-h-48 overflow-y-auto">
                    {interns.map((i) => (
                      <label key={i.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-purple-50 transition ${selectedInternIds.includes(i.id) ? 'bg-purple-50' : ''}`}>
                        <input type="checkbox" checked={selectedInternIds.includes(i.id)} onChange={() => toggleIntern(i.id)} className="accent-purple-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{i.name}</p>
                          <p className="text-xs text-gray-500">{i.internId}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button type="submit" disabled={submitting || uploading} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium">
              {submitting ? 'Sharing...' : 'Share Note'}
            </button>
          </form>
        </div>
      )}

      {createMessage?.success && (<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800">Note shared successfully.</div>)}
      {createMessage?.error && (<div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{createMessage.error}</div>)}

      {/* Notes list */}
      <div className="space-y-3">
        {loading ? (<p className="text-gray-500 text-center py-4">Loading...</p>) : error ? (<p className="text-red-600 text-center py-4">{error}</p>) : notes.length === 0 ? (
          <p className="text-gray-500 text-center py-8 bg-white rounded-2xl shadow-sm">No notes yet. Create one above.</p>
        ) : (
          notes.map((n) => (
            <div key={n.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-800">{n.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${n.type === 'COHORT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                      {n.type === 'COHORT' ? `Cohort: ${n.cohort?.name}` : `${n.recipients.map((r) => r.name).join(', ')}`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{fmtDate(n.createdAt)}</p>
                  {n.content && (<p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap line-clamp-3">{n.content}</p>)}
                  {n.fileUrl && (
                    <div className="flex items-center gap-3 mt-3 bg-gray-50 rounded-lg px-3 py-2">
                      <FileIcon fileName={n.fileName} />
                      <span className="text-sm text-gray-700 flex-1 truncate">{n.fileName}</span>
                      <div className="flex gap-2 shrink-0">
                        <a href={getPreviewUrl(n.fileUrl, n.fileName)} target="_blank" rel="noreferrer" className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition">Preview</a>
                        <a href={n.fileUrl} target="_blank" rel="noreferrer" className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700 transition">Download</a>
                      </div>
                    </div>
                  )}
                </div>
                <button onClick={() => handleDelete(n.id)} className="shrink-0 text-xs text-red-400 hover:text-red-600 transition">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ManageNotes;