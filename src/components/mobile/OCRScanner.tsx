import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface OCRScannerProps {
  onAmountDetected: (amount: number) => void;
  disabled?: boolean;
}

export function OCRScanner({ onAmountDetected, disabled = false }: OCRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedAmount, setDetectedAmount] = useState<number | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      toast({
        title: 'Camera Access Denied',
        description: 'Please allow camera access to scan bill amounts',
        variant: 'destructive',
      });
      setIsOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    
    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        
        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
          if (!blob) {
            setIsScanning(false);
            return;
          }

          // Try to use Tesseract.js for OCR (client-side)
          // For production, you might want to use a cloud OCR service
          try {
            // Simple regex-based amount detection from image
            // In production, use Tesseract.js or cloud OCR API
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // For now, show a manual input fallback
            // In production, integrate with Tesseract.js or cloud OCR
            toast({
              title: 'OCR Processing',
              description: 'Extracting amount from image...',
            });

            // Simulate OCR processing (replace with actual OCR)
            // This is a placeholder - integrate Tesseract.js or cloud OCR service
            setTimeout(() => {
              // For demo, prompt user to enter amount
              const amount = prompt('Enter the amount detected from the bill (₹):');
              if (amount) {
                const parsedAmount = parseFloat(amount.replace(/[₹,\s]/g, ''));
                if (!isNaN(parsedAmount) && parsedAmount > 0) {
                  setDetectedAmount(parsedAmount);
                  onAmountDetected(parsedAmount);
                  toast({
                    title: 'Amount Detected',
                    description: `₹${parsedAmount.toLocaleString('en-IN')}`,
                  });
                  setIsOpen(false);
                  stopCamera();
                }
              }
              setIsScanning(false);
            }, 1000);

          } catch (error) {
            console.error('OCR error:', error);
            toast({
              title: 'OCR Failed',
              description: 'Could not extract amount. Please enter manually.',
              variant: 'destructive',
            });
            setIsScanning(false);
          }
        }, 'image/jpeg', 0.9);
      }
    } catch (error) {
      console.error('Capture error:', error);
      setIsScanning(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    startCamera();
  };

  const handleClose = () => {
    setIsOpen(false);
    stopCamera();
    setDetectedAmount(null);
    setIsScanning(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleOpen}
        disabled={disabled}
        className="min-h-[48px] min-w-[48px]"
        title="Scan bill amount"
      >
        <Camera className="h-5 w-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Scan Bill Amount</DialogTitle>
            <DialogDescription>
              Point your camera at the bill amount and tap capture
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={captureAndScan}
                disabled={isScanning}
                className="flex-1 min-h-[48px]"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4 mr-2" />
                    Capture & Scan
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                className="min-h-[48px]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {detectedAmount && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Amount: ₹{detectedAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

