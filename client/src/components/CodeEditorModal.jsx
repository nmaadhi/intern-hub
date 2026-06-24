import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import api from '../lib/api';

const LANGUAGES = [
  { value: 'python', label: 'Python', monaco: 'python' },
  { value: 'javascript', label: 'JavaScript', monaco: 'javascript' },
  { value: 'java', label: 'Java', monaco: 'java' },
  { value: 'cpp', label: 'C++', monaco: 'cpp' },
  { value: 'c', label: 'C', monaco: 'c' },
  { value: 'go', label: 'Go', monaco: 'go' },
  { value: 'rust', label: 'Rust', monaco: 'rust' },
  { value: 'ruby', label: 'Ruby', monaco: 'ruby' },
];

const STARTERS = {
  python: '# Write your solution here\n\ndef solution():\n    pass\n\nsolution()\n',
  javascript: '// Write your solution here\n\nfunction solution() {\n  \n}\n\nsolution();\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
  cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  c: '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Write your solution here\n    fmt.Println("Hello")\n}\n',
  rust: 'fn main() {\n    // Write your solution here\n    println!("Hello");\n}\n',
  ruby: '# Write your solution here\n\ndef solution\n  \nend\n\nsolution\n',
};

export default function CodeEditorModal({ task, onClose, onPassed }) {
  const [code, setCode] = useState(STARTERS[task.codeLanguage || 'python'] || STARTERS.python);
  const [language, setLanguage] = useState(task.codeLanguage || 'python');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [pastSubmission, setPastSubmission] = useState(null);
  const [loadingPast, setLoadingPast] = useState(true);
  const [activeTab, setActiveTab] = useState('editor');

  const langConfig = LANGUAGES.find((l) => l.value === language) || LANGUAGES[0];

  useEffect(() => {
    api.get(`/sprint/tasks/${task.id}/my-submission`)
      .then((res) => {
        if (res.data.submission) {
          setPastSubmission(res.data.submission);
          setCode(res.data.submission.code);
          setLanguage(res.data.submission.language);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPast(false));
  }, [task.id]);

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.post(`/sprint/tasks/${task.id}/code-submit`, { code, language });
      setResult(res.data);
      setPastSubmission({ code, language, aiReview: res.data.review, passed: res.data.passed, aiVerdict: res.data.verdict });
      setActiveTab('result');
      if (res.data.passed) {
        setTimeout(() => onPassed(), 1500);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit code');
    } finally {
      setSubmitting(false);
    }
  };

  const scoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-500';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-2">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-lg">💻</span>
            <div>
              <h3 className="font-bold text-gray-800 text-sm">{task.title}</h3>
              {task.description && <p className="text-xs text-gray-500">{task.description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                if (!pastSubmission) setCode(STARTERS[e.target.value] || '');
              }}
              className="text-xs px-2 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {LANGUAGES.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
            </select>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-1">✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {[
            { id: 'editor', label: '📝 Code Editor' },
            { id: 'result', label: `🤖 AI Review${result ? (result.passed ? ' ✅' : ' ❌') : ''}` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === tab.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {tab.label}
            </button>
          ))}
          {pastSubmission && (
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${activeTab === 'history' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              📋 Past Submission
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">

          {/* Editor tab */}
          {activeTab === 'editor' && (
            <div className="flex flex-col h-full">
              <div className="flex-1">
                <Editor
                  height="100%"
                  language={langConfig.monaco}
                  value={code}
                  onChange={(val) => setCode(val || '')}
                  theme="vs-dark"
                  options={{
                    fontSize: 14,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    roundedSelection: true,
                    padding: { top: 12 },
                    fontFamily: 'JetBrains Mono, Fira Code, monospace',
                  }}
                />
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  💡 Your code will be executed and then reviewed by AI
                  {task.isCodeTask && pastSubmission?.passed && (
                    <span className="ml-2 text-emerald-600 font-medium">✅ Already passed!</span>
                  )}
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !code.trim() || pastSubmission?.passed}
                  className="bg-purple-600 text-white px-5 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition font-medium text-sm flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Running & Reviewing...
                    </>
                  ) : pastSubmission?.passed ? (
                    '✅ Already Passed'
                  ) : (
                    '🚀 Submit for AI Review'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Result tab */}
          {activeTab === 'result' && (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              {!result && !pastSubmission ? (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-4xl mb-3">🤖</p>
                  <p>Submit your code to see AI review here</p>
                </div>
              ) : (
                (() => {
                  const r = result?.review || pastSubmission?.aiReview;
                  const passed = result?.passed ?? pastSubmission?.passed;
                  const output = result?.executionOutput || '';
                  const error = result?.executionError || '';

                  if (!r) return <p className="text-gray-500">No review available yet.</p>;

                  return (
                    <>
                      {/* Verdict banner */}
                      <div className={`rounded-2xl p-5 text-center ${passed ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className="text-4xl mb-2">{passed ? '✅' : '❌'}</p>
                        <p className={`text-2xl font-black ${passed ? 'text-emerald-700' : 'text-red-600'}`}>
                          {passed ? 'PASSED' : 'FAILED'}
                        </p>
                        {r.score !== undefined && (
                          <p className={`text-3xl font-bold mt-1 ${scoreColor(r.score)}`}>{r.score}/100</p>
                        )}
                        {passed && <p className="text-emerald-600 text-sm mt-2 font-medium">🎉 Task automatically moved to Done!</p>}
                        {!passed && <p className="text-red-500 text-sm mt-2">Fix the issues below and resubmit.</p>}
                      </div>

                      {/* Summary */}
                      {r.summary && (
                        <div className="bg-white rounded-xl border border-gray-200 p-4">
                          <h4 className="font-bold text-gray-800 mb-2 text-sm">📋 Summary</h4>
                          <p className="text-sm text-gray-700">{r.summary}</p>
                        </div>
                      )}

                      {/* Execution output */}
                      {(output || error) && (
                        <div className="bg-gray-900 rounded-xl p-4">
                          <p className="text-xs text-gray-400 mb-2 font-mono">Terminal Output</p>
                          {output && <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">{output}</pre>}
                          {error && <pre className="text-red-400 text-xs font-mono whitespace-pre-wrap">{error}</pre>}
                        </div>
                      )}

                      {/* Strengths */}
                      {r.strengths?.length > 0 && (
                        <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4">
                          <h4 className="font-bold text-emerald-800 mb-2 text-sm">✅ Strengths</h4>
                          <ul className="space-y-1">
                            {r.strengths.map((s, i) => (
                              <li key={i} className="text-sm text-emerald-700 flex items-start gap-2">
                                <span className="mt-0.5">→</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Improvements */}
                      {r.improvements?.length > 0 && (
                        <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
                          <h4 className="font-bold text-amber-800 mb-2 text-sm">🔧 Improvements Needed</h4>
                          <ul className="space-y-1">
                            {r.improvements.map((s, i) => (
                              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                                <span className="mt-0.5">→</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Tip */}
                      {r.tip && (
                        <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
                          <h4 className="font-bold text-purple-800 mb-2 text-sm">💡 Pro Tip</h4>
                          <p className="text-sm text-purple-700">{r.tip}</p>
                        </div>
                      )}

                      {!passed && (
                        <button
                          onClick={() => setActiveTab('editor')}
                          className="w-full bg-purple-600 text-white py-2.5 rounded-xl hover:bg-purple-700 transition font-medium text-sm"
                        >
                          ✏️ Go back and fix the code
                        </button>
                      )}
                    </>
                  );
                })()
              )}
            </div>
          )}

          {/* History tab */}
          {activeTab === 'history' && pastSubmission && (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              <div className={`rounded-xl p-4 border ${pastSubmission.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <p className="font-bold text-sm">
                  {pastSubmission.passed ? '✅ Passed' : '❌ Failed'} · {pastSubmission.language}
                </p>
              </div>
              <div className="bg-gray-900 rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-400 font-mono">Your submitted code</span>
                  <button
                    onClick={() => { setCode(pastSubmission.code); setActiveTab('editor'); }}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Load into editor
                  </button>
                </div>
                <pre className="p-4 text-green-300 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                  {pastSubmission.code}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}