import { motion } from 'framer-motion';
import { BrandMark } from '@/components/brand/BrandMark';

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
            className="absolute inset-0 rounded-full bg-[#D4FF3F]"
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            style={{ opacity: 0.2 }}
          />
          <div className="relative">
            <BrandMark size="lg" className="brand-mark-xl" />
          </div>
        </div>
        
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-dark">Signing Out</h2>
          <p className="text-neutral-medium">Please wait while we securely log you out...</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#D4FF3F]" style={{ animationDelay: "0ms" }} />
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#D4FF3F]" style={{ animationDelay: "150ms" }} />
          <div className="h-3 w-3 animate-bounce rounded-full bg-[#D4FF3F]" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </motion.div>
  );
}