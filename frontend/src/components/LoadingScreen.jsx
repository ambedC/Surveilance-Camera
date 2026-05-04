import { motion } from "framer-motion";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative mb-8"
      >
        <img src="/logo.png" alt="SentrixAI Logo" className="w-48 h-auto" />
      </motion.div>
      
      <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden relative">
        <motion.div
          initial={{ left: "-100%" }}
          animate={{ left: "100%" }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-0 bottom-0 w-1/2 bg-gradient-to-r from-transparent via-blue-500 to-transparent"
        />
      </div>
      
      <p className="mt-4 text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] animate-pulse">
        Initializing Security Protocols
      </p>
    </div>
  );
}
