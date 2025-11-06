import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';
import { formatINRCompact } from '@/utils/currency';
import { parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Bill {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  category: string;
  status: 'unpaid' | 'paid' | 'overdue';
}

interface SwipeableBillCardProps {
  bill: Bill;
  onToggleStatus: (bill: Bill) => void;
  getStatusColor: (bill: Bill) => string;
}

export function SwipeableBillCard({ bill, onToggleStatus, getStatusColor }: SwipeableBillCardProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);
  const SWIPE_THRESHOLD = 100; // Minimum swipe distance to trigger action

  const handleTouchStart = (e: React.TouchEvent) => {
    if (bill.status === 'paid') return; // Don't allow swiping paid bills
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (bill.status === 'paid' || !isSwiping) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    
    // Only allow right swipe (to mark as paid)
    if (diff > 0 && diff < 200) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (bill.status === 'paid' || !isSwiping) {
      setIsSwiping(false);
      setSwipeOffset(0);
      return;
    }

    if (swipeOffset >= SWIPE_THRESHOLD) {
      // Trigger mark as paid
      onToggleStatus(bill);
    }
    
    // Reset
    setIsSwiping(false);
    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Swipe Action Background */}
      {swipeOffset > 0 && (
        <div
          className="absolute inset-0 bg-green-500 flex items-center justify-end pr-6 z-0"
          style={{ opacity: Math.min(swipeOffset / SWIPE_THRESHOLD, 1) }}
        >
          <div className="flex items-center gap-2 text-white">
            <CheckCircle className="h-6 w-6" />
            <span className="font-semibold">Mark as Paid</span>
          </div>
        </div>
      )}

      {/* Bill Card */}
      <Card
        ref={cardRef}
        className={cn(
          "relative z-10 transition-transform duration-200 touch-manipulation",
          getStatusColor(bill),
          isSwiping && "shadow-lg"
        )}
        style={{
          transform: `translateX(${swipeOffset}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="p-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base mb-1 truncate">{bill.name}</div>
            <div className="text-sm text-muted-foreground">
              {formatINRCompact(bill.amount)} • {bill.category.charAt(0).toUpperCase() + bill.category.slice(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Due: {new Date(parseISO(bill.due_date)).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
              })}
            </div>
          </div>
          {bill.status !== 'paid' && (
            <Button
              size="default"
              variant="default"
              onClick={() => onToggleStatus(bill)}
              className="h-10 px-4 gap-2 shrink-0 min-h-[48px]"
            >
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Mark Paid</span>
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

