import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { analyticsAPI, eventsAPI } from '../services/api';
import { Card, Button, Badge, LoadingSpinner } from '../components/UI.jsx';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import {
  Calendar,
  Users,
  Activity,
  TrendingUp,
  AlertCircle,
  Clock,
  BarChart3,
  CheckCircle,
  XCircle,
  UserPlus,
  Eye,
  MapPin,
  ArrowRight
} from 'lucide-react';

const DashboardView = ({ setActiveTab }) => {
  const { user } = useAuth();

  if (user?.role === 'stakeholder') {
    return <StakeholderDashboard setActiveTab={setActiveTab} />;
  }

  return <AdminDashboard setActiveTab={setActiveTab} user={user} />;
};

// ─── STAKEHOLDER DASHBOARD ──────────────────────────────────────────────────

const StakeholderDashboard = ({ setActiveTab }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsAPI.getStakeholderDashboard();
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchData}>Try Again</Button>
        </Card>
      </div>
    );
  }

  const { myEvents, myCommittees, engagement, eventDetails, committeeDetails, upcomingEvents } = data || {};

  const eventPieData = [
    { name: 'Approved', value: myEvents?.approved || 0, color: '#10b981' },
    { name: 'Pending', value: myEvents?.pending || 0, color: '#f59e0b' },
    { name: 'Rejected', value: myEvents?.rejected || 0, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-gradient-to-r from-[#005eb8] to-[#0078d4] rounded-xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || 'User'}!</h1>
        <p className="text-blue-100">Here's how your events and committees are performing</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={Calendar}
          label="My Events"
          value={myEvents?.total || 0}
          sub={myEvents?.pending > 0 ? `${myEvents.pending} pending approval` : 'All reviewed'}
          color="blue"
        />
        <MetricCard
          icon={Users}
          label="My Committees"
          value={myCommittees?.active || 0}
          sub={myCommittees?.pending > 0 ? `${myCommittees.pending} pending approval` : `${myCommittees?.total || 0} total`}
          color="purple"
        />
        <MetricCard
          icon={TrendingUp}
          label="Total Registrations"
          value={engagement?.totalRegistrations || 0}
          sub={`${engagement?.attendanceRate || 0}% attendance rate`}
          color="green"
        />
        <MetricCard
          icon={UserPlus}
          label="Pending Requests"
          value={engagement?.pendingJoinRequests || 0}
          sub="Committee join requests"
          color="orange"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* My Events Status */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-[#005eb8]" />
              My Events Status
            </h3>
            <button
              onClick={() => setActiveTab('events')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {eventPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={eventPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {eventPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Events']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex flex-col items-center justify-center text-gray-400">
              <Calendar className="h-10 w-10 mb-2" />
              <p className="text-sm">No events created yet</p>
              <button onClick={() => setActiveTab('events')} className="text-sm text-blue-600 mt-2 hover:underline">
                Create your first event
              </button>
            </div>
          )}
        </Card>

        {/* My Committees */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-[#005eb8]" />
              My Committees
            </h3>
            <button
              onClick={() => setActiveTab('committees')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          {committeeDetails && committeeDetails.length > 0 ? (
            <div className="space-y-3">
              {committeeDetails.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.members} members</p>
                  </div>
                  {c.pendingRequests > 0 && (
                    <span className="bg-orange-100 text-orange-700 text-xs font-medium px-2 py-1 rounded-full">
                      {c.pendingRequests} pending
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="h-[240px] flex flex-col items-center justify-center text-gray-400">
              <Users className="h-10 w-10 mb-2" />
              <p className="text-sm">No active committees yet</p>
              <button onClick={() => setActiveTab('committees')} className="text-sm text-blue-600 mt-2 hover:underline">
                Create a committee
              </button>
            </div>
          )}
        </Card>
      </div>

      {/* Event Performance Table */}
      {eventDetails && eventDetails.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#005eb8]" />
            Event Performance
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Event</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Registered</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Checked In</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Rate</th>
                </tr>
              </thead>
              <tbody>
                {eventDetails.map((e) => {
                  const rate = e.registrations > 0 ? Math.round((e.checkedIn / e.registrations) * 100) : 0;
                  return (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{e.title}</p>
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {e.date ? new Date(e.date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-semibold text-gray-900">{e.registrations}</span>
                        {e.capacity > 0 && <span className="text-gray-400">/{e.capacity}</span>}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-gray-900">{e.checkedIn}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          rate >= 70 ? 'bg-green-100 text-green-700' :
                          rate >= 40 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Upcoming Events */}
      {upcomingEvents && upcomingEvents.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#005eb8]" />
            My Upcoming Events
          </h3>
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id || event._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{event.title}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}
                    </span>
                    {event.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('events')}>
                  View
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// ─── ADMIN DASHBOARD ────────────────────────────────────────────────────────

const AdminDashboard = ({ setActiveTab, user }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [analyticsResult, eventsResult] = await Promise.allSettled([
        analyticsAPI.getDashboard(),
        eventsAPI.getAll({ status: 'approved', upcoming: 'true', limit: 5 })
      ]);

      if (analyticsResult.status === 'fulfilled') {
        setStats(analyticsResult.value.data);
      }

      if (eventsResult.status === 'fulfilled') {
        const eventsData = eventsResult.value.data?.events;
        setUpcomingEvents(Array.isArray(eventsData) ? eventsData : []);
      }

      if (analyticsResult.status === 'rejected' && eventsResult.status === 'rejected') {
        setError(analyticsResult.reason?.response?.data?.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchDashboardData}>Try Again</Button>
        </Card>
      </div>
    );
  }

  const COLORS = ['#005eb8', '#00b5e2', '#10b981', '#f59e0b', '#ef4444'];

  const eventStatusData = stats?.eventsByStatus ? [
    { name: 'Approved', value: stats.eventsByStatus.approved || 0 },
    { name: 'Pending', value: stats.eventsByStatus.pending || 0 },
    { name: 'Rejected', value: stats.eventsByStatus.rejected || 0 },
  ].filter(item => item.value > 0) : [];

  const hasEventData = eventStatusData.length > 0;
  const userActivityData = stats?.userActivity || [];
  const committeeData = stats?.topCommittees || [];
  const hasCommitteeData = committeeData.length > 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-[#005eb8] to-[#00b5e2] rounded-xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || 'User'}!</h1>
        <p className="text-blue-100">Here is an overview of the UTM Engagement Platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Calendar} title="Total Events" value={stats?.totalEvents || 0} color="blue" />
        <StatCard icon={Users} title="Total Users" value={stats?.totalUsers || 0} color="green" />
        <StatCard icon={Activity} title="Active Committees" value={stats?.totalCommittees || 0} color="purple" />
        <StatCard icon={TrendingUp} title="Event Registrations" value={stats?.totalRegistrations || 0} color="orange" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#005eb8]" />
            Event Status Distribution
          </h3>
          {hasEventData ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={eventStatusData} cx="50%" cy="50%" labelLine={true}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100} dataKey="value">
                  {eventStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Events']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
              <Calendar className="h-12 w-12 mb-2 opacity-50" />
              <p>No events data available</p>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-[#005eb8]" />
            Top Committees by Members
          </h3>
          {hasCommitteeData ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={committeeData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={60} tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value) => [value, 'Members']}
                  labelFormatter={(label) => committeeData.find(c => c.name === label)?.fullName || label} />
                <Bar dataKey="members" fill="#005eb8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-500">
              <Users className="h-12 w-12 mb-2 opacity-50" />
              <p>No committees data available</p>
            </div>
          )}
        </Card>
      </div>

      {/* User Activity Chart */}
      {userActivityData.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#005eb8]" />
            User Activity (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="logins" stroke="#005eb8" strokeWidth={2} />
              <Line type="monotone" dataKey="registrations" stroke="#00b5e2" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Upcoming Events */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#005eb8]" />
          Upcoming Events
        </h3>
        {upcomingEvents.length > 0 ? (
          <div className="space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{event.title}</h4>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {event.date ? new Date(event.date).toLocaleDateString() : 'TBA'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {event.attendees || 0} registered
                    </span>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setActiveTab('events')}>View Events</Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No upcoming events</p>
        )}
      </Card>

      {/* Admin Quick Actions */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start" onClick={() => setActiveTab('moderation')}>
            <AlertCircle className="h-5 w-5" />
            View Reports ({stats?.pendingReports || 0})
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => setActiveTab('events')}>
            <Clock className="h-5 w-5" />
            Pending Events ({stats?.eventsByStatus?.pending || 0})
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => setActiveTab('users')}>
            <Users className="h-5 w-5" />
            Manage Users
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ─── SHARED COMPONENTS ──────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, title, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-[#005eb8]',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};

const MetricCard = ({ icon: Icon, label, value, sub, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{sub}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${colors[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
};

export default DashboardView;
