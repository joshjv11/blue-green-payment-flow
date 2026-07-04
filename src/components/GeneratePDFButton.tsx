import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { InvoicePDFPreview } from "./InvoicePDFPreview";
import { useToast } from "@/hooks/use-toast";
import { getInvoice } from "@/lib/endpoints/invoices";

interface GeneratePDFButtonProps {
  invoiceId: string;
  type: "sale" | "purchase";
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function GeneratePDFButton({
  invoiceId,
  type,
  variant = "outline",
  size = "default",
  className,
}: GeneratePDFButtonProps) {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  const fetchInvoiceData = async () => {
    setLoading(true);
    try {
      const invoice = await getInvoice(invoiceId);
      setInvoiceData({
        ...invoice,
        invoice_number: invoice.invoicenumber,
        customer_name: invoice.customername,
        lines: invoice.lineitems || [],
      });
      setShowPreview(true);
    } catch (error: unknown) {
      console.error("Error fetching invoice data:", error);
      toast({
        title: "Error loading invoice",
        description: error instanceof Error ? error.message : "Failed to load invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePDFGenerated = async (_pdfUrl: string) => {
    console.warn('PDF URL persistence not migrated for legacy sales/purchase orders');
  };

  return (
    <>
      <Button
        onClick={fetchInvoiceData}
        disabled={loading}
        variant={variant}
        size={size}
        className={className}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <FileText className="mr-2 h-4 w-4" />
            Generate PDF
          </>
        )}
      </Button>

      {invoiceData && (
        <InvoicePDFPreview
          open={showPreview}
          onOpenChange={setShowPreview}
          invoiceData={invoiceData}
          type={type}
          onPDFGenerated={handlePDFGenerated}
        />
      )}
    </>
  );
}
