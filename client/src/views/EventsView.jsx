import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { eventsAPI } from '../services/api';
import {
  Card,
  Button,
  Badge,
  Modal,
  Input,
  TextArea,
  Select,
  LoadingSpinner,
  EmptyState
} from '../components/UI.jsx';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  X
} from 'lucide-react';
import EventDetailsView from './EventDetailsView';

const EventsView = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);

  const fetchIdRef = useRef(0);

  const fetchEvents = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;
    try {
      setLoading(true);
      setError(null);
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await eventsAPI.getAll(params);
      // Ignore stale responses from previous filter selections
      if (fetchId !== fetchIdRef.current) return;
      const eventsData = response.data?.events;
      // Deduplicate events by ID to prevent duplicates from any source
      const uniqueEvents = Array.isArray(eventsData)
        ? eventsData.filter((event, index, self) =>
            index === self.findIndex((e) => e.id === event.id)
          )
        : [];
      setEvents(uniqueEvents);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      setError(err.response?.data?.error || 'Failed to load events');
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleRegister = async (eventId) => {
    try {
      await eventsAPI.register(eventId);
      fetchEvents();
      alert('Successfully registered for event!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to register for event');
    }
  };

  const handleUnregister = async (eventId) => {
    if (!confirm('Are you sure you want to unregister from this event?')) return;
    try {
      await eventsAPI.unregister(eventId);
      fetchEvents();
      alert('Successfully unregistered from event');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unregister from event');
    }
  };

  const handleUpdateStatus = async (eventId, status) => {
    try {
      await eventsAPI.updateStatus(eventId, status);
      fetchEvents();
      alert(`Event ${status} successfully`);
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${status} event`);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    try {
      await eventsAPI.delete(eventId);
      fetchEvents();
      alert('Event deleted successfully');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete event');
    }
  };

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  // If viewing a specific event, show details view
  if (viewingEvent) {
    return (
      <EventDetailsView
        eventId={viewingEvent}
        onBack={() => {
          setViewingEvent(null);
          fetchEvents();
        }}
        onEdit={(event) => {
          setSelectedEvent(event);
          setShowEditModal(true);
          setViewingEvent(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-600 mt-1">Discover and manage campus events</p>
        </div>
        {user?.role !== 'student' && (
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-5 w-5" />
            Create Event
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none"
            />
          </div>
          {user?.role !== 'student' && (
            <div className="flex gap-2">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none appearance-none"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <div className="flex items-center gap-3 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
            <Button variant="outline" onClick={fetchEvents} className="ml-auto">
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Events Grid */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events found"
          description={searchQuery ? "Try adjusting your search" : "No events available"}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              user={user}
              onRegister={handleRegister}
              onUnregister={handleUnregister}
              onEdit={(event) => {
                setSelectedEvent(event);
                setShowEditModal(true);
              }}
              onDelete={handleDeleteEvent}
              onApprove={(id) => handleUpdateStatus(id, 'approved')}
              onReject={(id) => handleUpdateStatus(id, 'rejected')}
              onViewDetails={() => setViewingEvent(event.id)}
            />
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          fetchEvents();
        }}
      />

      {/* Edit Event Modal */}
      {selectedEvent && (
        <EditEventModal
          isOpen={showEditModal}
          event={selectedEvent}
          onClose={() => {
            setShowEditModal(false);
            setSelectedEvent(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedEvent(null);
            fetchEvents();
          }}
        />
      )}
    </div>
  );
};

// Event Card Component
const EventCard = ({ event, user, onRegister, onUnregister, onEdit, onDelete, onApprove, onReject, onViewDetails }) => {
  const isRegistered = event.isRegistered;
  const canManage = user?.role === 'admin' || event.proposerId === user?.id;

  return (
    <Card className="flex flex-col hover-lift cursor-pointer" onClick={onViewDetails}>
      <div className="flex items-start justify-between mb-3">
        <Badge status={event.status} />
        {canManage && (
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onEdit(event)}
              className="text-gray-600 hover:text-[#005eb8]"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onDelete(event.id)}
              className="text-gray-600 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.title}</h3>
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{event.description}</p>

      <div className="space-y-2 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          {new Date(event.date).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          })}
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {event.time || 'TBA'}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          {event.location || 'TBA'}
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          {event.attendees || 0} / {event.capacity || '?'} registered
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
        {event.status === 'approved' && (
          <>
            {isRegistered ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => onUnregister(event.id)}
              >
                Unregister
              </Button>
            ) : (
              <Button className="w-full" onClick={() => onRegister(event.id)}>
                Register
              </Button>
            )}
          </>
        )}

        {user?.role === 'admin' && event.status === 'pending' && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => onApprove(event.id)}
            >
              <CheckCircle className="h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => onReject(event.id)}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

// Create Event Modal
const CreateEventModal = ({ isOpen, onClose, onSuccess }) => {
  const emptyForm = {
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    capacity: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setFormData(emptyForm);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await eventsAPI.create({
        ...formData,
        capacity: parseInt(formData.capacity) || 100
      });
      setFormData(emptyForm);
      alert('Event created successfully!');
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Event">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Event Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <TextArea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            min={new Date().toISOString().split('T')[0]}
          />
          <Input
            label="Time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </div>
        <Input
          label="Location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          required
        />
        <Input
          label="Capacity"
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
          required
          min="1"
        />
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Event'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// Edit Event Modal
const EditEventModal = ({ isOpen, event, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description,
    date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
    time: event.time || '',
    location: event.location || '',
    capacity: event.capacity || '',
  });
  const [imagePreview, setImagePreview] = useState(event.image || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
      time: event.time || '',
      location: event.location || '',
      capacity: event.capacity || '',
    });
    setImagePreview(event.image || null);
  }, [event.id]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const updateData = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        time: formData.time,
        location: formData.location,
        capacity: parseInt(formData.capacity) || 100,
      };
      if (imagePreview !== event.image) {
        updateData.image = imagePreview || '';
      }
      await eventsAPI.update(event.id, updateData);
      alert('Event updated successfully!');
      onSuccess();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Event">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Event Title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
        <TextArea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
          required
        />

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Image
          </label>
          {imagePreview ? (
            <div className="relative inline-block">
              <img src={imagePreview} alt="Event preview" className="max-h-48 rounded-lg border border-gray-200" />
              <button
                type="button"
                onClick={() => {
                  setImagePreview(null);
                }}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 mb-2">Click to upload event image</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                id="event-image-upload"
              />
              <label htmlFor="event-image-upload" className="cursor-pointer">
                <span className="text-utm-blue hover:underline">Browse files</span>
              </label>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            min={new Date().toISOString().split('T')[0]}
          />
          <Input
            label="Time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </div>
        <Input
          label="Location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          required
        />
        <Input
          label="Capacity"
          type="number"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
          required
        />
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Updating...' : 'Update Event'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default EventsView;
