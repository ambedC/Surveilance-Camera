'use client'
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
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

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  const validateForm = () => {
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      toast.error("Invalid Name", {
        description: "Name must be at least 2 characters.",
      });
      return false;
    }
    const emailRegex = /^[\w\.-]+@[\w\.-]+\.\w+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Invalid Email", {
        description: "Please enter a valid email address.",
      });
      return false;
    }
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(formData.phoneNumber.trim())) {
      toast.error("Invalid Phone", {
        description: "Phone number must be exactly 10 digits.",
      });
      return false;
    }
    if (!formData.password) {
      toast.error("Missing Password", {
        description: "Please enter a password.",
      });
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Mismatch", {
        description: "Passwords do not match.",
      });
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone_number: formData.phoneNumber,
          password: formData.password,
          confirm_password: formData.confirmPassword
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error("Registration Failed", {
          description: data.detail || 'An error occurred during registration.',
        });
        return;
      }
      navigate('/registration-pending', { state: { userName: formData.name } });
    } catch (err) {
      toast.error("Server Error", {
        description: "Could not connect to the registration server.",
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/40 via-purple-700/50 to-black" />
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-purple-400/20 blur-[80px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
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
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mx-auto w-16 h-16 rounded-full border border-white/10 flex items-center justify-center relative overflow-hidden mb-4"
                >
                  <img src="/logo.png" alt="SentrixAI" className="w-12 h-12 object-contain" />
                </motion.div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">SentrixAI</h1>
                <p className="text-white/80 text-xs">Register for Intelligent Surveillance</p>
              </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="relative">
                  <User className={`absolute left-3 top-3 w-4 h-4 ${focusedInput === "name" ? 'text-white' : 'text-white/40'}`} />
                  <Input
                    name="name"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedInput("name")}
                    onBlur={() => setFocusedInput(null)}
                    className="pl-10 bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/50"
                    required
                  />
                </div>
                <div className="relative">
                  <Mail className={`absolute left-3 top-3 w-4 h-4 ${focusedInput === "email" ? 'text-white' : 'text-white/40'}`} />
                  <Input
                    name="email"
                    type="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedInput("email")}
                    onBlur={() => setFocusedInput(null)}
                    className="pl-10 bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/50"
                    required
                  />
                </div>
                <div className="relative">
                  <Phone className={`absolute left-3 top-3 w-4 h-4 ${focusedInput === "phone" ? 'text-white' : 'text-white/40'}`} />
                  <Input
                    name="phoneNumber"
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedInput("phone")}
                    onBlur={() => setFocusedInput(null)}
                    className="pl-10 bg-white/5 border-transparent focus:border-white/20 text-white"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className={`absolute left-3 top-3 w-4 h-4 ${focusedInput === "password" ? 'text-white' : 'text-white/40'}`} />
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedInput("password")}
                    onBlur={() => setFocusedInput(null)}
                    className="pl-10 pr-10 bg-white/5 border-transparent focus:border-white/20 text-white"
                    required
                  />
                  <div onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 cursor-pointer">
                    {showPassword ? <EyeOff className="w-4 h-4 text-white/40" /> : <Eye className="w-4 h-4 text-white/40" />}
                  </div>
                </div>
                <div className="relative">
                  <Lock className={`absolute left-3 top-3 w-4 h-4 ${focusedInput === "confirm" ? 'text-white' : 'text-white/40'}`} />
                  <Input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    onFocus={() => setFocusedInput("confirm")}
                    onBlur={() => setFocusedInput(null)}
                    className="pl-10 bg-white/5 border-transparent focus:border-white/20 text-white"
                    required
                  />
                </div>
              </div>


              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black font-medium h-10 rounded-lg flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-black/70 border-t-transparent rounded-full animate-spin" /> : <>Register <ArrowRight className="w-4 h-4" /></>}
              </motion.button>

              <p className="text-center text-xs text-white/70">
                Already have an account?{' '}
                <Link to="/login" className="text-white hover:underline font-medium">Login here</Link>
              </p>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
