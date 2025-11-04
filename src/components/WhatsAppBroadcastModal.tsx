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
import { Input } from "@/components/ui/input";
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
import { Megaphone, Users, Plus, X, ExternalLink, Copy } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from 'sonner';

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
  
  // Manual phone numbers
  const [manualPhones, setManualPhones] = useState<string[]>(['']);
  const [generatedLinks, setGeneratedLinks] = useState<Array<{ phone: string; name: string; url: string }>>([]);
  const [showLinks, setShowLinks] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  
  const { sendBroadcast, isBroadcasting } = useWhatsAppIntegration();

  useEffect(() => {
    if (open) {
      fetchCustomers();
    } else {
      // Reset state when modal closes
      setShowLinks(false);
      setGeneratedLinks([]);
      setManualPhones(['']);
      setSelectedCustomers([]);
      setSelectAll(false);
      setPopupBlocked(false);
    }
  }, [open]);

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

  const handleAddManualPhone = () => {
    setManualPhones([...manualPhones, '']);
  };

  const handleRemoveManualPhone = (index: number) => {
    setManualPhones(manualPhones.filter((_, i) => i !== index));
  };

  const handleManualPhoneChange = (index: number, value: string) => {
    const updated = [...manualPhones];
    // Auto-format: remove spaces, add +91 if needed
    let formatted = value.replace(/\s+/g, '');
    if (formatted.startsWith('0') && !formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    updated[index] = formatted;
    setManualPhones(updated);
  };

  const handleSend = async () => {
    const validManualPhones = manualPhones.filter(p => p.trim().length >= 10);
    const totalRecipients = selectedCustomers.length + validManualPhones.length;

    if (!message.trim() || totalRecipients === 0) {
      toast.error('Please select customers or add phone numbers');
      return;
    }

    const result = await sendBroadcast(
      broadcastType,
      message,
      selectedCustomers.length > 0 ? selectedCustomers : undefined,
      validManualPhones.length > 0 ? validManualPhones : undefined
    );

    if (result.success) {
      if (result.whatsappLinks && result.whatsappLinks.length > 0) {
        // Validate links before setting
        const validLinks = result.whatsappLinks.filter(link => 
          link.url && link.url.startsWith('https://wa.me/')
        );
        
        if (validLinks.length === 0) {
          toast.error('No valid WhatsApp links generated. Please check phone numbers.');
          return;
        }
        
        console.log('✅ Valid WhatsApp links received:', validLinks.length);
        console.log('📋 Link details:', validLinks.map((l, i) => `${i + 1}. ${l.name || l.phone}: ${l.url.substring(0, 60)}...`));
        
        setGeneratedLinks(validLinks);
        setShowLinks(true);
        toast.success(`${validLinks.length} WhatsApp links generated! Click "Open WhatsApp" to send.`, {
          duration: 5000
        });
      } else {
        console.error('❌ No links in response:', result);
        toast.error('No links generated. Please check recipients and try again.');
      }
    }
  };

  const handleOpenAllLinks = () => {
    if (generatedLinks.length === 0) return;
    
    // Log all links for debugging
    console.log('📋 All generated links:', generatedLinks);
    generatedLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.name || link.phone} (${link.phone}): ${link.url}`);
    });
    
    toast.success(`Opening WhatsApp for ${generatedLinks.length} recipients...`, {
      duration: 3000
    });
    
    let openedCount = 0;
    let blockedCount = 0;
    const openedWindows: Window[] = [];
    
    // Open ALL links immediately in sequence (user interaction context)
    // This works better than setTimeout for avoiding popup blockers
    generatedLinks.forEach((link, index) => {
      // Small delay to ensure each window opens properly
      const delay = index * 100; // 100ms delay between each
      
      setTimeout(() => {
        console.log(`🔗 Opening link ${index + 1}/${generatedLinks.length}: ${link.name || link.phone}`);
        console.log(`   URL: ${link.url}`);
        
        try {
          const whatsappWindow = window.open(link.url, '_blank', 'noopener,noreferrer');
          
          if (whatsappWindow && !whatsappWindow.closed) {
            openedCount++;
            openedWindows.push(whatsappWindow);
            console.log(`✅ Successfully opened WhatsApp for ${link.name || link.phone}`);
          } else {
            blockedCount++;
            console.error(`❌ Failed to open WhatsApp for ${link.name || link.phone} - popup blocked`);
          }
        } catch (error) {
          blockedCount++;
          console.error(`❌ Error opening WhatsApp for ${link.name || link.phone}:`, error);
        }
        
        // Show completion message after all links are processed
        if (index === generatedLinks.length - 1) {
          setTimeout(() => {
            console.log(`📊 Final count: ${openedCount} opened, ${blockedCount} blocked out of ${generatedLinks.length} total`);
            
            if (blockedCount > 0) {
              toast.warning(`${openedCount} opened, ${blockedCount} blocked. Use links below if needed.`, {
                duration: 6000
              });
              setPopupBlocked(true);
            } else if (openedCount === generatedLinks.length) {
              toast.success(`✅ All ${generatedLinks.length} WhatsApp windows opened! Click "Send" in each.`, {
                duration: 6000
              });
            } else {
              toast.warning(`Only ${openedCount} of ${generatedLinks.length} windows opened. Check popup settings.`, {
                duration: 6000
              });
              setPopupBlocked(true);
            }
          }, 500);
        }
      }, delay);
    });
  };
  
  const handleCopyAllLinks = () => {
    const allLinks = generatedLinks.map(link => `${link.name || link.phone}: ${link.url}`).join('\n\n');
    navigator.clipboard.writeText(allLinks);
    toast.success('All links copied to clipboard!', {
      duration: 3000
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-w-[95vw] mx-auto max-h-[90vh] overflow-y-auto">
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

          {/* Customer Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                <Users className="h-4 w-4 inline mr-2" />
                Select Customers ({selectedCustomers.length} selected)
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
            
            <div className="border rounded-md p-2 max-h-[150px] overflow-y-auto space-y-2">
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

          {/* Manual Phone Numbers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Add Phone Numbers Manually
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddManualPhone}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {manualPhones.map((phone, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="+91 9876543210 or 9876543210"
                    value={phone}
                    onChange={(e) => handleManualPhoneChange(index, e.target.value)}
                  />
                  {manualPhones.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveManualPhone(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Add phone numbers manually (with or without country code)
            </p>
          </div>

          {/* Individual Links Display */}
          {showLinks && generatedLinks.length > 0 && (
            <div className="space-y-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-2 border-green-200 dark:border-green-800 rounded-lg">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Megaphone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-900 dark:text-green-100">
                      WhatsApp Links Ready!
                    </h3>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      {generatedLinks.length} links generated
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAllLinks}
                    className="gap-2"
                  >
                    <Copy className="h-3 w-3" />
                    Copy All Links
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleOpenAllLinks}
                    className="gap-2"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open All
                  </Button>
                </div>
                
                <p className="text-xs text-green-700 dark:text-green-300 pt-2">
                  Click each link below to open WhatsApp with the message pre-filled. Then click "Send" in WhatsApp.
                </p>
              </div>
              
              {/* Individual Links List */}
              <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                {generatedLinks.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-950/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-300 font-semibold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {link.name || link.phone}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {link.phone}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 group-hover:scale-110 transition-transform" />
                  </a>
                ))}
              </div>
              
              <div className="mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                <p className="text-xs text-green-600 dark:text-green-400 text-center">
                  💡 Click each link to open WhatsApp. Each link opens with your message ready to send.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBroadcasting}>
            Cancel
          </Button>
          {!showLinks ? (
            <Button 
              onClick={handleSend} 
              disabled={isBroadcasting || !message.trim() || (selectedCustomers.length === 0 && manualPhones.filter(p => p.trim().length >= 10).length === 0)}
              className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Megaphone className="h-4 w-4" />
              {isBroadcasting 
                ? 'Preparing Broadcast...' 
                : `Prepare Broadcast for ${selectedCustomers.length + manualPhones.filter(p => p.trim().length >= 10).length} recipients`
              }
            </Button>
          ) : (
            <Button 
              onClick={() => {
                setShowLinks(false);
                setGeneratedLinks([]);
              }}
              variant="outline"
              className="gap-2"
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
