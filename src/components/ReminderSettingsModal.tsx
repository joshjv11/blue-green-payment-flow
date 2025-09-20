import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Bell, Clock, Calendar, Mail, Loader2 } from 'lucide-react';
import { useSupabaseData } from '@/hooks/useSupabaseData';
import { supabase } from '@/integrations/supabase/client';

interface ReminderSettingsModalProps {
  bill: any;
  isOpen: boolean;
  onClose: () => void;
  onReminderScheduled: () => void;
}

const ReminderSettingsModal = ({ bill, isOpen, onClose, onReminderScheduled }: ReminderSettingsModalProps) => {
  const { toast } = useToast();
  const [reminderDays, setReminderDays] = useState<number>(1);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isScheduling, setIsScheduling] = useState(false);

  const scheduleReminder = async () => {
    if (!bill) return;

    setIsScheduling(true);
    try {
      console.log('🔔 Scheduling individual reminder for bill:', bill.id);
      
      const { error } = await supabase.functions.invoke('schedule-individual-reminder', {
        body: {
          bill_id: bill.id,
          reminder_days_before: reminderDays,
          priority: priority
        }
      });

      if (error) {
        console.error('❌ Failed to schedule reminder:', error);
        throw error;
      }

      toast({
        title: "Reminder Scheduled",
        description: `Email reminder set for ${reminderDays} day${reminderDays !== 1 ? 's' : ''} before due date`,
      });

      onReminderScheduled();
      onClose();

    } catch (error: any) {
      console.error('❌ Error scheduling reminder:', error);
      toast({
        title: "Scheduling Failed",
        description: error.message || "Failed to schedule reminder",
        variant: "destructive",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  if (!bill) return null;

  const dueDate = new Date(bill.due_date);
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - reminderDays);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Set Bill Reminder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bill Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="font-semibold text-sm">{bill.name}</h4>
            <p className="text-sm text-muted-foreground">
              Amount: ₹{bill.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground">
              Due: {dueDate.toLocaleDateString('en-IN', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          <Separator />

          {/* Reminder Timing */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Remind me before due date
            </Label>
            <Select 
              value={reminderDays.toString()} 
              onValueChange={(value) => setReminderDays(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 day before</SelectItem>
                <SelectItem value="3">3 days before</SelectItem>
                <SelectItem value="7">1 week before</SelectItem>
                <SelectItem value="14">2 weeks before</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-2 rounded">
              📧 Email will be sent on {reminderDate.toLocaleDateString('en-IN')} at 9:00 AM IST
            </div>
          </div>

          {/* Priority Level */}
          <div className="space-y-3">
            <Label>Priority Level</Label>
            <Select 
              value={priority} 
              onValueChange={(value: 'low' | 'medium' | 'high') => setPriority(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Low Priority
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    Medium Priority
                  </div>
                </SelectItem>
                <SelectItem value="high">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    High Priority
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Features Preview */}
          <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border">
            <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
              ✨ What you'll get:
            </p>
            <ul className="text-xs text-green-600 dark:text-green-400 space-y-1">
              <li>• Professional email reminder with bill details</li>
              <li>• INR currency formatting & IST timezone</li>
              <li>• Smart retry mechanism for delivery</li>
              <li>• Status tracking in reminder dashboard</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isScheduling}>
            Cancel
          </Button>
          <Button onClick={scheduleReminder} disabled={isScheduling}>
            {isScheduling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Scheduling...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Schedule Reminder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderSettingsModal;