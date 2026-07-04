import { pdf } from "@react-pdf/renderer";
import { signUpload } from '@/lib/endpoints/storage';
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

    const partyName = type === "sale"
      ? invoiceData.customer_name
      : invoiceData.supplier_name;
    const sanitizedPartyName = (partyName || "Unknown").replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `Invoice_${invoiceData.invoice_number}_${sanitizedPartyName}.pdf`;

    const { uploadUrl, publicUrl } = await signUpload(fileName, 'application/pdf');

    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: blob,
    });

    if (!uploadRes.ok) throw new Error("PDF upload to storage failed");

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
