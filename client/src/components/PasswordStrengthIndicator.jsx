import { CheckCircle, XCircle } from 'lucide-react';
import { validatePassword } from '../utils/passwordValidation';

const PasswordStrengthIndicator = ({ password }) => {
  const results = validatePassword(password);
  const passedCount = results.filter((r) => r.passed).length;
  const total = results.length;

  // Strength bar color
  const strength = passedCount / total;
  const barColor =
    strength <= 0.2 ? 'bg-red-500' :
    strength <= 0.4 ? 'bg-orange-500' :
    strength <= 0.6 ? 'bg-yellow-500' :
    strength <= 0.8 ? 'bg-blue-500' :
    'bg-green-500';

  const strengthLabel =
    strength <= 0.2 ? 'Very Weak' :
    strength <= 0.4 ? 'Weak' :
    strength <= 0.6 ? 'Fair' :
    strength <= 0.8 ? 'Good' :
    'Strong';

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${strength * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${
          strength <= 0.4 ? 'text-red-600' :
          strength <= 0.6 ? 'text-yellow-600' :
          strength <= 0.8 ? 'text-blue-600' :
          'text-green-600'
        }`}>
          {strengthLabel}
        </span>
      </div>

      {/* Checklist */}
      <div className="grid grid-cols-1 gap-1">
        {results.map((rule) => (
          <div key={rule.id} className="flex items-center gap-1.5">
            {rule.passed ? (
              <CheckCircle size={13} className="text-green-500 flex-shrink-0" />
            ) : (
              <XCircle size={13} className="text-gray-300 flex-shrink-0" />
            )}
            <span className={`text-xs ${rule.passed ? 'text-green-700' : 'text-gray-500'}`}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
