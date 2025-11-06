import { pdf } from "@react-pdf/renderer";
import { supabase } from "@/lib/supabase";
import { InvoicePDFDocument } from "@/components/pdf/InvoicePDFDocument";

interface GeneratePDFParams {
  invoiceData: any;
  businessSettings: any;
  type: "sale" | "purchase";
}

export async function generateInvoicePDF({ invoiceData, businessSettings, type }: GeneratePDFParams): Promise<{
  success: boolean;
  pdfUrl?: string;
  error?: string;
}> {
  try {
    // Generate PDF blob
    const blob = await pdf(
      <InvoicePDFDocument
        invoice={invoiceData}
        businessSettings={businessSettings}
        type={type}
      />
    ).toBlob();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("User not authenticated");
    }

    // Generate filename
    const partyName = type === "sale" 
      ? invoiceData.customer_name 
      : invoiceData.supplier_name;
    const sanitizedPartyName = partyName.replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `${user.id}/Invoice_${invoiceData.invoice_number}_${sanitizedPartyName}.pdf`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("invoice-pdfs")
      .upload(fileName, blob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("invoice-pdfs")
      .getPublicUrl(data.path);

    return {
      success: true,
      pdfUrl: publicUrl,
    };
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

export async function downloadPDF(pdfUrl: string, fileName: string) {
  try {
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    throw error;
  }
}

export async function previewPDF({ invoiceData, businessSettings, type }: GeneratePDFParams): Promise<Blob> {
  return await pdf(
    <InvoicePDFDocument
      invoice={invoiceData}
      businessSettings={businessSettings}
      type={type}
    />
  ).toBlob();
}
