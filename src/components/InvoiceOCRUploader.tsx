import { useState } from 'react';
import { Upload, FileText, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface ExtractionResult {
  vendor: string;
  amount: number;
  due_date: string;
  category: string;
  confidence: number;
  currency: string;
}

interface InvoiceOCRUploaderProps {
  userId: string;
  onPrefill?: (data: ExtractionResult) => void;
  onBillCreated?: () => void;
}

export function InvoiceOCRUploader({ userId, onPrefill, onBillCreated }: InvoiceOCRUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        toast.error('Invalid file type. Please upload an image (JPG, PNG, WEBP) or PDF.');
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }

      setFile(selectedFile);
      setError(null);
      setExtractionResult(null);
    }
  };

  const handleUploadAndExtract = async () => {
    if (!file) {
      toast.error('Please select a file first');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      toast.success('File uploaded successfully');

      // Call OCR edge function with detailed logging
      console.log('🚀 Calling extract-invoice-ocr edge function...', {
        bucket: 'receipts',
        path: fileName,
        userId,
        project: 'qusloccwftavvcsttmnq'
      });

      const { data, error: functionError } = await supabase.functions.invoke('extract-invoice-ocr', {
        body: {
          bucket: 'receipts',
          path: fileName,
          userId,
          persist: true
        }
      });

      console.log('📦 Edge function response:', { data, error: functionError });

      if (functionError) {
        console.error('❌ Edge function error details:', {
          message: functionError.message,
          name: functionError.name,
          stack: functionError.stack,
          context: functionError.context
        });
        throw new Error(`OCR failed: ${functionError.message || 'Edge function not reachable'}`);
      }

      console.log('✅ OCR Response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      setExtractionResult(data.extraction);
      
      toast.success(
        `Invoice extracted! Vendor: ${data.extraction.vendor}, Amount: ₹${data.extraction.amount}`,
        { duration: 5000 }
      );

      // Call callbacks
      if (onPrefill) {
        onPrefill(data.extraction);
      }
      
      if (onBillCreated && data.bill?.id) {
        onBillCreated();
      }

      // Reset file input
      setFile(null);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('OCR upload error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Invoice OCR Scanner
            </CardTitle>
            <CardDescription>
              Upload an invoice image for automatic data extraction
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/10">
            <span className="text-primary">AI Powered</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label
              htmlFor="invoice-upload"
              className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {file ? file.name : 'Choose Invoice File'}
            </label>
            <input
              id="invoice-upload"
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="sr-only"
              disabled={isProcessing}
            />
          </div>
          <Button
            onClick={handleUploadAndExtract}
            disabled={!file || isProcessing}
            className="sm:w-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Extract Data
              </>
            )}
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {extractionResult && (
          <div className="space-y-2 rounded-md border border-green-500/20 bg-green-500/5 p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Extraction Successful</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Vendor:</span>
                <p className="font-medium">{extractionResult.vendor}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Amount:</span>
                <p className="font-medium">
                  {extractionResult.currency} {extractionResult.amount}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Due Date:</span>
                <p className="font-medium">{extractionResult.due_date}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Category:</span>
                <p className="font-medium capitalize">{extractionResult.category}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Confidence:</span>
                <p className="font-medium">
                  {(extractionResult.confidence * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
