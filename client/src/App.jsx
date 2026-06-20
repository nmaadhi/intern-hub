import { Routes, Route } from 'react-router-dom';
import RoleRedirect from './components/RoleRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import ForcePasswordChange from './pages/ForcePasswordChange';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import AdminLayout from './layouts/AdminLayout';
import MentorLayout from './layouts/MentorLayout';
import InternLayout from './layouts/InternLayout';

import AdminDashboard from './pages/admin/AdminDashboard';
import ManageMentors from './pages/admin/ManageMentors';
import ManageCohorts from './pages/admin/ManageCohorts';
import ManageInterns from './pages/admin/ManageInterns';
import ManageSprints from './pages/admin/ManageSprints';

import MentorDashboard from './pages/mentor/MentorDashboard';
import ManageInternsMentorView from './pages/mentor/ManageInterns';
import ManageAssignments from './pages/mentor/ManageAssignments';
import AssignmentSubmissions from './pages/mentor/AssignmentSubmissions';
import ManageTasks from './pages/mentor/ManageTasks';
import ManageMeetings from './pages/mentor/ManageMeetings';
import ManageNotes from './pages/mentor/ManageNotes';
import SprintBoard from './pages/mentor/SprintBoard';

import InternDashboard from './pages/intern/InternDashboard';
import Profile from './pages/intern/Profile';
import MyAssignments from './pages/intern/MyAssignments';
import SubmitAssignment from './pages/intern/SubmitAssignment';
import MyTasks from './pages/intern/MyTasks';
import MyMeetings from './pages/intern/MyMeetings';
import MyNotes from './pages/intern/MyNotes';
import InternSprintBoard from './pages/intern/SprintBoard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<RoleRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ForcePasswordChange />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="mentors" element={<ManageMentors />} />
          <Route path="cohorts" element={<ManageCohorts />} />
          <Route path="interns" element={<ManageInterns />} />
          <Route path="sprints" element={<ManageSprints />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['MENTOR']} />}>
        <Route path="/mentor" element={<MentorLayout />}>
          <Route index element={<MentorDashboard />} />
          <Route path="interns" element={<ManageInternsMentorView />} />
          <Route path="assignments" element={<ManageAssignments />} />
          <Route path="assignments/:id" element={<AssignmentSubmissions />} />
          <Route path="tasks" element={<ManageTasks />} />
          <Route path="meetings" element={<ManageMeetings />} />
          <Route path="notes" element={<ManageNotes />} />
          <Route path="sprint" element={<SprintBoard />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['INTERN']} />}>
        <Route path="/intern" element={<InternLayout />}>
          <Route index element={<InternDashboard />} />
          <Route path="profile" element={<Profile />} />
          <Route path="assignments" element={<MyAssignments />} />
          <Route path="assignments/:id" element={<SubmitAssignment />} />
          <Route path="tasks" element={<MyTasks />} />
          <Route path="meetings" element={<MyMeetings />} />
          <Route path="notes" element={<MyNotes />} />
          <Route path="sprint" element={<InternSprintBoard />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App;