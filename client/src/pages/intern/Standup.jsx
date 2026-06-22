import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useFormPersist } from "../../hooks/useFormPersist";

const TIPS = [
  "Be specific - finished the login bug is better than worked on code",
  "Mention if you need help - that is what standups are for",
  "Keep it short - 2-3 sentences per field is enough",
];

export default function Standup() {
  const [sprints, setSprints] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [postedToday, setPostedToday] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const { values, setValue, setValues, resetForm } = useFormPersist("intern-standup", {
    yesterday: "",
    today: "",
    blockers: "",
    sprintId: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/standup/mine");
        setHistory(res.data.standups || []);
        setPostedToday(res.data.postedToday);

        if (res.data.postedToday && res.data.standups.length > 0) {
          const todayStandup = res.data.standups[0];
          setValues({
            yesterday: todayStandup.yesterday,
            today: todayStandup.today,
            blockers: todayStandup.blockers || "",
            sprintId: todayStandup.sprintId || "",
          });
        }

        const meRes = await api.get("/intern/me");
        const cohortId = meRes.data.profile?.cohort?.id;
        if (cohortId) {
          const sprintRes = await api.get("/sprint/sprints?cohortId=" + cohortId);
          const active = (sprintRes.data.sprints || []).filter((s) => s.phase === "ACTIVE");
          setSprints(active);
          if (active.length > 0 && !values.sprintId) {
            setValue("sprintId", active[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load standup data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await api.post("/standup", {
        yesterday: values.yesterday,
        today: values.today,
        blockers: values.blockers || undefined,
        sprintId: values.sprintId || undefined,
      });
      setMessage({ success: true, text: postedToday ? "Standup updated!" : "Standup posted! Your mentor can see it now." });
      setPostedToday(true);
      resetForm();
      const res = await api.get("/standup/mine");
      setHistory(res.data.standups || []);
      if (res.data.standups.length > 0) {
        const s = res.data.standups[0];
        setValues({ yesterday: s.yesterday, today: s.today, blockers: s.blockers || "", sprintId: s.sprintId || "" });
      }
    } catch (err) {
      setMessage({ success: false, text: err.response?.data?.error || "Failed to post standup" });
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (s) => new Date(s).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  const fmtTime = (s) => new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (loading) return <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Daily Standup</h2>
        <p className="text-sm text-gray-500 mt-1">Post your daily update - your mentor sees it instantly</p>
      </div>

      {postedToday ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-medium text-emerald-800">Standup posted for today!</p>
            <p className="text-sm text-emerald-600">You can update it anytime before end of day.</p>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">⏰</span>
          <div>
            <p className="font-medium text-amber-800">No standup yet today</p>
            <p className="text-sm text-amber-600">Post your update below so your mentor knows what you are working on.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-bold text-gray-800 mb-4">
          {postedToday ? "Update today's standup" : "Post today's standup"}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {sprints.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Linked Sprint (optional)</label>
              <select
                value={values.sprintId}
                onChange={(e) => setValue("sprintId", e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Not linked to a sprint</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>🏃 {s.name} (Active)</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🕐 What did you do yesterday?
            </label>
            <textarea
              value={values.yesterday}
              onChange={(e) => setValue("yesterday", e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="E.g. Completed the login API endpoint and wrote unit tests for it"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🎯 What are you doing today?
            </label>
            <textarea
              value={values.today}
              onChange={(e) => setValue("today", e.target.value)}
              required
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="E.g. Working on the dashboard UI and integrating the API with the frontend"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🚫 Any blockers? (optional)
            </label>
            <textarea
              value={values.blockers}
              onChange={(e) => setValue("blockers", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              placeholder="E.g. Waiting for API credentials from mentor, or stuck on CORS issue"
            />
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-500 mb-1">💡 Tips for a good standup:</p>
            <ul className="space-y-0.5">
              {TIPS.map((tip, i) => (
                <li key={i} className="text-xs text-gray-500">• {tip}</li>
              ))}
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 text-white py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition font-medium"
          >
            {submitting ? "Posting..." : postedToday ? "✏️ Update Standup" : "✅ Post Standup"}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-3 rounded-xl text-sm ${message.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {message.text}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">Your Last 7 Days</h3>
          <div className="space-y-3">
            {history.map((s) => (
              <div key={s.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">{fmtDate(s.date)}</span>
                  <div className="flex items-center gap-2">
                    {s.sprint && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        🏃 {s.sprint.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{fmtTime(s.date)}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Yesterday</p>
                    <p className="text-sm text-gray-700 mt-0.5">{s.yesterday}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Today</p>
                    <p className="text-sm text-gray-700 mt-0.5">{s.today}</p>
                  </div>
                  {s.blockers && (
                    <div>
                      <p className="text-xs font-medium text-red-400 uppercase tracking-wider">Blockers</p>
                      <p className="text-sm text-red-600 mt-0.5">{s.blockers}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
