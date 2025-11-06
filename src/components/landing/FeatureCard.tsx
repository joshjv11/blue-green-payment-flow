import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  delay?: number;
  gradient?: 'blue' | 'purple' | 'cyan' | 'amber';
}

export function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  delay = 0,
  gradient = 'blue'
}: FeatureCardProps) {
  const gradientClasses = {
    blue: 'from-blue-500/20 to-cyan-500/10',
    purple: 'from-purple-500/20 to-pink-500/10',
    cyan: 'from-cyan-500/20 to-blue-500/10',
    amber: 'from-amber-500/20 to-orange-500/10',
  };

  const iconGradientClasses = {
    blue: 'from-blue-400 to-cyan-400',
    purple: 'from-purple-400 to-pink-400',
    cyan: 'from-cyan-400 to-blue-400',
    amber: 'from-amber-400 to-orange-400',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="group relative"
    >
      <div className={`
        relative h-full p-6 rounded-2xl
        bg-gradient-to-br ${gradientClasses[gradient]}
        backdrop-blur-xl border border-white/10
        shadow-lg shadow-black/20
        transition-all duration-300
        group-hover:border-white/20
        group-hover:shadow-xl group-hover:shadow-black/30
        before:absolute before:inset-0 before:rounded-2xl
        before:bg-gradient-to-br ${gradientClasses[gradient]}
        before:opacity-0 group-hover:before:opacity-100
        before:transition-opacity before:duration-300
        before:-z-10 before:blur-xl
      `}>
        <div className={`
          w-12 h-12 rounded-xl
          bg-gradient-to-br ${iconGradientClasses[gradient]}
          flex items-center justify-center
          mb-4 shadow-lg
          group-hover:scale-110 transition-transform duration-300
        `}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-white/90 transition-colors">
          {title}
        </h3>
        <p className="text-white/70 text-sm leading-relaxed group-hover:text-white/80 transition-colors">
          {description}
        </p>
      </div>
    </motion.div>
  );
}

