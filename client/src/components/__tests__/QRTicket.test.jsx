import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the API
vi.mock('../../services/api', () => ({
  eventsAPI: {
    getMyTicket: vi.fn(),
  },
}));

import QRTicket from '../QRTicket';
import { eventsAPI } from '../../services/api';

describe('QRTicket Component', () => {
  const mockTicket = {
    eventTitle: 'Tech Conference 2026',
    eventDate: '2026-04-15',
    eventTime: '10:00 AM',
    eventLocation: 'Main Hall, UTM',
    attendeeName: 'John Doe',
    attendeeEmail: 'john@utm.ac.mu',
    checkInCode: 'abc-123-def-456',
    qrCode: 'data:image/png;base64,fakeQRCodeData',
    registeredAt: '2026-03-10T08:00:00Z',
    checkedIn: false,
    checkedInAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display ticket details after loading', async () => {
    eventsAPI.getMyTicket.mockResolvedValue({ data: { ticket: mockTicket } });

    render(<QRTicket eventId="event-1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Tech Conference 2026')).toBeTruthy();
    });

    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('john@utm.ac.mu')).toBeTruthy();
    expect(screen.getByText('abc-123-def-456')).toBeTruthy();
    expect(screen.getByText('Not checked in yet')).toBeTruthy();
  });

  it('should show checked-in status when already checked in', async () => {
    eventsAPI.getMyTicket.mockResolvedValue({
      data: {
        ticket: {
          ...mockTicket,
          checkedIn: true,
          checkedInAt: '2026-04-15T10:30:00Z',
        },
      },
    });

    render(<QRTicket eventId="event-1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Checked In')).toBeTruthy();
    });
  });

  it('should show error state on failure', async () => {
    eventsAPI.getMyTicket.mockRejectedValue({
      response: { data: { error: 'You are not registered for this event' } },
    });

    render(<QRTicket eventId="event-1" onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('You are not registered for this event')).toBeTruthy();
    });
  });

  it('should call onClose when close button is clicked', async () => {
    eventsAPI.getMyTicket.mockResolvedValue({ data: { ticket: mockTicket } });
    const onClose = vi.fn();

    render(<QRTicket eventId="event-1" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Tech Conference 2026')).toBeTruthy();
    });

    const closeButtons = screen.getAllByText('Close');
    await userEvent.click(closeButtons[closeButtons.length - 1]);
    expect(onClose).toHaveBeenCalled();
  });

  it('should display QR code image', async () => {
    eventsAPI.getMyTicket.mockResolvedValue({ data: { ticket: mockTicket } });

    render(<QRTicket eventId="event-1" onClose={() => {}} />);

    await waitFor(() => {
      const img = screen.getByAltText('QR Code');
      expect(img).toBeTruthy();
      expect(img.getAttribute('src')).toBe('data:image/png;base64,fakeQRCodeData');
    });
  });

  it('should call API with correct event ID', async () => {
    eventsAPI.getMyTicket.mockResolvedValue({ data: { ticket: mockTicket } });

    render(<QRTicket eventId="event-42" onClose={() => {}} />);

    await waitFor(() => {
      expect(eventsAPI.getMyTicket).toHaveBeenCalledWith('event-42');
    });
  });
});
