import { useState, useEffect } from 'react';
import { broadcastAPI, committeesAPI } from '../services/api';
import { Modal, Button, Input, TextArea, Select } from './UI.jsx';
import { Send, Radio, Users, AlertTriangle, AlertCircle } from 'lucide-react';

const BroadcastModal = ({ isOpen, onClose, onSuccess, broadcast = null }) => {
  const isEditMode = !!broadcast;
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetType: 'all',
    targetCommittees: [],
    priority: 'normal'
  });
  const [committees, setCommittees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCommittees, setLoadingCommittees] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCommittees();
      if (broadcast) {
        setFormData({
          title: broadcast.title || '',
          message: broadcast.message || '',
          targetType: broadcast.targetType || 'all',
          targetCommittees: broadcast.targetCommittees || [],
          priority: broadcast.priority || 'normal'
        });
      } else {
        setFormData({
          title: '',
          message: '',
          targetType: 'all',
          targetCommittees: [],
          priority: 'normal'
        });
      }
    }
  }, [isOpen, broadcast]);

  const fetchCommittees = async () => {
    try {
      setLoadingCommittees(true);
      const response = await committeesAPI.getAll();
      const activeCommittees = (response.data || []).filter(c => c.status === 'active');
      setCommittees(activeCommittees);
    } catch (err) {
      console.error('Error fetching committees:', err);
    } finally {
      setLoadingCommittees(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.targetType === 'specific' && formData.targetCommittees.length === 0) {
      alert('Please select at least one committee');
      return;
    }

    try {
      setLoading(true);
      if (isEditMode) {
        await broadcastAPI.update(broadcast.id, formData);
        alert('Broadcast message updated successfully!');
      } else {
        await broadcastAPI.create(formData);
        alert('Broadcast message sent successfully!');
      }
      setFormData({
        title: '',
        message: '',
        targetType: 'all',
        targetCommittees: [],
        priority: 'normal'
      });
      onSuccess?.();
    } catch (err) {
      alert(err.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'send'} broadcast message`);
    } finally {
      setLoading(false);
    }
  };

  const handleCommitteeToggle = (committeeId) => {
    setFormData(prev => ({
      ...prev,
      targetCommittees: prev.targetCommittees.includes(committeeId)
        ? prev.targetCommittees.filter(id => id !== committeeId)
        : [...prev.targetCommittees, committeeId]
    }));
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'important':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return <Radio className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? "Edit Broadcast Message" : "Broadcast Message to Committees"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Priority Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Priority</label>
          <div className="flex gap-3">
            {['normal', 'important', 'urgent'].map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => setFormData({ ...formData, priority })}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  formData.priority === priority
                    ? priority === 'urgent'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : priority === 'important'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {getPriorityIcon(priority)}
                <span className="capitalize">{priority}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <Input
          label="Title *"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter broadcast title"
          required
        />

        {/* Message */}
        <TextArea
          label="Message *"
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          placeholder="Enter your message to all committee members..."
          rows={5}
          required
        />

        {/* Target Selection */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Send To</label>
          <Select
            value={formData.targetType}
            onChange={(e) => setFormData({ ...formData, targetType: e.target.value, targetCommittees: [] })}
          >
            <option value="all">All Committees</option>
            <option value="specific">Specific Committees</option>
            <option value="leaders">Committee Leaders Only</option>
          </Select>
        </div>

        {/* Committee Selection (if specific) */}
        {formData.targetType === 'specific' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Committees ({formData.targetCommittees.length} selected)
            </label>
            {loadingCommittees ? (
              <div className="text-center py-4 text-gray-500">Loading committees...</div>
            ) : committees.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No active committees found</div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                {committees.map((committee) => (
                  <label
                    key={committee.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all ${
                      formData.targetCommittees.includes(committee.id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.targetCommittees.includes(committee.id)}
                      onChange={() => handleCommitteeToggle(committee.id)}
                      className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{committee.name}</p>
                      <p className="text-xs text-gray-500">{committee.memberCount || 0} members</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview Info */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Broadcast Summary</h4>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>
              {formData.targetType === 'all'
                ? 'All committee members will receive this message'
                : formData.targetType === 'leaders'
                ? 'Only committee leaders will receive this message'
                : `Members of ${formData.targetCommittees.length} selected committee(s) will receive this message`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="submit" disabled={loading} className="flex-1">
            <Send className="h-4 w-4" />
            {loading ? (isEditMode ? 'Updating...' : 'Sending...') : (isEditMode ? 'Update Broadcast' : 'Send Broadcast')}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default BroadcastModal;
