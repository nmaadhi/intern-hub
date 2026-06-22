import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../lib/api';

export default function TakeQuiz() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [myAttempt, setMyAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/quiz/intern/${id}`);
        setQuiz(res.data.quiz);
        setMyAttempt(res.data.myAttempt);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load quiz');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleAnswer = (questionId, optionId) => {
    if (myAttempt) return; // Already attempted
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < quiz.questions.length) {
      alert('Please answer all questions before submitting');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/quiz/intern/${id}/attempt`, { answers });
      setResults(res.data);
      setMyAttempt({ score: res.data.score, total: res.data.total });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Loading quiz...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;

  const pct = results ? results.percentage : myAttempt ? Math.round((myAttempt.score / myAttempt.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/intern/quizzes" className="text-sm text-emerald-600 hover:underline">
          ← Back to Quizzes
        </Link>
        <h2 className="text-2xl font-bold text-gray-800 mt-2">{quiz.topic}</h2>
        <p className="text-sm text-gray-500 mt-1">{quiz.questions.length} questions</p>
      </div>

      {/* Results banner */}
      {(results || myAttempt) && (
        <div className={`rounded-2xl p-6 text-center ${
          pct >= 80 ? 'bg-emerald-50 border border-emerald-200' :
          pct >= 50 ? 'bg-amber-50 border border-amber-200' :
          'bg-red-50 border border-red-200'
        }`}>
          <p className="text-5xl font-black mb-2" style={{
            color: pct >= 80 ? '#059669' : pct >= 50 ? '#d97706' : '#dc2626'
          }}>
            {pct}%
          </p>
          <p className="font-bold text-gray-800 text-lg">
            {results ? `You scored ${results.score} out of ${results.total}` : `${myAttempt.score}/${myAttempt.total} correct`}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {pct >= 80 ? '🎉 Excellent work!' : pct >= 50 ? '👍 Good effort!' : '📚 Keep practicing!'}
          </p>
        </div>
      )}

      {/* Questions */}
      <div className="space-y-5">
        {quiz.questions.map((q, qi) => {
          const selectedOptionId = answers[q.id];
          const result = results?.results?.find((r) => r.questionId === q.id);

          return (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm p-5">
              <p className="font-bold text-gray-800 mb-4">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((opt) => {
                  let style = 'bg-gray-50 border border-gray-200 text-gray-700 hover:border-emerald-400 hover:bg-emerald-50 cursor-pointer';

                  if (result) {
                    // Show results
                    if (opt.id === result.correctOptionId) {
                      style = 'bg-emerald-100 border border-emerald-400 text-emerald-800 font-medium';
                    } else if (opt.id === result.selectedOptionId && !result.isCorrect) {
                      style = 'bg-red-100 border border-red-400 text-red-700';
                    } else {
                      style = 'bg-gray-50 border border-gray-200 text-gray-500';
                    }
                  } else if (selectedOptionId === opt.id) {
                    style = 'bg-emerald-100 border border-emerald-500 text-emerald-800 font-medium';
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswer(q.id, opt.id)}
                      disabled={!!myAttempt}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition flex items-center gap-3 ${style}`}
                    >
                      <span className="font-mono text-xs text-gray-400 shrink-0">
                        {String.fromCharCode(65 + opt.order)}.
                      </span>
                      <span>{opt.text}</span>
                      {result && opt.id === result.correctOptionId && (
                        <span className="ml-auto text-emerald-600 font-bold shrink-0">✓</span>
                      )}
                      {result && opt.id === result.selectedOptionId && !result.isCorrect && (
                        <span className="ml-auto text-red-500 font-bold shrink-0">✗</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {result && (
                <p className={`text-xs mt-2 font-medium ${result.isCorrect ? 'text-emerald-600' : 'text-red-500'}`}>
                  {result.isCorrect ? '✅ Correct!' : `❌ Correct answer: ${result.correctOptionText}`}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!myAttempt && (
        <div className="sticky bottom-4">
          <button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(answers).length < quiz.questions.length}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition font-medium shadow-lg"
          >
            {submitting
              ? 'Submitting...'
              : `Submit Quiz (${Object.keys(answers).length}/${quiz.questions.length} answered)`}
          </button>
        </div>
      )}
    </div>
  );
}