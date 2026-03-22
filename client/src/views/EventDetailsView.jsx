import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Share2, Edit, Trash2, CheckCircle, XCircle, ExternalLink, Mail, Building, UserCheck, QrCode, ScanLine } from 'lucide-react';
import { Card, Button, Badge, LoadingSpinner } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { eventsAPI } from '../services/api';
import QRTicket from '../components/QRTicket';
import QRScanner from '../components/QRScanner';

const EventDetailsView = ({ eventId, onBack, onEdit }) => {
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registering, setRegistering] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchEventDetails = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await eventsAPI.getOne(eventId);
      if (fetchId !== fetchIdRef.current) return;
      setEvent(response.data);

      // Fetch registrations if user is creator or admin
      const eventData = response.data;
      const isCreator = eventData.proposerId === user?.id;
      const isAdmin = user?.role === 'admin';

      if (isCreator || isAdmin) {
        fetchRegistrations();
      }
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err.response?.data?.error || 'Failed to load event details');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [eventId, user?.id, user?.role]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  const fetchRegistrations = async () => {
    setLoadingRegistrations(true);
    try {
      const response = await eventsAPI.getRegistrations(eventId);
      setRegistrations(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setRegistrations([]);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      await eventsAPI.register(eventId);
      fetchEventDetails();
      alert('Successfully registered for event!');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to register for event');
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!window.confirm('Are you sure you want to unregister from this event?')) return;

    setRegistering(true);
    try {
      await eventsAPI.unregister(eventId);
      fetchEventDetails();
      alert('Successfully unregistered from event');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to unregister from event');
    } finally {
      setRegistering(false);
    }
  };

  const handleApprove = async () => {
    try {
      await eventsAPI.updateStatus(eventId, 'approved');
      fetchEventDetails();
      alert('Event approved successfully');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to approve event');
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this event?')) return;

    try {
      await eventsAPI.updateStatus(eventId, 'rejected');
      alert('Event rejected');
      onBack();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to reject event');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      await eventsAPI.delete(eventId);
      alert('Event deleted successfully');
      onBack();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete event');
    }
  };

  const handleShare = () => {
    const shareText = `${event.title}\nDate: ${new Date(event.date).toLocaleDateString()}\nTime: ${event.time || 'TBA'}\nLocation: ${event.location || 'TBA'}`;
    if (navigator.share) {
      navigator.share({
        title: event.title,
        text: shareText,
      }).catch(() => {
        navigator.clipboard.writeText(shareText);
        alert('Event details copied to clipboard!');
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Event details copied to clipboard!');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{error || 'Event not found'}</p>
        <div className="flex justify-center gap-3 mt-4">
          <Button variant="outline" onClick={fetchEventDetails}>Retry</Button>
          <Button onClick={onBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  const isRegistered = event.isRegistered;
  const canManage = user?.role === 'admin' || event.proposerId === user?.id;
  const spotsLeft = Math.max(0, (event.capacity || 0) - (event.attendees || 0));
  const registrationPercentage = event.capacity ? ((event.attendees || 0) / event.capacity) * 100 : 0;

  const getStatusBadge = () => {
    const statusConfig = {
      approved: { color: 'success', icon: CheckCircle, text: 'Approved' },
      pending: { color: 'warning', icon: Clock, text: 'Pending Approval' },
      rejected: { color: 'danger', icon: XCircle, text: 'Rejected' }
    };
    const config = statusConfig[event.status] || statusConfig.pending;
    return (
      <Badge variant={config.color} className="flex items-center gap-1">
        <config.icon size={14} /> {config.text}
      </Badge>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-gray-600">
            {[event.type, event.category].filter(Boolean).join(' • ') || 'Event'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Image */}
          {event.image && (
            <Card className="p-0 overflow-hidden">
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-64 object-cover"
              />
            </Card>
          )}

          {/* Event Details */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4">About This Event</h3>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>

            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {event.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-utm-blue/10 text-utm-blue rounded-full text-sm font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Event Info Grid */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Event Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-utm-blue/10 rounded-lg">
                  <Calendar size={20} className="text-utm-blue" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-utm-cyan/10 rounded-lg">
                  <Clock size={20} className="text-utm-cyan" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Time</p>
                  <p className="font-semibold text-gray-900">{event.time || 'TBA'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Location</p>
                  <p className="font-semibold text-gray-900">{event.location || 'TBA'}</p>
                  {event.location && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location + ', Mauritius')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-utm-blue hover:underline flex items-center gap-1 mt-1"
                    >
                      View on Map <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users size={20} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Capacity</p>
                  <p className="font-semibold text-gray-900">
                    {event.attendees || 0} / {event.capacity} registered
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{spotsLeft} spots left</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Organizer Info */}
          <Card>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Organized By</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-utm-blue to-utm-cyan rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {event.proposer?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{event.proposer}</p>
                <p className="text-sm text-gray-500 capitalize">{event.proposerRole}</p>
              </div>
            </div>
          </Card>

          {/* Registered Attendees - Only visible to event creator and admin */}
          {canManage && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <UserCheck size={20} className="text-utm-blue" />
                  Registered Attendees ({registrations.length})
                </h3>
                <Button
                  variant="outline"
                  onClick={fetchRegistrations}
                  disabled={loadingRegistrations}
                  className="text-sm"
                >
                  {loadingRegistrations ? 'Loading...' : 'Refresh'}
                </Button>
              </div>

              {loadingRegistrations ? (
                <div className="text-center py-8">
                  <LoadingSpinner />
                </div>
              ) : registrations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No registrations yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {registrations.map((registration) => (
                    <div
                      key={registration.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {registration.user?.avatar ? (
                        <img
                          src={registration.user.avatar}
                          alt={registration.user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-utm-blue to-utm-cyan rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">
                            {registration.user?.name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {registration.user?.name || 'Unknown User'}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            <span className="truncate">{registration.user?.email}</span>
                          </span>
                          {registration.user?.department && (
                            <span className="flex items-center gap-1">
                              <Building size={12} />
                              <span className="truncate">{registration.user.department}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Badge variant={registration.user?.role === 'student' ? 'info' : registration.user?.role === 'stakeholder' ? 'warning' : 'success'}>
                            {registration.user?.role}
                          </Badge>
                          <Badge variant={registration.checkedIn ? 'success' : 'warning'}>
                            {registration.checkedIn ? 'Checked In' : 'Not Checked In'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {registration.registeredAt
                            ? new Date(registration.registeredAt).toLocaleDateString()
                            : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Registration Card */}
          <Card>
            <h3 className="font-bold text-gray-800 mb-3">Registration</h3>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{event.attendees || 0} registered</span>
                <span>{spotsLeft} spots left</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    registrationPercentage >= 90 ? 'bg-red-600' :
                    registrationPercentage >= 70 ? 'bg-yellow-600' :
                    'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(registrationPercentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Registration Button */}
            {event.status === 'approved' && (
              <div>
                {isRegistered ? (
                  <Button
                    variant="outline"
                    onClick={handleUnregister}
                    disabled={registering}
                    className="w-full"
                  >
                    {registering ? 'Processing...' : 'Unregister'}
                  </Button>
                ) : spotsLeft > 0 ? (
                  <Button
                    onClick={handleRegister}
                    disabled={registering}
                    className="w-full"
                  >
                    {registering ? 'Processing...' : 'Register for Event'}
                  </Button>
                ) : (
                  <Button disabled className="w-full">
                    Event Full
                  </Button>
                )}
              </div>
            )}

            {event.status === 'pending' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  This event is pending approval and not yet open for registration.
                </p>
              </div>
            )}

            {event.status === 'rejected' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  This event has been rejected.
                </p>
              </div>
            )}
          </Card>

          {/* Actions */}
          <Card>
            <h3 className="font-bold text-gray-800 mb-3">Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleShare}
                className="w-full justify-start"
              >
                <Share2 size={16} /> Share Event
              </Button>

              {isRegistered && event.status === 'approved' && (
                <Button
                  variant="outline"
                  onClick={() => setShowTicket(true)}
                  className="w-full justify-start"
                >
                  <QrCode size={16} /> View My Ticket
                </Button>
              )}

              {canManage && event.status === 'approved' && (
                <Button
                  variant="outline"
                  onClick={() => setShowScanner(true)}
                  className="w-full justify-start text-[#005eb8]"
                >
                  <ScanLine size={16} /> Scan QR Check-In
                </Button>
              )}

              {canManage && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => onEdit(event)}
                    className="w-full justify-start"
                  >
                    <Edit size={16} /> Edit Event
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDelete}
                    className="w-full justify-start text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} /> Delete Event
                  </Button>
                </>
              )}

              {user?.role === 'admin' && event.status === 'pending' && (
                <>
                  <Button
                    variant="success"
                    onClick={handleApprove}
                    className="w-full justify-start"
                  >
                    <CheckCircle size={16} /> Approve Event
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleReject}
                    className="w-full justify-start"
                  >
                    <XCircle size={16} /> Reject Event
                  </Button>
                </>
              )}
            </div>
          </Card>

          {/* Event Stats */}
          <Card className="bg-gradient-to-br from-utm-blue to-blue-700 text-white">
            <h3 className="font-bold mb-3">Event Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-100 text-sm">Capacity</span>
                <span className="font-bold">{event.capacity}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100 text-sm">Registered</span>
                <span className="font-bold">{event.attendees || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100 text-sm">Availability</span>
                <span className="font-bold">
                  {spotsLeft > 0 ? `${spotsLeft} spots` : 'Full'}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {showTicket && (
        <QRTicket eventId={eventId} onClose={() => setShowTicket(false)} />
      )}
      {showScanner && (
        <QRScanner
          eventId={eventId}
          onClose={() => setShowScanner(false)}
          onCheckIn={() => fetchRegistrations()}
        />
      )}
    </div>
  );
};

export default EventDetailsView;
