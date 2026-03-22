const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const googleCalendar = require('../services/googleCalendar');

// GET /api/google/auth - Get OAuth authorization URL
router.get('/auth', verifyToken, (req, res) => {
  try {
    const authUrl = googleCalendar.getAuthUrl(req.user.id);
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// GET /api/google/callback - Handle OAuth callback
router.get('/callback', async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  // Handle OAuth errors
  if (oauthError) {
    console.error('OAuth error:', oauthError);
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/committees?google_error=${oauthError}`);
  }

  if (!code || !state) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/committees?google_error=missing_params`);
  }

  try {
    // Verify and decode signed state
    let stateData;
    try {
      stateData = googleCalendar.verifyState(state);
    } catch (stateError) {
      console.error('Invalid state signature:', stateError.message);
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/committees?google_error=invalid_state`);
    }
    const userId = stateData.userId;

    if (!userId) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/committees?google_error=invalid_state`);
    }

    // Exchange code for tokens
    const tokens = await googleCalendar.getTokensFromCode(code);

    // Save tokens to database
    await googleCalendar.saveUserTokens(userId, tokens);

    // Redirect to client with success
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/committees?google_connected=true`);
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/committees?google_error=token_exchange_failed`);
  }
});

// GET /api/google/status - Check if user has connected Google
router.get('/status', verifyToken, async (req, res) => {
  try {
    const isConnected = await googleCalendar.isUserConnected(req.user.id);
    res.json({ connected: isConnected });
  } catch (error) {
    console.error('Error checking Google connection status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

// DELETE /api/google/disconnect - Remove Google connection
router.delete('/disconnect', verifyToken, async (req, res) => {
  try {
    await googleCalendar.deleteUserTokens(req.user.id);
    res.json({ message: 'Google account disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting Google:', error);
    res.status(500).json({ error: 'Failed to disconnect Google account' });
  }
});

module.exports = router;
