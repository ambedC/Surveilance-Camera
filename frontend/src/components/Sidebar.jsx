import React from "react";
import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();
  const userPhone = localStorage.getItem('userPhone');

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('authenticated');
      localStorage.removeItem('userPhone');
      navigate('/login');
    }
  };

  return (
    <aside className="w-64 bg-gray-900 text-white p-6 flex flex-col">
      {/* Logo / Title */}
      <h2 className="text-2xl font-bold mb-2">🎥 Surveillance</h2>
      <p className="text-sm text-gray-400 mb-8">Smart Monitoring System</p>

      {/* User Info */}
      {userPhone && (
        <div className="bg-gray-800 rounded-lg p-3 mb-6 text-sm">
          <p className="text-gray-400">Logged in as:</p>
          <p className="font-semibold text-green-400">{userPhone}</p>
        </div>
      )}

      {/* Navigation (Options Removed as Requested) */}
      <div className="flex-1"></div>

      {/* Footer */}
      <div className="space-y-3 border-t border-gray-700 pt-4">
        <p className="text-sm text-gray-400">© 2025 Smart Surveillance</p>
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          🚪 Logout
        </button>
      </div>
    </aside>
  );
}
