import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, MapPin, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  user: string;
  action: string;
  location: string;
  timeAgo: string;
  timestamp: Date;
}

// Mock data - in real app, fetch from API
const generateMockActivity = (): Activity => {
  const users = ['Rajesh K.', 'Priya S.', 'Amit M.', 'Sneha R.', 'Vikram P.'];
  const locations = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad'];
  const actions = [
    'just filed GSTR-1',
    'completed ITC reconciliation',
    'generated E-Invoice',
    'filed GSTR-3B',
    'reconciled 50+ invoices',
  ];

  return {
    id: Math.random().toString(36).substr(2, 9),
    user: users[Math.floor(Math.random() * users.length)],
    action: actions[Math.floor(Math.random() * actions.length)],
    location: locations[Math.floor(Math.random() * locations.length)],
    timeAgo: `${Math.floor(Math.random() * 10) + 1} mins ago`,
    timestamp: new Date(),
  };
};

interface LiveActivityFeedProps {
  className?: string;
  maxItems?: number;
}

export function LiveActivityFeed({ className, maxItems = 5 }: LiveActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Initial activities
    const initial = Array.from({ length: maxItems }, () => generateMockActivity());
    setActivities(initial);

    // Add new activity every 8-15 seconds
    const interval = setInterval(() => {
      setActivities(prev => {
        const newActivity = generateMockActivity();
        return [newActivity, ...prev.slice(0, maxItems - 1)];
      });
    }, Math.random() * 7000 + 8000);

    return () => clearInterval(interval);
  }, [maxItems]);

  return (
    <Card className={cn("glass-card", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="relative">
            <div className="absolute top-0 right-0 w-2 h-2 bg-success rounded-full animate-pulse" />
            <Clock className="h-5 w-5" />
          </div>
          Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{ 
                  duration: 0.3,
                  delay: index * 0.05 
                }}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{activity.user}</span>
                    <span className="text-sm text-muted-foreground">{activity.action}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{activity.location}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{activity.timeAgo}</span>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs border-success/30 text-success bg-success/5">
                  Live
                </Badge>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* Stats Counter */}
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Activity Today</span>
            <motion.span
              key={activities.length}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="text-lg font-bold gradient-text-success"
            >
              ₹{((Math.random() * 0.5 + 1.0) * 100).toFixed(1)}Cr+
            </motion.span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            invoices processed today
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

