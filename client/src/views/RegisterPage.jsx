import { useState } from 'react';
import { School, UserCircle, Mail, Lock, Eye, EyeOff, User, Phone, Building, Hash, ArrowLeft, CheckCircle } from 'lucide-react';
import { authAPI } from '../services/api';
import { Button } from '../components/UI';
import { isPasswordValid } from '../utils/passwordValidation';
import PasswordStrengthIndicator from '../components/PasswordStrengthIndicator';

const RegisterPage = ({ onSwitchToLogin, onRegistrationSuccess }) => {
  const [step, setStep] = useState('role'); // 'role' or 'form'
  const [selectedRole, setSelectedRole] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    // Student specific
    studentId: '',
    department: '',
    // Stakeholder specific
    organizationName: ''
  });

  const roles = [
    {
      role: 'student',
      title: 'Student',
      icon: School,
      color: 'emerald',
      bgGradient: 'from-emerald-500 to-green-600',
      description: 'Register as a UTM student to access events, join committees, and engage with the community',
      features: ['Join committees', 'Register for events', 'Participate in discussions', 'Provide feedback']
    },
    {
      role: 'stakeholder',
      title: 'Stakeholder',
      icon: UserCircle,
      color: 'cyan',
      bgGradient: 'from-cyan-500 to-blue-500',
      description: 'Register as an industry partner or external stakeholder to collaborate with UTM',
      features: ['Propose events', 'Join advisory committees', 'Network with students', 'Share opportunities']
    }
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setStep('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (!isPasswordValid(formData.password)) {
      setError('Password does not meet all requirements');
      setLoading(false);
      return;
    }

    // Role-specific validation
    if (selectedRole === 'student' && !formData.studentId) {
      setError('Student ID is required');
      setLoading(false);
      return;
    }

    if (selectedRole === 'stakeholder' && !formData.organizationName) {
      setError('Organization name is required');
      setLoading(false);
      return;
    }

    try {
      const response = await authAPI.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: selectedRole,
        phone: formData.phone,
        studentId: formData.studentId,
        department: formData.department,
        organizationName: formData.organizationName
      });

      const data = response.data;

      if (data.requiresVerification) {
        onRegistrationSuccess(data.email);
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.requiresVerification && errData?.email) {
        onRegistrationSuccess(errData.email);
        return;
      }
      setError(errData?.error || err.message || 'Registration failed');
      setLoading(false);
    }
  };

  const currentRole = roles.find(r => r.role === selectedRole);

  if (step === 'role') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-utm-blue to-utm-cyan rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <School size={40} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Join UTM Engagement Platform
            </h1>
            <p className="text-gray-600">
              Select your role to get started
            </p>
          </div>

          {/* Role Selection */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {roles.map(({ role, title, icon: Icon, color, bgGradient, description, features }) => (
              <button
                key={role}
                onClick={() => handleRoleSelect(role)}
                className="bg-white rounded-2xl shadow-xl p-6 text-left hover:shadow-2xl transition-all transform hover:-translate-y-1 group"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${bgGradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={32} className="text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 mb-4">{description}</p>

                <div className="space-y-2">
                  {features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-gray-500">
                      <CheckCircle size={14} className={`text-${color}-600`} />
                      {feature}
                    </div>
                  ))}
                </div>

                <div className={`mt-4 text-${color}-600 font-semibold text-sm flex items-center gap-1 group-hover:gap-2 transition-all`}>
                  Register as {title}
                  <ArrowLeft className="rotate-180" size={16} />
                </div>
              </button>
            ))}
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-sm text-gray-600 hover:text-utm-blue font-medium"
            >
              Already have an account? <span className="font-semibold">Sign In</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Registration Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <button
          onClick={() => setStep('role')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to role selection</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className={`w-16 h-16 bg-gradient-to-br ${currentRole.bgGradient} rounded-xl flex items-center justify-center mx-auto mb-3`}>
              <currentRole.icon size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Register as {currentRole.title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Create your account to get started
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            {/* Student ID (for students only) */}
            {selectedRole === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student ID *
                </label>
                <div className="relative">
                  <Hash size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="studentId"
                    value={formData.studentId}
                    onChange={handleChange}
                    placeholder="e.g., 230325359"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {/* Department (for students) */}
            {selectedRole === 'student' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <div className="relative">
                  <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="e.g., Computer Science"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none"
                  />
                </div>
              </div>
            )}

            {/* Organization Name (for stakeholders) */}
            {selectedRole === 'stakeholder' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Name *
                </label>
                <div className="relative">
                  <Building size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="e.g., Tech Corp Ltd"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+230 5xxx xxxx"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordStrengthIndicator password={formData.password} />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-utm-blue focus:border-transparent outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-base font-semibold"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-utm-blue font-semibold hover:underline"
              >
                Sign In
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 UTM Engagement Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
