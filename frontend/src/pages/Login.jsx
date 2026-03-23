import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // client-side phone validation: allow optional +91 prefix
    const raw = phoneNumber.trim();
    const phonePattern = /^(?:\+91)?\d{10}$/;
    if (!phonePattern.test(raw)) {
      setError('Phone number must be exactly 10 digits (optional +91 prefix)');
      setLoading(false);
      return;
    }

    if (!password) {
      setError('Password cannot be empty');
      setLoading(false);
      return;
    }

    try {
      // normalize before sending: strip +91 if present, backend will add it
      let sendNumber = raw;
      if (sendNumber.startsWith('+91')) {
        sendNumber = sendNumber.slice(3);
      }
      sendNumber = `+91${sendNumber}`;
      const response = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: sendNumber, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.detail || 'Login failed');
        return;
      }

      localStorage.setItem('authenticated', 'true');
      localStorage.setItem('userPhone', data.phone_number);
      navigate('/');
    } catch (err) {
      setError('Error logging in');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Surveillance System</h1>
          <p className="text-gray-400">Login to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-gray-300 font-medium mb-2">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+919876543210"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
            <p className="text-gray-500 text-sm mt-1">
              Indian phone number (10 digits)
            </p>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              required
            />
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <p className="text-gray-400">
            Choose an option below
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="text-blue-400 hover:text-blue-300 font-medium underline transition-colors"
            >
              Register
            </button>
            <button
              onClick={() => navigate('/admin/login')}
              className="text-blue-400 hover:text-blue-300 font-medium underline transition-colors"
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
