import { useState } from 'react';
import { moderationAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Modal, Button } from './UI.jsx';
import { Flag, AlertTriangle } from 'lucide-react';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Misleading or repetitive content' },
  { value: 'harassment', label: 'Harassment', description: 'Bullying or targeting someone' },
  { value: 'hate_speech', label: 'Hate Speech', description: 'Attacks based on identity' },
  { value: 'misinformation', label: 'Misinformation', description: 'False or misleading information' },
  { value: 'inappropriate', label: 'Inappropriate Content', description: 'Offensive or unsuitable content' },
  { value: 'other', label: 'Other', description: 'Other policy violation' },
];

const ReportContentModal = ({
  isOpen,
  onClose,
  contentType,
  contentId,
  contentPreview = '',
  contentAuthorId = '',
  contentAuthorName = ''
}) => {
  const { user } = useAuth();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isSelfReport = contentAuthorId && contentAuthorId === user?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) {
      alert('Please select a reason for your report');
      return;
    }

    try {
      setLoading(true);
      const reportData = {
        contentType,
        contentId,
        reason,
        description
      };

      // Only send content details for types the server can't look up
      if (contentType === 'comment') {
        reportData.contentPreview = contentPreview;
        reportData.contentAuthorId = contentAuthorId;
        reportData.contentAuthorName = contentAuthorName;
      }

      await moderationAPI.createReport(reportData);
      setSuccess(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setDescription('');
    setSuccess(false);
    onClose();
  };

  if (success) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Report Submitted">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Flag className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Thank you for reporting</h3>
          <p className="text-gray-600 mb-6">
            Our moderation team will review this content and take appropriate action.
          </p>
          <Button onClick={handleClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Report Content">
      {isSelfReport && (
        <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">You cannot report your own content.</p>
        </div>
      )}
      {!isSelfReport && (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Warning */}
        <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800">Help us understand the issue</p>
            <p className="text-yellow-700 mt-1">
              Reports are reviewed by our moderation team. False reports may result in action against your account.
            </p>
          </div>
        </div>

        {/* Content Preview */}
        {contentPreview && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reported Content
            </label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 line-clamp-3">{contentPreview}</p>
            </div>
          </div>
        )}

        {/* Reason Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Why are you reporting this {contentType}?
          </label>
          <div className="space-y-2">
            {REPORT_REASONS.map((option) => (
              <label
                key={option.value}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  reason === option.value
                    ? 'border-[#005eb8] bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="reason"
                  value={option.value}
                  checked={reason === option.value}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{option.label}</p>
                  <p className="text-sm text-gray-500">{option.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Additional Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Additional Details (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none resize-none"
            placeholder="Provide any additional context that might help our moderation team..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button type="submit" disabled={loading || !reason} className="flex-1">
            {loading ? 'Submitting...' : 'Submit Report'}
          </Button>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
};

export default ReportContentModal;
