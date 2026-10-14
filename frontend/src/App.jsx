import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import './styles/variables.css';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import Dashboard from './pages/dashboard/Dashboard';
import BoardView from './pages/boardview/BoardView';
import InvitePage from './pages/invite/InvitePage';
import TasksPage from './pages/tasks/TasksPage';
import CalendarPage from './pages/calendar/CalendarPage';
import NotificationsProvider from './components/Notifications/NotificationsProvider';
import RealtimeProvider from './components/Realtime/RealtimeProvider';

export default function App() {
  return (
    <BrowserRouter>
      {/* One WebSocket for the whole app (while logged in) */}
      <RealtimeProvider>
        {/* Notifications: pushed live, polled as a fallback; toasts bottom-right */}
        <NotificationsProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/dashboard" element={<Dashboard key="all" />} />
            <Route path="/starred" element={<Dashboard key="starred" view="starred" />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/boards/:boardId" element={<BoardView />} />
            <Route path="/invite/:token" element={<InvitePage />} />
          </Routes>
        </NotificationsProvider>
      </RealtimeProvider>
    </BrowserRouter>
  );
}