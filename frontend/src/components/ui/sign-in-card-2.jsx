'use client'
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      data-slot="input"
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

export function SignInCard({ 
  phoneNumber, 
  setPhoneNumber, 
  password, 
  setPassword, 
  handleLogin, 
  loading, 
  error 
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // For 3D card effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div className="min-h-screen w-screen bg-black relative overflow-hidden flex items-center justify-center">
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-500/40 via-purple-700/50 to-black" />
      
      {/* Subtle noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px'
        }}
      />

      {/* Top radial glow */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[120vh] h-[60vh] rounded-b-[50%] bg-purple-400/20 blur-[80px]" />
      <motion.div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[100vh] h-[60vh] rounded-b-full bg-purple-300/20 blur-[60px]"
        animate={{ 
          opacity: [0.15, 0.3, 0.15],
          scale: [0.98, 1.02, 0.98]
        }}
        transition={{ 
          duration: 8, 
          repeat: Infinity,
          repeatType: "mirror"
        }}
      />
      <motion.div 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-[90vh] h-[90vh] rounded-t-full bg-purple-400/20 blur-[60px]"
        animate={{ 
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          duration: 6, 
          repeat: Infinity,
          repeatType: "mirror",
          delay: 1
        }}
      />

      {/* Animated glow spots */}
      <div className="absolute left-1/4 top-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse opacity-40" />
      <div className="absolute right-1/4 bottom-1/4 w-96 h-96 bg-white/5 rounded-full blur-[100px] animate-pulse delay-1000 opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm relative z-10"
        style={{ perspective: 1500 }}
      >
        <motion.div
          className="relative"
          style={{ rotateX, rotateY }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          whileHover={{ z: 10 }}
        >
          <div className="relative group">
            {/* Traveling light beam effect */}
            <div className="absolute -inset-[1px] rounded-2xl overflow-hidden">
                <motion.div 
                  className="absolute top-0 left-0 h-[3px] w-[50%] bg-gradient-to-r from-transparent via-white to-transparent opacity-70"
                  animate={{ 
                    left: ["-50%", "100%"],
                  }}
                  transition={{ 
                    duration: 2.5, 
                    ease: "easeInOut", 
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                />
                <motion.div 
                  className="absolute top-0 right-0 h-[50%] w-[3px] bg-gradient-to-b from-transparent via-white to-transparent opacity-70"
                  animate={{ 
                    top: ["-50%", "100%"],
                  }}
                  transition={{ 
                    duration: 2.5, 
                    ease: "easeInOut", 
                    repeat: Infinity,
                    repeatDelay: 1,
                    delay: 0.6
                  }}
                />
            </div>

            <div className="relative bg-black/40 backdrop-blur-xl rounded-2xl p-6 border border-white/[0.05] shadow-2xl overflow-hidden">
                {/* Logo and header */}
                <div className="text-center space-y-1 mb-5">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mx-auto w-16 h-16 rounded-full border border-white/10 flex items-center justify-center relative overflow-hidden mb-2"
                  >
                    <img src="/logo.png" alt="SentrixAI" className="w-12 h-12 object-contain" />
                  </motion.div>

                  <motion.h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/80">
                    SentrixAI
                  </motion.h1>
                  <p className="text-white/80 text-xs">Intelligent Surveillance System</p>
                </div>

                {/* Login form */}
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-3">
                    {/* Phone input */}
                    <div className="relative">
                        <Mail className={`absolute left-3 top-3 w-4 h-4 ${focusedInput === "phone" ? 'text-white' : 'text-white/40'}`} />
                        <Input
                          type="tel"
                          placeholder="Phone number"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          onFocus={() => setFocusedInput("phone")}
                          onBlur={() => setFocusedInput(null)}
                          className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/50 h-10 pl-10"
                          required
                        />
                    </div>

                    {/* Password input */}
                    <div className="relative">
                        <Lock className={`absolute left-3 top-3 w-4 h-4 ${focusedInput === "password" ? 'text-white' : 'text-white/40'}`} />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={() => setFocusedInput("password")}
                          onBlur={() => setFocusedInput(null)}
                          className="w-full bg-white/5 border-transparent focus:border-white/20 text-white placeholder:text-white/50 h-10 pl-10 pr-10"
                          required
                        />
                        <div onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 cursor-pointer">
                          {showPassword ? <EyeOff className="w-4 h-4 text-white/40" /> : <Eye className="w-4 h-4 text-white/40" />}
                        </div>
                    </div>
                  </div>

                  {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                  {/* Sign in button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="w-full relative group/button mt-5"
                  >
                    <div className="relative overflow-hidden bg-white text-black font-medium h-10 rounded-lg flex items-center justify-center">
                      <AnimatePresence mode="wait">
                        {loading ? (
                          <motion.div key="loading" className="w-4 h-4 border-2 border-black/70 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <motion.span key="button-text" className="flex items-center justify-center gap-1 text-sm font-medium">
                            Sign In <ArrowRight className="w-3 h-3" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>

                  {/* Links */}
                  <div className="mt-6 flex flex-col gap-2 text-center text-xs">
                    <p className="text-white/70">
                      Don't have an account?{' '}
                      <Link to="/register" className="text-white hover:underline font-medium">Sign up</Link>
                    </p>
                    <p className="text-white/50">
                      Are you an admin?{' '}
                      <Link to="/admin/login" className="text-white/80 hover:text-white hover:underline">Admin Login</Link>
                    </p>
                  </div>
                </form>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
