import { useState, useEffect } from 'react';
import { X, Download, CheckCircle, Clock, Calendar, MapPin, User } from 'lucide-react';
import { Card, Button, LoadingSpinner } from './UI';
import { eventsAPI } from '../services/api';

const QRTicket = ({ eventId, onClose }) => {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const response = await eventsAPI.getMyTicket(eventId);
        setTicket(response.data.ticket);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load ticket');
      } finally {
        setLoading(false);
      }
    };
    fetchTicket();
  }, [eventId]);

  const handleDownload = () => {
    if (!ticket?.qrCode) return;
    const link = document.createElement('a');
    link.download = `ticket-${ticket.eventTitle.replace(/\s+/g, '-')}.png`;
    link.href = ticket.qrCode;
    link.click();
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4"><LoadingSpinner /></Card>
    </div>
  );

  if (error) return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={onClose}>Close</Button>
      </Card>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#005eb8] to-[#00b5e2] p-4 text-white flex items-center justify-between">
          <h2 className="text-lg font-bold">Event Ticket</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Ticket Body */}
        <div className="p-6 space-y-4">
          {/* Status */}
          {ticket.checkedIn ? (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
              <div>
                <p className="text-green-800 font-medium">Checked In</p>
                <p className="text-green-600 text-sm">
                  {new Date(ticket.checkedInAt).toLocaleString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Clock size={20} className="text-yellow-600" />
              <p className="text-yellow-800 font-medium">Not checked in yet</p>
            </div>
          )}

          {/* Event Info */}
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-900">{ticket.eventTitle}</h3>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Calendar size={14} />
              <span>{new Date(ticket.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Clock size={14} />
              <span>{ticket.eventTime || 'TBA'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <MapPin size={14} />
              <span>{ticket.eventLocation || 'TBA'}</span>
            </div>
          </div>

          {/* Dashed separator */}
          <div className="border-t-2 border-dashed border-gray-200 my-4"></div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            <img src={ticket.qrCode} alt="QR Code" className="w-48 h-48" />
            <p className="text-xs text-gray-400 mt-2 font-mono">{ticket.checkInCode}</p>
          </div>

          {/* Attendee */}
          <div className="flex items-center gap-2 text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
            <User size={14} />
            <div>
              <p className="font-medium text-gray-900">{ticket.attendeeName}</p>
              <p className="text-gray-500">{ticket.attendeeEmail}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <Button variant="outline" onClick={handleDownload} className="flex-1">
            <Download size={16} /> Save QR
          </Button>
          <Button onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QRTicket;
