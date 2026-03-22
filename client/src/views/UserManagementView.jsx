import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../services/api';
import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
  LoadingSpinner,
  EmptyState
} from '../components/UI.jsx';
import {
  Users,
  Search,
  Edit,
  Ban,
  Trash2,
  AlertCircle,
  Shield,
  User,
  Mail,
  Calendar,
  Building,
  CheckCircle,
  Briefcase
} from 'lucide-react';

const UserManagementView = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await usersAPI.getAll();
      // API returns array directly
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleBanUser = async (userId) => {
    if (!confirm('Are you sure you want to ban this user? They will not be able to log in.')) return;
    try {
      await usersAPI.ban(userId);
      fetchUsers();
      alert('User banned successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId) => {
    try {
      await usersAPI.unban(userId);
      fetchUsers();
      alert('User unbanned successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unban user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      await usersAPI.delete(userId);
      fetchUsers();
      alert('User deleted successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.department?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.status === 'active') ||
      (statusFilter === 'banned' && user.status === 'banned') ||
      (statusFilter === 'pending' && user.status === 'pending');

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Statistics
  const stats = {
    total: users.length,
    students: users.filter(u => u.role === 'student').length,
    stakeholders: users.filter(u => u.role === 'stakeholder').length,
    admins: users.filter(u => u.role === 'admin').length,
    banned: users.filter(u => u.status === 'banned').length,
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Check if current user is admin
  if (currentUser?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You do not have permission to access this page.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-1">Manage platform users and permissions</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title="Total Users" value={stats.total} icon={Users} color="blue" />
        <StatCard title="Students" value={stats.students} icon={User} color="green" />
        <StatCard title="Stakeholders" value={stats.stakeholders} icon={Briefcase} color="purple" />
        <StatCard title="Admins" value={stats.admins} icon={Shield} color="orange" />
        <StatCard title="Banned" value={stats.banned} icon={Ban} color="red" />
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, ID, or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none"
            >
              <option value="all">All Roles</option>
              <option value="student">Student</option>
              <option value="stakeholder">Stakeholder</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
            <Button variant="outline" onClick={fetchUsers} className="ml-auto">
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Users Table */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description={searchQuery ? "Try adjusting your search" : "No users available"}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID / Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    currentUser={currentUser}
                    onEdit={(user) => {
                      setSelectedUser(user);
                      setShowEditModal(true);
                    }}
                    onBan={handleBanUser}
                    onUnban={handleUnbanUser}
                    onDelete={handleDeleteUser}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Edit User Modal */}
      {selectedUser && (
        <EditUserModal
          isOpen={showEditModal}
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-[#005eb8]',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};

// User Row Component
const UserRow = ({ user, currentUser, onEdit, onBan, onUnban, onDelete }) => {
  const isSelf = user.id === currentUser?.id;

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'stakeholder':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'student':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'banned':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Banned</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Active</span>;
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-[#005eb8] to-[#00b5e2] rounded-full flex items-center justify-center text-white font-semibold">
              {user.name?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">
              {user.name}
              {isSelf && <span className="ml-2 text-xs text-gray-500">(You)</span>}
            </p>
            <p className="text-sm text-gray-600 flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user.email}
            </p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <p className="text-sm font-medium text-gray-900">{user.id}</p>
          {user.department && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Building className="h-3 w-3" />
              {user.department}
            </p>
          )}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${getRoleBadgeColor(user.role)}`}>
          {user.role}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(user.status)}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(user.joined || user.createdAt)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onEdit(user)}
            className="p-1.5 text-[#005eb8] hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit User"
          >
            <Edit className="h-4 w-4" />
          </button>
          {!isSelf && (
            <>
              {user.status === 'banned' ? (
                <button
                  onClick={() => onUnban(user.id)}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  title="Unban User"
                >
                  <CheckCircle className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => onBan(user.id)}
                  className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                  title="Ban User"
                >
                  <Ban className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => onDelete(user.id)}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete User"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

// Edit User Modal
const EditUserModal = ({ isOpen, user, onClose, onSuccess }) => {
  const { user: currentUser } = useAuth();
  const isSelf = user.id === currentUser?.id;
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    role: user.role || 'student',
    department: user.department || '',
    phone: user.phone || '',
    bio: user.bio || '',
  });
  const [loading, setLoading] = useState(false);

  // Sync form data when a different user is selected
  useEffect(() => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'student',
      department: user.department || '',
      phone: user.phone || '',
      bio: user.bio || '',
    });
  }, [user.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await usersAPI.update(user.id, formData);
      alert('User updated successfully!');
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-4 pb-4 border-b">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-16 h-16 rounded-full" />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-[#005eb8] to-[#00b5e2] rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">ID: {user.id}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
              user.status === 'banned' ? 'bg-red-100 text-red-700' :
              user.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }`}>
              {user.status || 'active'}
            </span>
          </div>
        </div>

        <Input
          label="Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            disabled={isSelf}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="student">Student</option>
            <option value="stakeholder">Stakeholder</option>
            <option value="admin">Admin</option>
          </select>
          {isSelf && (
            <p className="text-xs text-gray-500 mt-1">You cannot change your own role</p>
          )}
        </div>
        <Input
          label="Department / Organization"
          value={formData.department}
          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          placeholder="e.g., Computer Science, Tech Corp Ltd"
        />
        <Input
          label="Phone"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+230 5XXX XXXX"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none resize-none"
            placeholder="Short bio about the user..."
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Updating...' : 'Update User'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserManagementView;
