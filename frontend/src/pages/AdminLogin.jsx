'use client'
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from 'sonner';

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const navigate = useNavigate();

  const handleAdminLogin = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const adminEmail = 'akshaysankar2004@gmail.com';
    const adminPassword = '12345';

    setTimeout(() => {
      if (email === adminEmail && password === adminPassword) {
        localStorage.setItem('adminAuthenticated', 'true');
        toast.success("Welcome, Administrator", {
          description: "Access to security dashboard granted.",
        });
        navigate('/admin/dashboard');
      } else {
        toast.error("Authentication Failed", {
          description: "Invalid admin credentials provided.",
        });
      }
      setLoading(false);
    }, 300);
  };

  // 3D effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/40 via-indigo-700/50 to-black" />
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-indigo-400/20 blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
        style={{ perspective: 1500 }}
      >
        <motion.div
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative group"
        >
          <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.05] shadow-2xl">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 rounded-full border border-indigo-500/30 flex items-center justify-center mb-4 bg-indigo-500/10 overflow-hidden">
                <img src="/logo.png" alt="SentrixAI" className="w-12 h-12 object-contain" />
              </div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">SentrixAI Admin</h1>
              <p className="text-white/80 text-xs">Security Command Center Access</p>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Mail className={`absolute left-3 top-3 w-4 h-4 ${focusedInput === "email" ? 'text-white' : 'text-white/40'}`} />
                  <Input
                    type="email"
                    placeholder="Admin Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedInput("email")}
                    onBlur={() => setFocusedInput(null)}
                    className="pl-10 bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/50"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className={`absolute left-3 top-3 w-4 h-4 ${focusedInput === "password" ? 'text-white' : 'text-white/40'}`} />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                    className="pl-10 pr-10 bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/50"
                    required
                  />
                  <div onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4 text-white/40" /> : <Eye className="w-4 h-4 text-white/40" />}
                  </div>
                </div>
              </div>


              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium h-10 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
              </motion.button>

              <div className="text-center mt-6">
                <Link to="/login" className="text-xs text-white/70 hover:text-white transition-colors">Back to User Login</Link>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
