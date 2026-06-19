import { useEffect, useState } from 'react';
import api from '../../lib/api';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/intern/me');
        setProfile(res.data.profile);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : 'Not provided';

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
        <p className="text-gray-600 text-sm mt-1">View your account details</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Personal Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Name</p>
            <p className="font-medium text-gray-800">{profile?.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Intern ID</p>
            <p className="font-mono font-medium text-gray-800">{profile?.internId}</p>
          </div>
          <div>
            <p className="text-gray-500">Email</p>
            <p className="font-medium text-gray-800">{profile?.email}</p>
          </div>
          <div>
            <p className="text-gray-500">Phone</p>
            <p className="font-medium text-gray-800">{profile?.phone || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-gray-500">Date of birth</p>
            <p className="font-medium text-gray-800">{fmtDate(profile?.dob)}</p>
          </div>
          <div>
            <p className="text-gray-500">College</p>
            <p className="font-medium text-gray-800">{profile?.college || 'Not provided'}</p>
          </div>
          <div>
            <p className="text-gray-500">Status</p>
            <p className="font-medium text-gray-800">{profile?.status}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Mentor & Cohort</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Direct Mentor</p>
            {profile?.mentor ? (
              <div className="mt-1">
                <p className="font-medium text-gray-800">{profile.mentor.name}</p>
                <p className="text-gray-500">{profile.mentor.email}</p>
                {profile.mentor.phone && <p className="text-gray-500">{profile.mentor.phone}</p>}
              </div>
            ) : (
              <p className="font-medium text-gray-400 italic">Not assigned</p>
            )}
          </div>
          <div>
            <p className="text-gray-500">Cohort</p>
            {profile?.cohort ? (
              <div className="mt-1">
                <p className="font-medium text-gray-800">{profile.cohort.name}</p>
                {profile.cohort.description && <p className="text-gray-500">{profile.cohort.description}</p>}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${profile.cohort.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>{profile.cohort.status}</span>
              </div>
            ) : (
              <p className="font-medium text-gray-400 italic">Not assigned</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        Need to update your details? Contact your admin or mentor.
      </div>
    </div>
  );
}

export default Profile;