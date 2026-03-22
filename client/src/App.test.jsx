import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthProvider } from './contexts/AuthContext';
import App from './App';

// Mock the API
vi.mock('./services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  authAPI: {
    login: vi.fn(),
    getMe: vi.fn(),
  },
  eventsAPI: {},
  committeesAPI: {},
  postsAPI: {},
  usersAPI: {},
  moderationAPI: {},
  feedbackAPI: {},
  analyticsAPI: {},
}));

describe('App Component', () => {
  it('renders login screen when not authenticated', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Check for login form elements
    expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to UTM Engagement Platform/i)).toBeInTheDocument();
  });

  it('renders login form elements', () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>
    );

    // Should render the login screen with form elements (using text queries since labels don't have htmlFor)
    expect(screen.getByText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByText(/Create Account/i)).toBeInTheDocument();
  });
});
