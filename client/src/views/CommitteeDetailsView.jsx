import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, FileText, Users, CheckCircle, XCircle, Clock, MessageCircle, Upload, Download, Trash2, Plus, Video, MapPin, ExternalLink } from 'lucide-react';
import { Card, Button, Input, Modal, LoadingSpinner, EmptyState, Badge } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { committeesAPI, googleAPI } from '../services/api';
import CommitteeFeedView from './CommitteeFeedView';
import JoinRequestsManager from '../components/JoinRequestsManager';
import GoogleConnectButton from '../components/GoogleConnectButton';

const CommitteeDetailsView = ({ committeeId, onBack }) => {
  const { user } = useAuth();
  const [committee, setCommittee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCommitteeDetails();
  }, [committeeId]);

  const fetchCommitteeDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await committeesAPI.getOne(committeeId);
      setCommittee(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load committee details');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLeave = async () => {
    try {
      if (committee.isMember) {
        await committeesAPI.leave(committeeId);
        alert('Successfully left the committee');
        fetchCommitteeDetails();
      } else {
        await committeesAPI.requestJoin(committeeId);
        alert('Join request submitted successfully! The committee creator will review your request.');
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update membership');
    }
  };

  const handleApprove = async () => {
    try {
      await committeesAPI.approve(committeeId);
      setCommittee({ ...committee, status: 'active' });
      alert('Committee approved successfully');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to approve committee');
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this committee?')) return;

    try {
      await committeesAPI.reject(committeeId);
      alert('Committee rejected');
      onBack();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reject committee');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-2">{error}</p>
        <div className="flex gap-2 justify-center mt-4">
          <Button variant="outline" onClick={fetchCommitteeDetails}>Retry</Button>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!committee) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Committee not found</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  if (activeTab === 'feed') {
    return <CommitteeFeedView committee={committee} onBack={() => setActiveTab('overview')} />;
  }

  const getStatusBadge = () => {
    const statusConfig = {
      active: { color: 'success', icon: CheckCircle, text: 'Active' },
      pending: { color: 'warning', icon: Clock, text: 'Pending Approval' },
      rejected: { color: 'danger', icon: XCircle, text: 'Rejected' }
    };
    const config = statusConfig[committee.status] || statusConfig.pending;
    return (
      <Badge variant={config.color} className="flex items-center gap-1">
        <config.icon size={14} /> {config.text}
      </Badge>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors mt-1"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{committee.name}</h1>
              {getStatusBadge()}
            </div>
            <p className="text-gray-600">{committee.description}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Users size={16} /> {committee.membersCount || committee.memberCount || 0} members
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={16} /> {committee.meetings?.length || 0} meetings
              </span>
              <span className="flex items-center gap-1">
                <FileText size={16} /> {committee.documents?.length || 0} documents
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {user?.role === 'admin' && committee.status === 'pending' && (
            <>
              <Button variant="success" onClick={handleApprove}>
                <CheckCircle size={16} /> Approve
              </Button>
              <Button variant="danger" onClick={handleReject}>
                <XCircle size={16} /> Reject
              </Button>
            </>
          )}
          {committee.status === 'active' && (
            <Button
              variant={committee.isMember ? 'outline' : 'primary'}
              onClick={handleJoinLeave}
            >
              {committee.isMember ? 'Leave Committee' : 'Request to Join'}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {['overview', 'meetings', 'documents', 'feed'].map((tab) => {
            // Hide member-only tabs if not a member
            const isMemberOnlyTab = ['meetings', 'documents', 'feed'].includes(tab);
            const canViewTab = !isMemberOnlyTab || committee.isMember || user?.role === 'admin';

            if (!canViewTab) return null;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 border-b-2 transition-colors capitalize ${
                  activeTab === tab
                    ? 'border-utm-blue text-utm-blue font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h3 className="text-lg font-bold text-gray-800 mb-4">About</h3>
              <p className="text-gray-700 leading-relaxed">{committee.description}</p>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Category</p>
                  <p className="font-semibold text-gray-900 capitalize">{committee.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Created</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(committee.createdAt || Date.now()).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>

            {/* Join Requests Manager - Visible to committee creator and admins */}
            {(committee.creatorId === user?.id || user?.role === 'admin') && (
              <JoinRequestsManager
                committeeId={committeeId}
                isCreator={true}
              />
            )}

            <Card>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Activity</h3>
              <EmptyState
                icon={MessageCircle}
                title="No recent activity"
                description="Check the feed tab for discussions"
              />
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
              {!committee.isMember && user?.role !== 'admin' && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    🔒 Join this committee to access discussions, meetings, and documents
                  </p>
                </div>
              )}
              <div className="space-y-2">
                {(committee.isMember || user?.role === 'admin') ? (
                  <>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('feed')}>
                      <MessageCircle size={16} /> View Discussion Board
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('meetings')}>
                      <Calendar size={16} /> View Meetings
                    </Button>
                    <Button variant="outline" className="w-full justify-start" onClick={() => setActiveTab('documents')}>
                      <FileText size={16} /> View Documents
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="w-full justify-start opacity-50 cursor-not-allowed" disabled>
                      <MessageCircle size={16} /> View Discussion Board (Members Only)
                    </Button>
                    <Button variant="outline" className="w-full justify-start opacity-50 cursor-not-allowed" disabled>
                      <Calendar size={16} /> View Meetings (Members Only)
                    </Button>
                    <Button variant="outline" className="w-full justify-start opacity-50 cursor-not-allowed" disabled>
                      <FileText size={16} /> View Documents (Members Only)
                    </Button>
                  </>
                )}
                <Button variant="outline" className="w-full justify-start" onClick={() => setShowMembersModal(true)}>
                  <Users size={16} /> View Members
                </Button>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-utm-blue to-blue-700 text-white">
              <h3 className="font-bold mb-2">Committee Leader</h3>
              <p className="text-blue-100 text-sm mb-1">{committee.leader || 'Admin Team'}</p>
              <p className="text-blue-200 text-xs">Contact for more information</p>
            </Card>
          </div>
        </div>
      )}

      {activeTab === 'meetings' && (
        <MeetingsTab
          committee={committee}
          onSchedule={() => setShowMeetingModal(true)}
          onRefresh={fetchCommitteeDetails}
        />
      )}

      {activeTab === 'documents' && (
        <DocumentsTab
          committee={committee}
          onUpload={() => setShowDocumentModal(true)}
          onRefresh={fetchCommitteeDetails}
        />
      )}

      {/* Modals */}
      {showMeetingModal && (
        <ScheduleMeetingModal
          committeeId={committeeId}
          onClose={() => setShowMeetingModal(false)}
          onSuccess={() => {
            setShowMeetingModal(false);
            fetchCommitteeDetails();
          }}
        />
      )}

      {showDocumentModal && (
        <UploadDocumentModal
          committeeId={committeeId}
          onClose={() => setShowDocumentModal(false)}
          onSuccess={() => {
            setShowDocumentModal(false);
            fetchCommitteeDetails();
          }}
        />
      )}

      {showMembersModal && (
        <MembersListModal
          committee={committee}
          onClose={() => setShowMembersModal(false)}
        />
      )}
    </div>
  );
};

// Meetings Tab Component
const MeetingsTab = ({ committee, onSchedule, onRefresh }) => {
  const { user } = useAuth();
  const meetings = committee.meetings || [];

  const handleDelete = async (meetingId) => {
    if (!window.confirm('Are you sure you want to delete this meeting?')) return;

    try {
      await committeesAPI.deleteMeeting(committee.id, meetingId);
      alert('Meeting deleted successfully');
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete meeting');
    }
  };

  const getMeetingTypeBadge = (type) => {
    const config = {
      'in-person': { color: 'primary', icon: MapPin, text: 'In-Person' },
      'online': { color: 'success', icon: Video, text: 'Online' },
      'hybrid': { color: 'warning', icon: Users, text: 'Hybrid' }
    };
    const { color, icon: Icon, text } = config[type] || config['in-person'];
    return (
      <Badge variant={color} className="flex items-center gap-1 text-xs">
        <Icon size={12} /> {text}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Scheduled Meetings</h3>
        {(user?.role === 'admin' || committee.isMember) && (
          <Button onClick={onSchedule}>
            <Plus size={16} /> Schedule Meeting
          </Button>
        )}
      </div>

      {meetings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No meetings scheduled"
          description="Schedule your first committee meeting"
        />
      ) : (
        <div className="grid gap-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="hover-lift">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-utm-blue/10 rounded-lg flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-utm-blue">
                      {new Date(meeting.date).getDate()}
                    </span>
                    <span className="text-xs text-utm-blue uppercase">
                      {new Date(meeting.date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-gray-900">{meeting.title}</h4>
                      {getMeetingTypeBadge(meeting.meetingType)}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{meeting.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(meeting.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {meeting.time}
                        {meeting.endTime && ` - ${meeting.endTime}`}
                      </span>
                      {meeting.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={14} /> {meeting.location}
                        </span>
                      )}
                    </div>
                    {meeting.meetingLink && (
                      <div className="mt-3">
                        <a
                          href={meeting.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          <Video size={16} />
                          Join Google Meet
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => handleDelete(meeting.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Documents Tab Component
const DocumentsTab = ({ committee, onUpload, onRefresh }) => {
  const { user } = useAuth();
  const documents = committee.documents || [];

  const handleDelete = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;

    try {
      await committeesAPI.deleteDocument(committee.id, documentId);
      alert('Document deleted successfully');
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete document');
    }
  };

  const handleDownload = (doc) => {
    if (doc.url) {
      window.open(doc.url, '_blank', 'noopener,noreferrer');
    } else {
      alert(`No download URL available for: ${doc.name}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Documents & Resources</h3>
        {(user?.role === 'admin' || committee.isMember) && (
          <Button onClick={onUpload}>
            <Upload size={16} /> Upload Document
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Upload documents to share with committee members"
        />
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="hover-lift">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                    <p className="text-sm text-gray-500">
                      Uploaded {new Date(doc.uploadedAt).toLocaleDateString()} • {doc.size || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-2 text-utm-blue hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Download size={16} />
                  </button>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Schedule Meeting Modal
const ScheduleMeetingModal = ({ committeeId, onClose, onSuccess }) => {
  const initialFormData = {
    title: '',
    description: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    meetingType: 'in-person'
  };
  const [formData, setFormData] = useState(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [checkingGoogle, setCheckingGoogle] = useState(true);

  useEffect(() => {
    checkGoogleConnection();
  }, []);

  const checkGoogleConnection = async () => {
    try {
      const response = await googleAPI.getStatus();
      setGoogleConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking Google connection:', error);
      setGoogleConnected(false);
    } finally {
      setCheckingGoogle(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.time) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate Google connection for online meetings
    if ((formData.meetingType === 'online' || formData.meetingType === 'hybrid') && !googleConnected) {
      alert('Please connect your Google account first to create online meetings');
      return;
    }

    setSubmitting(true);
    try {
      await committeesAPI.scheduleMeeting(committeeId, formData);
      const meetingTypeText = formData.meetingType === 'online' || formData.meetingType === 'hybrid'
        ? 'Meeting scheduled with Google Meet link!'
        : 'Meeting scheduled successfully';
      alert(meetingTypeText);
      setFormData(initialFormData);
      onSuccess();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to schedule meeting');
    } finally {
      setSubmitting(false);
    }
  };

  const needsGoogleConnection = (formData.meetingType === 'online' || formData.meetingType === 'hybrid') && !googleConnected;

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  return (
    <Modal isOpen={true} title="Schedule Meeting" onClose={handleClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Title *
          </label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Monthly Planning Meeting"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'in-person', label: 'In-Person', icon: MapPin },
              { value: 'online', label: 'Online', icon: Video },
              { value: 'hybrid', label: 'Hybrid', icon: Users }
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, meetingType: value })}
                className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                  formData.meetingType === value
                    ? 'border-utm-blue bg-utm-blue/5 text-utm-blue'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
          {(formData.meetingType === 'online' || formData.meetingType === 'hybrid') && (
            <p className="text-xs text-gray-500 mt-2">
              A Google Meet link will be automatically generated
            </p>
          )}
        </div>

        {/* Google Connection Status */}
        {(formData.meetingType === 'online' || formData.meetingType === 'hybrid') && (
          <div>
            {checkingGoogle ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm p-3 bg-gray-50 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                Checking Google connection...
              </div>
            ) : (
              <GoogleConnectButton onStatusChange={setGoogleConnected} />
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Meeting agenda and details..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date *
            </label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Time *
            </label>
            <Input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Time
            </label>
            <Input
              type="time"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location {formData.meetingType !== 'online' && '(Physical)'}
            </label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={formData.meetingType === 'online' ? 'Optional notes' : 'e.g., Conference Room A'}
              disabled={formData.meetingType === 'online'}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting || needsGoogleConnection}
            className="flex-1"
          >
            {submitting ? 'Scheduling...' : (
              <>
                {(formData.meetingType === 'online' || formData.meetingType === 'hybrid') && (
                  <Video size={16} className="mr-1" />
                )}
                Schedule Meeting
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Upload Document Modal
const UploadDocumentModal = ({ committeeId, onClose, onSuccess }) => {
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleClose = () => {
    setFileName('');
    setFile(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }

    setSubmitting(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const documentData = {
            name: fileName,
            size: `${(file.size / 1024).toFixed(2)} KB`,
            type: file.type,
            fileData: reader.result
          };

          await committeesAPI.uploadDocument(committeeId, documentData);
          alert('Document uploaded successfully');
          setFileName('');
          setFile(null);
          onSuccess();
        } catch (error) {
          alert(error.response?.data?.error || 'Failed to upload document');
        } finally {
          setSubmitting(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to upload document');
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={true} title="Upload Document" onClose={handleClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Name
          </label>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Enter document name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select File
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Upload size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-2">
              {file ? file.name : 'Click to upload or drag and drop'}
            </p>
            <input
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <span className="text-utm-blue hover:underline">Browse files</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="ghost" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Members List Modal
const MembersListModal = ({ committee, onClose }) => {
  const members = committee.members || [];

  return (
    <Modal isOpen={true} title={`Committee Members (${members.length})`} onClose={onClose}>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Be the first to join this committee"
          />
        ) : (
          members.map((member, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-utm-blue to-utm-cyan flex items-center justify-center text-white font-bold">
                {(member.userName || member.name)?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{member.userName || member.name}</p>
                <p className="text-sm text-gray-500 capitalize">{member.userRole || member.role}</p>
              </div>
              {member.isLeader && (
                <Badge variant="primary">Leader</Badge>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

export default CommitteeDetailsView;
