import { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import AuthScreen from './views/AuthScreen';
import {
  LayoutDashboard,
  Calendar,
  Users,
  MessageSquare,
  LogOut,
  Menu,
  X,
  Shield,
  Activity,
  School,
  UserCircle,
  Bell
} from 'lucide-react';

import DashboardView from './views/DashboardView';
import EventsView from './views/EventsView';
import CommitteesView from './views/CommitteesView';
import UserManagementView from './views/UserManagementView';
import ModerationView from './views/ModerationView';
import ActivityLogsView from './views/ActivityLogsView';
import UserProfileView from './views/UserProfileView';
import FeedbackView from './views/FeedbackView';
import FeedbackManagementView from './views/FeedbackManagementView';
import NotificationBell from './components/NotificationBell';
import NotificationToast from './components/NotificationToast';

function AppContent() {
  const { user, logout, mustChangePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('events');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [visitedTabs, setVisitedTabs] = useState(new Set());
  const initialTabSet = useRef(false);

  // Set default tab based on role after login
  useEffect(() => {
    if (user && !initialTabSet.current) {
      initialTabSet.current = true;
      const defaultTab = (user.role === 'admin' || user.role === 'stakeholder') ? 'dashboard' : 'events';
      setActiveTab(defaultTab);
      setVisitedTabs(new Set([defaultTab]));
    }
    if (!user) {
      initialTabSet.current = false;
      setVisitedTabs(new Set());
    }
  }, [user]);

  // Track visited tabs — mount on first visit, keep alive after
  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
    setVisitedTabs(prev => {
      if (prev.has(tabId)) return prev;
      return new Set([...prev, tabId]);
    });
  }, []);

  if (!user || mustChangePassword) {
    return <AuthScreen />;
  }

  const viewClass = (tabId) =>
    activeTab === tabId ? 'page-transition' : 'view-hidden';

  const navigation = [
    ...(user.role !== 'student' ? [
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'stakeholder'] }
    ] : []),
    { id: 'events', name: 'Events', icon: Calendar, roles: ['admin', 'student', 'stakeholder'] },
    { id: 'committees', name: 'Committees', icon: Users, roles: ['admin', 'student', 'stakeholder'] },
    { id: 'profile', name: 'Profile', icon: UserCircle, roles: ['admin', 'student', 'stakeholder'] },
    { id: 'feedback', name: 'Give Feedback', icon: MessageSquare, roles: ['admin', 'student', 'stakeholder'] },
    ...(user.role === 'admin' ? [
      { id: 'feedback-management', name: 'Manage Feedback', icon: MessageSquare, roles: ['admin'] },
      { id: 'users', name: 'User Management', icon: Users, roles: ['admin'] },
      { id: 'moderation', name: 'Moderation', icon: Shield, roles: ['admin'] },
      { id: 'logs', name: 'Activity Logs', icon: Activity, roles: ['admin'] },
    ] : []),
  ];

  return (
    <SocketProvider>
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-screen sticky top-0`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#005eb8] rounded-lg flex items-center justify-center">
                <School size={24} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-800 text-sm">UTM Engage</h1>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#005eb8] text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} />
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-200">
          {sidebarOpen && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
          >
            <LogOut size={20} />
            {sidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
            {visitedTabs.has('dashboard') && <div className={viewClass('dashboard')}><DashboardView setActiveTab={handleTabChange} /></div>}
            {visitedTabs.has('events') && <div className={viewClass('events')}><EventsView /></div>}
            {visitedTabs.has('committees') && <div className={viewClass('committees')}><CommitteesView /></div>}
            {visitedTabs.has('profile') && <div className={viewClass('profile')}><UserProfileView setActiveTab={handleTabChange} /></div>}
            {visitedTabs.has('feedback') && <div className={viewClass('feedback')}><FeedbackView /></div>}
            {visitedTabs.has('feedback-management') && <div className={viewClass('feedback-management')}><FeedbackManagementView /></div>}
            {visitedTabs.has('users') && <div className={viewClass('users')}><UserManagementView /></div>}
            {visitedTabs.has('moderation') && <div className={viewClass('moderation')}><ModerationView /></div>}
            {visitedTabs.has('logs') && <div className={viewClass('logs')}><ActivityLogsView /></div>}
        </div>
      </div>
    </div>
    <NotificationToast />
    </SocketProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
