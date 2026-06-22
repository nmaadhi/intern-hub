import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useFormPersist } from "../../hooks/useFormPersist";

function ManageMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createMessage, setCreateMessage] = useState(null);

  const { values, setValue, resetForm } = useFormPersist("mentor-create-meeting", {
    meetingType: "cohort",
    title: "",
    description: "",
    meetingLink: "",
    scheduledAt: "",
    duration: "",
    cohortId: "",
    selectedInternIds: [],
  });

  const activeCohorts = cohorts.filter((c) => c.status === "ACTIVE");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [mRes, cRes, iRes] = await Promise.all([
        api.get("/mentor/meetings"),
        api.get("/mentor/cohorts"),
        api.get("/mentor/interns"),
      ]);
      setMeetings(mRes.data.meetings || []);
      setCohorts(cRes.data.cohorts || []);
      setInterns(iRes.data.interns || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const toggleIntern = (id) => {
    const prev = values.selectedInternIds;
    setValue("selectedInternIds",
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setCreateMessage(null);
    if (values.meetingType === "cohort" && !values.cohortId) {
      setCreateMessage({ success: false, error: "Please select a cohort" });
      setSubmitting(false);
      return;
    }
    if (values.meetingType === "direct" && values.selectedInternIds.length === 0) {
      setCreateMessage({ success: false, error: "Select at least one intern" });
      setSubmitting(false);
      return;
    }
    try {
      const body = {
        title: values.title,
        meetingLink: values.meetingLink,
        scheduledAt: values.scheduledAt,
        description: values.description || undefined,
        duration: values.duration ? parseInt(values.duration) : undefined,
        ...(values.meetingType === "cohort"
          ? { cohortId: values.cohortId }
          : { internIds: values.selectedInternIds }),
      };
      await api.post("/mentor/meetings", body);
      setCreateMessage({ success: true });
      resetForm();
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setCreateMessage({ success: false, error: err.response?.data?.error || "Failed to create meeting" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (meetingId) => {
    if (!window.confirm("Cancel this meeting?")) return;
    try {
      await api.delete("/mentor/meetings/" + meetingId);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || "Failed to cancel meeting");
    }
  };

  const fmtDateTime = (s) => s ? new Date(s).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";
  const upcomingMeetings = meetings.filter((m) => !m.isPast);
  const pastMeetings = meetings.filter((m) => m.isPast);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Meetings</h2>
          <p className="text-gray-600 text-sm mt-1">Schedule meetings with your cohort or specific interns</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setCreateMessage(null); }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
        >
          {showForm ? "Cancel" : "+ New Meeting"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Schedule a meeting</h3>
          <div className="flex gap-2 mb-5">
            <button type="button" onClick={() => setValue("meetingType", "cohort")}
              className={"flex-1 py-2 rounded-lg text-sm font-medium transition " + (values.meetingType === "cohort" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              For Cohort
            </button>
            <button type="button" onClick={() => setValue("meetingType", "direct")}
              className={"flex-1 py-2 rounded-lg text-sm font-medium transition " + (values.meetingType === "direct" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}>
              For Specific Interns
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting title</label>
              <input type="text" value={values.title} onChange={(e) => setValue("title", e.target.value)} required minLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Weekly standup" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting link</label>
              <input type="url" value={values.meetingLink} onChange={(e) => setValue("meetingLink", e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="https://meet.google.com/xxx" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date and time</label>
                <input type="datetime-local" value={values.scheduledAt} onChange={(e) => setValue("scheduledAt", e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration in minutes (optional)</label>
                <input type="number" value={values.duration} onChange={(e) => setValue("duration", e.target.value)} min={5} max={480}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="60" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea value={values.description} onChange={(e) => setValue("description", e.target.value)} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Agenda or any notes..." />
            </div>
            {values.meetingType === "cohort" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cohort</label>
                {activeCohorts.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">No active cohorts assigned to you.</p>
                ) : (
                  <select value={values.cohortId} onChange={(e) => setValue("cohortId", e.target.value)} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">Select a cohort</option>
                    {activeCohorts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.internCount} interns)</option>
                    ))}
                  </select>
                )}
              </div>
            )}
            {values.meetingType === "direct" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select interns <span className="text-gray-400 font-normal">({values.selectedInternIds.length} selected)</span>
                </label>
                {interns.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">No directly assigned interns.</p>
                ) : (
                  <div className="border border-gray-300 rounded-lg divide-y max-h-48 overflow-y-auto">
                    {interns.map((i) => (
                      <label key={i.id} className={"flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-purple-50 transition " + (values.selectedInternIds.includes(i.id) ? "bg-purple-50" : "")}>
                        <input type="checkbox" checked={values.selectedInternIds.includes(i.id)} onChange={() => toggleIntern(i.id)} className="accent-purple-600" />
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
            <button type="submit" disabled={submitting}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium">
              {submitting ? "Scheduling..." : "Schedule Meeting"}
            </button>
          </form>
        </div>
      )}

      {createMessage?.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800">Meeting scheduled successfully.</div>
      )}
      {createMessage?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{createMessage.error}</div>
      )}

      {loading ? (
        <p className="text-gray-500 text-center py-4">Loading...</p>
      ) : error ? (
        <p className="text-red-600 text-center py-4">{error}</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">Upcoming ({upcomingMeetings.length})</h3>
            {upcomingMeetings.length === 0 ? (
              <p className="text-gray-500 text-sm bg-white rounded-2xl shadow-sm p-6 text-center">No upcoming meetings.</p>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((m) => (
                  <div key={m.id} className="bg-white rounded-2xl shadow-sm p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-800">{m.title}</h4>
                          <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + (m.type === "COHORT" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700")}>
                            {m.type === "COHORT" ? "Cohort" : "Direct"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{fmtDateTime(m.scheduledAt)}{m.duration ? " - " + m.duration + " min" : ""}</p>
                        {m.type === "COHORT" && m.cohort && <p className="text-xs text-gray-500 mt-0.5">{m.cohort.name}</p>}
                        {m.type === "DIRECT" && m.recipients.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{m.recipients.map((r) => r.name).join(", ")}</p>}
                        {m.description && <p className="text-sm text-gray-600 mt-1">{m.description}</p>}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <a href={m.meetingLink} target="_blank" rel="noreferrer"
                          className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition font-medium">Join</a>
                        <button onClick={() => handleDelete(m.id)} className="text-xs text-red-400 hover:text-red-600 transition">Cancel</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {pastMeetings.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-500 mb-3">Past ({pastMeetings.length})</h3>
              <div className="space-y-2">
                {pastMeetings.map((m) => (
                  <div key={m.id} className="bg-gray-50 rounded-2xl p-4 opacity-70">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-600">{m.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(m.scheduledAt)}{m.duration ? " - " + m.duration + " min" : ""}</p>
                      </div>
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Past</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ManageMeetings;
