import { useState } from 'react';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import OTPVerificationPage from './OTPVerificationPage';
import ChangePasswordPage from './ChangePasswordPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import { useAuth } from '../contexts/AuthContext';

const AuthScreen = () => {
  const [screen, setScreen] = useState('login');
  const [verificationEmail, setVerificationEmail] = useState('');
  const { mustChangePassword, completePasswordChange } = useAuth();

  const handleRegistrationSuccess = (email) => {
    setVerificationEmail(email);
    setScreen('otp');
  };

  const handleVerified = () => {
    window.location.reload();
  };

  const handlePasswordChanged = (token, user) => {
    completePasswordChange(token, user);
  };

  if (mustChangePassword) {
    return <ChangePasswordPage onPasswordChanged={handlePasswordChanged} />;
  }

  if (screen === 'otp') {
    return (
      <OTPVerificationPage
        email={verificationEmail}
        onBack={() => setScreen('login')}
        onVerified={handleVerified}
      />
    );
  }

  if (screen === 'forgot-password') {
    return (
      <ForgotPasswordPage
        onBack={() => setScreen('login')}
      />
    );
  }

  if (screen === 'register') {
    return (
      <RegisterPage
        onSwitchToLogin={() => setScreen('login')}
        onRegistrationSuccess={handleRegistrationSuccess}
      />
    );
  }

  return (
    <LoginPage
      onSwitchToRegister={() => setScreen('register')}
      onForgotPassword={() => setScreen('forgot-password')}
    />
  );
};

export default AuthScreen;
