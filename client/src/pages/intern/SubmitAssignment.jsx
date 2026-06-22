import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";
import { useFormPersist } from "../../hooks/useFormPersist";

const CLOUDINARY_CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const ACCEPTED_EXTENSIONS = ".pdf,.doc,.docx,.md,.txt,.ipynb,.ppt,.pptx,.xls,.xlsx";

function getPreviewUrl(fileUrl, fileName) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  const officeFormats = ["doc", "docx", "ppt", "pptx", "xls", "xlsx"];
  if (officeFormats.includes(ext)) {
    return "https://view.officeapps.live.com/op/view.aspx?src=" + encodeURIComponent(fileUrl);
  }
  return fileUrl;
}

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  formData.append("resource_type", "raw");
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD + "/raw/upload",
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Upload failed");
  }
  const data = await res.json();
  return { fileUrl: data.secure_url, fileName: file.name };
}

function FileIcon({ fileName }) {
  const ext = fileName?.split(".").pop()?.toLowerCase();
  const colors = {
    pdf: "text-red-500", docx: "text-blue-500", doc: "text-blue-500",
    md: "text-purple-500", ipynb: "text-orange-500", txt: "text-gray-500",
    ppt: "text-orange-500", pptx: "text-orange-500",
    xls: "text-green-500", xlsx: "text-green-500",
  };
  return (
    <span className={"font-mono text-xs font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 " + (colors[ext] || "text-gray-500")}>
      {ext || "file"}
    </span>
  );
}

function SubmitAssignment() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadError, setUploadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState(null);

  const { values, setValue, setValues, resetForm } = useFormPersist("intern-submit-" + id, {
    content: "",
    linkUrl: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/intern/assignments");
      const found = (res.data.assignments || []).find((a) => a.id === id);
      if (!found) {
        setError("Assignment not found");
      } else {
        setAssignment(found);
        if (found.mySubmission) {
          setValues({
            content: found.mySubmission.content || "",
            linkUrl: found.mySubmission.linkUrl || "",
          });
          if (found.mySubmission.fileUrl) {
            setUploadedFile({
              fileUrl: found.mySubmission.fileUrl,
              fileName: found.mySubmission.fileName || "Uploaded file",
            });
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load assignment");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File must be under 10MB");
      return;
    }
    setSelectedFile(file);
    setUploadError("");
    setUploading(true);
    setUploadedFile(null);
    try {
      const result = await uploadToCloudinary(file);
      setUploadedFile(result);
    } catch (err) {
      setUploadError(err.message || "Upload failed. Try again.");
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadedFile(null);
    setUploadError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMessage(null);
    if (!values.content.trim() && !values.linkUrl.trim() && !uploadedFile) {
      setSubmitMessage({ success: false, error: "Add a text response, link, or upload a file - at least one is required" });
      return;
    }
    if (uploading) {
      setSubmitMessage({ success: false, error: "Please wait for the file to finish uploading" });
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/intern/assignments/" + id + "/submit", {
        content: values.content || undefined,
        linkUrl: values.linkUrl || undefined,
        fileUrl: uploadedFile?.fileUrl || undefined,
        fileName: uploadedFile?.fileName || undefined,
      });
      setSubmitMessage({ success: true });
      resetForm();
      await load();
    } catch (err) {
      setSubmitMessage({ success: false, error: err.response?.data?.error || "Failed to submit" });
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : null;

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;

  const isClosed = assignment.status !== "ACTIVE";
  const sub = assignment.mySubmission;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/intern/assignments" className="text-sm text-emerald-600 hover:underline">Back to Assignments</Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">{assignment.title}</h2>
        {assignment.description && (
          <p className="text-gray-600 text-sm mt-1 whitespace-pre-wrap">{assignment.description}</p>
        )}
        {fmtDate(assignment.dueDate) && (
          <p className="text-xs text-gray-500 mt-1">Due {fmtDate(assignment.dueDate)}</p>
        )}
      </div>

      {sub?.feedback && (
        <div className={"rounded-2xl p-4 text-sm " + (sub.status === "NEEDS_REVISION" ? "bg-amber-50 border border-amber-200 text-amber-800" : "bg-purple-50 border border-purple-100 text-purple-800")}>
          <span className="font-medium">Mentor feedback: </span>{sub.feedback}
        </div>
      )}

      {sub?.status === "APPROVED" && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-800 text-sm font-medium">
          ✅ This submission has been approved.
        </div>
      )}

      {isClosed ? (
        <div className="bg-gray-100 border border-gray-200 rounded-2xl p-4 text-gray-600 text-sm">
          This assignment is closed and no longer accepting submissions.
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {sub ? "Update your submission" : "Submit your work"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Text response</label>
              <textarea
                value={values.content}
                onChange={(e) => setValue("content", e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Describe what you did, any notes for your mentor..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link (GitHub, Google Doc, etc.)</label>
              <input
                type="url"
                value={values.linkUrl}
                onChange={(e) => setValue("linkUrl", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="https://github.com/you/project"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload a file
                <span className="text-xs text-gray-400 font-normal ml-2">PDF, Word, .md, .ipynb, .txt - max 10MB</span>
              </label>
              {!uploadedFile ? (
                <label className={"flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer transition " + (uploading ? "border-emerald-300 bg-emerald-50" : "border-gray-300 hover:border-emerald-400 hover:bg-gray-50")}>
                  <input type="file" accept={ACCEPTED_EXTENSIONS} onChange={handleFileSelect} className="hidden" disabled={uploading} />
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2 text-emerald-600">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">Uploading {selectedFile?.name}...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-500">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <span className="text-sm">Click to upload</span>
                    </div>
                  )}
                </label>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileIcon fileName={uploadedFile.fileName} />
                      <span className="text-sm text-emerald-700 font-medium truncate max-w-xs">{uploadedFile.fileName}</span>
                    </div>
                    <div className="flex items-center gap-3 ml-4 shrink-0">
                      <a href={getPreviewUrl(uploadedFile.fileUrl, uploadedFile.fileName)} target="_blank" rel="noreferrer" className="text-xs text-purple-600 underline hover:text-purple-800 font-medium">Preview</a>
                      <a href={uploadedFile.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline hover:text-blue-800 font-medium">Download</a>
                      <button type="button" onClick={handleRemoveFile} className="text-xs text-red-500 hover:text-red-700 underline">Remove</button>
                    </div>
                  </div>
                </div>
              )}
              {uploadError && <p className="text-sm text-red-600 mt-2">{uploadError}</p>}
            </div>

            <p className="text-xs text-gray-400">At least one of text, link, or file is required.</p>

            {submitMessage?.error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{submitMessage.error}</div>
            )}
            {submitMessage?.success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">Submitted successfully.</div>
            )}

            <button
              type="submit"
              disabled={submitting || uploading}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition font-medium"
            >
              {submitting ? "Submitting..." : sub ? "Resubmit" : "Submit"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default SubmitAssignment;
