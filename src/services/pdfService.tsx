import { pdf } from "@react-pdf/renderer";
import { getCurrentUser, getCurrentToken } from "@/lib/supabase";
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
    const user = getCurrentUser();
    if (!user) throw new Error("User not authenticated");

    // Generate filename
    const partyName = type === "sale"
      ? invoiceData.customer_name
      : invoiceData.supplier_name;
    const sanitizedPartyName = (partyName || "Unknown").replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `Invoice_${invoiceData.invoice_number}_${sanitizedPartyName}.pdf`;

    // Upload to Cloudflare R2 via presigned URL
    const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8787";
    const token = getCurrentToken();

    const signRes = await fetch(`${API_BASE}/storage/sign-upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ fileName, contentType: "application/pdf" }),
    });

    if (!signRes.ok) throw new Error("Failed to get upload URL for PDF");
    const { uploadUrl, publicUrl } = await signRes.json();

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
