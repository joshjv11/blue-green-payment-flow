import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface ConfettiPiece {
  id: string;
  x: number;
  y: number;
  rotation: number;
  color: string;
  delay: number;
}

const colors = [
  'hsl(var(--primary-gradient-start))',
  'hsl(var(--primary-gradient-end))',
  'hsl(var(--success))',
  'hsl(var(--gst-amber-start))',
  'hsl(var(--gst-teal))',
];

interface ConfettiAnimationProps {
  trigger: boolean;
  onComplete?: () => void;
  variant?: 'success' | 'celebration' | 'achievement';
}

export function ConfettiAnimation({ 
  trigger, 
  onComplete,
  variant = 'success' 
}: ConfettiAnimationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [showIcon, setShowIcon] = useState(false);

  useEffect(() => {
    if (trigger) {
      // Generate confetti pieces
      const pieces: ConfettiPiece[] = Array.from({ length: 50 }, (_, i) => ({
        id: `confetti-${i}`,
        x: Math.random() * 100,
        y: -10,
        rotation: Math.random() * 360,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
      }));

      setConfetti(pieces);
      setShowIcon(true);

      // Clean up after animation
      const timer = setTimeout(() => {
        setConfetti([]);
        setShowIcon(false);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{ 
              x: `${piece.x}vw`,
              y: `${piece.y}vh`,
              rotate: piece.rotation,
              opacity: 1,
            }}
            animate={{
              y: '110vh',
              rotate: piece.rotation + 360,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random(),
              delay: piece.delay,
              ease: 'easeOut',
            }}
            className="absolute w-3 h-3 rounded-sm"
            style={{
              backgroundColor: piece.color,
              boxShadow: `0 0 10px ${piece.color}`,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Success Icon */}
      <AnimatePresence>
        {showIcon && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ 
              type: 'spring',
              stiffness: 200,
              damping: 15,
            }}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 10, -10, 0],
              }}
              transition={{ 
                duration: 0.6,
                repeat: 1,
              }}
              className="w-20 h-20 rounded-full bg-success/20 backdrop-blur-xl flex items-center justify-center border-4 border-success"
            >
              <CheckCircle2 className="h-10 w-10 text-success" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

