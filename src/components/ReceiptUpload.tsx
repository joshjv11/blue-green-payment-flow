import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Loader2 } from 'lucide-react';

interface ReceiptUploadProps {
  onClose: () => void;
  onSuccess: () => void;
}

const EXPENSE_CATEGORIES = [
  'Travel',
  'Utilities',
  'Office Supplies',
  'Marketing',
  'Software',
  'Food & Dining',
  'Professional Services',
  'Other'
];

// Simulated OCR function - extracts data from receipt
const simulateOCR = async (file: File): Promise<{
  vendor: string;
  date: string;
  amount: number;
  gst: number;
  category: string;
}> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Return simulated extracted data
  return {
    vendor: 'ABC Supplies Ltd.',
    date: new Date().toISOString().split('T')[0],
    amount: 1250.00,
    gst: 225.00,
    category: 'Office Supplies'
  };
};

export const ReceiptUpload = ({ onClose, onSuccess }: ReceiptUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    gst: '',
    category: 'Other',
    notes: ''
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image (JPG, PNG) or PDF file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setFile(selectedFile);

    // Simulate OCR processing
    try {
      setProcessing(true);
      toast({
        title: 'Processing receipt',
        description: 'Extracting data from your receipt...',
      });

      const extracted = await simulateOCR(selectedFile);
      setFormData({
        ...formData,
        vendor: extracted.vendor,
        date: extracted.date,
        amount: extracted.amount.toString(),
        gst: extracted.gst.toString(),
        category: extracted.category
      });

      toast({
        title: 'Data extracted',
        description: 'Please review and adjust the extracted information',
      });
    } catch (error: any) {
      toast({
        title: 'OCR failed',
        description: 'Please enter the details manually',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.vendor || !formData.amount) {
      toast({
        title: 'Missing information',
        description: 'Please fill in vendor and amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      let attachmentUrl = null;

      // Upload file to Cloudflare R2 via presigned URL
      if (file) {
        const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8787';
        const token = localStorage.getItem('invoiceflow_jwt');

        const signRes = await fetch(`${API_BASE}/storage/sign-upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        });

        if (!signRes.ok) throw new Error('Failed to get upload URL');
        const { uploadUrl, publicUrl } = await signRes.json();

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!uploadRes.ok) throw new Error('File upload to storage failed');
        attachmentUrl = publicUrl;
      }

      // Insert expense record
      const { error: insertError } = await supabase
        .from('expenses')
        .insert({
          user_id: user!.id,
          vendor: formData.vendor,
          date: formData.date,
          amount: parseFloat(formData.amount),
          gst: parseFloat(formData.gst || '0'),
          category: formData.category,
          notes: formData.notes || null,
          attachment_url: attachmentUrl
        });

      if (insertError) throw insertError;

      toast({
        title: 'Expense added',
        description: 'Your expense has been recorded successfully',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Error saving expense',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Receipt</DialogTitle>
          <DialogDescription>
            Upload a receipt image or PDF, and we'll extract the details automatically
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt">Receipt Image/PDF</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                id="receipt"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="receipt" className="cursor-pointer">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG or PDF (max 5MB)
                </p>
              </label>
            </div>
          </div>

          {processing && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing receipt...
            </div>
          )}

          {/* Manual Entry Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="vendor">Vendor Name *</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                placeholder="e.g., ABC Supplies"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gst">GST (₹)</Label>
              <Input
                id="gst"
                type="number"
                step="0.01"
                value={formData.gst}
                onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional details..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={uploading || processing}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Expense'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
