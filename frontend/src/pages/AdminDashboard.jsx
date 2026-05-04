import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [rejectedUsers, setRejectedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionInProgress, setActionInProgress] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const [pendingRes, allRes] = await Promise.all([
        fetch('http://localhost:8000/api/auth/admin/pending-users'),
        fetch('http://localhost:8000/api/auth/admin/all-users'),
      ]);

      if (pendingRes.ok && allRes.ok) {
        const pendingData = await pendingRes.json();
        const allData = await allRes.json();
        
        const all = allData.users || [];
        setPendingUsers(pendingData.pending_users || []);
        setAllUsers(all);
        setApprovedUsers(all.filter(u => u.status === 'approved'));
        setRejectedUsers(all.filter(u => u.status === 'rejected'));
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('Error fetching users. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (phoneNumber) => {
    setActionInProgress(phoneNumber);
    try {
      const response = await fetch(
        'http://localhost:8000/api/auth/admin/approve-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone_number: phoneNumber }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert('User approved successfully');
        // refresh lists from server to ensure consistency
        await fetchUsers();
        setActiveTab('approved');
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to approve user');
      }
    } catch (err) {
      alert('Error approving user');
      console.error(err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectUser = async (phoneNumber) => {
    if (!window.confirm('Are you sure you want to reject this user?')) {
      return;
    }

    setActionInProgress(phoneNumber);
    try {
      const response = await fetch(
        'http://localhost:8000/api/auth/admin/reject-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ phone_number: phoneNumber }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert('User rejected');
        await fetchUsers();
        setActiveTab('rejected');
      } else {
        const data = await response.json();
        alert(data.detail || 'Failed to reject user');
      }
    } catch (err) {
      alert('Error rejecting user');
      console.error(err);
    } finally {
      setActionInProgress(null);
    }
  };

  const UserCard = ({ user, isPending }) => (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-4 border border-gray-700 border-l-4 border-l-blue-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-gray-400 text-sm">Name</p>
          <p className="font-semibold text-gray-200">{user.name}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Email</p>
          <p className="font-semibold text-gray-200">{user.email}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Phone Number</p>
          <p className="font-semibold text-gray-200">{user.phone_number}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Status</p>
          <p className={`font-semibold ${
            user.status === 'approved' ? 'text-green-500' :
            user.status === 'pending' ? 'text-yellow-500' :
            'text-red-500'
          }`}>
            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
          </p>
        </div>
      </div>

      <div>
        <p className="text-gray-400 text-sm">Registered</p>
        <p className="text-gray-200">
          {new Date(user.created_at).toLocaleString()}
        </p>
      </div>

      {isPending && (
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => handleApproveUser(user.phone_number)}
            disabled={actionInProgress === user.phone_number}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            {actionInProgress === user.phone_number ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => handleRejectUser(user.phone_number)}
            disabled={actionInProgress === user.phone_number}
            className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            {actionInProgress === user.phone_number ? 'Processing...' : 'Reject'}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button
            onClick={() => {
              localStorage.removeItem('authenticated');
              localStorage.removeItem('userPhone');
                localStorage.removeItem('adminAuthenticated');
                navigate('/login');
            }}
            className="bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>

        {/* Main Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-blue-400">{allUsers.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Pending Approval</p>
            <p className="text-3xl font-bold text-yellow-500">{pendingUsers.length}</p>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Approved Users</p>
            <p className="text-3xl font-bold text-green-500">
              {approvedUsers.length}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Rejected Users</p>
            <p className="text-3xl font-bold text-red-500">
              {rejectedUsers.length}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-4 px-6 font-semibold text-center transition ${
                activeTab === 'pending'
                  ? 'border-b-4 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Pending Approval ({pendingUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`flex-1 py-4 px-6 font-semibold text-center transition ${
                activeTab === 'approved'
                  ? 'border-b-4 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Approved ({approvedUsers.length})
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`flex-1 py-4 px-6 font-semibold text-center transition ${
                activeTab === 'rejected'
                  ? 'border-b-4 border-blue-500 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Rejected ({rejectedUsers.length})
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Loading users...</p>
              </div>
            ) : activeTab === 'pending' ? (
              <div>
                {pendingUsers.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No pending users for approval
                  </p>
                ) : (
                  pendingUsers.map((user) => (
                    <UserCard key={user.id} user={user} isPending={true} />
                  ))
                )}
              </div>
            ) : activeTab === 'approved' ? (
              <div>
                {approvedUsers.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No approved users yet
                  </p>
                ) : (
                  approvedUsers.map((user) => (
                    <UserCard key={user.id} user={user} isPending={false} />
                  ))
                )}
              </div>
            ) : (
              <div>
                {rejectedUsers.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No rejected requests
                  </p>
                ) : (
                  rejectedUsers.map((user) => (
                    <UserCard key={user.id} user={user} isPending={false} />
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}
