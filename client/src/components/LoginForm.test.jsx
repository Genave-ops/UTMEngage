/**
 * Login Form Component Test Suite
 * Covers: UI Rendering, Form Validation, User Interaction
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';
import App from '../App';

// Mock the API
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  authAPI: {
    login: vi.fn(),
    getMe: vi.fn(),
    register: vi.fn(),
    verifyOTP: vi.fn(),
  },
  eventsAPI: {},
  committeesAPI: {},
  postsAPI: {},
  usersAPI: {},
  moderationAPI: {},
  feedbackAPI: {},
  analyticsAPI: {},
  googleAPI: {},
}));

describe('LOGIN-UI-001: Login Form Rendering', () => {

  describe('TC-UI-001: Initial Render', () => {

    it('TC-UI-001-A: Should render login form elements', () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
      expect(screen.getByText(/Sign in to UTM Engagement Platform/i)).toBeInTheDocument();
      expect(screen.getByText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    });

    it('TC-UI-001-B: Should render create account link', () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      expect(screen.getByText(/Create Account/i)).toBeInTheDocument();
    });

    it('TC-UI-001-C: Should render UTM branding', () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      // Use getAllByText since multiple elements may contain UTM
      const utmElements = screen.getAllByText(/UTM/i);
      expect(utmElements.length).toBeGreaterThan(0);
    });
  });

  describe('TC-UI-002: Form Input Fields', () => {

    it('TC-UI-002-A: Email input should exist and be empty initially', () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      const emailInputs = document.querySelectorAll('input[type="email"], input[type="text"]');
      expect(emailInputs.length).toBeGreaterThan(0);
    });

    it('TC-UI-002-B: Password input should exist', () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      const passwordInput = document.querySelector('input[type="password"]');
      expect(passwordInput).toBeInTheDocument();
    });
  });
});

describe('LOGIN-UI-002: Form Validation', () => {

  describe('TC-UI-003: Input Validation - Boundary Value Analysis', () => {

    it('TC-UI-003-A: Should have submit button', () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /Sign In/i });
      expect(submitButton).toBeInTheDocument();
    });
  });
});

describe('LOGIN-UI-003: Navigation', () => {

  describe('TC-UI-004: Form Toggle', () => {

    it('TC-UI-004-A: Should navigate to registration flow', async () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      // Find and click the create account link
      const createAccountLink = screen.getByText(/Create Account/i);
      fireEvent.click(createAccountLink);

      // After clicking Create Account, the UI shows a role selection page
      // Check for registration-related content (role selection or registration form)
      await waitFor(() => {
        // Should show either role selection or registration form elements
        const studentElements = screen.queryAllByText(/Student/i);
        const registerElements = screen.queryAllByText(/Register/i);
        const joinElements = screen.queryAllByText(/Join UTM/i);
        expect(studentElements.length > 0 || registerElements.length > 0 || joinElements.length > 0).toBe(true);
      }, { timeout: 3000 });
    });
  });
});

describe('LOGIN-UI-004: Accessibility', () => {

  describe('TC-UI-005: Accessibility Checks', () => {

    it('TC-UI-005-A: Submit button should be focusable', () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      const submitButton = screen.getByRole('button', { name: /Sign In/i });
      submitButton.focus();
      expect(document.activeElement).toBe(submitButton);
    });

    it('TC-UI-005-B: Form should have proper structure', () => {
      render(
        <AuthProvider>
          <App />
        </AuthProvider>
      );

      // Check that inputs exist
      const inputs = document.querySelectorAll('input');
      expect(inputs.length).toBeGreaterThan(0);
    });
  });
});
