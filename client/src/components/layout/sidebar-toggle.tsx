import { Menu, ChevronLeft, Sparkles } from 'lucide-react';
import { useSidebar } from '@/hooks/use-sidebar';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion } from 'framer-motion';

export default function SidebarToggle() {
  const { sidebarOpen, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (!user) return null;

  return (
    <motion.button
      onClick={toggleSidebar}
      className="w-12 h-12 flex items-center justify-center bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 text-gray-600 hover:text-blue-600 transition-all duration-300 group relative overflow-hidden shrink-0"
      aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
      whileHover={{ scale: 1.05, boxShadow: "0 10px 30px -10px rgba(59, 130, 246, 0.3)" }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 to-cyan-700/0 group-hover:from-teal-500/10 group-hover:to-cyan-700/10 transition-all duration-300" />
      
      {sidebarOpen && !isMobile ? (
        <motion.div
          whileHover={{ rotate: -5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <ChevronLeft className="h-5 w-5" />
        </motion.div>
      ) : (
        <motion.div
          whileHover={{ rotate: 5 }}
          transition={{ type: "spring", stiffness: 300 }}
        >
          <Menu className="h-5 w-5" />
        </motion.div>
      )}
      
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100"
        initial={{ scale: 0 }}
        whileHover={{ scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Sparkles className="h-3 w-3 text-blue-400 absolute top-1 right-1" />
      </motion.div>
    </motion.button>
  );
}
