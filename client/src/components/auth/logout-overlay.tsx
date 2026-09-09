import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

type LogoutOverlayProps = {
  isVisible: boolean;
};

export function LogoutOverlay({ isVisible }: LogoutOverlayProps) {
  if (!isVisible) return null;
  
  return (
    <motion.div
      className="overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <motion.div 
            className="absolute inset-0 bg-primary rounded-full" 
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ opacity: 0.2 }}
          />
          <div className="relative bg-primary p-3 rounded-full">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
        </div>
        
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-dark">Signing Out</h2>
          <p className="text-neutral-medium">Please wait while we securely log you out...</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-3 h-3 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </motion.div>
  );
}