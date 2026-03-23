import { useLocation, useNavigate } from 'react-router-dom';

export default function RegistrationPending() {
  const location = useLocation();
  const navigate = useNavigate();
  const userName = location.state?.userName || 'User';

  const handleAdminDashboardClick = () => {
    const password = window.prompt("Enter admin password:");
    if (password === "123") {
      navigate('/admin/dashboard');
    } else if (password !== null) {
      alert("Incorrect password");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-600 to-yellow-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4v2m0 4v2M6.75 9h10.5M6.75 15h10.5M6.75 21h10.5"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Registration Pending
          </h1>
        </div>

        <div className="space-y-4 mb-6">
          <p className="text-gray-600">
            Welcome, <span className="font-semibold">{userName}</span>!
          </p>
          <p className="text-gray-600">
            Your registration has been successfully submitted and is now pending admin approval.
          </p>
          <p className="text-gray-500 text-sm">
            Our administrator will review your account and send you a notification once it's approved.
            This usually takes 24-48 hours.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            <span className="font-semibold">What happens next?</span>
            <br />
            Check your email and phone for approval notification. Once approved, you can log in to your account.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
          >
            Go to Login
          </button>
          <button
            onClick={handleAdminDashboardClick}
            className="w-full text-yellow-600 hover:text-yellow-800 font-medium border border-yellow-600 hover:border-yellow-800 py-2 px-4 rounded-lg transition duration-200"
          >
            Admin Dashboard
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-white text-yellow-600 hover:bg-gray-50 font-medium border border-yellow-200 py-2 px-4 rounded-lg transition duration-200"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
