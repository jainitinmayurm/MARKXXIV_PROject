import React, { useContext } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './AuthContext';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import CreateMeeting from './views/CreateMeeting';
import MeetingDetail from './views/MeetingDetail';
import MyMeetings from './views/MyMeetings';
import MeetingRooms from './views/MeetingRooms';
import Reports from './views/Reports';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

const NavBar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  if (!user) return null;

  return (
    <nav>
      <div className="font-bold text-lg text-primary flex items-center gap-2">
        <span>Meeting Slot System</span>
      </div>
      <div className="nav-links items-center">
        <Link to="/dashboard" className="nav-link">Dashboard</Link>
        <Link to="/my-meetings" className="nav-link">My Meetings</Link>
        <Link to="/create" className="nav-link">Create Meeting</Link>
        {user.role === 'admin' && (
          <>
            <Link to="/rooms" className="nav-link">Rooms</Link>
            <Link to="/reports" className="nav-link">Reports</Link>
          </>
        )}
        <button onClick={() => { logout(); navigate('/'); }} className="btn btn-outline">Logout</button>
      </div>
    </nav>
  );
};

const AppContent = () => {
  const { user } = useContext(AuthContext);
  return (
    <>
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/create" element={<ProtectedRoute><CreateMeeting /></ProtectedRoute>} />
          <Route path="/meeting/:id" element={<ProtectedRoute><MeetingDetail /></ProtectedRoute>} />
          <Route path="/my-meetings" element={<ProtectedRoute><MyMeetings /></ProtectedRoute>} />
          <Route path="/rooms" element={<ProtectedRoute adminOnly><MeetingRooms /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />
        </Routes>
      </div>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
