import { useState } from 'react';
import { School, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import { Button } from '../components/UI';
import { isPasswordValid } from '../utils/passwordValidation';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';

const ForgotPasswordPage = ({ onBack }) => {
  const [step, setStep] = useState('email'); // 'email' | 'reset' | 'success'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email) {
      setError('Please enter your email address');
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.forgotPassword({ email });
      setMessage(response.data.message);
      setStep('reset');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!otp || !newPassword) {
      setError('Please enter both the reset code and new password');
      setLoading(false);
      return;
    }

    if (!isPasswordValid(newPassword)) {
      setError('Password does not meet all requirements');
      setLoading(false);
      return;
    }

    try {
      await authAPI.resetPassword({ email, otp, newPassword });
      setStep('success');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-utm-blue to-utm-cyan rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <School size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 'success' ? 'Password Reset' : 'Forgot Password'}
          </h1>
          <p className="text-gray-600">
            {step === 'email' && 'Enter your email to receive a reset code'}
            {step === 'reset' && 'Enter the code sent to your email'}
            {step === 'success' && 'Your password has been reset successfully'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                    placeholder="your.email@example.com"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none transition-all"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-base font-semibold"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Send Reset Code
                    <ArrowRight size={20} />
                  </span>
                )}
              </Button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              {message && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                  {message}
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reset Code
                </label>
                <div className="relative">
                  <KeyRound size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value); setError(''); }}
                    placeholder="Enter 6-digit code"
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none transition-all text-center tracking-widest text-lg"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    placeholder="Create a strong password"
                    className="w-full pl-11 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none transition-all"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <PasswordStrengthIndicator password={newPassword} />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-base font-semibold"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Reset Password
                    <ArrowRight size={20} />
                  </span>
                )}
              </Button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-5">
              <div className="flex justify-center">
                <CheckCircle size={64} className="text-green-500" />
              </div>
              <p className="text-gray-600">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <Button
                onClick={onBack}
                className="w-full py-3 text-base font-semibold"
              >
                <span className="flex items-center justify-center gap-2">
                  Back to Sign In
                  <ArrowRight size={20} />
                </span>
              </Button>
            </div>
          )}

          {step !== 'success' && (
            <div className="mt-6 text-center">
              <button
                onClick={onBack}
                className="text-sm text-utm-blue font-semibold hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 UTM Engagement Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
