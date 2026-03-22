import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { committeesAPI, broadcastAPI } from '../services/api';
import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
  TextArea,
  LoadingSpinner,
  EmptyState
} from '../components/UI.jsx';
import {
  Users,
  Search,
  Plus,
  UserPlus,
  UserMinus,
  Shield,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Mail,
  Radio,
  Edit,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import CommitteeDetailsView from './CommitteeDetailsView';
import BroadcastModal from '../components/BroadcastModal';
import BroadcastNotifications from '../components/BroadcastNotifications';

const CommitteesView = () => {
  const { user } = useAuth();
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBroadcastSection, setShowBroadcastSection] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcasts, setBroadcasts] = useState([]);
  const [editingBroadcast, setEditingBroadcast] = useState(null);
  const [editingCommittee, setEditingCommittee] = useState(null);
  const [viewingCommittee, setViewingCommittee] = useState(null);

  useEffect(() => {
    fetchCommittees();
  }, []);

  const fetchCommittees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await committeesAPI.getAll();
      const data = Array.isArray(response.data) ? response.data : [];
      const uniqueCommittees = data.filter((c, index, self) =>
        index === self.findIndex((item) => item.id === c.id)
      );
      setCommittees(uniqueCommittees);
    } catch (err) {
      console.error('Error fetching committees:', err);
      setError(err.response?.data?.error || 'Failed to load committees');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestJoin = async (committeeId) => {
    try {
      await committeesAPI.requestJoin(committeeId);
      fetchCommittees();
      alert('Join request submitted successfully! The committee creator will review your request.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit join request');
    }
  };

  const handleLeave = async (committeeId) => {
    if (!confirm('Are you sure you want to leave this committee?')) return;
    try {
      await committeesAPI.leave(committeeId);
      fetchCommittees();
      alert('Successfully left committee');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to leave committee');
    }
  };

  const fetchBroadcasts = async () => {
    try {
      const response = await broadcastAPI.getAll();
      setBroadcasts(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Error fetching broadcasts:', err);
    }
  };

  const handleDeleteBroadcast = async (id) => {
    if (!confirm('Are you sure you want to delete this broadcast message?')) return;
    try {
      await broadcastAPI.delete(id);
      fetchBroadcasts();
      alert('Broadcast deleted successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete broadcast');
    }
  };

  const handleToggleBroadcastSection = () => {
    if (!showBroadcastSection) {
      fetchBroadcasts();
    }
    setShowBroadcastSection(!showBroadcastSection);
  };

  const handleDeleteCommittee = async (committeeId) => {
    if (!confirm('Are you sure you want to delete this committee? This will remove all members, posts, and meetings.')) return;
    try {
      await committeesAPI.delete(committeeId);
      fetchCommittees();
      alert('Committee deleted successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete committee');
    }
  };

  const handleUpdateStatus = async (committeeId, status) => {
    try {
      await committeesAPI.updateStatus(committeeId, status);
      fetchCommittees();
      const action = status === 'active' ? 'approved' : status;
      alert(`Committee ${action} successfully`);
    } catch (err) {
      const action = status === 'active' ? 'approve' : status;
      alert(err.response?.data?.error || `Failed to ${action} committee`);
    }
  };

  const filteredCommittees = committees.filter((committee) =>
    committee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    committee.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  // If viewing a specific committee, show details view
  if (viewingCommittee) {
    return (
      <CommitteeDetailsView
        committeeId={viewingCommittee}
        onBack={() => {
          setViewingCommittee(null);
          fetchCommittees();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Committees</h1>
          <p className="text-gray-600 mt-1">Join committees and engage with the community</p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'admin' && (
            <Button variant="secondary" onClick={handleToggleBroadcastSection}>
              <Radio className="h-5 w-5" />
              Broadcast
              {showBroadcastSection ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
          {user?.role !== 'student' && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-5 w-5" />
              Create Committee
            </Button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search committees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none"
          />
        </div>
      </Card>

      {/* Broadcast Management Section (Admin) */}
      {user?.role === 'admin' && showBroadcastSection && (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Broadcast Messages</h2>
              <Button onClick={() => setShowBroadcastModal(true)} className="text-sm">
                <Plus className="h-4 w-4" />
                New Broadcast
              </Button>
            </div>
            {broadcasts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No broadcast messages yet</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {broadcasts.map((broadcast) => (
                  <div key={broadcast.id} className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{broadcast.title}</h4>
                        {broadcast.priority === 'urgent' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                            <AlertTriangle className="h-3 w-3" />
                            Urgent
                          </span>
                        )}
                        {broadcast.priority === 'important' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                            <AlertCircle className="h-3 w-3" />
                            Important
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1">{broadcast.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" />
                          {broadcast.targetType === 'all' ? 'All' : broadcast.targetType === 'leaders' ? 'Leaders' : `${broadcast.targetCommittees?.length || 0} committees`}
                        </span>
                        <span>{new Date(broadcast.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setEditingBroadcast(broadcast)}
                        className="p-1.5 text-gray-500 hover:text-[#005eb8] hover:bg-white rounded transition-colors"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBroadcast(broadcast.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Broadcast Notifications for Committee Members */}
      <BroadcastNotifications />

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
            <Button variant="outline" onClick={fetchCommittees} className="ml-auto">
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Committees Grid */}
      {filteredCommittees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No committees found"
          description={searchQuery ? "Try adjusting your search" : "No committees available"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCommittees.map((committee) => (
            <CommitteeCard
              key={committee.id}
              committee={committee}
              user={user}
              onRequestJoin={handleRequestJoin}
              onLeave={handleLeave}
              onViewDetails={() => setViewingCommittee(committee.id)}
              onApprove={(id) => handleUpdateStatus(id, 'active')}
              onReject={(id) => handleUpdateStatus(id, 'rejected')}
              onEdit={(committee) => {
                setEditingCommittee(committee);
                setShowEditModal(true);
              }}
              onDelete={handleDeleteCommittee}
            />
          ))}
        </div>
      )}

      {/* Create Committee Modal */}
      <CreateCommitteeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchCommittees();
        }}
      />

      {/* Edit Committee Modal */}
      {editingCommittee && (
        <EditCommitteeModal
          isOpen={showEditModal}
          committee={editingCommittee}
          onClose={() => {
            setShowEditModal(false);
            setEditingCommittee(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingCommittee(null);
            fetchCommittees();
          }}
        />
      )}

      {/* Create Broadcast Modal */}
      <BroadcastModal
        isOpen={showBroadcastModal}
        onClose={() => setShowBroadcastModal(false)}
        onSuccess={() => {
          setShowBroadcastModal(false);
          fetchBroadcasts();
        }}
      />

      {/* Edit Broadcast Modal */}
      {editingBroadcast && (
        <BroadcastModal
          isOpen={true}
          broadcast={editingBroadcast}
          onClose={() => setEditingBroadcast(null)}
          onSuccess={() => {
            setEditingBroadcast(null);
            fetchBroadcasts();
          }}
        />
      )}
    </div>
  );
};

// Committee Card Component
const CommitteeCard = ({ committee, user, onRequestJoin, onLeave, onViewDetails, onApprove, onReject, onEdit, onDelete }) => {
  const isMember = committee.isMember;
  const isAdmin = user?.role === 'admin';
  const isCreator = committee.creatorId === user?.id;
  const canManage = isAdmin || isCreator;

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <Badge status={committee.status} />
        <div className="flex gap-2">
          {isAdmin && committee.status === 'pending' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(committee.id);
                }}
                className="text-green-600 hover:text-green-700"
                title="Approve"
              >
                <CheckCircle className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(committee.id);
                }}
                className="text-red-600 hover:text-red-700"
                title="Reject"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </>
          )}
          {canManage && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(committee);
                }}
                className="text-gray-600 hover:text-[#005eb8]"
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(committee.id);
                }}
                className="text-gray-600 hover:text-red-600"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-[#005eb8] to-[#00b5e2] rounded-full flex items-center justify-center text-white font-bold text-lg">
          {committee.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{committee.name}</h3>
          {committee.president?.name && (
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {committee.president.name}
            </p>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">
        {committee.description || 'No description available'}
      </p>

      <div className="space-y-3 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Users className="h-4 w-4" />
            <span>{committee.memberCount || 0} members</span>
          </div>
          {committee.email && (
            <a
              href={`mailto:${committee.email}`}
              className="flex items-center gap-1 text-[#005eb8] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-4 w-4" />
            </a>
          )}
        </div>

        <div className="flex gap-2">
          {committee.status === 'active' && (
            <>
              {isMember ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onLeave(committee.id)}
                >
                  <UserMinus className="h-4 w-4" />
                  Leave
                </Button>
              ) : (
                <Button
                  className="flex-1"
                  onClick={() => onRequestJoin(committee.id)}
                >
                  <UserPlus className="h-4 w-4" />
                  Request to Join
                </Button>
              )}
            </>
          )}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onViewDetails(committee)}
          >
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
};

// Create Committee Modal
const CreateCommitteeModal = ({ isOpen, onClose, onSuccess }) => {
  const initialFormData = { name: '', description: '', email: '' };
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [inviteEmails, setInviteEmails] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (inviteEmails.includes(trimmed)) {
      setEmailError('This email has already been added');
      return;
    }
    setInviteEmails([...inviteEmails, trimmed]);
    setEmailInput('');
    setEmailError('');
  };

  const removeEmail = (emailToRemove) => {
    setInviteEmails(inviteEmails.filter(e => e !== emailToRemove));
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEmail();
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setInviteEmails([]);
    setEmailInput('');
    setEmailError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await committeesAPI.create({ ...formData, inviteEmails });
      alert('Committee created successfully!');
      setFormData(initialFormData);
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create committee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Committee">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Committee Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Computer Science Society"
          required
        />
        <TextArea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the committee's purpose and activities..."
          rows={4}
          required
        />
        <Input
          label="Contact Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="committee@utm.my"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Invite Members by Email
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
              onKeyDown={handleEmailKeyDown}
              placeholder="Enter email and press Enter or Add"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#005eb8] focus:border-transparent"
            />
            <button
              type="button"
              onClick={addEmail}
              className="px-4 py-2 bg-[#005eb8] text-white rounded-lg text-sm font-medium hover:bg-[#004a93] transition-colors"
            >
              Add
            </button>
          </div>
          {emailError && (
            <p className="mt-1 text-sm text-red-500">{emailError}</p>
          )}
          {inviteEmails.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {inviteEmails.map((email) => (
                <span
                  key={email}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-[#005eb8] rounded-full text-sm border border-blue-200"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="ml-1 text-blue-400 hover:text-red-500 font-bold"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-1 text-xs text-gray-500">
            Added users will receive an email invitation to join the committee
          </p>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Committee'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit Committee Modal
const EditCommitteeModal = ({ isOpen, committee, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: committee.name || '',
    description: committee.description || '',
    email: committee.email || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await committeesAPI.update(committee.id, formData);
      alert('Committee updated successfully!');
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update committee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Committee">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Committee Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <TextArea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          required
        />
        <Input
          label="Contact Email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="committee@utm.my"
        />
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Updating...' : 'Update Committee'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CommitteesView;
