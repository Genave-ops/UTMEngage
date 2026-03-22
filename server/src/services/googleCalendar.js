const { google } = require('googleapis');
const crypto = require('crypto');
const { UserGoogleToken } = require('../models');

// OAuth2 Configuration
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Scopes required for Google Calendar and Meet
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

/**
 * Generate the Google OAuth authorization URL
 * @param {string} userId - User ID to include in state for callback
 * @returns {string} Authorization URL
 */
function getAuthUrl(userId) {
  const statePayload = Buffer.from(JSON.stringify({ userId })).toString('base64');
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update(statePayload)
    .digest('base64');
  const state = `${statePayload}.${signature}`;

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: state,
    prompt: 'consent'
  });
}

/**
 * Verify HMAC signature on OAuth state parameter
 * @param {string} state - Signed state string (payload.signature)
 * @returns {Object} Decoded state data
 */
function verifyState(state) {
  const dotIndex = state.indexOf('.');
  if (dotIndex === -1) {
    throw new Error('Invalid state format');
  }

  const statePayload = state.substring(0, dotIndex);
  const receivedSignature = state.substring(dotIndex + 1);

  const expectedSignature = crypto.createHmac('sha256', process.env.JWT_SECRET)
    .update(statePayload)
    .digest('base64');

  if (!crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(receivedSignature)
  )) {
    throw new Error('Invalid state signature');
  }

  return JSON.parse(Buffer.from(statePayload, 'base64').toString());
}

/**
 * Exchange authorization code for tokens
 * @param {string} code - Authorization code from callback
 * @returns {Object} Token response
 */
async function getTokensFromCode(code) {
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

/**
 * Save user's Google tokens to database
 * @param {string} userId - User ID
 * @param {Object} tokens - Google OAuth tokens
 */
async function saveUserTokens(userId, tokens) {
  const tokenData = {
    userId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: new Date(tokens.expiry_date),
    scope: tokens.scope,
    tokenType: tokens.token_type || 'Bearer'
  };

  await UserGoogleToken.findOneAndUpdate(
    { userId },
    tokenData,
    { upsert: true, new: true }
  );
}

/**
 * Get user's Google tokens from database
 * @param {string} userId - User ID
 * @returns {Object|null} Token data or null
 */
async function getUserTokens(userId) {
  const tokenDoc = await UserGoogleToken.findOne({ userId }).lean();
  return tokenDoc;
}

/**
 * Delete user's Google tokens (disconnect)
 * @param {string} userId - User ID
 */
async function deleteUserTokens(userId) {
  await UserGoogleToken.deleteOne({ userId });
}

/**
 * Check if user has connected their Google account
 * @param {string} userId - User ID
 * @returns {boolean} Whether user is connected
 */
async function isUserConnected(userId) {
  const tokenDoc = await UserGoogleToken.findOne({ userId }).lean();
  return !!tokenDoc;
}

/**
 * Get authenticated OAuth2 client for a user
 * @param {string} userId - User ID
 * @returns {OAuth2Client|null} Authenticated client or null
 */
async function getAuthenticatedClient(userId) {
  const tokenDoc = await getUserTokens(userId);
  if (!tokenDoc) {
    return null;
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  client.setCredentials({
    access_token: tokenDoc.accessToken,
    refresh_token: tokenDoc.refreshToken,
    expiry_date: tokenDoc.expiresAt.getTime()
  });

  // Check if token is expired and refresh if needed
  if (tokenDoc.expiresAt < new Date()) {
    try {
      const { credentials } = await client.refreshAccessToken();
      await saveUserTokens(userId, {
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || tokenDoc.refreshToken,
        expiry_date: credentials.expiry_date,
        scope: credentials.scope,
        token_type: credentials.token_type
      });
      client.setCredentials(credentials);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      await deleteUserTokens(userId);
      return null;
    }
  }

  return client;
}

/**
 * Create a Google Calendar event with Google Meet
 * @param {string} userId - User ID creating the meeting
 * @param {Object} meetingData - Meeting details
 * @returns {Object} Created event with Meet link
 */
async function createMeetingWithGoogleMeet(userId, meetingData) {
  const authClient = await getAuthenticatedClient(userId);
  if (!authClient) {
    throw new Error('User not connected to Google. Please connect your Google account first.');
  }

  const calendar = google.calendar({ version: 'v3', auth: authClient });

  // Parse date and time
  const startDate = new Date(meetingData.date);
  const [startHours, startMinutes] = meetingData.time.split(':').map(Number);
  startDate.setHours(startHours, startMinutes, 0, 0);

  // Calculate end time
  let endDate;
  if (meetingData.endTime) {
    endDate = new Date(meetingData.date);
    const [endHours, endMinutes] = meetingData.endTime.split(':').map(Number);
    endDate.setHours(endHours, endMinutes, 0, 0);
  } else {
    // Default duration: 1 hour
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  const event = {
    summary: meetingData.title,
    description: meetingData.description || '',
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'Asia/Kuala_Lumpur'
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'Asia/Kuala_Lumpur'
    },
    conferenceData: {
      createRequest: {
        requestId: `utmengage-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    }
  };

  // Add location if hybrid meeting
  if (meetingData.location && meetingData.meetingType === 'hybrid') {
    event.location = meetingData.location;
  }

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1
    });

    const createdEvent = response.data;
    const meetLink = createdEvent.conferenceData?.entryPoints?.find(
      ep => ep.entryPointType === 'video'
    )?.uri;

    return {
      googleEventId: createdEvent.id,
      meetingLink: meetLink || null,
      htmlLink: createdEvent.htmlLink
    };
  } catch (error) {
    console.error('Failed to create Google Calendar event:', error);
    throw new Error('Failed to create Google Meet. Please try again.');
  }
}

/**
 * Delete a Google Calendar event
 * @param {string} userId - User ID
 * @param {string} eventId - Google Calendar event ID
 */
async function deleteMeetingFromCalendar(userId, eventId) {
  if (!eventId) return;

  const authClient = await getAuthenticatedClient(userId);
  if (!authClient) {
    console.warn('Cannot delete calendar event: User not connected to Google');
    return;
  }

  const calendar = google.calendar({ version: 'v3', auth: authClient });

  try {
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });
  } catch (error) {
    console.error('Failed to delete Google Calendar event:', error);
    // Don't throw - the meeting can still be deleted from our DB
  }
}

module.exports = {
  getAuthUrl,
  verifyState,
  getTokensFromCode,
  saveUserTokens,
  getUserTokens,
  deleteUserTokens,
  isUserConnected,
  getAuthenticatedClient,
  createMeetingWithGoogleMeet,
  deleteMeetingFromCalendar
};
