import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import useAuthStore from "../../store/authStore";
import PinnedAnnouncements from "../../components/PinnedAnnouncements";

function InternDashboard() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, aRes, tRes, mRes] = await Promise.all([
          api.get("/intern/me"),
          api.get("/intern/assignments"),
          api.get("/intern/tasks"),
          api.get("/intern/meetings"),
        ]);
        setData({
          profile: pRes.data.profile,
          assignments: aRes.data.assignments || [],
          tasks: tRes.data.tasks || [],
          meetings: mRes.data.meetings || [],
        });
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;

  const { profile, assignments, tasks, meetings } = data;

  const notSubmitted = assignments.filter((a) => !a.mySubmission).length;
  const needsRevision = assignments.filter((a) => a.mySubmission?.status === "NEEDS_REVISION").length;
  const approved = assignments.filter((a) => a.mySubmission?.status === "APPROVED").length;
  const todoTasks = tasks.filter((t) => t.status === "TODO").length;
  const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const nextMeeting = meetings.find((m) => !m.isPast);

  const fmtDateTime = (s) => s ? new Date(s).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Welcome, {user?.name}!</h2>
        <p className="text-gray-600 text-sm mt-1">Your personal dashboard</p>
      </div>

      {profile?.cohort?.id && (
        <PinnedAnnouncements cohortId={profile.cohort.id} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-2">Your Mentor</p>
          {profile?.mentor ? (
            <div>
              <p className="font-bold text-gray-800">{profile.mentor.name}</p>
              <p className="text-sm text-gray-500">{profile.mentor.email}</p>
              {profile.mentor.phone && <p className="text-sm text-gray-500">{profile.mentor.phone}</p>}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No mentor assigned yet.</p>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-gray-500 uppercase font-medium tracking-wider mb-2">Your Cohort</p>
          {profile?.cohort ? (
            <div>
              <p className="font-bold text-gray-800">{profile.cohort.name}</p>
              {profile.cohort.description && <p className="text-sm text-gray-500">{profile.cohort.description}</p>}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${profile.cohort.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                {profile.cohort.status}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No cohort assigned yet.</p>
          )}
        </div>
      </div>

      {nextMeeting && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
          <p className="text-xs text-purple-600 font-medium uppercase tracking-wider mb-2">Next Meeting</p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-gray-800">{nextMeeting.title}</p>
              <p className="text-sm text-gray-600 mt-0.5">
                {fmtDateTime(nextMeeting.scheduledAt)}
                {nextMeeting.duration ? ` · ${nextMeeting.duration} min` : ""}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">by {nextMeeting.mentor?.name}</p>
            </div>
            <a href={nextMeeting.meetingLink} target="_blank" rel="noreferrer" className="shrink-0 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition">
              Join
            </a>
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Assignments</p>
        <div className="grid grid-cols-3 gap-3">
          <Link to="/intern/assignments" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-gray-400 hover:shadow-md transition">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{notSubmitted}</p>
          </Link>
          <Link to="/intern/assignments" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-amber-500 hover:shadow-md transition">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Revision</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{needsRevision}</p>
          </Link>
          <Link to="/intern/assignments" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-emerald-500 hover:shadow-md transition">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Approved</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{approved}</p>
          </Link>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-600 mb-2">Tasks</p>
        <div className="grid grid-cols-2 gap-3">
          <Link to="/intern/tasks" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-gray-400 hover:shadow-md transition">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">To Do</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{todoTasks}</p>
          </Link>
          <Link to="/intern/tasks" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-blue-500 hover:shadow-md transition">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">In Progress</p>
            <p className="text-3xl font-bold text-gray-800 mt-1">{inProgressTasks}</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default InternDashboard;
