import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Mail, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateInvoicePDF, downloadPDF, previewPDF } from "@/services/pdfService";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

interface InvoicePDFPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: any;
  type: "sale" | "purchase";
  onPDFGenerated?: (pdfUrl: string) => void;
}

export function InvoicePDFPreview({
  open,
  onOpenChange,
  invoiceData,
  type,
  onPDFGenerated,
}: InvoicePDFPreviewProps) {
  const { toast } = useToast();
  const { settings, loading: settingsLoading } = useBusinessSettings();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (open && !settingsLoading) {
      generatePreview();
    }
  }, [open, settingsLoading]);

  const generatePreview = async () => {
    if (!invoiceData || settingsLoading) return;

    setGenerating(true);
    try {
      // Generate preview blob
      const blob = await previewPDF({
        invoiceData,
        businessSettings: settings,
        type,
      });

      // Create object URL for preview
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error: any) {
      console.error("Error generating preview:", error);
      toast({
        title: "Error generating preview",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!invoiceData) return;

    setDownloading(true);
    try {
      const result = await generateInvoicePDF({
        invoiceData,
        businessSettings: settings,
        type,
      });

      if (!result.success || !result.pdfUrl) {
        throw new Error(result.error || "Failed to generate PDF");
      }

      const partyName = type === "sale" 
        ? invoiceData.customer_name 
        : invoiceData.supplier_name;
      const fileName = `Invoice_${invoiceData.invoice_number}_${partyName}.pdf`;

      await downloadPDF(result.pdfUrl, fileName);

      toast({
        title: "PDF Downloaded",
        description: "Invoice PDF has been downloaded successfully",
      });

      // Notify parent component
      if (onPDFGenerated) {
        onPDFGenerated(result.pdfUrl);
      }
    } catch (error: any) {
      toast({
        title: "Error downloading PDF",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = () => {
    toast({
      title: "Coming Soon",
      description: "Email functionality will be available in the next update",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoice PDF Preview
          </DialogTitle>
          <DialogDescription>
            Preview and download your {type === "sale" ? "sales" : "purchase"} invoice
          </DialogDescription>
        </DialogHeader>

        {/* Preview Area */}
        <div className="flex-1 overflow-auto border rounded-lg bg-muted/50 min-h-[500px] flex items-center justify-center">
          {generating && (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Generating preview...</p>
            </div>
          )}

          {!generating && pdfUrl && (
            <iframe
              src={pdfUrl}
              className="w-full h-full min-h-[500px]"
              title="Invoice PDF Preview"
            />
          )}

          {!generating && !pdfUrl && (
            <div className="text-center text-muted-foreground">
              <p>Failed to generate preview</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleDownload}
            disabled={downloading || generating}
            className="flex-1"
          >
            {downloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>

          <Button
            onClick={handleSendEmail}
            variant="outline"
            className="flex-1"
            disabled={generating}
          >
            <Mail className="mr-2 h-4 w-4" />
            Send via Email
          </Button>

          <Button
            onClick={() => onOpenChange(false)}
            variant="ghost"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
