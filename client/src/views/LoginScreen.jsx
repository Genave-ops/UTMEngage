import { useState } from 'react';
import { School, Shield, UserCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LoginScreen = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (role) => {
    setLoading(true);
    setError('');

    const result = await login({ role });

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
    // If successful, AuthContext will update and App will re-render
  };

  const roles = [
    {
      role: 'admin',
      title: 'Administrator',
      description: 'Manage users, approvals, analytics',
      icon: Shield,
      bgColor: 'bg-blue-100',
      hoverColor: 'group-hover:bg-blue-200',
      textColor: 'text-[#005eb8]',
    },
    {
      role: 'stakeholder',
      title: 'Stakeholder',
      description: 'Propose events, join committees',
      icon: UserCircle,
      bgColor: 'bg-cyan-100',
      hoverColor: 'group-hover:bg-cyan-200',
      textColor: 'text-[#00b5e2]',
    },
    {
      role: 'student',
      title: 'Student',
      description: 'View events, give feedback',
      icon: School,
      bgColor: 'bg-emerald-100',
      hoverColor: 'group-hover:bg-emerald-200',
      textColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-[#005eb8] p-8 text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <School size={40} className="text-[#005eb8]" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            UTM Engagement Platform
          </h1>
          <p className="text-blue-100 text-sm">
            Centralized University-Community System
          </p>
        </div>

        <div className="p-8 space-y-4">
          <p className="text-gray-600 text-center mb-6">
            Select your role to access the system:
          </p>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {roles.map(({ role, title, description, icon: Icon, bgColor, hoverColor, textColor }) => (
            <button
              key={role}
              onClick={() => handleLogin(role)}
              disabled={loading}
              className="w-full p-4 rounded-xl border-2 border-transparent bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all flex items-center group disabled:opacity-50"
            >
              <div className={`${bgColor} ${hoverColor} p-2 rounded-lg mr-4 transition-colors`}>
                <Icon size={20} className={textColor} />
              </div>
              <div className="text-left flex-1">
                <div className="font-semibold text-gray-800">{title}</div>
                <div className="text-xs text-gray-500">{description}</div>
              </div>
              <ChevronRight className={`text-gray-400 group-hover:${textColor} transition-colors`} size={16} />
            </button>
          ))}
        </div>

        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400">
          Prototype based on Initial Study by Pierre Adrien Genave
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
