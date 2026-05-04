import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  LayoutDashboard, 
  LogOut, 
  User,
  Settings,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const navigate = useNavigate();
  const userPhone = localStorage.getItem('userPhone');

  const handleLogout = () => {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('userPhone');
    navigate('/login');
  };

  return (
    <aside className="w-64 border-r border-white/5 bg-white/[0.02] flex flex-col hidden lg:flex h-screen sticky top-0">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center">
            <img src="/logo.png" alt="SentrixAI" className="w-full h-full object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Sentrix<span className="text-blue-500">AI</span></span>
        </div>
        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold opacity-80">Smart Monitoring</p>
      </div>

      <div className="flex-1 p-4 space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-3 bg-white/5 text-primary">
          <LayoutDashboard size={18} /> Live Feed
        </Button>
        {/* <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5 opacity-50 cursor-not-allowed">
          <Bell size={18} /> History
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 text-slate-400 hover:text-white hover:bg-white/5 opacity-50 cursor-not-allowed">
          <Settings size={18} /> Settings
        </Button> */}
      </div>

      <div className="p-4 border-t border-white/5 space-y-4">
        {userPhone && (
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <User size={16} />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">User Account</p>
              <p className="text-xs font-semibold text-white truncate">{userPhone}</p>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-slate-400 hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut size={18} /> Logout
        </Button>
      </div>
    </aside>
  );
}
