import { useState, useEffect, useRef } from 'react';
import { Mail, ArrowLeft, CheckCircle, RefreshCw } from 'lucide-react';
import { authAPI } from '../services/api';
import { Button } from '../components/UI';

const OTPVerificationPage = ({ email, onBack, onVerified }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [expiryTimer, setExpiryTimer] = useState(300);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (expiryTimer > 0) {
      const timer = setTimeout(() => setExpiryTimer(expiryTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [expiryTimer]);

  const handleChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyOTP({ email, otp: otpString });
      const data = response.data;

      if (data.verified) {
        setSuccess(data.message);

        if (data.token && data.user) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          setTimeout(() => {
            onVerified(data);
          }, 1500);
        } else if (data.requiresApproval) {
          setTimeout(() => {
            onBack();
          }, 3000);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setCanResend(false);
    setResendCooldown(60);
    setError('');

    try {
      await authAPI.resendOTP({ email });
      setSuccess('A new verification code has been sent!');
      setExpiryTimer(300);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.retryAfter) {
        setResendCooldown(errData.retryAfter);
      }
      setError(errData?.error || 'Failed to resend code. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskEmail = (email) => {
    const [local, domain] = email.split('@');
    const masked = local.length > 3
      ? local.substring(0, 3) + '***'
      : local[0] + '***';
    return `${masked}@${domain}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Mail size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Verify Your Email</h2>
            <p className="text-sm text-gray-600 mt-2">
              We have sent a 6-digit verification code to
            </p>
            <p className="text-sm font-semibold text-gray-800 mt-1">
              {maskEmail(email)}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm mb-4 flex items-center gap-2">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => inputRefs.current[index] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {expiryTimer > 0 ? (
            <p className="text-center text-sm text-gray-500 mb-4">
              Code expires in <span className="font-semibold text-gray-700">{formatTime(expiryTimer)}</span>
            </p>
          ) : (
            <p className="text-center text-sm text-red-500 mb-4 font-medium">
              Code has expired. Please request a new one.
            </p>
          )}

          <Button
            onClick={handleVerify}
            disabled={loading || otp.join('').length !== 6}
            className="w-full py-3 text-base font-semibold mb-4"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying...
              </span>
            ) : (
              'Verify Email'
            )}
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Did not receive the code?{' '}
              {canResend ? (
                <button
                  onClick={handleResend}
                  className="text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  Resend Code
                </button>
              ) : (
                <span className="text-gray-400">
                  Resend in {resendCooldown}s
                </span>
              )}
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; 2025 UTM Engagement Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default OTPVerificationPage;
