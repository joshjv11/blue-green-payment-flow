import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";
import { InvoicePDFPreview } from "./InvoicePDFPreview";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

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
      const tableName = type === "sale" ? "sales_orders" : "purchase_orders";

      // Fetch invoice header
      const { data: invoice, error: invoiceError } = await supabase
        .from(tableName)
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      // Fetch order lines
      const { data: lines, error: linesError } = await supabase
        .from("order_lines")
        .select("*")
        .eq("order_id", invoiceId)
        .eq("order_type", type);

      if (linesError) throw linesError;

      setInvoiceData({
        ...invoice,
        lines: lines || [],
      });

      setShowPreview(true);
    } catch (error: any) {
      console.error("Error fetching invoice data:", error);
      toast({
        title: "Error loading invoice",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePDFGenerated = async (pdfUrl: string) => {
    // Update invoice record with PDF URL
    const tableName = type === "sale" ? "sales_orders" : "purchase_orders";
    const { error } = await supabase
      .from(tableName)
      .update({ pdf_url: pdfUrl })
      .eq("id", invoiceId);

    if (error) {
      console.error("Error updating PDF URL:", error);
    }
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
