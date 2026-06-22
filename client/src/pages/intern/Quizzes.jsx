import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { socket } from '../../lib/socket';

export default function Quizzes() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cohortId, setCohortId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const meRes = await api.get('/intern/me');
        const cId = meRes.data.profile?.cohort?.id;
        setCohortId(cId);

        const res = await api.get('/quiz/intern/list');
        setQuizzes(res.data.quizzes || []);
      } catch (err) {
        console.error('Failed to load quizzes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Live notification when mentor publishes new quiz
  useEffect(() => {
    if (!cohortId) return;
    socket.emit('join:cohort', cohortId);

    const onQuizNew = ({ quizId, topic, questionCount }) => {
      setQuizzes((prev) => [
        {
          id: quizId,
          topic,
          questionCount,
          myAttempt: null,
        },
        ...prev,
      ]);
    };

    socket.on('quiz:new', onQuizNew);
    return () => socket.off('quiz:new', onQuizNew);
  }, [cohortId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Quizzes</h2>
        <p className="text-sm text-gray-500 mt-1">
          Take quizzes assigned by your mentor
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Loading...</div>
      ) : quizzes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          <p className="text-4xl mb-3">🧠</p>
          <p className="font-medium">No quizzes yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Your mentor will publish quizzes here. They will appear instantly.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {quizzes.map((quiz) => {
            const attempted = !!quiz.myAttempt;
            const pct = attempted
              ? Math.round((quiz.myAttempt.score / quiz.myAttempt.total) * 100)
              : null;

            return (
              <Link
                key={quiz.id}
                to={`/intern/quizzes/${quiz.id}`}
                className="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-bold text-gray-800">{quiz.topic}</h3>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        {quiz.questionCount} questions
                      </span>
                      {attempted ? (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          pct >= 80 ? 'bg-emerald-100 text-emerald-700' :
                          pct >= 50 ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-600'
                        }`}>
                          Score: {pct}%
                        </span>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
                          Not attempted
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-purple-600">
                    {attempted ? '📊 View' : '▶ Start'}
                  </div>
                </div>

                {attempted && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          pct >= 80 ? 'bg-emerald-500' :
                          pct >= 50 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}