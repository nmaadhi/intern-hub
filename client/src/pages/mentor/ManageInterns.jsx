import { useEffect, useState } from 'react';
import api from '../../lib/api';

function ManageInterns() {
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/mentor/interns');
        setInterns(res.data.interns || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load interns');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Interns</h2>
        <p className="text-gray-600 text-sm mt-1">Interns across all cohorts you lead</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">All Interns ({interns.length})</h3>
        {loading ? (<p className="text-gray-500 text-center py-4">Loading...</p>) : error ? (<p className="text-red-600 text-center py-4">{error}</p>) : interns.length === 0 ? (<p className="text-gray-500 text-center py-8">No interns assigned to your cohorts yet. Ask an admin to assign some.</p>) : (
          <div className="space-y-2">
            {interns.map((i) => (
              <div key={i.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800">{i.name}</p>
                    <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-mono">{i.internId}</span>
                  </div>
                  <p className="text-sm text-gray-500">{i.email}{i.phone ? ` - ${i.phone}` : ''}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Cohort: {i.cohort?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {i.mustChangePassword && (<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending login</span>)}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${i.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>{i.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        Need to add a new intern or move someone to a different cohort? Ask an admin - intern accounts are created and assigned from the Admin panel.
      </div>
    </div>
  );
}

export default ManageInterns;