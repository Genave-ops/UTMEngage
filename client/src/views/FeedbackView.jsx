import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Lightbulb, AlertCircle, Star, Send, CheckCircle } from 'lucide-react';
import { Card, Button, Input, TextArea } from '../components/UI';
import { useAuth } from '../contexts/AuthContext';
import { feedbackAPI } from '../services/api';

const FeedbackView = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    type: '',
    subject: '',
    message: '',
    rating: 0
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const feedbackTypes = [
    {
      id: 'bug',
      name: 'Bug Report',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      description: 'Report a problem or issue'
    },
    {
      id: 'feature',
      name: 'Feature Request',
      icon: Lightbulb,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      description: 'Suggest a new feature'
    },
    {
      id: 'improvement',
      name: 'Improvement',
      icon: Star,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Suggest an enhancement'
    },
    {
      id: 'general',
      name: 'General Feedback',
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Share your thoughts'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.type || !formData.subject || !formData.message) {
      alert('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type: formData.type,
        subject: formData.subject,
        message: formData.message,
      };
      if (formData.rating > 0) {
        payload.rating = formData.rating;
      }

      await feedbackAPI.create(payload);

      setSubmitted(true);
      timeoutRef.current = setTimeout(() => {
        setFormData({ type: '', subject: '', message: '', rating: 0 });
        setSubmitted(false);
      }, 3000);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRating = (rating) => {
    setFormData({ ...formData, rating });
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto mt-20 animate-in fade-in">
        <Card className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600">
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">We Value Your Feedback</h1>
        <p className="text-gray-600">
          Help us improve the UTM Engagement Platform by sharing your thoughts, suggestions, or reporting issues.
        </p>
      </div>

      {/* Feedback Type Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Select Feedback Type</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {feedbackTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = formData.type === type.id;

            return (
              <button
                key={type.id}
                onClick={() => setFormData({ ...formData, type: type.id })}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  isSelected
                    ? `${type.borderColor} ${type.bgColor} shadow-md`
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <Icon size={24} className={`${isSelected ? type.color : 'text-gray-400'} mb-2`} />
                <h4 className={`font-semibold mb-1 ${isSelected ? type.color : 'text-gray-900'}`}>
                  {type.name}
                </h4>
                <p className="text-xs text-gray-500">{type.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Form */}
      {formData.type && (
        <Card className="animate-in slide-in-from-bottom">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject *
              </label>
              <Input
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief summary of your feedback"
                required
              />
            </div>

            {/* Rating (only for general feedback and improvement) */}
            {(formData.type === 'general' || formData.type === 'improvement') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Overall Experience Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        className={
                          star <= formData.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }
                      />
                    </button>
                  ))}
                </div>
                {formData.rating > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    You rated: {formData.rating} {formData.rating === 1 ? 'star' : 'stars'}
                  </p>
                )}
              </div>
            )}

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Details *
              </label>
              <TextArea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={
                  formData.type === 'bug'
                    ? 'Please describe the bug, steps to reproduce, and expected behavior...'
                    : formData.type === 'feature'
                    ? 'Describe the feature you would like to see and how it would help...'
                    : 'Share your feedback in detail...'
                }
                rows={6}
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                Minimum 20 characters ({formData.message.length}/20)
              </p>
            </div>

            {/* User Info Display */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm text-gray-600 mb-1">Submitting as:</p>
              <p className="font-semibold text-gray-900">{user?.name || 'Unknown'}</p>
              <p className="text-sm text-gray-500">{user?.email} • {user?.role}</p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setFormData({ type: '', subject: '', message: '', rating: 0 })}
                className="flex-1"
              >
                Clear Form
              </Button>
              <Button
                type="submit"
                disabled={submitting || formData.message.length < 20}
                className="flex-1"
              >
                {submitting ? (
                  'Submitting...'
                ) : (
                  <>
                    <Send size={16} /> Submit Feedback
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-gradient-to-r from-utm-blue to-utm-cyan text-white">
        <div className="flex items-start gap-4">
          <MessageSquare size={32} className="flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-bold text-lg mb-2">Your Voice Matters</h3>
            <p className="text-blue-50 text-sm leading-relaxed">
              Every piece of feedback helps us make the UTM Engagement Platform better for everyone.
              Whether it's a bug report, feature suggestion, or general comment, we review all submissions
              and use them to improve the platform.
            </p>
          </div>
        </div>
      </Card>

      {/* FAQ */}
      <Card>
        <h3 className="font-bold text-gray-800 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">
              How long does it take to get a response?
            </h4>
            <p className="text-sm text-gray-600">
              We review all feedback within 3-5 business days. For urgent bugs, we aim to respond within 24 hours.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">
              Can I track my feedback submission?
            </h4>
            <p className="text-sm text-gray-600">
              Currently, we don't have a tracking system, but we're working on adding this feature soon!
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 text-sm mb-1">
              What happens to my feedback?
            </h4>
            <p className="text-sm text-gray-600">
              All feedback is reviewed by our team and categorized. We prioritize based on impact and feasibility.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FeedbackView;
