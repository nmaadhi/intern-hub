import { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function Quiz() {
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [interns, setInterns] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [assignType, setAssignType] = useState('COHORT');
  const [selectedInternIds, setSelectedInternIds] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [previewQuestions, setPreviewQuestions] = useState(null);

  const [viewingResults, setViewingResults] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    api.get('/mentor/cohorts').then((res) => {
      const list = res.data.cohorts || [];
      setCohorts(list);
      if (list.length > 0) setSelectedCohortId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedCohortId) return;
    api.get('/mentor/interns').then((res) => {
      const all = res.data.interns || [];
      const cohortInterns = all.filter((i) => i.cohort?.id === selectedCohortId);
      setInterns(cohortInterns);
    });
    loadQuizzes();
  }, [selectedCohortId]);

  const loadQuizzes = async () => {
    if (!selectedCohortId) return;
    setLoading(true);
    try {
      const res = await api.get(`/quiz?cohortId=${selectedCohortId}`);
      setQuizzes(res.data.quizzes || []);
    } catch (err) {
      console.error('Failed to load quizzes');
    } finally {
      setLoading(false);
    }
  };

  const toggleIntern = (id) => {
    setSelectedInternIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    setPreviewQuestions(null);
    try {
      const res = await api.post('/quiz/generate', {
        topic,
        questionCount,
        cohortId: selectedCohortId,
      });
      setPreviewQuestions(res.data.questions);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate quiz');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (assignType === 'DIRECT' && selectedInternIds.length === 0) {
      setError('Select at least one intern');
      return;
    }
    setPublishing(true);
    setError('');
    try {
      await api.post('/quiz/publish', {
        topic,
        cohortId: selectedCohortId,
        questions: previewQuestions,
        assignType,
        internIds: assignType === 'DIRECT' ? selectedInternIds : [],
      });
      setPreviewQuestions(null);
      setTopic('');
      setQuestionCount(5);
      setAssignType('COHORT');
      setSelectedInternIds([]);
      setShowForm(false);
      await loadQuizzes();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to publish quiz');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (quizId) => {
    if (!window.confirm('Delete this quiz?')) return;
    try {
      await api.delete(`/quiz/${quizId}`);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete quiz');
    }
  };

  const handleViewResults = async (quizId) => {
    setViewingResults(quizId);
    setLoadingResults(true);
    try {
      const res = await api.get(`/quiz/${quizId}/results`);
      setResultsData(res.data.quiz);
    } catch (err) {
      alert('Failed to load results');
    } finally {
      setLoadingResults(false);
    }
  };

  const fmtDate = (s) => new Date(s).toLocaleDateString([], { dateStyle: 'medium' });

  // ── Results view ──────────────────────────────────────────────────
  if (viewingResults && resultsData) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => { setViewingResults(null); setResultsData(null); }}
          className="text-sm text-purple-600 hover:underline"
        >
          ← Back to Quizzes
        </button>

        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quiz Results</h2>
          <p className="text-sm text-gray-500 mt-1">Topic: {resultsData.topic}</p>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
            resultsData.assignType === 'COHORT'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {resultsData.assignType === 'COHORT' ? 'Cohort Quiz' : 'Direct Quiz'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center border-l-4 border-purple-500">
            <p className="text-3xl font-bold text-gray-800">{resultsData.attempts.length}</p>
            <p className="text-xs text-gray-500 mt-1">Attempts</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center border-l-4 border-emerald-500">
            <p className="text-3xl font-bold text-gray-800">
              {resultsData.attempts.length > 0
                ? Math.round(
                    resultsData.attempts.reduce((s, a) => s + (a.score / a.total) * 100, 0) /
                    resultsData.attempts.length
                  )
                : 0}%
            </p>
            <p className="text-xs text-gray-500 mt-1">Avg Score</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center border-l-4 border-blue-500">
            <p className="text-3xl font-bold text-gray-800">{resultsData.questions.length}</p>
            <p className="text-xs text-gray-500 mt-1">Questions</p>
          </div>
        </div>

        {resultsData.attempts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
            <p className="text-4xl mb-3">📊</p>
            <p className="font-medium">No attempts yet</p>
            <p className="text-sm text-gray-400 mt-1">Interns will appear here once they take the quiz</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">Intern Scores</h3>
            <div className="space-y-3">
              {resultsData.attempts.map((attempt) => {
                const pct = Math.round((attempt.score / attempt.total) * 100);
                const color = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <div key={attempt.id} className="flex items-center gap-4">
                    <div className="w-32 shrink-0">
                      <p className="font-medium text-gray-800 text-sm">{attempt.intern.name}</p>
                      <p className="text-xs text-gray-400">{attempt.intern.internId}</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{attempt.score}/{attempt.total} correct</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className={`h-2.5 rounded-full ${color} transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ${
                      pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'
                    }`}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">AI Quiz Generator</h2>
          <p className="text-sm text-gray-500 mt-1">Generate MCQ quizzes for your interns using AI</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {cohorts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setPreviewQuestions(null);
              setError('');
              setSelectedInternIds([]);
            }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
          >
            {showForm ? 'Cancel' : '✨ Generate Quiz'}
          </button>
        </div>
      </div>

      {/* Generate form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4">Generate a new quiz</h3>
          <form onSubmit={handleGenerate} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g. React Hooks, SQL Joins, REST APIs, Python basics"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of questions (1–20)
              </label>
              <input
                type="number"
                value={questionCount}
                onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                min={1}
                max={20}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Assign type toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign to</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAssignType('COHORT'); setSelectedInternIds([]); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    assignType === 'COHORT'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Entire Cohort
                </button>
                <button
                  type="button"
                  onClick={() => setAssignType('DIRECT')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    assignType === 'DIRECT'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Specific Interns
                </button>
              </div>
            </div>

            {/* Intern selector */}
            {assignType === 'DIRECT' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select interns{' '}
                  <span className="text-gray-400 font-normal">({selectedInternIds.length} selected)</span>
                </label>
                {interns.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                    No interns in this cohort.
                  </p>
                ) : (
                  <div className="border border-gray-300 rounded-lg divide-y max-h-48 overflow-y-auto">
                    {interns.map((i) => (
                      <label
                        key={i.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-purple-50 transition ${
                          selectedInternIds.includes(i.id) ? 'bg-purple-50' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedInternIds.includes(i.id)}
                          onChange={() => toggleIntern(i.id)}
                          className="accent-purple-600"
                        />
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

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={generating}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition text-sm font-medium flex items-center gap-2"
            >
              {generating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating {questionCount} questions...
                </>
              ) : (
                '✨ Generate with AI'
              )}
            </button>
          </form>

          {/* Preview */}
          {previewQuestions && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800">
                  Preview — {previewQuestions.length} questions ✅
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="text-sm text-purple-600 hover:underline disabled:opacity-50"
                  >
                    Regenerate
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition text-sm font-medium"
                  >
                    {publishing
                      ? 'Publishing...'
                      : assignType === 'COHORT'
                      ? '🚀 Publish to Cohort'
                      : `🚀 Publish to ${selectedInternIds.length} Intern${selectedInternIds.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {previewQuestions.map((q, qi) => (
                  <div key={qi} className="bg-gray-50 rounded-xl p-4">
                    <p className="font-medium text-gray-800 mb-3">
                      {qi + 1}. {q.question}
                    </p>
                    <div className="space-y-2">
                      {q.options.map((opt, oi) => (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            opt.isCorrect
                              ? 'bg-emerald-100 text-emerald-800 font-medium'
                              : 'bg-white text-gray-700'
                          }`}
                        >
                          <span className="font-mono text-xs text-gray-400">
                            {String.fromCharCode(65 + oi)}.
                          </span>
                          {opt.text}
                          {opt.isCorrect && (
                            <span className="ml-auto text-xs text-emerald-600 font-bold">✓ Correct</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400 mt-3">
                ✅ Green = correct answer. Interns will not see this until after submitting.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Quiz list */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Loading...</div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          <p className="text-4xl mb-3">🧠</p>
          <p className="font-medium">No quizzes yet</p>
          <p className="text-sm text-gray-400 mt-1">Generate a quiz above and publish it</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-gray-800">{quiz.topic}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      quiz.assignType === 'COHORT'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}>
                      {quiz.assignType === 'COHORT'
                        ? 'Cohort'
                        : `Direct (${quiz.recipientCount} interns)`}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {quiz.questionCount} questions
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {quiz.attemptCount} attempts
                    </span>
                    {quiz.avgScore !== null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        quiz.avgScore >= 80
                          ? 'bg-emerald-100 text-emerald-700'
                          : quiz.avgScore >= 50
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        Avg: {quiz.avgScore}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{fmtDate(quiz.createdAt)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleViewResults(quiz.id)}
                    className="text-xs bg-purple-100 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-200 transition font-medium"
                  >
                    📊 Results
                  </button>
                  <button
                    onClick={() => handleDelete(quiz.id)}
                    className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}