import { useState } from 'react';
import { Camera, Edit, Save, X, Mail, Phone, Briefcase, Calendar } from 'lucide-react';
import { Card, Button, Input } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../services/api';

const UserProfileView = ({ setActiveTab }) => {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
    bio: user?.bio || ''
  });
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = { ...formData };
      if (avatarPreview) {
        payload.avatar = avatarPreview;
      }
      const response = await usersAPI.update(user.id, payload);
      updateUser(response.data);
      setAvatarPreview(null);
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      phone: user?.phone || '',
      department: user?.department || '',
      bio: user?.bio || ''
    });
    setAvatarPreview(null);
    setIsEditing(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-blue-100 text-blue-700';
      case 'stakeholder':
        return 'bg-cyan-100 text-cyan-700';
      case 'student':
        return 'bg-emerald-100 text-emerald-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      {/* Header Card */}
      <Card className="relative overflow-hidden">
        {/* Cover Background */}
        <div className="h-32 gradient-bg"></div>

        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row gap-6 -mt-16">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg overflow-hidden bg-gradient-to-br from-utm-blue to-utm-cyan flex items-center justify-center">
                {avatarPreview || user.avatar ? (
                  <img src={avatarPreview || user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              {isEditing && (
                <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                  <Camera size={18} className="text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 mt-6 md:mt-14">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="text-3xl font-bold text-gray-900 border-b-2 border-[#005eb8] outline-none bg-transparent w-full"
                        required
                      />
                    ) : (
                      user.name
                    )}
                  </h1>
                  <p className="text-gray-500 mt-1">{user.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      user.status === 'banned' ? 'bg-red-100 text-red-700' :
                      user.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}
                    </span>
                  </div>
                </div>

                {!isEditing ? (
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit size={16} /> Edit Profile
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={handleCancel}>
                      <X size={16} /> Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                      <Save size={16} /> {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Information Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Personal Information */}
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                  <Mail size={16} /> Email Address
                </label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="your.email@utm.ac.mu"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{user.email}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                  <Phone size={16} /> Phone Number
                </label>
                {isEditing ? (
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+230 5555 1234"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{user.phone || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                  <Briefcase size={16} /> Department
                </label>
                {isEditing ? (
                  <Input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Your department"
                  />
                ) : (
                  <p className="text-gray-900 font-medium">{user.department || 'Not specified'}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500 flex items-center gap-2 mb-2">
                  <Calendar size={16} /> Joined
                </label>
                <p className="text-gray-900 font-medium">
                  {(user.joined || user.createdAt) ? new Date(user.joined || user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Unknown'}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500 mb-2 block">
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue outline-none transition-all"
                  />
                ) : (
                  <p className="text-gray-900">{user.bio || 'No bio provided yet.'}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Account Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 text-sm">User ID</span>
                <span className="font-mono text-sm font-semibold text-gray-900">{user.id}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 text-sm">Role</span>
                <span className="font-semibold text-gray-900 capitalize">{user.role}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 text-sm">Status</span>
                <span className={`font-semibold ${
                  user.status === 'banned' ? 'text-red-600' :
                  user.status === 'pending' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {(user.status || 'active').charAt(0).toUpperCase() + (user.status || 'active').slice(1)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-utm-blue to-blue-700 text-white">
            <h3 className="text-lg font-bold mb-2">Need Help?</h3>
            <p className="text-blue-100 text-sm mb-4">
              Contact the admin team if you need assistance with your account.
            </p>
            <Button variant="white" className="w-full" onClick={() => setActiveTab('feedback')}>
              <Mail size={16} /> Contact Support
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserProfileView;
