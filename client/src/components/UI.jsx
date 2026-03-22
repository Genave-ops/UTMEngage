// Reusable UI Components for UTM Engagement Platform

export const Button = ({ children, onClick, variant = 'primary', className = '', type = 'button', disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[#005eb8] text-white hover:bg-[#004a94] shadow-sm",
    secondary: "bg-[#00b5e2] text-white hover:bg-[#009ac2] shadow-sm",
    outline: "border-2 border-[#005eb8] text-[#005eb8] hover:bg-blue-50",
    success: "bg-green-600 text-white hover:bg-green-700 shadow-sm",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-600 hover:bg-gray-100",
    white: "bg-white text-gray-800 hover:bg-gray-100 border border-gray-200 shadow-sm"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const Card = ({ children, className = '', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} ${className}`}
  >
    {children}
  </div>
);

export const Badge = ({ status, variant, children, className = '' }) => {
  const statusStyles = {
    active: "bg-green-100 text-green-700 border-green-200",
    approved: "bg-green-100 text-green-700 border-green-200",
    pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    rejected: "bg-red-100 text-red-700 border-red-200",
    banned: "bg-red-100 text-red-800 border-red-200",
  };

  const variantStyles = {
    primary: "bg-blue-100 text-blue-700 border-blue-200",
    secondary: "bg-gray-100 text-gray-700 border-gray-200",
    success: "bg-green-100 text-green-700 border-green-200",
    danger: "bg-red-100 text-red-700 border-red-200",
    warning: "bg-yellow-100 text-yellow-700 border-yellow-200",
    info: "bg-blue-100 text-blue-700 border-blue-200",
  };

  if (variant) {
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantStyles[variant] || "bg-gray-100 text-gray-700 border-gray-200"} ${className}`}>
        {children}
      </span>
    );
  }

  const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyles[status] || "bg-gray-100 text-gray-700 border-gray-200"} ${className}`}>
      {displayStatus}
    </span>
  );
};

export const Modal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {title && (
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Input = ({ label, error, ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <input
      {...props}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none transition-all ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${props.className || ''}`}
    />
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

export const TextArea = ({ label, error, ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <textarea
      {...props}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none transition-all ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${props.className || ''}`}
    />
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

export const Select = ({ label, error, children, ...props }) => (
  <div className="space-y-1">
    {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}
    <select
      {...props}
      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#005eb8] outline-none transition-all ${
        error ? 'border-red-500' : 'border-gray-300'
      } ${props.className || ''}`}
    >
      {children}
    </select>
    {error && <p className="text-sm text-red-600">{error}</p>}
  </div>
);

export const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005eb8]"></div>
  </div>
);

export const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
    {Icon && <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />}
    <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
    {description && <p className="text-gray-500">{description}</p>}
  </div>
);
