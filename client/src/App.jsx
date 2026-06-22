import { Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import RoleRedirect from './components/RoleRedirect';
import ProtectedRoute from './components/ProtectedRoute';

import AdminLayout from './layouts/AdminLayout';
import MentorLayout from './layouts/MentorLayout';
import InternLayout from './layouts/InternLayout';

const Login = lazy(() => import('./pages/Login'));
const NotFound = lazy(() => import('./pages/NotFound'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Chat = lazy(() => import('./pages/Chat'));

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageMentors = lazy(() => import('./pages/admin/ManageMentors'));
const ManageCohorts = lazy(() => import('./pages/admin/ManageCohorts'));
const ManageInterns = lazy(() => import('./pages/admin/ManageInterns'));
const ManageSprints = lazy(() => import('./pages/admin/ManageSprints'));

const MentorDashboard = lazy(() => import('./pages/mentor/MentorDashboard'));
const ManageInternsMentorView = lazy(() => import('./pages/mentor/ManageInterns'));
const ManageAssignments = lazy(() => import('./pages/mentor/ManageAssignments'));
const AssignmentSubmissions = lazy(() => import('./pages/mentor/AssignmentSubmissions'));
const ManageTasks = lazy(() => import('./pages/mentor/ManageTasks'));
const ManageMeetings = lazy(() => import('./pages/mentor/ManageMeetings'));
const ManageNotes = lazy(() => import('./pages/mentor/ManageNotes'));
const SprintBoard = lazy(() => import('./pages/mentor/SprintBoard'));
const StandupFeed = lazy(() => import('./pages/mentor/StandupFeed'));
const Polls = lazy(() => import('./pages/mentor/Polls'));
const Announcements = lazy(() => import('./pages/mentor/Announcements'));
const MentorQuiz = lazy(() => import('./pages/mentor/Quiz'));

const InternDashboard = lazy(() => import('./pages/intern/InternDashboard'));
const Profile = lazy(() => import('./pages/intern/Profile'));
const MyAssignments = lazy(() => import('./pages/intern/MyAssignments'));
const SubmitAssignment = lazy(() => import('./pages/intern/SubmitAssignment'));
const MyTasks = lazy(() => import('./pages/intern/MyTasks'));
const MyMeetings = lazy(() => import('./pages/intern/MyMeetings'));
const MyNotes = lazy(() => import('./pages/intern/MyNotes'));
const InternSprintBoard = lazy(() => import('./pages/intern/SprintBoard'));
const Standup = lazy(() => import('./pages/intern/Standup'));
const ActivePoll = lazy(() => import('./pages/intern/ActivePoll'));
const InternAnnouncements = lazy(() => import('./pages/intern/Announcements'));
const Quizzes = lazy(() => import('./pages/intern/Quizzes'));
const TakeQuiz = lazy(() => import('./pages/intern/TakeQuiz'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="mentors" element={<ManageMentors />} />
            <Route path="cohorts" element={<ManageCohorts />} />
            <Route path="interns" element={<ManageInterns />} />
            <Route path="sprints" element={<ManageSprints />} />
            <Route path="chat" element={<Chat />} />
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
            <Route path="standup" element={<StandupFeed />} />
            <Route path="polls" element={<Polls />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="quiz" element={<MentorQuiz />} />
            <Route path="chat" element={<Chat />} />
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
            <Route path="standup" element={<Standup />} />
            <Route path="polls" element={<ActivePoll />} />
            <Route path="announcements" element={<InternAnnouncements />} />
            <Route path="quizzes" element={<Quizzes />} />
            <Route path="quizzes/:id" element={<TakeQuiz />} />
            <Route path="chat" element={<Chat />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

export default App;