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
    React.createElement("div", { className: "space-y-6" },
      React.createElement("div", { className: "flex items-center justify-between" },
        React.createElement("div", null,
          React.createElement("h2", { className: "text-2xl font-bold text-gray-800" }, "Meetings"),
          React.createElement("p", { className: "text-gray-600 text-sm mt-1" }, "Schedule meetings with your cohort or specific interns")
        ),
        React.createElement("button", {
          onClick: () => { setShowForm(!showForm); setCreateMessage(null); },
          className: "bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
        }, showForm ? "Cancel" : "+ New Meeting")
      )
    )
  );
}

export default ManageMeetings;
