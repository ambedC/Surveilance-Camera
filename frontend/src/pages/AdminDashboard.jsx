import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  UserPlus, 
  UserX, 
  RefreshCcw, 
  LogOut, 
  Search, 
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

export default function AdminDashboard() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [rejectedUsers, setRejectedUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
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
        toast.error("Data Sync Failed", {
          description: "Could not synchronize user records from server.",
        });
      }
    } catch (err) {
      toast.error("Connection Error", {
        description: "Failed to connect to the administration server.",
      });
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_number: phoneNumber }),
        }
      );

      if (response.ok) {
        toast.success("User Approved", {
          description: `Access granted for ${phoneNumber}.`,
        });
        await fetchUsers();
        setActiveTab('approved');
      } else {
        const data = await response.json();
        toast.error("Action Failed", {
          description: data.detail || 'Could not approve the user.',
        });
      }
    } catch (err) {
      toast.error("System Error", {
        description: "An unexpected error occurred during approval.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRejectUser = async (phoneNumber) => {
    setActionInProgress(phoneNumber);
    try {
      const response = await fetch(
        'http://localhost:8000/api/auth/admin/reject-user',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_number: phoneNumber }),
        }
      );

      if (response.ok) {
        toast.success("User Rejected", {
          description: `Access denied for ${phoneNumber}.`,
        });
        await fetchUsers();
        setActiveTab('rejected');
      } else {
        const data = await response.json();
        toast.error("Action Failed", {
          description: data.detail || 'Could not reject the user.',
        });
      }
    } catch (err) {
      toast.error("System Error", {
        description: "An unexpected error occurred during rejection.",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredUsers = () => {
    let list = [];
    if (activeTab === 'pending') list = pendingUsers;
    else if (activeTab === 'approved') list = approvedUsers;
    else list = rejectedUsers;

    if (!searchQuery) return list;
    return list.filter(u => 
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone_number.includes(searchQuery) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const StatCard = ({ title, value, icon: Icon, color, trend }) => (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm overflow-hidden relative group transition-all duration-300 hover:bg-white/10 hover:-translate-y-1">
      <div className={`absolute top-0 left-0 w-1 h-full bg-${color}-500`} />
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
            <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
            {trend && <p className="text-[10px] text-green-400 mt-1 font-medium flex items-center gap-1">+{trend}% this month</p>}
          </div>
          <div className={cn("p-2 rounded-xl bg-opacity-10", `bg-${color}-500`)}>
            <Icon className={cn("w-5 h-5", `text-${color}-400`)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const UserRow = ({ user, isPending }) => (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="group grid grid-cols-12 gap-4 items-center p-4 hover:bg-white/[0.03] transition-colors border-b border-white/5 last:border-0"
    >
      <div className="col-span-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
          {user.name.charAt(0)}
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-white truncate">{user.name}</p>
          <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
        </div>
      </div>
      <div className="col-span-3">
        <p className="text-xs text-slate-300 font-medium">{user.phone_number}</p>
      </div>
      <div className="col-span-2">
        <div className="flex items-center gap-1.5">
          {user.status === 'approved' ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider border border-green-500/20">
              <CheckCircle2 size={10} /> Approved
            </span>
          ) : user.status === 'pending' ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase tracking-wider border border-yellow-500/20">
              <Clock size={10} /> Pending
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">
              <XCircle size={10} /> Rejected
            </span>
          )}
        </div>
      </div>
      <div className="col-span-2">
        <p className="text-[10px] text-muted-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
      </div>
      <div className="col-span-2 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isPending ? (
          <>
            <Button 
              size="sm" 
              variant="default"
              className="h-8 px-3 bg-green-600 hover:bg-green-700 text-[11px]"
              onClick={() => handleApproveUser(user.phone_number)}
              disabled={actionInProgress === user.phone_number}
            >
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="destructive"
              className="h-8 px-3 text-[11px]"
              onClick={() => handleRejectUser(user.phone_number)}
              disabled={actionInProgress === user.phone_number}
            >
              Reject
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreVertical size={14} />
          </Button>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black text-foreground flex">
      {/* Sidebar - Placeholder for sidebar logic if needed */}
      <div className="w-64 border-r border-white/5 bg-white/[0.02] flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
              <img src="/logo.png" alt="SentrixAI" className="w-full h-full object-contain" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Sentrix<span className="text-blue-500">AI</span></span>
          </div>
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold opacity-80">Security Command Center</p>
        </div>
        <div className="flex-1 p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-3 bg-white/5 text-primary">
            <Users size={18} /> User Management
          </Button>
        </div>
        <div className="p-4 border-t border-white/5">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-slate-400 hover:text-destructive hover:bg-destructive/10"
            onClick={() => {
              localStorage.removeItem('adminAuthenticated');
              navigate('/login');
            }}
          >
            <LogOut size={18} /> Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-black/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
             <h2 className="text-lg font-bold">User Management</h2>
          </div>
          <div className="flex items-center gap-4">
             <Button variant="outline" size="sm" className="gap-2 border-white/10 hover:bg-white/5" onClick={fetchUsers} disabled={loading}>
                <RefreshCcw size={14} className={cn(loading && "animate-spin")} />
                Refresh
             </Button>
             <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-indigo-600 border border-white/20" />
          </div>
        </header>

        {/* Dashboard Area */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#030303]">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatCard title="Total Users" value={allUsers.length} icon={Users} color="blue" />
              <StatCard title="Pending" value={pendingUsers.length} icon={UserPlus} color="yellow" />
              <StatCard title="Approved" value={approvedUsers.length} icon={UserCheck} color="green" />
              <StatCard title="Rejected" value={rejectedUsers.length} icon={UserX} color="red" />
            </div>

            {/* Content Table */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                  {['pending', 'approved', 'rejected'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300",
                        activeTab === tab 
                          ? "bg-primary text-black shadow-lg shadow-primary/20" 
                          : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <div className="relative w-64 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input 
                      placeholder="Search users..." 
                      className="pl-9 h-9 bg-white/5 border-white/10 focus:border-primary/50 text-xs"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon" className="h-9 w-9 border-white/10 hover:bg-white/5">
                    <Filter size={16} />
                  </Button>
                </div>
              </div>

              <Card className="bg-white/[0.02] border-white/5 overflow-hidden">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-white/[0.03] border-b border-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <div className="col-span-3">User</div>
                  <div className="col-span-3">Phone</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Joined</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                <div className="min-h-[400px]">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-[400px] gap-4">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-muted-foreground animate-pulse tracking-widest uppercase">Fetching Data...</p>
                    </div>
                  ) : filteredUsers().length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] opacity-20">
                      <Users size={64} className="mb-4" />
                      <p className="text-sm font-medium">No users found in this category</p>
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredUsers().map((user) => (
                        <UserRow key={user.phone_number} user={user} isPending={activeTab === 'pending'} />
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
