import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Home, 
  ShieldAlert,
  Mail,
  Smartphone
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from 'sonner';

export default function RegistrationPending() {
  const location = useLocation();
  const navigate = useNavigate();
  const userName = location.state?.userName || 'User';

  const handleAdminDashboardClick = () => {
    const password = window.prompt("Enter admin password:");
    if (password === "123") {
      navigate('/admin/dashboard');
    } else if (password !== null) {
      toast.error("Access Denied", {
        description: "Incorrect admin password provided.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden flex items-center justify-center p-4">
      {/* Background visual effects - matching the auth style */}
      <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/20 via-yellow-700/10 to-black" />
      
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-yellow-400/10 blur-[80px]" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="bg-black/40 backdrop-blur-xl border-white/[0.05] shadow-2xl rounded-3xl overflow-hidden">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
                className="mx-auto w-24 h-24 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center mb-6 relative overflow-hidden"
              >
                <div className="absolute inset-0 rounded-full bg-yellow-500/20 animate-ping opacity-20" />
                <img src="/logo.png" alt="SentrixAI" className="w-16 h-16 object-contain" />
              </motion.div>
              
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80 mb-2">
                SentrixAI
              </h1>
              <p className="text-white/60 text-sm">
                Your account is currently under review
              </p>
            </div>

            <div className="space-y-6 mb-8 text-center">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-white/90 text-sm mb-1">
                  Welcome, <span className="font-bold text-yellow-500">{userName}</span>
                </p>
                <p className="text-white/60 text-xs leading-relaxed">
                  Your registration has been successfully submitted and is awaiting security clearance from our administrator.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                   <Mail className="w-4 h-4 text-slate-400" />
                   <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Email Check</span>
                </div>
                <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                   <Smartphone className="w-4 h-4 text-slate-400" />
                   <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Phone Alert</span>
                </div>
              </div>

              <p className="text-white/40 text-[11px] px-4 italic">
                Approval usually takes 24-48 hours. You will receive a notification once your account is activated.
              </p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/login')}
                className="w-full bg-white text-black hover:bg-white/90 h-11 font-bold rounded-xl flex items-center justify-center gap-2"
              >
                Back to Login <ArrowRight className="w-4 h-4" />
              </Button>
              
              <div className="flex gap-3">
                <Button 
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="flex-1 text-white/60 hover:text-white hover:bg-white/5 h-10 text-xs gap-2 rounded-xl border border-white/5"
                >
                  <Home className="w-3.5 h-3.5" /> Home
                </Button>
                <Button 
                  variant="ghost"
                  onClick={handleAdminDashboardClick}
                  className="flex-1 text-white/60 hover:text-white hover:bg-white/5 h-10 text-xs gap-2 rounded-xl border border-white/5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin
                </Button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
               <div className="flex items-center justify-center gap-2 text-white/20">
                  <ShieldAlert size={14} />
                  <span className="text-[9px] font-bold uppercase tracking-[0.2em]">Secured by SentrixAI</span>
               </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
