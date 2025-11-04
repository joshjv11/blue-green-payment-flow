import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWhatsAppIntegration } from '@/hooks/useWhatsAppIntegration';
import { supabase } from '@/integrations/supabase/client';
import { Megaphone, Users } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";

interface WhatsAppBroadcastModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const templates = {
  gst_reminder: `🔔 *GST Filing Reminder*

Dear {customer_name},

This is a friendly reminder that GST filing for the current period is due soon.

Please ensure all your invoices are up to date.

Need help? Contact us anytime!

Best regards,
Your Business Team`,
  payment_reminder: `⏰ *Payment Reminder*

Dear {customer_name},

We noticed you have pending invoices. Please clear your dues at the earliest to avoid any inconvenience.

For payment details or queries, feel free to reach out!

Thank you! 🙏`,
  custom: ''
};

export const WhatsAppBroadcastModal = ({
  open,
  onOpenChange
}: WhatsAppBroadcastModalProps) => {
  const [broadcastType, setBroadcastType] = useState<'gst_reminder' | 'payment_reminder' | 'custom'>('gst_reminder');
  const [message, setMessage] = useState(templates.gst_reminder);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  
  const { sendBroadcast, isBroadcasting } = useWhatsAppIntegration();

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    setMessage(templates[broadcastType]);
  }, [broadcastType]);

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from('customers')
      .select('id, name, phone, email')
      .not('phone', 'is', null)
      .order('name');
    
    if (data) {
      setCustomers(data);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedCustomers(customers.map(c => c.id));
    } else {
      setSelectedCustomers([]);
    }
  };

  const handleCustomerToggle = (customerId: string) => {
    setSelectedCustomers(prev => 
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSend = async () => {
    if (!message.trim() || selectedCustomers.length === 0) {
      return;
    }

    const result = await sendBroadcast(
      broadcastType,
      message,
      selectedCustomers
    );

    if (result.success) {
      onOpenChange(false);
      setMessage(templates.gst_reminder);
      setSelectedCustomers([]);
      setSelectAll(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            WhatsApp Broadcast
          </DialogTitle>
          <DialogDescription>
            Send bulk messages to multiple customers at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="broadcastType">Broadcast Type</Label>
            <Select 
              value={broadcastType} 
              onValueChange={(value: any) => setBroadcastType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gst_reminder">GST Filing Reminder</SelectItem>
                <SelectItem value="payment_reminder">Payment Reminder</SelectItem>
                <SelectItem value="custom">Custom Message</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Enter your broadcast message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
            />
            <p className="text-xs text-muted-foreground">
              Use {'{customer_name}'} to personalize messages
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                <Users className="h-4 w-4 inline mr-2" />
                Recipients ({selectedCustomers.length})
              </Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="selectAll"
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor="selectAll"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Select All
                </label>
              </div>
            </div>
            
            <div className="border rounded-md p-2 max-h-[200px] overflow-y-auto space-y-2">
              {customers.map((customer) => (
                <div key={customer.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                  <Checkbox
                    id={customer.id}
                    checked={selectedCustomers.includes(customer.id)}
                    onCheckedChange={() => handleCustomerToggle(customer.id)}
                  />
                  <label
                    htmlFor={customer.id}
                    className="flex-1 text-sm cursor-pointer"
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">{customer.phone}</div>
                  </label>
                </div>
              ))}
              {customers.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No customers with phone numbers found
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBroadcasting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={isBroadcasting || !message.trim() || selectedCustomers.length === 0}
            className="gap-2"
          >
            <Megaphone className="h-4 w-4" />
            {isBroadcasting ? 'Sending...' : `Send to ${selectedCustomers.length} customers`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
